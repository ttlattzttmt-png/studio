
"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { 
  Search, 
  UserPlus, 
  Phone, 
  GraduationCap, 
  Mail, 
  Calendar, 
  BookOpen, 
  Award,
  Loader2,
  ChevronLeft,
  CheckCircle,
  XCircle,
  Clock,
  User,
  ShieldAlert,
  Contact2
} from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, collectionGroup, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export default function AdminStudents() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  
  const studentsRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'students');
  }, [firestore, user]);

  const { data: students, isLoading } = useCollection(studentsRef);

  const enrollmentsRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collectionGroup(firestore, 'enrollments');
  }, [firestore, user]);

  const { data: allEnrollments } = useCollection(enrollmentsRef);

  const pendingRequests = allEnrollments?.filter(e => e.status === 'pending');

  const handleActivateEnrollment = async (enrollment: any) => {
    if (!firestore) return;
    try {
      const enRef = doc(firestore, 'students', enrollment.studentId, 'enrollments', enrollment.id);
      await updateDoc(enRef, { 
        status: 'active', 
        activationDate: new Date().toISOString() 
      });
      toast({ title: "تم التفعيل", description: "تم فتح الكورس للطالب بنجاح." });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "خطأ", description: "فشل تفعيل الاشتراك." });
    }
  };

  const handleDeleteRequest = async (enrollment: any) => {
    if (!firestore || !confirm('هل تريد رفض هذا الطلب؟')) return;
    try {
      const enRef = doc(firestore, 'students', enrollment.studentId, 'enrollments', enrollment.id);
      await deleteDoc(enRef);
      toast({ title: "تم الرفض", description: "تم حذف طلب الانضمام." });
    } catch (e) { console.error(e); }
  };

  const filteredStudents = students?.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.studentPhoneNumber.includes(searchTerm) ||
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-headline font-bold mb-2">إدارة الطلاب والاشتراكات</h1>
          <p className="text-muted-foreground">راجع ملفات الطلاب الشخصية وطلبات الانضمام للكورسات.</p>
        </div>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" /> طلبات انتظار التفعيل ({pendingRequests?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!pendingRequests || pendingRequests.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground italic">لا توجد طلبات معلقة حالياً.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingRequests.map((req) => (
                <Card key={req.id} className="bg-card shadow-sm border-primary/10">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <StudentBrief studentId={req.studentId} />
                      <Badge variant="outline" className="text-[10px]">طلب جديد</Badge>
                    </div>
                    <div className="bg-secondary/20 p-2 rounded text-xs font-bold text-primary">
                      كورس: {req.courseTitle || 'غير مسمى'}
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button onClick={() => handleActivateEnrollment(req)} className="flex-grow bg-accent text-white h-9 text-xs gap-1 font-bold">
                        <CheckCircle className="w-3 h-3" /> موافقة وتفعيل
                      </Button>
                      <Button onClick={() => handleDeleteRequest(req)} variant="ghost" className="text-destructive h-9 text-xs">
                        رفض
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card">
        <CardHeader className="border-b pb-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input 
              placeholder="بحث باسم الطالب، الهاتف، أو الإيميل..." 
              className="pr-10 bg-background border-primary/10 text-right" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">الاسم</TableHead>
                <TableHead className="text-right">السنة الدراسية</TableHead>
                <TableHead className="text-right">رقم الهاتف</TableHead>
                <TableHead className="text-left">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-20"><Loader2 className="w-10 h-10 animate-spin mx-auto text-primary" /></TableCell></TableRow>
              ) : filteredStudents?.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-20 text-muted-foreground">لا يوجد طلاب مطابقين للبحث.</TableCell></TableRow>
              ) : filteredStudents?.map((student) => (
                <TableRow key={student.id} className="group">
                  <TableCell className="font-bold flex items-center gap-2">
                     <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px]">
                       {student.name[0]}
                     </div>
                     {student.name}
                  </TableCell>
                  <TableCell>{student.academicYear}</TableCell>
                  <TableCell dir="ltr" className="text-right">{student.studentPhoneNumber}</TableCell>
                  <TableCell className="text-left">
                    <Button variant="secondary" size="sm" className="gap-2" onClick={() => setSelectedStudent(student)}>
                      الملف الشخصي <ChevronLeft className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selectedStudent} onOpenChange={() => setSelectedStudent(null)}>
        <DialogContent className="max-w-3xl bg-card border-primary/20 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="text-right border-b pb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <User className="w-10 h-10" />
              </div>
              <div>
                <DialogTitle className="text-3xl font-bold text-primary mb-1">{selectedStudent?.name}</DialogTitle>
                <DialogDescription className="text-lg font-bold">{selectedStudent?.academicYear}</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {selectedStudent && (
            <div className="space-y-8 py-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="p-4 bg-secondary/20 rounded-2xl border border-primary/5">
                   <p className="text-xs text-muted-foreground font-bold mb-2 flex items-center gap-1"><Mail className="w-3 h-3" /> البريد الإلكتروني</p>
                   <p className="font-bold text-lg select-all">{selectedStudent.email}</p>
                 </div>
                 <div className="p-4 bg-secondary/20 rounded-2xl border border-primary/5">
                   <p className="text-xs text-muted-foreground font-bold mb-2 flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> كلمة المرور</p>
                   <p className="text-sm italic opacity-50">مؤمنة ومحفوظة بشكل مشفر (تزامن Firebase)</p>
                 </div>
                 <div className="p-4 bg-secondary/20 rounded-2xl border border-primary/5">
                   <p className="text-xs text-muted-foreground font-bold mb-2 flex items-center gap-1"><Phone className="w-3 h-3" /> هاتف الطالب</p>
                   <p className="font-bold text-lg" dir="ltr">{selectedStudent.studentPhoneNumber}</p>
                 </div>
                 <div className="p-4 bg-secondary/20 rounded-2xl border border-primary/5">
                   <p className="text-xs text-muted-foreground font-bold mb-2 flex items-center gap-1"><Contact2 className="w-3 h-3" /> هاتف ولي الأمر</p>
                   <p className="font-bold text-lg" dir="ltr">{selectedStudent.parentPhoneNumber}</p>
                 </div>
                 <div className="p-4 bg-secondary/20 rounded-2xl border border-primary/5">
                   <p className="text-xs text-muted-foreground font-bold mb-2 flex items-center gap-1"><Calendar className="w-3 h-3" /> تاريخ التسجيل</p>
                   <p className="font-bold">{new Date(selectedStudent.registrationDate).toLocaleDateString('ar-EG')}</p>
                 </div>
                 <div className="p-4 bg-secondary/20 rounded-2xl border border-primary/5">
                   <p className="text-xs text-muted-foreground font-bold mb-2 flex items-center gap-1"><GraduationCap className="w-3 h-3" /> الحالة</p>
                   <Badge className="bg-accent">طالب نشط</Badge>
                 </div>
              </div>

              <StudentSubData studentId={selectedStudent.id} />
            </div>
          )}
          
          <DialogFooter className="border-t pt-6">
            <Button onClick={() => setSelectedStudent(null)} className="w-full h-12 bg-secondary text-foreground font-bold rounded-xl">إغلاق الملف</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StudentBrief({ studentId }: { studentId: string }) {
  const firestore = useFirestore();
  const studentRef = useMemoFirebase(() => doc(firestore, 'students', studentId), [firestore, studentId]);
  const { data: student } = useDoc(studentRef);
  return (
    <div className="flex flex-col text-right">
      <span className="text-sm font-bold truncate">{student?.name || '...'}</span>
      <span className="text-[10px] text-muted-foreground" dir="ltr">{student?.studentPhoneNumber}</span>
    </div>
  );
}

function StudentSubData({ studentId }: { studentId: string }) {
  const firestore = useFirestore();
  const enRef = useMemoFirebase(() => collection(firestore, 'students', studentId, 'enrollments'), [firestore, studentId]);
  const { data: enrollments, isLoading } = useCollection(enRef);

  return (
    <div className="space-y-4">
      <h3 className="font-bold border-r-4 border-primary pr-3 flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-primary" /> الكورسات المشترك بها ({enrollments?.length || 0})
      </h3>
      {isLoading ? (
        <Loader2 className="w-6 h-6 animate-spin mx-auto" />
      ) : !enrollments || enrollments.length === 0 ? (
        <p className="text-sm text-muted-foreground italic bg-secondary/10 p-4 rounded-xl text-center">لا يوجد اشتراكات لهذا الطالب بعد.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {enrollments.map(en => (
            <div key={en.id} className="p-4 border rounded-2xl flex justify-between items-center bg-background shadow-sm">
              <div className="min-w-0">
                <p className="text-sm font-bold truncate">{en.courseTitle || 'كورس مجهول'}</p>
                <p className="text-[10px] text-muted-foreground">{new Date(en.enrollmentDate).toLocaleDateString('ar-EG')}</p>
              </div>
              <Badge variant={en.status === 'active' ? 'default' : 'secondary'} className={en.status === 'active' ? 'bg-accent' : ''}>
                {en.status === 'active' ? 'مفعل' : 'انتظار'}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
