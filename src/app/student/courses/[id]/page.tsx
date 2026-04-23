
"use client";

import { useParams } from 'next/navigation';
import { Navbar } from '@/components/ui/navbar';
import { Footer } from '@/components/ui/footer';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, orderBy, setDoc, serverTimestamp, getDocs, updateDoc, where } from 'firebase/firestore';
import { 
  Loader2, 
  CheckCircle, 
  FileQuestion, 
  Lock, 
  Play, 
  Layout,
  Clock,
  Star,
  Activity,
  MonitorPlay,
  PlayCircle
} from 'lucide-react';
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
      const videoDuration = 600;

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
                {/* مشغل فيديوهات البشمهندس - Cinema Wrapper */}
                <div className="relative group">
                  <div className="aspect-video bg-black rounded-[2rem] overflow-hidden border-[8px] border-secondary shadow-2xl relative">
                    <iframe 
                      src={`https://www.youtube.com/embed/${getYouTubeId(activeContent.youtubeLink)}?rel=0&modestbranding=1&autoplay=1&showinfo=0&iv_load_policy=3`} 
                      className="w-full h-full"
                      allow="autoplay; encrypted-media"
                      allowFullScreen 
                    />
                    {/* طبقة هوية المنصة الشفافة التي لا تحجب التحكم */}
                    <div className="absolute top-6 left-6 pointer-events-none bg-primary/20 backdrop-blur-sm px-4 py-1.5 rounded-full flex items-center gap-2 border border-primary/30 shadow-lg">
                       <MonitorPlay className="w-4 h-4 text-primary" />
                       <span className="text-[10px] font-black text-white uppercase tracking-widest">Al-Bashmohandes Player</span>
                    </div>
                  </div>
                </div>

                <Card className="bg-card/40 backdrop-blur-xl p-6 rounded-3xl border-primary/10 shadow-xl">
                  <div className="flex flex-col md:flex-row-reverse justify-between items-center gap-6">
                    <div className="w-full text-right space-y-2">
                      <div className="flex items-center gap-2 justify-end">
                        <Badge className="bg-primary/10 text-primary border-none font-bold px-3 py-1 rounded-full text-[10px]">
                          <Activity className="w-3 h-3 ml-1" /> جاري المشاهدة
                        </Badge>
                        <h1 className="text-xl md:text-2xl font-black text-foreground">{activeContent.title}</h1>
                      </div>
                      <p className="text-muted-foreground font-bold text-xs">شاهد المحتوى كاملاً واضغط على الزر أدناه لحفظ تقدمك.</p>
                    </div>
                    <Button 
                      onClick={() => markAsWatched(activeContent.id)} 
                      disabled={watchedVideos?.some(v => v.courseContentId === activeContent.id)} 
                      className={cn(
                        "w-full md:w-auto h-14 px-8 font-black rounded-2xl shadow-xl shrink-0 gap-2 transition-all active:scale-95",
                        watchedVideos?.some(v => v.courseContentId === activeContent.id) 
                          ? "bg-accent/20 text-accent cursor-default" 
                          : "bg-primary text-primary-foreground hover:brightness-110 shadow-primary/20"
                      )}
                    >
                      {watchedVideos?.some(v => v.courseContentId === activeContent.id) ? (
                        <><CheckCircle className="w-5 h-5" /> الدرس مكتمل</>
                      ) : (
                        <><PlayCircle className="w-5 h-5" /> تأكيد المشاهدة</>
                      )}
                    </Button>
                  </div>
                </Card>
              </div>
            ) : activeContent ? (
              <div className="animate-in slide-in-from-bottom-8 duration-700">
                <Card className="bg-gradient-to-br from-primary/5 via-card to-background border-2 border-dashed border-primary/20 p-8 md:p-12 text-center space-y-8 rounded-[3rem] shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
                  
                  <div className="w-24 h-24 bg-primary/10 rounded-[2rem] flex items-center justify-center mx-auto text-primary shadow-xl rotate-6 group-hover:rotate-0 transition-transform">
                    <FileQuestion className="w-12 h-12" />
                  </div>
                  
                  <div className="space-y-3">
                    <h2 className="text-3xl md:text-4xl font-black">{activeContent.title}</h2>
                    <p className="text-muted-foreground font-bold text-sm max-w-md mx-auto leading-relaxed">
                      هذا الاختبار مصمم لقياس استيعابك للمحتوى. تأكد من مراجعة الدروس السابقة جيداً قبل البدء.
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap items-center justify-center gap-6 py-4">
                     <div className="flex flex-col items-center gap-1">
                        <div className="bg-secondary/50 p-3 rounded-2xl border border-white/5"><Clock className="w-6 h-6 text-primary" /></div>
                        <span className="text-[10px] font-black uppercase mt-1">30 دقيقة</span>
                     </div>
                     <div className="flex flex-col items-center gap-1">
                        <div className="bg-secondary/50 p-3 rounded-2xl border border-white/5"><Star className="w-6 h-6 text-primary" /></div>
                        <span className="text-[10px] font-black uppercase mt-1">محاولة واحدة</span>
                     </div>
                  </div>

                  <Link href={`/student/exams/${activeContent.id}`} className="block pt-6">
                    <Button size="lg" className="w-full md:w-auto h-16 px-16 bg-primary text-primary-foreground font-black rounded-2xl text-xl shadow-2xl shadow-primary/20 hover:scale-105 transition-transform active:scale-95">
                      ابدأ الاختبار الآن ✍️
                    </Button>
                  </Link>
                </Card>
              </div>
            ) : null}
          </div>

          <div className="lg:col-span-1">
            <Card className="bg-card/40 backdrop-blur-md border-primary/10 overflow-hidden shadow-xl rounded-[2.5rem] sticky top-24">
              <CardHeader className="border-b bg-secondary/20 py-5 px-6 flex flex-row-reverse items-center justify-between">
                <CardTitle className="text-lg font-black flex items-center gap-2 justify-end">محتويات الكورس <Layout className="w-5 h-5 text-primary" /></CardTitle>
                <Badge variant="outline" className="border-primary/20 text-primary font-bold px-3">{enrollment?.progressPercentage || 0}%</Badge>
              </CardHeader>
              <CardContent className="p-0 max-h-[60vh] overflow-y-auto custom-scrollbar">
                {visibleContents.map((item, idx) => {
                  const watched = watchedVideos?.some(v => v.courseContentId === item.id);
                  const isActive = activeContent?.id === item.id;
                  return (
                    <button 
                      key={item.id} 
                      onClick={() => setActiveContent(item)} 
                      className={cn(
                        "w-full p-5 text-right flex flex-row-reverse items-center gap-4 transition-all border-b border-white/5 relative group", 
                        isActive ? "bg-primary/10" : "hover:bg-secondary/10"
                      )}
                    >
                      {isActive && <div className="absolute right-0 top-0 w-1.5 h-full bg-primary shadow-[0_0_15px_rgba(255,215,0,0.5)]" />}
                      <div className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-black text-xs transition-all", 
                        watched ? "bg-accent text-white" : isActive ? "bg-primary text-primary-foreground scale-110" : "bg-secondary border border-white/5 text-muted-foreground"
                      )}>
                        {watched ? <CheckCircle className="w-5 h-5" /> : idx + 1}
                      </div>
                      <div className="flex-grow min-w-0">
                        <p className={cn("font-bold text-sm truncate", isActive ? "text-primary" : "text-foreground/80")}>{item.title}</p>
                        <p className="text-[9px] text-muted-foreground mt-0.5 font-bold">
                          {item.contentType === 'Video' ? 'فيديو شرح' : 'اختبار تقييمي'}
                        </p>
                      </div>
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
