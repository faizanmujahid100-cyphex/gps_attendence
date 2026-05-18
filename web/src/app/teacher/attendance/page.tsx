'use client';
import { useEffect, useState, useCallback } from 'react';
import { CheckCircle, XCircle, Clock, Users, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  getSchedules, getUsers, getAttendanceSessions, createSession, updateSession,
  getAttendanceRecords, updateAttendanceRecord, batchMarkAbsent, upsertAttendanceRecord,
} from '@/lib/firestore';
import { subscribeToSession } from '@/lib/firestore';
import { useAuthStore } from '@/store/authStore';
import { getDayOfWeek, todayString, formatTime } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import type { Schedule, User, AttendanceSession, AttendanceRecord } from '@/types';

export default function TeacherAttendancePage() {
  const { user } = useAuthStore();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [currentSession, setCurrentSession] = useState<AttendanceSession | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingSession, setOpeningSession] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [overrideDialog, setOverrideDialog] = useState<{ record: AttendanceRecord; student: User } | null>(null);
  const [overrideStatus, setOverrideStatus] = useState<string>('');
  const [overrideReason, setOverrideReason] = useState('');
  const [savingOverride, setSavingOverride] = useState(false);

  const today = getDayOfWeek();
  const todayDate = todayString();

  const loadSchedules = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const scheds = await getSchedules(user.uid);
      setSchedules(scheds.filter(s => s.dayOfWeek === today));
    } finally {
      setLoading(false);
    }
  }, [user, today]);

  useEffect(() => { loadSchedules(); }, [loadSchedules]);

  const loadClassData = useCallback(async (schedule: Schedule) => {
    setLoading(true);
    try {
      const [studs, existingSessions] = await Promise.all([
        getUsers('student'),
        getAttendanceSessions({ teacherUid: user!.uid, date: todayDate }),
      ]);
      const classStudents = studs.filter(s => s.semester === schedule.semester && s.section === schedule.section);
      setStudents(classStudents);
      const session = existingSessions.find(s => s.scheduleId === schedule.id);
      setCurrentSession(session ?? null);
    } finally {
      setLoading(false);
    }
  }, [user, todayDate]);

  useEffect(() => {
    if (!selectedSchedule) return;
    loadClassData(selectedSchedule);
  }, [selectedSchedule, loadClassData]);

  useEffect(() => {
    if (!currentSession?.id) return;
    const unsub = subscribeToSession(currentSession.id, setRecords);
    return unsub;
  }, [currentSession?.id]);

  const openSession = async () => {
    if (!selectedSchedule || !user) return;
    setOpeningSession(true);
    try {
      const sessionId = await createSession({
        scheduleId: selectedSchedule.id!,
        teacherUid: user.uid,
        subject: selectedSchedule.subject,
        semester: selectedSchedule.semester,
        section: selectedSchedule.section,
        date: todayDate,
        startTime: Timestamp.now(),
        status: 'open',
        confirmedByTeacher: false,
      });
      const sessions = await getAttendanceSessions({ teacherUid: user.uid, date: todayDate });
      setCurrentSession(sessions.find(s => s.id === sessionId) ?? null);
      toast({ title: 'Attendance session opened', variant: 'success' as never });
    } catch {
      toast({ title: 'Failed to open session', variant: 'destructive' });
    } finally {
      setOpeningSession(false);
    }
  };

  const confirmAttendance = async () => {
    if (!currentSession?.id) return;
    setConfirming(true);
    try {
      // Mark all students without records as absent
      const markedUids = new Set(records.map(r => r.studentUid));
      const unmarked = students.filter(s => !markedUids.has(s.uid));
      if (unmarked.length > 0) {
        await batchMarkAbsent(currentSession.id, unmarked.map(s => ({ uid: s.uid, name: s.name, rollNo: s.rollNo ?? '' })));
      }
      await updateSession(currentSession.id, {
        status: 'closed', confirmedByTeacher: true, confirmedAt: Timestamp.now(), endTime: Timestamp.now(),
      });
      setCurrentSession(prev => prev ? { ...prev, status: 'closed', confirmedByTeacher: true } : null);
      toast({ title: 'Attendance confirmed!', description: `${unmarked.length} students marked absent`, variant: 'success' as never });
    } catch {
      toast({ title: 'Failed to confirm', variant: 'destructive' });
    } finally {
      setConfirming(false);
    }
  };

  const handleBatchAbsent = async () => {
    if (!currentSession?.id) return;
    const unmarked = students.filter(s => !records.find(r => r.studentUid === s.uid));
    await batchMarkAbsent(currentSession.id, unmarked.map(s => ({ uid: s.uid, name: s.name, rollNo: s.rollNo ?? '' })));
    toast({ title: `${unmarked.length} students marked absent`, variant: 'success' as never });
  };

  const openOverride = (record: AttendanceRecord, student: User) => {
    setOverrideDialog({ record, student });
    setOverrideStatus(record.status);
    setOverrideReason('');
  };

  const saveOverride = async () => {
    if (!overrideDialog || !user) return;
    if (!overrideReason.trim()) { toast({ title: 'Reason is required', variant: 'destructive' }); return; }
    setSavingOverride(true);
    try {
      await updateAttendanceRecord(overrideDialog.record.id!, {
        status: overrideStatus as 'present' | 'absent' | 'late' | 'manual',
        method: 'manual',
        overrideReason: overrideReason,
        overrideBy: user.uid,
        overrideAt: Timestamp.now(),
      });
      toast({ title: 'Status updated', variant: 'success' as never });
      setOverrideDialog(null);
    } catch {
      toast({ title: 'Failed to update', variant: 'destructive' });
    } finally {
      setSavingOverride(false);
    }
  };

  const getStudentRecord = (uid: string) => records.find(r => r.studentUid === uid);

  const presentCount = records.filter(r => r.status === 'present' || r.status === 'late').length;
  const absentCount = students.length - presentCount;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Take Attendance</h1>
        <p className="text-muted-foreground text-sm">Manage attendance for today&apos;s classes</p>
      </div>

      {/* Class Selector */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Label className="text-sm text-muted-foreground mb-1 block">Select Today&apos;s Class</Label>
              <Select onValueChange={id => setSelectedSchedule(schedules.find(s => s.id === id) ?? null)}>
                <SelectTrigger className="max-w-sm">
                  <SelectValue placeholder="Choose a class..." />
                </SelectTrigger>
                <SelectContent>
                  {schedules.length === 0 ? (
                    <SelectItem value="none" disabled>No classes today</SelectItem>
                  ) : (
                    schedules.map(s => (
                      <SelectItem key={s.id} value={s.id!}>
                        {s.subject} — Sem {s.semester} Sec {s.section} ({s.startTime}–{s.endTime})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedSchedule && (
        <>
          {/* Session Control */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{selectedSchedule.subject}</h3>
                  <p className="text-sm text-muted-foreground">
                    Semester {selectedSchedule.semester} · Section {selectedSchedule.section} · Room {selectedSchedule.room}
                  </p>
                  {currentSession && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Session opened: {formatTime(currentSession.startTime.toDate())}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  {!currentSession ? (
                    <Button onClick={openSession} disabled={openingSession}>
                      {openingSession ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Open Session'}
                    </Button>
                  ) : currentSession.status === 'open' ? (
                    <>
                      <Button variant="outline" size="sm" onClick={handleBatchAbsent}>Mark All Absent</Button>
                      <Button variant="success" onClick={confirmAttendance} disabled={confirming}>
                        {confirming ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-4 h-4 mr-1" /> Confirm Attendance</>}
                      </Button>
                    </>
                  ) : (
                    <Badge variant="success"><CheckCircle className="w-3 h-3 mr-1" /> Confirmed</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          {currentSession && (
            <div className="grid grid-cols-3 gap-4">
              <Card><CardContent className="p-4 bg-emerald-50 dark:bg-emerald-950">
                <p className="text-xs text-emerald-600">Present</p>
                <p className="text-2xl font-bold text-emerald-700">{presentCount}</p>
              </CardContent></Card>
              <Card><CardContent className="p-4 bg-rose-50 dark:bg-rose-950">
                <p className="text-xs text-rose-600">Absent</p>
                <p className="text-2xl font-bold text-rose-700">{absentCount}</p>
              </CardContent></Card>
              <Card><CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{students.length}</p>
              </CardContent></Card>
            </div>
          )}

          {/* Student List */}
          {loading ? (
            <div className="py-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" /></div>
          ) : students.length === 0 ? (
            <Card><CardContent className="py-10 text-center text-muted-foreground">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>No students in Semester {selectedSchedule.semester}, Section {selectedSchedule.section}</p>
            </CardContent></Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Students ({students.length})</CardTitle>
                <CardDescription>
                  {currentSession
                    ? 'GPS-verified students appear automatically. You can manually override any status.'
                    : 'Open a session to start tracking attendance.'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {students.map(student => {
                    const record = getStudentRecord(student.uid);
                    return (
                      <div key={student.uid} className="flex items-center gap-4 px-6 py-4 hover:bg-muted/20">
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-700 dark:text-blue-300 text-xs font-bold flex-shrink-0">
                          {student.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{student.name}</p>
                          <p className="text-xs text-muted-foreground">{student.rollNo}</p>
                        </div>
                        {record ? (
                          <div className="flex items-center gap-2">
                            <Badge variant={
                              record.status === 'present' ? 'success' :
                              record.status === 'absent' ? 'danger' :
                              record.status === 'late' ? 'warning' : 'info'
                            }>
                              {record.status}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {record.method === 'gps' ? `GPS ${record.distanceFromCenter ? `(${record.distanceFromCenter}m)` : ''}` : 'Manual'}
                            </Badge>
                            {currentSession?.status === 'open' && (
                              <Button variant="ghost" size="sm" onClick={() => openOverride(record, student)}>
                                Override
                              </Button>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">Not marked</Badge>
                            {currentSession?.status === 'open' && (
                              <div className="flex gap-1">
                                <Button variant="ghost" size="sm" className="text-emerald-600" onClick={async () => {
                                  await upsertAttendanceRecord(currentSession.id!, student.uid, {
                                    studentName: student.name, rollNo: student.rollNo ?? '',
                                    status: 'present', method: 'manual',
                                    overrideReason: 'Manually marked present by teacher',
                                    overrideBy: user!.uid, overrideAt: Timestamp.now(),
                                  });
                                }}>
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" className="text-rose-500" onClick={async () => {
                                  await upsertAttendanceRecord(currentSession.id!, student.uid, {
                                    studentName: student.name, rollNo: student.rollNo ?? '',
                                    status: 'absent', method: 'manual',
                                    overrideReason: 'Manually marked absent by teacher',
                                    overrideBy: user!.uid, overrideAt: Timestamp.now(),
                                  });
                                }}>
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!selectedSchedule && !loading && (
        <div className="py-20 text-center text-muted-foreground">
          <Clock className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>Select a class from the dropdown above to get started</p>
        </div>
      )}

      {/* Override Dialog */}
      <Dialog open={!!overrideDialog} onOpenChange={open => { if (!open) setOverrideDialog(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Override Attendance</DialogTitle>
          </DialogHeader>
          {overrideDialog && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Changing status for <strong>{overrideDialog.student.name}</strong>
              </p>
              <div className="space-y-1">
                <Label>New Status</Label>
                <Select value={overrideStatus} onValueChange={setOverrideStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="present">Present</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                    <SelectItem value="late">Late</SelectItem>
                    <SelectItem value="manual">Manual Override</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Reason * (required)</Label>
                <Input
                  placeholder="e.g. Student had battery issue"
                  value={overrideReason}
                  onChange={e => setOverrideReason(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOverrideDialog(null)}>Cancel</Button>
            <Button onClick={saveOverride} disabled={savingOverride}>
              {savingOverride ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Override'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
