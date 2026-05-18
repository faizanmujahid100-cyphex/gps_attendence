'use client';
import { useEffect, useState, useCallback } from 'react';
import { History, Loader2, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getAttendanceSessions, getAttendanceRecords } from '@/lib/firestore';
import { useAuthStore } from '@/store/authStore';
import { formatDate, formatDateTime } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import type { AttendanceSession, AttendanceRecord } from '@/types';

export default function TeacherHistoryPage() {
  const { user } = useAuthStore();
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<AttendanceSession | null>(null);
  const [sessionRecords, setSessionRecords] = useState<AttendanceRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      setSessions(await getAttendanceSessions({ teacherUid: user.uid }));
    } catch {
      toast({ title: 'Failed to load history', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const viewSession = async (session: AttendanceSession) => {
    setSelectedSession(session);
    setLoadingRecords(true);
    try {
      setSessionRecords(await getAttendanceRecords({ sessionId: session.id }));
    } finally {
      setLoadingRecords(false);
    }
  };

  const presentCount = sessionRecords.filter(r => r.status === 'present' || r.status === 'late').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Attendance History</h1>
        <p className="text-muted-foreground text-sm">Past sessions and records</p>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" /></div>
          ) : sessions.length === 0 ? (
            <div className="p-16 text-center text-muted-foreground">
              <History className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No sessions yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {sessions.map(session => (
                <div key={session.id} className="flex items-center gap-4 px-6 py-4 hover:bg-muted/20">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{session.subject}</p>
                      <Badge variant={session.status === 'open' ? 'success' : 'secondary'}>
                        {session.status}
                      </Badge>
                      {session.confirmedByTeacher && (
                        <Badge variant="info">Confirmed</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(session.date)} · Sem {session.semester} · Sec {session.section}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(session.startTime.toDate())}
                      {session.endTime && ` → ${formatDateTime(session.endTime.toDate())}`}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => viewSession(session)}>
                    Details <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedSession} onOpenChange={open => { if (!open) setSelectedSession(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedSession?.subject} — {selectedSession ? formatDate(selectedSession.date) : ''}
            </DialogTitle>
          </DialogHeader>
          {loadingRecords ? (
            <div className="py-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto" /></div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-emerald-50 text-center">
                  <p className="text-xs text-emerald-600">Present</p>
                  <p className="text-xl font-bold text-emerald-700">{presentCount}</p>
                </div>
                <div className="p-3 rounded-lg bg-rose-50 text-center">
                  <p className="text-xs text-rose-600">Absent</p>
                  <p className="text-xl font-bold text-rose-700">{sessionRecords.filter(r => r.status === 'absent').length}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted text-center">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-xl font-bold">{sessionRecords.length}</p>
                </div>
              </div>
              <div className="divide-y border rounded-lg">
                {sessionRecords.map(record => (
                  <div key={record.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{record.studentName}</p>
                      <p className="text-xs text-muted-foreground">{record.rollNo}</p>
                    </div>
                    <Badge variant={
                      record.status === 'present' ? 'success' :
                      record.status === 'absent' ? 'danger' :
                      record.status === 'late' ? 'warning' : 'info'
                    }>{record.status}</Badge>
                    <Badge variant="outline" className="text-xs">{record.method}</Badge>
                    {record.overrideReason && (
                      <span className="text-xs text-muted-foreground truncate max-w-32" title={record.overrideReason}>
                        {record.overrideReason}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
