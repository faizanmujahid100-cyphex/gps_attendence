'use client';
import { useEffect, useState, useCallback } from 'react';
import { MessageSquare, Loader2, CheckCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { getComplaints, resolveComplaint } from '@/lib/firestore';
import { formatDateTime } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import type { Complaint } from '@/types';

const schema = z.object({ response: z.string().min(5, 'Response must be at least 5 characters') });
type FormData = z.infer<typeof schema>;

export default function AdminComplaintsPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Complaint | null>(null);
  const [resolving, setResolving] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setComplaints(await getComplaints());
    } catch {
      toast({ title: 'Failed to load complaints', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onResolve = async (data: FormData) => {
    if (!selected) return;
    setResolving(true);
    try {
      await resolveComplaint(selected.id!, data.response);
      toast({ title: 'Complaint resolved', variant: 'success' as never });
      setSelected(null);
      reset();
      load();
    } catch {
      toast({ title: 'Failed to resolve', variant: 'destructive' });
    } finally {
      setResolving(false);
    }
  };

  const pending = complaints.filter(c => c.status === 'pending');
  const resolved = complaints.filter(c => c.status === 'resolved');

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Student Complaints</h1>
        <p className="text-muted-foreground text-sm">{pending.length} pending, {resolved.length} resolved</p>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" /></div>
          ) : complaints.length === 0 ? (
            <div className="p-16 text-center text-muted-foreground">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No complaints yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground">Student</th>
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground">Subject</th>
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground">Message</th>
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground">Submitted</th>
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-right px-6 py-3 font-medium text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {complaints.map(c => (
                    <tr key={c.id} className="border-b hover:bg-muted/20">
                      <td className="px-6 py-3 font-medium">{c.studentName}</td>
                      <td className="px-6 py-3">{c.subject}</td>
                      <td className="px-6 py-3 max-w-xs">
                        <p className="truncate text-muted-foreground">{c.message}</p>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-muted-foreground">
                        {formatDateTime(c.createdAt.toDate())}
                      </td>
                      <td className="px-6 py-3">
                        <Badge variant={c.status === 'pending' ? 'warning' : 'success'}>
                          {c.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <Button
                          variant={c.status === 'pending' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => { setSelected(c); reset({ response: c.response ?? '' }); }}
                        >
                          {c.status === 'pending' ? 'Resolve' : 'View'}
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

      <Dialog open={!!selected} onOpenChange={open => { if (!open) { setSelected(null); reset(); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selected?.status === 'pending' ? 'Resolve Complaint' : 'View Complaint'}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/40 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">{selected.studentName}</span>
                  <Badge variant={selected.status === 'pending' ? 'warning' : 'success'}>{selected.status}</Badge>
                </div>
                <p className="text-sm font-semibold">{selected.subject}</p>
                <p className="text-sm text-muted-foreground">{selected.message}</p>
                <p className="text-xs text-muted-foreground">{formatDateTime(selected.createdAt.toDate())}</p>
              </div>

              {selected.status === 'pending' ? (
                <form onSubmit={handleSubmit(onResolve)} className="space-y-3">
                  <div className="space-y-1">
                    <Label>Response *</Label>
                    <textarea
                      className="w-full min-h-24 rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      placeholder="Write your response to the student..."
                      {...register('response')}
                    />
                    {errors.response && <p className="text-xs text-rose-500">{errors.response.message}</p>}
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setSelected(null)}>Cancel</Button>
                    <Button type="submit" disabled={resolving} variant="success">
                      {resolving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-4 h-4 mr-1" /> Mark Resolved</>}
                    </Button>
                  </DialogFooter>
                </form>
              ) : (
                <div className="space-y-2">
                  <Label>Admin Response</Label>
                  <p className="text-sm p-3 bg-emerald-50 dark:bg-emerald-950 rounded-lg text-emerald-800 dark:text-emerald-300">
                    {selected.response}
                  </p>
                  {selected.resolvedAt && (
                    <p className="text-xs text-muted-foreground">Resolved: {formatDateTime(selected.resolvedAt.toDate())}</p>
                  )}
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setSelected(null)}>Close</Button>
                  </DialogFooter>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
