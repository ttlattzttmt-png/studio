"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Search, Plus, Ticket, Loader2, Trash2, BookOpen, User } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, addDoc, serverTimestamp, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export default function ManageCodes() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [genData, setGenData] = useState({ courseId: '', count: '10' });

  const codesRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'access_codes'), orderBy('createdAt', 'desc'));
  }, [firestore, user]);

  const coursesRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'courses');
  }, [firestore, user]);

  const { data: codes, isLoading: isCodesLoading } = useCollection(codesRef);
  const { data: courses } = useCollection(coursesRef);

  const handleGenerateCodes = async () => {
    if (!firestore || !user || !genData.courseId) return;
    setIsGenerating(true);
    try {
      const count = parseInt(genData.count);
      for (let i = 0; i < count; i++) {
        const randomPart1 = Math.random().toString(36).substring(2, 6).toUpperCase();
        const randomPart2 = Math.random().toString(36).substring(2, 6).toUpperCase();
        const randomCode = `ENG-${randomPart1}-${randomPart2}`;
        
        await addDoc(collection(firestore, 'access_codes'), {
          code: randomCode,
          courseId: genData.courseId,
          generatedByAdminUserId: user.uid,
          createdAt: serverTimestamp(),
          isUsed: false,
          usedByStudentId: null,
          usedAt: null
        });
      }
      toast({ title: "تم التوليد بنجاح", description: `تم إنشاء ${count} كود تفعيل بنجاح.` });
      setGenData({ ...genData, courseId: '' });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "خطأ في التوليد", description: "فشل إنشاء الأكواد." });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteCode = async (id: string) => {
    if (!firestore) return;
    if (!confirm('هل أنت متأكد من حذف هذا الكود؟')) return;
    try {
      await deleteDoc(doc(firestore, 'access_codes', id));
      toast({ title: "تم الحذف", description: "تم حذف الكود بنجاح." });
    } catch (e) { 
      console.error(e);
    }
  };

  const filteredCodes = codes?.filter(c => 
    c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.usedByStudentId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isUserLoading) return <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-headline font-bold mb-2">إدارة الأكواد والمزامنة</h1>
          <p className="text-muted-foreground">أنشئ أكواداً لفتح كورسات محددة وتابع من استخدمها لحظياً.</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="h-14 px-8 bg-primary text-primary-foreground font-bold rounded-xl gap-2 text-lg shadow-lg">
              <Plus className="w-6 h-6" /> توليد أكواد جديدة
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card">
            <DialogHeader><DialogTitle className="text-2xl font-bold text-right">توليد أكواد لفتح كورس</DialogTitle></DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-2 text-right">
                <label className="text-sm font-bold">الكورس المستهدف</label>
                <Select value={genData.courseId} onValueChange={(v) => setGenData({...genData, courseId: v})}>
                  <SelectTrigger className="h-12 bg-background"><SelectValue placeholder="اختر الكورس" /></SelectTrigger>
                  <SelectContent>
                    {courses?.map(course => (
                      <SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 text-right">
                <label className="text-sm font-bold">كمية الأكواد</label>
                <Input type="number" value={genData.count} onChange={(e) => setGenData({...genData, count: e.target.value})} className="h-12 bg-background" />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleGenerateCodes} disabled={isGenerating || !genData.courseId} className="w-full h-12 bg-primary font-bold">توليد الآن</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-card overflow-hidden">
        <CardHeader className="border-b bg-secondary/20 py-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input 
              placeholder="بحث عن كود أو طالب..." 
              className="pr-10 bg-background border-primary/10 text-right" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-right">الكود</TableHead>
                <TableHead className="text-right">الكورس المرتبط</TableHead>
                <TableHead className="text-right">حالة الاستخدام</TableHead>
                <TableHead className="text-right">بواسطة طالب</TableHead>
                <TableHead className="text-left">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isCodesLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-10"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></TableCell></TableRow>
              ) : !filteredCodes || filteredCodes.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-20 text-muted-foreground">لا توجد أكواد.</TableCell></TableRow>
              ) : (
                filteredCodes.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono font-bold text-primary">{c.code}</TableCell>
                    <TableCell>
                      <CourseName courseId={c.courseId} />
                    </TableCell>
                    <TableCell>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${c.isUsed ? 'bg-accent/10 text-accent border-accent/20' : 'bg-primary/10 text-primary border-primary/20'}`}>
                        {c.isUsed ? 'مستخدم' : 'متاح'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {c.isUsed ? <StudentName studentId={c.usedByStudentId} /> : <span className="text-xs opacity-30 italic">---</span>}
                    </TableCell>
                    <TableCell className="text-left">
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteCode(c.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function CourseName({ courseId }: { courseId: string }) {
  const firestore = useFirestore();
  const courseRef = useMemoFirebase(() => courseId ? doc(firestore, 'courses', courseId) : null, [firestore, courseId]);
  const { data: course } = useDoc(courseRef);
  return <div className="text-xs font-bold">{course?.title || <span className="opacity-30 italic">غير معروف</span>}</div>;
}

function StudentName({ studentId }: { studentId: string }) {
  const firestore = useFirestore();
  const studentRef = useMemoFirebase(() => studentId ? doc(firestore, 'students', studentId) : null, [firestore, studentId]);
  const { data: student } = useDoc(studentRef);
  return (
    <div className="flex items-center gap-1 text-[10px] text-accent font-bold">
      <User className="w-3 h-3" />
      {student?.name || 'طالب مجهول'}
    </div>
  );
}