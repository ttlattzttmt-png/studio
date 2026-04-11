"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  BrainCircuit
} from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
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
  // تم تبسيط الاستعلام لتجنب الحاجة لفهارس مركبة معقدة حالياً
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
      await updateDoc(answerRef, { isCorrect, scoreAchieved: score });
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
      await updateDoc(attemptRef, { isGraded: true });
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
        <Card className="lg:col-span-1 bg-card">
          <CardHeader className="border-b">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="بحث عن طالب أو امتحان..." 
                className="pr-10 bg-background" 
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
                    className={`w-full p-6 text-right hover:bg-secondary/10 transition-colors flex flex-col gap-2 ${selectedAttempt?.id === attempt.id ? 'bg-primary/5 border-r-4 border-primary' : ''}`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-muted-foreground flex items-center gap-1"><User className="w-3 h-3"/> {attempt.studentId}</span>
                      <Badge variant={attempt.isGraded ? 'default' : 'secondary'}>{attempt.isGraded ? 'مصحح' : 'قيد المراجعة'}</Badge>
                    </div>
                    <p className="font-bold">امتحان: {attempt.courseContentId}</p>
                    <span className="text-[10px] text-muted-foreground">{new Date(attempt.submittedAt).toLocaleString('ar-EG')}</span>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* تفاصيل الإجابات */}
        <div className="lg:col-span-2">
          {selectedAttempt ? (
            <AttemptDetails attempt={selectedAttempt} onAnalyzeAI={handleAnalyzeAI} onGrade={handleGradeAnswer} onRelease={handleReleaseGrades} isAnalyzing={isAnalyzing} />
          ) : (
            <Card className="h-full flex flex-col items-center justify-center text-muted-foreground p-12 border-dashed">
              <FileText className="w-16 h-16 mb-4 opacity-10" />
              <p>اختر محاولة طالب من القائمة لبدء التصحيح.</p>
            </Card>
          )}
        </div>
      </div>
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
    <Card className="bg-card">
      <CardHeader className="border-b flex flex-row items-center justify-between">
        <CardTitle className="text-xl font-bold">مراجعة إجابات الطالب</CardTitle>
        <Button onClick={() => onRelease(attempt)} disabled={attempt.isGraded} className="bg-accent hover:bg-accent/90 font-bold gap-2">
          <CheckCircle className="w-4 h-4" /> اعتماد النتيجة النهائية
        </Button>
      </CardHeader>
      <CardContent className="p-6 space-y-8">
        {isLoading ? (
          <div className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>
        ) : (
          <div className="space-y-6">
            {answers?.map((answer, i) => (
              <Card key={answer.id} className="bg-secondary/5 border-primary/10 overflow-hidden">
                <div className="p-4 bg-secondary/10 border-b flex justify-between items-center">
                  <span className="font-bold">سؤال {i+1} ({answer.questionType === 'MCQ' ? 'اختياري' : 'مقالي'})</span>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant={answer.isCorrect ? 'default' : 'outline'} 
                      onClick={() => onGrade(answer, true, 1)}
                      className="h-8 gap-1"
                    >
                      <CheckCircle2 className="w-3 h-3" /> صحيح
                    </Button>
                    <Button 
                      size="sm" 
                      variant={answer.isCorrect === false ? 'destructive' : 'outline'} 
                      onClick={() => onGrade(answer, false, 0)}
                      className="h-8 gap-1"
                    >
                      <XCircle className="w-3 h-3" /> خطأ
                    </Button>
                  </div>
                </div>
                <CardContent className="p-6 space-y-4">
                  {answer.questionType === 'MCQ' ? (
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold">الخيار المختار:</p>
                      <Badge variant="outline">{answer.mcqSelectedOptionId}</Badge>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {answer.essayAnswerText && (
                        <div className="p-4 bg-background rounded-xl border">
                          <div className="flex justify-between items-start mb-2">
                            <Label className="text-xs text-primary font-bold">إجابة الطالب النصية:</Label>
                            <Button variant="ghost" className="h-6 text-[10px] gap-1" onClick={() => onAnalyzeAI(answer.essayAnswerText)}>
                              <BrainCircuit className="w-3 h-3" /> تحليل ذكي
                            </Button>
                          </div>
                          <p className="text-lg leading-relaxed">{answer.essayAnswerText}</p>
                        </div>
                      )}
                      {answer.essayAnswerFileUrl && (
                        <div className="space-y-2">
                          <Label className="text-xs text-accent font-bold">الصورة المرفوعة من الطالب:</Label>
                          <div className="relative w-full h-64 bg-background rounded-xl border overflow-hidden">
                            <Image src={answer.essayAnswerFileUrl} alt="Student Upload" fill className="object-contain" unoptimized />
                            <a href={answer.essayAnswerFileUrl} target="_blank" className="absolute top-2 left-2 bg-black/50 text-white p-2 rounded-full hover:bg-black">
                              <ExternalLink className="w-4 h-4" />
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