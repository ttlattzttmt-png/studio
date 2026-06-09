
"use client";

import { useParams, useRouter } from 'next/navigation';
import { Navbar } from '@/components/ui/navbar';
import { Footer } from '@/components/ui/footer';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, query, orderBy, updateDoc, increment, setDoc } from 'firebase/firestore';
import { Loader2, Clock, PlayCircle, Lock, BookOpen, ChevronLeft, ShieldCheck, Trophy } from 'lucide-react';
import { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import dynamic from 'next/dynamic';

// استيراد المشغل بشكل ديناميكي لضمان أفضل أداء وعدم وجود أخطاء Hydration
const ReactPlayer = dynamic(() => import('react-player/lazy'), { ssr: false });

export default function CourseViewer() {
  const { id } = useParams();
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  
  const [activeContent, setActiveContent] = useState<any>(null);
  const [watermarkPos, setWatermarkPos] = useState({ top: '10%', left: '10%' });
  const playerRef = useRef<any>(null);

  // تحديث مكان العلامة المائية بشكل عشوائي كل دقيقتين لمنع تصوير الشاشة
  useEffect(() => {
    const interval = setInterval(() => {
      setWatermarkPos({
        top: `${Math.floor(Math.random() * 80) + 5}%`,
        left: `${Math.floor(Math.random() * 80) + 5}%`
      });
    }, 120000);
    return () => clearInterval(interval);
  }, []);

  // حماية إضافية: منع القائمة المنسدلة والنسخ والسحب
  useEffect(() => {
    const handleEvents = (e: any) => e.preventDefault();
    document.addEventListener('contextmenu', handleEvents);
    document.addEventListener('dragstart', handleEvents);
    return () => {
      document.removeEventListener('contextmenu', handleEvents);
      document.removeEventListener('dragstart', handleEvents);
    };
  }, []);

  // جلب بروفايل الطالب للعلامة المائية
  const studentRef = useMemoFirebase(() => (firestore && user) ? doc(firestore, 'students', user.uid) : null, [firestore, user]);
  const { data: studentProfile } = useDoc(studentRef);

  const courseRef = useMemoFirebase(() => (firestore && id) ? doc(firestore, 'courses', id as string) : null, [firestore, id]);
  const { data: course, isLoading: isCourseLoading } = useDoc(courseRef);

  const enrollmentRef = useMemoFirebase(() => (firestore && user && id) ? doc(firestore, 'students', user.uid, 'enrollments', id as string) : null, [firestore, user, id]);
  const { data: enrollment, isLoading: isEnrollmentLoading } = useDoc(enrollmentRef);
  
  const contentRef = useMemoFirebase(() => (firestore && id) ? query(collection(firestore, 'courses', id as string, 'content'), orderBy('orderIndex', 'asc')) : null, [firestore, id]);
  const { data: contents, isLoading: isContentLoading } = useCollection(contentRef);

  const visibleContents = useMemo(() => {
    return contents?.filter(c => c.isVisible !== false) || [];
  }, [contents]);

  useEffect(() => { 
    if (visibleContents.length > 0 && !activeContent) {
      setActiveContent(visibleContents[0]);
    }
  }, [visibleContents, activeContent]);

  // وظيفة تسجيل التقدم عند مشاهدة الفيديو
  const handleProgress = async (state: any) => {
    if (!firestore || !user || !id || !activeContent || activeContent.contentType !== 'Video') return;
    
    // إذا شاهد الطالب أكثر من 90% من الفيديو، نعتبر الدرس مكتملاً
    if (state.played >= 0.9) {
      const progressRef = doc(firestore, 'students', user.uid, 'video_progress', activeContent.id);
      await setDoc(progressRef, {
        courseId: id,
        contentId: activeContent.id,
        studentId: user.uid,
        isCompleted: true,
        lastWatchedAt: new Date().toISOString(),
        watchedDurationInSeconds: state.playedSeconds
      }, { merge: true });

      // تحديث نسبة الإنجاز الكلية في الاشتراك
      if (enrollment) {
        const totalItems = visibleContents.length || 1;
        const currentProgress = Math.min(100, Math.round(((enrollment.completedItemsCount || 0) + 1) / totalItems * 100));
        await updateDoc(doc(firestore, 'students', user.uid, 'enrollments', id as string), {
          progressPercentage: currentProgress,
          completedItemsCount: increment(1)
        });
      }
    }
  };

  if (isUserLoading || isCourseLoading || isEnrollmentLoading || isContentLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="font-bold text-muted-foreground animate-pulse italic">جاري تحضير المحتوى التعليمي...</p>
      </div>
    );
  }

  const hasAccess = (enrollment && enrollment.status === 'active') || course?.price === 0;

  if (!hasAccess) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center space-y-6 bg-background">
      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary mx-auto shadow-2xl">
        <Lock className="w-10 h-10" />
      </div>
      <div className="space-y-2">
        <h2 className="text-3xl font-black text-white">هذا الدرس مغلق</h2>
        <p className="text-muted-foreground max-w-sm mx-auto">بشمهندس، يرجى تفعيل كود الحصة لتتمكن من الوصول للمحتوى.</p>
      </div>
      <Link href="/student/redeem">
        <Button className="bg-primary hover:bg-primary/90 h-14 px-10 rounded-2xl font-black shadow-xl shadow-primary/20">
          تفعيل كود الآن
        </Button>
      </Link>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background text-right overflow-x-hidden">
      <Navbar />
      <main className="flex-grow pt-24 pb-20 container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2 space-y-6">
            {activeContent?.contentType === 'Video' ? (
              <div className="space-y-6 animate-in fade-in duration-700">
                <div className="relative aspect-video rounded-[2.5rem] overflow-hidden bg-black shadow-2xl border-4 border-primary/10 group select-none">
                   <div className="absolute inset-0 z-0">
                     <ReactPlayer
                        ref={playerRef}
                        url={activeContent.youtubeLink}
                        width="100%"
                        height="100%"
                        controls={true}
                        playing={true}
                        onProgress={handleProgress}
                        config={{
                          youtube: {
                            playerVars: { 
                              modestbranding: 1, 
                              rel: 0, 
                              showinfo: 0, 
                              iv_load_policy: 3,
                              disablekb: 1 
                            }
                          }
                        }}
                     />
                   </div>
                   
                   {/* العلامة المائية الذكية والمتحركة لمنع السرقة */}
                   <div 
                    className="absolute pointer-events-none opacity-20 select-none z-50 transition-all duration-1000 ease-in-out"
                    style={{ top: watermarkPos.top, left: watermarkPos.left }}
                   >
                      <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20 rotate-[-15deg]">
                        <p className="text-[12px] font-black text-white/80 tracking-widest" dir="ltr">
                          {studentProfile?.studentPhoneNumber || studentProfile?.name || 'AL-BASHMOHANDES'}
                        </p>
                        <p className="text-[8px] text-center text-primary font-bold">PROPERTY OF AL-BASHMOHANDES</p>
                      </div>
                   </div>

                   {/* غطاء شفاف لمنع الضغط اليمين على الفيديو مباشرة */}
                   <div className="absolute inset-0 z-10 bg-transparent" />
                </div>

                <Card className="bg-card border-primary/10 shadow-2xl p-8 rounded-[2.5rem] relative overflow-hidden text-right">
                  <div className="absolute top-0 right-0 w-2 h-full bg-primary" />
                  <div className="flex flex-col md:flex-row-reverse justify-between items-center gap-6">
                    <div className="text-right flex-grow">
                      <h1 className="text-2xl md:text-3xl font-black text-primary leading-tight mb-2">{activeContent.title}</h1>
                      <div className="flex items-center gap-3 justify-end opacity-70">
                         <Badge className="bg-accent/10 text-accent text-[10px] font-black px-3 py-1 flex items-center gap-1 border-accent/20">
                           <ShieldCheck className="w-3 h-3" /> حصة مؤمنة
                         </Badge>
                         <p className="text-[10px] md:text-xs text-muted-foreground font-bold flex items-center gap-2">
                           <Clock className="w-3.5 h-3.5" /> تاريخ النشر: {activeContent.createdAt?.seconds ? new Date(activeContent.createdAt.seconds * 1000).toLocaleDateString('ar-EG') : 'اليوم'}
                         </p>
                      </div>
                    </div>
                    <div className="flex flex-row-reverse items-center gap-3 bg-secondary/20 p-4 rounded-2xl border border-white/5">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                           <Trophy className="w-5 h-5" />
                        </div>
                        <div className="text-right">
                           <p className="text-[10px] font-bold text-muted-foreground">نقاط الدرس</p>
                           <p className="text-sm font-black text-foreground">+10 نقطة</p>
                        </div>
                    </div>
                  </div>
                </Card>
              </div>
            ) : activeContent ? (
              <Card className="bg-gradient-to-br from-primary/5 via-card to-background border-2 border-dashed border-primary/20 p-20 text-center space-y-8 rounded-[3.5rem] shadow-2xl animate-in zoom-in-95 duration-500">
                  <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto shadow-inner border border-primary/10">
                     <PlayCircle className="w-12 h-12 text-primary animate-pulse" />
                  </div>
                  <div className="space-y-4">
                    <h2 className="text-4xl font-black text-foreground">{activeContent.title}</h2>
                    <p className="text-muted-foreground font-bold text-lg">بشمهندس، هذا الجزء عبارة عن اختبار إلكتروني لتقييم فهمك.</p>
                  </div>
                  <Link href={`/student/exams/${activeContent.id}`}>
                    <Button size="lg" className="h-16 px-12 bg-primary text-primary-foreground font-black rounded-2xl text-xl shadow-xl hover:scale-105 transition-transform active:scale-95">
                      ابدأ الاختبار الآن ✍️
                    </Button>
                  </Link>
              </Card>
            ) : (
              <div className="py-40 text-center text-muted-foreground italic">
                <BookOpen className="w-20 h-20 mx-auto opacity-5 mb-4" />
                <p className="font-bold text-xl">اختر درساً من القائمة لبدء المذاكرة.</p>
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <Card className="bg-card border-primary/10 overflow-hidden shadow-2xl rounded-[3rem] sticky top-24">
              <CardHeader className="border-b bg-secondary/5 py-6 px-8 flex flex-row-reverse items-center justify-between">
                <p className="text-xl font-black flex items-center gap-3 justify-end text-primary">
                  قائمة الدروس <BookOpen className="w-5 h-5" />
                </p>
                <div className="flex flex-col items-end">
                   <Badge variant="outline" className="border-primary/40 text-primary font-black px-3 py-1 rounded-lg">{enrollment?.progressPercentage || 0}%</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0 max-h-[60vh] overflow-y-auto">
                {visibleContents.length === 0 ? (
                  <p className="p-10 text-center text-xs text-muted-foreground italic font-bold">بشمهندس، لا توجد دروس متاحة حالياً.</p>
                ) : visibleContents.map((item, idx) => (
                  <button 
                    key={item.id} 
                    onClick={() => setActiveContent(item)} 
                    className={cn(
                      "w-full p-6 text-right flex flex-row-reverse items-center gap-4 transition-all border-b border-white/5 group", 
                      activeContent?.id === item.id ? "bg-primary/10 border-r-4 border-r-primary" : "hover:bg-white/5"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-black text-sm shadow-sm transition-all group-hover:scale-110", 
                      activeContent?.id === item.id ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "bg-secondary text-muted-foreground"
                    )}>
                      {idx+1}
                    </div>
                    <div className="text-right min-w-0 flex-grow">
                      <p className={cn("font-bold truncate text-sm transition-colors", activeContent?.id === item.id ? "text-primary" : "text-white/80 group-hover:text-white")}>
                        {item.title}
                      </p>
                      <p className="text-[10px] opacity-40 mt-1 font-bold">{item.contentType === 'Video' ? 'شرح فيديو' : 'اختبار إلكتروني'}</p>
                    </div>
                    <ChevronLeft className={cn("w-4 h-4 opacity-0 transition-all", activeContent?.id === item.id ? "opacity-100 translate-x-0 text-primary" : "group-hover:opacity-30 group-hover:-translate-x-1")} />
                  </button>
                ))}
              </CardContent>
              <div className="p-6 bg-secondary/5 border-t">
                 <Link href="/student/dashboard">
                    <Button variant="ghost" className="w-full font-black gap-2 text-muted-foreground hover:text-primary transition-colors">
                      العودة للوحة التحكم
                    </Button>
                 </Link>
              </div>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
