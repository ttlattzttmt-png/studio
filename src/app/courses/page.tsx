
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
  GraduationCap
} from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';

export default function CoursesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const firestore = useFirestore();

  // جلب الكورسات لحظياً من Firestore
  const coursesRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'courses'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: courses, isLoading } = useCollection(coursesRef);

  const filteredCourses = courses?.filter(course => 
    course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.targetAcademicYear.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow pt-32 pb-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 space-y-4">
            <h1 className="text-5xl font-headline font-bold">مكتبة الكورسات</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              ابحث عن المادة العلمية التي تناسب سنتك الدراسية وابدأ رحلة التفوق مع البشمهندس.
            </p>
          </div>

          <div className="max-w-2xl mx-auto mb-12">
            <div className="relative group">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input 
                placeholder="ابحث عن كورس، سنة دراسية، أو موضوع معني..." 
                className="h-16 pr-12 text-lg bg-card border-primary/10 rounded-2xl shadow-xl shadow-primary/5 focus:border-primary transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <p className="text-muted-foreground animate-pulse font-bold">جاري جلب أحدث الكورسات...</p>
            </div>
          ) : !filteredCourses || filteredCourses.length === 0 ? (
            <div className="text-center py-32 border-2 border-dashed rounded-3xl border-primary/10">
              <BookOpen className="w-20 h-20 mx-auto mb-6 opacity-10 text-primary" />
              <h2 className="text-2xl font-bold mb-2">لا توجد نتائج مطابقة</h2>
              <p className="text-muted-foreground">جرب البحث بكلمات أخرى أو تصفح الكورسات المتاحة حالياً.</p>
              <Button 
                variant="outline" 
                className="mt-6 border-primary/50 text-primary"
                onClick={() => setSearchTerm('')}
              >
                عرض جميع الكورسات
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredCourses.map((course, idx) => (
                <div key={course.id} className="group bg-card rounded-3xl border border-primary/5 overflow-hidden hover:shadow-2xl hover:shadow-primary/10 transition-all hover:-translate-y-2 flex flex-col">
                  <div className="relative h-56 bg-secondary">
                    <Image
                      src={PlaceHolderImages[(idx % 3) + 1]?.imageUrl || ''}
                      alt={course.title}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                    <div className="absolute top-4 right-4 bg-primary text-primary-foreground text-xs font-bold px-4 py-1.5 rounded-full shadow-lg backdrop-blur-sm">
                      {course.targetAcademicYear}
                    </div>
                    <div className="absolute bottom-4 left-4 bg-black/60 text-white text-xs font-bold px-3 py-1 rounded-lg backdrop-blur-md border border-white/10">
                      <span className="flex items-center gap-1"><Video className="w-3 h-3" /> محتوى متجدد</span>
                    </div>
                  </div>
                  <div className="p-8 flex-grow flex flex-col">
                    <div className="mb-4">
                      <h3 className="text-2xl font-headline font-bold mb-3 group-hover:text-primary transition-colors">{course.title}</h3>
                      <p className="text-muted-foreground line-clamp-3 text-sm leading-relaxed">{course.description}</p>
                    </div>
                    
                    <div className="mt-auto pt-6 border-t border-primary/5 flex items-center justify-between">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground mb-1">سعر الكورس</p>
                        <p className="text-2xl font-black text-accent">{course.price} ج.م</p>
                      </div>
                      <Link href="/register">
                        <Button className="rounded-xl h-12 px-6 bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20">
                          اشترك الآن
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
