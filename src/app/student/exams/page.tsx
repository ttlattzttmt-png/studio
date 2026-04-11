
"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ClipboardList, Trophy, Loader2, AlertCircle, Lock } from 'lucide-react';
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
             <p className="text-muted-foreground">لم تؤدِ أي امتحانات بعد.</p>
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
  
  const examRef = useMemoFirebase(() => {
    if (!firestore || !attempt.courseId || !attempt.courseContentId) return null;
    return doc(firestore, 'courses', attempt.courseId, 'content', attempt.courseContentId);
  }, [firestore, attempt]);
  
  const { data: exam } = useDoc(examRef);

  const canShowScore = exam?.allowInstantResultsDisplay || attempt.isGraded;

  return (
    <Card className="bg-card overflow-hidden border-primary/10">
      <CardHeader className="border-b pb-4 flex flex-row items-center justify-between">
        <CardTitle className="text-lg truncate max-w-[200px]">{exam?.title || 'جاري تحميل الاسم...'}</CardTitle>
        <Badge variant={canShowScore ? "default" : "secondary"}>
          {canShowScore ? "تم النشر" : "قيد المراجعة"}
        </Badge>
      </CardHeader>
      <CardContent className="p-6">
        <div className="flex items-center justify-center p-8 bg-secondary/20 rounded-2xl relative overflow-hidden border border-white/5 shadow-inner">
          {canShowScore ? (
            <div className="text-center animate-in zoom-in duration-300">
              <p className="text-5xl font-black text-primary">{attempt.score}%</p>
              <p className="text-xs text-muted-foreground mt-2 font-bold uppercase tracking-widest">الدرجة النهائية</p>
            </div>
          ) : (
            <div className="text-center opacity-40 flex flex-col items-center">
              <Lock className="w-10 h-10 mb-2 text-primary" />
              <p className="text-sm font-bold">النتيجة ستظهر قريباً</p>
              <p className="text-[10px] mt-1 italic">بانتظار مراجعة البشمهندس</p>
            </div>
          )}
        </div>
        <div className="mt-6 flex justify-between items-center text-[10px] text-muted-foreground border-t pt-4">
          <span className="flex items-center gap-1 font-mono">
            {attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleDateString('ar-EG') : '---'}
          </span>
          <span className={`px-2 py-0.5 rounded-full font-bold ${attempt.isGraded ? 'text-accent' : 'text-primary'}`}>
            {attempt.isGraded ? 'تم التصحيح' : 'جاري التصحيح'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
