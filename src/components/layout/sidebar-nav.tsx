
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  BookOpen, 
  Video, 
  ClipboardList, 
  Users, 
  LogOut,
  BrainCircuit,
  PieChart,
  Megaphone,
  CheckCircle,
  Menu,
  Search
} from 'lucide-react';
import { useAuth, initiateSignOut, useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

interface SidebarNavProps {
  isAdmin?: boolean;
}

export function SidebarNav({ isAdmin = false }: SidebarNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const { user } = useUser();
  const [open, setOpen] = useState(false);

  const studentLinks = [
    { label: 'الرئيسية', icon: <LayoutDashboard className="w-5 h-5" />, href: '/student' },
    { label: 'كورساتي', icon: <BookOpen className="w-5 h-5" />, href: '/student' }, // تم الربط باللوحة الرئيسية لرؤية الكورسات المفعلة
    { label: 'استكشف الكورسات', icon: <Search className="w-5 h-5" />, href: '/courses' },
    { label: 'الامتحانات', icon: <ClipboardList className="w-5 h-5" />, href: '/student/exams' },
  ];

  const adminLinks = [
    { label: 'لوحة التحكم', icon: <PieChart className="w-5 h-5" />, href: '/admin' },
    { label: 'إدارة الكورسات', icon: <Video className="w-5 h-5" />, href: '/admin/courses' },
    { label: 'الطلاب والرقابة', icon: <Users className="w-5 h-5" />, href: '/admin/students' },
    { label: 'بناء الاختبارات', icon: <ClipboardList className="w-5 h-5" />, href: '/admin/exams' },
    { label: 'الإشعارات', icon: <Megaphone className="w-5 h-5" />, href: '/admin/notifications' },
    { label: 'الذكاء الاصطناعي', icon: <BrainCircuit className="w-5 h-5" />, href: '/admin/ai-tools' },
  ];

  const links = isAdmin ? adminLinks : studentLinks;

  const handleLogout = () => {
    initiateSignOut(auth);
    router.push('/');
  };

  const NavContent = () => (
    <div className="flex flex-col h-full bg-card">
      <Link href={isAdmin ? '/admin' : '/student'} className="p-6 flex items-center gap-3 border-b hover:bg-secondary/20 transition-colors">
        <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold">ب</div>
        <span className="text-xl font-headline font-bold">البشمهندس</span>
      </Link>

      <nav className="flex-grow p-4 space-y-2 overflow-y-auto">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={() => setOpen(false)}
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
        <div className="p-4 rounded-xl bg-secondary/50 flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-full bg-muted border flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold truncate">{user?.displayName || (isAdmin ? 'المشرف' : 'طالب')}</p>
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
    </div>
  );

  return (
    <>
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-card border-b z-50 px-4 flex items-center justify-between">
        <Link href={isAdmin ? '/admin' : '/student'} className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold">ب</div>
          <span className="text-lg font-headline font-bold">البشمهندس</span>
        </Link>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="w-6 h-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="p-0 w-72 text-right">
            <NavContent />
          </SheetContent>
        </Sheet>
      </header>
      <aside className="hidden lg:flex w-64 border-l bg-card flex-col h-screen fixed top-0 right-0 z-40 shadow-xl">
        <NavContent />
      </aside>
    </>
  );
}
