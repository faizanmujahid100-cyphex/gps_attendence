'use client';
import { useEffect, useState, useCallback } from 'react';
import { Download, Loader2, ClipboardList } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getAttendanceSessions, getAttendanceRecords, getUsers } from '@/lib/firestore';
import { formatDate, formatDateTime, getAttendanceColor } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import type { AttendanceSession, AttendanceRecord, User } from '@/types';

const PAGE_SIZE = 20;

export default function AdminAttendancePage() {
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [semFilter, setSemFilter] = useState('all');
  const [secFilter, setSecFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedSession, setSelectedSession] = useState<string>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sess, recs, studs] = await Promise.all([
        getAttendanceSessions(),
        getAttendanceRecords(),
        getUsers('student'),
      ]);
      setSessions(sess);
      setRecords(recs);
      setStudents(studs);
    } catch {
      toast({ title: 'Failed to load attendance', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = records.filter(r => {
    if (selectedSession !== 'all' && r.sessionId !== selectedSession) return false;
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    const session = sessions.find(s => s.id === r.sessionId);
    if (session) {
      if (semFilter !== 'all' && String(session.semester) !== semFilter) return false;
      if (secFilter !== 'all' && session.section !== secFilter) return false;
      if (dateFrom && session.date < dateFrom) return false;
      if (dateTo && session.date > dateTo) return false;
    }
    return true;
  });

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const presentCount = filtered.filter(r => r.status === 'present').length;
  const absentCount = filtered.filter(r => r.status === 'absent').length;
  const lateCount = filtered.filter(r => r.status === 'late').length;

  const exportCSV = () => {
    const headers = 'Student,Roll No,Subject,Date,Status,Method,Distance\n';
    const rows = filtered.map(r => {
      const session = sessions.find(s => s.id === r.sessionId);
      return `${r.studentName},${r.rollNo},${session?.subject ?? ''},${session?.date ?? ''},${r.status},${r.method},${r.distanceFromCenter ?? ''}`;
    }).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'attendance.csv'; a.click();
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'danger' | 'warning' | 'info'> = {
      present: 'success', absent: 'danger', late: 'warning', manual: 'info',
    };
    return <Badge variant={variants[status] ?? 'secondary'}>{status.toUpperCase()}</Badge>;
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Attendance Records</h1>
          <p className="text-muted-foreground text-sm">{records.length} total records</p>
        </div>
        <Button variant="outline" onClick={exportCSV}><Download className="w-4 h-4 mr-1" /> Export CSV</Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Present', count: presentCount, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Absent', count: absentCount, color: 'text-rose-600 bg-rose-50' },
          { label: 'Late', count: lateCount, color: 'text-amber-600 bg-amber-50' },
        ].map(item => (
          <Card key={item.label}>
            <CardContent className={`p-4 rounded-lg ${item.color}`}>
              <p className="text-sm font-medium">{item.label}</p>
              <p className="text-3xl font-bold mt-1">{item.count}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-3">
            <Input type="date" className="w-40" value={dateFrom} onChange={e => setDateFrom(e.target.value)} placeholder="From" />
            <Input type="date" className="w-40" value={dateTo} onChange={e => setDateTo(e.target.value)} placeholder="To" />
            <Select value={semFilter} onValueChange={setSemFilter}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Semester" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Semesters</SelectItem>
                {[1,2,3,4,5,6,7,8].map(s => <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={secFilter} onValueChange={setSecFilter}>
              <SelectTrigger className="w-32"><SelectValue placeholder="Section" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sections</SelectItem>
                {['A','B','C'].map(s => <SelectItem key={s} value={s}>Section {s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="present">Present</SelectItem>
                <SelectItem value="absent">Absent</SelectItem>
                <SelectItem value="late">Late</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Records Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="p-16 text-center text-muted-foreground">
              <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No records found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Student</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Roll No</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Subject</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Method</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Distance</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Marked At</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(record => {
                    const session = sessions.find(s => s.id === record.sessionId);
                    return (
                      <tr key={record.id} className="border-b hover:bg-muted/20">
                        <td className="px-4 py-3 font-medium">{record.studentName}</td>
                        <td className="px-4 py-3 font-mono text-xs">{record.rollNo}</td>
                        <td className="px-4 py-3">{session?.subject ?? '—'}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{session ? formatDate(session.date) : '—'}</td>
                        <td className="px-4 py-3">{getStatusBadge(record.status)}</td>
                        <td className="px-4 py-3">
                          <Badge variant={record.method === 'gps' ? 'info' : 'secondary'}>{record.method.toUpperCase()}</Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {record.distanceFromCenter != null ? `${record.distanceFromCenter}m` : '—'}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {formatDateTime(record.markedAt.toDate())}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <p className="text-sm text-muted-foreground">
                    {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
                  </p>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
                    <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
