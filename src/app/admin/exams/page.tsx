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
  RefreshCw
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
    allowInstantResults: true,
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

  const toggleVisibility = async (exam: any) => {
    if (!firestore) return;
    try {
      await updateDoc(doc(firestore, 'courses', exam.courseId, 'content', exam.id), {
        isVisible: !exam.isVisible
      });
      toast({ title: exam.isVisible ? "تم إخفاء الامتحان" : "تم إظهار الامتحان" });
    } catch (e) { console.error(e); }
  };

  const toggleInstantResults = async (exam: any) => {
    if (!firestore) return;
    try {
      await updateDoc(doc(firestore, 'courses', exam.courseId, 'content', exam.id), {
        allowInstantResultsDisplay: !exam.allowInstantResultsDisplay
      });
      toast({ title: "تم تحديث إعدادات النتائج" });
    } catch (e) { console.error(e); }
  };

  const handleDownloadAnswerKey = async (exam: any) => {
    if (!firestore) return;
    try {
      const qRef = collection(firestore, 'courses', exam.courseId, 'content', exam.id, 'questions');
      const qSnap = await getDocs(qRef);
      
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      let html = `
        <html dir="rtl">
        <head>
          <title>نموذج إجابة: ${exam.title}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; }
            .q { border-bottom: 2px solid #eee; padding: 30px 0; }
            .ans { color: #16a34a; font-weight: bold; }
            .points { color: #666; font-size: 0.8em; }
            .q-img { max-width: 300px; margin: 15px 0; border-radius: 8px; border: 1px solid #ddd; }
            h1 { color: #000; border-bottom: 4px solid #facc15; padding-bottom: 10px; }
          </style>
        </head>
        <body>
          <h1>نموذج الإجابة الرسمي: ${exam.title}</h1>
          <p>الكورس: ${courses?.find(c => c.id === exam.courseId)?.title}</p>
      `;

      for (const qDoc of qSnap.docs) {
        const q = qDoc.data();
        html += `
          <div class="q">
            <h3>${q.questionText} <span class="points">(${q.points} نقطة)</span></h3>
            ${q.questionImageUrl ? `<img src="${q.questionImageUrl}" class="q-img" />` : ''}
        `;
        
        if (q.questionType === 'MCQ') {
          const optsRef = collection(firestore, 'courses', exam.courseId, 'content', exam.id, 'questions', qDoc.id, 'options');
          const optsSnap = await getDocs(optsRef);
          html += `<ul>`;
          optsSnap.forEach(o => {
            const opt = o.data();
            html += `<li class="${opt.isCorrect ? 'ans' : ''}">${opt.optionText} ${opt.isCorrect ? '(✓ الإجابة الصحيحة)' : ''}</li>`;
          });
          html += `</ul>`;
        } else {
          html += `<p class="ans">سؤال مقالي - يتطلب تصحيحاً يدوياً من المعلم.</p>`;
        }
        html += `</div>`;
      }
      html += `
          <div style="margin-top: 50px; text-align: center; font-size: 0.7em; color: #999;">
            صنع بكل فخر بواسطة: Mohamed Alaa - منصة البشمهندس التعليمية
          </div>
        </body></html>
      `;

      printWindow.document.write(html);
      printWindow.document.close();
      setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
    } catch (e) { console.error(e); }
  };

  if (isUserLoading) return <div className="flex justify-center py-20"><Loader2 className="w-10 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="text-right">
          <h1 className="text-4xl font-headline font-bold mb-2">إدارة الاختبارات</h1>
          <p className="text-muted-foreground">تحكم في ظهور الاختبارات، عرض النتائج، وإدارة الأسئلة بدقة.</p>
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
              <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-xl">
                 <Label className="font-bold">إظهار النتائج للطالب فوراً</Label>
                 <Switch checked={formData.allowInstantResults} onCheckedChange={(v) => setFormData({...formData, allowInstantResults: v})} />
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
              <p className="text-xl">يرجى اختيار كورس من القائمة لعرض الاختبارات المرتبطة به.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {exams.map((exam) => (
                <Card key={exam.id} className="relative overflow-hidden group border-primary/10 hover:border-primary/40 transition-all shadow-lg rounded-3xl bg-secondary/5">
                  <div className={`absolute top-0 right-0 w-2 h-full transition-colors ${exam.isVisible ? 'bg-accent' : 'bg-destructive/50'}`} />
                  <CardContent className="p-6 space-y-5 text-right">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex gap-2">
                        <Badge variant={exam.isVisible ? "default" : "destructive"} className="text-[10px] font-bold">
                          {exam.isVisible ? "ظاهر للطلاب" : "مخفي الآن"}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] font-bold border-primary/20">
                          {exam.allowInstantResultsDisplay ? "نتائج فورية" : "نتائج مؤجلة"}
                        </Badge>
                      </div>
                      <h3 className="font-black text-lg line-clamp-1">{exam.title}</h3>
                    </div>

                    <div className="flex flex-col gap-3">
                       <Button className="w-full bg-primary font-bold h-12 rounded-xl shadow-lg" onClick={() => setSelectedExamForQuestions(exam)}>إدارة الأسئلة والمحتوى</Button>
                       <div className="grid grid-cols-2 gap-2">
                          <Button variant="outline" className="gap-2 h-11 rounded-xl text-xs font-bold" onClick={() => toggleVisibility(exam)}>
                             {exam.isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                             {exam.isVisible ? "إخفاء" : "إظهار"}
                          </Button>
                          <Button variant="outline" className="gap-2 h-11 rounded-xl text-xs font-bold" onClick={() => toggleInstantResults(exam)}>
                             <RefreshCw className="w-4 h-4" />
                             {exam.allowInstantResultsDisplay ? "تأجيل النتائج" : "تفعيل النتائج"}
                          </Button>
                       </div>
                       <Button variant="outline" className="w-full gap-2 h-11 rounded-xl font-bold border-dashed hover:bg-primary/5" onClick={() => handleDownloadAnswerKey(exam)}>
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
        <DialogContent className="max-w-4xl bg-card h-[90vh] overflow-hidden flex flex-col p-0 text-right rounded-[2.5rem] border-primary/20">
          <DialogHeader className="p-6 border-b bg-secondary/5 flex flex-row-reverse items-center justify-between">
            <DialogTitle className="flex items-center gap-2 justify-end text-2xl font-black">إدارة أسئلة: {selectedExamForQuestions?.title}</DialogTitle>
          </DialogHeader>
          <div className="flex-grow overflow-y-auto p-8 bg-background/50">
             {selectedExamForQuestions && <QuestionManager exam={selectedExamForQuestions} />}
          </div>
          <DialogFooter className="p-4 border-t bg-secondary/5">
            <Button onClick={() => setSelectedExamForQuestions(null)} className="w-full font-bold h-12 rounded-xl">حفظ وإغلاق</Button>
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
      toast({ title: "تمت إضافة السؤال بنجاح" });
      setNewQ({ text: '', type: 'MCQ', points: '10', imageUrl: '' });
    } catch (e) { console.error(e); } finally { setIsAdding(false); }
  };

  const handleDeleteQuestion = async (qId: string) => {
    if (!firestore || !exam) return;
    if (!confirm("🚨 تحذير: هل أنت متأكد من حذف هذا السؤال نهائياً؟")) return;
    try {
      await deleteDoc(doc(firestore, 'courses', exam.courseId, 'content', exam.id, 'questions', qId));
      toast({ title: "تم الحذف من السيرفر" });
    } catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-8">
      <Card className="bg-secondary/10 border-dashed border-primary/30 p-8 space-y-6 rounded-[2rem]">
        <h4 className="font-black text-xl text-primary text-right flex items-center gap-2 justify-end">
           إضافة سؤال جديد <Plus className="w-5 h-5" />
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-right">
          <div className="space-y-2">
             <Label className="font-bold">نص السؤال</Label>
             <Input className="text-right h-14 rounded-xl bg-background" placeholder="اكتب السؤال هنا..." value={newQ.text} onChange={(e) => setNewQ({...newQ, text: e.target.value})} />
          </div>
          <div className="space-y-2">
             <Label className="font-bold">رابط الصورة (اختياري)</Label>
             <div className="relative">
                <ImageIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input className="text-right h-14 rounded-xl pr-10 bg-background" placeholder="رابط مباشر للصورة" value={newQ.imageUrl} onChange={(e) => setNewQ({...newQ, imageUrl: e.target.value})} />
             </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
             <Label className="font-bold">نوع السؤال</Label>
             <Select value={newQ.type} onValueChange={(v) => setNewQ({...newQ, type: v})}>
               <SelectTrigger className="h-14 rounded-xl bg-background"><SelectValue /></SelectTrigger>
               <SelectContent>
                 <SelectItem value="MCQ">اختيار من متعدد (MCQ)</SelectItem>
                 <SelectItem value="Essay">سؤال مقالي (Essay)</SelectItem>
               </SelectContent>
             </Select>
          </div>
          <div className="space-y-2">
             <Label className="font-bold">عدد النقاط</Label>
             <Input type="number" className="h-14 rounded-xl text-center bg-background" value={newQ.points} onChange={(e) => setNewQ({...newQ, points: e.target.value})} placeholder="النقاط" />
          </div>
          <div className="flex items-end">
             <Button onClick={handleAddQuestion} disabled={isAdding || !newQ.text} className="h-14 w-full bg-primary font-black rounded-xl text-lg shadow-xl shadow-primary/20 transition-transform active:scale-95">
                {isAdding ? <Loader2 className="w-6 h-6 animate-spin" /> : "إضافة للسيرفر"}
             </Button>
          </div>
        </div>
        {newQ.imageUrl && (
          <div className="mt-4 p-4 bg-background border rounded-2xl">
             <p className="text-xs font-bold mb-2 text-muted-foreground">معاينة الصورة:</p>
             <img src={newQ.imageUrl} className="max-h-40 rounded-lg mx-auto" alt="Preview" />
          </div>
        )}
      </Card>

      <div className="space-y-6">
        <h3 className="font-black text-lg border-r-4 border-primary pr-3">قائمة الأسئلة الحالية:</h3>
        {isLoading ? (
          <div className="py-20 text-center"><Loader2 className="w-10 animate-spin mx-auto text-primary" /></div>
        ) : questions?.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground italic border-2 border-dashed rounded-3xl">لا توجد أسئلة مضافة بعد.</div>
        ) : (
          questions?.map((q, idx) => (
            <Card key={q.id} className="p-8 text-right relative hover:border-primary/40 transition-all bg-background shadow-md rounded-[2rem] group">
              <div className="flex justify-between items-center mb-6">
                 <div className="flex gap-2">
                    <Badge className="bg-primary/10 text-primary border-none font-bold">{q.points} نقطة</Badge>
                    <Badge variant="secondary" className="text-[10px] uppercase">{q.questionType}</Badge>
                 </div>
                 <Button variant="ghost" size="icon" className="text-destructive h-10 w-10 opacity-0 group-hover:opacity-100 transition-opacity rounded-full hover:bg-destructive/10" onClick={() => handleDeleteQuestion(q.id)}>
                    <Trash2 className="w-5 h-5" />
                 </Button>
              </div>
              <p className="font-bold text-xl leading-relaxed mb-6">{idx + 1}. {q.questionText}</p>
              
              {q.questionImageUrl && (
                <div className="mb-6 rounded-2xl overflow-hidden border border-primary/5 bg-secondary/5 p-2">
                   <img src={q.questionImageUrl} alt="Question" className="max-h-[300px] mx-auto object-contain rounded-xl" />
                </div>
              )}

              {q.questionType === 'MCQ' && <MCQOptionsManager exam={exam} question={q} />}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

function MCQOptionsManager({ exam, question }: any) {
  const firestore = useFirestore();
  const [newOpt, setNewOpt] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const optionsRef = useMemoFirebase(() => collection(firestore, 'courses', exam.courseId, 'content', exam.id, 'questions', question.id, 'options'), [firestore, exam, question]);
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
    } catch (e) { console.error(e); } finally { setIsAdding(false); }
  };

  const setCorrect = async (optId: string) => {
    if (!firestore || !options) return;
    for (const opt of options) {
      await updateDoc(doc(firestore, 'courses', exam.courseId, 'content', exam.id, 'questions', question.id, 'options', opt.id), { 
        isCorrect: opt.id === optId 
      });
    }
  };

  const deleteOption = async (optId: string) => {
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, 'courses', exam.courseId, 'content', exam.id, 'questions', question.id, 'options', optId));
    } catch (e) { console.error(e); }
  };

  return (
    <div className="mt-4 pt-6 border-t border-dashed border-primary/10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {options?.map(opt => (
          <div key={opt.id} className={`flex flex-row-reverse items-center justify-between p-4 rounded-2xl border-2 transition-all ${opt.isCorrect ? 'border-accent bg-accent/10' : 'border-secondary bg-background hover:border-primary/20'}`}>
             <div className="flex items-center gap-3 flex-row-reverse">
                <button 
                  onClick={() => setCorrect(opt.id)} 
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${opt.isCorrect ? 'bg-accent border-accent scale-110' : 'border-muted-foreground/30 hover:border-primary'}`}
                >
                  {opt.isCorrect && <CheckCircle2 className="w-4 h-4 text-white" />}
                </button>
                <span className={`text-sm font-bold ${opt.isCorrect ? 'text-accent' : ''}`}>{opt.optionText}</span>
             </div>
             <Button variant="ghost" size="icon" className="text-destructive h-8 w-8 hover:bg-destructive/10 rounded-full" onClick={() => deleteOption(opt.id)}>
                <Trash2 className="w-4 h-4" />
             </Button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Input 
          className="text-right h-12 bg-secondary/20 border-primary/10 rounded-xl font-bold" 
          placeholder="أدخل اختياراً جديداً..." 
          value={newOpt} 
          onChange={(e) => setNewOpt(e.target.value)} 
          onKeyDown={(e) => e.key === 'Enter' && handleAddOption()} 
        />
        <Button onClick={handleAddOption} disabled={isAdding || !newOpt} className="bg-primary px-8 h-12 rounded-xl font-black">
          {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : "إضافة"}
        </Button>
      </div>
    </div>
  );
}
