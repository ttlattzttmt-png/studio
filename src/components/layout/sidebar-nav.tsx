import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  PieChart
} from 'lucide-react';

interface SidebarNavProps {
  isAdmin?: boolean;
}

export function SidebarNav({ isAdmin = false }: SidebarNavProps) {
  const pathname = usePathname();

  const studentLinks = [
    { label: 'الرئيسية', icon: <LayoutDashboard />, href: '/student' },
    { label: 'كورساتي', icon: <BookOpen />, href: '/student/my-courses' },
    { label: 'الامتحانات', icon: <ClipboardList />, href: '/student/exams' },
    { label: 'تفعيل كود', icon: <Ticket />, href: '/student/redeem' },
  ];

  const adminLinks = [
    { label: 'لوحة التحكم', icon: <PieChart />, href: '/admin' },
    { label: 'إدارة الكورسات', icon: <Video />, href: '/admin/courses' },
    { label: 'الأكواد', icon: <Ticket />, href: '/admin/codes' },
    { label: 'الطلاب', icon: <Users />, href: '/admin/students' },
    { label: 'بناء الاختبارات', icon: <ClipboardList />, href: '/admin/exams' },
    { label: 'الذكاء الاصطناعي', icon: <BrainCircuit />, href: '/admin/ai-tools' },
  ];

  const links = isAdmin ? adminLinks : studentLinks;

  return (
    <aside className="w-64 border-l bg-card flex flex-col h-screen fixed top-0 right-0 z-40">
      <div className="p-6 flex items-center gap-3 border-b">
        <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold">ب</div>
        <span className="text-xl font-headline font-bold">البشمهندس</span>
      </div>

      <nav className="flex-grow p-4 space-y-2">
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
              "w-5 h-5",
              pathname === link.href ? "text-primary-foreground" : "text-primary group-hover:scale-110 transition-transform"
            )}>
              {link.icon}
            </span>
            <span className="font-bold">{link.label}</span>
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t space-y-4">
        <div className="p-4 rounded-xl bg-secondary/50 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-muted border flex items-center justify-center">
            <Users className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-bold truncate">محمد علاء</p>
            <p className="text-[10px] text-muted-foreground truncate">{isAdmin ? 'مسؤول المنصة' : 'طالب'}</p>
          </div>
        </div>
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-destructive hover:bg-destructive/10 transition-colors">
          <LogOut className="w-5 h-5" />
          <span className="font-bold">تسجيل الخروج</span>
        </button>
      </div>
    </aside>
  );
}