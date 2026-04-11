
"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
  ChevronLeft
} from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection } from 'firebase/firestore';

export default function AdminStudents() {
  const firestore = useFirestore();
  const { user } = useUser();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  
  const studentsRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'students');
  }, [firestore, user]);

  const { data: students, isLoading } = useCollection(studentsRef);

  const filteredStudents = students?.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.studentPhoneNumber.includes(searchTerm)
  );

  if (!user) return <div className="p-20 text-center text-muted-foreground">جاري التحقق من الصلاحيات...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-headline font-bold mb-2">إدارة الطلاب</h1>
          <p className="text-muted-foreground">عرض بيانات جميع الطلاب ومتابعة تقدمهم الدراسي.</p>
        </div>
        <Button className="h-14 px-8 bg-primary text-primary-foreground font-bold rounded-xl gap-2 text-lg">
          <UserPlus className="w-6 h-6" /> إضافة طالب يدوي
        </Button>
      </div>

      <Card className="bg-card">
        <CardHeader className="border-b pb-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input 
              placeholder="بحث عن طالب بالاسم أو الهاتف..." 
              className="pr-10 bg-background border-primary/10" 
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
                <TableHead className="text-right">هاتف ولي الأمر</TableHead>
                <TableHead className="text-left">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8">جاري التحميل...</TableCell></TableRow>
              ) : !filteredStudents || filteredStudents.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8">لا يوجد طلاب مطابقين للبحث.</TableCell></TableRow>
              ) : (
                filteredStudents.map((student) => (
                  <TableRow key={student.id} className="group">
                    <TableCell className="font-bold">{student.name}</TableCell>
                    <TableCell>{student.academicYear}</TableCell>
                    <TableCell>{student.studentPhoneNumber}</TableCell>
                    <TableCell>{student.parentPhoneNumber}</TableCell>
                    <TableCell className="text-left">
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="font-bold gap-2"
                        onClick={() => setSelectedStudent(student)}
                      >
                        التفاصيل <ChevronLeft className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* نافذة تفاصيل الطالب */}
      <Dialog open={!!selectedStudent} onOpenChange={() => setSelectedStudent(null)}>
        <DialogContent className="max-w-3xl bg-card border-primary/20 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="text-right border-b pb-4">
            <DialogTitle className="text-2xl font-bold text-primary">{selectedStudent?.name}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              بيانات الطالب وتاريخ نشاطه على المنصة
            </DialogDescription>
          </DialogHeader>

          {selectedStudent && (
            <div className="space-y-8 py-4">
              {/* البيانات الأساسية */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-secondary/30 space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" /> البريد الإلكتروني</p>
                  <p className="font-bold">{selectedStudent.email}</p>
                </div>
                <div className="p-4 rounded-xl bg-secondary/30 space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><GraduationCap className="w-3 h-3" /> السنة الدراسية</p>
                  <p className="font-bold">{selectedStudent.academicYear}</p>
                </div>
                <div className="p-4 rounded-xl bg-secondary/30 space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" /> رقم الطالب</p>
                  <p className="font-bold">{selectedStudent.studentPhoneNumber}</p>
                </div>
                <div className="p-4 rounded-xl bg-secondary/30 space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" /> هاتف ولي الأمر</p>
                  <p className="font-bold">{selectedStudent.parentPhoneNumber}</p>
                </div>
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Award className="w-3 h-3" /> نقاط التفوق</p>
                  <p className="text-xl font-black text-primary">{selectedStudent.points || 0}</p>
                </div>
                <div className="p-4 rounded-xl bg-secondary/30 space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> تاريخ التسجيل</p>
                  <p className="font-bold">{new Date(selectedStudent.registrationDate).toLocaleDateString('ar-EG')}</p>
                </div>
              </div>

              {/* الكورسات المشترك فيها */}
              <StudentSubData studentId={selectedStudent.id} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// مكون فرعي لجلب بيانات الكورسات والاختبارات الخاصة بالطالب المحدد
function StudentSubData({ studentId }: { studentId: string }) {
  const firestore = useFirestore();
  
  const enrollmentsRef = useMemoFirebase(() => {
    if (!firestore || !studentId) return null;
    return collection(firestore, 'students', studentId, 'enrollments');
  }, [firestore, studentId]);

  const attemptsRef = useMemoFirebase(() => {
    if (!firestore || !studentId) return null;
    return collection(firestore, 'students', studentId, 'quiz_attempts');
  }, [firestore, studentId]);

  const { data: enrollments, isLoading: isEnLoading } = useCollection(enrollmentsRef);
  const { data: attempts, isLoading: isAtLoading } = useCollection(attemptsRef);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <h3 className="text-lg font-bold flex items-center gap-2 border-r-4 border-primary pr-3">
          <BookOpen className="w-5 h-5 text-primary" /> الكورسات المفعلة
        </h3>
        {isEnLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : (
          <div className="space-y-2">
            {!enrollments || enrollments.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">لا توجد اشتراكات مفعلة.</p>
            ) : (
              enrollments.map(en => (
                <div key={en.id} className="p-3 rounded-lg border bg-background flex justify-between items-center">
                  <span className="text-sm font-bold">كود: {en.courseId}</span>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{en.progressPercentage}%</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-bold flex items-center gap-2 border-r-4 border-accent pr-3">
          <Award className="w-5 h-5 text-accent" /> نتائج الامتحانات
        </h3>
        {isAtLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : (
          <div className="space-y-2">
            {!attempts || attempts.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">لا توجد محاولات اختبار.</p>
            ) : (
              attempts.map(at => (
                <div key={at.id} className="p-3 rounded-lg border bg-background flex justify-between items-center">
                  <span className="text-sm">امتحان: {at.courseContentId}</span>
                  <span className="text-sm font-black text-accent">{at.score}%</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
