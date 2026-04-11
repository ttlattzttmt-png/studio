
"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Ticket, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import { collection, query, where, getDocs, doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export default function RedeemCodePage() {
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const handleRedeem = async () => {
    if (!firestore || !user || !code) return;
    
    setIsSubmitting(true);
    try {
      // 1. البحث عن الكود في قاعدة البيانات
      const codesRef = collection(firestore, 'access_codes');
      const q = query(codesRef, where('code', '==', code.trim()), where('isUsed', '==', false));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast({
          variant: "destructive",
          title: "كود غير صالح",
          description: "هذا الكود غير موجود أو تم استخدامه مسبقاً."
        });
        setIsSubmitting(false);
        return;
      }

      const codeDoc = querySnapshot.docs[0];
      const codeData = codeDoc.data();
      const courseId = codeData.courseId;

      // 2. تفعيل الكورس للطالب (إنشاء Enrollment)
      const enrollmentId = courseId; // نستخدم courseId كمعرف فريد للاشتراك في هذا الكورس
      const enrollmentRef = doc(firestore, 'students', user.uid, 'enrollments', enrollmentId);
      
      await setDoc(enrollmentRef, {
        id: enrollmentId,
        studentId: user.uid,
        courseId: courseId,
        enrollmentDate: new Date().toISOString(),
        accessCodeId: codeDoc.id,
        isCompleted: false,
        progressPercentage: 0
      });

      // 3. تحديث حالة الكود ليصبح مستخدماً
      await updateDoc(doc(firestore, 'access_codes', codeDoc.id), {
        isUsed: true,
        usedByStudentId: user.uid,
        usedAt: new Date().toISOString()
      });

      toast({
        title: "تم التفعيل بنجاح!",
        description: "مبروك، لقد تم فتح الكورس بنجاح. يمكنك البدء الآن."
      });
      
      router.push('/student/my-courses');
    } catch (e: any) {
      console.error(e);
      toast({
        variant: "destructive",
        title: "خطأ في التفعيل",
        description: "حدث خطأ أثناء محاولة تفعيل الكود، يرجى التواصل مع الدعم."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-4">
      <Card className="w-full max-w-md bg-card border-primary/20 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-1 bg-primary" />
        <CardHeader className="text-center pt-8">
          <div className="w-20 h-20 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
            <Ticket className="w-10 h-10" />
          </div>
          <CardTitle className="text-2xl font-bold">تفعيل كود الكورس</CardTitle>
          <p className="text-muted-foreground text-sm mt-2">أدخل الكود المكون من حروف وأرقام لتفعيل اشتراكك فوراً.</p>
        </CardHeader>
        <CardContent className="space-y-6 pb-8">
          <div className="space-y-4">
            <Input 
              placeholder="مثال: ENG-2024-XXXX" 
              className="h-14 bg-background border-primary/20 text-center font-mono text-xl font-bold tracking-widest focus:border-primary"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
            <Button 
              onClick={handleRedeem}
              disabled={isSubmitting || !code}
              className="w-full h-14 bg-primary text-primary-foreground font-bold text-lg rounded-xl shadow-lg shadow-primary/20"
            >
              {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : "تفعيل الاشتراك الآن"}
            </Button>
          </div>

          <div className="p-4 rounded-xl bg-secondary/20 border border-primary/10 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              إذا واجهت أي مشكلة في الكود، يرجى التأكد من كتابته بشكل صحيح أو التواصل مع سكرتارية المنصة عبر الواتساب.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
