
"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserCog, Loader2 } from 'lucide-react';
import { useAuth, initiateEmailSignIn } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { auth } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;

    setIsLoading(true);
    try {
      await initiateEmailSignIn(auth, email, password);
      router.push('/admin');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "خطأ في الدخول",
        description: "تأكد من بيانات المشرف."
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 bg-card p-10 rounded-3xl border border-primary/30 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-2 bg-primary" />
        
        <div className="relative text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 text-primary mb-6">
            <UserCog className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-headline font-bold mb-2">لوحة المشرف</h2>
          <p className="text-muted-foreground">مرحباً بك في غرفة التحكم، بشمهندس</p>
        </div>

        <form onSubmit={handleAdminLogin} className="space-y-6 relative">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-bold flex items-center gap-2">
              بريد المسؤول
            </Label>
            <Input 
              id="email" 
              type="email" 
              placeholder="admin@al-bashmohandes.com" 
              className="h-12 bg-background border-primary/10 focus:border-primary" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" title="كلمة المرور" className="text-sm font-bold">كلمة مرور الأمان</Label>
            <Input 
              id="password" 
              type="password" 
              className="h-12 bg-background border-primary/10 focus:border-primary" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>

          <Button 
            type="submit" 
            disabled={isLoading}
            className="w-full h-14 bg-primary text-primary-foreground hover:bg-primary/90 text-lg font-bold rounded-xl shadow-lg shadow-primary/20"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "فتح لوحة التحكم"}
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
