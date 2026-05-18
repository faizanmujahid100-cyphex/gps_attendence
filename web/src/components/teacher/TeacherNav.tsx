'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, ClipboardList, History, Users, LogOut, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { logoutUser } from '@/lib/auth';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/hooks/use-toast';

const navItems = [
  { href: '/teacher/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/teacher/attendance', icon: ClipboardList, label: 'Attendance' },
  { href: '/teacher/history', icon: History, label: 'History' },
  { href: '/teacher/students', icon: Users, label: 'My Students' },
];

export function TeacherNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearUser } = useAuthStore();

  const handleLogout = async () => {
    try {
      await logoutUser();
      clearUser();
      document.cookie = 'gigccl-auth=; path=/; max-age=0';
      router.replace('/login');
    } catch {
      toast({ title: 'Logout failed', variant: 'destructive' });
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-slate-900 border-b shadow-sm">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm hidden sm:block">GIGCCL — Teacher Portal</span>
        </div>

        <nav className="flex items-center gap-1">
          {navItems.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                pathname === href
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden md:block">{label}</span>
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium">{user?.name}</p>
            <p className="text-xs text-muted-foreground">Teacher</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <button onClick={handleLogout} className="text-muted-foreground hover:text-rose-500 transition-colors" title="Logout">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
