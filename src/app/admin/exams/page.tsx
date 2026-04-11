"use client";

import { useState, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  CheckCircle2,
  Upload
} from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, useUser, useFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, deleteDoc, doc, query, orderBy, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

export default function AdminExams() {
  const { firestore } = useFirebase();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  
  const [isAdding, setIsAdding] = useState(false);
  const [selectedExamForQuestions, setSelectedExamForQuestions] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    courseId: '',
    title: '',
    description: '',
    contentType: 'Quiz',
    passMark: '50',
    durationMinutes: '30',
    allowInstantResults: false
  });

  const coursesRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'courses');
  }, [firestore, user]);

  const { data: courses } = useCollection(coursesRef);
  const [activeCourseId, setActiveCourseId] = useState<string>('');
  
  const examsRef = useMemoFirebase(() => {
    if (!firestore || !activeCourseId || !user) return null;
    return collection(firestore, 'courses', activeCourseId, 'content');
  }, [firestore, activeCourseId, user]);

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
        durationMinutes: Number(formData.durationMinutes),
        allowInstantResultsDisplay: formData.allowInstantResults,
        orderIndex: Date.now(),
        createdAt: serverTimestamp(),
        course_uploadedByAdminUserId: user.uid
      });
      toast({ title: "تم إنشاء الاختبار", description: "تم تحديد الوقت والإعدادات بنجاح." });
      setIsAdding(false);
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "خطأ", description: "فشل إنشاء الاختبار." });
      setIsAdding(false);
    }
  };

  const toggleResultsVisibility = async (exam: any) => {
    if (!firestore) return;
    try {
      const examDocRef = doc(firestore, 'courses', exam.courseId, 'content', exam.id);
      await updateDoc(examDocRef, { allowInstantResultsDisplay: !exam.allowInstantResultsDisplay });
      toast({ 
        title: exam.allowInstantResultsDisplay ? "تم إخفاء النتائج" : "تم نشر النتائج للطلاب", 
        description: "تم تحديث حالة الظهور بنجاح." 
      });
    } catch (e) { console.error(e); }
  };

  if (isUserLoading) return <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-headline font-bold mb-2 text-right">إدارة الاختبارات والوقت</h1>
          <p className="text-muted-foreground text-right">حدد وقت الامتحان وارفع ملفات الأسئلة وتحكم في النتائج.</p>
        </div>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button className="h-14 px-8 bg-primary text-primary-foreground font-bold rounded-xl gap-2 text-lg shadow-lg">
              <Plus className="w-6 h-6" /> اختبار جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card">
            <DialogHeader><DialogTitle className="text-2xl font-bold text-right">إنشاء اختبار بمؤقت</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 text-right">
                  <Label className="text-sm font-bold">الكورس</Label>
                  <Select value={formData.courseId} onValueChange={(v) => setFormData({...formData, courseId: v})}>
                    <SelectTrigger className="bg-background"><SelectValue placeholder="اختر" /></SelectTrigger>
                    <SelectContent>
                      {courses?.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 text-right">
                  <Label className="text-sm font-bold">وقت الامتحان (بالدقائق)</Label>
                  <Input type="number" value={formData.durationMinutes} onChange={(e) => setFormData({...formData, durationMinutes: e.target.value})} className="bg-background text-right" />
                </div>
              </div>
              <Input placeholder="عنوان الاختبار" className="text-right" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 text-right">
                  <Label className="text-sm font-bold">درجة النجاح %</Label>
                  <Input type="number" value={formData.passMark} onChange={(e) => setFormData({...formData, passMark: e.target.value})} className="text-right" />
                </div>
                <div className="space-y-2 text-right">
                  <Label className="text-sm font-bold">النوع</Label>
                  <Select value={formData.contentType} onValueChange={(v) => setFormData({...formData, contentType: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Quiz">كويز</SelectItem>
                      <SelectItem value="Exam">امتحان</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddExam} disabled={isAdding} className="w-full h-12 bg-primary font-bold">نشر الآن</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-card">
        <CardHeader className="border-b bg-secondary/10 flex justify-end">
          <Select value={activeCourseId} onValueChange={setActiveCourseId}>
            <SelectTrigger className="w-64 bg-background text-right"><SelectValue placeholder="اختر كورس لعرض امتحاناته" /></SelectTrigger>
            <SelectContent>
              {courses?.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="p-6">
          {!activeCourseId ? (
            <div className="text-center py-20 text-muted-foreground italic">يرجى اختيار كورس من القائمة لعرض الاختبارات.</div>
          ) : isExamsLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
          ) : exams.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground italic">لا توجد اختبارات مضافة لهذا الكورس بعد.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {exams.map((exam) => (
                <Card key={exam.id} className="relative overflow-hidden group border-primary/10">
                  <div className={`absolute top-0 right-0 w-2 h-full ${exam.allowInstantResultsDisplay ? 'bg-accent' : 'bg-muted'}`} />
                  <CardContent className="p-6 space-y-4 text-right">
                    <div className="flex justify-between items-start">
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {exam.durationMinutes} د
                      </Badge>
                      <h3 className="font-bold text-lg">{exam.title}</h3>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-xl">
                      <Switch 
                        checked={exam.allowInstantResultsDisplay} 
                        onCheckedChange={() => toggleResultsVisibility(exam)}
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold">إظهار النتائج للطلاب</span>
                        <Megaphone className={`w-4 h-4 ${exam.allowInstantResultsDisplay ? 'text-accent' : 'text-muted-foreground'}`} />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button className="flex-grow bg-primary text-primary-foreground font-bold" onClick={() => setSelectedExamForQuestions(exam)}>إدارة الأسئلة</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedExamForQuestions} onOpenChange={() => setSelectedExamForQuestions(null)}>
        <DialogContent className="max-w-4xl bg-card h-[90vh] overflow-hidden flex flex-col p-0 text-right">
          <DialogHeader className="p-6 border-b">
            <DialogTitle className="flex items-center gap-2 justify-end">
              <Settings2 className="w-5 h-5 text-primary" /> تعديل الأسئلة والملفات: {selectedExamForQuestions?.title}
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
  const { firestore, storage } = useFirebase();
  const { toast } = useToast();
  const [isAdding, setIsAdding] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newQuestion, setNewQuestion] = useState({ 
    text: '', 
    type: 'MCQ', 
    points: '1', 
    options: ['', '', '', ''], 
    correctIndex: 0 
  });

  const questionsRef = useMemoFirebase(() => {
    if (!firestore || !exam) return null;
    return query(collection(firestore, 'courses', exam.courseId, 'content', exam.id, 'questions'), orderBy('orderIndex', 'asc'));
  }, [firestore, exam]);

  const { data: questions } = useCollection(questionsRef);

  const handleAddQuestion = async () => {
    if (!firestore || !exam || !storage || (!newQuestion.text && !selectedFile)) return;
    setIsAdding(true);
    try {
      let imageUrl = '';
      if (selectedFile) {
        const storagePath = `exams/${exam.id}/questions/${Date.now()}_${selectedFile.name}`;
        const fileRef = ref(storage, storagePath);
        const uploadResult = await uploadBytes(fileRef, selectedFile);
        imageUrl = await getDownloadURL(uploadResult.ref);
      }

      const qRef = await addDoc(collection(firestore, 'courses', exam.courseId, 'content', exam.id, 'questions'), {
        courseContentId: exam.id,
        questionText: newQuestion.text,
        questionImageUrl: imageUrl,
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
      toast({ title: "تم إضافة السؤال والملف بنجاح" });
      setNewQuestion({ text: '', type: 'MCQ', points: '1', options: ['', '', '', ''], correctIndex: 0 });
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (e) { 
      console.error(e);
      toast({ variant: "destructive", title: "خطأ في الرفع، تأكد من اتصالك." });
    } finally { 
      setIsAdding(false); 
    }
  };

  const handleDeleteQuestion = async (qId: string) => {
    if (!firestore || !exam) return;
    try {
      await deleteDoc(doc(firestore, 'courses', exam.courseId, 'content', exam.id, 'questions', qId));
      toast({ title: "تم حذف السؤال" });
    } catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-secondary/10 border-dashed border-primary/20">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between mb-2">
             <Badge variant="outline" className="bg-primary/5 text-primary">إضافة سؤال جديد</Badge>
             <Select value={newQuestion.type} onValueChange={(v) => setNewQuestion({...newQuestion, type: v})}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MCQ">اختياري</SelectItem>
                  <SelectItem value="Essay">مقالي</SelectItem>
                </SelectContent>
             </Select>
          </div>
          
          <Textarea 
            placeholder="اكتب نص السؤال هنا..." 
            className="text-right min-h-[100px] bg-background" 
            value={newQuestion.text} 
            onChange={(e) => setNewQuestion({...newQuestion, text: e.target.value})} 
          />
          
          <div className="space-y-2">
            <Label className="text-xs font-bold flex items-center gap-2 justify-end">صورة السؤال (اختياري)</Label>
            <div className="flex items-center gap-4 flex-row-reverse">
              <Button 
                variant="outline" 
                onClick={() => fileInputRef.current?.click()}
                className="h-12 flex-grow gap-2 border-primary/20 hover:border-primary"
              >
                {selectedFile ? <><CheckCircle2 className="w-4 h-4 text-accent" /> {selectedFile.name}</> : <><Upload className="w-4 h-4" /> اختر ملف من الجهاز</>}
              </Button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="hidden" 
                accept="image/*"
              />
              {selectedFile && (
                <Button variant="ghost" size="icon" onClick={() => setSelectedFile(null)} className="text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {newQuestion.type === 'MCQ' && (
            <div className="space-y-3 pt-2">
              <Label className="text-xs font-bold text-right block">خيارات الإجابة (حدد الإجابة الصحيحة):</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {newQuestion.options.map((opt, i) => (
                  <div key={i} className="flex gap-2 items-center flex-row-reverse bg-background p-2 rounded-lg border">
                    <input 
                      type="radio" 
                      name="correct"
                      checked={newQuestion.correctIndex === i} 
                      onChange={() => setNewQuestion({...newQuestion, correctIndex: i})} 
                      className="w-4 h-4 accent-primary"
                    />
                    <Input 
                      placeholder={`الخيار ${i+1}`} 
                      className="text-right border-0 focus-visible:ring-0" 
                      value={opt} 
                      onChange={(e) => {
                        const o = [...newQuestion.options];
                        o[i] = e.target.value;
                        setNewQuestion({...newQuestion, options: o});
                      }} 
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex gap-4 items-end flex-row-reverse">
            <div className="space-y-1 w-24">
               <Label className="text-[10px] text-right block">النقاط</Label>
               <Input type="number" value={newQuestion.points} onChange={(e) => setNewQuestion({...newQuestion, points: e.target.value})} className="text-center h-10" />
            </div>
            <Button onClick={handleAddQuestion} disabled={isAdding} className="flex-grow h-10 bg-primary text-primary-foreground font-bold">
              {isAdding ? <><Loader2 className="w-4 h-4 animate-spin ml-2" /> جاري الرفع...</> : "حفظ السؤال والملف"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h4 className="font-bold border-r-4 border-primary pr-2">الأسئلة المضافة ({questions?.length || 0}):</h4>
        {questions?.map((q, i) => (
          <Card key={q.id} className="bg-card group hover:border-primary/30 transition-colors">
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div className="flex gap-2">
                   <Badge variant="secondary">{q.questionType === 'MCQ' ? 'اختياري' : 'مقالي'}</Badge>
                   <Badge variant="outline">{q.points} ن</Badge>
                </div>
                <Button variant="ghost" size="icon" className="text-destructive opacity-0 group-hover:opacity-100 h-8 w-8" onClick={() => handleDeleteQuestion(q.id)}>
                   <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <p className="font-bold text-right mb-2">{i+1}. {q.questionText}</p>
              {q.questionImageUrl && (
                <div className="relative w-full h-40 rounded-lg overflow-hidden border mb-2 bg-secondary/10">
                   <Image src={q.questionImageUrl} alt="" fill className="object-contain" unoptimized />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
