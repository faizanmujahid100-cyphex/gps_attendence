'use client';
import { useEffect, useState, useCallback } from 'react';
import { Plus, Edit2, Trash2, Loader2, Calendar } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { getSchedules, addSchedule, updateSchedule, deleteSchedule, getUsers } from '@/lib/firestore';
import { toast } from '@/hooks/use-toast';
import type { Schedule, User } from '@/types';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const schema = z.object({
  teacherUid: z.string().min(1, 'Teacher required'),
  subject: z.string().min(1, 'Subject required'),
  semester: z.string().min(1, 'Semester required'),
  section: z.string().min(1, 'Section required'),
  room: z.string().min(1, 'Room required'),
  dayOfWeek: z.string().min(1, 'Day required'),
  startTime: z.string().min(1, 'Start time required'),
  endTime: z.string().min(1, 'End time required'),
});
type FormData = z.infer<typeof schema>;

export default function AdminSchedulePage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDay, setActiveDay] = useState('Monday');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editSchedule, setEditSchedule] = useState<Schedule | null>(null);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sch, tch] = await Promise.all([getSchedules(), getUsers('teacher')]);
      setSchedules(sch);
      setTeachers(tch);
    } catch {
      toast({ title: 'Failed to load schedule', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const daySchedules = schedules.filter(s => s.dayOfWeek === activeDay)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const getTeacherName = (uid: string) => teachers.find(t => t.uid === uid)?.name ?? uid;

  const openAdd = () => {
    setEditSchedule(null);
    reset({ dayOfWeek: activeDay });
    setDialogOpen(true);
  };

  const openEdit = (s: Schedule) => {
    setEditSchedule(s);
    reset({
      teacherUid: s.teacherUid, subject: s.subject, semester: String(s.semester),
      section: s.section, room: s.room, dayOfWeek: s.dayOfWeek, startTime: s.startTime, endTime: s.endTime,
    });
    setDialogOpen(true);
  };

  // Conflict detection
  const detectConflict = (data: FormData, excludeId?: string): boolean => {
    return schedules.some(s => {
      if (s.id === excludeId) return false;
      if (s.teacherUid !== data.teacherUid) return false;
      if (s.dayOfWeek !== data.dayOfWeek) return false;
      const newStart = data.startTime, newEnd = data.endTime;
      return (newStart >= s.startTime && newStart < s.endTime) ||
             (newEnd > s.startTime && newEnd <= s.endTime) ||
             (newStart <= s.startTime && newEnd >= s.endTime);
    });
  };

  const onSubmit = async (data: FormData) => {
    if (detectConflict(data, editSchedule?.id)) {
      toast({ title: 'Schedule conflict', description: 'Teacher already has a class at this time', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const payload: Omit<Schedule, 'id'> = {
        teacherUid: data.teacherUid, subject: data.subject, semester: Number(data.semester),
        section: data.section, room: data.room, dayOfWeek: data.dayOfWeek,
        startTime: data.startTime, endTime: data.endTime, isActive: true,
      };
      if (editSchedule) {
        await updateSchedule(editSchedule.id!, payload);
        toast({ title: 'Schedule updated', variant: 'success' as never });
      } else {
        await addSchedule(payload);
        toast({ title: 'Lecture added', variant: 'success' as never });
      }
      setDialogOpen(false);
      load();
    } catch {
      toast({ title: 'Failed to save', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Schedule</h1>
          <p className="text-muted-foreground text-sm">Weekly timetable management</p>
        </div>
        <Button onClick={openAdd}><Plus className="w-4 h-4 mr-1" /> Add Lecture</Button>
      </div>

      {/* Day Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
        {DAYS.map(day => (
          <button
            key={day}
            onClick={() => setActiveDay(day)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeDay === day ? 'bg-white dark:bg-slate-800 shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {day.slice(0, 3)}
          </button>
        ))}
      </div>

      {/* Schedule Grid */}
      <Card>
        <CardHeader>
          <CardTitle>{activeDay}&apos;s Classes</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" /></div>
          ) : daySchedules.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No classes on {activeDay}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {daySchedules.map(sch => (
                <div key={sch.id} className="flex items-center gap-4 p-4 rounded-lg border hover:border-blue-300 transition-colors">
                  <div className="text-center min-w-16">
                    <p className="text-sm font-bold text-blue-600">{sch.startTime}</p>
                    <p className="text-xs text-muted-foreground">{sch.endTime}</p>
                  </div>
                  <div className="w-px h-10 bg-border" />
                  <div className="flex-1">
                    <p className="font-semibold">{sch.subject}</p>
                    <p className="text-sm text-muted-foreground">{getTeacherName(sch.teacherUid)}</p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="secondary">Sem {sch.semester}</Badge>
                    <Badge variant="outline">Sec {sch.section}</Badge>
                    <Badge variant="outline">Room {sch.room}</Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(sch)}><Edit2 className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-rose-500" onClick={async () => {
                      await deleteSchedule(sch.id!);
                      toast({ title: 'Lecture removed', variant: 'success' as never });
                      load();
                    }}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editSchedule ? 'Edit Lecture' : 'Add Lecture'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label>Teacher *</Label>
                <Select onValueChange={v => setValue('teacherUid', v)} defaultValue={editSchedule?.teacherUid}>
                  <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
                  <SelectContent>
                    {teachers.map(t => <SelectItem key={t.uid} value={t.uid}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.teacherUid && <p className="text-xs text-rose-500">{errors.teacherUid.message}</p>}
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Subject *</Label>
                <Input placeholder="e.g. Data Structures" {...register('subject')} />
                {errors.subject && <p className="text-xs text-rose-500">{errors.subject.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Semester *</Label>
                <Input type="number" min={1} max={8} {...register('semester')} />
                {errors.semester && <p className="text-xs text-rose-500">{errors.semester.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Section *</Label>
                <Input placeholder="A" {...register('section')} />
                {errors.section && <p className="text-xs text-rose-500">{errors.section.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Room *</Label>
                <Input placeholder="CS-101" {...register('room')} />
                {errors.room && <p className="text-xs text-rose-500">{errors.room.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Day *</Label>
                <Select onValueChange={v => setValue('dayOfWeek', v)} defaultValue={editSchedule?.dayOfWeek ?? activeDay}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Start Time *</Label>
                <Input type="time" {...register('startTime')} />
                {errors.startTime && <p className="text-xs text-rose-500">{errors.startTime.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>End Time *</Label>
                <Input type="time" {...register('endTime')} />
                {errors.endTime && <p className="text-xs text-rose-500">{errors.endTime.message}</p>}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editSchedule ? 'Update' : 'Add Lecture'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
