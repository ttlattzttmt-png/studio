
"use client";

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  Loader2, 
  Trash2, 
  Settings2,
  Eye,
  EyeOff,
  Zap,
  Clock,
  CheckCircle2,
  Circle,
  X,
  ImageIcon,
  Image as ImageIconLucide
} from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, addDoc, serverTimestamp, deleteDoc, doc, query, updateDoc, getDocs, collectionGroup, where, orderBy } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { sendAutomatedMessage, formatExamResultMessage } from '@/lib/whatsapp-utils';

export default function AdminExams() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  
  const [isAdding, setIsAdding] = useState(false);
  const [selectedExamForQuestions, setSelectedExamForQuestions] = useState<any>(null);
  const [activeCourseId, setActiveCourseId] = useState<string>('');
  
  const [isBatchSending, setIsBatchSending] = useState<string | null>(null);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  
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

  const configRef = useMemoFirebase(() => (firestore ? doc(firestore, 'admin_config', 'whatsapp') : null), [firestore]);
  const { data: whatsappConfig } = useDoc(configRef);

  const coursesRef = useMemoFirebase(() => (firestore ? collection(firestore, 'courses') : null), [firestore]);
  const { data: courses } = useCollection(coursesRef);
  
  const examsRef = useMemoFirebase(() => 
    activeCourseId ? collection(firestore, 'courses', activeCourseId, 'content') : null
  , [firestore, activeCourseId]);

  const { data: allContent } = useCollection(examsRef);

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
    const confirmed = window.confirm(`🚨 تحذير نهائي: هل أنت متأكد من مسح اختبار "${exam.title}"؟ سيمسح ذلك كافة نتائج الطلاب المرتبطة به أيضاً.`);
    if (!confirmed) return;
    await deleteDoc(doc(firestore, 'courses', exam.courseId, 'content', exam.id));
    toast({ title: "تم الحذف النهائي" });
  };

  const handleSendBatchResults = async (exam: any) => {
    if (!firestore || isBatchSending) return;
    setIsBatchSending(exam.id);
    
    try {
      const attemptsRef = collectionGroup(firestore, 'quiz_attempts');
      const q = query(attemptsRef, where('courseContentId', '==', exam.id), where('isGraded', '==', true));
      const snap = await getDocs(q);

      if (snap.empty) {
        toast({ variant: "destructive", title: "لا توجد نتائج", description: "لم يتم تصحيح أي محاولات لهذا الاختبار بعد." });
        setIsBatchSending(null);
        return;
      }

      const studentsRef = collection(firestore, 'students');
      const studentsSnap = await getDocs(studentsRef);
      const studentMap: any = {};
      studentsSnap.forEach(d => { studentMap[d.id] = d.data(); });

      const attempts = snap.docs.map(d => ({ id: d.id, ...d.data() as any }));
      setBatchProgress({ current: 0, total: attempts.length });

      for (let i = 0; i < attempts.length; i++) {
        const attempt = attempts[i];
        const student = studentMap[attempt.studentId];
        setBatchProgress(p => ({ ...p, current: i + 1 }));

        if (student) {
          const msg = formatExamResultMessage(student.name, exam.title, attempt.score, attempt.pointsAchieved, attempt.totalPoints);
          await sendAutomatedMessage(student.studentPhoneNumber, msg, whatsappConfig as any);
          await sendAutomatedMessage(student.parentPhoneNumber, msg, whatsappConfig as any);
        }

        if (i < attempts.length - 1) {
          await new Promise(r => setTimeout(r, 7000));
        }
      }

      toast({ title: "اكتمل الإرسال الآلي", description: `تم إرسال ${attempts.length} نتيجة بنجاح للطلاب وأولياء الأمور.` });
    } catch (e) { 
      console.error(e);
      toast({ variant: "destructive", title: "خطأ في الإرسال الجماعي" });
    } finally { 
      setIsBatchSending(null); 
    }
  };

  if (isUserLoading) return <div className="flex justify-center py-20"><Loader2 className="w-10 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 text-right">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-headline font-bold mb-2">إدارة الاختبارات الاحترافية</h1>
          <p className="text-muted-foreground font-bold italic">تحكم في ظهور الاختبارات، تعديل الأسئلة، ومراسلة النتائج آلياً.</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="h-14 px-8 bg-primary text-primary-foreground font-bold rounded-2xl gap-2 text-lg shadow-xl">
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
                <Input placeholder="مثال: امتحان الفصل الأول - فيزياء" className="text-right" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddExam} disabled={isAdding} className="w-full h-12 bg-primary font-bold">نشر الاختبار للمنصة</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-card border-primary/10 shadow-xl overflow-hidden rounded-[2.5rem]">
        <CardHeader className="border-b bg-secondary/10 flex flex-row-reverse items-center justify-between p-6">
            <Select value={activeCourseId} onValueChange={setActiveCourseId}>
              <SelectTrigger className="w-64 bg-background text-right h-12 rounded-xl font-bold border-primary/10"><SelectValue placeholder="اختر كورس لعرض امتحاناته" /></SelectTrigger>
              <SelectContent>
                {courses?.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
              </SelectContent>
            </Select>
            <Badge variant="outline" className="border-primary/20 text-primary px-4 py-1.5 rounded-full font-black">إجمالي الاختبارات: {exams.length}</Badge>
        </CardHeader>
        <CardContent className="p-8">
          {!activeCourseId ? (
            <div className="text-center py-24 text-muted-foreground italic flex flex-col items-center gap-4">
              <Settings2 className="w-20 h-20 opacity-5" />
              <p className="text-xl font-bold">يرجى اختيار كورس من القائمة لعرض الاختبارات والتحكم بها.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {exams.map((exam) => (
                <Card key={exam.id} className="relative overflow-hidden group border-primary/10 hover:border-primary/40 transition-all shadow-lg rounded-3xl bg-secondary/5">
                  <div className={`absolute top-0 right-0 w-2 h-full transition-colors ${exam.isVisible ? 'bg-accent' : 'bg-destructive/50'}`} />
                  <CardContent className="p-7 space-y-5 text-right">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10 rounded-full" onClick={() => handleDeleteExam(exam)}><Trash2 className="w-4 h-4" /></Button>
                        <Badge variant={exam.isVisible ? "default" : "destructive"} className="text-[9px] font-black h-5">{exam.isVisible ? "ظاهر" : "مخفي"}</Badge>
                      </div>
                      <h3 className="font-black text-lg line-clamp-1 flex-grow pr-2">{exam.title}</h3>
                    </div>

                    {isBatchSending === exam.id && (
                      <div className="space-y-2 animate-in fade-in duration-300">
                         <div className="flex justify-between text-[10px] font-black text-primary">
                            <span>جاري إرسال النتائج: {batchProgress.current} / {batchProgress.total}</span>
                            <span>{Math.round((batchProgress.current/batchProgress.total)*100)}%</span>
                         </div>
                         <Progress value={(batchProgress.current/batchProgress.total)*100} className="h-2" />
                      </div>
                    )}

                    <div className="flex flex-col gap-3">
                       <Button className="w-full bg-primary font-black h-12 rounded-xl shadow-lg active:scale-95 transition-transform" onClick={() => setSelectedExamForQuestions(exam)}>إدارة الأسئلة</Button>
                       
                       <Button 
                         variant="outline" 
                         className="w-full gap-2 h-11 rounded-xl font-black border-accent/20 text-accent hover:bg-accent/5"
                         disabled={!!isBatchSending}
                         onClick={() => handleSendBatchResults(exam)}
                       >
                         {isBatchSending === exam.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                         {isBatchSending === exam.id ? "جاري الإرسال الآلي..." : "إرسال النتائج للكل (واتساب)"}
                       </Button>

                       <Button variant="outline" className="w-full gap-2 h-11 rounded-xl font-bold border-dashed border-primary/20" onClick={() => updateDoc(doc(firestore!, 'courses', exam.courseId, 'content', exam.id), { isVisible: !exam.isVisible })}>
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
        <DialogContent className="max-w-4xl bg-card border-primary/20 max-h-[90vh] overflow-y-auto rounded-[2.5rem]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-right">إدارة أسئلة: {selectedExamForQuestions?.title}</DialogTitle>
          </DialogHeader>
          <div className="py-6">
            <QuestionManager exam={selectedExamForQuestions} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function QuestionManager({ exam }: { exam: any }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isAdding, setIsAdding] = useState(false);
  const [newQuestion, setNewQuestion] = useState({ 
    text: '', 
    type: 'MCQ', 
    points: '1', 
    imageUrl: '',
    options: ['', '', '', ''], 
    correctIndex: 0 
  });

  const questionsRef = useMemoFirebase(() => 
    exam ? query(collection(firestore, 'courses', exam.courseId, 'content', exam.id, 'questions'), orderBy('orderIndex', 'asc')) : null
  , [firestore, exam]);

  const { data: questions, isLoading } = useCollection(questionsRef);

  const handleAddQuestion = async () => {
    if (!firestore || !exam || !newQuestion.text) return;
    setIsAdding(true);
    try {
      const qRef = await addDoc(collection(firestore, 'courses', exam.courseId, 'content', exam.id, 'questions'), {
        questionText: newQuestion.text,
        questionType: newQuestion.type,
        points: Number(newQuestion.points),
        imageUrl: newQuestion.imageUrl || null,
        orderIndex: (questions?.length || 0) + 1,
        createdAt: serverTimestamp()
      });

      if (newQuestion.type === 'MCQ') {
        for (let i = 0; i < 4; i++) {
          await addDoc(collection(firestore, 'courses', exam.courseId, 'content', exam.id, 'questions', qRef.id, 'options'), {
            optionText: newQuestion.options[i],
            isCorrect: i === newQuestion.correctIndex,
            orderIndex: i
          });
        }
      }

      toast({ title: "تمت إضافة السؤال بنجاح" });
      setNewQuestion({ text: '', type: 'MCQ', points: '1', imageUrl: '', options: ['', '', '', ''], correctIndex: 0 });
    } catch (e) { console.error(e); } finally { setIsAdding(false); }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!firestore || !exam) return;
    await deleteDoc(doc(firestore, 'courses', exam.courseId, 'content', exam.id, 'questions', id));
    toast({ title: "تم حذف السؤال" });
  };

  return (
    <div className="space-y-8 text-right">
      <Card className="bg-secondary/20 border-dashed border-primary/20 p-6 rounded-2xl">
        <h3 className="font-black mb-4 flex flex-row-reverse items-center gap-2 justify-start"><Plus className="w-5 h-5 text-primary" /> إضافة سؤال جديد</h3>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="space-y-2">
                <Label>نص السؤال</Label>
                <Input placeholder="اكتب السؤال هنا..." className="text-right" value={newQuestion.text} onChange={(e) => setNewQuestion({...newQuestion, text: e.target.value})} />
             </div>
             <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                   <Label>النوع</Label>
                   <Select value={newQuestion.type} onValueChange={(v) => setNewQuestion({...newQuestion, type: v})}>
                      <SelectTrigger className="text-right"><SelectValue /></SelectTrigger>
                      <SelectContent>
                         <SelectItem value="MCQ">اختيار من متعدد</SelectItem>
                         <SelectItem value="ESSAY">سؤال مقالي</SelectItem>
                      </SelectContent>
                   </Select>
                </div>
                <div className="space-y-2">
                   <Label>الدرجات</Label>
                   <Input type="number" className="text-center" value={newQuestion.points} onChange={(e) => setNewQuestion({...newQuestion, points: e.target.value})} />
                </div>
             </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 justify-end">رابط صورة السؤال (اختياري) <ImageIconLucide className="w-4 h-4 text-primary" /></Label>
            <Input 
              placeholder="ألصق رابط الصورة المباشر هنا (imgur, drive, etc.)" 
              className="text-right font-mono text-xs" 
              value={newQuestion.imageUrl} 
              onChange={(e) => setNewQuestion({...newQuestion, imageUrl: e.target.value})} 
            />
            {newQuestion.imageUrl && (
              <div className="mt-2 w-full max-h-40 rounded-xl border overflow-hidden bg-muted">
                <img src={newQuestion.imageUrl} alt="Preview" className="w-full h-full object-contain" />
              </div>
            )}
          </div>

          {newQuestion.type === 'MCQ' && (
            <div className="space-y-4 bg-background/50 p-4 rounded-xl border border-primary/5">
              <Label className="text-xs font-black">الاختيارات (وحدد الإجابة الصحيحة)</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[0,1,2,3].map(i => (
                  <div key={i} className="flex flex-row-reverse items-center gap-2">
                    <Input 
                      placeholder={`خيار ${i+1}`} 
                      className="text-right flex-grow h-10" 
                      value={newQuestion.options[i]} 
                      onChange={(e) => {
                        const opts = [...newQuestion.options];
                        opts[i] = e.target.value;
                        setNewQuestion({...newQuestion, options: opts});
                      }}
                    />
                    <Button 
                      variant={newQuestion.correctIndex === i ? "default" : "outline"}
                      className="w-10 h-10 p-0 rounded-lg shrink-0"
                      onClick={() => setNewQuestion({...newQuestion, correctIndex: i})}
                    >
                      {newQuestion.correctIndex === i ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-4 h-4" />}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button onClick={handleAddQuestion} disabled={isAdding || !newQuestion.text} className="w-full bg-primary font-black h-12 rounded-xl shadow-lg active:scale-95 transition-transform">إضافة السؤال للاختبار</Button>
        </div>
      </Card>

      <div className="space-y-4">
        {isLoading ? <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /> :
        !questions || questions.length === 0 ? <p className="text-center opacity-30 italic py-10">لا توجد أسئلة بعد.</p> :
        questions.map((q, idx) => (
          <div key={q.id} className="p-6 bg-card border border-primary/5 rounded-2xl flex flex-row-reverse items-center justify-between group hover:border-primary/20 transition-all shadow-sm">
             <div className="flex flex-row-reverse items-center gap-4">
                <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center font-black text-xs">{idx+1}</div>
                
                {q.imageUrl && (
                  <div className="w-16 h-16 rounded-lg bg-muted relative overflow-hidden shrink-0 border border-primary/10">
                    <img src={q.imageUrl} alt="preview" className="w-full h-full object-cover" />
                  </div>
                )}

                <div className="text-right min-w-0">
                   <p className="font-bold truncate max-w-[300px]">{q.questionText}</p>
                   <div className="flex flex-row-reverse gap-3 mt-1">
                      <Badge variant="outline" className="text-[8px] font-black">{q.questionType === 'MCQ' ? 'اختياري' : 'مقالي'}</Badge>
                      <span className="text-[9px] text-muted-foreground font-bold">{q.points} درجة</span>
                      {q.imageUrl && <span className="text-[8px] text-accent font-black flex items-center gap-1">يحتوي على صورة <ImageIcon className="w-2 h-2" /></span>}
                   </div>
                </div>
             </div>
             <Button variant="ghost" size="icon" className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDeleteQuestion(q.id)}>
               <Trash2 className="w-4 h-4" />
             </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
