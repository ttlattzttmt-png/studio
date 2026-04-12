"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  BookOpen
} from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, collectionGroup, doc, updateDoc, query, orderBy } from 'firebase/firestore';
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
      toast({ title: "تم تفعيل الكورس للطالب بنجاح" });
    } catch (e) { 
      console.error(e);
      toast({ variant: "destructive", title: "خطأ في التفعيل" });
    }
  };

  const filteredStudents = students?.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (s.studentPhoneNumber && s.studentPhoneNumber.includes(searchTerm)) ||
    (s.email && s.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 text-right">
        <div>
          <h1 className="text-4xl font-headline font-bold">إدارة شؤون الطلاب</h1>
          <p className="text-muted-foreground">تابع ملفات الطلاب، درجاتهم، ونشاطهم التعليمي لحظة بلحظة.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-1 bg-accent/5 border-accent/20 h-fit text-right">
          <CardHeader className="border-b border-accent/10">
            <CardTitle className="text-sm font-bold flex items-center gap-2 justify-end">
              <AlertCircle className="w-4 h-4 text-accent" /> طلبات تفعيل معلقة ({pendingRequests?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {!pendingRequests || pendingRequests.length === 0 ? (
              <p className="text-xs text-center text-muted-foreground italic py-4">لا توجد طلبات جديدة.</p>
            ) : (
              pendingRequests.map(req => (
                <div key={req.id} className="p-4 bg-card border border-accent/10 rounded-2xl flex flex-col gap-3 shadow-sm">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-full uppercase">طلب جديد</span>
                    <p className="text-xs font-bold leading-tight">{req.courseTitle}</p>
                    <p className="text-[10px] text-muted-foreground">ID: {req.studentId.substring(0, 8)}...</p>
                  </div>
                  <Button size="sm" onClick={() => handleActivateEnrollment(req)} className="w-full h-9 bg-accent hover:bg-accent/90 text-white font-bold rounded-xl text-xs">تفعيل الكورس</Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 bg-card border-primary/5">
          <CardHeader className="border-b bg-secondary/5 flex justify-end">
            <div className="relative w-full max-w-sm">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="بحث بالاسم، الإيميل أو الهاتف..." 
                className="pr-10 bg-background border-primary/10 text-right" 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
              />
            </div>
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
                ) : !filteredStudents || filteredStudents.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-20 text-muted-foreground italic">لا يوجد طلاب مسجلون يطابقون البحث.</TableCell></TableRow>
                ) : (
                  filteredStudents.map(s => (
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
                      <TableCell className="text-right"><Badge variant="outline" className="font-medium">{s.academicYear}</Badge></TableCell>
                      <TableCell className="text-right font-mono text-xs">{s.studentPhoneNumber}</TableCell>
                      <TableCell className="text-left">
                        <Button variant="secondary" onClick={() => setSelectedStudent(s)} className="h-9 px-4 rounded-xl gap-2 font-bold group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                          الملف الأكاديمي الشامل
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

      <Dialog open={!!selectedStudent} onOpenChange={() => setSelectedStudent(null)}>
        <DialogContent className="max-w-5xl bg-card max-h-[90vh] overflow-y-auto text-right border-primary/20 p-0 overflow-hidden">
          <div className="p-8 bg-gradient-to-l from-primary/10 to-transparent border-b">
            <div className="flex flex-col md:flex-row items-center gap-6 justify-end">
              <div className="text-right space-y-2 order-2 md:order-1">
                <h2 className="text-3xl font-headline font-bold text-primary">{selectedStudent?.name}</h2>
                <div className="flex flex-wrap gap-4 justify-end text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><Mail className="w-4 h-4" /> {selectedStudent?.email}</span>
                  <span className="flex items-center gap-1"><GraduationCap className="w-4 h-4" /> {selectedStudent?.academicYear}</span>
                </div>
              </div>
              <div className="w-24 h-24 rounded-[2rem] bg-primary text-primary-foreground flex items-center justify-center font-bold text-4xl shadow-xl shadow-primary/20 order-1 md:order-2">
                {selectedStudent?.name?.[0]}
              </div>
            </div>
          </div>

          <div className="p-8 space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <InfoBox icon={<Phone />} label="هاتف الطالب" value={selectedStudent?.studentPhoneNumber} />
              <InfoBox icon={<Phone />} label="هاتف ولي الأمر" value={selectedStudent?.parentPhoneNumber} />
              <InfoBox icon={<Calendar />} label="تاريخ الانضمام" value={selectedStudent?.registrationDate && new Date(selectedStudent.registrationDate).toLocaleDateString('ar-EG')} />
              <InfoBox icon={<Clock />} label="آخر ظهور" value={selectedStudent?.lastLoginDate ? new Date(selectedStudent.lastLoginDate).toLocaleString('ar-EG') : 'غير متوفر'} />
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
    <div className="p-5 bg-secondary/20 rounded-2xl border border-white/5 shadow-sm group hover:border-primary/20 transition-all text-right">
      <div className="flex items-center gap-2 text-primary mb-2 text-[10px] font-bold justify-end">
        <span>{label}</span> {icon}
      </div>
      <p className="font-bold text-sm truncate">{value || '---'}</p>
    </div>
  );
}

function StudentAcademicProgress({ studentId }: { studentId: string }) {
  const firestore = useFirestore();
  
  const studentEnrollmentsRef = useMemoFirebase(() => {
    if (!firestore || !studentId) return null;
    return collection(firestore, 'students', studentId, 'enrollments');
  }, [firestore, studentId]);

  const { data: enrollments } = useCollection(studentEnrollmentsRef);

  const attemptsRef = useMemoFirebase(() => {
    if (!firestore || !studentId) return null;
    return query(collection(firestore, 'students', studentId, 'quiz_attempts'), orderBy('submittedAt', 'desc'));
  }, [firestore, studentId]);

  const { data: attempts, isLoading: isAttemptsLoading } = useCollection(attemptsRef);

  const progressRef = useMemoFirebase(() => {
    if (!firestore || !studentId) return null;
    return query(collection(firestore, 'students', studentId, 'video_progress'), orderBy('lastWatchedAt', 'desc'));
  }, [firestore, studentId]);

  const { data: videoProgress } = useCollection(progressRef);

  return (
    <div className="space-y-8">
      <Card className="bg-card border-primary/5">
        <CardHeader className="border-b p-4 bg-secondary/5">
          <CardTitle className="text-sm font-bold flex items-center gap-2 justify-end">
            <BookOpen className="w-4 h-4 text-primary" /> حالة الاشتراكات والتقدم
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {!enrollments || enrollments.length === 0 ? (
            <p className="text-xs text-center text-muted-foreground py-4">لا توجد اشتراكات مسجلة.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {enrollments.map(en => (
                <div key={en.id} className="p-4 bg-secondary/10 rounded-xl border border-white/5 space-y-3 text-right">
                  <div className="flex justify-between items-center">
                    <Badge variant={en.status === 'active' ? 'default' : 'secondary'} className="text-[9px]">
                      {en.status === 'active' ? 'مفعل' : 'بانتظار الموافقة'}
                    </Badge>
                    <p className="font-bold text-sm">{en.courseTitle || 'كورس غير مسمى'}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] font-bold">
                      <span className="text-primary">{en.progressPercentage || 0}%</span>
                      <span className="text-muted-foreground">نسبة الإنجاز</span>
                    </div>
                    <Progress value={en.progressPercentage || 0} className="h-1.5" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <Card className="bg-card shadow-sm border-primary/5">
          <CardHeader className="border-b bg-accent/5 p-4 flex flex-row items-center justify-between">
            <Badge variant="secondary" className="text-[10px]">{attempts?.length || 0} محاولات</Badge>
            <CardTitle className="text-sm font-bold flex items-center gap-2 justify-end">
              <ClipboardList className="w-4 h-4 text-accent" /> سجل الامتحانات والنتائج
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 max-h-[400px] overflow-y-auto">
            {isAttemptsLoading ? (
              <div className="p-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>
            ) : !attempts || attempts.length === 0 ? (
              <div className="p-20 text-center text-muted-foreground italic flex flex-col items-center gap-2">
                <AlertCircle className="w-8 h-8 opacity-10" />
                <p className="text-xs">لا توجد محاولات امتحانية مسجلة.</p>
              </div>
            ) : (
              <div className="divide-y">
                {attempts.map(a => (
                  <div key={a.id} className="p-4 flex justify-between items-center hover:bg-accent/5 transition-colors text-right">
                    <div className="text-left">
                      <div className={`text-xl font-black ${a.score >= 50 ? 'text-accent' : 'text-destructive'}`}>
                        {a.score}%
                      </div>
                      <Badge variant="outline" className="text-[9px] h-4">{a.isGraded ? 'تم التصحيح' : 'قيد المراجعة'}</Badge>
                    </div>
                    <div className="space-y-1">
                      <p className="font-bold text-sm">امتحان ID: {a.courseContentId.substring(0, 8)}...</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(a.submittedAt).toLocaleString('ar-EG')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card shadow-sm border-primary/5">
          <CardHeader className="border-b bg-primary/5 p-4 flex flex-row items-center justify-between">
            <Badge variant="secondary" className="text-[10px]">{videoProgress?.length || 0} فيديو</Badge>
            <CardTitle className="text-sm font-bold flex items-center gap-2 justify-end">
              <PlayCircle className="w-4 h-4 text-primary" /> الدروس التي تم إكمالها
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 max-h-[400px] overflow-y-auto">
            {!videoProgress || videoProgress.length === 0 ? (
              <div className="p-20 text-center text-muted-foreground italic flex flex-col items-center gap-2">
                <PlayCircle className="w-8 h-8 opacity-10" />
                <p className="text-xs">لم يكمل الطالب أي دروس بعد.</p>
              </div>
            ) : (
              <div className="divide-y">
                {videoProgress.map(p => (
                  <div key={p.id} className="p-4 flex justify-between items-center hover:bg-primary/5 transition-colors text-right">
                    <Badge className="bg-accent text-white gap-1 text-[10px] h-6 px-3">
                      <CheckCircle2 className="w-3 h-3" /> مكتمل
                    </Badge>
                    <div className="space-y-1">
                      <p className="font-bold text-sm">فيديو ID: {p.courseContentId.substring(0, 8)}...</p>
                      <p className="text-[10px] text-muted-foreground">تاريخ المشاهدة: {new Date(p.lastWatchedAt).toLocaleDateString('ar-EG')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
