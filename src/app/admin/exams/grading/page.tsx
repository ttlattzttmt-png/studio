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
  FileText, 
  ExternalLink,
  Search,
  CheckCircle,
  BrainCircuit,
  GraduationCap,
  ClipboardList,
  AlertCircle,
  Trash2
} from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, useDoc, useUser } from '@/firebase';
import { collectionGroup, query, updateDoc, doc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { analyzeEssayAnswer } from '@/ai/flows/admin-essay-answer-analyzer';
import Image from 'next/image';

export default function AdminGradingPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAttempt, setSelectedAttempt] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const attemptsRef = useMemoFirebase(() => collectionGroup(firestore, 'quiz_attempts'), [firestore]);
  const { data: attempts, isLoading } = useCollection(attemptsRef);

  const filteredAttempts = attempts?.filter(a => 
    a.studentId.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.courseContentId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeleteAttempt = async (attempt: any) => {
    if (!firestore) return;
    if (!confirm("هل أنت متأكد من حذف هذه المحاولة نهائياً؟")) return;
    try {
      await deleteDoc(doc(firestore, 'students', attempt.studentId, 'quiz_attempts', attempt.id));
      toast({ title: "تم الحذف" });
      setSelectedAttempt(null);
    } catch (e) { console.error(e); }
  };

  const handleGradeAnswer = async (answer: any, isCorrect: boolean, score: number) => {
    if (!firestore || !selectedAttempt) return;
    try {
      const answerRef = doc(firestore, 'students', selectedAttempt.studentId, 'quiz_attempts', selectedAttempt.id, 'answers', answer.id);
      await updateDoc(answerRef, { isCorrect, scoreAchieved: score });
      toast({ title: "تم التقييم" });
    } catch (e) { console.error(e); }
  };

  const handleReleaseGrades = async (attempt: any) => {
    if (!firestore) return;
    try {
      const answersRef = collection(firestore, 'students', attempt.studentId, 'quiz_attempts', attempt.id, 'answers');
      const answersSnap = await getDocs(answersRef);
      
      let totalScoreAchieved = 0;
      let totalMaxPoints = 0;

      answersSnap.forEach(doc => {
        const data = doc.data();
        totalScoreAchieved += (data.scoreAchieved || 0);
        totalMaxPoints += (data.maxPoints || 0);
      });

      const finalPercentage = totalMaxPoints > 0 ? Math.round((totalScoreAchieved / totalMaxPoints) * 100) : 0;

      await updateDoc(doc(firestore, 'students', attempt.studentId, 'quiz_attempts', attempt.id), { 
        isGraded: true,
        score: finalPercentage,
        pointsAchieved: totalScoreAchieved,
        totalPoints: totalMaxPoints,
        gradeReleaseDate: new Date().toISOString()
      });

      toast({ title: "تم الاعتماد", description: `النتيجة (${finalPercentage}%) أصبحت متاحة للطالب.` });
      setSelectedAttempt({...attempt, isGraded: true, score: finalPercentage});
    } catch (e) { console.error(e); }
  };

  if (isUserLoading) return <div className="flex justify-center py-20"><Loader2 className="w-10 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-4xl font-headline font-bold mb-2">مركز التصحيح</h1>
        <p className="text-muted-foreground">راجع إجابات الطلاب واعتمد الدرجات النهائية لحظياً.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-1 bg-card border-primary/10">
          <CardHeader className="border-b">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="بحث عن طالب..." className="pr-10 bg-background text-right" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </CardHeader>
          <CardContent className="p-0 max-h-[70vh] overflow-y-auto">
             {isLoading ? <Loader2 className="w-8 h-8 animate-spin mx-auto my-10" /> : (
               <div className="divide-y">
                 {filteredAttempts?.map((attempt) => (
                   <button 
                     key={attempt.id}
                     onClick={() => setSelectedAttempt(attempt)}
                     className={`w-full p-4 text-right hover:bg-primary/5 transition-all flex flex-col gap-2 ${selectedAttempt?.id === attempt.id ? 'bg-primary/10 border-r-4 border-primary' : ''}`}
                   >
                     <div className="flex justify-between items-center">
                        <StudentBrief studentId={attempt.studentId} />
                        <Badge variant={attempt.isGraded ? 'default' : 'secondary'}>{attempt.isGraded ? 'مصحح' : 'جديد'}</Badge>
                     </div>
                     <ExamName courseId={attempt.courseId} contentId={attempt.courseContentId} />
                   </button>
                 ))}
               </div>
             )}
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          {selectedAttempt ? (
            <AttemptDetails 
              attempt={selectedAttempt} 
              onGrade={handleGradeAnswer} 
              onRelease={handleReleaseGrades} 
              onDelete={handleDeleteAttempt}
            />
          ) : (
            <div className="h-[60vh] flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-3xl">
              <AlertCircle className="w-12 h-12 mb-4 opacity-20" />
              <p>اختر محاولة طالب للبدء في مراجعتها.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ExamName({ courseId, contentId }: { courseId: string, contentId: string }) {
  const firestore = useFirestore();
  const examRef = useMemoFirebase(() => doc(firestore, 'courses', courseId, 'content', contentId), [firestore, courseId, contentId]);
  const { data: exam } = useDoc(examRef);
  return <p className="font-bold text-sm text-primary truncate">{exam?.title || 'جاري تحميل الاسم...'}</p>;
}

function StudentBrief({ studentId }: { studentId: string }) {
  const firestore = useFirestore();
  const studentRef = useMemoFirebase(() => doc(firestore, 'students', studentId), [firestore, studentId]);
  const { data: student } = useDoc(studentRef);
  return <span className="text-[10px] font-bold text-muted-foreground">{student?.name || 'طالب المنصة'}</span>;
}

function AttemptDetails({ attempt, onGrade, onRelease, onDelete }: any) {
  const firestore = useFirestore();
  const answersRef = useMemoFirebase(() => query(collection(firestore, 'students', attempt.studentId, 'quiz_attempts', attempt.id, 'answers')), [firestore, attempt]);
  const { data: answers, isLoading } = useCollection(answersRef);

  return (
    <Card className="bg-card border-primary/20 shadow-2xl animate-in zoom-in-95">
      <CardHeader className="border-b bg-secondary/5 flex flex-row items-center justify-between p-6">
        <div>
           <CardTitle className="text-xl font-bold">مراجعة الإجابات</CardTitle>
           <p className="text-xs text-muted-foreground">المجموع الحالي: {attempt.pointsAchieved || 0} من {attempt.totalPoints || 0}</p>
        </div>
        <div className="flex gap-2">
           <Button variant="ghost" size="icon" className="text-destructive" onClick={() => onDelete(attempt)}><Trash2 className="w-5 h-5" /></Button>
           <Button onClick={() => onRelease(attempt)} className="bg-accent hover:bg-accent/90 text-white font-bold h-10 px-6 gap-2">
              <CheckCircle className="w-4 h-4" /> اعتماد النتيجة
           </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6 max-h-[65vh] overflow-y-auto">
        {isLoading ? <Loader2 className="w-10 h-10 animate-spin mx-auto" /> : answers?.map((ans, i) => (
          <div key={ans.id} className="p-4 bg-secondary/20 rounded-2xl border text-right space-y-3">
             <div className="flex justify-between items-center mb-2">
                <Badge variant="outline" className="text-[10px]">سؤال {i+1} ({ans.questionType})</Badge>
                <div className="flex gap-1">
                   <Button size="sm" variant={ans.isCorrect ? 'default' : 'outline'} onClick={() => onGrade(ans, true, ans.maxPoints)} className={ans.isCorrect ? 'bg-accent' : ''}>صحيح</Button>
                   <Button size="sm" variant={ans.isCorrect === false ? 'destructive' : 'outline'} onClick={() => onGrade(ans, false, 0)}>خطأ</Button>
                </div>
             </div>
             {ans.essayAnswerText && <p className="p-3 bg-background rounded-xl text-sm whitespace-pre-wrap">{ans.essayAnswerText}</p>}
             {ans.essayAnswerFileUrl && (
               <div className="relative w-full h-64 rounded-xl overflow-hidden bg-black/5">
                 <img src={ans.essayAnswerFileUrl} alt="Student answer" className="w-full h-full object-contain" />
                 <a href={ans.essayAnswerFileUrl} target="_blank" className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-[10px]">عرض كبير</a>
               </div>
             )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}