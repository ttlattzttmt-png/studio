"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  Clock, 
  Trophy,
  AlertTriangle,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { useUser, useFirebase, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, addDoc, doc, getDocs, query, orderBy, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function TakeExamPage() {
  const { examId } = useParams();
  const { user, isUserLoading } = useUser();
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [finishedResult, setFinishedResult] = useState<any>(null);
  const [alreadyAttempted, setAlreadyAttempted] = useState(false);

  // جلب بيانات الطالب لحفظ الاسم الحقيقي
  const studentProfileRef = useMemoFirebase(() => user ? doc(firestore!, 'students', user.uid) : null, [firestore, user]);
  const { data: studentProfile } = useDoc(studentProfileRef);

  useEffect(() => {
    const checkStatus = async () => {
      if (!firestore || !user || !examId) return;
      const attRef = collection(firestore, 'students', user.uid, 'quiz_attempts');
      const snap = await getDocs(query(attRef, where('courseContentId', '==', examId)));
      if (!snap.empty) { setAlreadyAttempted(true); return; }

      const coursesRef = collection(firestore, 'courses');
      const coursesSnap = await getDocs(coursesRef);
      for (const cDoc of coursesSnap.docs) {
        const cSnap = await getDocs(query(collection(firestore, 'courses', cDoc.id, 'content'), where('__name__', '==', examId)));
        if (!cSnap.empty) { setCourseId(cDoc.id); break; }
      }
    };
    checkStatus();
  }, [firestore, user, examId]);

  const examRef = useMemoFirebase(() => (firestore && courseId && examId) ? doc(firestore, 'courses', courseId, 'content', examId as string) : null, [firestore, courseId, examId]);
  const { data: exam } = useDoc(examRef);

  useEffect(() => { if (exam?.durationMinutes && timeLeft === null) setTimeLeft(exam.durationMinutes * 60); }, [exam, timeLeft]);
  useEffect(() => {
    if (timeLeft === 0 && !finishedResult) handleSubmit();
    if (!timeLeft || timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft(p => (p ? p - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const questionsRef = useMemoFirebase(() => (firestore && courseId && examId) ? query(collection(firestore, 'courses', courseId, 'content', examId as string, 'questions'), orderBy('orderIndex', 'asc')) : null, [firestore, courseId, examId]);
  const { data: questions, isLoading: isQsLoading } = useCollection(questionsRef);

  const handleSubmit = async () => {
    if (isSubmitting || !firestore || !user || !questions || !courseId || !studentProfile) return;
    setIsSubmitting(true);
    try {
      let totalScoreAchieved = 0;
      let totalMaxPoints = 0;
      const submissionAnswers = [];

      for (const q of questions) {
        totalMaxPoints += q.points;
        const studentAns = answers[q.id] || {};
        let isCorrect = false;
        let scoreAchieved = 0;

        if (q.questionType === 'MCQ') {
          const optsSnap = await getDocs(collection(firestore, 'courses', courseId, 'content', examId as string, 'questions', q.id, 'options'));
          const correctOpt = optsSnap.docs.find(d => d.data().isCorrect);
          if (correctOpt && correctOpt.id === studentAns.mcqOptionId) {
            isCorrect = true;
            scoreAchieved = q.points;
            totalScoreAchieved += scoreAchieved;
          }
        }
        submissionAnswers.push({ 
          questionId: q.id, 
          questionType: q.questionType, 
          mcqSelectedOptionId: studentAns.mcqOptionId || null, 
          essayAnswerText: studentAns.essayText || '', 
          isCorrect: q.questionType === 'MCQ' ? isCorrect : false, 
          scoreAchieved: q.questionType === 'MCQ' ? scoreAchieved : 0, 
          maxPoints: q.points 
        });
      }

      const finalPercentage = totalMaxPoints > 0 ? Math.round((totalScoreAchieved / totalMaxPoints) * 100) : 0;
      
      const attemptRef = await addDoc(collection(firestore, 'students', user.uid, 'quiz_attempts'), {
        studentId: user.uid,
        studentName: studentProfile.name || 'طالب مجهول',
        courseContentId: examId,
        courseId: courseId,
        submittedAt: new Date().toISOString(),
        isGraded: questions.every(q => q.questionType === 'MCQ'),
        score: finalPercentage,
        pointsAchieved: totalScoreAchieved,
        totalPoints: totalMaxPoints
      });

      for (const ansData of submissionAnswers) {
        await addDoc(collection(firestore, 'students', user.uid, 'quiz_attempts', attemptRef.id, 'answers'), ansData);
      }

      setFinishedResult({ score: finalPercentage, points: totalScoreAchieved, total: totalMaxPoints });
      toast({ title: "تم تسليم الامتحان" });
    } catch (e) { console.error(e); } finally { setIsSubmitting(false); }
  };

  if (alreadyAttempted) return <div className="min-h-screen flex items-center justify-center p-6 text-center"><Card className="max-w-md p-10 rounded-[3rem] border-primary/20 shadow-2xl"><AlertTriangle className="w-16 h-16 text-primary mx-auto mb-6" /><h2 className="text-2xl font-bold">لا يمكنك إعادة الامتحان</h2><p className="text-muted-foreground mt-4">يسمح بمحاولة واحدة فقط لضمان الأمان والجدية.</p><Link href="/student/exams"><Button className="w-full mt-6 bg-primary font-bold">عرض درجاتي</Button></Link></Card></div>;

  if (finishedResult) return <div className="min-h-screen flex items-center justify-center p-8"><Card className="max-w-lg p-12 text-center rounded-[3rem] border-accent/20 shadow-2xl relative"><div className="absolute top-0 right-0 w-full h-2 bg-accent" /><Trophy className="w-20 h-20 text-accent animate-bounce mx-auto mb-6" /><h2 className="text-3xl font-black mb-6">أحسنت يا بشمهندس!</h2><div className="grid grid-cols-2 gap-4"><div className="p-6 bg-accent/5 rounded-3xl"><p className="text-5xl font-black text-accent">{finishedResult.score}%</p><p className="text-[10px] font-bold text-muted-foreground uppercase">النسبة</p></div><div className="p-6 bg-primary/5 rounded-3xl"><p className="text-5xl font-black text-primary">{finishedResult.points}/{finishedResult.total}</p><p className="text-[10px] font-bold text-muted-foreground uppercase">الدرجة</p></div></div><Link href="/student/dashboard" className="block mt-8"><Button className="w-full h-14 bg-secondary font-bold rounded-2xl">العودة للوحة التحكم</Button></Link></Card></div>;

  if (isUserLoading || isQsLoading || !exam) return <div className="flex justify-center py-40"><Loader2 className="w-12 animate-spin text-primary" /></div>;

  const currentQ = questions?.[activeQuestionIndex];
  const progressPercent = ((activeQuestionIndex + 1) / (questions?.length || 1)) * 100;

  return (
    <div className="min-h-screen bg-background pb-24 select-none overflow-x-hidden">
      <div className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b shadow-sm w-full">
        <div className="container mx-auto p-4 flex items-center justify-between">
          <div className="text-xl font-bold bg-primary/10 px-4 py-2 rounded-xl text-primary flex items-center gap-2 border border-primary/20"><Clock className="w-5 h-5" /> {timeLeft ? `${Math.floor(timeLeft/60)}:${(timeLeft%60).toString().padStart(2,'0')}` : '--:--'}</div>
          <h1 className="font-bold text-lg hidden md:block">{exam.title}</h1>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-primary font-bold px-8 h-11 rounded-xl shadow-lg">إنهاء الامتحان</Button>
        </div>
        <div className="w-full h-1 bg-secondary"><div className="h-full bg-primary transition-all" style={{ width: `${progressPercent}%` }} /></div>
      </div>
      <main className="container mx-auto p-4 md:p-8 max-w-3xl space-y-6">
        {currentQ ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="bg-card border-primary/10 shadow-xl rounded-[2.5rem] overflow-hidden border-b-4 border-b-primary/20">
               <CardHeader className="bg-secondary/5 px-6 py-4 border-b flex flex-row justify-between items-center"><Badge variant="outline" className="text-primary font-bold">سؤال {activeQuestionIndex + 1} من {questions?.length}</Badge><Badge variant="secondary">{currentQ.points} نقاط</Badge></CardHeader>
               <CardContent className="p-6 md:p-8 text-right space-y-8">
                  <h2 className="text-xl md:text-2xl font-bold leading-relaxed">{currentQ.questionText}</h2>
                  {currentQ.questionImageUrl && <div className="w-full rounded-2xl overflow-hidden border border-dashed border-primary/20 bg-black/5 p-2"><img src={currentQ.questionImageUrl} alt="" className="max-h-[400px] mx-auto object-contain rounded-xl" /></div>}
                  <div className="pt-4">
                    {currentQ.questionType === 'MCQ' ? <MCQOptions courseId={courseId!} examId={examId as string} qId={currentQ.id} selected={answers[currentQ.id]?.mcqOptionId} onSelect={(id: string) => setAnswers({...answers, [currentQ.id]: { mcqOptionId: id }})} /> : <div className="space-y-2"><Label className="text-xs font-bold text-muted-foreground mr-2 mb-2 block italic">اكتب إجابتك هنا:</Label><Textarea placeholder="أدخل إجابتك المقالية..." className="min-h-[200px] bg-background/50 text-lg border-primary/10 rounded-2xl focus:border-primary p-4" value={answers[currentQ.id]?.essayText || ''} onChange={(e) => setAnswers({...answers, [currentQ.id]: { essayText: e.target.value }})} /></div>}
                  </div>
               </CardContent>
            </Card>
            <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
               <div className="flex gap-4 w-full justify-center">
                  <Button variant="outline" className="h-14 flex-1 max-w-[150px] rounded-2xl font-bold bg-card" disabled={activeQuestionIndex === 0} onClick={() => setActiveQuestionIndex(p => p - 1)}><ChevronRight className="w-5 h-5" /> السابق</Button>
                  <Button variant="outline" className="h-14 flex-1 max-w-[150px] rounded-2xl font-bold bg-card" disabled={activeQuestionIndex === (questions?.length || 0) - 1} onClick={() => setActiveQuestionIndex(p => p + 1)}>التالي <ChevronLeft className="w-5 h-5" /></Button>
               </div>
               <div className="w-full flex flex-wrap justify-center gap-2 mt-4 px-4">{questions?.map((_, i) => <div key={i} className={`w-2 h-2 rounded-full transition-all ${i === activeQuestionIndex ? 'bg-primary w-5' : answers[questions[i].id] ? 'bg-accent' : 'bg-muted'}`} />)}</div>
            </div>
          </div>
        ) : <div className="flex justify-center py-20"><Loader2 className="w-10 animate-spin text-primary" /></div>}
      </main>
    </div>
  );
}

function MCQOptions({ courseId, examId, qId, selected, onSelect }: any) {
  const firestore = useFirestore();
  const optionsRef = useMemoFirebase(() => collection(firestore, 'courses', courseId, 'content', examId, 'questions', qId, 'options'), [firestore, courseId, examId, qId]);
  const { data: options } = useCollection(optionsRef);
  return (
    <RadioGroup value={selected} onValueChange={onSelect} className="grid grid-cols-1 gap-4">
      {options?.map(opt => (
        <div key={opt.id} className={`flex items-center gap-4 p-5 md:p-6 border-2 rounded-2xl cursor-pointer transition-all ${selected === opt.id ? 'border-primary bg-primary/5' : 'border-primary/5 hover:border-primary/20'}`} onClick={() => onSelect(opt.id)}>
          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${selected === opt.id ? 'border-primary bg-primary' : 'border-muted-foreground/30'}`}>{selected === opt.id && <div className="w-2 h-2 bg-primary-foreground rounded-full" />}</div>
          <RadioGroupItem value={opt.id} id={opt.id} className="sr-only" />
          <Label htmlFor={opt.id} className="flex-grow font-bold text-base md:text-lg cursor-pointer leading-tight">{opt.optionText}</Label>
        </div>
      ))}
    </RadioGroup>
  );
}
