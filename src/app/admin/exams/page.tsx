"use client";

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
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
  ClipboardList, 
  BookOpen, 
  Clock, 
  Loader2, 
  Trash2, 
  HelpCircle,
  CheckCircle2,
  Image as ImageIcon,
  Eye,
  Settings2,
  Upload,
  X
} from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, addDoc, serverTimestamp, deleteDoc, doc, query, orderBy, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

export default function AdminExams() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [isAdding, setIsAdding] = useState(false);
  const [selectedExamForQuestions, setSelectedExamForQuestions] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    courseId: '',
    title: '',
    description: '',
    contentType: 'Quiz',
    passMark: '50',
    allowInstantResults: true
  });

  const coursesRef = useMemoFirebase(() => firestore ? collection(firestore, 'courses') : null, [firestore]);
  const { data: courses } = useCollection(coursesRef);

  const [activeCourseId, setActiveCourseId] = useState<string>('');
  
  const examsRef = useMemoFirebase(() => {
    if (!firestore || !activeCourseId) return null;
    // استعلام بسيط لتجنب أخطاء الفهارس
    return collection(firestore, 'courses', activeCourseId, 'content');
  }, [firestore, activeCourseId]);

  const { data: allContent, isLoading: isExamsLoading } = useCollection(examsRef);

  const exams = useMemo(() => {
    if (!allContent) return [];
    return allContent.filter(item => item.contentType === 'Quiz' || item.contentType === 'Exam');
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
        allowInstantResultsDisplay: formData.allowInstantResults,
        orderIndex: Date.now(),
        createdAt: serverTimestamp(),
        course_uploadedByAdminUserId: user.uid
      });
      toast({ title: "تم إنشاء الاختبار", description: "يمكنك الآن إضافة الأسئلة." });
      setFormData({ ...formData, title: '', description: '' });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "خطأ", description: "فشل إنشاء الاختبار." });
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteExam = async (courseId: string, examId: string) => {
    if (!firestore) return;
    if (!confirm('هل تريد حذف هذا الاختبار نهائياً؟')) return;
    try {
      await deleteDoc(doc(firestore, 'courses', courseId, 'content', examId));
      toast({ title: "تم الحذف", description: "تم حذف الاختبار بنجاح." });
    } catch (e) { console.error(e); }
  };

  const toggleInstantResults = async (exam: any) => {
    if (!firestore) return;
    try {
      const ref = doc(firestore, 'courses', exam.courseId, 'content', exam.id);
      await updateDoc(ref, { allowInstantResultsDisplay: !exam.allowInstantResultsDisplay });
      toast({ title: "تم التحديث", description: "تم تغيير إعدادات عرض النتائج." });
    } catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-headline font-bold mb-2">بناء الاختبارات الاحترافي</h1>
          <p className="text-muted-foreground">تحكم كامل في الأسئلة المصورة والمقالية لحظياً.</p>
        </div>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button className="h-14 px-8 bg-primary text-primary-foreground font-bold rounded-xl gap-2 text-lg shadow-lg">
              <Plus className="w-6 h-6" /> اختبار جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card">
            <DialogHeader><DialogTitle className="text-2xl font-bold">إنشاء اختبار جديد</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-sm font-bold">اختر الكورس</Label>
                <Select value={formData.courseId} onValueChange={(v) => setFormData({...formData, courseId: v})}>
                  <SelectTrigger className="bg-background h-12"><SelectValue placeholder="اختر الكورس" /></SelectTrigger>
                  <SelectContent>
                    {courses?.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Input placeholder="عنوان الاختبار" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="h-12" />
              <Textarea placeholder="وصف الاختبار" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-bold">نوع الاختبار</Label>
                  <Select value={formData.contentType} onValueChange={(v) => setFormData({...formData, contentType: v})}>
                    <SelectTrigger className="bg-background h-12"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Quiz">كويز سريع</SelectItem>
                      <SelectItem value="Exam">امتحان شامل</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-bold">درجة النجاح %</Label>
                  <Input type="number" value={formData.passMark} onChange={(e) => setFormData({...formData, passMark: e.target.value})} className="h-12" />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-xl">
                <div className="space-y-0.5">
                  <Label className="text-base font-bold">إظهار النتيجة فوراً</Label>
                  <p className="text-xs text-muted-foreground">سيظهر للطالب درجته بمجرد التسليم.</p>
                </div>
                <Switch 
                  checked={formData.allowInstantResults} 
                  onCheckedChange={(v) => setFormData({...formData, allowInstantResults: v})} 
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddExam} disabled={isAdding || !formData.courseId} className="w-full h-12 bg-primary font-bold">حفظ ونشر الاختبار</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-card border-primary/10">
        <CardHeader className="border-b bg-secondary/10">
          <div className="flex items-center gap-4">
            <span className="text-sm font-bold">تصفية حسب الكورس:</span>
            <Select value={activeCourseId} onValueChange={setActiveCourseId}>
              <SelectTrigger className="w-64 bg-background"><SelectValue placeholder="اختر كورس لعرض امتحاناته" /></SelectTrigger>
              <SelectContent>
                {courses?.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {!activeCourseId ? (
            <div className="text-center py-20 text-muted-foreground">
              <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-10" />
              <p>يرجى اختيار كورس لعرض الاختبارات المرتبطة به.</p>
            </div>
          ) : isExamsLoading ? (
            <div className="text-center py-20"><Loader2 className="w-10 h-10 animate-spin mx-auto text-primary" /></div>
          ) : !exams || exams.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground border-2 border-dashed rounded-2xl">
              <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-10" />
              <p>لا توجد اختبارات في هذا الكورس بعد.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {exams.map((exam) => (
                <Card key={exam.id} className="bg-card hover:border-primary/20 transition-all group border-primary/5 relative overflow-hidden">
                  <div className={`absolute top-0 right-0 w-1.5 h-full ${exam.allowInstantResultsDisplay ? 'bg-accent' : 'bg-destructive'}`} />
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <ClipboardList className="w-6 h-6" />
                    </div>
                    <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => handleDeleteExam(exam.courseId, exam.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h3 className="text-xl font-bold truncate">{exam.title}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-1">{exam.description || 'بدون وصف'}</p>
                    </div>
                    
                    <div className="flex items-center justify-between p-2 rounded bg-secondary/10 border border-primary/5">
                      <span className="text-[10px] font-bold">النتائج الفورية:</span>
                      <Switch 
                        checked={exam.allowInstantResultsDisplay} 
                        onCheckedChange={() => toggleInstantResults(exam)}
                        className="scale-75"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button className="flex-grow bg-primary text-primary-foreground font-bold" onClick={() => setSelectedExamForQuestions(exam)}>إدارة الأسئلة</Button>
                      <Button variant="outline" className="border-primary/20 text-primary font-bold gap-2" onClick={() => window.location.href='/admin/exams/grading'}>
                        <Eye className="w-4 h-4" /> التصحيح
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
        <DialogContent className="max-w-5xl bg-card border-primary/20 h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="border-b p-6">
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Settings2 className="w-6 h-6 text-primary" /> تعديل أسئلة: {selectedExamForQuestions?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-grow overflow-y-auto p-6">
             {selectedExamForQuestions && <QuestionManager exam={selectedExamForQuestions} />}
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
    imageUrl: '',
    type: 'MCQ',
    points: '1',
    options: ['', '', '', ''],
    correctIndex: 0
  });

  const questionsRef = useMemoFirebase(() => {
    if (!firestore || !exam) return null;
    return collection(firestore, 'courses', exam.courseId, 'content', exam.id, 'questions');
  }, [firestore, exam]);

  const { data: questions, isLoading } = useCollection(questionsRef);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 800000) {
        toast({ variant: "destructive", title: "حجم كبير", description: "الصورة أكبر من 800 كيلوبايت." });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewQuestion({ ...newQuestion, imageUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddQuestion = async () => {
    if (!firestore || !exam || !newQuestion.text) return;
    setIsAdding(true);
    try {
      const qRef = await addDoc(collection(firestore, 'courses', exam.courseId, 'content', exam.id, 'questions'), {
        courseContentId: exam.id,
        questionText: newQuestion.text,
        questionImageUrl: newQuestion.imageUrl,
        questionType: newQuestion.type,
        points: Number(newQuestion.points),
        orderIndex: Date.now(),
        createdAt: serverTimestamp()
      });

      if (newQuestion.type === 'MCQ') {
        for (let i = 0; i < newQuestion.options.length; i++) {
          await addDoc(collection(firestore, 'courses', exam.courseId, 'content', exam.id, 'questions', qRef.id, 'options'), {
            questionId: qRef.id,
            optionText: newQuestion.options[i],
            isCorrect: i === newQuestion.correctIndex
          });
        }
      }

      toast({ title: "تمت الإضافة", description: "تمت إضافة السؤال بنجاح." });
      setNewQuestion({ text: '', imageUrl: '', type: 'MCQ', points: '1', options: ['', '', '', ''], correctIndex: 0 });
    } catch (e) {
      console.error(e);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteQuestion = async (qId: string) => {
    if (!firestore || !exam) return;
    try {
      await deleteDoc(doc(firestore, 'courses', exam.courseId, 'content', exam.id, 'questions', qId));
      toast({ title: "تم الحذف", description: "تم حذف السؤال بنجاح." });
    } catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-8">
      <Card className="bg-secondary/10 border-dashed border-primary/20">
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="font-bold flex items-center gap-2 text-primary"><Plus className="w-4 h-4" /> إضافة سؤال جديد</h4>
            <div className="flex gap-2">
              <Select value={newQuestion.type} onValueChange={(v) => setNewQuestion({...newQuestion, type: v})}>
                <SelectTrigger className="w-32 bg-background h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MCQ">اختياري</SelectItem>
                  <SelectItem value="Essay">مقالي</SelectItem>
                </SelectContent>
              </Select>
              <Input type="number" placeholder="نقاط" value={newQuestion.points} onChange={(e) => setNewQuestion({...newQuestion, points: e.target.value})} className="w-20 h-10 bg-background" />
            </div>
          </div>

          <div className="space-y-4">
             <Textarea 
              placeholder="اكتب نص السؤال..." 
              value={newQuestion.text} 
              onChange={(e) => setNewQuestion({...newQuestion, text: e.target.value})}
              className="bg-background min-h-[100px]"
            />
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <Button 
                  variant="outline" 
                  className="h-12 border-dashed border-primary/30 flex-grow gap-2"
                  onClick={() => document.getElementById('question-image-upload')?.click()}
                >
                  <Upload className="w-4 h-4" /> {newQuestion.imageUrl ? "تغيير الصورة" : "إرفاق صورة للسؤال"}
                </Button>
                {newQuestion.imageUrl && (
                  <Button variant="ghost" size="icon" onClick={() => setNewQuestion({...newQuestion, imageUrl: ''})} className="text-destructive h-12 w-12">
                    <X className="w-5 h-5" />
                  </Button>
                )}
              </div>
              <input id="question-image-upload" type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
              {newQuestion.imageUrl && (
                <div className="relative w-full h-48 rounded-xl overflow-hidden border-2 border-primary/10 mt-2">
                  <Image src={newQuestion.imageUrl} alt="Preview" fill className="object-contain bg-background" unoptimized />
                </div>
              )}
            </div>
          </div>

          {newQuestion.type === 'MCQ' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {newQuestion.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <button 
                    onClick={() => setNewQuestion({...newQuestion, correctIndex: i})}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${newQuestion.correctIndex === i ? 'bg-primary border-primary text-primary-foreground' : 'border-muted'}`}
                  >
                    {newQuestion.correctIndex === i && <CheckCircle2 className="w-4 h-4" />}
                  </button>
                  <Input 
                    placeholder={`اختيار ${i+1}`} 
                    value={opt} 
                    onChange={(e) => {
                      const newOpts = [...newQuestion.options];
                      newOpts[i] = e.target.value;
                      setNewQuestion({...newQuestion, options: newOpts});
                    }}
                    className="bg-background"
                  />
                </div>
              ))}
            </div>
          )}

          <Button onClick={handleAddQuestion} disabled={isAdding || !newQuestion.text} className="w-full bg-primary font-bold h-12 shadow-lg">
            {isAdding ? <Loader2 className="w-5 h-5 animate-spin" /> : "إضافة السؤال"}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="font-bold border-r-4 border-primary pr-3">بنك الأسئلة الحالي ({questions?.length || 0})</h3>
        {isLoading ? <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /> : 
        !questions || questions.length === 0 ? <p className="text-center text-muted-foreground italic py-10">لا توجد أسئلة مضافة.</p> :
        questions.map((q, i) => (
          <Card key={q.id} className="p-6 bg-card border rounded-xl group hover:border-primary/30 transition-all">
            <div className="flex justify-between mb-4">
              <span className="text-xs font-bold bg-primary/10 text-primary px-3 py-1 rounded-full">سؤال {i+1} - {q.questionType === 'MCQ' ? 'اختياري' : 'مقالي'}</span>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDeleteQuestion(q.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-col md:flex-row gap-6">
              <p className="font-bold flex-grow text-lg">{q.questionText}</p>
              {q.questionImageUrl && (
                <div className="relative w-full md:w-48 h-32 rounded-lg overflow-hidden border bg-background">
                  <Image src={q.questionImageUrl} alt="" fill className="object-contain" unoptimized />
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}