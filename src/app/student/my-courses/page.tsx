
"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Play, Loader2, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useFirestore, useUser, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { PlaceHolderImages } from '@/lib/placeholder-images';

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
        <h1 className="text-4xl font-headline font-bold mb-2 text-right">كورساتي المفعلة</h1>
        <p className="text-muted-foreground text-right">هنا تجد جميع الكورسات التي قمت بتفعيلها والبدء في دراستها.</p>
      </div>

      {!enrollments || enrollments.length === 0 ? (
        <Card className="bg-card border-dashed border-2 p-12 text-center space-y-4">
          <BookOpen className="w-16 h-16 text-muted-foreground mx-auto opacity-20" />
          <h2 className="text-2xl font-bold">لا توجد كورسات مفعلة بعد</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            يبدو أنك لم تقم بتفعيل أي كورس حتى الآن. يمكنك تفعيل كورس جديد باستخدام الكود الخاص بك.
          </p>
          <div className="flex justify-center gap-4 pt-4">
            <Link href="/student/redeem">
              <Button className="bg-primary text-primary-foreground font-bold">تفعيل كود الآن</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {enrollments.map((enrollment, idx) => (
            <EnrolledCourseCard key={enrollment.id} courseId={enrollment.courseId} progress={enrollment.progressPercentage} idx={idx} />
          ))}
        </div>
      )}
    </div>
  );
}

function EnrolledCourseCard({ courseId, progress, idx }: { courseId: string, progress: number, idx: number }) {
  const firestore = useFirestore();
  const courseRef = useMemoFirebase(() => firestore ? doc(firestore, 'courses', courseId) : null, [firestore, courseId]);
  const { data: course, isLoading } = useDoc(courseRef);

  if (isLoading) return <Card className="h-64 animate-pulse bg-secondary/20" />;

  return (
    <Card className="bg-card group hover:shadow-2xl hover:shadow-primary/5 transition-all border-primary/5 overflow-hidden">
      <div className="relative h-40 bg-secondary">
        <Image 
          src={PlaceHolderImages[(idx % 3) + 1]?.imageUrl || ''} 
          alt="" 
          fill 
          className="object-cover opacity-80 group-hover:scale-110 transition-transform duration-500" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-4 right-4 text-white font-bold">{course?.title}</div>
      </div>
      <CardContent className="p-6 space-y-4 text-right">
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] mb-1">
             <span className="font-bold text-primary">{progress}%</span>
             <span className="text-muted-foreground">تقدمك الدراسي</span>
          </div>
          <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <Link href={`/courses`}>
          <Button className="w-full bg-secondary text-foreground hover:bg-primary hover:text-primary-foreground gap-2 font-bold h-12">
            دخول الكورس <Play className="w-4 h-4" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
