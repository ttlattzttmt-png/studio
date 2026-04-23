"use client";

import { useParams } from 'next/navigation';
import { Navbar } from '@/components/ui/navbar';
import { Footer } from '@/components/ui/footer';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, orderBy, setDoc, serverTimestamp, getDocs, updateDoc, where } from 'firebase/firestore';
import { Loader2, CheckCircle, FileQuestion, Lock, ShieldAlert, Play, PlayCircle, Info, ChevronLeft, Layout } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function CourseViewer() {
  const { id } = useParams();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [activeContent, setActiveContent] = useState<any>(null);

  const courseRef = useMemoFirebase(() => (firestore && id) ? doc(firestore, 'courses', id as string) : null, [firestore, id]);
  const { data: course, isLoading: isCourseLoading } = useDoc(courseRef);

  const studentRef = useMemoFirebase(() => (firestore && user) ? doc(firestore, 'students', user.uid) : null, [firestore, user]);
  const { data: studentProfile } = useDoc(studentRef);

  const enrollmentRef = useMemoFirebase(() => (firestore && user && id) ? doc(firestore, 'students', user.uid, 'enrollments', id as string) : null, [firestore, user, id]);
  const { data: enrollment, isLoading: isEnrollmentLoading } = useDoc(enrollmentRef);
  
  const contentRef = useMemoFirebase(() => (firestore && id) ? query(collection(firestore, 'courses', id as string, 'content'), orderBy('orderIndex', 'asc')) : null, [firestore, id]);
  const { data: contents, isLoading: isContentLoading } = useCollection(contentRef);

  const progressRef = useMemoFirebase(() => (firestore && user) ? collection(firestore, 'students', user.uid, 'video_progress') : null, [firestore, user]);
  const { data: watchedVideos } = useCollection(progressRef);

  const visibleContents = useMemo(() => {
    return contents?.filter(c => c.isVisible !== false) || [];
  }, [contents]);

  const isFree = course?.price === 0;

  useEffect(() => {
    if (isFree && !enrollment && user && id && studentProfile && !isEnrollmentLoading && course && firestore) {
      const enRef = doc(firestore, 'students', user.uid, 'enrollments', id as string);
      setDoc(enRef, {
        id: id as string,
        courseId: id as string,
        studentId: user.uid,
        studentName: studentProfile.name,
        status: 'active',
        enrollmentDate: new Date().toISOString(),
        activationDate: new Date().toISOString(),
        progressPercentage: 0,
        isCompleted: false,
        courseTitle: course.title,
      }, { merge: true });
    }
  }, [isFree, enrollment, user, id, studentProfile, isEnrollmentLoading, firestore, course]);

  const markAsWatched = async (contentId: string) => {
    if (!firestore || !user || !id || !studentProfile) return;
    try {
      const videoLogRef = doc(firestore, 'students', user.uid, 'video_progress', contentId);
      const videoDuration = activeContent?.durationInSeconds || 600;

      await setDoc(videoLogRef, {
        studentId: user.uid,
        studentName: studentProfile.name,
        courseId: id,
        courseContentId: contentId,
        isCompleted: true,
        watchedDurationInSeconds: videoDuration,
        lastWatchedAt: serverTimestamp()
      }, { merge: true });

      const allWatchedRef = query(collection(firestore, 'students', user.uid, 'video_progress'), where('courseId', '==', id));
      const watchedSnap = await getDocs(allWatchedRef);
      const watchedCount = watchedSnap.size;
      
      const totalItems = visibleContents.length || 1;
      const newPercent = Math.min(100, Math.round((watchedCount / totalItems) * 100));

      await updateDoc(doc(firestore, 'students', user.uid, 'enrollments', id as string), {
        progressPercentage: newPercent,
        studentName: studentProfile.name,
        lastActivityDate: new Date().toISOString()
      });

      toast({ title: "أحسنت يا بشمهندس!", description: `تم تحديث مستوى إنجازك إلى ${newPercent}%` });
    } catch (e) { 
      console.error(e);
      toast({ variant: "destructive", title: "خطأ في المزامنة" });
    }
  };

  useEffect(() => {
    if (visibleContents.length > 0 && !activeContent) setActiveContent(visibleContents[0]);
  }, [visibleContents, activeContent]);

  if (isUserLoading || isCourseLoading || isEnrollmentLoading || isContentLoading) {
    return <div className="flex justify-center py-40"><Loader2 className="w-12 animate-spin text-primary" /></div>;
  }

  const hasAccess = (enrollment && enrollment.status === 'active') || isFree;

  if (!hasAccess) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center space-y-6 bg-background">
      <div className="w-32 h-32 bg-primary/5 rounded-full flex items-center justify-center animate-pulse border border-primary/10">
        <Lock className="w-16 h-16 text-primary/40" />
      </div>
      <div className="space-y-2">
        <h2 className="text-3xl font-black">الكورس مقفل حالياً</h2>
        <p className="text-muted-foreground max-w-sm font-bold">هذا الكورس يتطلب كود تفعيل. يرجى مراجعة السكرتارية أو تفعيل الكود الخاص بك.</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-xs">
        <Link href="/student/redeem" className="flex-1"><Button className="w-full bg-primary font-black rounded-xl h-14 shadow-lg">تفعيل الكود الآن</Button></Link>
        <Link href="/courses" className="flex-1"><Button variant="outline" className="w-full h-14 rounded-xl font-bold border-primary/20 text-primary">العودة للمكتبة</Button></Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background text-right">
      <Navbar />
      <main className="flex-grow pt-24 pb-20 container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 space-y-6">
            {activeContent?.contentType === 'Video' ? (
              <div className="space-y-6 animate-in fade-in duration-500">
                {/* مشغل فيديوهات البشمهندس الاحترافي */}
                <div className="relative group">
                  <div className="aspect-video bg-black rounded-[2rem] md:rounded-[3rem] overflow-hidden border-[6px] border-secondary/50 shadow-2xl relative shadow-primary/5 ring-1 ring-primary/20">
                    <iframe 
                      src={`https://www.youtube.com/embed/${getYouTubeId(activeContent.youtubeLink)}?rel=0&modestbranding=1&autoplay=1&iv_load_policy=3&controls=1`} 
                      className="w-full h-full" 
                      allowFullScreen 
                    />
                    {/* طبقة حماية ومنظر احترافي */}
                    <div className="absolute inset-0 pointer-events-none border-[12px] md:border-[24px] border-transparent" />
                    <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                       <span className="text-[10px] font-black text-white uppercase tracking-tighter">Live Cinema Mode</span>
                    </div>
                  </div>
                </div>

                <Card className="bg-card/50 backdrop-blur-sm p-6 md:p-10 rounded-[2.5rem] border-primary/10 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                  <div className="flex flex-col md:flex-row-reverse justify-between items-center gap-8 relative z-10">
                    <div className="w-full text-right space-y-3">
                      <div className="flex items-center gap-3 justify-end flex-wrap">
                        <Badge className="bg-primary/20 text-primary border-none font-black px-4 py-1 rounded-full text-[10px] md:text-xs">
                          <PlayCircle className="w-3 h-3 ml-1.5" /> قيد المشاهدة الآن
                        </Badge>
                        <h1 className="text-xl md:text-4xl font-black text-foreground leading-tight">{activeContent.title}</h1>
                      </div>
                      <div className="flex items-center gap-4 justify-end text-muted-foreground font-bold text-[10px] md:text-sm">
                         <span className="flex items-center gap-1.5 underline decoration-primary/30 decoration-2">حصري لمنصة البشمهندس</span>
                         <span className="w-1 h-1 rounded-full bg-muted" />
                         <span className="flex items-center gap-1.5">محتوى محمي <ShieldAlert className="w-4 h-4 text-primary" /></span>
                      </div>
                    </div>
                    <Button 
                      onClick={() => markAsWatched(activeContent.id)} 
                      disabled={watchedVideos?.some(v => v.courseContentId === activeContent.id)} 
                      className={cn(
                        "w-full md:w-auto h-14 md:h-16 px-10 md:px-14 font-black rounded-2xl shadow-2xl shrink-0 gap-3 transition-all active:scale-95 text-sm md:text-lg border-b-4",
                        watchedVideos?.some(v => v.courseContentId === activeContent.id) 
                          ? "bg-accent border-accent-foreground/20 text-white cursor-default" 
                          : "bg-primary border-primary-foreground/20 text-primary-foreground hover:brightness-110"
                      )}
                    >
                      {watchedVideos?.some(v => v.courseContentId === activeContent.id) ? (
                        <><CheckCircle className="w-6 h-6" /> أحسنت، شاهدته!</>
                      ) : (
                        <><Play className="w-6 h-6 fill-current" /> أكملت الدرس؟ علم عليه ✅</>
                      )}
                    </Button>
                  </div>
                </Card>
              </div>
            ) : activeContent ? (
              <div className="animate-in slide-in-from-bottom-8 duration-700">
                <Card className="bg-gradient-to-br from-primary/10 via-background to-secondary/30 border-4 border-dashed border-primary/20 p-10 md:p-24 text-center space-y-8 rounded-[3rem] md:rounded-[5rem] shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px]" />
                  <div className="w-20 h-20 md:w-32 md:h-32 bg-primary/20 rounded-[2rem] flex items-center justify-center mx-auto text-primary shadow-2xl rotate-3 ring-8 ring-primary/5">
                    <FileQuestion className="w-10 h-10 md:w-16 md:h-16" />
                  </div>
                  <div className="space-y-4 max-w-lg mx-auto">
                    <h2 className="text-3xl md:text-5xl font-headline font-black leading-tight text-foreground">{activeContent.title}</h2>
                    <p className="text-muted-foreground font-bold text-base md:text-xl leading-relaxed">
                      هذا الاختبار صُمم خصيصاً لقياس مدى استيعابك للمفاهيم التي شرحها البشمهندس في الفيديوهات السابقة.
                    </p>
                  </div>
                  <div className="flex flex-col md:flex-row items-center justify-center gap-6 pt-4">
                     <div className="flex items-center gap-2 bg-secondary/50 px-6 py-3 rounded-2xl border border-white/5 shadow-sm">
                        <Clock className="w-5 h-5 text-primary" />
                        <span className="font-black text-sm">30 دقيقة</span>
                     </div>
                     <div className="flex items-center gap-2 bg-secondary/50 px-6 py-3 rounded-2xl border border-white/5 shadow-sm">
                        <Star className="w-5 h-5 text-primary" />
                        <span className="font-black text-sm">محاولة واحدة</span>
                     </div>
                  </div>
                  <Link href={`/student/exams/${activeContent.id}`} className="block pt-6">
                    <Button size="lg" className="w-full md:w-auto h-16 md:h-20 px-12 md:px-20 bg-primary font-black rounded-3xl text-xl md:text-2xl shadow-2xl hover:scale-105 transition-all active:scale-95 border-b-8 border-primary-foreground/20">
                      ابدأ التحدي الآن ✍️
                    </Button>
                  </Link>
                </Card>
              </div>
            ) : null}
          </div>

          <div className="lg:col-span-1">
            <Card className="bg-card/40 backdrop-blur-md border-primary/10 overflow-hidden shadow-2xl rounded-[2.5rem] sticky top-24 ring-1 ring-white/5">
              <CardHeader className="border-b bg-secondary/20 py-6 px-8 flex flex-row-reverse items-center justify-between">
                <div className="text-right">
                  <CardTitle className="text-xl font-black mb-1 flex items-center gap-2 justify-end">خطة الدرس <Layout className="w-5 h-5 text-primary" /></CardTitle>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Progress Tracker</p>
                </div>
                <div className="relative w-16 h-16 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90">
                    <circle cx="32" cy="32" r="28" fill="transparent" stroke="currentColor" strokeWidth="4" className="text-secondary" />
                    <circle cx="32" cy="32" r="28" fill="transparent" stroke="currentColor" strokeWidth="4" strokeDasharray={175} strokeDashoffset={175 - (175 * (enrollment?.progressPercentage || 0)) / 100} className="text-primary transition-all duration-1000" />
                  </svg>
                  <span className="absolute text-xs font-black text-primary">{enrollment?.progressPercentage || 0}%</span>
                </div>
              </CardHeader>
              <CardContent className="p-0 max-h-[50vh] md:max-h-[65vh] overflow-y-auto custom-scrollbar">
                {visibleContents.map((item, idx) => {
                  const watched = watchedVideos?.some(v => v.courseContentId === item.id);
                  const isActive = activeContent?.id === item.id;
                  return (
                    <button 
                      key={item.id} 
                      onClick={() => setActiveContent(item)} 
                      className={cn(
                        "w-full p-6 text-right flex flex-row-reverse items-center gap-4 transition-all border-b border-white/5 relative group", 
                        isActive ? "bg-primary/10" : "hover:bg-secondary/20"
                      )}
                    >
                      {isActive && <div className="absolute right-0 top-0 w-1.5 h-full bg-primary shadow-[0_0_15px_rgba(255,215,0,0.5)]" />}
                      <div className={cn(
                        "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 font-black shadow-lg text-sm transition-all group-hover:scale-110", 
                        watched ? "bg-accent text-white" : isActive ? "bg-primary text-primary-foreground" : "bg-secondary/80 border border-white/5"
                      )}>
                        {watched ? <CheckCircle className="w-5 h-5" /> : idx + 1}
                      </div>
                      <div className="flex-grow min-w-0">
                        <p className={cn("font-black text-sm truncate mb-1", isActive ? "text-primary" : "text-foreground/80")}>{item.title}</p>
                        <div className="flex flex-row-reverse items-center gap-2">
                           <span className={cn(
                             "text-[9px] font-black px-2 py-0.5 rounded-full border",
                             item.contentType === 'Video' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-purple-500/10 text-purple-400 border-purple-500/20"
                           )}>
                             {item.contentType === 'Video' ? 'فيديو شرح' : 'اختبار تقييمي'}
                           </span>
                        </div>
                      </div>
                      <ChevronLeft className={cn("w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all", isActive ? "opacity-100 text-primary" : "")} />
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function getYouTubeId(url: string) {
  if (!url) return '';
  const match = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/);
  return (match && match[2] && match[2].length === 11) ? match[2] : url;
}
