
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { 
  Loader2, 
  Send, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight,
  Clock,
  HelpCircle,
  ImageIcon,
  CheckCircle2,
  XCircle,
  Upload,
  X
} from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, doc, getDocs, where, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

export default function TakeExamPage() {
  const { examId } = useParams();
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, { mcqOptionId?: string, essayText?: string, essayFileUrl?: string }>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [courseId, setCourseId] = useState<string | null>(null);

  // العثور على الكورس الذي ينتمي إليه الاختبار
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

  const examRef = useMemoFirebase(() => courseId ? doc(firestore!, 'courses', courseId, 'content', examId as string) : null, [firestore, courseId, examId]);
  const { data: exam, isLoading: isExamLoading } = useDoc(examRef);

  const questionsRef = useMemoFirebase(() => {
    if (!firestore || !courseId || !examId) return null;
    return query(collection(firestore, 'courses', courseId, 'content', examId as string, 'questions'), orderBy('orderIndex', 'asc'));
  }, [firestore, courseId, examId]);

  const { data: questions, isLoading: isQsLoading } = useCollection(questionsRef);

  const currentQuestion = questions?.[activeQuestionIndex];

  // جلب الخيارات للسؤال الحالي
  const optionsRef = useMemoFirebase(() => {
    if (!firestore || !courseId || !examId || !currentQuestion || currentQuestion.questionType !== 'MCQ') return null;
    return collection(firestore, 'courses', courseId, 'content', examId as string, 'questions', currentQuestion.id, 'options');
  }, [firestore, courseId, examId, currentQuestion]);

  const { data: options } = useCollection(optionsRef);

  const handleAnswerChange = (qId: string, update: any) => {
    setAnswers(prev => ({
      ...prev,
      [qId]: { ...prev[qId], ...update }
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, qId: string) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 800000) {
        toast({ variant: "destructive", title: "حجم كبير", description: "يرجى اختيار صورة بحجم أقل من 800 كيلوبايت لضمان سرعة التحميل." });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        handleAnswerChange(qId, { essayFileUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!firestore || !user || !exam || !questions || !courseId) return;
    setIsSubmitting(true);
    
    try {
      // 1. إنشاء محاولة الطالب
      const attemptRef = await addDoc(collection(firestore, 'students', user.uid, 'quiz_attempts'), {
        studentId: user.uid,
        courseContentId: examId,
        courseId: courseId,
        attemptNumber: 1,
        submittedAt: new Date().toISOString(),
        isGraded: false,
        score: 0,
        course_uploadedByAdminUserId: exam.course_uploadedByAdminUserId
      });

      // 2. حفظ الإجابات
      let totalScore = 0;
      let mcqCorrect = 0;

      for (const question of questions) {
        const studentAnswer = answers[question.id] || {};
        let isCorrect = false;
        let scoreAchieved = 0;

        if (question.questionType === 'MCQ') {
          const optsSnap = await getDocs(collection(firestore, 'courses', courseId, 'content', examId as string, 'questions', question.id, 'options'));
          const correctOpt = optsSnap.docs.find(d => d.data().isCorrect);
          if (correctOpt && correctOpt.id === studentAnswer.mcqOptionId) {
            isCorrect = true;
            scoreAchieved = question.points;
            totalScore += scoreAchieved;
            mcqCorrect++;
          }
        }

        await addDoc(collection(firestore, 'students', user.uid, 'quiz_attempts', attemptRef.id, 'answers'), {
          studentQuizAttemptId: attemptRef.id,
          questionId: question.id,
          questionType: question.questionType,
          mcqSelectedOptionId: studentAnswer.mcqOptionId || null,
          essayAnswerText: studentAnswer.essayText || '',
          essayAnswerFileUrl: studentAnswer.essayFileUrl || '',
          isCorrect: question.questionType === 'MCQ' ? isCorrect : false,
          scoreAchieved: question.questionType === 'MCQ' ? scoreAchieved : 0
        });
      }

      // 3. تحديث نتيجة المحاولة إذا كان التصحيح فورياً
      if (exam.allowInstantResultsDisplay) {
        const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);
        const finalScorePercentage = Math.round((totalScore / totalPoints) * 100);
        
        await updateDoc(doc(firestore, 'students', user.uid, 'quiz_attempts', attemptRef.id), {
          score: finalScorePercentage,
          isGraded: questions.every(q => q.questionType === 'MCQ')
        });
      }

      toast({
        title: "تم تسليم الامتحان",
        description: exam.allowInstantResultsDisplay ? "تم رصد درجتك بنجاح." : "تم استلام إجاباتك، وسيتم تصحيحها قريباً."
      });

      router.push('/student/exams');
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "خطأ", description: "فشل تسليم الامتحان." });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isExamLoading || isQsLoading) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>;
  }

  if (!exam || !questions || questions.length === 0) {
    return (
      <div className="container mx-auto p-8 text-center space-y-4">
        <AlertCircle className="w-16 h-16 text-destructive mx-auto" />
        <h1 className="text-2xl font-bold">عذراً، هذا الامتحان غير متوفر أو لا يحتوي على أسئلة.</h1>
        <Button onClick={() => router.back()}>العودة</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-card border-b p-4 shadow-sm">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
              {activeQuestionIndex + 1} / {questions.length}
            </div>
            <div>
              <h1 className="font-bold text-lg">{exam.title}</h1>
              <p className="text-xs text-muted-foreground">بالتوفيق يا بشمهندس!</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-sm font-bold bg-secondary px-4 py-2 rounded-xl">
              <Clock className="w-4 h-4 text-primary" /> مستمر الآن
            </div>
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting}
              className="bg-primary text-primary-foreground font-bold px-8 h-12 rounded-xl shadow-lg shadow-primary/20"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4 ml-2" /> تسليم الامتحان</>}
            </Button>
          </div>
        </div>
      </div>

      <main className="container mx-auto p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Question Card */}
          <Card className="bg-card border-primary/10 shadow-xl animate-in fade-in slide-in-from-bottom-4">
            <CardHeader className="border-b bg-secondary/10">
              <div className="flex justify-between items-center">
                 <span className="text-sm font-bold bg-primary/20 text-primary px-3 py-1 rounded-full">
                   {currentQuestion?.questionType === 'MCQ' ? 'سؤال اختياري' : 'سؤال مقالي'} - {currentQuestion?.points} نقاط
                 </span>
                 <HelpCircle className="w-5 h-5 text-muted-foreground opacity-30" />
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="space-y-6">
                <h2 className="text-2xl font-bold leading-relaxed">{currentQuestion?.questionText}</h2>
                
                {currentQuestion?.questionImageUrl && (
                  <div className="relative w-full aspect-video md:aspect-[21/9] rounded-2xl overflow-hidden border-4 border-secondary/50 shadow-inner">
                    <Image 
                      src={currentQuestion.questionImageUrl} 
                      alt="Question Image" 
                      fill 
                      className="object-contain bg-background"
                      unoptimized 
                    />
                  </div>
                )}
              </div>

              <div className="pt-8 border-t">
                {currentQuestion?.questionType === 'MCQ' ? (
                  <RadioGroup 
                    value={answers[currentQuestion.id]?.mcqOptionId || ''} 
                    onValueChange={(val) => handleAnswerChange(currentQuestion.id, { mcqOptionId: val })}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4"
                  >
                    {options?.map((option) => (
                      <div key={option.id} className={`flex items-center gap-3 p-6 rounded-2xl border-2 transition-all cursor-pointer hover:border-primary/50 ${answers[currentQuestion.id]?.mcqOptionId === option.id ? 'bg-primary/5 border-primary shadow-lg' : 'bg-background border-secondary'}`}>
                        <RadioGroupItem value={option.id} id={option.id} className="w-6 h-6 border-2" />
                        <Label htmlFor={option.id} className="text-lg font-bold flex-grow cursor-pointer">{option.optionText}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                ) : (
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <Label className="text-lg font-bold">اكتب إجابتك هنا:</Label>
                      <Textarea 
                        placeholder="ابدأ بالكتابة..."
                        className="min-h-[200px] text-lg bg-background border-2 focus:border-primary"
                        value={answers[currentQuestion.id]?.essayText || ''}
                        onChange={(e) => handleAnswerChange(currentQuestion.id, { essayText: e.target.value })}
                      />
                    </div>
                    <div className="space-y-3 p-6 bg-primary/5 rounded-2xl border-2 border-dashed border-primary/20">
                      <Label className="text-lg font-bold flex items-center gap-2">
                        <ImageIcon className="w-5 h-5 text-primary" /> أو صور إجابتك من الكراسة وارفعها هنا:
                      </Label>
                      <p className="text-xs text-muted-foreground">إذا قمت بحل السؤال في ورقة خارجية، قم بتصويرها ورفعها مباشرة.</p>
                      
                      <div className="flex items-center gap-4">
                        <Button 
                          variant="outline" 
                          className="h-12 border-dashed border-primary/30 flex-grow gap-2"
                          onClick={() => document.getElementById(`upload-${currentQuestion.id}`)?.click()}
                        >
                          <Upload className="w-4 h-4" /> {answers[currentQuestion.id]?.essayFileUrl ? "تغيير الصورة المرفوعة" : "رفع صورة الحل من جهازك"}
                        </Button>
                        {answers[currentQuestion.id]?.essayFileUrl && (
                          <Button variant="ghost" size="icon" onClick={() => handleAnswerChange(currentQuestion.id, { essayFileUrl: '' })} className="text-destructive h-12 w-12">
                            <X className="w-5 h-5" />
                          </Button>
                        )}
                      </div>
                      
                      <input 
                        id={`upload-${currentQuestion.id}`}
                        type="file" 
                        accept="image/*"
                        className="hidden" 
                        onChange={(e) => handleFileUpload(e, currentQuestion.id)}
                      />

                      {answers[currentQuestion.id]?.essayFileUrl && (
                        <div className="relative w-full h-64 rounded-xl overflow-hidden border-2 border-primary/20 shadow-inner mt-4">
                          <Image src={answers[currentQuestion.id]!.essayFileUrl!} alt="Preview" fill className="object-contain bg-background" unoptimized />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex justify-between items-center">
            <Button 
              variant="outline" 
              size="lg"
              disabled={activeQuestionIndex === 0}
              onClick={() => setActiveQuestionIndex(prev => prev - 1)}
              className="h-14 px-8 rounded-xl border-2 hover:bg-secondary"
            >
              <ChevronRight className="w-5 h-5 ml-2" /> السؤال السابق
            </Button>
            
            <div className="flex gap-2">
              {questions.map((_, i) => (
                <button 
                  key={i}
                  onClick={() => setActiveQuestionIndex(i)}
                  className={`w-3 h-3 rounded-full transition-all ${i === activeQuestionIndex ? 'bg-primary w-8' : 'bg-secondary hover:bg-primary/30'}`}
                />
              ))}
            </div>

            <Button 
              variant="outline" 
              size="lg"
              disabled={activeQuestionIndex === questions.length - 1}
              onClick={() => setActiveQuestionIndex(prev => prev + 1)}
              className="h-14 px-8 rounded-xl border-2 hover:bg-secondary"
            >
              السؤال التالي <ChevronLeft className="w-5 h-5 mr-2" />
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
