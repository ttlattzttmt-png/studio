
"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertCircle, Lock } from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { cn } from '@/lib/utils';

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
    <div className="space-y-8 animate-in fade-in duration-500 text-right">
      <div>
        <h1 className="text-4xl font-headline font-bold mb-2">سجل درجاتي</h1>
        <p className="text-muted-foreground font-bold">تظهر درجاتك هنا بمجرد أن يقوم البشمهندس باعتمادها ونشرها.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {!attempts || attempts.length === 0 ? (
          <Card className="col-span-full p-12 text-center border-dashed border-2 bg-secondary/10 rounded-[2rem]">
             <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-10" />
             <p className="text-muted-foreground font-bold italic">لم تؤدِ أي اختبارات بعد. ابدأ التعلم الآن!</p>
          </Card>
        ) : (
          attempts.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()).map((attempt) => (
            <ExamResultCard key={attempt.id} attempt={attempt} />
          ))
        )}
      </div>
    </div>
  );
}

function ExamResultCard({ attempt }: { attempt: any }) {
  const firestore = useFirestore();
  
  const examRef = useMemoFirebase(() => {
    if (!firestore || !attempt.courseId || !attempt.courseContentId) return null;
    return doc(firestore, 'courses', attempt.courseId, 'content', attempt.courseContentId);
  }, [firestore, attempt.courseId, attempt.courseContentId]);
  
  const { data: exam } = useDoc(examRef);
  const canShowScore = exam?.allowInstantResultsDisplay || attempt.isGraded;

  return (
    <Card className="bg-card overflow-hidden border-primary/10 hover:border-primary/30 transition-all rounded-3xl shadow-lg">
      <CardHeader className="border-b bg-secondary/5 pb-4 flex flex-row-reverse items-center justify-between">
        <Badge variant={canShowScore ? "default" : "secondary"} className={cn(canShowScore ? "bg-accent text-white" : "")}>
          {canShowScore ? "تم النشر" : "قيد المراجعة"}
        </Badge>
        <CardTitle className="text-lg font-black truncate max-w-[200px] text-right">
          {exam?.title || 'جاري تحميل الاسم...'}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="flex flex-col items-center justify-center p-8 bg-secondary/20 rounded-2xl relative overflow-hidden border border-white/5">
          {canShowScore ? (
            <div className="text-center animate-in zoom-in duration-300">
              <p className="text-5xl font-black text-primary">{attempt.score}%</p>
              <p className="text-sm font-bold text-muted-foreground mt-2">الدرجة: {attempt.pointsAchieved} من {attempt.totalPoints}</p>
            </div>
          ) : (
            <div className="text-center opacity-40 flex flex-col items-center">
              <Lock className="w-10 h-10 mb-2 text-primary" />
              <p className="text-sm font-bold">النتيجة ستظهر قريباً</p>
            </div>
          )}
        </div>
        <div className="mt-6 flex flex-row-reverse justify-between items-center text-[10px] text-muted-foreground border-t pt-4">
          <span className="flex items-center gap-1 font-mono font-bold">
             {attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleDateString('ar-EG') : '---'}
          </span>
          <span className={cn("px-2 py-0.5 rounded-full font-black", attempt.isGraded ? 'text-accent bg-accent/10' : 'text-primary bg-primary/10')}>
            {attempt.isGraded ? 'تم التصحيح ✓' : 'جاري التصحيح...'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
