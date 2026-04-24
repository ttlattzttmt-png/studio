
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  Clock, 
  Trophy,
  ShieldAlert,
  XCircle,
  Layout,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  SendHorizontal
} from 'lucide-react';
import { useUser, useFirebase, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, addDoc, doc, getDoc, getDocs, query, orderBy, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function TakeExamPage() {
  const { examId } = useParams();
  const { user } = useUser();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();

  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [finishedResult, setFinishedResult] = useState<any>(null);
  const [isBlocked, setIsBlocked] = useState(false);

  // حماية المحتوى
  useEffect(() => {
    if (finishedResult) return;
    const triggerProtection = () => setIsBlocked(true);
    const restoreView = () => setTimeout(() => setIsBlocked(false), 2000);
    
    window.addEventListener('blur', triggerProtection);
    window.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') triggerProtection(); });
    window.addEventListener('focus', restoreView);
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    
    return () => {
      window.removeEventListener('blur', triggerProtection);
      window.removeEventListener('focus', restoreView);
    };
  }, [finishedResult]);

  // البحث عن الكورس المرتبط بالامتحان
  useEffect(() => {
    const findCourse = async () => {
      if (!firestore || !examId) return;
      const snap = await getDocs(collection(firestore, 'courses'));
      for (const d of snap.docs) {
        const cSnap = await getDocs(query(collection(firestore, 'courses', d.id, 'content'), where('__name__', '==', examId)));
        if (!cSnap.empty) { setCourseId(d.id); break; }
      }
    };
    findCourse();
  }, [firestore, examId]);

  const examRef = useMemoFirebase(() => (firestore && courseId && examId) ? doc(firestore, 'courses', courseId, 'content', examId as string) : null, [firestore, courseId, examId]);
  const { data: exam } = useDoc(examRef);

  useEffect(() => { 
    if (exam?.durationMinutes && timeLeft === null) setTimeLeft(exam.durationMinutes * 60); 
  }, [exam, timeLeft]);

  useEffect(() => {
    if (timeLeft === 0 && !finishedResult) handleSubmit();
    if (timeLeft === null || timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft(p => p! - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, finishedResult]);

  const questionsRef = useMemoFirebase(() => (firestore && courseId && examId) ? query(collection(firestore, 'courses', courseId, 'content', examId as string, 'questions'), orderBy('orderIndex', 'asc')) : null, [firestore, courseId, examId]);
  const { data: questions } = useCollection(questionsRef);

  const handleSubmit = async () => {
    if (isSubmitting || !questions || !user || !firestore) return;
    
    // تم الغاء رسالة تاكيد التسليم بناء على طلب المستخدم
    setIsSubmitting(true);
    try {
      // إصلاح: جلب بيانات الطالب بشكل مباشر بالمعرف (ID) لتجنب خطأ الصلاحيات
      const studentRef = doc(firestore, 'students', user.uid);
      const studentSnap = await getDoc(studentRef);
      const studentData = studentSnap.exists() ? studentSnap.data() : null;
      const name = studentData?.name || 'طالب مجهول';
      
      let scoreAchieved = 0;
      let totalPoints = 0;
      const submissionAnswers = [];

      for (const q of questions) {
        totalPoints += (Number(q.points) || 0);
        const ans = answers[q.id] || {};
        let correct = false;
        let points = 0;

        if (q.questionType === 'MCQ') {
          const optsRef = collection(firestore, 'courses', courseId!, 'content', examId as string, 'questions', q.id, 'options');
          const optsSnap = await getDocs(optsRef);
          const correctOpt = optsSnap.docs.find(d => d.data().isCorrect);
          if (correctOpt && correctOpt.id === ans.mcqOptionId) { 
            correct = true; 
            points = (Number(q.points) || 0); 
            scoreAchieved += points; 
          }
        }
        
        submissionAnswers.push({ 
          questionId: q.id, 
          questionType: q.questionType, 
          mcqSelectedOptionId: ans.mcqOptionId || null, 
          essayAnswerText: ans.essayText || '', 
          isCorrect: correct, 
          scoreAchieved: points, 
          maxPoints: (Number(q.points) || 0)
        });
      }

      const finalPercent = totalPoints > 0 ? Math.round((scoreAchieved / totalPoints) * 100) : 0;
      
      const attRef = await addDoc(collection(firestore, 'students', user.uid, 'quiz_attempts'), {
        studentId: user.uid, 
        studentName: name, 
        courseContentId: examId, 
        courseId: courseId, 
        submittedAt: new Date().toISOString(), 
        isGraded: questions.every(q => q.questionType === 'MCQ'), 
        score: finalPercent, 
        pointsAchieved: scoreAchieved, 
        totalPoints: totalPoints
      });

      for (const a of submissionAnswers) { 
        await addDoc(collection(firestore, 'students', user.uid, 'quiz_attempts', attRef.id, 'answers'), a); 
      }

      setFinishedResult({ 
        score: finalPercent, 
        points: scoreAchieved, 
        total: totalPoints, 
        isSuccess: finalPercent >= (exam?.passMarkPercentage || 50) 
      });
      
      toast({ title: "تم تسليم الامتحان بنجاح" });
    } catch (e: any) { 
      console.error("Submission Error:", e); 
      toast({ 
        variant: "destructive", 
        title: "خطأ في التسليم", 
        description: "عذراً، حدث خطأ تقني أثناء حفظ إجاباتك. يرجى المحاولة مرة أخرى." 
      });
    } finally { 
      setIsSubmitting(false); 
    }
  };

  if (isBlocked) return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center text-center p-8">
      <ShieldAlert className="w-20 h-20 text-primary mb-6 animate-pulse" />
      <h2 className="text-3xl font-black text-white">🚨 محتوى محمي</h2>
      <p className="text-primary font-bold mt-2">يمنع تصوير الشاشة أو الخروج من الصفحة لضمان نزاهة الامتحان.</p>
    </div>
  );

  if (finishedResult) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-right overflow-y-auto pb-20">
      <Card className="w-full max-w-lg bg-card border-primary/20 rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-500">
        <div className={cn("h-4", finishedResult.isSuccess ? "bg-accent" : "bg-destructive")} />
        <CardContent className="p-8 md:p-12">
           <div className="text-center mb-10 space-y-4">
              <div className={cn(
                "w-24 h-24 rounded-full flex items-center justify-center mx-auto shadow-lg",
                finishedResult.isSuccess ? "bg-accent/10 text-accent" : "bg-destructive/10 text-destructive"
              )}>
                {finishedResult.isSuccess ? <Trophy className="w-12 h-12" /> : <XCircle className="w-12 h-12" />}
              </div>
              <h1 className="text-3xl md:text-4xl font-black">{finishedResult.isSuccess ? "عاش يا بطل!" : "محاولة جيدة"}</h1>
              <p className="text-muted-foreground font-bold italic">لقد أتممت الاختبار بنجاح، بشمهندس.</p>
           </div>

           {exam?.allowInstantResultsDisplay ? (
              <div className="grid grid-cols-1 gap-4 mb-10">
                <div className="p-8 bg-secondary/30 rounded-3xl border border-white/5 flex flex-col items-center justify-center">
                  <p className="text-6xl font-black text-primary">{finishedResult.score}%</p>
                  <p className="text-xs font-black text-muted-foreground mt-2 uppercase tracking-widest">نسبة النجاح</p>
                </div>
                <div className="p-6 bg-secondary/20 rounded-3xl border border-white/5 flex justify-between items-center px-10">
                  <div className="text-center">
                    <p className="text-2xl font-black text-accent">{finishedResult.points}</p>
                    <p className="text-[10px] font-bold opacity-50">نقاطك</p>
                  </div>
                  <div className="h-10 w-px bg-white/10" />
                  <div className="text-center">
                    <p className="text-2xl font-black text-muted-foreground">{finishedResult.total}</p>
                    <p className="text-[10px] font-bold opacity-50">الإجمالي</p>
                  </div>
                </div>
              </div>
           ) : (
             <Card className="bg-primary/5 border-dashed border-primary/20 p-8 text-center rounded-3xl mb-10">
                <p className="text-primary font-bold leading-relaxed">
                  تم استلام إجاباتك بنجاح. <br/>
                  النتائج والدرجات ستظهر في سجلك فور اعتماد المدرس لها.
                </p>
             </Card>
           )}

           <Link href="/student/dashboard" className="block">
             <Button className="w-full h-16 bg-primary text-primary-foreground font-black rounded-2xl text-xl shadow-xl shadow-primary/20 hover:scale-[1.02] transition-transform">
               العودة للوحة التحكم
             </Button>
           </Link>
        </CardContent>
      </Card>
    </div>
  );

  const currentQ = questions?.[activeQuestionIndex];
  if (!exam || !currentQ) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <Loader2 className="w-12 h-12 animate-spin text-primary" />
      <p className="font-bold text-muted-foreground animate-pulse">جاري تحميل بيانات الامتحان...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-32 text-right">
      <div className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b w-full flex items-center justify-between p-4 px-6 shadow-sm">
          <div className="text-base md:text-lg font-black bg-primary/10 px-4 py-2 rounded-xl text-primary flex items-center gap-2 border border-primary/20">
            <Clock className="w-4 h-4" /> 
            {timeLeft !== null ? `${Math.floor(timeLeft/60)}:${(timeLeft%60).toString().padStart(2,'0')}` : '--:--'}
          </div>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting} 
            className="bg-primary hover:bg-primary/90 font-black px-6 md:px-10 h-12 rounded-xl shadow-lg shadow-primary/10 gap-2"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <SendHorizontal className="w-4 h-4" />}
            <span className="hidden md:inline">إنهاء وتسليم</span>
            <span className="md:hidden">تسليم</span>
          </Button>
      </div>

      <main className="container mx-auto p-4 max-w-4xl pt-6 space-y-6">
        <Card className="bg-card border-primary/10 rounded-[2.5rem] p-6 md:p-10 shadow-2xl relative overflow-hidden">
           <div className="flex justify-between items-center flex-row-reverse mb-6">
             <Badge className="bg-primary/10 text-primary border-primary/20 font-black px-4 py-1 text-sm rounded-full">سؤال {activeQuestionIndex + 1} من {questions.length}</Badge>
             <Badge variant="secondary" className="font-bold text-xs">{currentQ.points} درجة</Badge>
           </div>
           
           {currentQ.imageUrl && (
             <div className="w-full rounded-2xl overflow-hidden border-2 border-primary/10 bg-black/5 mb-8 flex justify-center shadow-inner transition-all h-auto">
                <img 
                  src={currentQ.imageUrl} 
                  alt="سؤال مصور" 
                  className="w-full h-auto max-h-[600px] object-contain block mx-auto" 
                />
             </div>
           )}

           <h2 className="text-xl md:text-2xl font-bold leading-relaxed border-r-4 border-primary pr-4 mb-8">{currentQ.questionText}</h2>
           
           {currentQ.questionType === 'MCQ' ? (
             <MCQOptions 
              courseId={courseId!} 
              examId={examId as string} 
              qId={currentQ.id} 
              selected={answers[currentQ.id]?.mcqOptionId} 
              onSelect={(id:string) => setAnswers({...answers, [currentQ.id]: {mcqOptionId: id}})} 
             />
           ) : (
             <Textarea 
              placeholder="اكتب إجابتك النموذجية هنا يا بشمهندس..." 
              className="min-h-[200px] bg-secondary/10 rounded-3xl p-6 text-lg border-primary/5 focus:border-primary text-right resize-none" 
              value={answers[currentQ.id]?.essayText || ''} 
              onChange={(e) => setAnswers({...answers, [currentQ.id]: {essayText: e.target.value}})} 
             />
           )}

           <div className="flex justify-between pt-10 gap-4">
              <Button 
                variant="outline" 
                disabled={activeQuestionIndex === 0} 
                onClick={() => setActiveQuestionIndex(p => p - 1)} 
                className="h-14 flex-1 rounded-2xl font-black border-primary/20 text-primary hover:bg-primary/5 gap-2"
              >
                <ChevronRight className="w-5 h-5" /> السابق
              </Button>
              <Button 
                variant="outline" 
                disabled={activeQuestionIndex === questions.length - 1} 
                onClick={() => setActiveQuestionIndex(p => p + 1)} 
                className="h-14 flex-1 rounded-2xl font-black border-primary/20 text-primary hover:bg-primary/5 gap-2"
              >
                التالي <ChevronLeft className="w-5 h-5" />
              </Button>
           </div>
        </Card>

        <Card className="bg-card border-primary/5 p-6 rounded-[2.5rem] shadow-lg">
            <h3 className="font-black text-xs mb-4 border-b border-white/5 pb-2 flex items-center gap-2 justify-end opacity-60">
              خارطة تقدمك في الامتحان <Layout className="w-4 h-4" />
            </h3>
            <div className="flex flex-wrap gap-2.5 justify-center">
               {questions.map((q, i) => {
                  const isSolved = (answers[q.id]?.mcqOptionId || (answers[q.id]?.essayText && answers[q.id]?.essayText.trim().length > 0));
                  return (
                    <button 
                      key={q.id} 
                      onClick={() => setActiveQuestionIndex(i)} 
                      className={cn(
                        "w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center font-black text-sm transition-all shadow-sm", 
                        activeQuestionIndex === i 
                          ? "ring-4 ring-primary/30 bg-primary text-primary-foreground scale-110" 
                          : isSolved 
                            ? "bg-accent text-white shadow-accent/20" 
                            : "bg-secondary/40 text-muted-foreground hover:bg-secondary/80"
                      )}
                    >
                      {i + 1}
                    </button>
                  );
               })}
            </div>
        </Card>
      </main>
    </div>
  );
}

function MCQOptions({ courseId, examId, qId, selected, onSelect }: any) {
  const firestore = useFirestore();
  const optionsRef = useMemoFirebase(() => 
    firestore ? collection(firestore, 'courses', courseId, 'content', examId, 'questions', qId, 'options') : null
  , [firestore, qId, courseId, examId]);
  
  const { data: options, isLoading } = useCollection(optionsRef);

  if (isLoading) return <div className="py-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></div>;

  return (
    <div className="grid gap-3">
      {options?.map(o => (
        <div 
          key={o.id} 
          onClick={() => onSelect(o.id)} 
          className={cn(
            "flex flex-row-reverse items-center gap-4 p-5 md:p-6 border-2 rounded-3xl cursor-pointer transition-all active:scale-[0.98]", 
            selected === o.id 
              ? "border-primary bg-primary/10 shadow-inner" 
              : "border-white/5 hover:bg-white/5 bg-secondary/5"
          )}
        >
           <div className={cn(
             "w-6 h-6 rounded-full border-2 shrink-0", 
             selected === o.id ? "border-primary bg-primary" : "border-muted"
           )} />
           <Label className="flex-grow font-bold text-lg md:text-xl cursor-pointer text-right leading-tight">{o.optionText}</Label>
        </div>
      ))}
    </div>
  );
}
