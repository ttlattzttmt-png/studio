
"use client";

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { Navbar } from '@/components/ui/navbar';
import { Footer } from '@/components/ui/footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { 
  Search, 
  Loader2,
  CheckCircle,
  Ticket,
  AlertCircle,
  PlayCircle
} from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, query, orderBy, doc, setDoc } from 'firebase/firestore';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function CoursesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();

  const studentRef = useMemoFirebase(() => user ? doc(firestore, 'students', user.uid) : null, [firestore, user]);
  const { data: student } = useDoc(studentRef);

  const coursesRef = useMemoFirebase(() => query(collection(firestore, 'courses'), orderBy('createdAt', 'desc')), [firestore]);
  const { data: courses, isLoading } = useCollection(coursesRef);

  const enrollmentsRef = useMemoFirebase(() => user ? collection(firestore, 'students', user.uid, 'enrollments') : null, [firestore, user]);
  const { data: myEnrollments } = useCollection(enrollmentsRef);

  const filteredCourses = useMemo(() => {
    if (!courses) return [];
    let filtered = courses;
    
    if (student?.academicYear) {
      filtered = filtered.filter(c => c.targetAcademicYear === student.academicYear);
    }

    if (searchTerm) {
      filtered = filtered.filter(c => 
        c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return filtered;
  }, [courses, student, searchTerm]);

  const handleFreeEnrollment = async (course: any) => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (!firestore) return;

    setEnrollingId(course.id);
    try {
      // إنشاء سجل اشتراك رسمي ومفعل للكورس المجاني
      await setDoc(doc(firestore, 'students', user.uid, 'enrollments', course.id), {
        id: course.id,
        courseId: course.id,
        studentId: user.uid,
        status: 'active',
        enrollmentDate: new Date().toISOString(),
        activationDate: new Date().toISOString(),
        progressPercentage: 0,
        isCompleted: false,
        courseTitle: course.title,
        redeemedCode: 'FREE_ACCESS'
      });
      
      // التوجه لمشاهدة الكورس
      router.push(`/student/courses/${course.id}`);
    } catch (e) {
      console.error("Enrollment error:", e);
    } finally {
      setEnrollingId(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow pt-32 pb-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 space-y-4">
            <h1 className="text-5xl font-headline font-bold">مكتبة الكورسات</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg italic">
              {student ? `نعرض لك كورسات: ${student.academicYear}` : "اختر الكورس المناسب وابدأ رحلة التفوق."}
            </p>
          </div>

          <div className="max-w-4xl mx-auto mb-12 flex flex-col md:flex-row gap-4">
            <div className="relative flex-grow">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="ابحث عن كورس محدد..." 
                className="h-16 pr-12 text-lg bg-card border-primary/10 rounded-2xl shadow-xl text-right"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Link href="/student/redeem" className="shrink-0">
               <Button className="h-16 px-8 bg-primary text-primary-foreground font-bold rounded-2xl gap-2 shadow-lg">
                  <Ticket className="w-5 h-5" /> تفعيل كود
               </Button>
            </Link>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>
          ) : filteredCourses.length === 0 ? (
            <div className="text-center py-20 bg-secondary/10 rounded-3xl border-2 border-dashed border-primary/20">
               <AlertCircle className="w-16 h-16 mx-auto mb-4 opacity-20" />
               <p className="text-muted-foreground">لا توجد كورسات متاحة حالياً تطابق صفك الدراسي.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredCourses.map((course, idx) => {
                const enrollment = myEnrollments?.find(e => e.courseId === course.id);
                const isActive = enrollment?.status === 'active';
                const isFree = course.price === 0;
                
                return (
                  <div key={course.id} className="group bg-card rounded-[2.5rem] border border-primary/5 overflow-hidden hover:shadow-2xl transition-all flex flex-col text-right">
                    <div className="relative h-64">
                      <Image src={course.imageUrl || PlaceHolderImages[(idx % 3) + 1].imageUrl} alt="" fill className="object-cover group-hover:scale-105 transition-transform duration-700" unoptimized={!!course.imageUrl} />
                      <div className="absolute top-4 right-4 bg-primary text-primary-foreground text-[10px] font-black px-3 py-1.5 rounded-full shadow-xl">
                        {course.targetAcademicYear}
                      </div>
                      {isFree && (
                        <div className="absolute bottom-4 left-4 bg-accent text-white text-[10px] font-black px-3 py-1 rounded-full shadow-lg">
                          كورس مجاني 🎁
                        </div>
                      )}
                    </div>
                    <div className="p-8 flex-grow flex flex-col">
                      <h3 className="text-2xl font-bold mb-3">{course.title}</h3>
                      <p className="text-muted-foreground text-sm line-clamp-2 mb-6">{course.description}</p>
                      
                      <div className="mt-auto pt-6 border-t border-primary/5 flex flex-row-reverse items-center justify-between">
                        <div className="text-2xl font-black text-accent">{isFree ? 'مجاناً' : `${course.price} ج.م`}</div>
                        
                        {isActive ? (
                          <Link href={`/student/courses/${course.id}`}>
                            <Button className="bg-accent text-white gap-2 rounded-xl h-11">
                              <CheckCircle className="w-4 h-4" /> فتح الكورس
                            </Button>
                          </Link>
                        ) : isFree ? (
                          <Button 
                            onClick={() => handleFreeEnrollment(course)}
                            disabled={enrollingId === course.id}
                            className="bg-accent text-white gap-2 rounded-xl h-11 font-bold shadow-lg shadow-accent/20 active:scale-95 transition-transform"
                          >
                            {enrollingId === course.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <PlayCircle className="w-4 h-4" />
                            )}
                            ابدأ التعلم الآن
                          </Button>
                        ) : (
                          <Link href="/student/redeem">
                            <Button className="bg-primary text-primary-foreground font-bold rounded-xl h-11 px-6">اشترك الآن</Button>
                          </Link>
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
