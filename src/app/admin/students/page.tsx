"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
} from "@/components/ui/dialog";
import { 
  Search, 
  Phone, 
  Calendar, 
  Loader2,
  CheckCircle2,
  PlayCircle,
  Mail,
  GraduationCap,
  ClipboardList,
  AlertCircle,
  User as UserIcon,
  Clock,
  BookOpen,
  Trash2
} from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, collectionGroup, doc, updateDoc, query, orderBy, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export default function AdminStudents() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  
  const studentsRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'students'), orderBy('registrationDate', 'desc'));
  }, [firestore, user]);

  const { data: students, isLoading } = useCollection(studentsRef);

  const handleDeleteStudent = async (id: string, name: string) => {
    if (!firestore) return;
    if (!confirm(`هل أنت متأكد من حذف الطالب "${name}" نهائياً من المنصة؟`)) return;
    try {
      await deleteDoc(doc(firestore, 'students', id));
      toast({ title: "تم الحذف", description: "تم حذف بيانات الطالب بنجاح." });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "خطأ", description: "لا يمكن حذف الطالب حالياً." });
    }
  };

  const filteredStudents = students?.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (s.studentPhoneNumber && s.studentPhoneNumber.includes(searchTerm))
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 text-right">
        <div>
          <h1 className="text-4xl font-headline font-bold">إدارة شؤون الطلاب</h1>
          <p className="text-muted-foreground">تابع ملفات الطلاب، درجاتهم، ونشاطهم التعليمي لحظة بلحظة.</p>
        </div>
        <div className="bg-primary/10 text-primary px-6 py-3 rounded-2xl border border-primary/20 font-bold">
           إجمالي المسجلين: {students?.length || 0}
        </div>
      </div>

      <Card className="bg-card border-primary/5 shadow-sm">
        <CardHeader className="border-b bg-secondary/5 flex flex-row items-center justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="بحث بالاسم أو الهاتف..." 
              className="pr-10 bg-background border-primary/10 text-right" 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>
          <Badge variant="outline" className="border-primary/20 text-primary">تزامن حيّ</Badge>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-right">اسم الطالب</TableHead>
                <TableHead className="text-right">السنة الدراسية</TableHead>
                <TableHead className="text-right">رقم الهاتف</TableHead>
                <TableHead className="text-left">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-20"><Loader2 className="w-10 h-10 animate-spin mx-auto text-primary" /></TableCell></TableRow>
              ) : filteredStudents?.map(s => (
                <TableRow key={s.id} className="group hover:bg-primary/5 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-3 justify-end">
                      <div className="flex flex-col text-right">
                        <span className="font-bold">{s.name}</span>
                        <span className="text-[10px] text-muted-foreground">{s.email}</span>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {s.name?.[0] || 'S'}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right"><Badge variant="outline">{s.academicYear}</Badge></TableCell>
                  <TableCell className="text-right font-mono text-xs">{s.studentPhoneNumber}</TableCell>
                  <TableCell className="text-left">
                    <div className="flex items-center gap-2">
                       <Button variant="secondary" size="sm" onClick={() => setSelectedStudent(s)} className="rounded-xl font-bold">عرض الملف</Button>
                       <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDeleteStudent(s.id, s.name)}>
                          <Trash2 className="w-4 h-4" />
                       </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selectedStudent} onOpenChange={() => setSelectedStudent(null)}>
        <DialogContent className="max-w-5xl bg-card border-primary/20 p-0 overflow-hidden rounded-[2.5rem]">
          <DialogHeader className="sr-only">
            <DialogTitle>تفاصيل ملف الطالب: {selectedStudent?.name}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[90vh]">
            <div className="p-8 bg-gradient-to-l from-primary/10 to-transparent border-b">
              <div className="flex flex-col md:flex-row items-center gap-6 justify-end text-right">
                <div className="space-y-2 order-2 md:order-1">
                  <h2 className="text-3xl font-headline font-bold text-primary">{selectedStudent?.name}</h2>
                  <div className="flex flex-wrap gap-4 justify-end text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Mail className="w-4" /> {selectedStudent?.email}</span>
                    <span className="flex items-center gap-1"><GraduationCap className="w-4" /> {selectedStudent?.academicYear}</span>
                  </div>
                </div>
                <div className="w-24 h-24 rounded-[2rem] bg-primary text-primary-foreground flex items-center justify-center font-bold text-4xl shadow-xl order-1 md:order-2">
                  {selectedStudent?.name?.[0]}
                </div>
              </div>
            </div>

            <div className="p-8 space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <InfoBox icon={<Phone />} label="هاتف الطالب" value={selectedStudent?.studentPhoneNumber} />
                <InfoBox icon={<Phone />} label="هاتف ولي الأمر" value={selectedStudent?.parentPhoneNumber} />
                <InfoBox icon={<Calendar />} label="تاريخ الانضمام" value={new Date(selectedStudent?.registrationDate).toLocaleDateString('ar-EG')} />
                <InfoBox icon={<Clock />} label="آخر ظهور" value={selectedStudent?.lastLoginDate ? new Date(selectedStudent.lastLoginDate).toLocaleString('ar-EG') : '---'} />
              </div>
              <StudentAcademicProgress studentId={selectedStudent?.id} />
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoBox({ icon, label, value }: any) {
  return (
    <div className="p-5 bg-secondary/20 rounded-2xl border border-white/5 text-right">
      <div className="flex items-center gap-2 text-primary mb-2 text-[10px] font-bold justify-end">
        <span>{label}</span> {icon}
      </div>
      <p className="font-bold text-sm truncate">{value || '---'}</p>
    </div>
  );
}

function StudentAcademicProgress({ studentId }: { studentId: string }) {
  const firestore = useFirestore();
  const attemptsRef = useMemoFirebase(() => query(collection(firestore, 'students', studentId, 'quiz_attempts'), orderBy('submittedAt', 'desc')), [firestore, studentId]);
  const { data: attempts } = useCollection(attemptsRef);

  return (
    <div className="space-y-6">
       <h3 className="text-xl font-bold flex items-center gap-2 justify-end text-right border-r-4 border-primary pr-3">
          <ClipboardList className="w-5 h-5 text-primary" /> سجل نتائج الامتحانات
       </h3>
       <div className="grid grid-cols-1 gap-4">
          {attempts?.map(a => (
            <div key={a.id} className="p-6 bg-card border rounded-2xl flex flex-row-reverse justify-between items-center text-right shadow-sm">
               <div>
                  <p className="font-bold text-lg mb-1">نتيجة: {a.score}%</p>
                  <p className="text-xs text-muted-foreground">التاريخ: {new Date(a.submittedAt).toLocaleString('ar-EG')}</p>
                  <p className="text-[10px] text-primary mt-1 font-bold">ID: {a.courseContentId}</p>
               </div>
               <Badge variant={a.isGraded ? "default" : "secondary"}>
                  {a.isGraded ? "تم التصحيح" : "قيد المراجعة"}
               </Badge>
            </div>
          ))}
          {(!attempts || attempts.length === 0) && <p className="text-center py-10 text-muted-foreground italic">لا يوجد محاولات امتحانية لهذا الطالب.</p>}
       </div>
    </div>
  );
}
