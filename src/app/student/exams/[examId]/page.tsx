"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  Clock, 
  CheckCircle2,
  AlertTriangle,
  Trophy,
  LayoutDashboard
} from 'lucide-react';
import { useUser, useFirebase, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, addDoc, doc, getDocs, query, orderBy, where, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function TakeExamPage() {
  const { examId } = useParams();
  const router = useRouter();
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

  // البحث عن الكورس المرتبط بالامتحان والتأكد من عدم وجود محاولة سابقة
  useEffect(() => {
    const checkStatus = async () => {
      if (!firestore || !user || !examId) return;
      
      // 1. فحص هل أدى الطالب هذا الامتحان من قبل؟
      const attemptsRef = collection(firestore, 'students', user.uid, 'quiz_attempts');
      const qAttempt = query(attemptsRef, where('courseContentId', '==', examId));
      const attemptSnap = await getDocs(qAttempt);
      if (!attemptSnap.empty) {
        setAlreadyAttempted(true);
        return;
      }

      // 2. البحث عن كود الكورس
      const coursesRef = collection(firestore, 'courses');
      const snap = await getDocs(coursesRef);
      for (const courseDoc of snap.docs) {
        const contentSnap = await getDocs(query(collection(firestore, 'courses', courseDoc.id, 'content'), where('__name__', '==', examId)));
        if (!contentSnap.empty) {
          setCourseId(courseDoc.id);
          break;
        }
      }
    };
    checkStatus();
  }, [firestore, user, examId]);

  const examRef = useMemoFirebase(() => 
    (firestore && courseId && examId) ? doc(firestore, 'courses', courseId, 'content', examId as string) : null
  , [firestore, courseId, examId]);
  
  const { data: exam } = useDoc(examRef);

  useEffect(() => {
    if (exam?.durationMinutes && timeLeft === null) setTimeLeft(exam.durationMinutes * 60);
  }, [exam, timeLeft]);

  useEffect(() => {
    if (timeLeft === 0 && !finishedResult) handleSubmit();
    if (!timeLeft || timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft(p => (p ? p - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const questionsRef = useMemoFirebase(() => 
    (firestore && courseId && examId) ? query(collection(firestore, 'courses', courseId, 'content', examId as string, 'questions'), orderBy('orderIndex', 'asc')) : null
  , [firestore, courseId, examId]);

  const { data: questions, isLoading: isQsLoading } = useCollection(questionsRef);

  const handleSubmit = async () => {
    if (isSubmitting || !firestore || !user || !questions || !courseId) return;
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
          essayAnswerFileUrl: studentAns.essayImageUrl || '',
          isCorrect: q.questionType === 'MCQ' ? isCorrect : false,
          scoreAchieved: q.questionType === 'MCQ' ? scoreAchieved : 0,
          maxPoints: q.points
        });
      }

      const finalPercentage = totalMaxPoints > 0 ? Math.round((totalScoreAchieved / totalMaxPoints) * 100) : 0;
      
      // حفظ المحاولة
      const attemptRef = await addDoc(collection(firestore, 'students', user.uid, 'quiz_attempts'), {
        studentId: user.uid,
        courseContentId: examId,
        courseId: courseId,
        submittedAt: new Date().toISOString(),
        isGraded: questions.every(q => q.questionType === 'MCQ'),
        score: finalPercentage,
        pointsAchieved: totalScoreAchieved,
        totalPoints: totalMaxPoints
      });

      // حفظ الإجابات داخل المحاولة
      for (const ansData of submissionAnswers) {
        await addDoc(collection(firestore, 'students', user.uid, 'quiz_attempts', attemptRef.id, 'answers'), ansData);
      }

      setFinishedResult({ score: finalPercentage, points: totalScoreAchieved, total: totalMaxPoints });
      toast({ title: "تم التسليم بنجاح" });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "فشل الحفظ" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (alreadyAttempted) return (
    <div className="min-h-screen flex items-center justify-center p-8 text-center bg-background">
      <Card className="max-w-md p-10 space-y-6 rounded-[2.5rem] border-primary/20 shadow-2xl">
         <AlertTriangle className="w-20 h-20 text-primary mx-auto opacity-50" />
         <h2 className="text-2xl font-bold">عذراً، لا يمكنك الإعادة</h2>
         <p className="text-muted-foreground">لقد قمت بتأدية هذا الامتحان مسبقاً. نظام المنصة يسمح بمحاولة واحدة فقط لكل طالب لضمان الجدية.</p>
         <Link href="/student/exams"><Button className="w-full h-12 bg-primary font-bold rounded-xl">عرض سجل درجاتي</Button></Link>
      </Card>
    </div>
  );

  if (finishedResult) return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-background animate-in fade-in zoom-in duration-500">
       <Card className="max-w-lg w-full p-12 text-center space-y-8 rounded-[3rem] border-accent/20 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-full h-2 bg-accent" />
          <Trophy className="w-24 h-24 text-accent mx-auto animate-bounce" />
          <div className="space-y-2">
             <h2 className="text-4xl font-headline font-black">أحسنت يا بشمهندس!</h2>
             <p className="text-muted-foreground italic">تم استلام إجاباتك بنجاح، إليك ملخص النتيجة:</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div className="p-6 bg-accent/5 rounded-3xl border border-accent/10">
                <p className="text-5xl font-black text-accent">{finishedResult.score}%</p>
                <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1">النسبة المئوية</p>
             </div>
             <div className="p-6 bg-primary/5 rounded-3xl border border-primary/10">
                <p className="text-5xl font-black text-primary">{finishedResult.points}/{finishedResult.total}</p>
                <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1">النقاط المحققة</p>
             </div>
          </div>
          <div className="pt-4 space-y-4">
             <p className="text-xs text-muted-foreground">سيقوم البشمهندس بمراجعة الأسئلة المقالية (إن وجدت) واعتماد النتيجة النهائية قريباً.</p>
             <Link href="/student/dashboard"><Button className="w-full h-14 bg-secondary font-bold rounded-2xl gap-2"><LayoutDashboard className="w-5 h-5" /> العودة للوحة التحكم</Button></Link>
          </div>
       </Card>
    </div>
  );

  if (isUserLoading || isQsLoading || !exam) return <div className="flex justify-center py-40"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>;

  const currentQuestion = questions?.[activeQuestionIndex];

  return (
    <div className="min-h-screen bg-background pb-20 select-none" onContextMenu={(e) => e.preventDefault()}>
      <div className="sticky top-0 z-50 bg-card border-b p-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-xl font-bold bg-primary/10 px-4 py-2 rounded-xl text-primary flex items-center gap-2">
            <Clock className="w-5 h-5" /> {timeLeft ? `${Math.floor(timeLeft/60)}:${(timeLeft%60).toString().padStart(2,'0')}` : '--:--'}
          </div>
          <h1 className="font-bold text-lg hidden md:block">{exam.title}</h1>
        </div>
        <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-primary text-primary-foreground font-bold px-8 rounded-xl shadow-lg">إنهاء وتسليم</Button>
      </div>

      <main className="container mx-auto p-4 md:p-8 max-w-4xl space-y-8">
        {currentQuestion && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
            <Card className="bg-card border-primary/10 shadow-2xl rounded-[2.5rem] overflow-hidden">
               <CardHeader className="bg-secondary/10 px-8 py-4 border-b flex flex-row justify-between items-center">
                  <Badge variant="outline" className="text-primary font-bold">سؤال {activeQuestionIndex + 1}</Badge>
                  <Badge variant="secondary">{currentQuestion.points} نقاط</Badge>
               </CardHeader>
               <CardContent className="p-8 text-right space-y-8">
                  <h2 className="text-3xl font-bold leading-tight">{currentQuestion.questionText}</h2>
                  {currentQuestion.questionImageUrl && (
                    <div className="w-full h-80 bg-black/5 rounded-3xl overflow-hidden border border-dashed border-primary/20">
                      <img src={currentQuestion.questionImageUrl} alt="Question" className="w-full h-full object-contain" />
                    </div>
                  )}
                  {currentQuestion.questionType === 'MCQ' ? (
                    <MCQOptions 
                      courseId={courseId!} 
                      examId={examId as string} 
                      qId={currentQuestion.id} 
                      selected={answers[currentQuestion.id]?.mcqOptionId}
                      onSelect={(id: string) => setAnswers({...answers, [currentQuestion.id]: { mcqOptionId: id }})}
                    />
                  ) : (
                    <Textarea 
                      placeholder="أكتب إجابتك المقالية هنا..." 
                      className="min-h-[250px] bg-background text-lg border-primary/10 rounded-2xl"
                      value={answers[currentQuestion.id]?.essayText || ''}
                      onChange={(e) => setAnswers({...answers, [currentQuestion.id]: { essayText: e.target.value }})}
                    />
                  )}
               </CardContent>
            </Card>

            <div className="flex justify-between items-center gap-4">
               <Button variant="outline" className="h-14 px-8 rounded-2xl font-bold" disabled={activeQuestionIndex === 0} onClick={() => setActiveQuestionIndex(p => p - 1)}>السابق</Button>
               <div className="flex-grow flex justify-center gap-2">
                  {questions.map((_, i) => (
                    <div key={i} className={`w-2.5 h-2.5 rounded-full ${i === activeQuestionIndex ? 'bg-primary scale-125' : answers[questions[i].id] ? 'bg-accent' : 'bg-muted'}`} />
                  ))}
               </div>
               <Button variant="outline" className="h-14 px-8 rounded-2xl font-bold" disabled={activeQuestionIndex === questions.length - 1} onClick={() => setActiveQuestionIndex(p => p + 1)}>التالي</Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function MCQOptions({ courseId, examId, qId, selected, onSelect }: any) {
  const firestore = useFirestore();
  const optionsRef = useMemoFirebase(() => collection(firestore, 'courses', courseId, 'content', examId, 'questions', qId, 'options'), [firestore, courseId, examId, qId]);
  const { data: options } = useCollection(optionsRef);
  return (
    <RadioGroup value={selected} onValueChange={onSelect} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {options?.map(opt => (
        <div key={opt.id} className={`flex items-center gap-4 p-6 border-2 rounded-2xl cursor-pointer transition-all ${selected === opt.id ? 'border-primary bg-primary/5' : 'hover:bg-secondary/20'}`} onClick={() => onSelect(opt.id)}>
          <RadioGroupItem value={opt.id} id={opt.id} className="w-5 h-5" />
          <Label htmlFor={opt.id} className="flex-grow font-bold text-lg cursor-pointer">{opt.optionText}</Label>
        </div>
      ))}
    </RadioGroup>
  );
}
