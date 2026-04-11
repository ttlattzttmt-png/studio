
"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Play, Loader2, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';

export default function MyCoursesPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const enrollmentsRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return collection(firestore, 'students', user.uid, 'enrollments');
  }, [firestore, user?.uid]);

  const { data: enrollments, isLoading } = useCollection(enrollmentsRef);

  if (isUserLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-4xl font-headline font-bold mb-2">كورساتي المفعلة</h1>
        <p className="text-muted-foreground">هنا تجد جميع الكورسات التي قمت بتفعيلها والبدء في دراستها.</p>
      </div>

      {!enrollments || enrollments.length === 0 ? (
        <Card className="bg-card border-dashed border-2 p-12 text-center space-y-4">
          <BookOpen className="w-16 h-16 text-muted-foreground mx-auto opacity-20" />
          <h2 className="text-2xl font-bold">لا توجد كورسات مفعلة بعد</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            يبدو أنك لم تقم بتفعيل أي كورس حتى الآن. يمكنك تفعيل كورس جديد باستخدام الكود الخاص بك أو تصفح الكورسات المتاحة.
          </p>
          <div className="flex justify-center gap-4 pt-4">
            <Link href="/student/redeem">
              <Button className="bg-primary text-primary-foreground font-bold">تفعيل كود الآن</Button>
            </Link>
            <Link href="/courses">
              <Button variant="outline">تصفح الكورسات المتاحة</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {enrollments.map((enrollment) => (
            <Card key={enrollment.id} className="bg-card hover:border-primary/20 transition-all">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Play className="w-6 h-6" />
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${enrollment.isCompleted ? 'bg-accent/10 text-accent' : 'bg-primary/10 text-primary'}`}>
                    {enrollment.isCompleted ? 'مكتمل' : 'قيد الدراسة'}
                  </span>
                </div>
                <CardTitle className="mt-4 text-xl font-bold">كود الكورس: {enrollment.courseId}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">نسبة الإنجاز</span>
                    <span className="font-bold text-primary">{enrollment.progressPercentage}%</span>
                  </div>
                  <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${enrollment.progressPercentage}%` }} />
                  </div>
                </div>
                <Button className="w-full bg-secondary text-foreground hover:bg-secondary/80 gap-2">
                  متابعة الدراسة <ArrowRight className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
