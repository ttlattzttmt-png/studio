"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, UserPlus, Phone, GraduationCap, Mail } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';

export default function AdminStudents() {
  const firestore = useFirestore();
  
  const studentsRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'students');
  }, [firestore]);

  const { data: students, isLoading } = useCollection(studentsRef);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-headline font-bold mb-2">إدارة الطلاب</h1>
          <p className="text-muted-foreground">عرض وبيانات جميع الطلاب المسجلين في المنصة.</p>
        </div>
        <Button className="h-14 px-8 bg-primary text-primary-foreground font-bold rounded-xl gap-2 text-lg">
          <UserPlus className="w-6 h-6" /> إضافة طالب يدوي
        </Button>
      </div>

      <Card className="bg-card">
        <CardHeader className="border-b pb-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input placeholder="بحث عن طالب بالاسم أو الهاتف..." className="pr-10 bg-background border-primary/10" />
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
                <TableHead className="text-right">تاريخ التسجيل</TableHead>
                <TableHead className="text-left">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8">جاري التحميل...</TableCell></TableRow>
              ) : students?.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8">لا يوجد طلاب مسجلين بعد.</TableCell></TableRow>
              ) : (
                students?.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-bold">{student.name}</TableCell>
                    <TableCell>{student.academicYear}</TableCell>
                    <TableCell>{student.studentPhoneNumber}</TableCell>
                    <TableCell>{student.parentPhoneNumber}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{student.registrationDate}</TableCell>
                    <TableCell className="text-left">
                      <Button variant="ghost" size="sm" className="text-primary font-bold">التفاصيل</Button>
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
