
"use client";

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { 
  Plus, 
  Clock, 
  Loader2, 
  Trash2, 
  Settings2,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  FileDown,
  Printer,
  ImageIcon,
  RefreshCw,
  MessageCircle,
  Smartphone
} from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, addDoc, serverTimestamp, deleteDoc, doc, query, orderBy, updateDoc, getDocs, collectionGroup, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { sendWhatsAppMessage, formatExamResultMessage } from '@/lib/whatsapp-utils';

export default function AdminExams() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  
  const [isAdding, setIsAdding] = useState(false);
  const [selectedExamForQuestions, setSelectedExamForQuestions] = useState<any>(null);
  const [activeCourseId, setActiveCourseId] = useState<string>('');
  const [isBatchSending, setIsBatchSending] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    courseId: '',
    title: '',
    description: '',
    contentType: 'Quiz',
    passMark: '50',
    durationMinutes: '30',
    allowInstantResults: true,
    isVisible: true 
  });

  const coursesRef = useMemoFirebase(() => (firestore ? collection(firestore, 'courses') : null), [firestore]);
  const { data: courses } = useCollection(coursesRef);
  
  const examsRef = useMemoFirebase(() => 
    activeCourseId ? collection(firestore, 'courses', activeCourseId, 'content') : null
  , [firestore, activeCourseId]);

  const { data: allContent, isLoading: isExamsLoading } = useCollection(examsRef);

  const exams = useMemo(() => {
    return allContent?.filter(item => item.contentType === 'Quiz' || item.contentType === 'Exam') || [];
  }, [allContent]);

  const handleAddExam = async () => {
    if (!firestore || !user || !formData.courseId || !formData.title) return;
    setIsAdding(true);
    try {
      await addDoc(collection(firestore, 'courses', formData.courseId, 'content'), {
        courseId: formData.courseId,
        title: formData.title,
        description: formData.description,
        contentType: formData.contentType,
        passMarkPercentage: Number(formData.passMark),
        durationMinutes: Number(formData.durationMinutes),
        allowInstantResultsDisplay: formData.allowInstantResults,
        isVisible: formData.isVisible,
        orderIndex: Date.now(),
        createdAt: serverTimestamp(),
        course_uploadedByAdminUserId: user.uid
      });
      toast({ title: "تم النشر بنجاح" });
      setIsAdding(false);
    } catch (e) { console.error(e); setIsAdding(false); }
  };

  const handleDeleteExam = async (exam: any) => {
    if (!firestore) return;
    const confirmed = window.confirm(`🚨 تحذير نهائي: مسح اختبار "${exam.title}"؟`);
    if (!confirmed) return;
    await deleteDoc(doc(firestore, 'courses', exam.courseId, 'content', exam.id));
    toast({ title: "تم الحذف" });
  };

  const handleSendBatchResults = async (exam: any) => {
    if (!firestore) return;
    setIsBatchSending(exam.id);
    try {
      // 1. جلب كافة المحاولات لهذا الاختبار
      const attemptsRef = collectionGroup(firestore, 'quiz_attempts');
      const q = query(attemptsRef, where('courseContentId', '==', exam.id), where('isGraded', '==', true));
      const snap = await getDocs(q);

      if (snap.empty) {
        toast({ variant: "destructive", title: "لا توجد نتائج", description: "لم يتم تصحيح أي محاولات لهذا الاختبار بعد." });
        setIsBatchSending(null);
        return;
      }

      // 2. جلب أرقام هواتف الطلاب
      const studentsRef = collection(firestore, 'students');
      const studentsSnap = await getDocs(studentsRef);
      const studentMap: any = {};
      studentsSnap.forEach(d => { studentMap[d.id] = d.data(); });

      // 3. فتح أول محادثة وتجهيز القائمة للمسؤول
      const firstAttempt = snap.docs[0].data();
      const firstStudent = studentMap[firstAttempt.studentId];
      
      if (firstStudent) {
        const msg = formatExamResultMessage(firstStudent.name, exam.title, firstAttempt.score, firstAttempt.pointsAchieved, firstAttempt.totalPoints);
        sendWhatsAppMessage(firstStudent.studentPhoneNumber, msg);
        toast({ 
          title: `تم تجهيز ${snap.size} نتيجة`, 
          description: "تم فتح أول محادثة، يرجى الانتقال لمركز الواتساب لإرسال البقية جماعياً إذا أردت." 
        });
      }
    } catch (e) { console.error(e); } finally { setIsBatchSending(null); }
  };

  if (isUserLoading) return <div className="flex justify-center py-20"><Loader2 className="w-10 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 text-right">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-headline font-bold mb-2">إدارة الاختبارات المتقدمة</h1>
          <p className="text-muted-foreground">تحكم في ظهور الاختبارات، عرض النتائج، ومراسلة الطلاب بالدرجات.</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="h-14 px-8 bg-primary text-primary-foreground font-bold rounded-xl gap-2 text-lg shadow-xl">
              <Plus className="w-6 h-6" /> اختبار جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card text-right">
            <DialogHeader><DialogTitle className="text-2xl font-bold text-right">إنشاء اختبار جديد</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4 text-right">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>الكورس</Label>
                  <Select value={formData.courseId} onValueChange={(v) => setFormData({...formData, courseId: v})}>
                    <SelectTrigger className="bg-background"><SelectValue placeholder="اختر" /></SelectTrigger>
                    <SelectContent>
                      {courses?.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>الوقت (دقائق)</Label>
                  <Input type="number" value={formData.durationMinutes} onChange={(e) => setFormData({...formData, durationMinutes: e.target.value})} className="bg-background text-right" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>عنوان الاختبار</Label>
                <Input placeholder="عنوان الاختبار" className="text-right" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddExam} disabled={isAdding} className="w-full h-12 bg-primary font-bold">نشر الاختبار</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-card border-primary/10 shadow-xl overflow-hidden rounded-[2.5rem]">
        <CardHeader className="border-b bg-secondary/10 flex flex-row-reverse items-center justify-between p-6">
            <Select value={activeCourseId} onValueChange={setActiveCourseId}>
              <SelectTrigger className="w-64 bg-background text-right h-12 rounded-xl"><SelectValue placeholder="اختر كورس لعرض امتحاناته" /></SelectTrigger>
              <SelectContent>
                {courses?.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
              </SelectContent>
            </Select>
            <Badge variant="outline" className="border-primary/20 text-primary px-4 py-1.5 rounded-full font-bold">إجمالي الاختبارات: {exams.length}</Badge>
        </CardHeader>
        <CardContent className="p-8">
          {!activeCourseId ? (
            <div className="text-center py-24 text-muted-foreground italic flex flex-col items-center gap-4">
              <Settings2 className="w-16 h-16 opacity-10" />
              <p className="text-xl">يرجى اختيار كورس لعرض الاختبارات.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {exams.map((exam) => (
                <Card key={exam.id} className="relative overflow-hidden group border-primary/10 hover:border-primary/40 transition-all shadow-lg rounded-3xl bg-secondary/5">
                  <div className={`absolute top-0 right-0 w-2 h-full transition-colors ${exam.isVisible ? 'bg-accent' : 'bg-destructive/50'}`} />
                  <CardContent className="p-6 space-y-5 text-right">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10 rounded-md" onClick={() => handleDeleteExam(exam)}><Trash2 className="w-3.5 h-3.5" /></Button>
                        <Badge variant={exam.isVisible ? "default" : "destructive"} className="text-[10px] font-bold">{exam.isVisible ? "ظاهر" : "مخفي"}</Badge>
                      </div>
                      <h3 className="font-black text-lg line-clamp-1">{exam.title}</h3>
                    </div>

                    <div className="flex flex-col gap-3">
                       <Button className="w-full bg-primary font-bold h-12 rounded-xl shadow-lg" onClick={() => setSelectedExamForQuestions(exam)}>إدارة الأسئلة</Button>
                       
                       <Button 
                         variant="outline" 
                         className="w-full gap-2 h-11 rounded-xl font-bold border-accent/20 text-accent hover:bg-accent/5"
                         disabled={isBatchSending === exam.id}
                         onClick={() => handleSendBatchResults(exam)}
                       >
                         {isBatchSending === exam.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
                         إرسال النتائج للكل (واتساب)
                       </Button>

                       <Button variant="outline" className="w-full gap-2 h-11 rounded-xl font-bold border-dashed" onClick={() => updateDoc(doc(firestore!, 'courses', exam.courseId, 'content', exam.id), { isVisible: !exam.isVisible })}>
                          {exam.isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          {exam.isVisible ? "إخفاء عن الطلاب" : "إظهار للطلاب"}
                       </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedExamForQuestions} onOpenChange={() => setSelectedExamForQuestions(null)}>
        <DialogContent className="max-w-4xl bg-card h-[90vh] overflow-hidden flex flex-col p-0 text-right rounded-[2.5rem]">
          <DialogHeader className="p-6 border-b bg-secondary/5">
            <DialogTitle className="text-2xl font-black text-right">إدارة أسئلة: {selectedExamForQuestions?.title}</DialogTitle>
          </DialogHeader>
          <div className="flex-grow overflow-y-auto p-8 bg-background/50">
             {selectedExamForQuestions && <QuestionManager exam={selectedExamForQuestions} />}
          </div>
          <DialogFooter className="p-4 border-t bg-secondary/5">
            <Button onClick={() => setSelectedExamForQuestions(null)} className="w-full font-bold h-12 rounded-xl">إغلاق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function QuestionManager({ exam }: { exam: any }) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [isAdding, setIsAdding] = useState(false);
  const [newQ, setNewQ] = useState({ text: '', type: 'MCQ', points: '10', imageUrl: '' });

  const questionsRef = useMemoFirebase(() => (firestore && exam) ? query(collection(firestore, 'courses', exam.courseId, 'content', exam.id, 'questions'), orderBy('orderIndex', 'asc')) : null, [firestore, exam]);
  const { data: questions, isLoading } = useCollection(questionsRef);

  const handleAddQuestion = async () => {
    if (!firestore || !exam || !newQ.text || !user) return;
    setIsAdding(true);
    try {
      await addDoc(collection(firestore, 'courses', exam.courseId, 'content', exam.id, 'questions'), {
        courseId: exam.courseId,
        courseContentId: exam.id,
        questionText: newQ.text,
        questionType: newQ.type,
        points: Number(newQ.points) || 10,
        questionImageUrl: newQ.imageUrl,
        orderIndex: (questions?.length || 0) + 1,
        createdAt: serverTimestamp()
      });
      toast({ title: "تمت إضافة السؤال" });
      setNewQ({ text: '', type: 'MCQ', points: '10', imageUrl: '' });
    } catch (e) { console.error(e); } finally { setIsAdding(false); }
  };

  return (
    <div className="space-y-8">
      <Card className="bg-secondary/10 border-dashed border-primary/30 p-6 space-y-4 rounded-3xl">
        <h4 className="font-black text-lg text-primary text-right">إضافة سؤال جديد</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-right">
          <div className="space-y-1"><Label>نص السؤال</Label><Input className="text-right" value={newQ.text} onChange={(e) => setNewQ({...newQ, text: e.target.value})} /></div>
          <div className="space-y-1"><Label>رابط الصورة</Label><Input className="text-right" value={newQ.imageUrl} onChange={(e) => setNewQ({...newQ, imageUrl: e.target.value})} /></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select value={newQ.type} onValueChange={(v) => setNewQ({...newQ, type: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="MCQ">MCQ</SelectItem><SelectItem value="Essay">Essay</SelectItem></SelectContent></Select>
          <Input type="number" value={newQ.points} onChange={(e) => setNewQ({...newQ, points: e.target.value})} placeholder="النقاط" className="text-center" />
          <Button onClick={handleAddQuestion} disabled={isAdding || !newQ.text} className="bg-primary font-black rounded-xl h-10">{isAdding ? "جاري..." : "إضافة"}</Button>
        </div>
      </Card>

      <div className="space-y-4">
        {questions?.map((q, idx) => (
          <Card key={q.id} className="p-6 text-right relative bg-background shadow-sm rounded-2xl group">
            <div className="flex justify-between items-center mb-4">
               <Badge className="bg-primary/10 text-primary border-none">{q.points} نقطة</Badge>
               <Button variant="ghost" size="icon" className="text-destructive h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => deleteDoc(doc(firestore!, 'courses', exam.courseId, 'content', exam.id, 'questions', q.id))}><Trash2 className="w-4 h-4" /></Button>
            </div>
            <p className="font-bold text-lg">{idx + 1}. {q.questionText}</p>
            {q.questionImageUrl && <img src={q.questionImageUrl} alt="" className="max-h-32 rounded-xl mt-4 mx-auto" />}
            {q.questionType === 'MCQ' && <MCQOptionsManager exam={exam} question={q} />}
          </Card>
        ))}
      </div>
    </div>
  );
}

function MCQOptionsManager({ exam, question }: any) {
  const firestore = useFirestore();
  const [newOpt, setNewOpt] = useState('');
  const optionsRef = useMemoFirebase(() => collection(firestore!, 'courses', exam.courseId, 'content', exam.id, 'questions', question.id, 'options'), [firestore, exam, question]);
  const { data: options } = useCollection(optionsRef);

  return (
    <div className="mt-4 pt-4 border-t border-dashed border-primary/10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
        {options?.map(opt => (
          <div key={opt.id} className={`flex flex-row-reverse items-center justify-between p-3 rounded-xl border-2 transition-all ${opt.isCorrect ? 'border-accent bg-accent/5' : 'border-secondary'}`}>
             <div className="flex items-center gap-2 flex-row-reverse">
                <button onClick={() => {
                  options.forEach(o => updateDoc(doc(firestore!, 'courses', exam.courseId, 'content', exam.id, 'questions', question.id, 'options', o.id), { isCorrect: o.id === opt.id }));
                }} className={`w-5 h-5 rounded-full border-2 ${opt.isCorrect ? 'bg-accent border-accent' : 'border-muted'}`} />
                <span className="text-xs font-bold">{opt.optionText}</span>
             </div>
             <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteDoc(doc(firestore!, 'courses', exam.courseId, 'content', exam.id, 'questions', question.id, 'options', opt.id))}><Trash2 className="w-3 h-3" /></Button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Input className="text-right h-10 bg-secondary/10" placeholder="خيار جديد..." value={newOpt} onChange={(e) => setNewOpt(e.target.value)} />
        <Button onClick={async () => {
          if(!newOpt) return;
          await addDoc(collection(firestore!, 'courses', exam.courseId, 'content', exam.id, 'questions', question.id, 'options'), { optionText: newOpt, isCorrect: false });
          setNewOpt('');
        }} className="bg-primary h-10 rounded-lg font-bold">إضافة</Button>
      </div>
    </div>
  );
}
