"use client";

import { useState, useEffect } from 'react';
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
  CheckCircle2,
  AlertCircle,
  XCircle,
  Circle
} from 'lucide-react';
import { useUser, useFirebase, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, addDoc, doc, getDocs, query, orderBy, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import Link from 'next/link';

/**
 * صفحة أداء الامتحان - تضمن ظهور الصور وحماية المحتوى
 */
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

  // 1. نظام الحماية اللحظي من لقطات الشاشة
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

  // 2. البحث عن الكورس المرتبط بالامتحان لجلب الأسئلة
  useEffect(() => {
    const findCourse = async () => {
      if (!firestore || !examId) return;
      const snap = await getDocs(collection(firestore, 'courses'));
      for (const d of snap.docs) {
        const cSnap = await getDocs(query(collection(firestore, 'courses', d.id, 'content'), where('__name__', '==', examId)));
        if (!cSnap.empty) { 
          setCourseId(d.id); 
          break; 
        }
      }
    };
    findCourse();
  }, [firestore, examId]);

  const examRef = useMemoFirebase(() => (firestore && courseId && examId) ? doc(firestore, 'courses', courseId, 'content', examId as string) : null, [firestore, courseId, examId]);
  const { data: exam } = useDoc(examRef);

  // 3. إدارة وقت الامتحان
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

  // 4. تسليم الإجابات وحساب الدرجة
  const handleSubmit = async () => {
    if (isSubmitting || !questions || !user || !firestore) return;
    setIsSubmitting(true);
    try {
      const studentProfileSnap = await getDocs(query(collection(firestore, 'students'), where('id', '==', user.uid)));
      const name = studentProfileSnap.docs[0]?.data()?.name || 'طالب مجهول';
      
      let scoreAchieved = 0;
      let totalPoints = 0;
      const submissionAnswers = [];

      for (const q of questions) {
        totalPoints += q.points;
        const ans = answers[q.id] || {};
        let correct = false;
        let points = 0;

        if (q.questionType === 'MCQ') {
          const opts = await getDocs(collection(firestore, 'courses', courseId!, 'content', examId as string, 'questions', q.id, 'options'));
          const correctOpt = opts.docs.find(d => d.data().isCorrect);
          if (correctOpt && correctOpt.id === ans.mcqOptionId) { 
            correct = true; 
            points = q.points; 
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
          maxPoints: q.points 
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
      toast({ title: "تم تسليم الامتحان بنجاح ✓" });
    } catch (e) { 
      console.error(e);
      toast({ variant: "destructive", title: "خطأ في التسليم" });
    } finally { 
      setIsSubmitting(false); 
    }
  };

  if (isBlocked) return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center text-center p-8 select-none">
      <ShieldAlert className="w-20 h-20 text-primary mb-6 animate-pulse" />
      <h2 className="text-3xl font-black text-white">🚨 محتوى محمي</h2>
      <p className="text-primary font-bold mt-2">يمنع منعاً باتاً تصوير الشاشة أو الخروج من الصفحة أثناء الامتحان.</p>
    </div>
  );

  if (finishedResult) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-right">
      <Card className="w-full max-w-xl bg-card border-primary/10 rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in duration-500">
        <div className={cn("h-3", finishedResult.isSuccess ? "bg-accent" : "bg-destructive")} />
        <CardContent className="p-12 text-center space-y-10">
           <div className={cn(
             "w-24 h-24 rounded-full flex items-center justify-center mx-auto shadow-lg",
             finishedResult.isSuccess ? "bg-accent/10 text-accent" : "bg-destructive/10 text-destructive"
           )}>
             {finishedResult.isSuccess ? <Trophy className="w-12 h-12" /> : <XCircle className="w-12 h-12" />}
           </div>
           <h1 className="text-4xl font-black">{finishedResult.isSuccess ? "أحسنت يا بطل!" : "حظاً موفقاً المرة القادمة"}</h1>
           <div className="grid grid-cols-2 gap-6">
              <div className="p-8 bg-secondary/30 rounded-3xl border border-white/5">
                <p className="text-5xl font-black text-primary">{finishedResult.score}%</p>
                <p className="text-[10px] font-bold text-muted-foreground mt-2 uppercase">النسبة</p>
              </div>
              <div className="p-8 bg-secondary/30 rounded-3xl border border-white/5">
                <p className="text-5xl font-black text-accent">{finishedResult.points}/{finishedResult.total}</p>
                <p className="text-[10px] font-bold text-muted-foreground mt-2 uppercase">النقاط</p>
              </div>
           </div>
           <Link href="/student/dashboard" className="block">
             <Button className="w-full h-16 bg-primary text-primary-foreground font-black rounded-2xl text-xl">العودة للوحة التحكم</Button>
           </Link>
        </CardContent>
      </Card>
    </div>
  );

  const currentQ = questions?.[activeQuestionIndex];
  if (!exam || !currentQ) return <div className="flex justify-center py-40"><Loader2 className="w-12 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-background pb-24 select-none text-right">
      <div className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b w-full flex items-center justify-between p-4">
          <div className="text-lg font-bold bg-primary/10 px-4 py-2 rounded-xl text-primary flex items-center gap-2">
            <Clock className="w-4 h-4" /> {timeLeft !== null ? `${Math.floor(timeLeft/60)}:${(timeLeft%60).toString().padStart(2,'0')}` : '--:--'}
          </div>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-primary font-black px-8 h-12 rounded-xl shadow-lg">إنهاء وتسليم</Button>
      </div>

      <main className="container mx-auto p-4 max-w-3xl pt-10">
        <Card className="bg-card border-primary/10 rounded-[2.5rem] p-6 md:p-10 space-y-8">
           <div className="flex justify-between items-center flex-row-reverse">
              <Badge variant="outline" className="text-primary font-black">سؤال {activeQuestionIndex + 1} من {questions.length}</Badge>
              <Badge variant="secondary" className="font-bold">{currentQ.points} درجة</Badge>
           </div>

           {/* حل مشكلة ظهور الصور بشكل نهائي للطالب باستخدام img مباشر */}
           {currentQ.imageUrl && (
             <div className="w-full rounded-2xl overflow-hidden border-2 border-primary/10 bg-black/20 mb-8 shadow-2xl relative">
                <img 
                  src={currentQ.imageUrl} 
                  alt="السؤال المصور" 
                  className="w-full h-auto max-h-[500px] object-contain block mx-auto transition-all"
                  loading="eager"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    console.error("Image load failed:", currentQ.imageUrl);
                    // في حالة الفشل، نحاول إظهار بديل أو تنبيه
                  }}
                />
             </div>
           )}

           <h2 className="text-2xl font-bold leading-relaxed border-r-4 border-primary pr-4">{currentQ.questionText}</h2>
           
           {currentQ.questionType === 'MCQ' ? (
             <div className="grid gap-4 mt-6">
                <MCQOptions 
                  courseId={courseId!} 
                  examId={examId as string} 
                  qId={currentQ.id} 
                  selected={answers[currentQ.id]?.mcqOptionId} 
                  onSelect={(id:string) => setAnswers({...answers, [currentQ.id]: {mcqOptionId: id}})} 
                />
             </div>
           ) : (
             <Textarea 
               placeholder="أدخل إجابتك المقالية هنا بصيغة هندسية دقيقة..." 
               className="min-h-[200px] bg-background/50 rounded-2xl p-6 text-lg border-primary/10 mt-6 text-right" 
               value={answers[currentQ.id]?.essayText || ''} 
               onChange={(e) => setAnswers({...answers, [currentQ.id]: {essayText: e.target.value}})} 
             />
           )}

           <div className="flex justify-between pt-12 gap-4">
              <Button 
                variant="outline" 
                disabled={activeQuestionIndex === 0} 
                onClick={() => setActiveQuestionIndex(p => p - 1)} 
                className="h-14 flex-1 rounded-2xl font-black text-lg"
              >
                السؤال السابق
              </Button>
              <Button 
                variant="outline" 
                disabled={activeQuestionIndex === questions.length - 1} 
                onClick={() => setActiveQuestionIndex(p => p + 1)} 
                className="h-14 flex-1 rounded-2xl font-black text-lg"
              >
                السؤال التالي
              </Button>
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
  const { data: options } = useCollection(optionsRef);

  return (
    <div className="grid gap-4">
      {options?.map(o => (
        <div 
          key={o.id} 
          onClick={() => onSelect(o.id)} 
          className={cn(
            "flex flex-row-reverse items-center gap-4 p-5 md:p-6 border-2 rounded-3xl cursor-pointer transition-all active:scale-[0.98]", 
            selected === o.id ? "border-primary bg-primary/5 shadow-xl" : "border-white/5 hover:bg-white/5"
          )}
        >
           <div className={cn(
             "w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0", 
             selected === o.id ? "border-primary" : "border-muted"
           )}>
             {selected === o.id && <div className="w-3.5 h-3.5 bg-primary rounded-full shadow-lg" />}
           </div>
           <Label className="flex-grow font-black text-lg md:text-xl cursor-pointer text-right leading-snug">{o.optionText}</Label>
        </div>
      ))}
    </div>
  );
}
