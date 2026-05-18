'use client';
import { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Edit2, Trash2, Loader2, UserCheck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { getUsers, updateUser, deactivateUser } from '@/lib/firestore';
import { createUserAccount } from '@/lib/auth';
import { toast } from '@/hooks/use-toast';
import type { User } from '@/types';

const schema = z.object({
  name: z.string().min(2, 'Name required'),
  email: z.string().email('Valid email required'),
  password: z.string().min(6).optional().or(z.literal('')),
  department: z.string().min(1, 'Department required'),
  phone: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const PAGE_SIZE = 20;

export default function AdminTeachersPage() {
  const [teachers, setTeachers] = useState<User[]>([]);
  const [filtered, setFiltered] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTeacher, setEditTeacher] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<User | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTeachers(await getUsers('teacher'));
    } catch {
      toast({ title: 'Failed to load teachers', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(q ? teachers.filter(t => t.name.toLowerCase().includes(q) || t.email.toLowerCase().includes(q)) : teachers);
    setPage(1);
  }, [teachers, search]);

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const openAdd = () => { setEditTeacher(null); reset(); setDialogOpen(true); };
  const openEdit = (t: User) => {
    setEditTeacher(t);
    reset({ name: t.name, email: t.email, department: t.department, phone: t.phone ?? '' });
    setDialogOpen(true);
  };

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    try {
      if (editTeacher) {
        await updateUser(editTeacher.uid, { name: data.name, department: data.department, phone: data.phone });
        toast({ title: 'Teacher updated', variant: 'success' as never });
      } else {
        await createUserAccount(data.email, data.password || 'Teacher@123', 'teacher', {
          name: data.name, department: data.department, phone: data.phone, isActive: true,
        });
        toast({ title: 'Teacher account created', variant: 'success' as never });
      }
      setDialogOpen(false);
      load();
    } catch (e: unknown) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Failed', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Teachers</h1>
          <p className="text-muted-foreground text-sm">{teachers.length} faculty members</p>
        </div>
        <Button onClick={openAdd}><Plus className="w-4 h-4 mr-1" /> Add Teacher</Button>
      </div>

      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search teachers..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="p-16 text-center text-muted-foreground">
              <UserCheck className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No teachers found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground">Name</th>
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground">Email</th>
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground">Department</th>
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground">Phone</th>
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-right px-6 py-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(teacher => (
                    <tr key={teacher.uid} className="border-b hover:bg-muted/20">
                      <td className="px-6 py-3 font-medium">{teacher.name}</td>
                      <td className="px-6 py-3 text-muted-foreground">{teacher.email}</td>
                      <td className="px-6 py-3">{teacher.department ?? '—'}</td>
                      <td className="px-6 py-3 text-muted-foreground">{teacher.phone ?? '—'}</td>
                      <td className="px-6 py-3">
                        <Badge variant={teacher.isActive ? 'success' : 'secondary'}>{teacher.isActive ? 'Active' : 'Inactive'}</Badge>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(teacher)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-rose-500" onClick={() => setDeleteConfirm(teacher)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-3 border-t">
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editTeacher ? 'Edit Teacher' : 'Add Teacher'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <Label>Full Name *</Label>
              <Input placeholder="Dr. Ahmad Khan" {...register('name')} />
              {errors.name && <p className="text-xs text-rose-500">{errors.name.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Email *</Label>
              <Input type="email" disabled={!!editTeacher} {...register('email')} />
              {errors.email && <p className="text-xs text-rose-500">{errors.email.message}</p>}
            </div>
            {!editTeacher && (
              <div className="space-y-1">
                <Label>Password (default: Teacher@123)</Label>
                <Input type="password" placeholder="Leave blank for default" {...register('password')} />
              </div>
            )}
            <div className="space-y-1">
              <Label>Department *</Label>
              <Input placeholder="Computer Science" {...register('department')} />
              {errors.department && <p className="text-xs text-rose-500">{errors.department.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input placeholder="+92-XXX-XXXXXXX" {...register('phone')} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editTeacher ? 'Save' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Deactivate Teacher?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Deactivate <strong>{deleteConfirm?.name}</strong>?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={async () => { if (deleteConfirm) { await deactivateUser(deleteConfirm.uid); setDeleteConfirm(null); load(); } }}>Deactivate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
