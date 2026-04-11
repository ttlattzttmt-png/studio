import Image from 'next/image';
import Link from 'next/link';
import { Navbar } from '@/components/ui/navbar';
import { Footer } from '@/components/ui/footer';
import { Button } from '@/components/ui/button';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { ArrowLeft, BookOpen, Video, Award, Code, Users, Star } from 'lucide-react';

export default function Home() {
  const heroImg = PlaceHolderImages.find(img => img.id === 'hero-bg');
  const courseImages = PlaceHolderImages.filter(img => img.id.startsWith('course-'));

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
                  <Button size="lg" className="h-14 px-8 text-lg bg-primary text-primary-foreground hover:bg-primary/90 font-bold">
                    سجل الآن مجاناً
                  </Button>
                </Link>
                <Link href="/courses">
                  <Button size="lg" variant="outline" className="h-14 px-8 text-lg hover:bg-secondary border-primary/50 text-primary">
                    تصفح الكورسات
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-12 bg-secondary/30 border-y">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { label: 'طالب متفوق', val: '+5000', icon: <Users /> },
                { label: 'كورس متاح', val: '+20', icon: <BookOpen /> },
                { label: 'ساعة شرح', val: '+300', icon: <Video /> },
                { label: 'تقييم ممتاز', val: '4.9/5', icon: <Star /> },
              ].map((stat, i) => (
                <div key={i} className="text-center group">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-4 group-hover:scale-110 transition-transform">
                    {stat.icon}
                  </div>
                  <h3 className="text-3xl font-bold mb-1">{stat.val}</h3>
                  <p className="text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Latest Courses */}
        <section className="py-24">
          <div className="container mx-auto px-4">
            <div className="flex items-end justify-between mb-12">
              <div>
                <h2 className="text-4xl font-headline font-bold mb-4">أحدث الكورسات</h2>
                <p className="text-muted-foreground">اختر الكورس المناسب لسنتك الدراسية وابدأ رحلة التفوق</p>
              </div>
              <Link href="/courses" className="hidden md:flex items-center gap-2 text-primary hover:underline font-bold">
                مشاهدة الكل <ArrowLeft className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {courseImages.map((course, idx) => (
                <div key={idx} className="group bg-card rounded-2xl border overflow-hidden hover:shadow-2xl hover:shadow-primary/5 transition-all hover:-translate-y-2">
                  <div className="relative h-48">
                    <Image
                      src={course.imageUrl}
                      alt={course.description}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-4 right-4 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                      الصف {idx + 1} الثانوي
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-headline font-bold mb-3">{course.description}</h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
                      <span className="flex items-center gap-1"><Video className="w-4 h-4" /> 12 درس</span>
                      <span className="flex items-center gap-1"><Users className="w-4 h-4" /> +200 طالب</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-primary">250 ج.م</span>
                      <Link href={`/courses/${idx + 1}`}>
                        <Button variant="secondary" className="group-hover:bg-primary group-hover:text-primary-foreground transition-colors">تفاصيل الكورس</Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why Us Section */}
        <section className="py-24 bg-card/50">
          <div className="container mx-auto px-4 text-center mb-16">
            <h2 className="text-4xl font-headline font-bold mb-4">لماذا تختار منصة البشمهندس؟</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">نحن لسنا مجرد منصة فيديوهات، بل رفيقك في رحلة النجاح بخطوات مدروسة وعلمية.</p>
          </div>
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {features.map((f, i) => (
                <div key={i} className="bg-background p-8 rounded-2xl border border-primary/10 text-center hover:border-primary transition-colors">
                  <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-6">
                    {f.icon}
                  </div>
                  <h3 className="text-2xl font-headline font-bold mb-4">{f.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="py-24">
          <div className="container mx-auto px-4">
            <div className="bg-gradient-to-l from-primary to-yellow-600 rounded-3xl p-12 text-center text-primary-foreground relative overflow-hidden shadow-2xl">
              <div className="relative z-10">
                <h2 className="text-4xl md:text-5xl font-headline font-bold mb-6">جاهز تبدأ رحلة النجاح؟</h2>
                <p className="text-xl mb-10 opacity-90 max-w-2xl mx-auto font-medium">
                  انضم لآلاف الطلاب الذين بدأوا بالفعل في تحقيق أحلامهم مع البشمهندس.
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                  <Link href="/register">
                    <Button size="lg" variant="secondary" className="h-14 px-10 text-lg font-bold">إنشاء حساب جديد</Button>
                  </Link>
                  <Link href="/login">
                    <Button size="lg" variant="outline" className="h-14 px-10 text-lg font-bold border-white/30 hover:bg-white/10">تسجيل الدخول</Button>
                  </Link>
                </div>
              </div>
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}