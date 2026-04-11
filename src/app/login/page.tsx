"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck, Lock, User, Loader2 } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
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
        // محاولة تسجيل الدخول
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      } catch (authError: any) {
        // إذا كان بريد الأدمن المخصص ولم يتم إنشاؤه بعد (المرة الأولى فقط)
        if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase() && (authError.code === 'auth/user-not-found' || authError.code === 'auth/invalid-credential')) {
          try {
            userCredential = await createUserWithEmailAndPassword(auth, email, password);
          } catch (createError) {
            throw authError;
          }
        } else {
          throw authError;
        }
      }

      const uid = userCredential.user.uid;

      // منطق التحقق والتوجيه للمسؤول
      if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        const adminRoleRef = doc(firestore, 'admin_roles', uid);
        const adminRoleSnap = await getDoc(adminRoleRef);
        
        if (!adminRoleSnap.exists()) {
          // تأكيد دور المسؤول في Firestore
          await setDoc(adminRoleRef, { role: 'admin', createdAt: serverTimestamp() });
          await setDoc(doc(firestore, 'admin_users', uid), {
            id: uid,
            name: 'المشرف العام',
            email: email,
            registrationDate: new Date().toISOString()
          });
        }
        
        toast({ title: "مرحباً بك يا بشمهندس", description: "جاري فتح لوحة التحكم..." });
        router.push('/admin');
        return;
      }

      // التحقق من نوع المستخدم للتوجيه (طالب أم مسؤول)
      const adminDocRef = doc(firestore, 'admin_roles', uid);
      const adminDoc = await getDoc(adminDocRef);
      
      if (adminDoc.exists()) {
        router.push('/admin');
      } else {
        router.push('/student');
      }
    } catch (error: any) {
      console.error("Login error:", error);
      let errorMessage = "يرجى التأكد من البيانات والمحاولة مرة أخرى.";
      if (error.code === 'auth/wrong-password') errorMessage = "كلمة المرور غير صحيحة.";
      if (error.code === 'auth/user-not-found') errorMessage = "هذا الحساب غير موجود.";
      
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