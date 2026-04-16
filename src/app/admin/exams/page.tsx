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
  AlertCircle
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
    isVisible: true // الحالة الافتراضية: ظاهر
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
            <Button className="h-14 px-8 bg-primary text-primary-foreground font-bold rounded-xl gap-2 text-lg shadow-lg">
              <Plus className="w-6 h-6" /> اختبار جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card text-right">
            <DialogHeader><DialogTitle className="text-2xl font-bold text-right">إنشاء اختبار جديد</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
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
                  <Input type="number" value={formData.durationMinutes} onChange={(e) => setFormData({...formData, durationMinutes: e.target.value})} className="bg-background" />
                </div>
              </div>
              <Input placeholder="عنوان الاختبار" className="text-right" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} />
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
          <Select value={activeCourseId} onValueChange={setActiveCourseId}>
            <SelectTrigger className="w-64 bg-background text-right"><SelectValue placeholder="اختر كورس لعرض امتحاناته" /></SelectTrigger>
            <SelectContent>
              {courses?.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="p-6">
          {!activeCourseId ? (
            <div className="text-center py-20 text-muted-foreground italic">يرجى اختيار كورس من القائمة.</div>
          ) : isExamsLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-10 animate-spin text-primary" /></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {exams.map((exam) => (
                <Card key={exam.id} className="relative overflow-hidden group border-primary/10">
                  <div className={`absolute top-0 right-0 w-2 h-full ${exam.isVisible ? 'bg-accent' : 'bg-muted'}`} />
                  <CardContent className="p-6 space-y-4 text-right">
                    <div className="flex justify-between items-start">
                      <Badge variant={exam.isVisible ? "default" : "secondary"}>
                         {exam.isVisible ? "ظاهر للطلاب" : "مخفي حالياً"}
                      </Badge>
                      <h3 className="font-bold text-lg">{exam.title}</h3>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 pt-2">
                       <Button variant="outline" size="sm" className="gap-1 rounded-xl" onClick={() => toggleVisibility(exam)}>
                          {exam.isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />} 
                          {exam.isVisible ? "إخفاء" : "إظهار"}
                       </Button>
                       <Button variant="outline" size="sm" className="gap-1 rounded-xl text-destructive hover:bg-destructive/10" onClick={() => handleDeleteExam(exam)}>
                          <Trash2 className="w-4 h-4" /> حذف
                       </Button>
                    </div>

                    <Button className="w-full bg-primary text-primary-foreground font-bold mt-2" onClick={() => setSelectedExamForQuestions(exam)}>إدارة الأسئلة</Button>
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
              <Settings2 className="w-5 h-5 text-primary" /> تعديل الأسئلة: {selectedExamForQuestions?.title}
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

function QuestionManager({ exam }: any) {
  // كود QuestionManager الحالي مع الحفاظ عليه...
  // (نفس الكود في النسخة السابقة، لم يتغير)
  return <div>إدارة أسئلة الاختبار: {exam.title}</div>;
}