
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
  Megaphone,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Image as ImageIcon
} from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, addDoc, serverTimestamp, deleteDoc, doc, query, orderBy, updateDoc } from 'firebase/firestore';
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
    } catch (e) {
      console.error(e);
      setIsAdding(false);
    }
  };

  const toggleVisibility = async (exam: any) => {
    if (!firestore) return;
    try {
      const examRef = doc(firestore, 'courses', exam.courseId, 'content', exam.id);
      await updateDoc(examRef, { isVisible: !exam.isVisible });
      toast({ title: exam.isVisible ? "تم الإخفاء" : "تم التفعيل", description: "تم تحديث ظهور الاختبار للطلاب." });
    } catch (e) { console.error(e); }
  };

  const handleDeleteExam = async (exam: any) => {
    if (!firestore) return;
    if (!confirm(`هل أنت متأكد من حذف اختبار "${exam.title}" نهائياً؟`)) return;
    try {
      await deleteDoc(doc(firestore, 'courses', exam.courseId, 'content', exam.id));
      toast({ title: "تم الحذف بنجاح" });
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
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 text-right">
                  <Label>الكورس</Label>
                  <Select value={formData.courseId} onValueChange={(v) => setFormData({...formData, courseId: v})}>
                    <SelectTrigger className="bg-background"><SelectValue placeholder="اختر" /></SelectTrigger>
                    <SelectContent>
                      {courses?.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 text-right">
                  <Label>الوقت (دقائق)</Label>
                  <Input type="number" value={formData.durationMinutes} onChange={(e) => setFormData({...formData, durationMinutes: e.target.value})} className="bg-background text-right" />
                </div>
              </div>
              <div className="space-y-2 text-right">
                <Label>عنوان الاختبار</Label>
                <Input placeholder="عنوان الاختبار" className="text-right" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} />
              </div>
              <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-xl">
                 <Switch checked={formData.isVisible} onCheckedChange={(v) => setFormData({...formData, isVisible: v})} />
                 <span className="text-sm font-bold">تفعيل الظهور فوراً للطلاب</span>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddExam} disabled={isAdding} className="w-full h-12 bg-primary font-bold">نشر الآن</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-card">
        <CardHeader className="border-b bg-secondary/10">
          <div className="flex flex-row-reverse items-center justify-between">
            <Select value={activeCourseId} onValueChange={setActiveCourseId}>
              <SelectTrigger className="w-64 bg-background text-right"><SelectValue placeholder="اختر كورس لعرض امتحاناته" /></SelectTrigger>
              <SelectContent>
                {courses?.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
              </SelectContent>
            </Select>
            <Badge variant="outline" className="border-primary/20 text-primary">إجمالي الاختبارات: {exams.length}</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {!activeCourseId ? (
            <div className="text-center py-20 text-muted-foreground italic">يرجى اختيار كورس من القائمة لعرض الاختبارات المرتبطة به.</div>
          ) : isExamsLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-10 animate-spin text-primary" /></div>
          ) : exams.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground italic">لا توجد اختبارات في هذا الكورس حتى الآن.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {exams.map((exam) => (
                <Card key={exam.id} className="relative overflow-hidden group border-primary/10 hover:border-primary/40 transition-all shadow-md">
                  <div className={`absolute top-0 right-0 w-2 h-full ${exam.isVisible ? 'bg-accent' : 'bg-muted'}`} />
                  <CardContent className="p-6 space-y-4 text-right">
                    <div className="flex justify-between items-start">
                      <Badge variant={exam.isVisible ? "default" : "secondary"}>
                         {exam.isVisible ? "ظاهر للطلاب" : "مخفي حالياً"}
                      </Badge>
                      <h3 className="font-bold text-lg">{exam.title}</h3>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 pt-2">
                       <Button variant="outline" size="sm" className="gap-1 rounded-xl font-bold" onClick={() => toggleVisibility(exam)}>
                          {exam.isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />} 
                          {exam.isVisible ? "إخفاء" : "إظهار"}
                       </Button>
                       <Button variant="outline" size="sm" className="gap-1 rounded-xl text-destructive hover:bg-destructive/10 font-bold" onClick={() => handleDeleteExam(exam)}>
                          <Trash2 className="w-4 h-4" /> حذف
                       </Button>
                    </div>

                    <Button className="w-full bg-primary text-primary-foreground font-bold mt-2 h-11 rounded-xl shadow-lg shadow-primary/20" onClick={() => setSelectedExamForQuestions(exam)}>
                      <Settings2 className="w-4 h-4 ml-2" /> إدارة الأسئلة
                    </Button>
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
            <DialogTitle className="flex items-center gap-2 justify-end text-2xl font-black">
              <Settings2 className="w-6 h-6 text-primary" /> إدارة أسئلة: {selectedExamForQuestions?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-grow overflow-y-auto p-8 bg-background/50">
             {selectedExamForQuestions && <QuestionManager exam={selectedExamForQuestions} />}
          </div>
          <DialogFooter className="p-4 border-t bg-card">
            <Button onClick={() => setSelectedExamForQuestions(null)} className="w-full font-bold">إغلاق النافذة</Button>
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
  const [newQ, setNewQ] = useState({
    text: '',
    type: 'MCQ',
    points: '10',
    imageUrl: ''
  });

  const questionsRef = useMemoFirebase(() => {
    if (!firestore || !exam) return null;
    return query(
      collection(firestore, 'courses', exam.courseId, 'content', exam.id, 'questions'),
      orderBy('orderIndex', 'asc')
    );
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
    } catch (e) {
      console.error(e);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteQuestion = async (qId: string) => {
    if (!firestore || !exam) return;
    if (!confirm("حذف السؤال؟ سيؤدي ذلك لمسح كافة خياراته أيضاً.")) return;
    try {
      await deleteDoc(doc(firestore, 'courses', exam.courseId, 'content', exam.id, 'questions', qId));
      toast({ title: "تم حذف السؤال بنجاح" });
    } catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-8">
      <Card className="bg-secondary/10 border-dashed border-primary/20 rounded-2xl overflow-hidden">
        <CardContent className="p-6 space-y-5">
          <h4 className="font-black text-lg flex items-center gap-2 justify-end text-primary">
            <Plus className="w-5 h-5" /> إضافة سؤال جديد
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-right">
            <div className="space-y-2">
              <Label className="font-bold">نص السؤال</Label>
              <Input className="text-right bg-background h-12" placeholder="اكتب السؤال هنا..." value={newQ.text} onChange={(e) => setNewQ({...newQ, text: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label className="font-bold">رابط صورة توضيحية (اختياري)</Label>
              <Input className="text-right bg-background h-12" placeholder="ألصق رابط الصورة المباشر" value={newQ.imageUrl} onChange={(e) => setNewQ({...newQ, imageUrl: e.target.value})} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-right">
            <div className="space-y-2">
              <Label className="font-bold">نوع السؤال</Label>
              <Select value={newQ.type} onValueChange={(v) => setNewQ({...newQ, type: v})}>
                <SelectTrigger className="text-right h-12 bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MCQ">اختيار من متعدد (MCQ)</SelectItem>
                  <SelectItem value="Essay">سؤال مقالي (Essay)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-bold">درجة السؤال</Label>
              <Input type="number" className="text-right h-12 bg-background" value={newQ.points} onChange={(e) => setNewQ({...newQ, points: e.target.value})} />
            </div>
            <div className="flex items-end">
              <Button onClick={handleAddQuestion} disabled={isAdding || !newQ.text} className="w-full bg-primary text-primary-foreground font-black h-12 rounded-xl shadow-lg">
                {isAdding ? <Loader2 className="w-5 h-5 animate-spin" /> : "إضافة للسيرفر فوراً"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <h3 className="text-xl font-black border-r-4 border-primary pr-3 flex flex-row-reverse items-center gap-2 justify-start">
          الأسئلة الحالية <Badge variant="secondary">{questions?.length || 0}</Badge>
        </h3>
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
        ) : !questions || questions.length === 0 ? (
          <div className="text-center py-20 bg-secondary/5 rounded-3xl border-2 border-dashed border-primary/10">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="text-muted-foreground font-bold italic">لا توجد أسئلة مضافة لهذا الاختبار.</p>
          </div>
        ) : (
          questions.map((q, idx) => (
            <QuestionItem key={q.id} q={q} exam={exam} index={idx} onDelete={() => handleDeleteQuestion(q.id)} />
          ))
        )}
      </div>
    </div>
  );
}

function QuestionItem({ q, exam, index, onDelete }: any) {
  return (
    <Card className="bg-card hover:border-primary/30 transition-all group overflow-hidden border-primary/5 shadow-md">
      <CardHeader className="bg-secondary/5 py-3 border-b flex flex-row-reverse justify-between items-center px-6">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-primary font-black border-primary/20">سؤال {index + 1}</Badge>
          <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">{q.points} نقطة</Badge>
        </div>
        <div className="flex items-center gap-2">
           <span className="text-[10px] font-bold text-muted-foreground px-2 py-0.5 bg-secondary rounded uppercase">{q.questionType}</span>
           <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 rounded-full h-8 w-8" onClick={onDelete}>
              <Trash2 className="w-4 h-4" />
           </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6 text-right space-y-5">
        <div className="flex flex-row-reverse gap-4">
           {q.questionImageUrl && (
            <div className="relative w-32 h-32 bg-secondary rounded-2xl overflow-hidden shrink-0 border border-white/5">
              <img src={q.questionImageUrl} alt="" className="w-full h-full object-cover" />
            </div>
           )}
           <p className="font-bold text-lg leading-relaxed flex-grow">{q.questionText}</p>
        </div>
        
        {q.questionType === 'MCQ' && (
          <MCQOptionsManager exam={exam} question={q} />
        )}
      </CardContent>
    </Card>
  );
}

function MCQOptionsManager({ exam, question }: any) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isAdding, setIsAdding] = useState(false);
  const [newOpt, setNewOpt] = useState('');

  const optionsRef = useMemoFirebase(() => {
    if (!firestore || !exam || !question) return null;
    return collection(firestore, 'courses', exam.courseId, 'content', exam.id, 'questions', question.id, 'options');
  }, [firestore, exam, question]);

  const { data: options } = useCollection(optionsRef);

  const handleAddOption = async () => {
    if (!firestore || !newOpt) return;
    setIsAdding(true);
    try {
      await addDoc(collection(firestore, 'courses', exam.courseId, 'content', exam.id, 'questions', question.id, 'options'), {
        optionText: newOpt,
        isCorrect: false,
        questionId: question.id,
        courseId: exam.courseId,
        courseContentId: exam.id,
        questionType: 'MCQ'
      });
      setNewOpt('');
    } catch (e) { console.error(e); }
    finally { setIsAdding(false); }
  };

  const setCorrect = async (optId: string) => {
    if (!firestore || !options) return;
    try {
      for (const opt of options) {
        const ref = doc(firestore, 'courses', exam.courseId, 'content', exam.id, 'questions', question.id, 'options', opt.id);
        await updateDoc(ref, { isCorrect: opt.id === optId });
      }
      toast({ title: "تم تعيين الإجابة الصحيحة" });
    } catch (e) { console.error(e); }
  };

  const deleteOpt = async (optId: string) => {
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, 'courses', exam.courseId, 'content', exam.id, 'questions', question.id, 'options', optId));
    } catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-4 mt-6 border-t border-dashed border-primary/10 pt-6">
      <div className="flex flex-row-reverse items-center justify-between">
        <p className="text-sm font-black text-primary flex items-center gap-2">خيارات الإجابة <CheckCircle2 className="w-4 h-4" /></p>
        <span className="text-[9px] text-muted-foreground italic">اختر الدائرة لتحديد الإجابة الصحيحة</span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {options?.map((opt: any) => (
          <div key={opt.id} className={`flex flex-row-reverse items-center justify-between p-4 rounded-2xl border-2 transition-all group ${opt.isCorrect ? 'bg-accent/10 border-accent/50' : 'bg-background border-white/5 hover:border-primary/20'}`}>
            <div className="flex flex-row-reverse items-center gap-4">
              <button 
                onClick={() => setCorrect(opt.id)}
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${opt.isCorrect ? 'bg-accent border-accent text-white scale-110 shadow-lg shadow-accent/20' : 'border-muted-foreground hover:border-primary'}`}
              >
                {opt.isCorrect && <CheckCircle2 className="w-4 h-4" />}
              </button>
              <span className={`text-sm ${opt.isCorrect ? 'font-black text-accent' : 'font-medium'}`}>{opt.optionText}</span>
            </div>
            <Button variant="ghost" size="icon" className="text-destructive h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => deleteOpt(opt.id)}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        ))}
      </div>
      
      <div className="flex gap-2 mt-4 bg-secondary/10 p-2 rounded-2xl">
        <Input 
          className="text-right h-11 bg-background border-none" 
          placeholder="أضف خياراً جديداً واضغط Enter..." 
          value={newOpt} 
          onChange={(e) => setNewOpt(e.target.value)} 
          onKeyDown={(e) => e.key === 'Enter' && handleAddOption()}
        />
        <Button size="sm" onClick={handleAddOption} disabled={isAdding || !newOpt} className="bg-primary text-primary-foreground font-bold px-6 h-11 rounded-xl">إضافة</Button>
      </div>
    </div>
  );
}
