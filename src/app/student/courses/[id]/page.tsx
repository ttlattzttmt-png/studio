
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
        id: id as string, courseId: id as string, studentId: user.uid, studentName: studentProfile.name, status: 'active', enrollmentDate: new Date().toISOString(), activationDate: new Date().toISOString(), progressPercentage: 0, isCompleted: false, courseTitle: course.title,
      }, { merge: true });
    }
  }, [isFree, enrollment, user, id, studentProfile, isEnrollmentLoading, firestore, course]);

  const markAsWatched = async (contentId: string) => {
    if (!firestore || !user || !id || !studentProfile) return;
    const videoLogRef = doc(firestore, 'students', user.uid, 'video_progress', contentId);
    await setDoc(videoLogRef, { studentId: user.uid, studentName: studentProfile.name, courseId: id, courseContentId: contentId, isCompleted: true, watchedDurationInSeconds: 600, lastWatchedAt: serverTimestamp() }, { merge: true });
    
    const allWatchedRef = query(collection(firestore, 'students', user.uid, 'video_progress'), where('courseId', '==', id));
    const watchedSnap = await getDocs(allWatchedRef);
    const newPercent = Math.min(100, Math.round((watchedSnap.size / (visibleContents.length || 1)) * 100));

    await updateDoc(doc(firestore, 'students', user.uid, 'enrollments', id as string), { progressPercentage: newPercent, studentName: studentProfile.name, lastActivityDate: new Date().toISOString() });
    toast({ title: "أحسنت يا بشمهندس!", description: `إنجازك: ${newPercent}%` });
  };

  useEffect(() => { if (visibleContents.length > 0 && !activeContent) setActiveContent(visibleContents[0]); }, [visibleContents, activeContent]);

  if (isUserLoading || isCourseLoading || isEnrollmentLoading || isContentLoading) return <div className="flex justify-center py-40"><Loader2 className="w-12 animate-spin text-primary" /></div>;

  const hasAccess = (enrollment && enrollment.status === 'active') || isFree;
  if (!hasAccess) return <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center space-y-6 bg-background"><Lock className="w-16 h-16 text-primary/40 animate-pulse" /><h2 className="text-3xl font-black">الكورس مقفل</h2><Link href="/student/redeem"><Button className="bg-primary h-14 px-10 rounded-xl">تفعيل كود</Button></Link></div>;

  return (
    <div className="min-h-screen flex flex-col bg-background text-right">
      <Navbar />
      <main className="flex-grow pt-24 pb-20 container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {activeContent?.contentType === 'Video' ? (
              <div className="space-y-6">
                <div className="relative bg-black rounded-[2.5rem] overflow-hidden border-[6px] border-card shadow-2xl">
                    <div className="aspect-video w-full">
                      <iframe 
                        src={`https://www.youtube.com/embed/${getYouTubeId(activeContent.youtubeLink)}?rel=0&modestbranding=1&autoplay=1`} 
                        className="w-full h-full"
                        allowFullScreen 
                        allow="autoplay; encrypted-media"
                      />
                    </div>
                    <div className="absolute top-4 left-4 bg-primary/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black border border-primary/30 pointer-events-none">Al-Bashmohandes Pro Player</div>
                </div>
                <Card className="bg-card/50 backdrop-blur-xl p-6 rounded-3xl border-primary/10">
                  <div className="flex flex-col md:flex-row-reverse justify-between items-center gap-4">
                    <div className="text-right flex-grow"><h1 className="text-xl font-black">{activeContent.title}</h1><p className="text-[10px] text-muted-foreground font-bold">بشمهندس، شاهد للنهاية لتوثيق حضورك.</p></div>
                    <Button onClick={() => markAsWatched(activeContent.id)} disabled={watchedVideos?.some(v => v.courseContentId === activeContent.id)} className="h-14 px-10 rounded-2xl font-black bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                      {watchedVideos?.some(v => v.courseContentId === activeContent.id) ? "درس مكتمل ✓" : "تأكيد المشاهدة"}
                    </Button>
                  </div>
                </Card>
              </div>
            ) : activeContent ? (
              <Card className="bg-gradient-to-br from-primary/5 via-card to-background border-2 border-dashed border-primary/20 p-12 text-center space-y-8 rounded-[3rem] shadow-2xl">
                  <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto text-primary"><FileQuestion className="w-10 h-10" /></div>
                  <h2 className="text-3xl font-black">{activeContent.title}</h2>
                  <div className="flex justify-center gap-6 text-[10px] font-black uppercase">
                     <span className="flex items-center gap-1"><Clock className="w-4 h-4 text-primary" /> 30 دقيقة</span>
                     <span className="flex items-center gap-1"><Star className="w-4 h-4 text-primary" /> محاولة واحدة</span>
                  </div>
                  <Link href={`/student/exams/${activeContent.id}`} className="block pt-4">
                    <Button size="lg" className="h-16 px-16 bg-primary text-primary-foreground font-black rounded-2xl text-xl shadow-xl shadow-primary/20">ابدأ الاختبار الآن ✍️</Button>
                  </Link>
              </Card>
            ) : null}
          </div>
          <div className="lg:col-span-1">
            <Card className="bg-card/40 backdrop-blur-md border-primary/10 overflow-hidden shadow-xl rounded-[2.5rem] sticky top-24">
              <CardHeader className="border-b bg-secondary/20 py-4 px-6 flex flex-row-reverse items-center justify-between"><CardTitle className="text-lg font-black flex items-center gap-2 justify-end">محتويات الكورس <Layout className="w-5 h-5 text-primary" /></CardTitle><Badge className="bg-primary/20 text-primary">{enrollment?.progressPercentage || 0}%</Badge></CardHeader>
              <CardContent className="p-0 max-h-[60vh] overflow-y-auto">
                {visibleContents.map((item, idx) => (
                  <button key={item.id} onClick={() => setActiveContent(item)} className={cn("w-full p-5 text-right flex flex-row-reverse items-center gap-4 transition-all border-b border-white/5", activeContent?.id === item.id ? "bg-primary/10 border-r-4 border-primary" : "hover:bg-secondary/10")}>
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-black text-xs", watchedVideos?.some(v => v.courseContentId === item.id) ? "bg-accent text-white" : "bg-secondary")}>{idx+1}</div>
                    <div className="min-w-0"><p className="font-bold text-sm truncate">{item.title}</p><p className="text-[9px] text-muted-foreground">{item.contentType === 'Video' ? 'فيديو' : 'اختبار'}</p></div>
                  </button>
                ))}
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
