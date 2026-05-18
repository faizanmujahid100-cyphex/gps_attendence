'use client';
import { useEffect, useState, useCallback } from 'react';
import { Users, Loader2, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getSchedules, getUsers, getAttendanceRecords, getAttendanceSessions } from '@/lib/firestore';
import { useAuthStore } from '@/store/authStore';
import { calculateAttendancePercentage } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import type { User, Schedule, AttendanceRecord, AttendanceSession } from '@/types';

export default function TeacherStudentsPage() {
  const { user } = useAuthStore();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<User | null>(null);
  const [studentRecords, setStudentRecords] = useState<AttendanceRecord[]>([]);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const scheds = await getSchedules(user.uid);
      setSchedules(scheds);
      const allStudents = await getUsers('student');
      const mySections = new Set(scheds.map(s => `${s.semester}-${s.section}`));
      setStudents(allStudents.filter(s => mySections.has(`${s.semester}-${s.section}`)));
    } catch {
      toast({ title: 'Failed to load', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const viewStudent = async (student: User) => {
    setSelected(student);
    setLoadingDetail(true);
    try {
      const [recs, sess] = await Promise.all([
        getAttendanceRecords({ studentUid: student.uid }),
        getAttendanceSessions({ teacherUid: user!.uid }),
      ]);
      setStudentRecords(recs.filter(r => sess.find(s => s.id === r.sessionId)));
      setSessions(sess);
    } finally {
      setLoadingDetail(false);
    }
  };

  const getStudentSubjects = () => {
    const subjectMap: Record<string, { present: number; total: number }> = {};
    studentRecords.forEach(r => {
      const session = sessions.find(s => s.id === r.sessionId);
      if (!session) return;
      if (!subjectMap[session.subject]) subjectMap[session.subject] = { present: 0, total: 0 };
      subjectMap[session.subject].total++;
      if (r.status === 'present' || r.status === 'late') subjectMap[session.subject].present++;
    });
    return Object.entries(subjectMap).map(([subject, data]) => ({
      subject, ...data, percent: calculateAttendancePercentage(data.present, data.total),
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Students</h1>
        <p className="text-muted-foreground text-sm">{students.length} students across your sections</p>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" /></div>
          ) : students.length === 0 ? (
            <div className="p-16 text-center text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No students found in your assigned sections</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground">Student</th>
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground">Roll No</th>
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground">Semester</th>
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground">Section</th>
                    <th className="text-right px-6 py-3 font-medium text-muted-foreground">View</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(student => (
                    <tr key={student.uid} className="border-b hover:bg-muted/20">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold">
                            {student.name.charAt(0)}
                          </div>
                          <span className="font-medium">{student.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 font-mono text-xs">{student.rollNo}</td>
                      <td className="px-6 py-3">{student.semester}</td>
                      <td className="px-6 py-3">{student.section}</td>
                      <td className="px-6 py-3 text-right">
                        <Button variant="ghost" size="sm" onClick={() => viewStudent(student)}>
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={open => { if (!open) setSelected(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selected?.name} — Attendance Summary</DialogTitle>
          </DialogHeader>
          {loadingDetail ? (
            <div className="py-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto" /></div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-2 bg-muted/40 rounded"><span className="text-muted-foreground">Roll No: </span>{selected?.rollNo}</div>
                <div className="p-2 bg-muted/40 rounded"><span className="text-muted-foreground">Section: </span>{selected?.section}</div>
              </div>
              {getStudentSubjects().length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No attendance records yet</p>
              ) : (
                <div className="space-y-2">
                  {getStudentSubjects().map(sub => (
                    <div key={sub.subject} className="p-3 rounded-lg border">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">{sub.subject}</span>
                        <Badge variant={sub.percent >= 75 ? 'success' : sub.percent >= 60 ? 'warning' : 'danger'}>
                          {sub.percent}%
                        </Badge>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${sub.percent >= 75 ? 'bg-emerald-500' : sub.percent >= 60 ? 'bg-amber-500' : 'bg-rose-500'}`}
                          style={{ width: `${sub.percent}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{sub.present}/{sub.total} classes attended</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
