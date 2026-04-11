
"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck, Lock, User, Loader2 } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { auth, firestore } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();

  const ADMIN_EMAIL = 'admin@al-bashmohandes.com';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !firestore) return;
    
    setIsLoading(true);
    try {
      let userCredential;
      
      try {
        // محاولة تسجيل الدخول العادية
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      } catch (authError: any) {
        // منطق خاص بالأدمن للمرة الأولى: إذا كان البريد هو بريد المسؤول، نحاول إنشاء الحساب إذا فشل الدخول
        if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
          try {
            userCredential = await createUserWithEmailAndPassword(auth, email, password);
          } catch (createError: any) {
            // إذا كان البريد مسجلاً مسبقاً وفشل الدخول، نرمي الخطأ الأصلي (كلمة مرور خطأ مثلاً)
            throw authError;
          }
        } else {
          throw authError;
        }
      }

      const uid = userCredential.user.uid;

      // التحقق من صلاحيات المسؤول
      if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        const adminRoleRef = doc(firestore, 'admin_roles', uid);
        const adminRoleSnap = await getDoc(adminRoleRef);
        
        if (!adminRoleSnap.exists()) {
          // تأكيد صلاحية المسؤول في قاعدة البيانات
          await setDoc(adminRoleRef, { role: 'admin', createdAt: new Date().toISOString() });
          await setDoc(doc(firestore, 'admin_users', uid), {
            id: uid,
            name: 'المشرف العام',
            email: email,
            registrationDate: new Date().toISOString()
          });
        }
        
        toast({ title: "مرحباً بك يا بشمهندس", description: "جاري توجيهك للوحة التحكم..." });
        router.push('/admin');
        return;
      }

      // التحقق من صلاحيات المستخدمين الآخرين
      const adminDocRef = doc(firestore, 'admin_roles', uid);
      const adminDoc = await getDoc(adminDocRef);
      
      if (adminDoc.exists()) {
        router.push('/admin');
      } else {
        router.push('/student');
      }
    } catch (error: any) {
      console.error("Login error:", error);
      let errorMessage = "يرجى التأكد من البريد الإلكتروني وكلمة المرور.";
      
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        errorMessage = "بيانات الدخول غير صحيحة، يرجى المحاولة مرة أخرى.";
      }
      
      toast({
        variant: "destructive",
        title: "خطأ في الدخول",
        description: errorMessage
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 bg-card p-10 rounded-3xl border border-primary/10 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl" />
        
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
              className="h-12 bg-background border-primary/10 focus:border-primary text-right" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" title="كلمة المرور" className="text-sm font-bold flex items-center gap-2">
              <Lock className="w-4 h-4 text-primary" /> كلمة المرور
            </Label>
            <Input 
              id="password" 
              type="password" 
              className="h-12 bg-background border-primary/10 focus:border-primary text-right" 
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

        <div className="relative text-center pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            ليس لديك حساب؟{' '}
            <Link href="/register" className="text-primary font-bold hover:underline">
              أنشئ حساباً جديداً
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
