
"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClipboardList, Trophy, Loader2, AlertCircle } from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';

export default function StudentExamsPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const attemptsRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return collection(firestore, 'students', user.uid, 'quiz_attempts');
  }, [firestore, user?.uid]);

  const { data: attempts, isLoading } = useCollection(attemptsRef);

  if (isUserLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-headline font-bold mb-2">الامتحانات والتقييمات</h1>
          <p className="text-muted-foreground">تابع نتائج امتحاناتك الإلكترونية والمقالية من هنا.</p>
        </div>
        <div className="bg-primary/10 text-primary px-4 py-2 rounded-xl border border-primary/20 flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          <span className="font-bold">سجل التفوق</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-card">
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-primary" /> آخر المحاولات
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {!attempts || attempts.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-10" />
                  <p>لم تقم بتأدية أي امتحانات بعد.</p>
                </div>
              ) : (
                <div className="divide-y">
                  {attempts.map((attempt) => (
                    <div key={attempt.id} className="p-6 flex items-center justify-between hover:bg-secondary/10 transition-colors">
                      <div>
                        <h4 className="font-bold">محاولة امتحان: {attempt.courseContentId}</h4>
                        <p className="text-xs text-muted-foreground mt-1">تاريخ التسليم: {new Date(attempt.submittedAt).toLocaleDateString('ar-EG')}</p>
                      </div>
                      <div className="text-left">
                        <p className="text-2xl font-black text-primary">{attempt.score || 0}%</p>
                        <span className="text-[10px] bg-secondary px-2 py-0.5 rounded uppercase">
                          {attempt.isGraded ? 'تم التصحيح' : 'قيد التصحيح'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-accent/5 border-accent/20">
            <CardHeader><CardTitle className="text-sm">نصائح للامتحانات</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-4">
              <p>• تأكد من استقرار الإنترنت قبل بدء أي امتحان إلكتروني.</p>
              <p>• في الأسئلة المقالية، يمكنك رفع ملف PDF كإجابة إذا طلب المدرس ذلك.</p>
              <p>• لا تغلق صفحة الامتحان قبل الضغط على زر "تسليم الإجابة".</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
