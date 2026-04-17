
"use client";

import { useParams } from 'next/navigation';
import { Navbar } from '@/components/ui/navbar';
import { Footer } from '@/components/ui/footer';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, orderBy, setDoc, serverTimestamp, getDocs, updateDoc, where } from 'firebase/firestore';
import { Loader2, PlayCircle, CheckCircle, FileQuestion, Lock } from 'lucide-react';
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

  // دالة متطورة لتحديث التقدم بشكل لحظي ومتزامن للادمن والطالب
  const markAsWatched = async (contentId: string) => {
    if (!firestore || !user || !id || !studentProfile) return;
    try {
      // 1. تسجيل مشاهدة الفيديو مع حفظ المدة لغرض الإحصائيات (Insights)
      const videoLogRef = doc(firestore, 'students', user.uid, 'video_progress', contentId);
      
      // نفترض طول افتراضي للفيديو 10 دقائق إذا لم يكن مسجلاً
      const videoDuration = activeContent?.durationInSeconds || 600;

      await setDoc(videoLogRef, {
        studentId: user.uid,
        studentName: studentProfile.name || 'طالب المنصة',
        courseId: id,
        courseContentId: contentId,
        isCompleted: true,
        watchedDurationInSeconds: videoDuration,
        lastWatchedAt: serverTimestamp()
      });

      // 2. إعادة حساب نسبة الإنجاز من السيرفر فوراً لضمان الدقة في الجانبين
      const allWatchedRef = query(collection(firestore, 'students', user.uid, 'video_progress'), where('courseId', '==', id));
      const watchedSnap = await getDocs(allWatchedRef);
      const watchedCount = watchedSnap.size;
      
      const totalItems = visibleContents.length || 1;
      const newPercent = Math.min(100, Math.round((watchedCount / totalItems) * 100));

      // 3. تحديث سجل الاشتراك بالنسبة الجديدة والاسم للرقابة
      await updateDoc(doc(firestore, 'students', user.uid, 'enrollments', id as string), {
        progressPercentage: newPercent,
        studentName: studentProfile.name,
        lastActivityDate: new Date().toISOString()
      });

      toast({ title: "أحسنت!", description: `تم تحديث مستوى إنجازك إلى ${newPercent}%` });
    } catch (e) { 
      console.error(e);
      toast({ variant: "destructive", title: "خطأ في المزامنة", description: "تأكد من اتصالك بالإنترنت." });
    }
  };

  useEffect(() => {
    if (visibleContents.length > 0 && !activeContent) setActiveContent(visibleContents[0]);
  }, [visibleContents, activeContent]);

  if (isUserLoading || isCourseLoading || isEnrollmentLoading || isContentLoading) {
    return <div className="flex justify-center py-40"><Loader2 className="w-12 animate-spin text-primary" /></div>;
  }

  const isFree = course?.price === 0;
  const hasAccess = (enrollment && enrollment.status === 'active') || isFree;

  if (!hasAccess) return <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center space-y-6"><Lock className="w-20 h-20 text-destructive opacity-30" /><h2 className="text-2xl font-bold">هذا الكورس يتطلب تفعيل</h2><Link href="/courses"><Button variant="outline" className="rounded-xl">العودة للمكتبة</Button></Link></div>;

  return (
    <div className="min-h-screen flex flex-col bg-background select-none">
      <Navbar />
      <main className="flex-grow pt-24 pb-20 container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {activeContent?.contentType === 'Video' ? (
              <div className="space-y-4 animate-in fade-in duration-500">
                <div className="aspect-video bg-black rounded-[2rem] overflow-hidden border-4 border-primary/5 shadow-2xl relative">
                   <iframe src={`https://www.youtube.com/embed/${getYouTubeId(activeContent.youtubeLink)}?rel=0&modestbranding=1&autoplay=1`} className="w-full h-full" allowFullScreen />
                   <div className="absolute inset-0 pointer-events-none border-[15px] border-transparent" />
                </div>
                <Card className="bg-card p-8 rounded-[2rem] border-primary/10 shadow-xl">
                  <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-right">
                    <div className="w-full">
                      <div className="flex items-center gap-2 justify-end mb-2">
                        <Badge variant="outline" className="text-primary font-bold border-primary/20">شرح فيديو</Badge>
                        <h1 className="text-2xl font-black">{activeContent.title}</h1>
                      </div>
                      <p className="text-muted-foreground text-sm font-bold">استمتع بالشرح؛ المحتوى محمي بحقوق الملكية الفكرية لمنصة البشمهندس.</p>
                    </div>
                    <Button 
                      onClick={() => markAsWatched(activeContent.id)} 
                      disabled={watchedVideos?.some(v => v.courseContentId === activeContent.id)} 
                      className={cn(
                        "h-14 px-8 font-black rounded-2xl shadow-xl shrink-0 gap-2 transition-all",
                        watchedVideos?.some(v => v.courseContentId === activeContent.id) ? "bg-accent text-white" : "bg-primary text-primary-foreground"
                      )}
                    >
                      {watchedVideos?.some(v => v.courseContentId === activeContent.id) ? (
                        <><CheckCircle className="w-5 h-5" /> تمت المشاهدة</>
                      ) : (
                        "تعليم كـ مكتمل ✅"
                      )}
                    </Button>
                  </div>
                </Card>
              </div>
            ) : activeContent ? (
              <Card className="bg-primary/5 border-2 border-dashed border-primary/20 p-20 text-center space-y-8 rounded-[3rem] shadow-inner">
                <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary shadow-xl"><FileQuestion className="w-12 h-12" /></div>
                <div className="space-y-2">
                  <h2 className="text-4xl font-headline font-black">{activeContent.title}</h2>
                  <p className="text-muted-foreground font-bold">اختبار تقييمي لقياس مستوى استيعابك للدرس.</p>
                </div>
                <Link href={`/student/exams/${activeContent.id}`}><Button size="lg" className="h-16 px-12 bg-primary font-black rounded-2xl text-xl shadow-2xl hover:scale-105 transition-transform">ابدأ الامتحان الآن</Button></Link>
              </Card>
            ) : null}
          </div>
          <div className="lg:col-span-1">
            <Card className="bg-card border-primary/10 overflow-hidden shadow-2xl rounded-[2.5rem] sticky top-24">
              <CardHeader className="border-b bg-secondary/5 py-6 px-8 flex flex-row-reverse items-center justify-between">
                <CardTitle className="text-xl font-black flex items-center gap-2 justify-end">محتوى الكورس</CardTitle>
                <Badge className="bg-primary/10 text-primary border-none">{enrollment?.progressPercentage || 0}%</Badge>
              </CardHeader>
              <CardContent className="p-0 max-h-[60vh] overflow-y-auto">
                {visibleContents.map((item, idx) => {
                  const watched = watchedVideos?.some(v => v.courseContentId === item.id);
                  const isActive = activeContent?.id === item.id;
                  return (
                    <button key={item.id} onClick={() => setActiveContent(item)} className={cn("w-full p-5 text-right flex items-center gap-4 transition-all border-b last:border-0", isActive ? "bg-primary/10 border-r-4 border-primary" : "hover:bg-secondary/10")}>
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-black shadow-sm", watched ? "bg-accent text-white" : isActive ? "bg-primary text-primary-foreground" : "bg-secondary")}>{watched ? <CheckCircle className="w-5 h-5" /> : idx + 1}</div>
                      <div className="flex-grow min-w-0">
                        <p className={cn("font-black text-sm truncate mb-0.5", isActive ? "text-primary" : "")}>{item.title}</p>
                        <span className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">{item.contentType === 'Video' ? 'شرح فيديو' : 'امتحان الكتروني'}</span>
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
