"use client";

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, PlayCircle, Clock, ChevronLeft } from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import Link from 'next/link';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function StudentDashboard() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const enrollmentsRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'students', user.uid, 'enrollments');
  }, [firestore, user]);

  const { data: enrollments, isLoading } = useCollection(enrollmentsRef);

  if (isUserLoading) return <div className="flex justify-center py-40"><Clock className="w-10 h-10 animate-spin text-primary" /></div>;

  const activeEnrollments = enrollments?.filter(e => e.status === 'active') || [];
  const pendingEnrollments = enrollments?.filter(e => e.status === 'pending') || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-headline font-bold mb-2">كورساتي المفعلة</h1>
          <p className="text-muted-foreground">هنا تجد كافة المحتويات التعليمية التي تم تفعيلها لك.</p>
        </div>
        <Link href="/courses">
          <Button className="bg-primary text-primary-foreground font-bold rounded-xl gap-2 h-12 shadow-lg shadow-primary/20">
            <BookOpen className="w-5 h-5" /> استكشف المزيد
          </Button>
        </Link>
      </div>

      <section>
        {isLoading ? (
          <div className="flex justify-center py-20"><Clock className="w-10 h-10 animate-spin text-primary" /></div>
        ) : activeEnrollments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeEnrollments.map((en, i) => (
              <Link key={en.id} href={`/student/courses/${en.courseId}`}>
                <Card className="bg-card hover:border-primary/30 transition-all group overflow-hidden border-primary/10 cursor-pointer shadow-xl">
                  <div className="relative h-48">
                    <Image src={PlaceHolderImages[(i % 3) + 1].imageUrl} alt="" fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                    <div className="absolute bottom-4 right-4">
                      <span className="bg-accent text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg">نشط الآن</span>
                    </div>
                  </div>
                  <CardContent className="p-6">
                    <h3 className="text-2xl font-bold mb-4">{en.courseTitle || 'كورس غير مسمى'}</h3>
                    <div className="flex items-center justify-between">
                       <div className="flex flex-col">
                          <span className="text-[10px] text-muted-foreground font-bold">نسبة الإنجاز</span>
                          <span className="text-primary font-black">{en.progressPercentage || 0}%</span>
                       </div>
                       <Button variant="secondary" className="gap-2 font-bold group-hover:bg-primary group-hover:text-primary-foreground transition-all rounded-xl h-11 px-6">
                        واصل التعلم <ChevronLeft className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="p-20 text-center border-dashed border-2 bg-secondary/10 rounded-[2rem]">
            <PlayCircle className="w-20 h-20 mx-auto mb-6 opacity-10 text-primary" />
            <p className="text-xl text-muted-foreground mb-8">لا توجد كورسات مفعلة في حسابك حالياً.</p>
            <Link href="/courses">
              <Button size="lg" variant="outline" className="border-primary/20 text-primary h-14 px-10 rounded-2xl font-bold">تصفح المكتبة واطلب الانضمام</Button>
            </Link>
          </Card>
        )}
      </section>

      {pendingEnrollments.length > 0 && (
        <section className="pt-8 border-t">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Clock className="w-6 h-6 text-primary" /> طلبات قيد المراجعة
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingEnrollments.map((en) => (
              <Card key={en.id} className="bg-primary/5 border-primary/20 shadow-sm">
                <CardContent className="p-5 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-sm mb-1">{en.courseTitle}</p>
                    <p className="text-[10px] text-muted-foreground italic">سيتم التفعيل بواسطة البشمهندس قريباً...</p>
                  </div>
                  <span className="text-[9px] font-bold text-primary bg-primary/10 px-2 py-1 rounded-full animate-pulse">معلق</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
