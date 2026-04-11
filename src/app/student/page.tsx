
"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Play, Trophy, ArrowLeft, Loader2, User } from 'lucide-react';
import Link from 'next/link';
import { useFirestore, useUser, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc } from 'firebase/firestore';

export default function StudentDashboard() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const studentRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return doc(firestore, 'students', user.uid);
  }, [firestore, user?.uid]);

  const enrollmentsRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return collection(firestore, 'students', user.uid, 'enrollments');
  }, [firestore, user?.uid]);

  const { data: studentProfile, isLoading: isProfileLoading } = useDoc(studentRef);
  const { data: enrollments, isLoading: isEnrollmentsLoading } = useCollection(enrollmentsRef);

  if (isUserLoading || isProfileLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-headline font-bold mb-2">أهلاً بك، يا بشمهندس {studentProfile?.name?.split(' ')[0] || 'المجتهد'}</h1>
          <p className="text-muted-foreground">تابع دروسك وامتحاناتك من هنا بكل سهولة.</p>
        </div>
        <div className="flex items-center gap-3 bg-card p-4 rounded-2xl border">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">نقاط التفوق</p>
            <p className="text-xl font-bold">{studentProfile?.points || 0} نقطة</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
           <Card className="bg-card border-primary/20">
             <CardHeader className="flex flex-row items-center justify-between">
               <CardTitle className="text-xl font-bold flex items-center gap-2">
                 <User className="w-5 h-5 text-primary" /> بياناتي الشخصية
               </CardTitle>
             </CardHeader>
             <CardContent>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                 <div className="p-3 rounded-lg bg-secondary/30">
                   <p className="text-muted-foreground">الاسم الكامل</p>
                   <p className="font-bold">{studentProfile?.name || '---'}</p>
                 </div>
                 <div className="p-3 rounded-lg bg-secondary/30">
                   <p className="text-muted-foreground">السنة الدراسية</p>
                   <p className="font-bold">{studentProfile?.academicYear || '---'}</p>
                 </div>
                 <div className="p-3 rounded-lg bg-secondary/30">
                   <p className="text-muted-foreground">البريد الإلكتروني</p>
                   <p className="font-bold">{studentProfile?.email || '---'}</p>
                 </div>
                 <div className="p-3 rounded-lg bg-secondary/30">
                   <p className="text-muted-foreground">رقم الهاتف</p>
                   <p className="font-bold">{studentProfile?.studentPhoneNumber || '---'}</p>
                 </div>
               </div>
             </CardContent>
           </Card>

           <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-headline font-bold">كورساتي المفعلة</h2>
                <Link href="/student/my-courses" className="text-primary hover:underline text-sm font-bold flex items-center gap-1">مشاهدة الكل <ArrowLeft className="w-4 h-4" /></Link>
              </div>
              
              {isEnrollmentsLoading ? (
                 <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
              ) : enrollments && enrollments.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {enrollments.map(enrollment => (
                    <Card key={enrollment.id} className="bg-card hover:border-primary/20 transition-all cursor-pointer">
                      <CardContent className="p-6">
                         <div className="flex justify-between items-start mb-4">
                           <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                             <Play className="w-6 h-6 text-primary" />
                           </div>
                           <span className={`text-xs px-2 py-1 rounded ${enrollment.isCompleted ? 'bg-accent/10 text-accent' : 'bg-primary/10 text-primary'}`}>
                             {enrollment.isCompleted ? 'مكتمل' : 'قيد الدراسة'}
                           </span>
                         </div>
                         <h4 className="text-lg font-bold mb-4">كود الكورس: {enrollment.courseId}</h4>
                         <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                           <div className="h-full bg-primary" style={{ width: `${enrollment.progressPercentage}%` }} />
                         </div>
                         <div className="flex items-center justify-between mt-2">
                           <span className="text-[10px] text-muted-foreground">نسبة الإنجاز</span>
                           <span className="text-[10px] font-bold text-primary">{enrollment.progressPercentage}%</span>
                         </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center bg-secondary/10 rounded-3xl border border-dashed">
                  <p className="text-muted-foreground mb-4">أنت غير مشترك في أي كورس حالياً.</p>
                  <Link href="/courses"><Button variant="outline">تصفح الكورسات المتاحة</Button></Link>
                </div>
              )}
           </div>
        </div>

        <div className="space-y-8">
           <Card className="bg-primary/5 border-primary/20 p-6 text-center space-y-4">
              <h4 className="font-bold">هل لديك كود تفعيل؟</h4>
              <p className="text-xs text-muted-foreground">اكتب الكود الذي استلمته من السكرتارية لتفعيل الكورس فوراً.</p>
              <Input placeholder="ENG-XXXX-XXXX" className="bg-background border-primary/20 text-center font-mono font-bold" />
              <Link href="/student/redeem" className="block w-full">
                <Button className="w-full bg-primary text-primary-foreground font-bold">تفعيل الآن</Button>
              </Link>
           </Card>

           <Card className="bg-card">
             <CardHeader className="border-b"><CardTitle className="text-lg font-bold">آخر التنبيهات</CardTitle></CardHeader>
             <CardContent className="p-4">
                <div className="text-center py-4">
                  <p className="text-xs text-muted-foreground italic">لا توجد رسائل جديدة حالياً.</p>
                </div>
             </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}
