
"use client";

import Image from 'next/image';
import Link from 'next/link';
import { Navbar } from '@/components/ui/navbar';
import { Footer } from '@/components/ui/footer';
import { Button } from '@/components/ui/button';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { ArrowLeft, BookOpen, Video, Award, Users, Star, Loader2 } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';

export default function Home() {
  const heroImg = PlaceHolderImages.find(img => img.id === 'hero-bg');
  const firestore = useFirestore();

  const latestCoursesRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'courses'), orderBy('createdAt', 'desc'), limit(3));
  }, [firestore]);

  const { data: courses, isLoading } = useCollection(latestCoursesRef);

  const features = [
    { icon: <Video className="w-6 h-6" />, title: 'شروحات وافية', desc: 'فيديوهات بجودة عالية تغطي كل أجزاء المنهج.' },
    { icon: <BookOpen className="w-6 h-6" />, title: 'امتحانات دورية', desc: 'اختبارات إلكترونية ومقالية لقياس مستواك.' },
    { icon: <Award className="w-6 h-6" />, title: 'شهادات تفوق', desc: 'تكريم الطلاب المتفوقين الأوائل على المنصة.' },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow pt-16">
        {/* Hero Section */}
        <section className="relative h-[80vh] flex items-center overflow-hidden">
          <div className="absolute inset-0 z-0">
            <Image
              src={heroImg?.imageUrl || ''}
              alt="Hero"
              fill
              className="object-cover opacity-20"
              data-ai-hint="engineering background"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          </div>
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-2xl animate-in fade-in slide-in-from-right duration-1000">
              <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-bold mb-6 border border-primary/20">
                مرحباً بك في مستقبل التعليم
              </span>
              <h1 className="text-5xl md:text-7xl font-headline font-bold mb-6 leading-tight">
                تعلم الهندسة مع <span className="text-primary italic">البشمهندس</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-10 leading-relaxed">
                المنصة المتكاملة لطلاب المرحلة الثانوية. شروحات مبسطة، امتحانات تفاعلية، ومتابعة دقيقة لمستواك الدراسي للوصول للقمة.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/register">
                  <Button size="lg" className="h-14 px-8 text-lg bg-primary text-primary-foreground hover:bg-primary/90 font-bold rounded-xl shadow-xl shadow-primary/20">
                    سجل الآن مجاناً
                  </Button>
                </Link>
                <Link href="/courses">
                  <Button size="lg" variant="outline" className="h-14 px-8 text-lg hover:bg-secondary border-primary/50 text-primary rounded-xl">
                    تصفح الكورسات
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-12 bg-secondary/30 border-y border-primary/5">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { label: 'طالب متفوق', val: '+5000', icon: <Users /> },
                { label: 'كورس متاح', val: '+20', icon: <BookOpen /> },
                { label: 'ساعة شرح', val: '+300', icon: <Video /> },
                { label: 'تقييم ممتاز', val: '4.9/5', icon: <Star /> },
              ].map((stat, i) => (
                <div key={i} className="text-center group">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 text-primary mb-4 group-hover:scale-110 group-hover:rotate-12 transition-all">
                    {stat.icon}
                  </div>
                  <h3 className="text-3xl font-bold mb-1">{stat.val}</h3>
                  <p className="text-muted-foreground font-medium">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Latest Courses */}
        <section className="py-24">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-4">
              <div className="text-right">
                <h2 className="text-4xl font-headline font-bold mb-4">أحدث الكورسات المضافة</h2>
                <p className="text-muted-foreground text-lg">اختر الكورس المناسب لسنتك الدراسية وابدأ رحلة التفوق الآن.</p>
              </div>
              <Link href="/courses" className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors font-bold text-lg group">
                مشاهدة كل الكورسات <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              </Link>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
              </div>
            ) : !courses || courses.length === 0 ? (
              <div className="text-center py-20 bg-secondary/10 rounded-3xl border-2 border-dashed">
                <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-10" />
                <p className="text-muted-foreground">لا توجد كورسات متاحة حالياً. يرجى مراجعة المسؤول.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {courses.map((course, idx) => (
                  <div key={course.id} className="group bg-card rounded-3xl border border-primary/5 overflow-hidden hover:shadow-2xl hover:shadow-primary/5 transition-all hover:-translate-y-2">
                    <div className="relative h-56">
                      <Image
                        src={course.imageUrl || PlaceHolderImages[(idx % 3) + 1]?.imageUrl || ''}
                        alt={course.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        unoptimized={!!course.imageUrl}
                      />
                      <div className="absolute top-4 right-4 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                        {course.targetAcademicYear}
                      </div>
                    </div>
                    <div className="p-8 text-right">
                      <h3 className="text-xl font-headline font-bold mb-3">{course.title}</h3>
                      <div className="flex flex-row-reverse items-center gap-4 text-sm text-muted-foreground mb-6">
                        <span className="flex flex-row-reverse items-center gap-1"><Video className="w-4 h-4 text-primary" /> شرح وافي</span>
                        <span className="flex flex-row-reverse items-center gap-1"><Users className="w-4 h-4 text-primary" /> +200 طالب</span>
                      </div>
                      <div className="flex flex-row-reverse items-center justify-between mt-auto">
                        <span className="text-2xl font-black text-accent">{course.price} ج.م</span>
                        <Link href="/register">
                          <Button variant="secondary" className="font-bold group-hover:bg-primary group-hover:text-primary-foreground transition-all rounded-xl">اشترك الآن</Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Why Us Section */}
        <section className="py-24 bg-card/50 border-y border-primary/5">
          <div className="container mx-auto px-4 text-center mb-16">
            <h2 className="text-4xl font-headline font-bold mb-4">لماذا تختار منصة البشمهندس؟</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">نحن لسنا مجرد منصة فيديوهات، بل رفيقك في رحلة النجاح بخطوات مدروسة وعلمية.</p>
          </div>
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {features.map((f, i) => (
                <div key={i} className="bg-background p-10 rounded-3xl border border-primary/10 text-center hover:border-primary transition-all shadow-xl shadow-primary/5">
                  <div className="w-20 h-20 bg-primary/10 text-primary rounded-3xl flex items-center justify-center mx-auto mb-8 rotate-3">
                    {f.icon}
                  </div>
                  <h3 className="text-2xl font-headline font-bold mb-4">{f.title}</h3>
                  <p className="text-muted-foreground leading-relaxed text-sm">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="py-24">
          <div className="container mx-auto px-4">
            <div className="bg-gradient-to-l from-primary to-yellow-600 rounded-[3rem] p-16 text-center text-primary-foreground relative overflow-hidden shadow-2xl">
              <div className="relative z-10">
                <h2 className="text-4xl md:text-6xl font-headline font-bold mb-8">جاهز تبدأ رحلة النجاح؟</h2>
                <p className="text-xl md:text-2xl mb-12 opacity-90 max-w-2xl mx-auto font-medium">
                  انضم لآلاف الطلاب الذين بدأوا بالفعل في تحقيق أحلامهم مع البشمهندس.
                </p>
                <div className="flex flex-wrap justify-center gap-6">
                  <Link href="/register">
                    <Button size="lg" variant="secondary" className="h-16 px-12 text-xl font-bold rounded-2xl shadow-2xl">إنشاء حساب جديد</Button>
                  </Link>
                  <Link href="/login">
                    <Button size="lg" variant="outline" className="h-16 px-12 text-xl font-bold border-white/30 hover:bg-white/10 rounded-2xl">تسجيل الدخول</Button>
                  </Link>
                </div>
              </div>
              <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-black/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2" />
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
