'use client';
import { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Upload, Download, Edit2, Trash2, Loader2, Users } from 'lucide-react';
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
import { getUsers, updateUser, deactivateUser } from '@/lib/firestore';
import { createUserAccount } from '@/lib/auth';
import { toast } from '@/hooks/use-toast';
import { formatDate, parseCSV } from '@/lib/utils';
import type { User } from '@/types';

const schema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email required'),
  password: z.string().min(6, 'Min 6 characters').optional().or(z.literal('')),
  rollNo: z.string().min(1, 'Roll number required'),
  semester: z.string().min(1, 'Semester required'),
  section: z.string().min(1, 'Section required'),
  phone: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const PAGE_SIZE = 20;

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<User[]>([]);
  const [filtered, setFiltered] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [semFilter, setSemFilter] = useState('all');
  const [secFilter, setSecFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editStudent, setEditStudent] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<User | null>(null);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const loadStudents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getUsers('student');
      setStudents(data);
    } catch {
      toast({ title: 'Failed to load students', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadStudents(); }, [loadStudents]);

  useEffect(() => {
    let result = students;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.rollNo?.toLowerCase().includes(q)
      );
    }
    if (semFilter !== 'all') result = result.filter(s => String(s.semester) === semFilter);
    if (secFilter !== 'all') result = result.filter(s => s.section === secFilter);
    setFiltered(result);
    setPage(1);
  }, [students, search, semFilter, secFilter]);

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const openAdd = () => { setEditStudent(null); reset(); setDialogOpen(true); };
  const openEdit = (s: User) => {
    setEditStudent(s);
    reset({
      name: s.name, email: s.email, rollNo: s.rollNo, semester: String(s.semester),
      section: s.section, phone: s.phone ?? '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    try {
      if (editStudent) {
        await updateUser(editStudent.uid, {
          name: data.name, rollNo: data.rollNo, semester: Number(data.semester),
          section: data.section, phone: data.phone,
        });
        toast({ title: 'Student updated successfully', variant: 'success' as never });
      } else {
        await createUserAccount(data.email, data.password || 'Student@123', 'student', {
          name: data.name, rollNo: data.rollNo, semester: Number(data.semester),
          section: data.section, phone: data.phone, isActive: true,
        });
        toast({ title: 'Student account created', description: `Password: ${data.password || 'Student@123'}`, variant: 'success' as never });
      }
      setDialogOpen(false);
      loadStudents();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Operation failed';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (student: User) => {
    try {
      await deactivateUser(student.uid);
      toast({ title: 'Student deactivated', variant: 'success' as never });
      setDeleteConfirm(null);
      loadStudents();
    } catch {
      toast({ title: 'Failed to deactivate', variant: 'destructive' });
    }
  };

  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = ev.target?.result as string;
      const rows = parseCSV(text);
      let created = 0;
      for (const row of rows) {
        try {
          await createUserAccount(row.email, 'Student@123', 'student', {
            name: row.name, rollNo: row.rollNo, semester: Number(row.semester),
            section: row.section, phone: row.phone, isActive: true,
          });
          created++;
        } catch { /* skip duplicates */ }
      }
      toast({ title: `Imported ${created} students`, variant: 'success' as never });
      loadStudents();
    };
    reader.readAsText(file);
  };

  const exportCSV = () => {
    const headers = 'Roll No,Name,Email,Semester,Section,Phone\n';
    const rows = students.map(s => `${s.rollNo},${s.name},${s.email},${s.semester},${s.section},${s.phone ?? ''}`).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'students.csv'; a.click();
  };

  const semesters = [...new Set(students.map(s => String(s.semester)))].sort();
  const sections = [...new Set(students.map(s => s.section ?? ''))].filter(Boolean).sort();

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Students</h1>
          <p className="text-muted-foreground text-sm">{students.length} total students</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="w-4 h-4 mr-1" /> Export CSV
          </Button>
          <label>
            <Button variant="outline" size="sm" asChild>
              <span><Upload className="w-4 h-4 mr-1" /> Import CSV</span>
            </Button>
            <input type="file" accept=".csv" className="hidden" onChange={handleCSVImport} />
          </label>
          <Button onClick={openAdd}>
            <Plus className="w-4 h-4 mr-1" /> Add Student
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search by name, email or roll no..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={semFilter} onValueChange={setSemFilter}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Semester" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Semesters</SelectItem>
                {semesters.map(s => <SelectItem key={s} value={s}>Semester {s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={secFilter} onValueChange={setSecFilter}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Section" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sections</SelectItem>
                {sections.map(s => <SelectItem key={s} value={s}>Section {s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-16 text-center text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No students found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground">Roll No</th>
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground">Name</th>
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground">Email</th>
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground">Semester</th>
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground">Section</th>
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-right px-6 py-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(student => (
                    <tr key={student.uid} className="border-b hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-3 font-mono text-xs">{student.rollNo}</td>
                      <td className="px-6 py-3 font-medium">{student.name}</td>
                      <td className="px-6 py-3 text-muted-foreground">{student.email}</td>
                      <td className="px-6 py-3">{student.semester}</td>
                      <td className="px-6 py-3">{student.section}</td>
                      <td className="px-6 py-3">
                        <Badge variant={student.isActive ? 'success' : 'secondary'}>
                          {student.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(student)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-rose-500 hover:text-rose-600" onClick={() => setDeleteConfirm(student)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-3 border-t">
                  <p className="text-sm text-muted-foreground">
                    Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
                  </p>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
                    {Array.from({ length: totalPages }, (_, i) => (
                      <Button key={i + 1} variant={page === i + 1 ? 'default' : 'outline'} size="sm" onClick={() => setPage(i + 1)}>
                        {i + 1}
                      </Button>
                    ))}
                    <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editStudent ? 'Edit Student' : 'Add New Student'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label>Full Name *</Label>
                <Input placeholder="Muhammad Ali" {...register('name')} />
                {errors.name && <p className="text-xs text-rose-500">{errors.name.message}</p>}
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Email *</Label>
                <Input type="email" placeholder="student@gigccl.edu.pk" disabled={!!editStudent} {...register('email')} />
                {errors.email && <p className="text-xs text-rose-500">{errors.email.message}</p>}
              </div>
              {!editStudent && (
                <div className="col-span-2 space-y-1">
                  <Label>Password (default: Student@123)</Label>
                  <Input type="password" placeholder="Leave blank for default" {...register('password')} />
                  {errors.password && <p className="text-xs text-rose-500">{errors.password.message}</p>}
                </div>
              )}
              <div className="space-y-1">
                <Label>Roll Number *</Label>
                <Input placeholder="2024-CS-001" {...register('rollNo')} />
                {errors.rollNo && <p className="text-xs text-rose-500">{errors.rollNo.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Phone</Label>
                <Input placeholder="+92-XXX-XXXXXXX" {...register('phone')} />
              </div>
              <div className="space-y-1">
                <Label>Semester *</Label>
                <Input type="number" min={1} max={8} placeholder="1-8" {...register('semester')} />
                {errors.semester && <p className="text-xs text-rose-500">{errors.semester.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Section *</Label>
                <Input placeholder="A or B" {...register('section')} />
                {errors.section && <p className="text-xs text-rose-500">{errors.section.message}</p>}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editStudent ? 'Save Changes' : 'Create Student'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Deactivate Student?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will deactivate <strong>{deleteConfirm?.name}</strong>&apos;s account. They will no longer be able to log in.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>
              Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
