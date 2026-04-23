
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
  ChevronLeft,
  ShieldAlert,
  CheckCircle2,
  Star,
  Activity
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
  const [isBlocked, setIsBlocked] = useState(false);

  // 🛡️ نظام الحماية الفولاذي المشدد جداً (أثناء الامتحان فقط)
  useEffect(() => {
    if (finishedResult) return;

    const handleContext = (e: MouseEvent) => e.preventDefault();
    
    const handleKey = (e: KeyboardEvent) => {
      const forbidden = ['printscreen', 'p', 's', 'i', 'j', 'u', 'c'];
      if (
        e.key.toLowerCase() === 'printscreen' || 
        (e.ctrlKey && forbidden.includes(e.key.toLowerCase())) || 
        e.key === 'F12' ||
        (e.metaKey && e.shiftKey && e.key === '4')
      ) {
        e.preventDefault();
        setIsBlocked(true);
      }
    };

    const triggerProtection = () => {
      setIsBlocked(true);
    };

    const restoreView = () => {
      if (!finishedResult) {
        setTimeout(() => setIsBlocked(false), 2000);
      }
    };

    document.addEventListener('contextmenu', handleContext);
    document.addEventListener('keydown', handleKey);
    window.addEventListener('blur', triggerProtection);
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') triggerProtection();
    });
    window.addEventListener('focus', restoreView);

    return () => {
      document.removeEventListener('contextmenu', handleContext);
      document.removeEventListener('keydown', handleKey);
      window.removeEventListener('blur', triggerProtection);
      window.removeEventListener('focus', restoreView);
    };
  }, [finishedResult]);

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
  }, [timeLeft, finishedResult]);

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

      setFinishedResult({ 
        score: finalPercentage, 
        points: totalScoreAchieved, 
        total: totalMaxPoints,
        isSuccess: finalPercentage >= (exam?.passMarkPercentage || 50)
      });
      setIsBlocked(false);
      toast({ title: "تم تسليم الامتحان بنجاح" });
    } catch (e) { console.error(e); } finally { setIsSubmitting(false); }
  };

  if (isBlocked) return (
    <div className="fixed inset-0 z-[999999] bg-black flex flex-col items-center justify-center text-center p-8 select-none">
       <ShieldAlert className="w-20 h-20 text-primary mb-6 animate-pulse" />
       <h2 className="text-3xl font-black text-white">🚨 محتوى محمي</h2>
       <p className="text-lg text-primary font-bold mt-2">يمنع منعاً باتاً تصوير الشاشة أثناء الامتحان.</p>
       <p className="text-muted-foreground mt-4 max-w-md">تم تعتيم الشاشة لحماية خصوصية المحتوى. يرجى العودة لصفحة الامتحان فوراً.</p>
       <Button onClick={() => setIsBlocked(false)} className="mt-10 bg-white text-black font-black px-12 h-14 rounded-2xl shadow-xl">أكمل الامتحان</Button>
    </div>
  );

  if (alreadyAttempted) return (
    <div className="min-h-screen flex items-center justify-center p-6 text-center bg-background">
      <Card className="max-w-md p-10 rounded-[2.5rem] border-primary/20 shadow-2xl bg-card">
        <AlertTriangle className="w-16 h-16 text-primary mx-auto mb-4" />
        <h2 className="text-2xl font-black">محاولة واحدة فقط</h2>
        <p className="text-muted-foreground mt-2 font-bold text-sm">لقد أديت هذا الامتحان مسبقاً، ولا يسمح بالإعادة لضمان الأمان والشفافية.</p>
        <Link href="/student/exams" className="block mt-8">
          <Button className="w-full h-12 bg-primary font-black rounded-xl">عرض درجاتي السابقة</Button>
        </Link>
      </Card>
    </div>
  );

  if (finishedResult) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-xl bg-card border border-primary/10 rounded-[2.5rem] overflow-hidden shadow-2xl text-right">
        <div className={`h-3 ${finishedResult.isSuccess ? 'bg-accent' : 'bg-destructive'}`} />
        
        <CardContent className="p-8 md:p-12">
           <div className="text-center mb-10 space-y-4">
              <div className={cn(
                "w-24 h-24 rounded-full flex items-center justify-center mx-auto shadow-lg",
                finishedResult.isSuccess ? "bg-accent/10 text-accent" : "bg-destructive/10 text-destructive"
              )}>
                {finishedResult.isSuccess ? <Trophy className="w-12 h-12" /> : <AlertTriangle className="w-12 h-12" />}
              </div>
              <h1 className="text-3xl md:text-4xl font-black">
                {finishedResult.isSuccess ? "أحسنت يا بطل!" : "محاولة جيدة"}
              </h1>
              <p className="text-muted-foreground font-bold">{exam?.title}</p>
           </div>

           <div className="grid grid-cols-2 gap-4 mb-10">
              <div className="p-6 bg-secondary/30 rounded-3xl border border-white/5 text-center">
                 <p className="text-4xl font-black text-primary">{finishedResult.score}%</p>
                 <p className="text-[10px] font-bold text-muted-foreground mt-1 uppercase">النسبة المئوية</p>
              </div>
              <div className="p-6 bg-secondary/30 rounded-3xl border border-white/5 text-center">
                 <p className="text-4xl font-black text-accent">{finishedResult.points}/{finishedResult.total}</p>
                 <p className="text-[10px] font-bold text-muted-foreground mt-1 uppercase">النقاط</p>
              </div>
           </div>

           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link href="/student/dashboard" className="w-full">
                <Button className="w-full h-14 bg-primary text-primary-foreground font-black rounded-2xl text-lg shadow-xl shadow-primary/20">الرئيسية</Button>
              </Link>
              <Link href="/student/exams" className="w-full">
                <Button variant="outline" className="w-full h-14 border-primary/20 text-primary font-black rounded-2xl text-lg">سجل الدرجات</Button>
              </Link>
           </div>
        </CardContent>
      </div>
    </div>
  );

  if (isUserLoading || isQsLoading || !exam) return <div className="flex justify-center py-40"><Loader2 className="w-12 animate-spin text-primary" /></div>;

  const currentQ = questions?.[activeQuestionIndex];
  const progressPercent = ((activeQuestionIndex + 1) / (questions?.length || 1)) * 100;

  return (
    <div className="min-h-screen bg-background pb-24 select-none">
      <div className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b w-full">
        <div className="container mx-auto p-4 flex items-center justify-between">
          <div className="text-lg font-bold bg-primary/10 px-4 py-2 rounded-xl text-primary flex items-center gap-2 border border-primary/20">
            <Clock className="w-4 h-4" /> {timeLeft ? `${Math.floor(timeLeft/60)}:${(timeLeft%60).toString().padStart(2,'0')}` : '--:--'}
          </div>
          <h1 className="font-bold text-sm hidden md:block">{exam.title}</h1>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-primary font-bold px-6 h-10 rounded-xl shadow-lg">إنهاء</Button>
        </div>
        <div className="w-full h-1 bg-secondary"><div className="h-full bg-primary transition-all" style={{ width: `${progressPercent}%` }} /></div>
      </div>

      <main className="container mx-auto p-4 max-w-3xl space-y-6">
        {currentQ ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="bg-card border-primary/10 shadow-xl rounded-[2rem] overflow-hidden">
               <CardHeader className="bg-secondary/5 px-6 py-4 border-b flex flex-row justify-between items-center">
                 <Badge variant="outline" className="text-primary font-bold">سؤال {activeQuestionIndex + 1}</Badge>
                 <Badge variant="secondary">{currentQ.points} نقاط</Badge>
               </CardHeader>
               <CardContent className="p-6 md:p-10 text-right space-y-8">
                  <h2 className="text-xl md:text-2xl font-bold leading-relaxed">{currentQ.questionText}</h2>
                  {currentQ.questionImageUrl && <img src={currentQ.questionImageUrl} alt="" className="max-h-[300px] mx-auto rounded-2xl shadow-lg" />}
                  <div className="pt-4">
                    {currentQ.questionType === 'MCQ' ? (
                      <MCQOptions courseId={courseId!} examId={examId as string} qId={currentQ.id} selected={answers[currentQ.id]?.mcqOptionId} onSelect={(id: string) => setAnswers({...answers, [currentQ.id]: { mcqOptionId: id }})} />
                    ) : (
                      <Textarea placeholder="أدخل إجابتك هنا..." className="min-h-[200px] bg-background/50 text-lg border-primary/10 rounded-2xl p-4" value={answers[currentQ.id]?.essayText || ''} onChange={(e) => setAnswers({...answers, [currentQ.id]: { essayText: e.target.value }})} />
                    )}
                  </div>
               </CardContent>
            </Card>
            <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
               <Button variant="outline" className="h-12 w-32 rounded-xl font-bold bg-card" disabled={activeQuestionIndex === 0} onClick={() => setActiveQuestionIndex(p => p - 1)}><ChevronRight className="w-4 h-4" /> السابق</Button>
               <Button variant="outline" className="h-12 w-32 rounded-xl font-bold bg-card" disabled={activeQuestionIndex === (questions?.length || 0) - 1} onClick={() => setActiveQuestionIndex(p => p + 1)}>التالي <ChevronLeft className="w-4 h-4" /></Button>
            </div>
          </div>
        ) : <Loader2 className="w-10 animate-spin mx-auto text-primary" />}
      </main>
    </div>
  );
}

function MCQOptions({ courseId, examId, qId, selected, onSelect }: any) {
  const firestore = useFirestore();
  const optionsRef = useMemoFirebase(() => (firestore && courseId && examId && qId) ? collection(firestore, 'courses', courseId, 'content', examId, 'questions', qId, 'options') : null, [firestore, courseId, examId, qId]);
  const { data: options } = useCollection(optionsRef);
  return (
    <RadioGroup value={selected} onValueChange={onSelect} className="grid grid-cols-1 gap-3">
      {options?.map(opt => (
        <div key={opt.id} className={`flex items-center gap-4 p-5 border-2 rounded-2xl cursor-pointer transition-all ${selected === opt.id ? 'border-primary bg-primary/5' : 'border-primary/5 hover:border-primary/10'}`} onClick={() => onSelect(opt.id)}>
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selected === opt.id ? 'border-primary bg-primary' : 'border-muted-foreground/30'}`}>{selected === opt.id && <div className="w-1.5 h-1.5 bg-primary-foreground rounded-full" />}</div>
          <RadioGroupItem value={opt.id} id={opt.id} className="sr-only" />
          <Label htmlFor={opt.id} className="flex-grow font-bold text-base cursor-pointer">{opt.optionText}</Label>
        </div>
      ))}
    </RadioGroup>
  );
}
