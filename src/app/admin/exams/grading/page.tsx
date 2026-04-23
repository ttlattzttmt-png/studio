"use client";

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Loader2, 
  Search,
  CheckCircle,
  ClipboardList,
  Trash2,
  Clock,
  RefreshCw,
  User as UserIcon,
  XCircle,
  Save,
  MessageSquare,
  FileText,
  MessageCircle
} from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collectionGroup, updateDoc, doc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { sendWhatsAppMessage, formatExamResultMessage } from '@/lib/whatsapp-utils';

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

  const handleReleaseGrades = async (attempt: any) => {
    if (!firestore) return;
    try {
      const answersRef = collection(firestore, 'students', attempt.studentId, 'quiz_attempts', attempt.id, 'answers');
      const answersSnap = await getDocs(answersRef);
      
      let totalScoreAchieved = 0;
      let totalMaxPoints = 0;
      answersSnap.forEach(doc => {
        const data = doc.data();
        totalScoreAchieved += (Number(data.scoreAchieved) || 0);
        totalMaxPoints += (Number(data.maxPoints) || 0);
      });
      const finalPercentage = totalMaxPoints > 0 ? Math.round((totalScoreAchieved / totalMaxPoints) * 100) : 0;

      await updateDoc(doc(firestore, 'students', attempt.studentId, 'quiz_attempts', attempt.id), { 
        isGraded: true,
        score: finalPercentage,
        pointsAchieved: totalScoreAchieved,
        totalPoints: totalMaxPoints
      });

      toast({ title: "تم الاعتماد", description: `الدرجة النهائية: ${finalPercentage}%` });
      setSelectedAttempt({ ...attempt, isGraded: true, score: finalPercentage, pointsAchieved: totalScoreAchieved, totalPoints: totalMaxPoints });
    } catch (e) { console.error(e); }
  };

  if (isUserLoading) return <div className="flex justify-center py-20"><Loader2 className="w-10 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 text-right">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-headline font-bold mb-2">مركز التصحيح والاعتماد</h1>
          <p className="text-muted-foreground font-bold">راجع إجابات الطلاب، عدل الدرجات، واعتمد النتيجة النهائية.</p>
        </div>
        <div className="bg-primary/10 text-primary px-4 py-2 rounded-xl border border-primary/20 flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin-slow" />
          <span className="text-xs font-black">تزامن مباشر: {filteredAttempts.length} محاولة</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-1 bg-card border-primary/10 shadow-xl overflow-hidden rounded-3xl h-fit">
          <CardHeader className="border-b bg-secondary/5 p-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input 
                placeholder="ابحث بالاسم الرباعي..." 
                className="w-full bg-background border-primary/10 rounded-xl h-12 pr-10 text-right text-xs font-bold focus:border-primary outline-none" 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
              />
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-y-auto max-h-[70vh]">
             {isLoading ? <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /> : (
               <div className="divide-y divide-primary/5">
                 {filteredAttempts.map((attempt) => (
                   <button 
                     key={attempt.id}
                     onClick={() => setSelectedAttempt(attempt)}
                     className={`w-full p-4 text-right hover:bg-primary/5 transition-all flex flex-col gap-1 ${selectedAttempt?.id === attempt.id ? 'bg-primary/10 border-r-4 border-primary' : ''}`}
                   >
                     <div className="flex justify-between items-center">
                        <span className="text-xs font-black text-foreground">{studentMap[attempt.studentId]?.name || attempt.studentName || 'جاري التحميل...'}</span>
                        <Badge className="text-[9px]" variant={attempt.isGraded ? 'default' : 'secondary'}>{attempt.isGraded ? 'مكتمل' : 'بانتظار المراجعة'}</Badge>
                     </div>
                     <ExamNameByDoc courseId={attempt.courseId} contentId={attempt.courseContentId} />
                   </button>
                 ))}
                 {filteredAttempts.length === 0 && <p className="p-10 text-center text-xs text-muted-foreground italic">لا توجد محاولات مطابقة.</p>}
               </div>
             )}
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          {selectedAttempt ? (
            <AttemptDetails 
              key={selectedAttempt.id} 
              attempt={selectedAttempt} 
              studentInfo={studentMap[selectedAttempt.studentId]}
              onRelease={handleReleaseGrades} 
              onDelete={handleDeleteAttempt} 
            />
          ) : (
            <Card className="h-[50vh] flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-[2.5rem] bg-secondary/5">
              <ClipboardList className="w-16 h-16 mb-4 opacity-10" />
              <p className="text-lg font-black opacity-20">اختر محاولة طالب من القائمة الجانبية للبدء.</p>
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

function AttemptDetails({ attempt, studentInfo, onRelease, onDelete }: any) {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const answersRef = useMemoFirebase(() => {
    if (!firestore || !attempt?.studentId || !attempt?.id) return null;
    return collection(firestore, 'students', attempt.studentId, 'quiz_attempts', attempt.id, 'answers');
  }, [firestore, attempt]);
  const { data: answers, isLoading } = useCollection(answersRef);

  const examRef = useMemoFirebase(() => (firestore && attempt.courseId && attempt.courseContentId) ? doc(firestore, 'courses', attempt.courseId, 'content', attempt.courseContentId) : null, [firestore, attempt]);
  const { data: examData } = useDoc(examRef);

  const handleUpdateAnswer = async (answerId: string, updates: any) => {
    if (!firestore || !attempt) return;
    try {
      const answerRef = doc(firestore, 'students', attempt.studentId, 'quiz_attempts', attempt.id, 'answers', answerId);
      await updateDoc(answerRef, updates);
      toast({ title: "تم تحديث الإجابة" });
    } catch (e) { console.error(e); }
  };

  const handleSendWhatsApp = (target: 'student' | 'parent') => {
    if (!studentInfo || !examData) {
      toast({ variant: "destructive", title: "بيانات ناقصة", description: "جاري تحميل بيانات الطالب أو الامتحان." });
      return;
    }
    
    const phone = target === 'student' ? studentInfo.studentPhoneNumber : studentInfo.parentPhoneNumber;
    if (!phone) {
      toast({ variant: "destructive", title: "رقم مفقود", description: `لا يوجد رقم مسجل لـ ${target === 'student' ? 'الطالب' : 'ولي الأمر'}.` });
      return;
    }

    const message = formatExamResultMessage(
      studentInfo.name,
      examData.title,
      attempt.score,
      attempt.pointsAchieved,
      attempt.totalPoints
    );

    sendWhatsAppMessage(phone, message);
  };

  return (
    <Card className="bg-card border-primary/20 shadow-2xl rounded-[2.5rem] overflow-hidden flex flex-col h-fit">
      <CardHeader className="border-b bg-secondary/10 flex flex-col md:flex-row md:items-center justify-between p-8 gap-4">
        <div className="text-right space-y-1">
           <CardTitle className="text-3xl font-black text-primary">{attempt.score}%</CardTitle>
           <p className="text-xs font-bold text-muted-foreground flex items-center gap-2 justify-end">
             إجمالي النقاط: {attempt.pointsAchieved || 0} من {attempt.totalPoints || 0}
             <FileText className="w-4 h-4" />
           </p>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
           <Button variant="outline" size="icon" className="text-destructive border-destructive/20 hover:bg-destructive/10 h-12 w-12 rounded-xl" onClick={() => onDelete(attempt)}>
             <Trash2 className="w-5 h-5" />
           </Button>
           
           <div className="flex gap-1">
             <Button 
                onClick={() => handleSendWhatsApp('student')} 
                variant="outline" 
                className="h-12 px-4 rounded-xl border-accent/20 text-accent font-bold gap-2"
                title="إرسال للطالب واتساب"
              >
                <MessageCircle className="w-4 h-4" /> للطالب
              </Button>
              <Button 
                onClick={() => handleSendWhatsApp('parent')} 
                variant="outline" 
                className="h-12 px-4 rounded-xl border-accent/20 text-accent font-bold gap-2"
                title="إرسال لولي الأمر واتساب"
              >
                <MessageCircle className="w-4 h-4" /> لولي الأمر
              </Button>
           </div>

           <Button onClick={() => onRelease(attempt)} className="bg-accent hover:bg-accent/90 text-white font-black h-12 px-8 rounded-xl shadow-lg shadow-accent/20 gap-2">
             <Save className="w-5 h-5" /> اعتماد الدرجة
           </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-8 space-y-10">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <p className="text-muted-foreground font-bold">جاري جلب إجابات الطالب...</p>
          </div>
        ) : (
          answers?.map((ans, i) => (
            <AnswerRow key={ans.id} index={i} answer={ans} onUpdate={(updates) => handleUpdateAnswer(ans.id, updates)} courseId={attempt.courseId} examId={attempt.courseContentId} />
          ))
        )}
      </CardContent>
    </Card>
  );
}

function AnswerRow({ index, answer, onUpdate, courseId, examId }: any) {
  const firestore = useFirestore();
  const qRef = useMemoFirebase(() => (firestore && courseId && examId && answer.questionId) ? doc(firestore, 'courses', courseId, 'content', examId, 'questions', answer.questionId) : null, [firestore, courseId, examId, answer.questionId]);
  const { data: question } = useDoc(qRef);

  return (
    <div className="p-6 bg-secondary/5 rounded-[2rem] border border-white/5 text-right space-y-6 relative overflow-hidden group hover:border-primary/20 transition-all">
       <div className="flex justify-between items-center mb-2">
          <Badge variant="outline" className="text-[10px] font-bold border-primary/20 text-primary">سؤال {index + 1}</Badge>
          <div className="flex items-center gap-3">
             <span className="text-[10px] font-black text-muted-foreground uppercase">{answer.questionType}</span>
             <Badge className={answer.isCorrect ? "bg-accent" : "bg-destructive"}>
                {answer.isCorrect ? "صحيحة" : "خاطئة"}
             </Badge>
          </div>
       </div>

       <div className="space-y-4">
          <div className="p-4 bg-background/50 rounded-2xl border border-dashed border-white/10">
             <p className="text-sm font-bold text-foreground mb-3">{question?.questionText || 'جاري تحميل السؤال...'}</p>
             {question?.questionImageUrl && <img src={question.questionImageUrl} className="max-h-32 rounded-xl mb-3 shadow-md" alt="" />}
             
             <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
                <p className="text-[10px] text-primary font-black mb-1">إجابة الطالب:</p>
                <div className="text-sm font-bold">
                  {answer.questionType === 'MCQ' ? (
                    <MCQOptionText 
                      courseId={courseId} 
                      examId={examId} 
                      questionId={answer.questionId} 
                      optionId={answer.mcqSelectedOptionId} 
                    />
                  ) : (
                    <p className="whitespace-pre-wrap">{answer.essayAnswerText || 'لم يكتب إجابة'}</p>
                  )}
                </div>
             </div>
          </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          <div className="space-y-3">
             <label className="text-[10px] font-black text-muted-foreground">تعديل درجة السؤال (من {answer.maxPoints || 10})</label>
             <div className="flex gap-2">
                <Input 
                   type="number" 
                   value={answer.scoreAchieved} 
                   onChange={(e) => onUpdate({ scoreAchieved: Number(e.target.value) })}
                   className="h-12 bg-background border-primary/10 text-center font-black rounded-xl"
                />
                <Button variant="outline" size="sm" onClick={() => onUpdate({ isCorrect: true, scoreAchieved: answer.maxPoints || 10 })} className="h-12 px-4 rounded-xl gap-1 text-accent border-accent/20 hover:bg-accent/5">
                   <CheckCircle className="w-4 h-4" /> صحيح
                </Button>
                <Button variant="outline" size="sm" onClick={() => onUpdate({ isCorrect: false, scoreAchieved: 0 })} className="h-12 px-4 rounded-xl gap-1 text-destructive border-destructive/20 hover:bg-destructive/5">
                   <XCircle className="w-4 h-4" /> خطأ
                </Button>
             </div>
          </div>
          <div className="space-y-2">
             <label className="text-[10px] font-black text-muted-foreground flex items-center gap-1 justify-end">ملاحظات المعلم للطالب <MessageSquare className="w-3 h-3" /></label>
             <Textarea 
               placeholder="اكتب ملاحظة الطالب هنا..."
               value={answer.adminFeedback || ''}
               onChange={(e) => onUpdate({ adminFeedback: e.target.value })}
               className="h-12 min-h-[48px] bg-background border-primary/10 rounded-xl text-xs py-2"
             />
          </div>
       </div>
    </div>
  );
}

function MCQOptionText({ courseId, examId, questionId, optionId }: any) {
  const firestore = useFirestore();
  const optionRef = useMemoFirebase(() => 
    (firestore && courseId && examId && questionId && optionId) 
    ? doc(firestore, 'courses', courseId, 'content', examId, 'questions', questionId, 'options', optionId) 
    : null
  , [firestore, courseId, examId, questionId, optionId]);
  
  const { data: option, isLoading } = useDoc(optionRef);

  if (!optionId) return <span className="text-destructive">لم يتم اختيار أي إجابة</span>;
  if (isLoading) return <span className="text-muted-foreground italic">جاري جلب النص...</span>;
  return <p className="text-primary font-black">{option?.optionText || 'لم يتم العثور على نص الخيار'}</p>;
}
