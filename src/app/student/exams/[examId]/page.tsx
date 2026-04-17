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
  LayoutDashboard,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  Send
} from 'lucide-react';
import { useUser, useFirebase, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, addDoc, doc, getDocs, query, orderBy, where } from 'firebase/firestore';
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

  // التأكد من عدم وجود محاولة سابقة والبحث عن الكورس
  useEffect(() => {
    const checkStatus = async () => {
      if (!firestore || !user || !examId) return;
      
      const attemptsRef = collection(firestore, 'students', user.uid, 'quiz_attempts');
      const qAttempt = query(attemptsRef, where('courseContentId', '==', examId));
      const attemptSnap = await getDocs(qAttempt);
      if (!attemptSnap.empty) {
        setAlreadyAttempted(true);
        return;
      }

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
          isCorrect: q.questionType === 'MCQ' ? isCorrect : false,
          scoreAchieved: q.questionType === 'MCQ' ? scoreAchieved : 0,
          maxPoints: q.points
        });
      }

      const finalPercentage = totalMaxPoints > 0 ? Math.round((totalScoreAchieved / totalMaxPoints) * 100) : 0;
      
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

      for (const ansData of submissionAnswers) {
        await addDoc(collection(firestore, 'students', user.uid, 'quiz_attempts', attemptRef.id, 'answers'), ansData);
      }

      setFinishedResult({ score: finalPercentage, points: totalScoreAchieved, total: totalMaxPoints });
      toast({ title: "تم تسليم الامتحان" });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "فشل الحفظ" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (alreadyAttempted) return (
    <div className="min-h-screen flex items-center justify-center p-6 text-center bg-background">
      <Card className="max-w-md w-full p-8 md:p-10 space-y-6 rounded-[2.5rem] border-primary/20 shadow-2xl">
         <AlertTriangle className="w-16 h-16 md:w-20 md:h-20 text-primary mx-auto opacity-50" />
         <h2 className="text-xl md:text-2xl font-bold">عذراً، لا يمكنك الإعادة</h2>
         <p className="text-muted-foreground text-sm md:text-base leading-relaxed">لقد قمت بتأدية هذا الامتحان مسبقاً. نظام المنصة يسمح بمحاولة واحدة فقط لكل طالب لضمان الجدية التامة.</p>
         <Link href="/student/exams" className="block w-full">
            <Button className="w-full h-12 bg-primary font-bold rounded-xl">عرض سجل درجاتي</Button>
         </Link>
      </Card>
    </div>
  );

  if (finishedResult) return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-8 bg-background animate-in fade-in zoom-in duration-500">
       <Card className="max-w-lg w-full p-8 md:p-12 text-center space-y-8 rounded-[2.5rem] md:rounded-[3rem] border-accent/20 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-full h-2 bg-accent" />
          <div className="relative">
            <div className="w-20 h-20 md:w-24 md:h-24 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trophy className="w-10 h-10 md:w-12 md:h-12 text-accent animate-bounce" />
            </div>
            <div className="space-y-2">
                <h2 className="text-2xl md:text-4xl font-headline font-black">أحسنت يا بشمهندس!</h2>
                <p className="text-muted-foreground text-sm italic">تم استلام إجاباتك، إليك ملخص النتيجة:</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="p-6 bg-accent/5 rounded-3xl border border-accent/10 flex flex-col items-center justify-center">
                <p className="text-4xl md:text-5xl font-black text-accent">{finishedResult.score}%</p>
                <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1 tracking-widest">النسبة المئوية</p>
             </div>
             <div className="p-6 bg-primary/5 rounded-3xl border border-primary/10 flex flex-col items-center justify-center">
                <p className="text-4xl md:text-5xl font-black text-primary">{finishedResult.points}/{finishedResult.total}</p>
                <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1 tracking-widest">النقاط المحققة</p>
             </div>
          </div>

          <div className="pt-4 space-y-4">
             <p className="text-[10px] md:text-xs text-muted-foreground max-w-xs mx-auto">سيقوم البشمهندس بمراجعة الأسئلة المقالية (إن وجدت) واعتماد النتيجة النهائية قريباً.</p>
             <Link href="/student/dashboard" className="block w-full">
                <Button className="w-full h-14 bg-secondary text-foreground hover:bg-secondary/80 font-bold rounded-2xl gap-2 shadow-lg">
                    <LayoutDashboard className="w-5 h-5" /> العودة للوحة التحكم
                </Button>
             </Link>
          </div>
       </Card>
    </div>
  );

  if (isUserLoading || isQsLoading || !exam) return <div className="flex justify-center py-40"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>;

  const currentQuestion = questions?.[activeQuestionIndex];
  const progressPercent = ((activeQuestionIndex + 1) / (questions?.length || 1)) * 100;

  return (
    <div className="min-h-screen bg-background pb-24 select-none" onContextMenu={(e) => e.preventDefault()}>
      {/* Header المطور للموبايل */}
      <div className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b shadow-sm">
        <div className="container mx-auto p-3 md:p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-base md:text-xl font-bold bg-primary/10 px-3 md:px-4 py-1.5 md:py-2 rounded-xl text-primary flex items-center gap-2 border border-primary/20">
              <Clock className="w-4 h-4 md:w-5 md:h-5" /> {timeLeft ? `${Math.floor(timeLeft/60)}:${(timeLeft%60).toString().padStart(2,'0')}` : '--:--'}
            </div>
          </div>
          <div className="hidden md:block">
             <h1 className="font-bold text-lg truncate max-w-md">{exam.title}</h1>
          </div>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting} 
            size="sm"
            className="bg-primary text-primary-foreground font-bold px-4 md:px-8 h-9 md:h-11 rounded-xl shadow-lg shadow-primary/20 gap-2"
          >
            <Send className="w-4 h-4" /> <span className="text-xs md:text-sm">إنهاء</span>
          </Button>
        </div>
        {/* Progress bar line */}
        <div className="w-full h-1 bg-secondary overflow-hidden">
            <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      <main className="container mx-auto p-4 md:p-8 max-w-3xl space-y-6">
        {currentQuestion ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
            <Card className="bg-card border-primary/10 shadow-xl rounded-[2rem] overflow-hidden border-b-4 border-b-primary/20">
               <CardHeader className="bg-secondary/5 px-6 md:px-8 py-3 md:py-4 border-b flex flex-row justify-between items-center">
                  <Badge variant="outline" className="text-primary font-bold border-primary/30 text-[10px] md:text-xs">سؤال {activeQuestionIndex + 1} من {questions?.length}</Badge>
                  <Badge variant="secondary" className="text-[10px] md:text-xs">{currentQuestion.points} نقاط</Badge>
               </CardHeader>
               <CardContent className="p-6 md:p-8 text-right space-y-6 md:space-y-8">
                  <h2 className="text-xl md:text-2xl font-bold leading-relaxed">{currentQuestion.questionText}</h2>
                  
                  {currentQuestion.questionImageUrl && (
                    <div className="w-full rounded-2xl overflow-hidden border border-dashed border-primary/20 bg-black/5 flex items-center justify-center p-2">
                      <img 
                        src={currentQuestion.questionImageUrl} 
                        alt="Question" 
                        className="max-h-[300px] md:max-h-[400px] w-auto object-contain rounded-xl" 
                      />
                    </div>
                  )}

                  <div className="pt-4">
                    {currentQuestion.questionType === 'MCQ' ? (
                        <MCQOptions 
                        courseId={courseId!} 
                        examId={examId as string} 
                        qId={currentQuestion.id} 
                        selected={answers[currentQuestion.id]?.mcqOptionId}
                        onSelect={(id: string) => setAnswers({...answers, [currentQuestion.id]: { mcqOptionId: id }})}
                        />
                    ) : (
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-muted-foreground mr-2 mb-2 block italic">اكتب إجابتك المقالية في المساحة أدناه:</Label>
                            <Textarea 
                            placeholder="أدخل إجابتك هنا..." 
                            className="min-h-[200px] md:min-h-[250px] bg-background/50 text-base md:text-lg border-primary/10 rounded-2xl focus:border-primary transition-all p-4"
                            value={answers[currentQuestion.id]?.essayText || ''}
                            onChange={(e) => setAnswers({...answers, [currentQuestion.id]: { essayText: e.target.value }})}
                            />
                        </div>
                    )}
                  </div>
               </CardContent>
            </Card>

            {/* أزرار التحكم بالموبايل */}
            <div className="flex justify-between items-center gap-4 px-2">
               <Button 
                variant="outline" 
                className="h-12 md:h-14 px-4 md:px-8 rounded-2xl font-bold border-primary/20 bg-card shadow-sm gap-2" 
                disabled={activeQuestionIndex === 0} 
                onClick={() => setActiveQuestionIndex(p => p - 1)}
               >
                  <ChevronRight className="w-5 h-5" /> <span className="hidden md:block">السابق</span>
               </Button>
               
               <div className="flex-grow flex justify-center gap-1.5 md:gap-2">
                  {questions?.map((_, i) => (
                    <div 
                      key={i} 
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${i === activeQuestionIndex ? 'bg-primary w-4 md:w-6' : answers[questions[i].id] ? 'bg-accent/60' : 'bg-muted-foreground/30'}`} 
                    />
                  ))}
               </div>

               <Button 
                variant="outline" 
                className="h-12 md:h-14 px-4 md:px-8 rounded-2xl font-bold border-primary/20 bg-card shadow-sm gap-2" 
                disabled={activeQuestionIndex === questions.length - 1} 
                onClick={() => setActiveQuestionIndex(p => p + 1)}
               >
                  <span className="hidden md:block">التالي</span> <ChevronLeft className="w-5 h-5" />
               </Button>
            </div>
          </div>
        ) : (
            <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
        )}
      </main>
    </div>
  );
}

function MCQOptions({ courseId, examId, qId, selected, onSelect }: any) {
  const firestore = useFirestore();
  const optionsRef = useMemoFirebase(() => 
    collection(firestore, 'courses', courseId, 'content', examId, 'questions', qId, 'options')
  , [firestore, courseId, examId, qId]);
  
  const { data: options, isLoading } = useCollection(optionsRef);

  if (isLoading) return <div className="flex justify-center py-4"><Loader2 className="w-6 h-6 animate-spin text-primary/30" /></div>;

  return (
    <RadioGroup value={selected} onValueChange={onSelect} className="grid grid-cols-1 gap-3 md:gap-4">
      {options?.map(opt => (
        <div 
          key={opt.id} 
          className={`flex items-center gap-3 md:gap-4 p-4 md:p-6 border-2 rounded-2xl cursor-pointer transition-all duration-200 group ${selected === opt.id ? 'border-primary bg-primary/5 shadow-md shadow-primary/5' : 'border-primary/5 hover:border-primary/20 hover:bg-secondary/20'}`} 
          onClick={() => onSelect(opt.id)}
        >
          <div className={`w-5 h-5 md:w-6 md:h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${selected === opt.id ? 'border-primary bg-primary' : 'border-muted-foreground/30'}`}>
            {selected === opt.id && <div className="w-2 h-2 bg-primary-foreground rounded-full" />}
          </div>
          <RadioGroupItem value={opt.id} id={opt.id} className="sr-only" />
          <Label htmlFor={opt.id} className="flex-grow font-bold text-sm md:text-lg cursor-pointer leading-tight group-hover:text-primary transition-colors">{opt.optionText}</Label>
        </div>
      ))}
    </RadioGroup>
  );
}
