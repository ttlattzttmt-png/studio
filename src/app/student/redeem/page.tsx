"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Ticket, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import { collection, query, where, getDocs, doc, setDoc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useSearchParams } from 'next/navigation';

export default function RedeemCodePage() {
  const searchParams = useSearchParams();
  const initialCode = searchParams.get('code') || '';
  const [code, setCode] = useState(initialCode.toUpperCase());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (initialCode) setCode(initialCode.toUpperCase());
  }, [initialCode]);

  const handleRedeem = async () => {
    if (!firestore || !user || !code) {
      if (!user && !isUserLoading) toast({ variant: "destructive", title: "تنبيه", description: "يرجى تسجيل الدخول أولاً." });
      return;
    }
    
    setIsSubmitting(true);
    try {
      // 1. البحث عن الكود (يجب أن يكون متاحاً وغير مستخدم)
      const codesRef = collection(firestore, 'access_codes');
      const q = query(
        codesRef, 
        where('code', '==', code.trim().toUpperCase()), 
        where('isUsed', '==', false)
      );
      
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast({
          variant: "destructive",
          title: "كود غير صالح",
          description: "هذا الكود غير موجود، أو تم استخدامه مسبقاً، أو غير مفعل."
        });
        setIsSubmitting(false);
        return;
      }

      const codeDoc = querySnapshot.docs[0];
      const codeData = codeDoc.data();
      const courseId = codeData.courseId;

      if (!courseId) {
        throw new Error("هذا الكود غير مرتبط بأي كورس حالياً.");
      }

      // 2. التحقق من وجود الكورس فعلياً
      const courseRef = doc(firestore, 'courses', courseId);
      const courseSnap = await getDoc(courseRef);
      
      if (!courseSnap.exists()) {
        toast({
          variant: "destructive",
          title: "كورس غير متاح",
          description: "الكورس المرتبط بهذا الكود لم يعد متاحاً على المنصة."
        });
        setIsSubmitting(false);
        return;
      }

      const courseTitle = courseSnap.data().title;

      // 3. تحديث حالة الكود ليصبح مستخدماً (تحديث الصلاحيات يسمح بذلك الآن)
      const accessCodeRef = doc(firestore, 'access_codes', codeDoc.id);
      await updateDoc(accessCodeRef, {
        isUsed: true,
        usedByStudentId: user.uid,
        usedAt: serverTimestamp()
      });

      // 4. إنشاء سجل الاشتراك للطالب
      const enrollmentRef = doc(firestore, 'students', user.uid, 'enrollments', courseId);
      await setDoc(enrollmentRef, {
        id: courseId,
        studentId: user.uid,
        courseId: courseId,
        enrollmentDate: new Date().toISOString(),
        accessCodeId: codeDoc.id,
        isCompleted: false,
        progressPercentage: 0
      });

      toast({
        title: "تم التفعيل بنجاح!",
        description: `تمت إضافة كورس "${courseTitle}" إلى مكتبتك.`
      });
      
      router.push('/student/my-courses');
    } catch (e: any) {
      console.error("Redeem error:", e);
      let errorMessage = "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى أو التواصل مع الدعم.";
      
      if (e.message.includes('permission-denied')) {
        errorMessage = "خطأ في الصلاحيات. يرجى تسجيل الخروج والدخول مرة أخرى.";
      } else if (e.message) {
        errorMessage = e.message;
      }
      
      toast({
        variant: "destructive",
        title: "فشل التفعيل",
        description: errorMessage
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isUserLoading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center space-y-4">
        <AlertCircle className="w-16 h-16 text-destructive opacity-50" />
        <h2 className="text-2xl font-bold">يرجى تسجيل الدخول أولاً</h2>
        <p className="text-muted-foreground">يجب أن تكون مسجلاً كطالب لتتمكن من تفعيل أكواد الكورسات.</p>
        <Button onClick={() => router.push('/login')} className="bg-primary text-primary-foreground font-bold px-8 h-12">تسجيل الدخول</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-4 animate-in fade-in duration-500">
      <Card className="w-full max-w-md bg-card border-primary/20 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-1.5 bg-primary" />
        <CardHeader className="text-center pt-10">
          <div className="w-20 h-20 rounded-[2rem] bg-primary/10 text-primary flex items-center justify-center mx-auto mb-6 rotate-3">
            <Ticket className="w-10 h-10" />
          </div>
          <CardTitle className="text-3xl font-headline font-bold">تفعيل كود الكورس</CardTitle>
          <p className="text-muted-foreground text-sm mt-3">أدخل الكود المكون من 12 خانة لفتح محتواك التعليمي.</p>
        </CardHeader>
        <CardContent className="space-y-6 pb-10">
          <Input 
            placeholder="ENG-XXXX-XXXX" 
            className="h-16 bg-background border-primary/20 text-center font-mono text-2xl font-bold focus:border-primary uppercase"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            disabled={isSubmitting}
          />
          <Button 
            onClick={handleRedeem}
            disabled={isSubmitting || !code}
            className="w-full h-16 bg-primary text-primary-foreground font-bold text-xl rounded-2xl shadow-xl hover:scale-[1.01] transition-transform"
          >
            {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <><CheckCircle2 className="w-6 h-6 ml-2" /> تفعيل الكورس الآن</>}
          </Button>
        </CardContent>
      </Card>
      <div className="mt-8 text-center space-y-2">
        <p className="text-muted-foreground text-sm">تواجه مشكلة؟ تواصل مع الدعم الفني</p>
        <p className="text-primary font-bold">واتساب: 01008006562</p>
      </div>
    </div>
  );
}