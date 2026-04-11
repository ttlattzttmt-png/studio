import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck, Lock, UserCog } from 'lucide-react';

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 bg-card p-10 rounded-3xl border border-primary/30 shadow-2xl relative overflow-hidden">
        {/* Background Accent */}
        <div className="absolute top-0 right-0 w-full h-2 bg-primary" />
        
        <div className="relative text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 text-primary mb-6">
            <UserCog className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-headline font-bold mb-2">لوحة المشرف</h2>
          <p className="text-muted-foreground">مرحباً بك في غرفة التحكم، بشمهندس</p>
        </div>

        <form className="space-y-6 relative">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-bold flex items-center gap-2">
              بريد المسؤول
            </Label>
            <Input id="email" type="email" placeholder="admin@al-bashmohandes.com" className="h-12 bg-background border-primary/10 focus:border-primary" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" title="كلمة المرور" className="text-sm font-bold">كلمة مرور الأمان</Label>
            <Input id="password" type="password" className="h-12 bg-background border-primary/10 focus:border-primary" required />
          </div>

          <Button type="submit" className="w-full h-14 bg-primary text-primary-foreground hover:bg-primary/90 text-lg font-bold rounded-xl shadow-lg shadow-primary/20">
            فتح لوحة التحكم
          </Button>
        </form>

        <p className="text-center text-muted-foreground relative pt-4">
          <Link href="/login" className="text-primary font-bold hover:underline">
             العودة لتسجيل دخول الطلاب
          </Link>
        </p>
      </div>
      
      <p className="mt-8 text-xs text-muted-foreground">made by : mohamed alaa</p>
    </div>
  );
}