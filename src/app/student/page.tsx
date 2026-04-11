"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Play, Trophy, ArrowLeft, Loader2, User, Megaphone, Clock, BookOpen, Star } from 'lucide-react';
import Link from 'next/link';
import { useFirestore, useUser, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, query, orderBy, limit } from 'firebase/firestore';

export default function StudentDashboard() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [redeemCode, setRedeemCode] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const studentRef = useMemoFirebase(() => {
    if (!firestore || isUserLoading || !user?.uid) return null;
    return doc(firestore, 'students', user.uid);
  }, [firestore, user?.uid, isUserLoading]);

  const enrollmentsRef = useMemoFirebase(() => {
    if (!firestore || isUserLoading || !user?.uid) return null;
    return collection(firestore, 'students', user.uid, 'enrollments');
  }, [firestore, user?.uid, isUserLoading]);

  const notificationsRef = useMemoFirebase(() => {
    if (!firestore || isUserLoading) return null;
    return query(collection(firestore, 'notifications'), orderBy('createdAt', 'desc'), limit(5));
  }, [firestore, isUserLoading]);

  const { data: studentProfile, isLoading: isProfileLoading } = useDoc(studentRef);
  const { data: enrollments, isLoading: isEnrollmentsLoading } = useCollection(enrollmentsRef);
  const { data: notifications, isLoading: isNotificationsLoading } = useCollection(notificationsRef);

  if (!mounted || isUserLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center space-y-6 animate-in fade-in duration-500">
        <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center text-muted-foreground opacity-20">
          <User className="w-12 h-12" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-headline font-bold">يرجى تسجيل الدخول أولاً</h2>
          <p className="text-muted-foreground max-w-sm">يجب أن تكون مسجلاً كطالب للوصول إلى لوحة التحكم الخاصة بك ومتابعة دروسك.</p>
        </div>
        <Link href="/login">
          <Button className="h-14 px-10 bg-primary text-primary-foreground font-bold rounded-xl text-lg shadow-lg shadow-primary/20 transition-transform hover:scale-105">
            تسجيل الدخول للمنصة
          </Button>
        </Link>
      </div>
    );
  }

  const firstName = studentProfile?.name ? studentProfile.name.split(' ')[0] : 'المجتهد';

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="text-right">
          <h1 className="text-4xl font-headline font-bold mb-2">أهلاً بك، يا بشمهندس {firstName}</h1>
          <p className="text-muted-foreground">كل دروسك وامتحاناتك هنا، جاهز للتفوق؟</p>
        </div>
        <div className="flex items-center gap-3 bg-card p-4 rounded-2xl border border-primary/20 shadow-lg shadow-primary/5">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Trophy className="w-6 h-6" />
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">نقاط التفوق</p>
            <p className="text-xl font-bold text-primary">{studentProfile?.points || 0} نقطة</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
           <Card className="bg-card border-primary/10 overflow-hidden shadow-sm">
             <div className="h-2 bg-primary" />
             <CardHeader className="text-right">
               <CardTitle className="text-xl font-bold flex items-center gap-2 justify-end">
                 بياناتك الأكاديمية <User className="w-5 h-5 text-primary" />
               </CardTitle>
             </CardHeader>
             <CardContent>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                 <div className="p-4 rounded-xl bg-secondary/20 border border-primary/5 text-right">
                   <p className="text-xs text-muted-foreground mb-1">الاسم بالكامل</p>
                   <p className="font-bold text-lg">{studentProfile?.name || '---'}</p>
                 </div>
                 <div className="p-4 rounded-xl bg-secondary/20 border border-primary/5 text-right">
                   <p className="text-xs text-muted-foreground mb-1">المرحلة الدراسية</p>
                   <p className="font-bold text-lg">{studentProfile?.academicYear || '---'}</p>
                 </div>
                 <div className="p-4 rounded-xl bg-secondary/20 border border-primary/5 text-right">
                   <p className="text-xs text-muted-foreground mb-1">رقم الهاتف</p>
                   <p className="font-bold text-lg" dir="ltr">{studentProfile?.studentPhoneNumber || '---'}</p>
                 </div>
                 <div className="p-4 rounded-xl bg-secondary/20 border border-primary/5 text-right">
                   <p className="text-xs text-muted-foreground mb-1">هاتف ولي الأمر</p>
                   <p className="font-bold text-lg" dir="ltr">{studentProfile?.parentPhoneNumber || '---'}</p>
                 </div>
               </div>
             </CardContent>
           </Card>

           <div>
              <div className="flex items-center justify-between mb-6">
                <Link href="/student/my-courses" className="text-primary hover:underline text-sm font-bold flex items-center gap-1"><ArrowLeft className="w-4 h-4" /> عرض الكل</Link>
                <h2 className="text-2xl font-headline font-bold">كورساتي المفعلة</h2>
              </div>
              
              {isEnrollmentsLoading ? (
                 <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></div>
              ) : enrollments && enrollments.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {enrollments.map(enrollment => (
                    <Card key={enrollment.id} className="bg-card hover:border-primary/30 transition-all cursor-pointer group shadow-sm text-right">
                      <CardContent className="p-6">
                         <div className="flex justify-between items-start mb-4">
                           <span className={`text-[10px] font-bold px-2 py-1 rounded ${enrollment.isCompleted ? 'bg-accent text-accent-foreground' : 'bg-secondary text-foreground'}`}>
                             {enrollment.isCompleted ? 'مكتمل' : 'قيد الدراسة'}
                           </span>
                           <div className="w-12 h-12 rounded-xl bg-primary/10 group-hover:bg-primary transition-colors flex items-center justify-center">
                             <Play className="w-6 h-6 text-primary group-hover:text-primary-foreground" />
                           </div>
                         </div>
                         <h4 className="text-lg font-bold mb-4">كود الكورس: {enrollment.courseId}</h4>
                         <div className="w-full h-2 bg-secondary rounded-full overflow-hidden mb-2">
                           <div className="h-full bg-primary" style={{ width: `${enrollment.progressPercentage}%` }} />
                         </div>
                         <div className="flex items-center justify-between text-[10px] font-bold">
                           <span className="text-primary">{enrollment.progressPercentage}%</span>
                           <span className="text-muted-foreground">تقدمك الدراسي</span>
                         </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="p-16 text-center bg-secondary/10 rounded-3xl border-2 border-dashed border-primary/10">
                  <Play className="w-12 h-12 text-primary/20 mx-auto mb-4" />
                  <p className="text-muted-foreground font-medium mb-6">لم تقم بتفعيل أي كورس بعد.</p>
                  <Link href="/student/redeem"><Button className="bg-primary text-primary-foreground font-bold h-12 px-8 rounded-xl">تفعيل أول كورس الآن</Button></Link>
                </div>
              )}
           </div>
        </div>

        <div className="space-y-8">
           <Card className="bg-primary text-primary-foreground p-8 rounded-3xl shadow-2xl shadow-primary/20 relative overflow-hidden group text-right">
              <div className="relative z-10 space-y-4">
                <h4 className="text-xl font-bold flex items-center gap-2 justify-end"><Star className="w-5 h-5" /> تفعيل كورس جديد</h4>
                <p className="text-sm opacity-90 leading-relaxed">أدخل الكود الذي استلمته لتفعيل المحتوى فوراً.</p>
                <Input 
                  placeholder="ENG-XXXX-XXXX" 
                  value={redeemCode}
                  onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50 text-center font-mono font-bold text-lg h-12" 
                />
                <Button 
                  onClick={() => window.location.href=`/student/redeem?code=${redeemCode}`}
                  className="w-full h-12 bg-white text-primary font-bold hover:bg-white/90"
                >
                  تفعيل الآن
                </Button>
              </div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
           </Card>

           <Card className="bg-card border-primary/10 shadow-sm overflow-hidden text-right">
             <CardHeader className="border-b bg-secondary/5 py-4">
               <CardTitle className="text-lg font-bold flex items-center gap-2 justify-end">
                 مركز التنبيهات <Megaphone className="w-5 h-5 text-primary" />
               </CardTitle>
             </CardHeader>
             <CardContent className="p-0">
                {isNotificationsLoading ? (
                  <div className="p-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" /></div>
                ) : !notifications || notifications.length === 0 ? (
                  <div className="text-center py-12">
                    <Megaphone className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-10" />
                    <p className="text-xs text-muted-foreground italic">لا توجد رسائل حالياً.</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {notifications.map((notif: any) => (
                      <div key={notif.id} className="p-5 hover:bg-secondary/10 transition-colors">
                        <h5 className="text-sm font-bold text-primary mb-1">{notif.title}</h5>
                        <p className="text-xs text-muted-foreground line-clamp-3">{notif.message}</p>
                        <div className="mt-2 flex items-center gap-1 text-[9px] text-muted-foreground italic justify-end">
                          <span>{notif.createdAt?.toDate ? notif.createdAt.toDate().toLocaleString('ar-EG') : 'الآن'}</span>
                          <Clock className="w-3 h-3" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
             </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}