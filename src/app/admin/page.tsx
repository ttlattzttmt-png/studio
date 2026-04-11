
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Video, Ticket, ClipboardList, TrendingUp, Loader2 } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection } from 'firebase/firestore';

export default function AdminOverview() {
  const [currentTime, setCurrentTime] = useState<string | null>(null);
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  useEffect(() => {
    // حل مشكلة Hydration باستخدام useEffect للوقت
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleTimeString('ar-EG'));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // جلب البيانات اللحظية للإحصائيات - لا يتم الاستعلام إلا إذا وجد مستخدم (أدمن) مؤكد
  const studentsRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'students');
  }, [firestore, user]);

  const coursesRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'courses');
  }, [firestore, user]);

  const codesRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'access_codes');
  }, [firestore, user]);

  const { data: students, isLoading: isStudentsLoading } = useCollection(studentsRef);
  const { data: courses, isLoading: isCoursesLoading } = useCollection(coursesRef);
  const { data: codes, isLoading: isCodesLoading } = useCollection(codesRef);

  const stats = [
    { 
      title: 'إجمالي الطلاب', 
      val: (isStudentsLoading || isUserLoading) ? '...' : (students?.length || 0).toString(), 
      icon: <Users className="text-blue-500" />, 
      trend: 'تحديث لحظي' 
    },
    { 
      title: 'الكورسات المفعلة', 
      val: (isCoursesLoading || isUserLoading) ? '...' : (courses?.length || 0).toString(), 
      icon: <Video className="text-primary" />, 
      trend: 'متاح للطلاب' 
    },
    { 
      title: 'الأكواد النشطة', 
      val: (isCodesLoading || isUserLoading) ? '...' : (codes?.filter(c => !c.isUsed).length || 0).toString(), 
      icon: <Ticket className="text-accent" />, 
      trend: 'أكواد غير مستخدمة' 
    },
    { 
      title: 'إجمالي الأكواد', 
      val: (isCodesLoading || isUserLoading) ? '...' : (codes?.length || 0).toString(), 
      icon: <ClipboardList className="text-purple-500" />, 
      trend: 'تم إنشاؤها' 
    },
  ];

  if (isUserLoading) return <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;
  if (!user) return <div className="p-20 text-center text-muted-foreground italic">يرجى تسجيل الدخول كمسؤول أولاً.</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-headline font-bold">لوحة تحكم البشمهندس</h1>
        <div className="bg-primary/10 text-primary px-4 py-2 rounded-xl text-sm font-bold border border-primary/20 min-w-[150px] text-center">
          {currentTime ? `آخر تحديث: ${currentTime}` : <Loader2 className="w-4 h-4 animate-spin mx-auto" />}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((s, i) => (
          <Card key={i} className="bg-card border-primary/5 hover:border-primary/20 transition-all group">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-bold text-muted-foreground">{s.title}</CardTitle>
              <div className="p-2 rounded-lg bg-secondary group-hover:scale-110 transition-transform">{s.icon}</div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">{s.val}</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-accent" /> {s.trend}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-card">
          <CardHeader>
            <CardTitle>أحدث الطلاب المسجلين</CardTitle>
          </CardHeader>
          <CardContent>
            {isStudentsLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : !students || students.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-2xl">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                <p className="text-muted-foreground">لا يوجد مشتركين جدد حالياً.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {students.slice(0, 5).map((student) => (
                  <div key={student.id} className="flex items-center justify-between p-4 rounded-xl bg-secondary/20 border">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {student.name?.[0] || 'S'}
                      </div>
                      <div>
                        <p className="font-bold">{student.name}</p>
                        <p className="text-xs text-muted-foreground">{student.academicYear}</p>
                      </div>
                    </div>
                    <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">طالب جديد</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader>
            <CardTitle>التحكم السريع</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="p-6 rounded-2xl bg-primary/5 border border-dashed border-primary/50 text-center space-y-4">
               <p className="text-sm text-muted-foreground">قم بإدارة المحتوى والإشعارات فوراً ليرى الطلاب التحديثات بلحظتها.</p>
               <button onClick={() => window.location.href='/admin/notifications'} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-colors">إرسال إشعار عام</button>
               <button onClick={() => window.location.href='/admin/courses'} className="w-full py-3 rounded-xl bg-secondary text-foreground hover:bg-secondary/80 transition-colors">إضافة كورس جديد</button>
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
