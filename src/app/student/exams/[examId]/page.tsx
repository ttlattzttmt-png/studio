
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { 
  Loader2, 
  Send, 
  Clock, 
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, addDoc, doc, getDocs, query, orderBy, where, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

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
  
  // نظام التايمر
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
        gradeReleased: false // افتراضي غير منشور حتى يفعله الأدمن
      });

      let totalScore = 0;
      let totalPoints = 0;

      for (const q of questions) {
        totalPoints += q.points;
        const studentAns = answers[q.id] || {};
        let isCorrect = false;
        let scoreAchieved = 0;

        if (q.questionType === 'MCQ') {
          const optsSnap = await getDocs(collection(firestore, 'courses', courseId, 'content', examId as string, 'questions', q.id, 'options'));
          const correctOpt = optsSnap.docs.find(d => d.data().isCorrect);
          if (correctOpt && correctOpt.id === studentAns.mcqOptionId) {
            isCorrect = true;
            scoreAchieved = q.points;
            totalScore += scoreAchieved;
          }
        }

        await addDoc(collection(firestore, 'students', user.uid, 'quiz_attempts', attemptRef.id, 'answers'), {
          questionId: q.id,
          questionType: q.questionType,
          mcqSelectedOptionId: studentAns.mcqOptionId || null,
          essayAnswerText: studentAns.essayText || '',
          isCorrect: q.questionType === 'MCQ' ? isCorrect : false,
          scoreAchieved: q.questionType === 'MCQ' ? scoreAchieved : 0
        });
      }

      const finalScore = Math.round((totalScore / totalPoints) * 100);
      await updateDoc(doc(firestore, 'students', user.uid, 'quiz_attempts', attemptRef.id), {
        score: finalScore,
        isGraded: questions.every(q => q.questionType === 'MCQ')
      });

      toast({ title: "تم تسليم الامتحان", description: "سيتم مراجعة إجاباتك ونشر النتيجة قريباً." });
      router.push('/student/exams');
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "خطأ" });
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
          <div className="text-xl font-bold bg-primary/10 px-4 py-2 rounded-xl text-primary">
            <Clock className="w-5 h-5 inline ml-2" /> {timeLeft ? formatTime(timeLeft) : '--:--'}
          </div>
          <h1 className="font-bold">{exam?.title}</h1>
        </div>
        <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-primary font-bold px-8">تسليم الآن</Button>
      </div>

      <main className="container mx-auto p-4 md:p-8 max-w-3xl">
        {currentQuestion && (
          <Card className="bg-card shadow-2xl border-primary/10">
            <CardHeader className="border-b bg-secondary/10 flex flex-row justify-between">
              <span className="font-bold">سؤال {activeQuestionIndex + 1}</span>
              <span className="text-xs">{currentQuestion.points} نقاط</span>
            </CardHeader>
            <CardContent className="p-8 space-y-6 text-right">
              <h2 className="text-2xl font-bold">{currentQuestion.questionText}</h2>
              
              {currentQuestion.questionType === 'MCQ' ? (
                <QuestionOptions 
                  courseId={courseId!} 
                  examId={examId as string} 
                  questionId={currentQuestion.id} 
                  selectedId={answers[currentQuestion.id]?.mcqOptionId}
                  onSelect={(id) => setAnswers({...answers, [currentQuestion.id]: { mcqOptionId: id }})}
                />
              ) : (
                <Textarea 
                  placeholder="اكتب إجابتك هنا..." 
                  className="min-h-[200px]"
                  value={answers[currentQuestion.id]?.essayText || ''}
                  onChange={(e) => setAnswers({...answers, [currentQuestion.id]: { essayText: e.target.value }})}
                />
              )}
            </CardContent>
          </Card>
        )}

        <div className="flex justify-between mt-8">
          <Button variant="outline" disabled={activeQuestionIndex === 0} onClick={() => setActiveQuestionIndex(prev => prev - 1)}>
             السابق <ChevronRight className="w-4 h-4 mr-2" />
          </Button>
          <div className="flex gap-2">
            {questions?.map((_, i) => (
              <div key={i} className={`w-2 h-2 rounded-full ${i === activeQuestionIndex ? 'bg-primary' : 'bg-muted'}`} />
            ))}
          </div>
          <Button variant="outline" disabled={activeQuestionIndex === (questions?.length || 1) - 1} onClick={() => setActiveQuestionIndex(prev => prev + 1)}>
            التالي <ChevronLeft className="w-4 h-4 ml-2" />
          </Button>
        </div>
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
    <RadioGroup value={selectedId} onValueChange={onSelect} className="grid grid-cols-1 gap-4">
      {options?.map((opt) => (
        <div key={opt.id} className={`flex items-center gap-3 p-4 border rounded-xl hover:bg-primary/5 transition-colors ${selectedId === opt.id ? 'border-primary bg-primary/10' : ''}`}>
          <RadioGroupItem value={opt.id} id={opt.id} />
          <Label htmlFor={opt.id} className="flex-grow font-bold cursor-pointer">{opt.optionText}</Label>
        </div>
      ))}
    </RadioGroup>
  );
}
