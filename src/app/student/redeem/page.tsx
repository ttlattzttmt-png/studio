"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Ticket, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import { collection, query, where, getDocs, doc, setDoc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export default function RedeemCodePage() {
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const handleRedeem = async () => {
    if (!firestore || !user || !code) return;
    
    setIsSubmitting(true);
    try {
      // 1. البحث عن الكود في قاعدة البيانات (يجب أن يكون متاحاً وغير مستخدم)
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
          description: "هذا الكود غير موجود أو تم استخدامه مسبقاً. يرجى التأكد من الكود والمحاولة مرة أخرى."
        });
        setIsSubmitting(false);
        return;
      }

      const codeDoc = querySnapshot.docs[0];
      const codeData = codeDoc.data();
      const courseId = codeData.courseId;

      if (!courseId) {
        throw new Error("هذا الكود غير مرتبط بأي كورس حالياً. يرجى مراجعة الإدارة.");
      }

      // 2. التحقق من وجود الكورس المرتبط بالكود
      const courseRef = doc(firestore, 'courses', courseId);
      const courseSnap = await getDoc(courseRef);
      
      if (!courseSnap.exists()) {
        throw new Error("الكورس المرتبط بهذا الكود لم يعد متاحاً على المنصة.");
      }

      // 3. إنشاء اشتراك الطالب (Enrollment) في مساره الخاص
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

      // 4. تحديث حالة الكود ليصبح مستخدماً لمنع استخدامه مرة أخرى
      const accessCodeRef = doc(firestore, 'access_codes', codeDoc.id);
      await updateDoc(accessCodeRef, {
        isUsed: true,
        usedByStudentId: user.uid,
        usedAt: serverTimestamp()
      });

      toast({
        title: "مبروك يا بشمهندس!",
        description: `تم تفعيل كورس "${courseSnap.data().title}" بنجاح. ابدأ الآن!`
      });
      
      router.push('/student/my-courses');
    } catch (e: any) {
      console.error("Redeem operation failed:", e);
      let errorMessage = "حدث خطأ فني أثناء التفعيل. يرجى التأكد من اتصال الإنترنت.";
      
      if (e.message?.includes("permissions")) {
        errorMessage = "خطأ في الصلاحيات: يرجى تسجيل الخروج والدخول مرة أخرى.";
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

  if (isUserLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center space-y-4">
        <AlertCircle className="w-16 h-16 text-destructive opacity-50" />
        <h2 className="text-2xl font-bold">يجب تسجيل الدخول أولاً</h2>
        <Button onClick={() => router.push('/login')}>ذهاب لصفحة الدخول</Button>
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
          <p className="text-muted-foreground text-sm mt-3 leading-relaxed">
            أدخل الكود المكون من حروف وأرقام لفتح محتواك التعليمي فوراً.
          </p>
        </CardHeader>
        <CardContent className="space-y-6 pb-10">
          <div className="space-y-4">
            <div className="relative">
              <Input 
                placeholder="ENG-XXXX-XXXX" 
                className="h-16 bg-background border-primary/20 text-center font-mono text-2xl font-bold tracking-[0.1em] focus:border-primary focus:ring-primary/20"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                disabled={isSubmitting}
              />
            </div>
            <Button 
              onClick={handleRedeem}
              disabled={isSubmitting || !code}
              className="w-full h-16 bg-primary text-primary-foreground font-bold text-xl rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.01] transition-transform"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin" /> جاري التحقق...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-6 h-6" /> تفعيل الكورس الآن
                </span>
              )}
            </Button>
          </div>

          <div className="p-5 rounded-2xl bg-primary/5 border border-primary/10 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-primary">إرشادات:</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                تأكد من كتابة الكود بشكل صحيح. إذا واجهت مشكلة في التفعيل، يرجى تصوير الكود وإرساله للدعم الفني.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="mt-8 text-center">
        <p className="text-sm text-muted-foreground">للدعم الفني المباشر واتساب</p>
        <p className="text-primary font-bold text-lg" dir="ltr">01008006562</p>
      </div>
    </div>
  );
}