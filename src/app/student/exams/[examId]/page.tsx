
"use client";

import { useState, useEffect, useMemo } from 'react';
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
  Send, 
  Clock, 
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  Upload,
  CheckCircle2
} from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, addDoc, doc, getDocs, query, orderBy, where, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

export default function TakeExamPage() {
  const { examId } = useParams();
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [courseId, setCourseId] = useState<string | null>(null);
  
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    const findCourse = async () => {
      if (!firestore) return;
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
    findCourse();
  }, [firestore, examId]);

  const examRef = useMemoFirebase(() => {
    if (!firestore || !courseId || !examId) return null;
    return doc(firestore, 'courses', courseId, 'content', examId as string);
  }, [firestore, courseId, examId]);
  
  const { data: exam } = useDoc(examRef);

  useEffect(() => {
    if (exam?.durationMinutes && timeLeft === null) {
      setTimeLeft(exam.durationMinutes * 60);
    }
  }, [exam, timeLeft]);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) {
      if (timeLeft === 0) handleSubmit();
      return;
    }
    const timer = setInterval(() => setTimeLeft(prev => (prev ? prev - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const questionsRef = useMemoFirebase(() => {
    if (!firestore || !courseId || !examId) return null;
    return query(collection(firestore, 'courses', courseId, 'content', examId as string, 'questions'), orderBy('orderIndex', 'asc'));
  }, [firestore, courseId, examId]);

  const { data: questions, isLoading: isQsLoading } = useCollection(questionsRef);
  const currentQuestion = questions?.[activeQuestionIndex];

  const handleSubmit = async () => {
    if (isSubmitting || !firestore || !user || !questions || !courseId) return;
    setIsSubmitting(true);
    
    try {
      const attemptRef = await addDoc(collection(firestore, 'students', user.uid, 'quiz_attempts'), {
        studentId: user.uid,
        courseContentId: examId,
        courseId: courseId,
        submittedAt: new Date().toISOString(),
        isGraded: false,
        score: 0,
        gradeReleased: false
      });

      let totalScoreAchieved = 0;
      let totalMaxPoints = 0;

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

        await addDoc(collection(firestore, 'students', user.uid, 'quiz_attempts', attemptRef.id, 'answers'), {
          questionId: q.id,
          questionType: q.questionType,
          mcqSelectedOptionId: studentAns.mcqOptionId || null,
          essayAnswerText: studentAns.essayText || '',
          essayAnswerFileUrl: studentAns.essayFileUrl || '',
          isCorrect: q.questionType === 'MCQ' ? isCorrect : false,
          scoreAchieved: q.questionType === 'MCQ' ? scoreAchieved : 0,
          maxPoints: q.points // حفظ النقاط القصوى للسؤال لسهولة الحساب لاحقاً
        });
      }

      const finalScorePercentage = totalMaxPoints > 0 ? Math.round((totalScoreAchieved / totalMaxPoints) * 100) : 0;
      
      await updateDoc(doc(firestore, 'students', user.uid, 'quiz_attempts', attemptRef.id), {
        score: finalScorePercentage,
        isGraded: questions.every(q => q.questionType === 'MCQ')
      });

      toast({ title: "تم تسليم الامتحان بنجاح" });
      router.push('/student/exams');
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "فشل التسليم" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isUserLoading || isQsLoading) return <div className="flex justify-center py-40"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-50 bg-card border-b p-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-xl font-bold bg-primary/10 px-4 py-2 rounded-xl text-primary flex items-center gap-2">
            <Clock className="w-5 h-5" /> {timeLeft !== null ? formatTime(timeLeft) : '--:--'}
          </div>
          <h1 className="font-bold text-lg hidden md:block">{exam?.title}</h1>
        </div>
        <div className="flex items-center gap-2">
           <span className="text-xs text-muted-foreground hidden sm:block">سؤال {activeQuestionIndex + 1} من {questions?.length}</span>
           <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-primary text-primary-foreground font-bold px-8 shadow-lg shadow-primary/20">
             {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "إنهاء وتسليم"}
           </Button>
        </div>
      </div>

      <main className="container mx-auto p-4 md:p-8 max-w-4xl">
        {currentQuestion && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="bg-card shadow-2xl border-primary/10 overflow-hidden">
              <CardHeader className="border-b bg-secondary/10 flex flex-row justify-between items-center px-8 py-4">
                <Badge variant="outline" className="text-primary border-primary/30">سؤال {activeQuestionIndex + 1}</Badge>
                <Badge variant="secondary">{currentQuestion.points} نقاط</Badge>
              </CardHeader>
              <CardContent className="p-8 space-y-8 text-right">
                {currentQuestion.questionImageUrl && (
                  <div className="relative w-full h-[400px] bg-black/5 rounded-2xl overflow-hidden border border-dashed border-primary/20">
                    <Image 
                      src={currentQuestion.questionImageUrl} 
                      alt="Question Image" 
                      fill 
                      className="object-contain" 
                      unoptimized 
                    />
                  </div>
                )}
                
                <h2 className="text-3xl font-bold leading-tight">{currentQuestion.questionText}</h2>
                
                {currentQuestion.questionType === 'MCQ' ? (
                  <QuestionOptions 
                    courseId={courseId!} 
                    examId={examId as string} 
                    questionId={currentQuestion.id} 
                    selectedId={answers[currentQuestion.id]?.mcqOptionId}
                    onSelect={(id: string) => setAnswers({...answers, [currentQuestion.id]: { mcqOptionId: id }})}
                  />
                ) : (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-bold block mb-2">أكتب إجابتك هنا:</Label>
                      <Textarea 
                        placeholder="ابدأ الكتابة هنا..." 
                        className="min-h-[250px] text-lg bg-background border-primary/10 focus:border-primary"
                        value={answers[currentQuestion.id]?.essayText || ''}
                        onChange={(e) => setAnswers({...answers, [currentQuestion.id]: { ...answers[currentQuestion.id], essayText: e.target.value }})}
                      />
                    </div>
                    
                    <div className="p-6 bg-secondary/20 rounded-2xl border-2 border-dashed border-primary/20 space-y-4">
                      <div className="flex items-center gap-2 text-primary font-bold">
                        <Upload className="w-5 h-5" />
                        <span>أو ارفع صورة لحلك اليدوي</span>
                      </div>
                      <p className="text-xs text-muted-foreground">إذا قمت بحل السؤال في ورقة خارجية، يمكنك تصويرها ووضع رابط الصورة هنا:</p>
                      <Input 
                        placeholder="ضع رابط الصورة المرفوعة هنا..." 
                        className="bg-background text-right"
                        value={answers[currentQuestion.id]?.essayFileUrl || ''}
                        onChange={(e) => setAnswers({...answers, [currentQuestion.id]: { ...answers[currentQuestion.id], essayFileUrl: e.target.value }})}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-between items-center gap-4">
              <Button 
                variant="outline" 
                size="lg"
                className="h-14 px-8 rounded-xl font-bold border-primary/20"
                disabled={activeQuestionIndex === 0} 
                onClick={() => setActiveQuestionIndex(prev => prev - 1)}
              >
                 السابق <ChevronRight className="w-5 h-5 mr-2" />
              </Button>
              
              <div className="flex-grow flex justify-center gap-2 overflow-x-auto py-2">
                {questions?.map((_, i) => (
                  <button 
                    key={i} 
                    onClick={() => setActiveQuestionIndex(i)}
                    className={`w-3 h-3 rounded-full transition-all ${i === activeQuestionIndex ? 'bg-primary scale-125' : answers[questions[i].id] ? 'bg-accent' : 'bg-muted hover:bg-muted-foreground'}`} 
                  />
                ))}
              </div>
              
              <Button 
                variant="outline" 
                size="lg"
                className="h-14 px-8 rounded-xl font-bold border-primary/20"
                disabled={activeQuestionIndex === (questions?.length || 1) - 1} 
                onClick={() => setActiveQuestionIndex(prev => prev + 1)}
              >
                التالي <ChevronLeft className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function QuestionOptions({ courseId, examId, questionId, selectedId, onSelect }: any) {
  const firestore = useFirestore();
  const optionsRef = useMemoFirebase(() => {
    return collection(firestore, 'courses', courseId, 'content', examId, 'questions', questionId, 'options');
  }, [firestore, courseId, examId, questionId]);

  const { data: options } = useCollection(optionsRef);

  return (
    <RadioGroup value={selectedId} onValueChange={onSelect} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {options?.map((opt) => (
        <div key={opt.id} className={`flex items-center gap-4 p-6 border-2 rounded-2xl cursor-pointer transition-all ${selectedId === opt.id ? 'border-primary bg-primary/5 shadow-inner' : 'hover:bg-primary/5 hover:border-primary/30'}`}>
          <RadioGroupItem value={opt.id} id={opt.id} className="w-6 h-6" />
          <Label htmlFor={opt.id} className="flex-grow font-bold text-lg cursor-pointer leading-relaxed">{opt.optionText}</Label>
        </div>
      ))}
    </RadioGroup>
  );
}
