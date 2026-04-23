
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
  RefreshCw,
  XCircle,
  Save,
  MessageCircle,
  FileText
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
    toast({ title: "تم الاعتماد", description: `النتيجة: ${finalPercent}%` });
    setSelectedAttempt({...attempt, isGraded: true, score: finalPercent, pointsAchieved: totalScore, totalPoints: totalPoints});
  };

  if (isUserLoading) return <div className="flex justify-center py-20"><Loader2 className="w-10 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 text-right">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-headline font-bold mb-2">مركز التصحيح الذكي</h1>
          <p className="text-muted-foreground">راجع إجابات الطلاب بالأسماء الرباعية وأرسل النتائج فوراً.</p>
        </div>
        <div className="bg-primary/10 text-primary px-4 py-2 rounded-xl flex items-center gap-2"><RefreshCw className="w-4 h-4 animate-spin-slow" /><span className="text-xs font-black">{filteredAttempts.length} محاولة</span></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-1 bg-card border-primary/10 rounded-3xl overflow-hidden h-fit">
          <CardHeader className="bg-secondary/5 p-4 border-b">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input placeholder="ابحث بالاسم الرباعي..." className="w-full bg-background rounded-xl h-11 pr-10 text-right text-xs font-bold" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </CardHeader>
          <CardContent className="p-0 max-h-[70vh] overflow-y-auto">
             {filteredAttempts.map(a => (
               <button key={a.id} onClick={() => setSelectedAttempt(a)} className={`w-full p-4 text-right border-b hover:bg-primary/5 transition-all ${selectedAttempt?.id === a.id ? 'bg-primary/10 border-r-4 border-primary' : ''}`}>
                 <div className="flex justify-between items-center"><span className="text-xs font-black">{studentMap[a.studentId]?.name || 'جاري التحميل...'}</span><Badge variant={a.isGraded ? 'default' : 'secondary'} className="text-[8px]">{a.isGraded ? 'تم' : 'مراجعة'}</Badge></div>
               </button>
             ))}
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          {selectedAttempt ? (
            <AttemptDetails key={selectedAttempt.id} attempt={selectedAttempt} studentInfo={studentMap[selectedAttempt.studentId]} onRelease={handleReleaseGrades} />
          ) : (
            <Card className="h-64 flex flex-col items-center justify-center border-2 border-dashed rounded-[2.5rem] bg-secondary/5 opacity-30"><ClipboardList className="w-12 h-12 mb-4" /><p className="font-black">اختر محاولة للبدء</p></Card>
          )}
        </div>
      </div>
    </div>
  );
}

function AttemptDetails({ attempt, studentInfo, onRelease }: any) {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const answersRef = useMemoFirebase(() => (firestore && attempt) ? collection(firestore, 'students', attempt.studentId, 'quiz_attempts', attempt.id, 'answers') : null, [firestore, attempt]);
  const { data: answers, isLoading } = useCollection(answersRef);

  const examRef = useMemoFirebase(() => (firestore && attempt.courseId && attempt.courseContentId) ? doc(firestore, 'courses', attempt.courseId, 'content', attempt.courseContentId) : null, [firestore, attempt]);
  const { data: examData } = useDoc(examRef);

  const handleSendToBoth = () => {
    if (!studentInfo || !examData) return;
    const msg = formatExamResultMessage(studentInfo.name, examData.title, attempt.score, attempt.pointsAchieved, attempt.totalPoints);
    sendWhatsAppMessage(studentInfo.studentPhoneNumber, msg);
    setTimeout(() => sendWhatsAppMessage(studentInfo.parentPhoneNumber, msg), 1500);
    toast({ title: "جاري الإرسال للطرفين" });
  };

  return (
    <Card className="bg-card border-primary/20 rounded-[2.5rem] overflow-hidden">
      <CardHeader className="bg-secondary/10 flex flex-col md:flex-row md:items-center justify-between p-8 border-b gap-4">
        <div className="text-right"><CardTitle className="text-3xl font-black text-primary">{attempt.score}%</CardTitle><p className="text-xs font-bold text-muted-foreground">النقاط: {attempt.pointsAchieved}/{attempt.totalPoints}</p></div>
        <div className="flex flex-wrap gap-2">
           <Button onClick={handleSendToBoth} variant="outline" className="h-12 px-6 rounded-xl border-accent/20 text-accent font-black gap-2"><MessageCircle className="w-5 h-5" /> إرسال للطرفين (واتساب)</Button>
           <Button onClick={() => onRelease(attempt)} className="bg-accent text-white font-black h-12 px-8 rounded-xl shadow-lg shadow-accent/20 gap-2"><Save className="w-5 h-5" /> اعتماد النتيجة</Button>
        </div>
      </CardHeader>
      <CardContent className="p-8 space-y-8">
        {isLoading ? <Loader2 className="w-10 animate-spin mx-auto text-primary" /> : 
          answers?.map((ans, i) => <AnswerRow key={ans.id} index={i} answer={ans} attempt={attempt} />)
        }
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
    <div className="p-6 bg-secondary/5 rounded-3xl border border-white/5 text-right space-y-4">
       <div className="flex justify-between"><Badge variant="outline">سؤال {index+1}</Badge><span className="text-[10px] font-black">{answer.questionType === 'MCQ' ? 'اختياري' : 'مقالي'}</span></div>
       <div className="p-4 bg-background/50 rounded-2xl border border-dashed">
          <p className="font-bold mb-3">{question?.questionText || 'جاري التحميل...'}</p>
          <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
             <p className="text-[9px] text-primary font-black mb-1">إجابة الطالب:</p>
             <p className="font-black text-sm">{answer.questionType === 'MCQ' ? <OptionText courseId={attempt.courseId} examId={attempt.courseContentId} questionId={answer.questionId} optionId={answer.mcqSelectedOptionId} /> : answer.essayAnswerText}</p>
          </div>
       </div>
       <div className="flex gap-2 items-center">
          <Input type="number" value={answer.scoreAchieved} onChange={(e) => handleUpdate({scoreAchieved: Number(e.target.value)})} className="w-24 text-center font-black h-12 rounded-xl" />
          <Button variant="outline" onClick={() => handleUpdate({isCorrect: true, scoreAchieved: answer.maxPoints})} className="h-12 px-4 rounded-xl text-accent"><CheckCircle className="w-4 h-4" /> صح</Button>
          <Button variant="outline" onClick={() => handleUpdate({isCorrect: false, scoreAchieved: 0})} className="h-12 px-4 rounded-xl text-destructive"><XCircle className="w-4 h-4" /> خطأ</Button>
       </div>
    </div>
  );
}

function OptionText({ courseId, examId, questionId, optionId }: any) {
  const firestore = useFirestore();
  const oRef = useMemoFirebase(() => (firestore && optionId) ? doc(firestore, 'courses', courseId, 'content', examId, 'questions', questionId, 'options', optionId) : null, [firestore, optionId, courseId, examId, questionId]);
  const { data: option } = useDoc(oRef);
  return <span>{option?.optionText || 'جاري تحميل الاختيار...'}</span>;
}
