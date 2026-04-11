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
  GraduationCap
} from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collectionGroup, query, orderBy, updateDoc, doc, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { analyzeEssayAnswer } from '@/ai/flows/admin-essay-answer-analyzer';
import Image from 'next/image';

export default function AdminGradingPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAttempt, setSelectedAttempt] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // جلب كافة محاولات الطلاب (Collection Group)
  const attemptsRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collectionGroup(firestore, 'quiz_attempts'), orderBy('submittedAt', 'desc'));
  }, [firestore]);

  const { data: attempts, isLoading } = useCollection(attemptsRef);

  const filteredAttempts = attempts?.filter(a => 
    a.studentId.includes(searchTerm) || 
    a.courseContentId.includes(searchTerm)
  );

  const handleGradeAnswer = async (answer: any, isCorrect: boolean, score: number) => {
    if (!firestore || !selectedAttempt) return;
    try {
      const answerRef = doc(firestore, 'students', selectedAttempt.studentId, 'quiz_attempts', selectedAttempt.id, 'answers', answer.id);
      await updateDoc(answerRef, { 
        isCorrect, 
        scoreAchieved: score,
        updatedAt: new Date().toISOString()
      });
      toast({ title: "تم التقييم", description: "تم حفظ درجة السؤال." });
    } catch (e) { console.error(e); }
  };

  const handleAnalyzeAI = async (text: string) => {
    if (!text) return;
    setIsAnalyzing(true);
    try {
      const result = await analyzeEssayAnswer({ essayAnswer: text });
      toast({ title: "تحليل الذكاء الاصطناعي جاهز", description: result.summary });
    } catch (e) { console.error(e); }
    finally { setIsAnalyzing(false); }
  };

  const handleReleaseGrades = async (attempt: any) => {
    if (!firestore) return;
    try {
      const attemptRef = doc(firestore, 'students', attempt.studentId, 'quiz_attempts', attempt.id);
      
      // حساب الإجمالي قبل الاعتماد
      const answersRef = collection(firestore, 'students', attempt.studentId, 'quiz_attempts', attempt.id, 'answers');
      // في نظام حقيقي نستخدم دالة لحساب المجموع، هنا سنعتمد الحالة فقط
      
      await updateDoc(attemptRef, { 
        isGraded: true,
        gradeReleaseDate: new Date().toISOString()
      });
      toast({ title: "تم الاعتماد", description: "النتيجة الآن متاحة للطالب." });
    } catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-4xl font-headline font-bold mb-2">مركز التصحيح والمتابعة</h1>
        <p className="text-muted-foreground">قم بمراجعة إجابات الطلاب المقالية واعتماد النتائج النهائية.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* قائمة المحاولات */}
        <Card className="lg:col-span-1 bg-card border-primary/10">
          <CardHeader className="border-b">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="بحث عن طالب أو امتحان..." 
                className="pr-10 bg-background border-primary/10" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0 max-h-[70vh] overflow-y-auto">
            {isLoading ? (
              <div className="p-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>
            ) : !filteredAttempts || filteredAttempts.length === 0 ? (
              <p className="p-12 text-center text-muted-foreground italic">لا توجد محاولات تسليم حالياً.</p>
            ) : (
              <div className="divide-y">
                {filteredAttempts.map((attempt) => (
                  <button 
                    key={attempt.id}
                    onClick={() => setSelectedAttempt(attempt)}
                    className={`w-full p-6 text-right hover:bg-secondary/10 transition-all flex flex-col gap-2 ${selectedAttempt?.id === attempt.id ? 'bg-primary/5 border-r-4 border-primary' : ''}`}
                  >
                    <div className="flex justify-between items-center">
                      <StudentBrief studentId={attempt.studentId} />
                      <Badge variant={attempt.isGraded ? 'default' : 'secondary'}>
                        {attempt.isGraded ? 'مصحح' : 'قيد المراجعة'}
                      </Badge>
                    </div>
                    <p className="font-bold text-lg mt-2">امتحان ID: {attempt.courseContentId}</p>
                    <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full inline-block w-fit">
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
            <Card className="h-full flex flex-col items-center justify-center text-muted-foreground p-12 border-dashed border-2">
              <FileText className="w-16 h-16 mb-4 opacity-10" />
              <p className="font-bold">اختر محاولة طالب من القائمة لبدء التصحيح والمراجعة.</p>
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
    <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] text-primary">
        {student?.name?.[0] || 'S'}
      </div>
      <span className="truncate max-w-[120px]">{student?.name || studentId}</span>
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
    <Card className="bg-card border-primary/10 shadow-xl animate-in zoom-in-95">
      <CardHeader className="border-b bg-secondary/5 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-xl font-bold">مراجعة إجابات الطالب</CardTitle>
          <p className="text-xs text-muted-foreground">المحاولة رقم {attempt.attemptNumber} - تم التسليم في {new Date(attempt.submittedAt).toLocaleDateString('ar-EG')}</p>
        </div>
        <Button 
          onClick={() => onRelease(attempt)} 
          disabled={attempt.isGraded} 
          className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold gap-2 shadow-lg shadow-accent/20"
        >
          <CheckCircle className="w-4 h-4" /> اعتماد النتيجة النهائية
        </Button>
      </CardHeader>
      <CardContent className="p-6 space-y-8">
        {isLoading ? (
          <div className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>
        ) : (
          <div className="space-y-6">
            {answers?.map((answer, i) => (
              <Card key={answer.id} className="bg-background border-primary/10 overflow-hidden shadow-sm">
                <div className="p-4 bg-secondary/10 border-b flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">{i+1}</span>
                    <span className="font-bold text-sm">نوع السؤال: {answer.questionType === 'MCQ' ? 'اختياري' : 'مقالي'}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant={answer.isCorrect ? 'default' : 'outline'} 
                      onClick={() => onGrade(answer, true, 1)}
                      className={`h-9 px-4 gap-2 font-bold ${answer.isCorrect ? 'bg-accent text-white' : ''}`}
                    >
                      <CheckCircle2 className="w-4 h-4" /> صحيح
                    </Button>
                    <Button 
                      size="sm" 
                      variant={answer.isCorrect === false ? 'destructive' : 'outline'} 
                      onClick={() => onGrade(answer, false, 0)}
                      className="h-9 px-4 gap-2 font-bold"
                    >
                      <XCircle className="w-4 h-4" /> خطأ
                    </Button>
                  </div>
                </div>
                <CardContent className="p-6 space-y-6">
                  {answer.questionType === 'MCQ' ? (
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-bold text-muted-foreground">الخيار الذي اختاره الطالب:</p>
                      <Badge variant="outline" className="text-lg py-1 px-4 border-primary/50 text-primary">{answer.mcqSelectedOptionId}</Badge>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {answer.essayAnswerText && (
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <Label className="text-xs text-primary font-bold">إجابة الطالب النصية:</Label>
                            <Button 
                              variant="ghost" 
                              className="h-8 text-xs gap-2 text-accent" 
                              onClick={() => onAnalyzeAI(answer.essayAnswerText)}
                              disabled={isAnalyzing}
                            >
                              {isAnalyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <BrainCircuit className="w-3 h-3" />}
                              تحليل ذكي للإجابة
                            </Button>
                          </div>
                          <div className="p-4 bg-secondary/10 rounded-xl border border-dashed border-primary/20">
                            <p className="text-lg leading-relaxed whitespace-pre-wrap">{answer.essayAnswerText}</p>
                          </div>
                        </div>
                      )}
                      
                      {answer.essayAnswerFileUrl && (
                        <div className="space-y-3">
                          <Label className="text-xs text-accent font-bold flex items-center gap-2">
                            <FileText className="w-3 h-3" /> صورة الحل المرفوعة (مقالي):
                          </Label>
                          <div className="relative w-full h-[400px] bg-secondary/5 rounded-2xl border-2 border-dashed border-accent/30 overflow-hidden group">
                            <Image 
                              src={answer.essayAnswerFileUrl} 
                              alt="Student Answer Image" 
                              fill 
                              className="object-contain" 
                              unoptimized 
                            />
                            <a 
                              href={answer.essayAnswerFileUrl} 
                              target="_blank" 
                              className="absolute top-4 left-4 bg-black/70 text-white p-3 rounded-xl hover:bg-black transition-colors flex items-center gap-2"
                            >
                              <ExternalLink className="w-4 h-4" /> فتح الصورة كاملة
                            </a>
                          </div>
                        </div>
                      )}
                      
                      {!answer.essayAnswerText && !answer.essayAnswerFileUrl && (
                        <p className="text-sm italic text-destructive font-bold">لم يقم الطالب بكتابة أو رفع أي إجابة لهذا السؤال.</p>
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