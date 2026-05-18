'use client';
import { useEffect, useState } from 'react';
import { Users, UserCheck, Activity, CheckCircle2, TrendingUp, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getUsers } from '@/lib/firestore';
import { subscribeToActiveSessions } from '@/lib/firestore';
import { formatDateTime, formatTime } from '@/lib/utils';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import type { AttendanceSession } from '@/types';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
  color: string;
  loading?: boolean;
}

function StatCard({ title, value, icon: Icon, description, color, loading }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            {loading ? (
              <div className="h-8 w-16 skeleton mt-1" />
            ) : (
              <p className="text-3xl font-bold mt-1">{value}</p>
            )}
            {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const COLORS = ['#10b981', '#f43f5e', '#f59e0b', '#3b82f6'];

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({ students: 0, teachers: 0 });
  const [activeSessions, setActiveSessions] = useState<AttendanceSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartData] = useState([
    { name: 'Present', value: 68 },
    { name: 'Absent', value: 22 },
    { name: 'Late', value: 7 },
    { name: 'Manual', value: 3 },
  ]);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [students, teachers] = await Promise.all([
          getUsers('student'),
          getUsers('teacher'),
        ]);
        setStats({ students: students.length, teachers: teachers.length });
      } catch {
        // stats remain 0
      } finally {
        setLoading(false);
      }
    };
    loadStats();

    const unsub = subscribeToActiveSessions(setActiveSessions);
    return unsub;
  }, []);

  const totalPresent = chartData.find(d => d.name === 'Present')?.value ?? 0;
  const totalAll = chartData.reduce((s, d) => s + d.value, 0);
  const presentPercent = Math.round((totalPresent / totalAll) * 100);

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Welcome back — here&apos;s today&apos;s overview</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard
          title="Total Students"
          value={stats.students}
          icon={Users}
          description="Active enrolled students"
          color="bg-blue-600"
          loading={loading}
        />
        <StatCard
          title="Total Teachers"
          value={stats.teachers}
          icon={UserCheck}
          description="Active faculty members"
          color="bg-violet-600"
          loading={loading}
        />
        <StatCard
          title="Today's Attendance"
          value={`${presentPercent}%`}
          icon={TrendingUp}
          description="Present students today"
          color="bg-emerald-600"
          loading={loading}
        />
        <StatCard
          title="Active Sessions"
          value={activeSessions.length}
          icon={Activity}
          description="Currently running classes"
          color="bg-amber-500"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Attendance Chart */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Today&apos;s Attendance Breakdown</CardTitle>
            <CardDescription>Live attendance distribution across all classes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-8">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                    {chartData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`${value} students`, '']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3 flex-shrink-0">
                {chartData.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                    <span className="text-sm text-muted-foreground">{item.name}</span>
                    <span className="text-sm font-semibold ml-auto">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Sessions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              Active Sessions
            </CardTitle>
            <CardDescription>Currently open attendance sessions</CardDescription>
          </CardHeader>
          <CardContent>
            {activeSessions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No active sessions</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeSessions.map(session => (
                  <div key={session.id} className="p-3 rounded-lg border bg-muted/30">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">{session.subject}</p>
                        <p className="text-xs text-muted-foreground">
                          Sem {session.semester} — {session.section}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Started: {formatTime(session.startTime.toDate())}
                        </p>
                      </div>
                      <Badge variant="success">Live</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest system events</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { text: 'Attendance session opened for CS-401 (Sem 4, Sec A)', time: '2 min ago', type: 'session' },
              { text: 'Student Ali Hassan marked present via GPS', time: '5 min ago', type: 'present' },
              { text: 'Teacher Dr. Malik confirmed attendance for Math-301', time: '18 min ago', type: 'confirm' },
              { text: 'New student account created: Fatima Zahra', time: '1 hr ago', type: 'new' },
              { text: 'Geofence radius updated to 200m', time: '3 hrs ago', type: 'settings' },
            ].map((activity, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b last:border-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <p className="text-sm flex-1">{activity.text}</p>
                <span className="text-xs text-muted-foreground whitespace-nowrap">{activity.time}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
