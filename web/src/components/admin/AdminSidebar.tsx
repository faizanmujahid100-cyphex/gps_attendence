'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, UserCheck, Calendar, ClipboardList,
  MapPin, MessageSquare, BarChart3, GraduationCap, LogOut, Moon, Sun,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { logoutUser } from '@/lib/auth';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/hooks/use-toast';

const navItems = [
  { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/students', icon: Users, label: 'Students' },
  { href: '/admin/teachers', icon: UserCheck, label: 'Teachers' },
  { href: '/admin/schedule', icon: Calendar, label: 'Schedule' },
  { href: '/admin/attendance', icon: ClipboardList, label: 'Attendance' },
  { href: '/admin/geofence', icon: MapPin, label: 'Geofence' },
  { href: '/admin/complaints', icon: MessageSquare, label: 'Complaints' },
  { href: '/admin/reports', icon: BarChart3, label: 'Reports' },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearUser } = useAuthStore();
  const [darkMode, setDarkMode] = useState(false);

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

  const toggleDark = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <aside className="w-64 min-h-screen bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm text-white">GIGCCL</p>
            <p className="text-[10px] text-slate-400 leading-tight">Attendance System</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                active
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-400 hover:bg-sidebar-accent hover:text-white'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border space-y-2">
        <button
          onClick={toggleDark}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-sidebar-accent transition-all w-full"
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          {darkMode ? 'Light Mode' : 'Dark Mode'}
        </button>

        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">{user?.name}</p>
            <p className="text-slate-500 text-[10px] truncate">Administrator</p>
          </div>
          <button onClick={handleLogout} className="text-slate-500 hover:text-rose-400 transition-colors" title="Logout">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
