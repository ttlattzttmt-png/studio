
"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  User, 
  FileText, 
  ExternalLink,
  Search,
  CheckCircle,
  BrainCircuit,
  GraduationCap,
  ClipboardList,
  AlertCircle
} from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, useDoc, useUser } from '@/firebase';
import { collectionGroup, query, updateDoc, doc, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { analyzeEssayAnswer } from '@/ai/flows/admin-essay-answer-analyzer';
import Image from 'next/image';

export default function AdminGradingPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAttempt, setSelectedAttempt] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // جلب كافة محاولات الطلاب لحظياً باستخدام Collection Group - مع اشتراط وجود المستخدم
  const attemptsRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collectionGroup(firestore, 'quiz_attempts');
  }, [firestore, user]);

  const { data: attempts, isLoading } = useCollection(attemptsRef);

  const filteredAttempts = attempts?.filter(a => 
    a.studentId.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.courseContentId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleGradeAnswer = async (answer: any, isCorrect: boolean, score: number) => {
    if (!firestore || !selectedAttempt) return;
    try {
      const answerRef = doc(firestore, 'students', selectedAttempt.studentId, 'quiz_attempts', selectedAttempt.id, 'answers', answer.id);
      await updateDoc(answerRef, { 
        isCorrect, 
        scoreAchieved: score
      });
      toast({ title: "تم التقييم", description: "تم حفظ درجة السؤال بنجاح." });
    } catch (e) { 
      console.error(e); 
      toast({ variant: "destructive", title: "خطأ", description: "فشل حفظ درجة السؤال." });
    }
  };

  const handleAnalyzeAI = async (text: string) => {
    if (!text) return;
    setIsAnalyzing(true);
    try {
      const result = await analyzeEssayAnswer({ essayAnswer: text });
      toast({ title: "تحليل الذكاء الاصطناعي", description: result.summary });
    } catch (e) { 
      console.error(e); 
      toast({ variant: "destructive", title: "خطأ", description: "فشل تحليل الذكاء الاصطناعي." });
    } finally { 
      setIsAnalyzing(false); 
    }
  };

  const handleReleaseGrades = async (attempt: any) => {
    if (!firestore) return;
    try {
      const attemptRef = doc(firestore, 'students', attempt.studentId, 'quiz_attempts', attempt.id);
      await updateDoc(attemptRef, { 
        isGraded: true,
        gradeReleaseDate: new Date().toISOString()
      });
      toast({ title: "تم الاعتماد", description: "النتيجة أصبحت متاحة للطالب الآن." });
    } catch (e) { 
      console.error(e); 
      toast({ variant: "destructive", title: "خطأ", description: "فشل اعتماد النتيجة." });
    }
  };

  if (!user) return <div className="p-20 text-center text-muted-foreground">جاري التحقق من الصلاحيات...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-4xl font-headline font-bold mb-2">مركز التصحيح والمتابعة</h1>
        <p className="text-muted-foreground">راجع إجابات الطلاب المقالية واعتمد النتائج النهائية لحظة بلحظة.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* قائمة المحاولات */}
        <Card className="lg:col-span-1 bg-card border-primary/10 h-fit">
          <CardHeader className="border-b">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="بحث عن طالب..." 
                className="pr-10 bg-background border-primary/10 text-right" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0 max-h-[70vh] overflow-y-auto">
            {isLoading ? (
              <div className="p-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>
            ) : !filteredAttempts || filteredAttempts.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground italic">
                <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-10" />
                لا توجد محاولات تسليم حالياً.
              </div>
            ) : (
              <div className="divide-y">
                {filteredAttempts.map((attempt) => (
                  <button 
                    key={attempt.id}
                    onClick={() => setSelectedAttempt(attempt)}
                    className={`w-full p-6 text-right hover:bg-primary/5 transition-all flex flex-col gap-2 ${selectedAttempt?.id === attempt.id ? 'bg-primary/10 border-r-4 border-primary' : ''}`}
                  >
                    <div className="flex justify-between items-center">
                      <StudentBrief studentId={attempt.studentId} />
                      <Badge variant={attempt.isGraded ? 'default' : 'secondary'}>
                        {attempt.isGraded ? 'مصحح' : 'قيد المراجعة'}
                      </Badge>
                    </div>
                    <p className="font-bold truncate">امتحان: {attempt.courseContentId}</p>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(attempt.submittedAt).toLocaleString('ar-EG')}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* تفاصيل الإجابات */}
        <div className="lg:col-span-2">
          {selectedAttempt ? (
            <AttemptDetails 
              attempt={selectedAttempt} 
              onAnalyzeAI={handleAnalyzeAI} 
              onGrade={handleGradeAnswer} 
              onRelease={handleReleaseGrades} 
              isAnalyzing={isAnalyzing} 
            />
          ) : (
            <Card className="h-[60vh] flex flex-col items-center justify-center text-muted-foreground p-12 border-dashed border-2">
              <FileText className="w-20 h-20 mb-4 opacity-10" />
              <p className="font-bold text-xl">اختر محاولة طالب من القائمة لبدء التصحيح.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function StudentBrief({ studentId }: { studentId: string }) {
  const firestore = useFirestore();
  const studentRef = useMemoFirebase(() => firestore ? doc(firestore, 'students', studentId) : null, [firestore, studentId]);
  const { data: student } = useDoc(studentRef);

  return (
    <div className="flex items-center gap-2 text-xs font-bold text-primary">
      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-[10px]">
        {student?.name?.[0] || 'S'}
      </div>
      <span className="truncate">{student?.name || studentId}</span>
    </div>
  );
}

function AttemptDetails({ attempt, onAnalyzeAI, onGrade, onRelease, isAnalyzing }: any) {
  const firestore = useFirestore();
  const answersRef = useMemoFirebase(() => {
    if (!firestore || !attempt) return null;
    return query(collection(firestore, 'students', attempt.studentId, 'quiz_attempts', attempt.id, 'answers'));
  }, [firestore, attempt]);

  const { data: answers, isLoading } = useCollection(answersRef);

  return (
    <Card className="bg-card border-primary/10 shadow-2xl animate-in zoom-in-95">
      <CardHeader className="border-b bg-secondary/5 flex flex-row items-center justify-between p-6">
        <div>
          <CardTitle className="text-2xl font-bold text-primary">مراجعة إجابات الطالب</CardTitle>
          <p className="text-xs text-muted-foreground">معرف المحاولة: {attempt.id}</p>
        </div>
        <Button 
          onClick={() => onRelease(attempt)} 
          disabled={attempt.isGraded} 
          className="bg-accent hover:bg-accent/90 text-white font-bold h-12 px-6 gap-2"
        >
          <CheckCircle className="w-5 h-5" /> اعتماد النتيجة
        </Button>
      </CardHeader>
      <CardContent className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
        {isLoading ? (
          <div className="py-20 text-center"><Loader2 className="w-10 h-10 animate-spin mx-auto text-primary" /></div>
        ) : (
          <div className="space-y-6">
            {answers?.map((answer, i) => (
              <Card key={answer.id} className="bg-background border-primary/5 overflow-hidden">
                <div className="p-4 bg-secondary/10 border-b flex justify-between items-center">
                  <Badge variant="outline" className="border-primary/30 text-primary">
                    سؤال {i+1} - {answer.questionType === 'MCQ' ? 'اختياري' : 'مقالي'}
                  </Badge>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant={answer.isCorrect ? 'default' : 'outline'} 
                      onClick={() => onGrade(answer, true, 1)}
                      className={answer.isCorrect ? 'bg-accent text-white' : ''}
                    >
                      <CheckCircle2 className="w-4 h-4 ml-1" /> صحيح
                    </Button>
                    <Button 
                      size="sm" 
                      variant={answer.isCorrect === false ? 'destructive' : 'outline'} 
                      onClick={() => onGrade(answer, false, 0)}
                    >
                      <XCircle className="w-4 h-4 ml-1" /> خطأ
                    </Button>
                  </div>
                </div>
                <CardContent className="p-6 space-y-4 text-right">
                  {answer.questionType === 'MCQ' ? (
                    <p className="text-lg font-bold">خيار الطالب: <span className="text-primary">{answer.mcqSelectedOptionId}</span></p>
                  ) : (
                    <div className="space-y-4">
                      {answer.essayAnswerText && (
                        <div className="space-y-2">
                          <div className="flex justify-between items-center mb-1">
                            <Label className="text-sm font-bold">إجابة الطالب النصية:</Label>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-8 text-[10px] gap-1 text-accent" 
                              onClick={() => onAnalyzeAI(answer.essayAnswerText)}
                              disabled={isAnalyzing}
                            >
                              {isAnalyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <BrainCircuit className="w-3 h-3" />}
                              تحليل ذكي
                            </Button>
                          </div>
                          <p className="p-4 bg-secondary/20 rounded-xl whitespace-pre-wrap">{answer.essayAnswerText}</p>
                        </div>
                      )}
                      
                      {answer.essayAnswerFileUrl && (
                        <div className="space-y-2">
                          <Label className="text-sm font-bold flex items-center gap-2">
                            <FileText className="w-4 h-4" /> صورة الحل المرفوعة:
                          </Label>
                          <div className="relative w-full h-[400px] bg-black/5 rounded-xl border border-dashed overflow-hidden group">
                            <Image 
                              src={answer.essayAnswerFileUrl} 
                              alt="Student solution" 
                              fill 
                              className="object-contain" 
                              unoptimized 
                            />
                            <a 
                              href={answer.essayAnswerFileUrl} 
                              target="_blank" 
                              className="absolute bottom-2 left-2 bg-black/50 text-white px-3 py-1 rounded-lg text-xs hover:bg-black"
                            >
                              <ExternalLink className="w-3 h-3 inline ml-1" /> فتح في نافذة جديدة
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
