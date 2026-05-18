'use client';
import { useEffect, useState } from 'react';
import { FileText, Download, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { getUsers, getAttendanceSessions, getAttendanceRecords } from '@/lib/firestore';
import { calculateAttendancePercentage, formatDate } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import type { User, AttendanceRecord, AttendanceSession } from '@/types';

interface StudentSummary {
  student: User;
  bySubject: { subject: string; total: number; present: number; percent: number }[];
  overall: number;
}

export default function AdminReportsPage() {
  const [students, setStudents] = useState<User[]>([]);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [semFilter, setSemFilter] = useState('all');
  const [secFilter, setSecFilter] = useState('all');
  const [summaries, setSummaries] = useState<StudentSummary[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [studs, sess, recs] = await Promise.all([
          getUsers('student'), getAttendanceSessions(), getAttendanceRecords(),
        ]);
        setStudents(studs); setSessions(sess); setRecords(recs);
      } catch {
        toast({ title: 'Failed to load data', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const filtered = students.filter(s => {
      if (semFilter !== 'all' && String(s.semester) !== semFilter) return false;
      if (secFilter !== 'all' && s.section !== secFilter) return false;
      return true;
    });

    const computed: StudentSummary[] = filtered.map(student => {
      const studentRecords = records.filter(r => r.studentUid === student.uid);
      const subjectMap: Record<string, { total: number; present: number }> = {};

      studentRecords.forEach(r => {
        const session = sessions.find(s => s.id === r.sessionId);
        if (!session) return;
        const subj = session.subject;
        if (!subjectMap[subj]) subjectMap[subj] = { total: 0, present: 0 };
        subjectMap[subj].total++;
        if (r.status === 'present' || r.status === 'late') subjectMap[subj].present++;
      });

      const bySubject = Object.entries(subjectMap).map(([subject, data]) => ({
        subject, ...data, percent: calculateAttendancePercentage(data.present, data.total),
      }));

      const totalClasses = bySubject.reduce((s, b) => s + b.total, 0);
      const totalPresent = bySubject.reduce((s, b) => s + b.present, 0);
      return { student, bySubject, overall: calculateAttendancePercentage(totalPresent, totalClasses) };
    });

    setSummaries(computed);
  }, [students, sessions, records, semFilter, secFilter]);

  const exportPDF = async () => {
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('GIGCCL Attendance Report', 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-PK')}`, 14, 28);

    const tableData = summaries.map(s => [
      s.student.rollNo ?? '', s.student.name, `Sem ${s.student.semester}`,
      s.student.section ?? '', `${s.overall}%`,
      s.overall < 75 ? 'BELOW THRESHOLD' : 'OK',
    ]);

    autoTable(doc, {
      head: [['Roll No', 'Name', 'Semester', 'Section', 'Overall %', 'Remarks']],
      body: tableData,
      startY: 35,
      styles: { fontSize: 9 },
      didParseCell: (data) => {
        if (data.column.index === 5 && data.cell.text[0] === 'BELOW THRESHOLD') {
          data.cell.styles.textColor = [220, 38, 38];
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });

    doc.save('gigccl-attendance-report.pdf');
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-muted-foreground text-sm">Generate attendance reports per student or class</p>
        </div>
        <Button onClick={exportPDF} disabled={loading}>
          <Download className="w-4 h-4 mr-1" /> Export PDF Report
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Students</p>
            <p className="text-2xl font-bold">{summaries.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 bg-rose-50 dark:bg-rose-950">
            <p className="text-sm text-rose-600">Below 75%</p>
            <p className="text-2xl font-bold text-rose-700">{summaries.filter(s => s.overall < 75).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 bg-emerald-50 dark:bg-emerald-950">
            <p className="text-sm text-emerald-600">Above 75%</p>
            <p className="text-2xl font-bold text-emerald-700">{summaries.filter(s => s.overall >= 75).length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Select value={semFilter} onValueChange={setSemFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Semester" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Semesters</SelectItem>
            {[1,2,3,4,5,6,7,8].map(s => <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={secFilter} onValueChange={setSecFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Section" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sections</SelectItem>
            {['A','B','C'].map(s => <SelectItem key={s} value={s}>Section {s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" /></div>
          ) : summaries.length === 0 ? (
            <div className="p-16 text-center text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No data available</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground">Roll No</th>
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground">Name</th>
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground">Semester</th>
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground">Section</th>
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground">Overall %</th>
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground">Subjects</th>
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {summaries.map(({ student, bySubject, overall }) => (
                    <tr key={student.uid} className={`border-b hover:bg-muted/20 ${overall < 75 ? 'bg-rose-50/30 dark:bg-rose-950/20' : ''}`}>
                      <td className="px-6 py-3 font-mono text-xs">{student.rollNo}</td>
                      <td className="px-6 py-3 font-medium">{student.name}</td>
                      <td className="px-6 py-3">{student.semester}</td>
                      <td className="px-6 py-3">{student.section}</td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-muted rounded-full h-2 max-w-16">
                            <div
                              className={`h-2 rounded-full ${overall >= 75 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                              style={{ width: `${overall}%` }}
                            />
                          </div>
                          <span className={`font-semibold ${overall < 75 ? 'text-rose-600' : 'text-emerald-600'}`}>{overall}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex flex-wrap gap-1">
                          {bySubject.slice(0, 3).map(b => (
                            <span key={b.subject} className="text-xs bg-muted px-1.5 py-0.5 rounded">
                              {b.subject}: {b.percent}%
                            </span>
                          ))}
                          {bySubject.length > 3 && <span className="text-xs text-muted-foreground">+{bySubject.length - 3} more</span>}
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <Badge variant={overall >= 75 ? 'success' : 'danger'}>
                          {overall >= 75 ? 'OK' : 'Below 75%'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
