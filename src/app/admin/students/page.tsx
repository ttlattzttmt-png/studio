
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
  Phone, 
  GraduationCap, 
  Mail, 
  Calendar, 
  BookOpen, 
  Loader2,
  ChevronLeft,
  CheckCircle,
  Clock,
  User,
  ShieldAlert,
  PlayCircle,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, collectionGroup, doc, updateDoc, deleteDoc, query } from 'firebase/firestore';
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
      await updateDoc(enRef, { status: 'active', activationDate: new Date().toISOString() });
      toast({ title: "تم التفعيل" });
    } catch (e) { console.error(e); }
  };

  const filteredStudents = students?.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.studentPhoneNumber.includes(searchTerm)
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-4xl font-headline font-bold">ملفات الطلاب والرقابة</h1>
        <p className="text-muted-foreground">تابع تقدم الطلاب الدراسي، الفيديوهات المشاهدة، ونتائج الامتحانات.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-1 bg-primary/5 border-primary/20">
          <CardHeader><CardTitle className="text-sm">طلبات جديدة ({pendingRequests?.length})</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {pendingRequests?.map(req => (
              <div key={req.id} className="p-3 bg-card border rounded-lg flex flex-col gap-2">
                <span className="text-xs font-bold truncate">{req.courseTitle}</span>
                <Button size="sm" onClick={() => handleActivateEnrollment(req)} className="h-8 bg-accent">تفعيل الآن</Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 bg-card">
          <CardHeader className="border-b">
            <div className="relative w-64">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="بحث بالاسم..." className="pr-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead className="text-right">الطالب</TableHead>
                <TableHead className="text-right">السنة الدراسية</TableHead>
                <TableHead className="text-left">الإجراء</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filteredStudents?.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-bold">{s.name}</TableCell>
                    <TableCell>{s.academicYear}</TableCell>
                    <TableCell className="text-left">
                      <Button variant="secondary" onClick={() => setSelectedStudent(s)}>الملف الأكاديمي</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selectedStudent} onOpenChange={() => setSelectedStudent(null)}>
        <DialogContent className="max-w-4xl bg-card max-h-[90vh] overflow-y-auto text-right">
          <DialogHeader className="border-b pb-6">
            <div className="flex items-center gap-4 justify-end">
              <div>
                <DialogTitle className="text-2xl font-bold">{selectedStudent?.name}</DialogTitle>
                <p className="text-sm text-muted-foreground">{selectedStudent?.email}</p>
              </div>
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl">
                {selectedStudent?.name?.[0]}
              </div>
            </div>
          </DialogHeader>

          <div className="py-6 space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <InfoBox icon={<Phone />} label="هاتف الطالب" value={selectedStudent?.studentPhoneNumber} />
              <InfoBox icon={<Phone />} label="هاتف ولي الأمر" value={selectedStudent?.parentPhoneNumber} />
              <InfoBox icon={<Calendar />} label="انضم في" value={selectedStudent?.registrationDate && new Date(selectedStudent.registrationDate).toLocaleDateString('ar-EG')} />
            </div>

            <StudentAcademicProgress studentId={selectedStudent?.id} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoBox({ icon, label, value }: any) {
  return (
    <div className="p-4 bg-secondary/20 rounded-xl border border-primary/5">
      <div className="flex items-center gap-2 text-primary mb-1 text-xs font-bold">
        {icon} <span>{label}</span>
      </div>
      <p className="font-bold">{value || '---'}</p>
    </div>
  );
}

function StudentAcademicProgress({ studentId }: { studentId: string }) {
  const firestore = useFirestore();
  const attemptsRef = useMemoFirebase(() => query(collection(firestore, 'students', studentId, 'quiz_attempts')), [firestore, studentId]);
  const progressRef = useMemoFirebase(() => query(collection(firestore, 'students', studentId, 'video_progress')), [firestore, studentId]);

  const { data: attempts } = useCollection(attemptsRef);
  const { data: progress } = useCollection(progressRef);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <Card className="bg-secondary/10">
        <CardHeader className="border-b"><CardTitle className="text-sm font-bold flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-accent" /> نتائج الامتحانات</CardTitle></CardHeader>
        <CardContent className="p-0">
          {attempts?.length ? attempts.map(a => (
            <div key={a.id} className="p-4 border-b flex justify-between items-center text-xs">
              <span className="font-bold">امتحان ID: {a.courseContentId}</span>
              <Badge className={a.score >= 50 ? 'bg-accent' : 'bg-destructive'}>{a.score}%</Badge>
            </div>
          )) : <p className="p-8 text-center text-muted-foreground italic text-xs">لم يمتحن بعد.</p>}
        </CardContent>
      </Card>

      <Card className="bg-secondary/10">
        <CardHeader className="border-b"><CardTitle className="text-sm font-bold flex items-center gap-2"><PlayCircle className="w-4 h-4 text-primary" /> فيديوهات شاهدها</CardTitle></CardHeader>
        <CardContent className="p-0">
          {progress?.length ? progress.map(p => (
            <div key={p.id} className="p-4 border-b flex justify-between items-center text-xs">
              <span className="font-bold">فيديو ID: {p.courseContentId}</span>
              <Badge variant="outline" className="text-accent border-accent">مكتمل ✅</Badge>
            </div>
          )) : <p className="p-8 text-center text-muted-foreground italic text-xs">لم يشاهد فيديوهات بعد.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
