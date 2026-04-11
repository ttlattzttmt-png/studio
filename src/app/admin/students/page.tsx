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
  DialogDescription 
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
  Clock
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
  
  // جلب كافة الطلاب
  const studentsRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'students');
  }, [firestore, user]);

  const { data: students, isLoading } = useCollection(studentsRef);

  // جلب كافة طلبات الاشتراك (Pending) باستخدام Collection Group
  const enrollmentsRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collectionGroup(firestore, 'enrollments');
  }, [firestore, user]);

  const { data: allEnrollments, isLoading: isEnrollingLoading } = useCollection(enrollmentsRef);

  const pendingRequests = allEnrollments?.filter(e => e.status === 'pending');

  const handleActivateEnrollment = async (enrollment: any) => {
    if (!firestore) return;
    try {
      // تحديث حالة الاشتراك في مسار الطالب ليكون "مفعل"
      const enRef = doc(firestore, 'students', enrollment.studentId, 'enrollments', enrollment.id);
      await updateDoc(enRef, { status: 'active', activationDate: new Date().toISOString() });
      toast({ title: "تم التفعيل", description: "الكورس متاح للطالب الآن." });
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
      toast({ title: "تم الرفض", description: "تم حذف طلب الانضمام بنجاح." });
    } catch (e) { console.error(e); }
  };

  const filteredStudents = students?.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.studentPhoneNumber.includes(searchTerm)
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-headline font-bold mb-2">إدارة الطلاب والاشتراكات</h1>
          <p className="text-muted-foreground">راجع طلبات الانضمام وفعّل الكورسات للطلاب يدوياً بضغطة زر.</p>
        </div>
      </div>

      {/* قسم طلبات الانضمام الجديدة */}
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
                <Card key={req.id} className="bg-card shadow-sm border-primary/10 hover:border-primary/30 transition-all">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <StudentBrief studentId={req.studentId} />
                      <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">طلب جديد</Badge>
                    </div>
                    <div className="bg-secondary/20 p-2 rounded text-xs font-bold border border-primary/5">
                      كورس: {req.courseTitle || req.courseId}
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button onClick={() => handleActivateEnrollment(req)} className="flex-grow bg-accent text-white hover:bg-accent/90 h-10 text-xs gap-1 font-bold">
                        <CheckCircle className="w-3 h-3" /> تفعيل الآن
                      </Button>
                      <Button onClick={() => handleDeleteRequest(req)} variant="ghost" className="text-destructive h-10 text-xs">
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
              placeholder="بحث عن طالب بالاسم أو الهاتف..." 
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
                <TableRow><TableCell colSpan={4} className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></TableCell></TableRow>
              ) : filteredStudents?.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground">لا يوجد طلاب مطابقين للبحث.</TableCell></TableRow>
              ) : filteredStudents?.map((student) => (
                <TableRow key={student.id} className="group hover:bg-secondary/5 transition-colors">
                  <TableCell className="font-bold">{student.name}</TableCell>
                  <TableCell>{student.academicYear}</TableCell>
                  <TableCell>{student.studentPhoneNumber}</TableCell>
                  <TableCell className="text-left">
                    <Button variant="secondary" size="sm" onClick={() => setSelectedStudent(student)} className="font-bold text-xs gap-1">
                      التفاصيل <ChevronLeft className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selectedStudent} onOpenChange={() => setSelectedStudent(null)}>
        <DialogContent className="max-w-3xl bg-card border-primary/20">
          <DialogHeader className="text-right border-b pb-4">
            <DialogTitle className="text-2xl font-bold text-primary">{selectedStudent?.name}</DialogTitle>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                 <div className="p-4 bg-secondary/10 rounded-2xl border border-primary/5">
                   <p className="text-[10px] text-muted-foreground font-bold mb-1">هاتف الطالب</p>
                   <p className="font-bold text-lg">{selectedStudent.studentPhoneNumber}</p>
                 </div>
                 <div className="p-4 bg-secondary/10 rounded-2xl border border-primary/5">
                   <p className="text-[10px] text-muted-foreground font-bold mb-1">هاتف ولي الأمر</p>
                   <p className="font-bold text-lg">{selectedStudent.parentPhoneNumber}</p>
                 </div>
              </div>
              <StudentSubData studentId={selectedStudent.id} />
            </div>
          )}
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
      <span className="text-[10px] text-muted-foreground">{student?.studentPhoneNumber}</span>
    </div>
  );
}

function StudentSubData({ studentId }: { studentId: string }) {
  const firestore = useFirestore();
  const enRef = useMemoFirebase(() => collection(firestore, 'students', studentId, 'enrollments'), [firestore, studentId]);
  const { data: enrollments } = useCollection(enRef);

  return (
    <div className="space-y-4">
      <h3 className="font-bold border-r-4 border-primary pr-3">الاشتراكات والطلبات الحالية</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {enrollments?.map(en => (
          <div key={en.id} className="p-4 border rounded-2xl flex justify-between items-center bg-background/50 hover:border-primary/30 transition-all">
            <div className="flex flex-col">
              <span className="text-sm font-bold">{en.courseTitle || 'كورس'}</span>
              <span className="text-[9px] text-muted-foreground">معرف: {en.courseId}</span>
            </div>
            <Badge variant={en.status === 'active' ? 'default' : 'secondary'} className={en.status === 'active' ? 'bg-accent text-white' : ''}>
              {en.status === 'active' ? 'مفعل' : 'انتظار'}
            </Badge>
          </div>
        ))}
        {!enrollments || enrollments.length === 0 && <p className="text-xs text-muted-foreground italic">لا يوجد اشتراكات بعد.</p>}
      </div>
    </div>
  );
}