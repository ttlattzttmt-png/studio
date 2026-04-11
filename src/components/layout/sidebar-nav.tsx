
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  BookOpen, 
  Video, 
  ClipboardList, 
  Settings, 
  Users, 
  Ticket, 
  LogOut,
  BrainCircuit,
  PieChart,
  Megaphone,
  CheckCircle
} from 'lucide-react';
import { useAuth, initiateSignOut, useUser } from '@/firebase';

interface SidebarNavProps {
  isAdmin?: boolean;
}

export function SidebarNav({ isAdmin = false }: SidebarNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const { user } = useUser();

  const studentLinks = [
    { label: 'الرئيسية', icon: <LayoutDashboard className="w-5 h-5" />, href: '/student' },
    { label: 'كورساتي', icon: <BookOpen className="w-5 h-5" />, href: '/student/my-courses' },
    { label: 'الامتحانات', icon: <ClipboardList className="w-5 h-5" />, href: '/student/exams' },
    { label: 'تفعيل كود', icon: <Ticket className="w-5 h-5" />, href: '/student/redeem' },
  ];

  const adminLinks = [
    { label: 'لوحة التحكم', icon: <PieChart className="w-5 h-5" />, href: '/admin' },
    { label: 'إدارة الكورسات', icon: <Video className="w-5 h-5" />, href: '/admin/courses' },
    { label: 'الأكواد', icon: <Ticket className="w-5 h-5" />, href: '/admin/codes' },
    { label: 'الطلاب', icon: <Users className="w-5 h-5" />, href: '/admin/students' },
    { label: 'بناء الاختبارات', icon: <ClipboardList className="w-5 h-5" />, href: '/admin/exams' },
    { label: 'مركز التصحيح', icon: <CheckCircle className="w-5 h-5" />, href: '/admin/exams/grading' },
    { label: 'الإشعارات', icon: <Megaphone className="w-5 h-5" />, href: '/admin/notifications' },
    { label: 'الذكاء الاصطناعي', icon: <BrainCircuit className="w-5 h-5" />, href: '/admin/ai-tools' },
  ];

  const links = isAdmin ? adminLinks : studentLinks;

  const handleLogout = () => {
    initiateSignOut(auth);
    router.push('/');
  };

  return (
    <aside className="w-64 border-l bg-card flex flex-col h-screen fixed top-0 right-0 z-40 shadow-xl">
      <div className="p-6 flex items-center gap-3 border-b">
        <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold">ب</div>
        <span className="text-xl font-headline font-bold">البشمهندس</span>
      </div>

      <nav className="flex-grow p-4 space-y-2 overflow-y-auto">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
              pathname === link.href 
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <span className={cn(
              "transition-transform",
              pathname === link.href ? "text-primary-foreground" : "text-primary group-hover:scale-110"
            )}>
              {link.icon}
            </span>
            <span className="font-bold">{link.label}</span>
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t space-y-4">
        <div className="p-4 rounded-xl bg-secondary/50 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-muted border flex items-center justify-center overflow-hidden">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <Users className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-bold truncate">{user?.displayName || studentLinks.find(l => l.href === pathname)?.label || 'مستخدم'}</p>
            <p className="text-[10px] text-muted-foreground truncate">{isAdmin ? 'مسؤول المنصة' : 'طالب'}</p>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-bold">تسجيل الخروج</span>
        </button>
      </div>
    </aside>
  );
}
