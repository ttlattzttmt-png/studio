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
    if (!firestore || !user || !code) return;
    
    setIsSubmitting(true);
    try {
      const cleanCode = code.trim().toUpperCase();
      
      // 1. البحث عن الكود (يجب أن تسمح القواعد بـ list)
      const codesRef = collection(firestore, 'access_codes');
      const q = query(codesRef, where('code', '==', cleanCode));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast({
          variant: "destructive",
          title: "كود غير صحيح",
          description: "هذا الكود غير موجود في سجلاتنا."
        });
        setIsSubmitting(false);
        return;
      }

      const codeDoc = querySnapshot.docs[0];
      const codeData = codeDoc.data();

      // التحقق من حالة الاستخدام
      if (codeData.isUsed) {
        toast({
          variant: "destructive",
          title: "كود مستخدم",
          description: "هذا الكود تم تفعيله مسبقاً."
        });
        setIsSubmitting(false);
        return;
      }

      const targetCourseId = codeData.courseId;

      // 2. التحقق من وجود الكورس
      const courseRef = doc(firestore, 'courses', targetCourseId);
      const courseSnap = await getDoc(courseRef);
      
      if (!courseSnap.exists()) {
        toast({ 
          variant: "destructive", 
          title: "خطأ في المزامنة", 
          description: "الكورس المرتبط بهذا الكود غير متوفر حالياً." 
        });
        setIsSubmitting(false);
        return;
      }

      // 3. تحديث الكود ليكون "مستخدماً" (الآن مسموح به في القواعد)
      const codeDocRef = doc(firestore, 'access_codes', codeDoc.id);
      await updateDoc(codeDocRef, {
        isUsed: true,
        usedByStudentId: user.uid,
        usedAt: serverTimestamp()
      });

      // 4. إنشاء سجل الاشتراك في حساب الطالب
      const enrollmentRef = doc(firestore, 'students', user.uid, 'enrollments', targetCourseId);
      await setDoc(enrollmentRef, {
        id: targetCourseId,
        studentId: user.uid,
        courseId: targetCourseId,
        enrollmentDate: new Date().toISOString(),
        accessCodeId: codeDoc.id,
        isCompleted: false,
        progressPercentage: 0
      });

      toast({
        title: "تم التفعيل بنجاح!",
        description: `تم فتح الكورس وإضافته لقائمة دروسك.`
      });
      
      router.push('/student/my-courses');
    } catch (e: any) {
      console.error("Redeem error:", e);
      let errorMsg = "حدث خطأ فني أثناء التفعيل.";
      if (e.message?.includes('permissions')) {
        errorMsg = "خطأ في الصلاحيات. يرجى مراجعة القواعد الأمنية.";
      }
      toast({
        variant: "destructive",
        title: "فشل التفعيل",
        description: errorMsg
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isUserLoading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-4 animate-in fade-in duration-500">
      <Card className="w-full max-w-md bg-card border-primary/20 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-1.5 bg-primary" />
        <CardHeader className="text-center pt-10">
          <div className="w-20 h-20 rounded-[2rem] bg-primary/10 text-primary flex items-center justify-center mx-auto mb-6 rotate-3">
            <Ticket className="w-10 h-10" />
          </div>
          <CardTitle className="text-3xl font-headline font-bold">تفعيل كود الكورس</CardTitle>
          <p className="text-muted-foreground text-sm mt-3">أدخل الكود المكون من 12 رقماً لتفعيل الكورس فوراً.</p>
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
    </div>
  );
}