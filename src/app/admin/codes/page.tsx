
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
import { Search, Filter, Download, Plus, Ticket, Loader2, Trash2, CheckCircle2 } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, addDoc, serverTimestamp, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export default function ManageCodes() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [genData, setGenData] = useState({ courseId: '', count: '10' });

  // جلب الأكواد والكورسات لحظياً - مع اشتراط وجود المستخدم لتجنب أخطاء الصلاحيات
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
        const randomCode = `ENG-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        addDoc(collection(firestore, 'access_codes'), {
          code: randomCode,
          courseId: genData.courseId,
          generatedByAdminUserId: user.uid,
          createdAt: serverTimestamp(),
          isUsed: false
        });
      }
      toast({ title: "تم التوليد", description: `تم إنشاء ${count} كود بنجاح.` });
      setGenData({ ...genData, courseId: '' });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "خطأ", description: "فشل توليد الأكواد." });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteCode = async (id: string) => {
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, 'access_codes', id));
      toast({ title: "تم الحذف", description: "تم حذف الكود نهائياً." });
    } catch (e) { console.error(e); }
  };

  const filteredCodes = codes?.filter(c => 
    c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.usedByStudentId?.includes(searchTerm)
  );

  const stats = {
    total: codes?.length || 0,
    used: codes?.filter(c => c.isUsed).length || 0,
    available: codes?.filter(c => !c.isUsed).length || 0
  };

  if (!user) return <div className="p-20 text-center text-muted-foreground">جاري التحقق من الصلاحيات...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-headline font-bold mb-2">أكواد التفعيل</h1>
          <p className="text-muted-foreground">أنت المسؤول الوحيد عن إنشاء وتوزيع هذه الأكواد.</p>
        </div>
        <div className="flex gap-4">
          <Dialog>
            <DialogTrigger asChild>
              <Button className="h-14 px-8 bg-primary text-primary-foreground font-bold rounded-xl gap-2 text-lg shadow-lg">
                <Plus className="w-6 h-6" /> توليد أكواد جديدة
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card">
              <DialogHeader><DialogTitle className="text-2xl font-bold text-right">توليد أكواد دفع</DialogTitle></DialogHeader>
              <div className="space-y-6 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold">اختر الكورس المستهدف</label>
                  <Select value={genData.courseId} onValueChange={(v) => setGenData({...genData, courseId: v})}>
                    <SelectTrigger className="h-12 bg-background"><SelectValue placeholder="اختر الكورس" /></SelectTrigger>
                    <SelectContent>
                      {courses?.map(course => (
                        <SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold">عدد الأكواد المطلوب توليدها</label>
                  <Input type="number" value={genData.count} onChange={(e) => setGenData({...genData, count: e.target.value})} className="h-12 bg-background" />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleGenerateCodes} disabled={isGenerating || !genData.courseId} className="w-full h-12 bg-primary font-bold">
                  {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : "ابدأ التوليد الآن"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-card border-primary/5">
          <CardHeader><CardTitle className="text-sm text-muted-foreground font-bold">إجمالي الأكواد</CardTitle></CardHeader>
          <CardContent><p className="text-4xl font-bold">{stats.total}</p></CardContent>
        </Card>
        <Card className="bg-card border-accent/20">
          <CardHeader><CardTitle className="text-sm text-accent font-bold">أكواد مستخدمة</CardTitle></CardHeader>
          <CardContent><p className="text-4xl font-bold text-accent">{stats.used}</p></CardContent>
        </Card>
        <Card className="bg-card border-primary/20">
          <CardHeader><CardTitle className="text-sm text-primary font-bold">أكواد متاحة</CardTitle></CardHeader>
          <CardContent><p className="text-4xl font-bold text-primary">{stats.available}</p></CardContent>
        </Card>
      </div>

      <Card className="bg-card overflow-hidden">
        <CardHeader className="border-b bg-secondary/20 py-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input 
              placeholder="بحث عن كود معين..." 
              className="pr-10 bg-background border-primary/10" 
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
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-right">تاريخ الإنشاء</TableHead>
                <TableHead className="text-left">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isCodesLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-10"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></TableCell></TableRow>
              ) : !filteredCodes || filteredCodes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-20 text-muted-foreground">
                    <Ticket className="w-12 h-12 mx-auto mb-4 opacity-10" />
                    لا توجد أكواد مطابقة لبحثك.
                  </TableCell>
                </TableRow>
              ) : (
                filteredCodes.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono font-bold text-primary">{c.code}</TableCell>
                    <TableCell>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${c.isUsed ? 'bg-accent/10 text-accent border-accent/20' : 'bg-primary/10 text-primary border-primary/20'}`}>
                        {c.isUsed ? 'مستخدم' : 'متاح'}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {c.createdAt?.toDate ? c.createdAt.toDate().toLocaleDateString('ar-EG') : 'الآن'}
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
