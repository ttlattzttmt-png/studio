"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Trophy, ArrowLeft, Loader2, User, Megaphone, Clock, Search, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { useFirestore, useUser, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, query, orderBy, limit } from 'firebase/firestore';

export default function StudentDashboard() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
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

  if (!user) return <div className="p-20 text-center text-muted-foreground italic">يرجى تسجيل الدخول أولاً.</div>;

  const activeEnrollments = enrollments?.filter(e => e.status === 'active');
  const pendingEnrollments = enrollments?.filter(e => e.status === 'pending');
  const firstName = studentProfile?.name ? studentProfile.name.split(' ')[0] : 'المجتهد';

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 text-right">
        <div>
          <h1 className="text-3xl md:text-4xl font-headline font-bold mb-2">أهلاً بك، يا بشمهندس {firstName}</h1>
          <p className="text-muted-foreground">كل دروسك وامتحاناتك هنا، جاهز للتفوق؟</p>
        </div>
        <div className="flex items-center gap-3 bg-card p-4 rounded-2xl border border-primary/20 shadow-lg">
          <Trophy className="w-8 h-8 text-primary" />
          <div>
            <p className="text-[10px] text-muted-foreground">نقاط التفوق</p>
            <p className="text-xl font-bold text-primary">{studentProfile?.points || 0} نقطة</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
           {/* البطاقة الترحيبية للبحث عن الكورسات */}
           <Card className="bg-primary text-primary-foreground p-8 rounded-[2rem] shadow-2xl relative overflow-hidden text-right">
              <div className="relative z-10 space-y-4">
                <h2 className="text-2xl font-bold">هل تبحث عن كورس جديد؟</h2>
                <p className="opacity-90 max-w-md">تصفح مكتبة الكورسات المتاحة واطلب الانضمام لأي كورس بضغطة زر واحدة.</p>
                <Link href="/courses">
                  <Button className="bg-white text-primary font-bold rounded-xl h-12 px-8 mt-4 hover:bg-white/90">
                    <Search className="w-4 h-4 ml-2" /> استعرض الكورسات الآن
                  </Button>
                </Link>
              </div>
              <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
           </Card>

           <div>
              <div className="flex items-center justify-between mb-6">
                <Link href="/student/my-courses" className="text-primary hover:underline text-sm font-bold flex items-center gap-1"><ArrowLeft className="w-4 h-4" /> عرض الكل</Link>
                <h2 className="text-2xl font-headline font-bold">دروسي المفعلة</h2>
              </div>
              
              {!activeEnrollments || activeEnrollments.length === 0 ? (
                <div className="p-16 text-center bg-secondary/10 rounded-3xl border-2 border-dashed border-primary/10">
                  <Play className="w-12 h-12 text-primary/20 mx-auto mb-4" />
                  <p className="text-muted-foreground font-medium mb-6">لا توجد دروس مفعلة حالياً.</p>
                  <Link href="/courses"><Button className="bg-primary text-primary-foreground font-bold">اطلب انضمام لكورس الآن</Button></Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeEnrollments.map(en => (
                    <Card key={en.id} className="bg-card hover:border-primary/30 transition-all cursor-pointer group shadow-sm text-right">
                      <CardContent className="p-6">
                         <div className="flex justify-between items-center mb-4">
                           <span className="text-[10px] font-bold px-2 py-1 bg-accent/10 text-accent rounded-full">مفعل</span>
                           <Play className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
                         </div>
                         <h4 className="text-lg font-bold mb-4">{en.courseTitle || en.courseId}</h4>
                         <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden mb-2">
                           <div className="h-full bg-primary" style={{ width: `${en.progressPercentage}%` }} />
                         </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
           </div>
        </div>

        <div className="space-y-8">
           {/* طلبات بانتظار الموافقة */}
           {pendingEnrollments && pendingEnrollments.length > 0 && (
             <Card className="bg-accent/5 border-accent/20 text-right">
                <CardHeader>
                  <CardTitle className="text-lg font-bold flex items-center gap-2 justify-end">
                    بانتظار التفعيل <Clock className="w-5 h-5 text-accent" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {pendingEnrollments.map(en => (
                    <div key={en.id} className="p-3 bg-card border rounded-xl text-xs flex justify-between items-center">
                      <span className="font-bold">{en.courseTitle || en.courseId}</span>
                      <span className="text-[9px] text-muted-foreground">قيد المراجعة...</span>
                    </div>
                  ))}
                  <p className="text-[9px] text-muted-foreground pt-2">سيتم تفعيل الكورسات أعلاه بواسطة البشمهندس خلال وقت قصير.</p>
                </CardContent>
             </Card>
           )}

           <Card className="bg-card border-primary/10 shadow-sm overflow-hidden text-right">
             <CardHeader className="border-b bg-secondary/5 py-4">
               <CardTitle className="text-lg font-bold flex items-center gap-2 justify-end">
                 آخر التنبيهات <Megaphone className="w-5 h-5 text-primary" />
               </CardTitle>
             </CardHeader>
             <CardContent className="p-0">
                {isNotificationsLoading ? (
                  <div className="p-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" /></div>
                ) : !notifications || notifications.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-xs text-muted-foreground italic">لا توجد رسائل حالياً.</p>
                  </div>
                ) : (
                  <div className="divide-y max-h-[400px] overflow-y-auto">
                    {notifications.map((notif: any) => (
                      <div key={notif.id} className="p-5 hover:bg-secondary/10 transition-colors">
                        <h5 className="text-sm font-bold text-primary mb-1">{notif.title}</h5>
                        <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">{notif.message}</p>
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
