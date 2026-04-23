
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
  MonitorPlay
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
      const videoDuration = 600; // مدة افتراضية 10 دقائق

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
                <div className="relative group">
                  <div className="aspect-video bg-black rounded-3xl overflow-hidden border-[6px] border-secondary shadow-2xl relative shadow-primary/10">
                    <iframe 
                      src={`https://www.youtube.com/embed/${getYouTubeId(activeContent.youtubeLink)}?rel=0&modestbranding=1&autoplay=1&iv_load_policy=3`} 
                      className="w-full h-full"
                      allow="autoplay; encrypted-media"
                      allowFullScreen 
                    />
                    <div className="absolute top-4 left-4 pointer-events-none bg-primary/80 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-2 shadow-xl opacity-50">
                       <MonitorPlay className="w-3 h-3 text-black" />
                       <span className="text-[8px] font-black text-black uppercase tracking-widest">AL-BASHMOHANDES PRO</span>
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
                      <p className="text-muted-foreground font-bold text-xs">اضغط على الزر أدناه لتأكيد إتمام الدرس وحفظ التقدم.</p>
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
                        <><Play className="w-5 h-5 fill-current" /> تأكيد المشاهدة</>
                      )}
                    </Button>
                  </div>
                </Card>
              </div>
            ) : activeContent ? (
              <div className="animate-in slide-in-from-bottom-8 duration-700">
                <Card className="bg-gradient-to-br from-primary/5 via-card to-background border-2 border-dashed border-primary/20 p-8 md:p-12 text-center space-y-6 rounded-[2.5rem] shadow-xl">
                  <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto text-primary shadow-lg rotate-3">
                    <FileQuestion className="w-10 h-10" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl md:text-3xl font-black">{activeContent.title}</h2>
                    <p className="text-muted-foreground font-bold text-sm">اختبار تقييمي محمي - يرجى التأكد من استقرار الإنترنت قبل البدء.</p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-4 py-2">
                     <div className="flex items-center gap-2 bg-secondary/50 px-4 py-2 rounded-xl border border-white/5">
                        <Clock className="w-4 h-4 text-primary" />
                        <span className="text-xs font-bold">30 دقيقة</span>
                     </div>
                     <div className="flex items-center gap-2 bg-secondary/50 px-4 py-2 rounded-xl border border-white/5">
                        <Star className="w-4 h-4 text-primary" />
                        <span className="text-xs font-bold">محاولة واحدة</span>
                     </div>
                  </div>
                  <Link href={`/student/exams/${activeContent.id}`} className="block pt-4">
                    <Button size="lg" className="w-full md:w-auto h-16 px-12 bg-primary font-black rounded-2xl text-lg shadow-xl shadow-primary/20">
                      ابدأ الاختبار الآن ✍️
                    </Button>
                  </Link>
                </Card>
              </div>
            ) : null}
          </div>

          <div className="lg:col-span-1">
            <Card className="bg-card/40 backdrop-blur-md border-primary/10 overflow-hidden shadow-xl rounded-[2rem] sticky top-24">
              <CardHeader className="border-b bg-secondary/20 py-4 px-6 flex flex-row-reverse items-center justify-between">
                <CardTitle className="text-base font-black flex items-center gap-2 justify-end">خطة الكورس <Layout className="w-4 h-4 text-primary" /></CardTitle>
                <Badge variant="outline" className="border-primary/20 text-primary font-bold">{enrollment?.progressPercentage || 0}%</Badge>
              </CardHeader>
              <CardContent className="p-0 max-h-[60vh] overflow-y-auto">
                {visibleContents.map((item, idx) => {
                  const watched = watchedVideos?.some(v => v.courseContentId === item.id);
                  const isActive = activeContent?.id === item.id;
                  return (
                    <button 
                      key={item.id} 
                      onClick={() => setActiveContent(item)} 
                      className={cn(
                        "w-full p-4 text-right flex flex-row-reverse items-center gap-3 transition-all border-b border-white/5 relative", 
                        isActive ? "bg-primary/10" : "hover:bg-secondary/10"
                      )}
                    >
                      {isActive && <div className="absolute right-0 top-0 w-1 h-full bg-primary shadow-lg" />}
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-black text-xs", 
                        watched ? "bg-accent text-white" : isActive ? "bg-primary text-primary-foreground" : "bg-secondary border border-white/5"
                      )}>
                        {watched ? <CheckCircle className="w-4 h-4" /> : idx + 1}
                      </div>
                      <div className="flex-grow min-w-0">
                        <p className={cn("font-bold text-xs truncate", isActive ? "text-primary" : "text-foreground/80")}>{item.title}</p>
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

