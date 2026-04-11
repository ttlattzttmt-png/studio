import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck, Lock, User } from 'lucide-react';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 bg-card p-10 rounded-3xl border border-primary/10 shadow-2xl relative overflow-hidden">
        {/* Background Accent */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl" />

        <div className="relative text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 text-primary mb-6 animate-bounce">
            <ShieldCheck className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-headline font-bold mb-2">تسجيل الدخول</h2>
          <p className="text-muted-foreground">أهلاً بك مجدداً في منصة البشمهندس</p>
        </div>

        <form className="space-y-6 relative">
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm font-bold flex items-center gap-2">
              <User className="w-4 h-4 text-primary" /> رقم الهاتف
            </Label>
            <Input id="phone" type="tel" placeholder="01xxxxxxxxx" className="h-12 bg-background border-primary/10 focus:border-primary" required />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" title="كلمة المرور" className="text-sm font-bold flex items-center gap-2">
                <Lock className="w-4 h-4 text-primary" /> كلمة المرور
              </Label>
              <Link href="#" className="text-xs text-primary hover:underline">نسيت كلمة المرور؟</Link>
            </div>
            <Input id="password" type="password" className="h-12 bg-background border-primary/10 focus:border-primary" required />
          </div>

          <Button type="submit" className="w-full h-14 bg-primary text-primary-foreground hover:bg-primary/90 text-lg font-bold rounded-xl shadow-lg shadow-primary/20">
            دخول للمنصة
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-primary/10"></span></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">أو</span></div>
        </div>

        <p className="text-center text-muted-foreground relative">
          ليس لديك حساب؟{' '}
          <Link href="/register" className="text-primary font-bold hover:underline">
            أنشئ حساباً جديداً
          </Link>
        </p>

        <div className="pt-4 border-t border-primary/5 text-center relative">
          <Link href="/admin/login" className="text-xs text-muted-foreground hover:text-primary transition-colors">دخول المشرفين</Link>
        </div>
      </div>
      
      <p className="mt-8 text-xs text-muted-foreground">made by : mohamed alaa</p>
    </div>
  );
}