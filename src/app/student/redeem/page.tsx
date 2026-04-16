"use client";

import { useState } from 'react';
import { Navbar } from '@/components/ui/navbar';
import { Footer } from '@/components/ui/footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Ticket, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs, doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export default function RedeemCodePage() {
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();

  const handleRedeem = async () => {
    if (!code || !firestore || !user) return;
    setIsVerifying(true);

    try {
      // 1. البحث عن الكود في قاعدة البيانات
      const codesRef = collection(firestore, 'access_codes');
      const q = query(codesRef, where('code', '==', code.trim()));
      const snap = await getDocs(q);

      if (snap.empty) {
        toast({ variant: "destructive", title: "كود خاطئ", description: "يرجى التأكد من الكود والمحاولة مرة أخرى." });
        setIsVerifying(false);
        return;
      }

      const codeDoc = snap.docs[0];
      const codeData = codeDoc.data();

      if (codeData.isUsed) {
        toast({ variant: "destructive", title: "كود مستخدم", description: "هذا الكود تم تفعيله مسبقاً لحساب آخر." });
        setIsVerifying(false);
        return;
      }

      // 2. جلب بيانات الكورس المرتبط بالكود
      const courseRef = doc(firestore, 'courses', codeData.courseId);
      const courseSnap = await getDocs(query(collection(firestore, 'courses'), where('__name__', '==', codeData.courseId)));
      const courseTitle = !courseSnap.empty ? courseSnap.docs[0].data().title : 'كورس جديد';

      // 3. تفعيل الاشتراك للطالب
      const enrollmentId = codeData.courseId;
      await setDoc(doc(firestore, 'students', user.uid, 'enrollments', enrollmentId), {
        id: enrollmentId,
        courseId: codeData.courseId,
        studentId: user.uid,
        status: 'active',
        enrollmentDate: new Date().toISOString(),
        activationDate: new Date().toISOString(),
        progressPercentage: 0,
        isCompleted: false,
        courseTitle: courseTitle,
        redeemedCode: code.trim()
      });

      // 4. تحديث حالة الكود كـ "مستخدم"
      await updateDoc(doc(firestore, 'access_codes', codeDoc.id), {
        isUsed: true,
        usedByStudentId: user.uid,
        usedAt: serverTimestamp()
      });

      toast({ title: "مبروك! تم التفعيل", description: `تم فتح كورس ${courseTitle} بنجاح.` });
      router.push('/student/dashboard');

    } catch (e: any) {
      console.error(e);
      toast({ variant: "destructive", title: "فشل التفعيل", description: "حدث خطأ غير متوقع، تواصل مع الدعم." });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow pt-32 pb-20 container mx-auto px-4">
        <div className="max-w-md mx-auto space-y-8 animate-in zoom-in duration-500">
          <div className="text-center space-y-4">
             <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary mx-auto">
                <Ticket className="w-10 h-10" />
             </div>
             <h1 className="text-4xl font-headline font-bold">تفعيل كورس جديد</h1>
             <p className="text-muted-foreground">أدخل الكود الذي استلمته من السكرتارية لفتح الكورس فوراً.</p>
          </div>

          <Card className="bg-card border-primary/20 shadow-2xl overflow-hidden rounded-[2.5rem]">
            <CardContent className="p-10 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-right block">كود التفعيل</label>
                <Input 
                  placeholder="ENG-XXXX-XXXX" 
                  className="h-14 text-center font-mono text-xl tracking-widest bg-secondary/20 border-primary/10 focus:border-primary"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                />
              </div>
              <Button 
                onClick={handleRedeem}
                disabled={isVerifying || !code}
                className="w-full h-14 bg-primary text-primary-foreground font-bold text-lg rounded-2xl shadow-xl shadow-primary/20"
              >
                {isVerifying ? <Loader2 className="w-6 h-6 animate-spin" /> : "تفعيل الكورس الآن"}
              </Button>
            </CardContent>
          </Card>

          <div className="flex items-center gap-3 justify-center p-4 bg-accent/5 border border-accent/10 rounded-2xl text-accent text-sm font-bold">
            <CheckCircle2 className="w-4 h-4" />
            <span>التفعيل يتم لحظياً وبشكل آمن تماماً</span>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}