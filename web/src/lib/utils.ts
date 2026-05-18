import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO } from 'date-fns';
import { Timestamp } from 'firebase/firestore';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | Timestamp): string {
  let d: Date;
  if (date instanceof Timestamp) {
    d = date.toDate();
  } else if (typeof date === 'string') {
    d = parseISO(date);
  } else {
    d = date;
  }
  return format(d, 'dd/MM/yyyy');
}

export function formatTime(date: Date | string | Timestamp): string {
  let d: Date;
  if (date instanceof Timestamp) {
    d = date.toDate();
  } else if (typeof date === 'string') {
    d = new Date(`1970-01-01T${date}`);
  } else {
    d = date;
  }
  return format(d, 'hh:mm a');
}

export function formatDateTime(date: Date | Timestamp): string {
  const d = date instanceof Timestamp ? date.toDate() : date;
  return format(d, 'dd/MM/yyyy hh:mm a');
}

export function todayString(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function getAttendanceColor(status: string): string {
  switch (status) {
    case 'present': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    case 'absent': return 'text-rose-600 bg-rose-50 border-rose-200';
    case 'late': return 'text-amber-600 bg-amber-50 border-amber-200';
    case 'manual': return 'text-blue-600 bg-blue-50 border-blue-200';
    default: return 'text-slate-600 bg-slate-50 border-slate-200';
  }
}

export function getAttendanceBadgeVariant(status: string) {
  switch (status) {
    case 'present': return 'success';
    case 'absent': return 'destructive';
    case 'late': return 'warning';
    case 'manual': return 'info';
    default: return 'secondary';
  }
}

export function calculateAttendancePercentage(present: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((present / total) * 100);
}

export function getDayOfWeek(): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[new Date().getDay()];
}

export function paginate<T>(data: T[], page: number, pageSize: number = 20): T[] {
  return data.slice((page - 1) * pageSize, page * pageSize);
}

export function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim());
    return headers.reduce((acc, header, i) => {
      acc[header] = values[i] ?? '';
      return acc;
    }, {} as Record<string, string>);
  });
}
