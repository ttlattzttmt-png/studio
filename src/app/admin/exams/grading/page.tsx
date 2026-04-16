
"use client";

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  CheckCircle2, 
  Search,
  CheckCircle,
  ClipboardList,
  AlertCircle,
  Trash2,
  Clock,
  User as UserIcon,
  RefreshCw,
  BookOpen
} from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, useDoc, useUser } from '@/firebase';
import { collectionGroup, query, updateDoc, doc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export default function AdminGradingPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAttempt, setSelectedAttempt] = useState<any>(null);

  // جلب كافة المحاولات بتزامن لحظي بدون orderBy لتجنب أخطاء الفهارس التي قد تخفي البيانات
  const attemptsRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collectionGroup(firestore, 'quiz_attempts');
  }, [firestore, user]);
  
  const { data: rawAttempts, isLoading, error } = useCollection(attemptsRef);

  // تصفية وترتيب المحاولات برمجياً لضمان الدقة والسرعة
  const filteredAttempts = useMemo(() => {
    if (!rawAttempts) return [];
    
    return rawAttempts
      .filter(a => {
        const searchLower = searchTerm.toLowerCase();
        return (
          (a.studentId || '').toLowerCase().includes(searchLower) || 
          (a.courseContentId || '').toLowerCase().includes(searchLower) ||
          (a.id || '').toLowerCase().includes(searchLower)
        );
      })
      .sort((a, b) => {
        const dateA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
        const dateB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
        return dateB - dateA; // الأحدث أولاً
      });
  }, [rawAttempts, searchTerm]);

  const handleDeleteAttempt = async (attempt: any) => {
    if (!firestore) return;
    if (!confirm("🚨 تحذير: هل أنت متأكد من حذف هذه المحاولة نهائياً من السيرفر؟")) return;
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
      
      // تحديث الحالة المحلية للعرض فوراً
      setSelectedAttempt({
        ...attempt, 
        isGraded: true, 
        score: finalPercentage, 
        pointsAchieved: totalScoreAchieved, 
        totalPoints: totalMaxPoints
      });
    } catch (e) { 
      console.error(e);
      toast({ variant: "destructive", title: "خطأ في الاعتماد" });
    }
  };

  if (isUserLoading) return <div className="flex justify-center py-20"><Loader2 className="w-10 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="text-right">
          <h1 className="text-4xl font-headline font-bold mb-2">مركز التصحيح والاعتماد</h1>
          <p className="text-muted-foreground text-sm">راجع إجابات الطلاب واعتمد الدرجات النهائية لحظياً.</p>
        </div>
        <div className="bg-primary/10 text-primary px-4 py-2 rounded-xl border border-primary/20 flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin-slow" />
          <span className="text-xs font-bold">تزامن حيّ: {filteredAttempts.length} محاولة</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* قائمة المحاولات */}
        <Card className="lg:col-span-1 bg-card border-primary/10 shadow-xl overflow-hidden rounded-[2rem]">
          <CardHeader className="border-b bg-secondary/5 p-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input 
                placeholder="ابحث بمعرف الطالب..." 
                className="w-full bg-background border-primary/10 rounded-xl h-11 pr-10 text-right text-xs focus:border-primary outline-none transition-all" 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
             {isLoading ? (
               <div className="flex flex-col items-center justify-center py-20 gap-2">
                 <Loader2 className="w-8 h-8 animate-spin text-primary" />
                 <p className="text-[10px] text-muted-foreground">جاري جلب المحاولات...</p>
               </div>
             ) : filteredAttempts.length === 0 ? (
               <div className="text-center py-20 text-muted-foreground italic text-xs">لا توجد محاولات حالياً.</div>
             ) : (
               <div className="divide-y divide-primary/5 max-h-[70vh] overflow-y-auto">
                 {filteredAttempts.map((attempt) => (
                   <button 
                     key={attempt.id}
                     onClick={() => setSelectedAttempt(attempt)}
                     className={`w-full p-5 text-right hover:bg-primary/5 transition-all flex flex-col gap-2 relative group ${selectedAttempt?.id === attempt.id ? 'bg-primary/10 border-r-4 border-primary' : ''}`}
                   >
                     <div className="flex justify-between items-center">
                        <StudentBrief studentId={attempt.studentId} />
                        <Badge className="text-[9px] h-5" variant={attempt.isGraded ? 'default' : 'secondary'}>
                          {attempt.isGraded ? 'مكتمل' : 'قيد المراجعة'}
                        </Badge>
                     </div>
                     <ExamName courseId={attempt.courseId} contentId={attempt.courseContentId} />
                     <div className="flex flex-row-reverse justify-between items-center mt-1">
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>{attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleDateString('ar-EG') : '---'}</span>
                        </div>
                        <div className="text-[10px] font-bold text-primary">
                          {attempt.pointsAchieved ?? 0} / {attempt.totalPoints ?? 0} ({attempt.score ?? 0}%)
                        </div>
                     </div>
                   </button>
                 ))}
               </div>
             )}
          </CardContent>
        </Card>

        {/* تفاصيل المحاولة */}
        <div className="lg:col-span-2">
          {selectedAttempt ? (
            <AttemptDetails 
              attempt={selectedAttempt} 
              onGrade={handleGradeAnswer} 
              onRelease={handleReleaseGrades} 
              onDelete={handleDeleteAttempt}
            />
          ) : (
            <Card className="h-[60vh] flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-[3rem] bg-secondary/5">
              <ClipboardList className="w-16 h-16 mb-4 opacity-10" />
              <p className="text-sm font-bold">اختر محاولة طالب من القائمة الجانبية للبدء في مراجعتها.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function ExamName({ courseId, contentId }: { courseId: string, contentId: string }) {
  const firestore = useFirestore();
  const examRef = useMemoFirebase(() => {
    if (!firestore || !courseId || !contentId) return null;
    return doc(firestore, 'courses', courseId, 'content', contentId);
  }, [firestore, courseId, contentId]);
  const { data: exam } = useDoc(examRef);
  return <p className="font-black text-sm text-primary truncate leading-tight">{exam?.title || 'كورس غير معروف'}</p>;
}

function StudentBrief({ studentId }: { studentId: string }) {
  const firestore = useFirestore();
  const studentRef = useMemoFirebase(() => {
    if (!firestore || !studentId) return null;
    return doc(firestore, 'students', studentId);
  }, [firestore, studentId]);
  const { data: student } = useDoc(studentRef);
  return (
    <div className="flex items-center gap-2">
      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
        {student?.name?.[0] || 'S'}
      </div>
      <span className="text-xs font-bold text-foreground truncate max-w-[120px]">{student?.name || 'طالب'}</span>
    </div>
  );
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
             <Badge className="bg-accent text-white border-none text-xs px-3">
               الدرجة: {attempt.pointsAchieved || 0} من {attempt.totalPoints || 0}
             </Badge>
             <CardTitle className="text-2xl font-black text-primary">المجموع: {attempt.score || 0}%</CardTitle>
           </div>
           <p className="text-[10px] font-bold text-muted-foreground">حالة التصحيح: {attempt.isGraded ? 'تم الاعتماد النهائي' : 'قيد المراجعة حالياً'}</p>
        </div>
        <div className="flex gap-2 shrink-0">
           <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 rounded-xl" onClick={() => onDelete(attempt)}>
             <Trash2 className="w-5 h-5" />
           </Button>
           <Button onClick={() => onRelease(attempt)} className="bg-accent hover:bg-accent/90 text-white font-bold h-12 px-8 gap-2 rounded-xl shadow-lg shadow-accent/20">
              <CheckCircle className="w-5 h-5" /> اعتماد النتيجة
           </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-6 space-y-6 overflow-y-auto flex-grow">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <p className="text-sm italic text-muted-foreground">جاري تحميل إجابات الطالب...</p>
          </div>
        ) : !answers || answers.length === 0 ? (
          <div className="text-center py-20 opacity-30 italic">لا توجد تفاصيل إجابات متاحة لهذه المحاولة.</div>
        ) : (
          answers.map((ans, i) => (
            <div key={ans.id} className="p-6 bg-secondary/20 rounded-[2rem] border border-primary/5 text-right space-y-4 hover:border-primary/20 transition-all">
               <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] font-bold">سؤال {i+1}</Badge>
                    <Badge className="bg-primary/10 text-primary border-none text-[10px]">الدرجة الأصلية: {ans.maxPoints ?? '---'} نقطة</Badge>
                  </div>
                  <div className="flex gap-1">
                     <Button 
                       size="sm" 
                       variant={ans.isCorrect ? 'default' : 'outline'} 
                       onClick={() => onGrade(ans, true, ans.maxPoints ?? 10)} 
                       className={ans.isCorrect ? 'bg-accent text-white font-black rounded-lg' : 'font-bold rounded-lg'}
                     >
                       صحيح (+{ans.maxPoints ?? 10})
                     </Button>
                     <Button 
                       size="sm" 
                       variant={ans.isCorrect === false ? 'destructive' : 'outline'} 
                       onClick={() => onGrade(ans, false, 0)} 
                       className="font-bold rounded-lg"
                     >
                       خطأ (0)
                     </Button>
                  </div>
               </div>

               <div className="space-y-3">
                 <p className="text-xs text-muted-foreground font-bold italic">إجابة الطالب:</p>
                 {ans.questionType === 'MCQ' ? (
                   <div className="p-4 bg-background rounded-xl border border-dashed border-primary/10 flex items-center justify-between">
                      <Badge variant={ans.isCorrect ? "default" : "destructive"}>
                        {ans.isCorrect ? 'اختيار صحيح' : 'اختيار خاطئ'}
                      </Badge>
                      <span className="font-bold text-sm">معرف الخيار: {ans.mcqSelectedOptionId || 'لم يتم الاختيار'}</span>
                   </div>
                 ) : (
                   <p className="p-4 bg-background rounded-2xl text-sm whitespace-pre-wrap leading-relaxed border border-primary/5">
                     {ans.essayAnswerText || <span className="opacity-20 italic">لا توجد إجابة نصية</span>}
                   </p>
                 )}
                 
                 {ans.essayAnswerFileUrl && (
                   <div className="relative w-full h-80 rounded-2xl overflow-hidden bg-black/5 border border-primary/10 group">
                     <img src={ans.essayAnswerFileUrl} alt="Student answer" className="w-full h-full object-contain" />
                     <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <a 
                          href={ans.essayAnswerFileUrl} 
                          target="_blank" 
                          className="bg-white text-black px-6 py-2 rounded-xl font-bold text-sm shadow-xl"
                        >
                          عرض الملف بالحجم الكامل
                        </a>
                     </div>
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
