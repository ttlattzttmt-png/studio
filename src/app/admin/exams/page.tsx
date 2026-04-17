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
  Printer
} from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, addDoc, serverTimestamp, deleteDoc, doc, query, orderBy, updateDoc, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export default function AdminExams() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  
  const [isAdding, setIsAdding] = useState(false);
  const [selectedExamForQuestions, setSelectedExamForQuestions] = useState<any>(null);
  const [activeCourseId, setActiveCourseId] = useState<string>('');
  
  const [formData, setFormData] = useState({
    courseId: '',
    title: '',
    description: '',
    contentType: 'Quiz',
    passMark: '50',
    durationMinutes: '30',
    allowInstantResults: false,
    isVisible: true 
  });

  const coursesRef = useMemoFirebase(() => collection(firestore, 'courses'), [firestore]);
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
      toast({ title: "تم النشر", description: "تم إنشاء الاختبار بنجاح." });
      setIsAdding(false);
    } catch (e) { console.error(e); setIsAdding(false); }
  };

  const handleDownloadAnswerKey = async (exam: any) => {
    if (!firestore) return;
    try {
      const qRef = collection(firestore, 'courses', exam.courseId, 'content', exam.id, 'questions');
      const qSnap = await getDocs(qRef);
      
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      let html = `<html dir="rtl"><head><title>نموذج إجابة: ${exam.title}</title>
      <style>body { font-family: sans-serif; padding: 40px; } .q { border-bottom: 1px solid #eee; padding: 20px 0; } .ans { color: green; font-weight: bold; }</style>
      </head><body><h1>نموذج إجابة رسمي: ${exam.title}</h1>`;

      for (const qDoc of qSnap.docs) {
        const q = qDoc.data();
        html += `<div class="q"><h3>${q.questionText} (${q.points} نقطة)</h3>`;
        if (q.questionType === 'MCQ') {
          const optsRef = collection(firestore, 'courses', exam.courseId, 'content', exam.id, 'questions', qDoc.id, 'options');
          const optsSnap = await getDocs(optsRef);
          html += `<ul>`;
          optsSnap.forEach(o => {
            const opt = o.data();
            html += `<li class="${opt.isCorrect ? 'ans' : ''}">${opt.optionText} ${opt.isCorrect ? '(الإجابة الصحيحة)' : ''}</li>`;
          });
          html += `</ul>`;
        } else {
          html += `<p class="ans">سؤال مقالي - يتطلب تصحيح يدوي من المعلم.</p>`;
        }
        html += `</div>`;
      }
      html += `</body></html>`;

      printWindow.document.write(html);
      printWindow.document.close();
      setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
    } catch (e) { console.error(e); }
  };

  if (isUserLoading) return <div className="flex justify-center py-20"><Loader2 className="w-10 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="text-right">
          <h1 className="text-4xl font-headline font-bold mb-2">إدارة الاختبارات</h1>
          <p className="text-muted-foreground">تحكم في ظهور الاختبارات، الوقت، والأسئلة لجميع الطلاب.</p>
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
              <Button onClick={handleAddExam} disabled={isAdding} className="w-full h-12 bg-primary font-bold">نشر الآن</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-card">
        <CardHeader className="border-b bg-secondary/10 flex flex-row-reverse items-center justify-between">
            <Select value={activeCourseId} onValueChange={setActiveCourseId}>
              <SelectTrigger className="w-64 bg-background text-right"><SelectValue placeholder="اختر كورس لعرض امتحاناته" /></SelectTrigger>
              <SelectContent>
                {courses?.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
              </SelectContent>
            </Select>
            <Badge variant="outline" className="border-primary/20 text-primary">إجمالي الاختبارات: {exams.length}</Badge>
        </CardHeader>
        <CardContent className="p-6">
          {!activeCourseId ? (
            <div className="text-center py-20 text-muted-foreground italic">يرجى اختيار كورس من القائمة لعرض الاختبارات المرتبطة به.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {exams.map((exam) => (
                <Card key={exam.id} className="relative overflow-hidden group border-primary/10 hover:border-primary/40 transition-all shadow-md">
                  <div className={`absolute top-0 right-0 w-2 h-full ${exam.isVisible ? 'bg-accent' : 'bg-muted'}`} />
                  <CardContent className="p-6 space-y-4 text-right">
                    <div className="flex justify-between items-start">
                      <Badge variant={exam.isVisible ? "default" : "secondary"}>{exam.isVisible ? "ظاهر" : "مخفي"}</Badge>
                      <h3 className="font-bold text-lg">{exam.title}</h3>
                    </div>
                    <div className="grid grid-cols-1 gap-2 pt-2">
                       <Button className="w-full bg-primary font-bold h-11 rounded-xl" onClick={() => setSelectedExamForQuestions(exam)}>إدارة الأسئلة</Button>
                       <Button variant="outline" className="w-full gap-2 h-11 rounded-xl" onClick={() => handleDownloadAnswerKey(exam)}>
                          <FileDown className="w-4 h-4" /> نموذج الإجابة PDF
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
            <DialogTitle className="flex items-center gap-2 justify-end text-2xl font-black">إدارة أسئلة: {selectedExamForQuestions?.title}</DialogTitle>
          </DialogHeader>
          <div className="flex-grow overflow-y-auto p-8 bg-background/50">
             {selectedExamForQuestions && <QuestionManager exam={selectedExamForQuestions} />}
          </div>
          <DialogFooter className="p-4 border-t"><Button onClick={() => setSelectedExamForQuestions(null)} className="w-full font-bold">إغلاق</Button></DialogFooter>
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

  const questionsRef = useMemoFirebase(() => {
    if (!firestore || !exam) return null;
    return query(collection(firestore, 'courses', exam.courseId, 'content', exam.id, 'questions'), orderBy('orderIndex', 'asc'));
  }, [firestore, exam]);
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
        createdAt: serverTimestamp(),
        course_uploadedByAdminUserId: user.uid
      });
      toast({ title: "تمت إضافة السؤال" });
      setNewQ({ text: '', type: 'MCQ', points: '10', imageUrl: '' });
    } catch (e) { console.error(e); } finally { setIsAdding(false); }
  };

  const handleDeleteQuestion = async (qId: string) => {
    if (!firestore || !exam) return;
    if (!confirm("حذف السؤال نهائياً؟")) return;
    try {
      await deleteDoc(doc(firestore, 'courses', exam.courseId, 'content', exam.id, 'questions', qId));
      toast({ title: "تم الحذف" });
    } catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-8">
      <Card className="bg-secondary/10 border-dashed border-primary/20 p-6 space-y-4">
        <h4 className="font-black text-lg text-primary text-right">إضافة سؤال جديد</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-right">
          <Input className="text-right h-12" placeholder="نص السؤال" value={newQ.text} onChange={(e) => setNewQ({...newQ, text: e.target.value})} />
          <Input className="text-right h-12" placeholder="رابط صورة (اختياري)" value={newQ.imageUrl} onChange={(e) => setNewQ({...newQ, imageUrl: e.target.value})} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select value={newQ.type} onValueChange={(v) => setNewQ({...newQ, type: v})}>
            <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="MCQ">اختيار من متعدد (MCQ)</SelectItem>
              <SelectItem value="Essay">سؤال مقالي (Essay)</SelectItem>
            </SelectContent>
          </Select>
          <Input type="number" className="h-12 text-center" value={newQ.points} onChange={(e) => setNewQ({...newQ, points: e.target.value})} placeholder="النقاط" />
          <Button onClick={handleAddQuestion} disabled={isAdding || !newQ.text} className="h-12 bg-primary font-black">إضافة للسيرفر</Button>
        </div>
      </Card>
      {isLoading ? <Loader2 className="w-10 animate-spin mx-auto text-primary" /> : 
      questions?.map((q, idx) => (
        <Card key={q.id} className="p-6 text-right relative hover:border-primary/30 transition-all">
          <div className="flex justify-between items-center mb-4">
             <Badge className="bg-primary/10 text-primary">{q.points} نقطة</Badge>
             <div className="flex gap-2">
                <span className="text-[10px] font-bold text-muted-foreground bg-secondary px-2 py-0.5 rounded">{q.questionType}</span>
                <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => handleDeleteQuestion(q.id)}><Trash2 className="w-4 h-4" /></Button>
             </div>
          </div>
          <p className="font-bold text-lg mb-4">{idx + 1}. {q.questionText}</p>
          {q.questionType === 'MCQ' && <MCQOptionsManager exam={exam} question={q} />}
        </Card>
      ))}
    </div>
  );
}

function MCQOptionsManager({ exam, question }: any) {
  const firestore = useFirestore();
  const [newOpt, setNewOpt] = useState('');
  const optionsRef = useMemoFirebase(() => collection(firestore, 'courses', exam.courseId, 'content', exam.id, 'questions', question.id, 'options'), [firestore, exam, question]);
  const { data: options } = useCollection(optionsRef);

  const handleAddOption = async () => {
    if (!firestore || !newOpt) return;
    try {
      await addDoc(collection(firestore, 'courses', exam.courseId, 'content', exam.id, 'questions', question.id, 'options'), {
        optionText: newOpt, isCorrect: false, questionId: question.id, courseId: exam.courseId, courseContentId: exam.id, questionType: 'MCQ'
      });
      setNewOpt('');
    } catch (e) { console.error(e); }
  };

  const setCorrect = async (optId: string) => {
    if (!firestore || !options) return;
    for (const opt of options) {
      await updateDoc(doc(firestore, 'courses', exam.courseId, 'content', exam.id, 'questions', question.id, 'options', opt.id), { isCorrect: opt.id === optId });
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-dashed">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        {options?.map(opt => (
          <div key={opt.id} className={`flex flex-row-reverse items-center justify-between p-3 rounded-xl border-2 ${opt.isCorrect ? 'border-accent bg-accent/5' : 'border-secondary'}`}>
             <button onClick={() => setCorrect(opt.id)} className={`w-5 h-5 rounded-full border-2 ${opt.isCorrect ? 'bg-accent border-accent' : 'border-muted'}`} />
             <span className="text-sm px-2 flex-grow">{opt.optionText}</span>
             <Button variant="ghost" size="icon" className="text-destructive h-7 w-7" onClick={() => deleteDoc(doc(firestore, 'courses', exam.courseId, 'content', exam.id, 'questions', question.id, 'options', opt.id))}><Trash2 className="w-3.5 h-3.5" /></Button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Input className="text-right h-10 bg-secondary/20" placeholder="أضف خياراً..." value={newOpt} onChange={(e) => setNewOpt(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddOption()} />
        <Button onClick={handleAddOption} className="bg-primary px-6 h-10">إضافة</Button>
      </div>
    </div>
  );
}
