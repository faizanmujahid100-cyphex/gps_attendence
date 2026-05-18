'use client';
import { useEffect, useState } from 'react';
import { Clock, BookOpen, Users, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getSchedules, getAttendanceSessions } from '@/lib/firestore';
import { useAuthStore } from '@/store/authStore';
import { getDayOfWeek, formatTime } from '@/lib/utils';
import { todayString } from '@/lib/utils';
import type { Schedule, AttendanceSession } from '@/types';

export default function TeacherDashboardPage() {
  const { user } = useAuthStore();
  const [todaySchedule, setTodaySchedule] = useState<Schedule[]>([]);
  const [todaySessions, setTodaySessions] = useState<AttendanceSession[]>([]);
  const [loading, setLoading] = useState(true);

  const today = getDayOfWeek();
  const todayDate = todayString();

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const [sched, sess] = await Promise.all([
          getSchedules(user.uid),
          getAttendanceSessions({ teacherUid: user.uid, date: todayDate }),
        ]);
        setTodaySchedule(sched.filter(s => s.dayOfWeek === today));
        setTodaySessions(sess);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, today, todayDate]);

  const getSessionForSchedule = (scheduleId: string) =>
    todaySessions.find(s => s.scheduleId === scheduleId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Good morning, {user?.name?.split(' ')[0]}</h1>
        <p className="text-muted-foreground text-sm">
          {today} — {new Date().toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Today's Classes */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Today&apos;s Schedule</h2>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="h-32 skeleton rounded-lg" />)}
          </div>
        ) : todaySchedule.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>No classes scheduled for today</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {todaySchedule.map(sch => {
              const session = getSessionForSchedule(sch.id!);
              return (
                <Card key={sch.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-base">{sch.subject}</h3>
                        <p className="text-sm text-muted-foreground">Room {sch.room}</p>
                      </div>
                      {session ? (
                        <Badge variant={session.status === 'open' ? 'success' : 'secondary'}>
                          {session.status === 'open' ? 'Live' : 'Closed'}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Upcoming</Badge>
                      )}
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>{sch.startTime} – {sch.endTime}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <span>Semester {sch.semester}, Section {sch.section}</span>
                      </div>
                    </div>
                    {session?.confirmedByTeacher && (
                      <div className="mt-3 flex items-center gap-1 text-xs text-emerald-600">
                        <CheckCircle className="w-3 h-3" /> Attendance confirmed
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Today&apos;s Classes</p>
            <p className="text-3xl font-bold mt-1">{todaySchedule.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Sessions Opened</p>
            <p className="text-3xl font-bold mt-1">{todaySessions.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Confirmed</p>
            <p className="text-3xl font-bold mt-1">{todaySessions.filter(s => s.confirmedByTeacher).length}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
