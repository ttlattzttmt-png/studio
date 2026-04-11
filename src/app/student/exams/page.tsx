
"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClipboardList, Trophy, Loader2, AlertCircle, Clock, Lock } from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, doc } from 'firebase/firestore';

export default function StudentExamsPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const attemptsRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return collection(firestore, 'students', user.uid, 'quiz_attempts');
  }, [firestore, user?.uid]);

  const { data: attempts, isLoading } = useCollection(attemptsRef);

  if (isUserLoading || isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="text-right">
        <h1 className="text-4xl font-headline font-bold mb-2">سجل درجاتي</h1>
        <p className="text-muted-foreground">تظهر درجاتك هنا بمجرد أن يقوم البشمهندس باعتمادها ونشرها.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {!attempts || attempts.length === 0 ? (
          <Card className="col-span-full p-12 text-center border-dashed">
             <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-10" />
             <p className="text-muted-foreground">لم تمتحن بعد.</p>
          </Card>
        ) : (
          attempts.map((attempt) => (
            <ExamResultCard key={attempt.id} attempt={attempt} />
          ))
        )}
      </div>
    </div>
  );
}

function ExamResultCard({ attempt }: { attempt: any }) {
  const firestore = useFirestore();
  // نحتاج للتأكد من حالة "نشر النتيجة" من وثيقة الكورس كونتينت الأصلية
  const examRef = useMemoFirebase(() => {
    return doc(firestore, 'courses', attempt.courseId, 'content', attempt.courseContentId);
  }, [firestore, attempt]);
  const { data: exam } = useDoc(examRef);

  const canShowScore = exam?.allowInstantResultsDisplay || attempt.gradeReleased;

  return (
    <Card className="bg-card">
      <CardHeader className="border-b pb-4 flex flex-row items-center justify-between">
        <CardTitle className="text-lg">{exam?.title || 'جاري التحميل...'}</CardTitle>
        <Badge variant={canShowScore ? "default" : "secondary"}>
          {canShowScore ? "تم النشر" : "قيد المراجعة"}
        </Badge>
      </CardHeader>
      <CardContent className="p-6">
        <div className="flex items-center justify-center p-6 bg-secondary/10 rounded-2xl relative overflow-hidden">
          {canShowScore ? (
            <div className="text-center">
              <p className="text-4xl font-black text-primary">{attempt.score}%</p>
              <p className="text-xs text-muted-foreground mt-2">الدرجة النهائية</p>
            </div>
          ) : (
            <div className="text-center opacity-50 flex flex-col items-center">
              <Lock className="w-8 h-8 mb-2" />
              <p className="text-sm font-bold">النتيجة ستظهر قريباً</p>
            </div>
          )}
        </div>
        <div className="mt-4 flex justify-between text-[10px] text-muted-foreground">
          <span>{new Date(attempt.submittedAt).toLocaleDateString('ar-EG')}</span>
          <span>{attempt.isGraded ? 'مصحح' : 'جاري التصحيح'}</span>
        </div>
      </CardContent>
    </Card>
  );
}
