import Link from 'next/link';
import { Button } from './button';
import { ShieldCheck, User, LogOut, LayoutDashboard } from 'lucide-react';

export function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl font-headline font-bold text-primary">البشمهندس</span>
            <ShieldCheck className="w-6 h-6 text-primary" />
          </Link>
          
          <div className="hidden md:flex items-center gap-6">
            <Link href="/courses" className="text-sm font-medium hover:text-primary transition-colors">الكورسات</Link>
            <Link href="/about" className="text-sm font-medium hover:text-primary transition-colors">عن المنصة</Link>
            <Link href="/contact" className="text-sm font-medium hover:text-primary transition-colors">اتصل بنا</Link>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/login">
            <Button variant="ghost" size="sm" className="gap-2">
              <User className="w-4 h-4" />
              دخول
            </Button>
          </Link>
          <Link href="/register">
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
              ابدأ الآن
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}