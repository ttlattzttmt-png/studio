
"use client";

import { useState } from 'react';
import { Navbar } from '@/components/ui/navbar';
import { Footer } from '@/components/ui/footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, PlayCircle, Clock, GraduationCap, ChevronLeft, ArrowRight } from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
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
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-grow pt-24 pb-20 container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-4xl font-headline font-bold mb-2">مرحباً بك، يا بطل</h1>
            <p className="text-muted-foreground">تابع دروسك وكورساتك من هنا.</p>
          </div>
          <Link href="/courses">
            <Button className="bg-primary text-primary-foreground font-bold rounded-xl gap-2 h-12">
              <BookOpen className="w-5 h-5" /> اشترك في كورس جديد
            </Button>
          </Link>
        </div>

        {/* الكورسات النشطة */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <PlayCircle className="w-6 h-6 text-accent" /> كورساتك المشترك بها
          </h2>
          
          {isLoading ? (
            <div className="flex justify-center py-10"><Clock className="w-6 h-6 animate-spin text-primary" /></div>
          ) : activeEnrollments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeEnrollments.map((en, i) => (
                <Link key={en.id} href={`/student/courses/${en.courseId}`}>
                  <Card className="bg-card hover:border-primary/30 transition-all group overflow-hidden border-primary/5 cursor-pointer">
                    <div className="relative h-40">
                      <Image src={PlaceHolderImages[(i % 3) + 1].imageUrl} alt="" fill className="object-cover group-hover:scale-105 transition-transform" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-4 right-4">
                        <span className="bg-accent text-white text-[10px] font-bold px-2 py-1 rounded">نشط</span>
                      </div>
                    </div>
                    <CardContent className="p-5">
                      <h3 className="text-xl font-bold mb-4">{en.courseTitle || 'كورس غير مسمى'}</h3>
                      <Button variant="secondary" className="w-full gap-2 font-bold group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        ابدأ المشاهدة <ChevronLeft className="w-4 h-4" />
                      </Button>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center border-dashed border-2 bg-secondary/10">
              <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-10" />
              <p className="text-lg text-muted-foreground mb-6">أنت غير مشترك في أي كورسات حالياً.</p>
              <Link href="/courses">
                <Button variant="outline" className="border-primary/20 text-primary">استكشف الكورسات المتاحة</Button>
              </Link>
            </Card>
          )}
        </section>

        {/* طلبات بانتظار التفعيل */}
        {pendingEnrollments.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Clock className="w-6 h-6 text-primary" /> طلبات قيد الانتظار
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {pendingEnrollments.map((en) => (
                <Card key={en.id} className="bg-primary/5 border-primary/20">
                  <CardContent className="p-4">
                    <p className="font-bold text-sm mb-1">{en.courseTitle}</p>
                    <p className="text-[10px] text-muted-foreground italic">سيقوم البشمهندس بتفعيل الكورس لك قريباً...</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
