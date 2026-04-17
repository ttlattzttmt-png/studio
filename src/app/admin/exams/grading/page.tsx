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

  // جلب كافة الطلاب لبناء خارطة الأسماء الحقيقية
  const studentsRef = useMemoFirebase(() => (firestore ? collection(firestore, 'students') : null), [firestore]);
  const { data: allStudents } = useCollection(studentsRef);

  // جلب كافة المحاولات بتزامن لحظي
  const attemptsRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collectionGroup(firestore, 'quiz_attempts');
  }, [firestore, user]);
  
  const { data: rawAttempts, isLoading } = useCollection(attemptsRef);

  // إنشاء خارطة أسماء الطلاب (Student ID -> Full Info)
  const studentMap = useMemo(() => {
    const map: Record<string, any> = {};
    allStudents?.forEach(s => { map[s.id] = s; });
    return map;
  }, [allStudents]);

  // البحث والفلترة البرمجية بالاسم الرباعي الحقيقي
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
    if (!confirm("🚨 تحذير: هل أنت متأكد من حذف هذه المحاولة نهائياً؟")) return;
    try {
      await deleteDoc(doc(firestore, 'students', attempt.studentId, 'quiz_attempts', attempt.id));
      toast({ title: "تم الحذف بنجاح" });
      if (selectedAttempt?.id === attempt.id) setSelectedAttempt(null);
    } catch (e) { 
      console.error(e);
      toast({ variant: "destructive", title: "فشل الحذف" });
    }
  };

  const handleGradeAnswer = async (answer: any, isCorrect: boolean, score: number) => {
    if (!firestore || !selectedAttempt) return;
    try {
      const answerRef = doc(firestore, 'students', selectedAttempt.studentId, 'quiz_attempts', selectedAttempt.id, 'answers', answer.id);
      await updateDoc(answerRef, { isCorrect, scoreAchieved: score });
      toast({ title: "تم تحديث درجة السؤال" });
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

      toast({ title: "تم الاعتماد بنجاح", description: `النتيجة النهائية: ${totalScoreAchieved}/${totalMaxPoints} (${finalPercentage}%)` });
      setSelectedAttempt({ ...attempt, isGraded: true, score: finalPercentage, pointsAchieved: totalScoreAchieved, totalPoints: totalMaxPoints });
    } catch (e) { 
      console.error(e);
      toast({ variant: "destructive", title: "خطأ في الاعتماد" });
    }
  };

  if (isUserLoading) return <div className="flex justify-center py-20"><Loader2 className="w-10 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 text-right">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-headline font-bold mb-2">مركز التصحيح والاعتماد</h1>
          <p className="text-muted-foreground text-sm font-bold">راجع إجابات الطلاب واعتمد الدرجات النهائية بالبحث بالاسم الرباعي الحقيقي.</p>
        </div>
        <div className="bg-primary/10 text-primary px-4 py-2 rounded-xl border border-primary/20 flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin-slow" />
          <span className="text-xs font-black">تزامن حيّ: {filteredAttempts.length} محاولة</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-1 bg-card border-primary/10 shadow-xl overflow-hidden rounded-[2rem]">
          <CardHeader className="border-b bg-secondary/5 p-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input 
                placeholder="ابحث باسم الطالب الرباعي..." 
                className="w-full bg-background border-primary/10 rounded-xl h-12 pr-10 text-right text-xs font-bold focus:border-primary outline-none transition-all" 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
             {isLoading ? (
               <div className="flex flex-col items-center justify-center py-20 gap-2">
                 <Loader2 className="w-8 h-8 animate-spin text-primary" />
                 <p className="text-[10px] text-muted-foreground font-bold">جاري جلب المحاولات...</p>
               </div>
             ) : filteredAttempts.length === 0 ? (
               <div className="text-center py-20 text-muted-foreground italic text-xs font-bold">لا توجد محاولات مطابقة للبحث حالياً.</div>
             ) : (
               <div className="divide-y divide-primary/5 max-h-[70vh] overflow-y-auto">
                 {filteredAttempts.map((attempt) => (
                   <button 
                     key={attempt.id}
                     onClick={() => setSelectedAttempt(attempt)}
                     className={`w-full p-5 text-right hover:bg-primary/5 transition-all flex flex-col gap-2 relative group ${selectedAttempt?.id === attempt.id ? 'bg-primary/10 border-r-4 border-primary' : ''}`}
                   >
                     <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary border border-primary/5">
                            <UserIcon className="w-3 h-3" />
                          </div>
                          <span className="text-xs font-black text-foreground truncate max-w-[120px]">
                            {studentMap[attempt.studentId]?.name || attempt.studentName || 'جاري التحميل...'}
                          </span>
                        </div>
                        <Badge className="text-[9px] h-5 font-black" variant={attempt.isGraded ? 'default' : 'secondary'}>
                          {attempt.isGraded ? 'مكتمل' : 'قيد المراجعة'}
                        </Badge>
                     </div>
                     <ExamNameByDoc courseId={attempt.courseId} contentId={attempt.courseContentId} />
                     <div className="flex flex-row-reverse justify-between items-center mt-1">
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-bold">
                          <Clock className="w-3 h-3" />
                          <span>{attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleDateString('ar-EG') : '---'}</span>
                        </div>
                        <div className="text-[10px] font-black text-primary">
                          {attempt.pointsAchieved ?? 0} من {attempt.totalPoints ?? 0} ({attempt.score ?? 0}%)
                        </div>
                     </div>
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
            <Card className="h-[60vh] flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-[3rem] bg-secondary/5">
              <ClipboardList className="w-16 h-16 mb-4 opacity-10" />
              <p className="text-sm font-black">اختر محاولة طالب للبدء في مراجعة إجاباته الحقيقية.</p>
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
  return <p className="font-black text-sm text-primary truncate leading-tight">{exam?.title || 'اختبار مجهول'}</p>;
}

function AttemptDetails({ attempt, onGrade, onRelease, onDelete }: any) {
  const firestore = useFirestore();
  const answersRef = useMemoFirebase(() => {
    if (!firestore || !attempt?.studentId || !attempt?.id) return null;
    return collection(firestore, 'students', attempt.studentId, 'quiz_attempts', attempt.id, 'answers');
  }, [firestore, attempt]);
  const { data: answers, isLoading } = useCollection(answersRef);

  return (
    <Card className="bg-card border-primary/20 shadow-2xl animate-in zoom-in-95 rounded-[2.5rem] overflow-hidden flex flex-col h-full max-h-[85vh]">
      <CardHeader className="border-b bg-secondary/5 flex flex-col md:flex-row items-center justify-between p-6 gap-4">
        <div className="text-right w-full">
           <div className="flex items-center gap-3 justify-end mb-1">
             <Badge className="bg-accent text-white border-none text-xs px-3 font-black">
               الدرجة: {attempt.pointsAchieved || 0} من {attempt.totalPoints || 0}
             </Badge>
             <CardTitle className="text-2xl font-black text-primary">المجموع: {attempt.score || 0}%</CardTitle>
           </div>
           <p className="text-[10px] font-black text-muted-foreground">حالة التصحيح: {attempt.isGraded ? 'معتمد نهائياً' : 'قيد المراجعة والاعتماد'}</p>
        </div>
        <div className="flex gap-2 shrink-0">
           <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 rounded-xl" onClick={() => onDelete(attempt)}>
             <Trash2 className="w-5 h-5" />
           </Button>
           <Button onClick={() => onRelease(attempt)} className="bg-accent hover:bg-accent/90 text-white font-black h-12 px-8 gap-2 rounded-xl shadow-lg">
              <CheckCircle className="w-5 h-5" /> اعتماد الدرجة
           </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-6 space-y-6 overflow-y-auto flex-grow">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <p className="text-sm italic font-bold text-muted-foreground">جاري تحميل إجابات الطالب...</p>
          </div>
        ) : !answers || answers.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground italic font-bold">لا توجد تفاصيل إجابات مسجلة.</div>
        ) : (
          answers?.map((ans, i) => (
            <div key={ans.id} className="p-6 bg-secondary/20 rounded-[2rem] border border-primary/5 text-right space-y-4">
               <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] font-black">سؤال {i+1}</Badge>
                    <Badge className="bg-primary/10 text-primary border-none text-[10px] font-black">الدرجة: {ans.maxPoints ?? 10} نقطة</Badge>
                  </div>
                  <div className="flex gap-1">
                     <Button size="sm" variant={ans.isCorrect ? 'default' : 'outline'} onClick={() => handleGradeAnswer(ans, true, ans.maxPoints ?? 10)} className={ans.isCorrect ? 'bg-accent font-black' : 'font-black'}>صحيح</Button>
                     <Button size="sm" variant={ans.isCorrect === false ? 'destructive' : 'outline'} onClick={() => handleGradeAnswer(ans, false, 0)} className="font-black">خطأ</Button>
                  </div>
               </div>
               <div className="space-y-3">
                 <p className="text-xs text-muted-foreground font-black flex items-center gap-1 justify-end">
                    <HelpCircle className="w-3 h-3" /> {ans.questionType === 'MCQ' ? 'اختيار من متعدد' : 'سؤال مقالي'}
                 </p>
                 {ans.questionType === 'MCQ' ? (
                   <p className="p-4 bg-background rounded-xl border border-dashed border-primary/10 text-sm font-bold">
                      الخيار المختار: <span className="font-mono text-primary">{ans.mcqSelectedOptionId || 'لم يتم الاختيار'}</span>
                   </p>
                 ) : (
                   <div className="p-4 bg-background rounded-2xl text-sm font-bold whitespace-pre-wrap leading-relaxed border border-primary/5 min-h-[100px]">
                      {ans.essayAnswerText || <span className="text-muted-foreground italic">لا توجد إجابة مقدمة.</span>}
                   </div>
                 )}
               </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
