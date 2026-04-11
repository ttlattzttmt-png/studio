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
      // 1. البحث عن الكود (يجب أن يكون متاحاً)
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
          title: "كود غير صحيح",
          description: "هذا الكود غير موجود أو تم استخدامه بالفعل."
        });
        setIsSubmitting(false);
        return;
      }

      const codeDoc = querySnapshot.docs[0];
      const codeData = codeDoc.data();
      const courseId = codeData.courseId;

      // 2. التحقق من الكورس
      const courseRef = doc(firestore, 'courses', courseId);
      const courseSnap = await getDoc(courseRef);
      
      if (!courseSnap.exists()) {
        throw new Error("الكورس المرتبط بهذا الكود لم يعد متاحاً.");
      }

      // 3. تحديث الكود أولاً (Atomic-like update)
      const accessCodeRef = doc(firestore, 'access_codes', codeDoc.id);
      await updateDoc(accessCodeRef, {
        isUsed: true,
        usedByStudentId: user.uid,
        usedAt: serverTimestamp()
      });

      // 4. إنشاء الاشتراك للطالب
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
        title: "مبروك يا بشمهندس!",
        description: `تم تفعيل "${courseSnap.data().title}" بنجاح.`
      });
      
      router.push('/student/my-courses');
    } catch (e: any) {
      console.error("Redeem error:", e);
      let errorMessage = "فشل التفعيل. يرجى التأكد من الكود أو الصلاحيات.";
      if (e.code === 'permission-denied') errorMessage = "خطأ في الصلاحيات. يرجى تسجيل الدخول مجدداً.";
      
      toast({
        variant: "destructive",
        title: "خطأ في التفعيل",
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
        <Button onClick={() => router.push('/login')}>تسجيل الدخول</Button>
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
          <p className="text-muted-foreground text-sm mt-3">أدخل الكود لفتح محتواك التعليمي فوراً.</p>
        </CardHeader>
        <CardContent className="space-y-6 pb-10">
          <Input 
            placeholder="ENG-XXXX-XXXX" 
            className="h-16 bg-background border-primary/20 text-center font-mono text-2xl font-bold focus:border-primary"
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
      <p className="mt-8 text-muted-foreground text-sm">للدعم الفني واتساب: <span className="text-primary font-bold">01008006562</span></p>
    </div>
  );
}