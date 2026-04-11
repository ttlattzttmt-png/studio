"use client";

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Navbar } from '@/components/ui/navbar';
import { Footer } from '@/components/ui/footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { 
  Search, 
  BookOpen, 
  Video, 
  Users, 
  ArrowLeft, 
  Loader2,
  GraduationCap,
  PlusCircle,
  CheckCircle
} from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy, doc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export default function CoursesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isRequesting, setIsRequesting] = useState<string | null>(null);
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const coursesRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'courses'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: courses, isLoading } = useCollection(coursesRef);

  // جلب اشتراكات الطالب الحالية للتأكد من حالة الكورس
  const enrollmentsRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'students', user.uid, 'enrollments');
  }, [firestore, user]);

  const { data: myEnrollments } = useCollection(enrollmentsRef);

  const handleRequestEnrollment = async (course: any) => {
    if (!user || !firestore) {
      toast({ title: "يرجى تسجيل الدخول", description: "يجب أن تملك حساباً لطلب الانضمام." });
      return;
    }

    setIsRequesting(course.id);
    try {
      // إنشاء طلب اشتراك بحالة "pending" في مجلد الطالب الخاص
      // بما أن الطالب يكتب في مجلده، فلن تظهر رسالة Permission Denied أبداً
      await setDoc(doc(firestore, 'students', user.uid, 'enrollments', course.id), {
        id: course.id,
        courseId: course.id,
        studentId: user.uid,
        status: 'pending', // حالة الانتظار
        enrollmentDate: new Date().toISOString(),
        progressPercentage: 0,
        isCompleted: false,
        courseTitle: course.title
      });

      toast({ 
        title: "تم إرسال طلبك", 
        description: "سيقوم البشمهندس بمراجعة طلبك وتفعيل الكورس لك قريباً." 
      });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "خطأ", description: "فشل إرسال الطلب، حاول مرة أخرى." });
    } finally {
      setIsRequesting(null);
    }
  };

  const getCourseStatus = (courseId: string) => {
    const enrollment = myEnrollments?.find(e => e.courseId === courseId);
    if (!enrollment) return 'none';
    return enrollment.status || 'pending';
  };

  const filteredCourses = courses?.filter(course => 
    course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow pt-32 pb-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 space-y-4">
            <h1 className="text-5xl font-headline font-bold">مكتبة الكورسات</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              اختر الكورس المناسب واطلب الانضمام، وسيقوم فريق البشمهندس بتفعيل حسابك فوراً.
            </p>
          </div>

          <div className="max-w-2xl mx-auto mb-12">
            <div className="relative group">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input 
                placeholder="ابحث عن كورس..." 
                className="h-16 pr-12 text-lg bg-card border-primary/10 rounded-2xl shadow-xl shadow-primary/5 focus:border-primary transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <p className="text-muted-foreground animate-pulse font-bold">جاري جلب الكورسات...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredCourses?.map((course, idx) => {
                const status = getCourseStatus(course.id);
                return (
                  <div key={course.id} className="group bg-card rounded-3xl border border-primary/5 overflow-hidden hover:shadow-2xl transition-all flex flex-col">
                    <div className="relative h-56">
                      <Image
                        src={PlaceHolderImages[(idx % 3) + 1]?.imageUrl || ''}
                        alt={course.title}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute top-4 right-4 bg-primary text-primary-foreground text-xs font-bold px-4 py-1.5 rounded-full">
                        {course.targetAcademicYear}
                      </div>
                    </div>
                    <div className="p-8 flex-grow flex flex-col">
                      <h3 className="text-2xl font-headline font-bold mb-3">{course.title}</h3>
                      <p className="text-muted-foreground line-clamp-2 text-sm mb-6">{course.description}</p>
                      
                      <div className="mt-auto pt-6 border-t border-primary/5 flex items-center justify-between">
                        <p className="text-2xl font-black text-accent">{course.price} ج.م</p>
                        
                        {status === 'active' ? (
                          <Button disabled className="bg-accent text-white gap-2 rounded-xl">
                            <CheckCircle className="w-4 h-4" /> مفعل
                          </Button>
                        ) : status === 'pending' ? (
                          <Button disabled className="bg-secondary text-muted-foreground gap-2 rounded-xl italic">
                            قيد الانتظار...
                          </Button>
                        ) : (
                          <Button 
                            onClick={() => handleRequestEnrollment(course)}
                            disabled={isRequesting === course.id}
                            className="bg-primary text-primary-foreground font-bold rounded-xl h-12 px-6"
                          >
                            {isRequesting === course.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><PlusCircle className="w-4 h-4 ml-2" /> طلب انضمام</>}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}