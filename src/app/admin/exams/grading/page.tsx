
"use client";

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Loader2, 
  Search,
  CheckCircle,
  ClipboardList,
  RefreshCw,
  XCircle,
  Save,
  MessageCircle,
} from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collectionGroup, updateDoc, doc, collection, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { sendAutomatedMessage, formatExamResultMessage } from '@/lib/whatsapp-utils';
import Image from 'next/image';

export default function AdminGradingPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAttempt, setSelectedAttempt] = useState<any>(null);

  const studentsRef = useMemoFirebase(() => (firestore ? collection(firestore, 'students') : null), [firestore]);
  const { data: allStudents } = useCollection(studentsRef);

  const attemptsRef = useMemoFirebase(() => (firestore && user) ? collectionGroup(firestore, 'quiz_attempts') : null, [firestore, user]);
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
        const name = (studentMap[a.studentId]?.name || a.studentName || '').toLowerCase();
        return name.includes(searchTerm.toLowerCase());
      })
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  }, [rawAttempts, searchTerm, studentMap]);

  const handleReleaseGrades = async (attempt: any) => {
    if (!firestore) return;
    const answersRef = collection(firestore, 'students', attempt.studentId, 'quiz_attempts', attempt.id, 'answers');
    const snap = await getDocs(answersRef);
    let totalScore = 0;
    let totalPoints = 0;
    snap.forEach(d => {
      totalScore += (Number(d.data().scoreAchieved) || 0);
      totalPoints += (Number(d.data().maxPoints) || 0);
    });
    const finalPercent = totalPoints > 0 ? Math.round((totalScore / totalPoints) * 100) : 0;
    await updateDoc(doc(firestore, 'students', attempt.studentId, 'quiz_attempts', attempt.id), { 
      isGraded: true, score: finalPercent, pointsAchieved: totalScore, totalPoints: totalPoints 
    });
    toast({ title: "تم الاعتماد", description: `النتيجة المحدثة: ${finalPercent}%` });
    setSelectedAttempt({...attempt, isGraded: true, score: finalPercent, pointsAchieved: totalScore, totalPoints: totalPoints});
  };

  if (isUserLoading) return <div className="flex justify-center py-20"><Loader2 className="w-10 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 text-right">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-headline font-bold mb-2">مركز التصحيح الذكي</h1>
          <p className="text-muted-foreground font-bold italic">راجع إجابات الطلاب بالأسماء الرباعية واعتمد الدرجات المقالية.</p>
        </div>
        <div className="bg-primary/10 text-primary px-6 py-3 rounded-2xl flex items-center gap-3 border border-primary/20"><RefreshCw className="w-5 h-5 animate-spin-slow" /><span className="font-black text-sm">{filteredAttempts.length} محاولة</span></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-1 bg-card border-primary/10 rounded-[2rem] overflow-hidden h-fit shadow-xl">
          <CardHeader className="bg-secondary/10 p-5 border-b">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input placeholder="ابحث بالاسم الرباعي..." className="w-full bg-background rounded-xl h-12 pr-10 text-right font-bold text-sm border-primary/5 focus:border-primary transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </CardHeader>
          <CardContent className="p-0 max-h-[70vh] overflow-y-auto">
             {filteredAttempts.length === 0 ? (
               <div className="p-10 text-center text-muted-foreground opacity-30 italic">لا توجد محاولات مطابقة.</div>
             ) : (
               filteredAttempts.map(a => (
                 <button key={a.id} onClick={() => setSelectedAttempt(a)} className={`w-full p-5 text-right border-b hover:bg-primary/5 transition-all flex items-center justify-between group ${selectedAttempt?.id === a.id ? 'bg-primary/10 border-r-4 border-primary' : ''}`}>
                   <Badge variant={a.isGraded ? 'default' : 'secondary'} className="text-[9px] h-5">{a.isGraded ? 'تم' : 'مراجعة'}</Badge>
                   <div className="text-right min-w-0">
                     <p className="text-xs font-black truncate">{studentMap[a.studentId]?.name || a.studentName || 'جاري التحميل...'}</p>
                     <p className="text-[10px] opacity-50 mt-0.5">{new Date(a.submittedAt).toLocaleDateString('ar-EG')}</p>
                   </div>
                 </button>
               ))
             )}
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          {selectedAttempt ? (
            <AttemptDetails key={selectedAttempt.id} attempt={selectedAttempt} studentInfo={studentMap[selectedAttempt.studentId]} onRelease={handleReleaseGrades} />
          ) : (
            <Card className="h-96 flex flex-col items-center justify-center border-2 border-dashed rounded-[3rem] bg-secondary/5 opacity-40"><ClipboardList className="w-20 h-20 mb-4 text-primary" /><p className="font-black text-xl">اختر محاولة من القائمة للبدء في التصحيح</p></Card>
          )}
        </div>
      </div>
    </div>
  );
}

function AttemptDetails({ attempt, studentInfo, onRelease }: any) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);
  
  const configRef = useMemoFirebase(() => (firestore ? doc(firestore, 'admin_config', 'whatsapp') : null), [firestore]);
  const { data: config } = useDoc(configRef);

  const answersRef = useMemoFirebase(() => (firestore && attempt) ? collection(firestore, 'students', attempt.studentId, 'quiz_attempts', attempt.id, 'answers') : null, [firestore, attempt]);
  const { data: answers, isLoading } = useCollection(answersRef);

  const examRef = useMemoFirebase(() => (firestore && attempt.courseId && attempt.courseContentId) ? doc(firestore, 'courses', attempt.courseId, 'content', attempt.courseContentId) : null, [firestore, attempt]);
  const { data: examData } = useDoc(examRef);

  const handleSendToBoth = async () => {
    if (!studentInfo || !examData || !firestore) return;
    setIsSending(true);
    try {
      const msg = formatExamResultMessage(studentInfo.name, examData.title, attempt.score, attempt.pointsAchieved, attempt.totalPoints);
      await sendAutomatedMessage(studentInfo.studentPhoneNumber, msg, config as any);
      setTimeout(async () => {
        await sendAutomatedMessage(studentInfo.parentPhoneNumber, msg, config as any);
        setIsSending(false);
        toast({ title: "تم الإرسال للطرفين", description: "وصلت النتيجة للطالب وولي الأمر بنجاح." });
      }, 3000);
    } catch (e) {
      setIsSending(false);
      toast({ variant: "destructive", title: "فشل الإرسال الآلي" });
    }
  };

  return (
    <Card className="bg-card border-primary/20 rounded-[3rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
      <CardHeader className="bg-secondary/10 flex flex-col md:flex-row md:items-center justify-between p-10 border-b gap-6">
        <div className="text-right">
           <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">النتيجة النهائية</p>
           <div className="flex items-baseline gap-2 justify-end">
              <span className="text-5xl font-black text-primary">{attempt.score}%</span>
              <span className="text-sm font-bold opacity-40">({attempt.pointsAchieved}/{attempt.totalPoints})</span>
           </div>
        </div>
        <div className="flex flex-wrap gap-3">
           <Button 
            onClick={handleSendToBoth} 
            disabled={isSending || !attempt.isGraded}
            variant="outline" 
            className="h-14 px-8 rounded-2xl border-accent/20 text-accent font-black gap-3 hover:bg-accent/5"
           >
              {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <MessageCircle className="w-5 h-5" />}
              إرسال النتيجة (واتساب)
           </Button>
           <Button onClick={() => onRelease(attempt)} className="bg-primary text-primary-foreground font-black h-14 px-10 rounded-2xl shadow-xl shadow-primary/20 gap-3">
              <Save className="w-5 h-5" /> اعتماد الدرجة
           </Button>
        </div>
      </CardHeader>
      <CardContent className="p-10 space-y-8">
        {isLoading ? (
          <div className="py-20 text-center"><Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" /></div>
        ) : (
          answers?.map((ans, i) => <AnswerRow key={ans.id} index={i} answer={ans} attempt={attempt} />)
        )}
      </CardContent>
    </Card>
  );
}

function AnswerRow({ index, answer, attempt }: any) {
  const firestore = useFirestore();
  const qRef = useMemoFirebase(() => (firestore && answer.questionId) ? doc(firestore, 'courses', attempt.courseId, 'content', attempt.courseContentId, 'questions', answer.questionId) : null, [firestore, answer.questionId, attempt]);
  const { data: question } = useDoc(qRef);

  const handleUpdate = async (updates: any) => {
    await updateDoc(doc(firestore!, 'students', attempt.studentId, 'quiz_attempts', attempt.id, 'answers', answer.id), updates);
  };

  return (
    <div className="p-8 bg-secondary/5 rounded-[2rem] border border-white/5 text-right space-y-6 relative overflow-hidden group transition-all hover:bg-secondary/10">
       <div className="flex justify-between items-center mb-2">
          <Badge variant="outline" className="rounded-lg font-black bg-background/50">سؤال {index+1}</Badge>
          <span className={`text-[10px] font-black px-2 py-1 rounded ${answer.questionType === 'MCQ' ? 'bg-blue-500/10 text-blue-500' : 'bg-purple-500/10 text-purple-500'}`}>
            {answer.questionType === 'MCQ' ? 'اختياري' : 'مقالي'}
          </span>
       </div>
       
       <div className="space-y-4">
          {question?.imageUrl && (
            <div className="relative w-full h-40 rounded-xl overflow-hidden border border-white/10 mb-4 bg-muted">
              <Image src={question.imageUrl} alt="Q Image" fill className="object-contain" unoptimized />
            </div>
          )}
          <p className="font-bold text-lg leading-relaxed">{question?.questionText || 'جاري التحميل...'}</p>
          <div className="bg-background/40 p-6 rounded-2xl border border-dashed border-primary/10">
             <p className="text-[10px] text-primary font-black mb-2 flex items-center gap-2 justify-end">إجابة الطالب <CheckCircle className="w-3 h-3" /></p>
             <p className="font-black text-base">
                {answer.questionType === 'MCQ' 
                  ? <OptionText courseId={attempt.courseId} examId={attempt.courseContentId} questionId={answer.questionId} optionId={answer.mcqSelectedOptionId} /> 
                  : (answer.essayAnswerText || <span className="opacity-20 italic">لا توجد إجابة مكتوبة</span>)}
             </p>
          </div>
       </div>

       <div className="flex flex-wrap gap-3 items-center pt-4 border-t border-white/5">
          <div className="space-y-1">
             <Label className="text-[9px] font-black opacity-40">الدرجة المستحقة</Label>
             <Input type="number" value={answer.scoreAchieved} onChange={(e) => handleUpdate({scoreAchieved: Number(e.target.value)})} className="w-28 text-center font-black h-12 rounded-xl bg-background" />
          </div>
          <div className="flex gap-2 mt-auto">
            <Button variant="outline" onClick={() => handleUpdate({isCorrect: true, scoreAchieved: answer.maxPoints})} className="h-12 px-6 rounded-xl text-accent border-accent/20 hover:bg-accent/10 font-black">صح ✓</Button>
            <Button variant="outline" onClick={() => handleUpdate({isCorrect: false, scoreAchieved: 0})} className="h-12 px-6 rounded-xl text-destructive border-destructive/20 hover:bg-destructive/10 font-black">خطأ ✗</Button>
          </div>
          <div className="mr-auto text-left">
             <p className="text-[10px] font-bold text-muted-foreground">من أصل: {answer.maxPoints} درجة</p>
          </div>
       </div>
    </div>
  );
}

function OptionText({ courseId, examId, questionId, optionId }: any) {
  const firestore = useFirestore();
  const oRef = useMemoFirebase(() => (firestore && optionId) ? doc(firestore, 'courses', courseId, 'content', examId, 'questions', questionId, 'options', optionId) : null, [firestore, optionId, courseId, examId, questionId]);
  const { data: option } = useDoc(oRef);
  return <span>{option?.optionText || '...'}</span>;
}
