
"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck, Lock, User, Loader2 } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { auth, firestore } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !firestore) return;
    
    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      // التحقق مما إذا كان المستخدم مديراً (Admin)
      const adminDoc = await getDoc(doc(firestore, 'admin_roles', uid));
      
      if (adminDoc.exists()) {
        toast({ title: "مرحباً بك يا بشمهندس", description: "جاري توجيهك للوحة التحكم..." });
        router.push('/admin');
      } else {
        toast({ title: "أهلاً بك", description: "جاري الدخول لحساب الطالب..." });
        router.push('/student');
      }
    } catch (error: any) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "خطأ في تسجيل الدخول",
        description: "يرجى التأكد من البريد الإلكتروني وكلمة المرور."
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 bg-card p-10 rounded-3xl border border-primary/10 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl" />

        <div className="relative text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 text-primary mb-6">
            <ShieldCheck className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-headline font-bold mb-2">تسجيل الدخول</h2>
          <p className="text-muted-foreground">أهلاً بك في منصة البشمهندس التعليمية</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6 relative">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-bold flex items-center gap-2">
              <User className="w-4 h-4 text-primary" /> البريد الإلكتروني
            </Label>
            <Input 
              id="email" 
              type="email" 
              placeholder="example@mail.com" 
              className="h-12 bg-background border-primary/10 focus:border-primary" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" title="كلمة المرور" className="text-sm font-bold flex items-center gap-2">
                <Lock className="w-4 h-4 text-primary" /> كلمة المرور
              </Label>
              <Link href="#" className="text-xs text-primary hover:underline">نسيت كلمة المرور؟</Link>
            </div>
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
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "دخول للمنصة"}
          </Button>
        </form>

        <p className="text-center text-muted-foreground relative">
          ليس لديك حساب؟{' '}
          <Link href="/register" className="text-primary font-bold hover:underline">
            أنشئ حساباً جديداً
          </Link>
        </p>
      </div>
      
      <p className="mt-8 text-xs text-muted-foreground">made by : mohamed alaa</p>
    </div>
  );
}
