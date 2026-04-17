"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Mail,
  GraduationCap,
  ClipboardList,
  Clock,
  Trash2,
  BookOpen,
  CheckCircle2,
  User as UserIcon
} from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc, query, orderBy, deleteDoc, collectionGroup } from 'firebase/firestore';
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
    (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (s.studentPhoneNumber && s.studentPhoneNumber.includes(searchTerm))
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 text-right">
        <div>
          <h1 className="text-4xl font-headline font-bold">إدارة شؤون الطلاب والرقابة</h1>
          <p className="text-muted-foreground">تابع ملفات الطلاب، درجاتهم، ونشاطهم التعليمي لحظة بلحظة.</p>
        </div>
        <div className="bg-primary/10 text-primary px-6 py-3 rounded-2xl border border-primary/20 font-bold shadow-lg">
           إجمالي المسجلين: {students?.length || 0} طالب
        </div>
      </div>

      <Card className="bg-card border-primary/5 shadow-xl rounded-[2rem] overflow-hidden">
        <CardHeader className="border-b bg-secondary/5 flex flex-row-reverse items-center justify-between p-6">
          <div className="relative w-full max-w-sm">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="بحث بالاسم أو الهاتف..." 
              className="pr-10 bg-background border-primary/10 text-right h-12 rounded-xl" 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>
          <Badge variant="outline" className="border-primary/20 text-primary px-4 py-1 font-bold">مراقبة حية</Badge>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader className="bg-secondary/5">
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
              ) : !filteredStudents || filteredStudents.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-20 text-muted-foreground italic">لا يوجد طلاب مسجلون حالياً.</TableCell></TableRow>
              ) : filteredStudents.map(s => (
                <TableRow key={s.id} className="group hover:bg-primary/5 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-3 justify-end">
                      <div className="flex flex-col text-right">
                        <span className="font-bold text-foreground">{s.name}</span>
                        <span className="text-[10px] text-muted-foreground">{s.email}</span>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black shadow-sm">
                        {s.name?.[0] || 'S'}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right"><Badge variant="outline" className="border-primary/20 text-xs">{s.academicYear}</Badge></TableCell>
                  <TableCell className="text-right font-mono text-xs font-bold text-primary" dir="ltr">{s.studentPhoneNumber}</TableCell>
                  <TableCell className="text-left">
                    <div className="flex items-center gap-2">
                       <Button variant="secondary" size="sm" onClick={() => setSelectedStudent(s)} className="rounded-xl font-bold px-4 h-9 shadow-sm">عرض الملف</Button>
                       <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 rounded-full" onClick={() => handleDeleteStudent(s.id, s.name)}>
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
          <DialogHeader className="sr-only"><DialogTitle>ملف الطالب: {selectedStudent?.name}</DialogTitle></DialogHeader>
          {selectedStudent && (
            <ScrollArea className="max-h-[90vh]">
              <div className="p-8 bg-gradient-to-l from-primary/10 via-background to-transparent border-b">
                <div className="flex flex-col md:flex-row items-center gap-6 justify-end text-right">
                  <div className="space-y-2 order-2 md:order-1">
                    <h2 className="text-4xl font-headline font-black text-primary">{selectedStudent.name}</h2>
                    <div className="flex flex-wrap gap-4 justify-end text-sm text-muted-foreground font-bold">
                      <span className="flex items-center gap-1.5"><Mail className="w-4 h-4 text-primary" /> {selectedStudent.email}</span>
                      <span className="flex items-center gap-1.5"><GraduationCap className="w-4 h-4 text-primary" /> {selectedStudent.academicYear}</span>
                    </div>
                  </div>
                  <div className="w-28 h-24 rounded-[2.5rem] bg-primary text-primary-foreground flex items-center justify-center font-black text-5xl shadow-2xl shadow-primary/20 order-1 md:order-2 border-4 border-white/5">
                    {selectedStudent.name?.[0]}
                  </div>
                </div>
              </div>

              <div className="p-8 space-y-12">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <InfoBox icon={<Phone />} label="هاتف الطالب" value={selectedStudent.studentPhoneNumber} />
                  <PhoneBox label="هاتف ولي الأمر" value={selectedStudent.parentPhoneNumber} />
                  <InfoBox icon={<Calendar />} label="تاريخ التسجيل" value={selectedStudent.registrationDate ? new Date(selectedStudent.registrationDate).toLocaleDateString('ar-EG') : '---'} />
                  <InfoBox icon={<Clock />} label="آخر ظهور" value={selectedStudent.lastLoginDate ? new Date(selectedStudent.lastLoginDate).toLocaleString('ar-EG') : 'نشط الآن'} />
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <StudentEnrollmentsProgress studentId={selectedStudent.id} />
                  <StudentAcademicAttempts studentId={selectedStudent.id} />
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PhoneBox({ label, value }: any) {
  return (
    <div className="p-5 bg-secondary/20 rounded-[1.5rem] border border-white/5 text-right shadow-sm">
      <div className="flex items-center gap-2 text-primary mb-2 text-[10px] font-black justify-end uppercase tracking-tighter">
        <span>{label}</span> <Phone className="w-3 h-3" />
      </div>
      <p className="font-black text-sm truncate text-foreground" dir="ltr">{value || '---'}</p>
    </div>
  );
}

function InfoBox({ icon, label, value }: any) {
  return (
    <div className="p-5 bg-secondary/20 rounded-[1.5rem] border border-white/5 text-right shadow-sm">
      <div className="flex items-center gap-2 text-primary mb-2 text-[10px] font-black justify-end uppercase tracking-tighter">
        <span>{label}</span> {icon}
      </div>
      <p className="font-black text-sm truncate text-foreground">{value || '---'}</p>
    </div>
  );
}

function StudentEnrollmentsProgress({ studentId }: { studentId: string }) {
  const firestore = useFirestore();
  // استخدام الفلترة البرمجية لضمان عمل الصفحة فوراً
  const enrollmentsGroupRef = useMemoFirebase(() => collectionGroup(firestore, 'enrollments'), [firestore]);
  const { data: allEnrollments, isLoading } = useCollection(enrollmentsGroupRef);

  const studentEnrollments = useMemo(() => {
    return allEnrollments?.filter(en => en.studentId === studentId)
      .sort((a, b) => new Date(b.enrollmentDate).getTime() - new Date(a.enrollmentDate).getTime()) || [];
  }, [allEnrollments, studentId]);

  return (
    <div className="space-y-6">
       <h3 className="text-xl font-black flex items-center gap-2 justify-end text-right border-r-4 border-primary pr-3">
          <BookOpen className="w-5 h-5 text-primary" /> تقدم الكورسات المشترك بها
       </h3>
       <div className="space-y-4">
          {isLoading ? <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /> : 
          studentEnrollments.length === 0 ? <p className="text-center text-muted-foreground italic text-xs py-10">لا يوجد اشتراكات نشطة للطالب حالياً.</p> :
          studentEnrollments.map(en => (
            <div key={en.id} className="p-6 bg-card border border-primary/5 rounded-[2rem] text-right shadow-md relative overflow-hidden group">
               <div className={`absolute top-0 right-0 w-1.5 h-full ${en.status === 'active' ? 'bg-accent' : 'bg-primary'}`} />
               <div className="flex flex-row-reverse justify-between items-start mb-4">
                  <p className="font-black text-foreground">{en.courseTitle || 'كورس تعليمي'}</p>
                  <Badge variant={en.status === 'active' ? "default" : "secondary"} className="text-[9px] font-black">
                    {en.status === 'active' ? "نشط" : "معلق"}
                  </Badge>
               </div>
               <div className="flex flex-row-reverse items-center justify-between gap-4">
                  <div className="flex-grow">
                    <div className="w-full h-2 bg-secondary rounded-full overflow-hidden mb-2">
                       <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${en.progressPercentage || 0}%` }} />
                    </div>
                    <p className="text-[10px] font-bold text-muted-foreground">تم إنجاز {en.progressPercentage || 0}% من إجمالي المحتوى</p>
                  </div>
                  <div className="w-12 h-12 rounded-full border-2 border-primary/20 flex items-center justify-center font-black text-primary text-xs shrink-0 bg-primary/5">
                    {en.progressPercentage || 0}%
                  </div>
               </div>
            </div>
          ))}
       </div>
    </div>
  );
}

function StudentAcademicAttempts({ studentId }: { studentId: string }) {
  const firestore = useFirestore();
  const attemptsGroupRef = useMemoFirebase(() => collectionGroup(firestore, 'quiz_attempts'), [firestore]);
  const { data: allAttempts, isLoading } = useCollection(attemptsGroupRef);

  const studentAttempts = useMemo(() => {
    return allAttempts?.filter(at => at.studentId === studentId)
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()) || [];
  }, [allAttempts, studentId]);

  return (
    <div className="space-y-6">
       <h3 className="text-xl font-black flex items-center gap-2 justify-end text-right border-r-4 border-accent pr-3">
          <ClipboardList className="w-5 h-5 text-accent" /> سجل نتائج الامتحانات
       </h3>
       <div className="space-y-4">
          {isLoading ? <Loader2 className="w-6 h-6 animate-spin mx-auto text-accent" /> :
          studentAttempts.length === 0 ? <p className="text-center text-muted-foreground italic text-xs py-10">لا توجد محاولات امتحانات مسجلة.</p> :
          studentAttempts.map(a => (
            <div key={a.id} className="p-6 bg-secondary/10 border border-white/5 rounded-[2rem] flex flex-row-reverse justify-between items-center text-right shadow-sm group hover:bg-secondary/20 transition-all">
               <div className="min-w-0">
                  <div className="flex flex-row-reverse items-center gap-3">
                    <p className="font-black text-2xl text-accent">{a.score}%</p>
                    <div className="text-right">
                       <ExamNameByDoc courseId={a.courseId} contentId={a.courseContentId} />
                       <p className="text-[10px] text-muted-foreground font-bold mt-1">الدرجة: {a.pointsAchieved} من {a.totalPoints}</p>
                    </div>
                  </div>
                  <p className="text-[9px] text-muted-foreground mt-2 font-mono">{new Date(a.submittedAt).toLocaleString('ar-EG')}</p>
               </div>
               <div className="flex flex-col items-center gap-2">
                 <Badge className={a.isGraded ? "bg-accent text-white" : "bg-primary/20 text-primary"} variant="outline">
                    {a.isGraded ? "معتمد" : "مراجعة"}
                 </Badge>
                 {a.score >= 50 ? <CheckCircle2 className="w-5 h-5 text-accent" /> : null}
               </div>
            </div>
          ))}
       </div>
    </div>
  );
}

function ExamNameByDoc({ courseId, contentId }: { courseId: string, contentId: string }) {
  const firestore = useFirestore();
  const examRef = useMemoFirebase(() => {
    if (!firestore || !courseId || !contentId) return null;
    return doc(firestore, 'courses', courseId, 'content', contentId);
  }, [firestore, courseId, contentId]);
  const { data: exam } = useDoc(examRef);
  return <p className="text-xs font-black text-foreground truncate max-w-[150px]">{exam?.title || 'جاري التحميل...'}</p>;
}
