
"use client";

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  Search,
  CheckCircle,
  ClipboardList,
  Trash2,
  Clock,
  RefreshCw,
  User as UserIcon,
  HelpCircle
} from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collectionGroup, updateDoc, doc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export default function AdminGradingPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAttempt, setSelectedAttempt] = useState<any>(null);

  const studentsRef = useMemoFirebase(() => (firestore ? collection(firestore, 'students') : null), [firestore]);
  const { data: allStudents } = useCollection(studentsRef);

  const attemptsRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collectionGroup(firestore, 'quiz_attempts');
  }, [firestore, user]);
  
  const { data: rawAttempts, isLoading } = useCollection(attemptsRef);

  const studentMap = useMemo(() => {
    const map: Record<string, any> = {};
    allStudents?.forEach(s => { map[s.id] = s; });
    return map;
  }, [allStudents]);

  const filteredAttempts = useMemo(() => {
    if (!rawAttempts) return [];
    
    return rawAttempts
      .filter(a => {
        const studentInfo = studentMap[a.studentId] || {};
        const studentName = (studentInfo.name || a.studentName || 'طالب مجهول').toLowerCase();
        const searchLower = searchTerm.toLowerCase();
        return studentName.includes(searchLower) || a.studentId.toLowerCase().includes(searchLower);
      })
      .sort((a, b) => {
        const dateA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
        const dateB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
        return dateB - dateA;
      });
  }, [rawAttempts, searchTerm, studentMap]);

  const handleDeleteAttempt = async (attempt: any) => {
    if (!firestore) return;
    if (!confirm("🚨 هل أنت متأكد من حذف هذه المحاولة؟")) return;
    try {
      await deleteDoc(doc(firestore, 'students', attempt.studentId, 'quiz_attempts', attempt.id));
      toast({ title: "تم الحذف" });
      if (selectedAttempt?.id === attempt.id) setSelectedAttempt(null);
    } catch (e) { console.error(e); }
  };

  const handleGradeAnswer = async (answer: any, isCorrect: boolean, score: number) => {
    if (!firestore || !selectedAttempt) return;
    try {
      const answerRef = doc(firestore, 'students', selectedAttempt.studentId, 'quiz_attempts', selectedAttempt.id, 'answers', answer.id);
      await updateDoc(answerRef, { isCorrect, scoreAchieved: score });
      toast({ title: "تم التحديث" });
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
        totalPoints: totalMaxPoints
      });

      toast({ title: "تم الاعتماد", description: `الدرجة: ${finalPercentage}%` });
      setSelectedAttempt({ ...attempt, isGraded: true, score: finalPercentage });
    } catch (e) { console.error(e); }
  };

  if (isUserLoading) return <div className="flex justify-center py-20"><Loader2 className="w-10 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 text-right">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-headline font-bold mb-2">مركز التصحيح والاعتماد</h1>
          <p className="text-muted-foreground font-bold">البحث متاح بالاسم الرباعي الحقيقي للطالب.</p>
        </div>
        <div className="bg-primary/10 text-primary px-4 py-2 rounded-xl border border-primary/20 flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin-slow" />
          <span className="text-xs font-black">حيّ: {filteredAttempts.length} محاولة</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-1 bg-card border-primary/10 shadow-xl overflow-hidden rounded-3xl">
          <CardHeader className="border-b bg-secondary/5 p-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input 
                placeholder="ابحث بالاسم الرباعي..." 
                className="w-full bg-background border-primary/10 rounded-xl h-12 pr-10 text-right text-xs font-bold" 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
              />
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-y-auto max-h-[70vh]">
             {isLoading ? <Loader2 className="w-8 h-8 animate-spin mx-auto my-10 text-primary" /> : (
               <div className="divide-y divide-primary/5">
                 {filteredAttempts.map((attempt) => (
                   <button 
                     key={attempt.id}
                     onClick={() => setSelectedAttempt(attempt)}
                     className={`w-full p-4 text-right hover:bg-primary/5 transition-all flex flex-col gap-1 ${selectedAttempt?.id === attempt.id ? 'bg-primary/10 border-r-4 border-primary' : ''}`}
                   >
                     <div className="flex justify-between items-center">
                        <span className="text-xs font-black text-foreground">{studentMap[attempt.studentId]?.name || attempt.studentName || 'جاري التحميل...'}</span>
                        <Badge className="text-[9px]" variant={attempt.isGraded ? 'default' : 'secondary'}>{attempt.isGraded ? 'مكتمل' : 'مراجعة'}</Badge>
                     </div>
                     <ExamNameByDoc courseId={attempt.courseId} contentId={attempt.courseContentId} />
                   </button>
                 ))}
               </div>
             )}
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          {selectedAttempt ? (
            <AttemptDetails attempt={selectedAttempt} onGrade={handleGradeAnswer} onRelease={handleReleaseGrades} onDelete={handleDeleteAttempt} />
          ) : (
            <Card className="h-[50vh] flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-3xl">
              <ClipboardList className="w-12 h-12 mb-4 opacity-10" />
              <p className="text-sm font-bold">اختر محاولة لمراجعتها.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function ExamNameByDoc({ courseId, contentId }: { courseId: string, contentId: string }) {
  const firestore = useFirestore();
  const examRef = useMemoFirebase(() => (firestore && courseId && contentId) ? doc(firestore, 'courses', courseId, 'content', contentId) : null, [firestore, courseId, contentId]);
  const { data: exam } = useDoc(examRef);
  return <p className="text-[10px] text-primary font-bold truncate">{exam?.title || 'جاري تحميل الامتحان...'}</p>;
}

function AttemptDetails({ attempt, onGrade, onRelease, onDelete }: any) {
  const firestore = useFirestore();
  const answersRef = useMemoFirebase(() => {
    if (!firestore || !attempt?.studentId || !attempt?.id) return null;
    return collection(firestore, 'students', attempt.studentId, 'quiz_attempts', attempt.id, 'answers');
  }, [firestore, attempt]);
  const { data: answers, isLoading } = useCollection(answersRef);

  return (
    <Card className="bg-card border-primary/20 shadow-2xl rounded-3xl overflow-hidden flex flex-col">
      <CardHeader className="border-b bg-secondary/5 flex flex-row items-center justify-between p-6">
        <div className="text-right">
           <CardTitle className="text-xl font-black text-primary">{attempt.score}%</CardTitle>
           <p className="text-[10px] font-bold text-muted-foreground">النقاط: {attempt.pointsAchieved || 0} من {attempt.totalPoints || 0}</p>
        </div>
        <div className="flex gap-2">
           <Button variant="ghost" size="icon" className="text-destructive" onClick={() => onDelete(attempt)}><Trash2 className="w-4 h-4" /></Button>
           <Button onClick={() => onRelease(attempt)} className="bg-accent font-black h-10 px-6 rounded-xl">اعتماد الدرجة</Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-6 space-y-4">
        {isLoading ? <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /> : 
          answers?.map((ans, i) => (
            <div key={ans.id} className="p-5 bg-secondary/10 rounded-2xl border border-white/5 text-right space-y-3">
               <div className="flex justify-between items-center">
                  <Badge variant="outline" className="text-[10px]">سؤال {i+1}</Badge>
                  <div className="flex gap-1">
                     <Button size="sm" variant={ans.isCorrect ? 'default' : 'outline'} onClick={() => handleGradeAnswer(ans, true, ans.maxPoints ?? 10)}>صحيح</Button>
                     <Button size="sm" variant={ans.isCorrect === false ? 'destructive' : 'outline'} onClick={() => handleGradeAnswer(ans, false, 0)}>خطأ</Button>
                  </div>
               </div>
               <div className="p-4 bg-background rounded-xl text-sm font-bold">
                  {ans.questionType === 'MCQ' ? `الخيار المختار: ${ans.mcqSelectedOptionId}` : ans.essayAnswerText || 'لا توجد إجابة'}
               </div>
            </div>
          ))
        }
      </CardContent>
    </Card>
  );
}
