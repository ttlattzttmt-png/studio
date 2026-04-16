"use client";

import { useParams, useRouter } from 'next/navigation';
import { Navbar } from '@/components/ui/navbar';
import { Footer } from '@/components/ui/footer';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, orderBy, setDoc, serverTimestamp } from 'firebase/firestore';
import { Loader2, PlayCircle, CheckCircle, FileQuestion, BookOpen, Clock, Lock } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function CourseViewer() {
  const { id } = useParams();
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [activeContent, setActiveContent] = useState<any>(null);

  const enrollmentRef = useMemoFirebase(() => (firestore && user && id) ? doc(firestore, 'students', user.uid, 'enrollments', id as string) : null, [firestore, user, id]);
  const { data: enrollment, isLoading: isChecking } = useDoc(enrollmentRef);
  
  const contentRef = useMemoFirebase(() => (firestore && id) ? query(collection(firestore, 'courses', id as string, 'content'), orderBy('orderIndex', 'asc')) : null, [firestore, id]);
  const { data: contents, isLoading: isContentLoading } = useCollection(contentRef);

  const progressRef = useMemoFirebase(() => (firestore && user) ? collection(firestore, 'students', user.uid, 'video_progress') : null, [firestore, user]);
  const { data: watchedVideos } = useCollection(progressRef);

  // تصفية المحتوى الظاهر فقط
  const visibleContents = useMemo(() => {
    return contents?.filter(c => c.isVisible !== false) || [];
  }, [contents]);

  useEffect(() => {
    if (visibleContents.length > 0 && !activeContent) {
      setActiveContent(visibleContents[0]);
    }
  }, [visibleContents, activeContent]);

  const markAsWatched = async (contentId: string) => {
    if (!firestore || !user) return;
    try {
      await setDoc(doc(firestore, 'students', user.uid, 'video_progress', contentId), {
        studentId: user.uid,
        courseContentId: contentId,
        isCompleted: true,
        lastWatchedAt: serverTimestamp()
      });
      toast({ title: "أحسنت!", description: "تم تسجيل التقدم في هذا الدرس." });
    } catch (e) { console.error(e); }
  };

  if (isUserLoading || isChecking || isContentLoading) return <div className="flex justify-center py-40"><Loader2 className="w-12 animate-spin text-primary" /></div>;

  if (!enrollment || enrollment.status !== 'active') {
    return <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center space-y-6">
      <Lock className="w-20 h-20 text-destructive opacity-30" />
      <h2 className="text-2xl font-bold">هذا الكورس غير مفعل لك</h2>
      <Link href="/courses"><Button variant="outline">العودة للمكتبة</Button></Link>
    </div>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background select-none" onContextMenu={(e) => e.preventDefault()}>
      <Navbar />
      <main className="flex-grow pt-24 pb-20 container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {activeContent?.contentType === 'Video' ? (
              <div className="space-y-4 animate-in fade-in duration-500">
                <div className="aspect-video bg-black rounded-[2rem] overflow-hidden border-4 border-primary/5 shadow-2xl">
                   <iframe src={`https://www.youtube.com/embed/${getYouTubeId(activeContent.youtubeLink)}`} className="w-full h-full" allowFullScreen />
                </div>
                <Card className="bg-card p-8 rounded-[2rem] border-primary/10">
                  <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-right">
                    <div className="w-full">
                      <h1 className="text-2xl font-bold mb-2">{activeContent.title}</h1>
                      <p className="text-muted-foreground text-sm">استمتع بالشرح ولا تتردد في سؤال البشمهندس عن أي نقطة.</p>
                    </div>
                    <Button onClick={() => markAsWatched(activeContent.id)} disabled={watchedVideos?.some(v => v.courseContentId === activeContent.id)} className="h-14 px-8 font-bold rounded-xl shadow-xl shrink-0">
                      {watchedVideos?.some(v => v.courseContentId === activeContent.id) ? "تمت المشاهدة" : "تعليم كـ مكتمل"}
                    </Button>
                  </div>
                </Card>
              </div>
            ) : activeContent ? (
              <Card className="bg-primary/5 border-2 border-dashed border-primary/20 p-20 text-center space-y-8 rounded-[3rem] animate-in zoom-in-95">
                <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary"><FileQuestion className="w-12 h-12" /></div>
                <div className="space-y-2">
                  <h2 className="text-4xl font-headline font-bold">{activeContent.title}</h2>
                  <p className="text-muted-foreground italic">امتحان شامل لقياس مستواك (يسمح بمحاولة واحدة فقط).</p>
                </div>
                <Link href={`/student/exams/${activeContent.id}`}>
                  <Button size="lg" className="h-16 px-12 bg-primary text-primary-foreground font-bold rounded-2xl text-xl shadow-2xl">ابدأ الامتحان الآن</Button>
                </Link>
              </Card>
            ) : <div className="text-center py-20 text-muted-foreground italic">اختر درساً للبدء.</div>}
          </div>

          <div className="lg:col-span-1">
            <Card className="bg-card border-primary/10 overflow-hidden shadow-xl rounded-[2rem] sticky top-24">
              <CardHeader className="border-b bg-secondary/5 py-6">
                <CardTitle className="text-xl font-bold flex items-center gap-2 justify-end"><PlayCircle className="w-5 h-5 text-primary" /> محتوى الكورس</CardTitle>
              </CardHeader>
              <CardContent className="p-0 max-h-[60vh] overflow-y-auto">
                {visibleContents.map((item, idx) => {
                  const watched = watchedVideos?.some(v => v.courseContentId === item.id);
                  const isActive = activeContent?.id === item.id;
                  return (
                    <button key={item.id} onClick={() => setActiveContent(item)} className={cn("w-full p-5 text-right flex items-center gap-4 transition-all border-b last:border-0", isActive ? "bg-primary/10 border-r-4 border-primary" : "hover:bg-secondary/10")}>
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold", watched ? "bg-accent text-white" : isActive ? "bg-primary text-primary-foreground" : "bg-secondary")}>
                        {watched ? <CheckCircle className="w-5" /> : idx + 1}
                      </div>
                      <div className="flex-grow min-w-0">
                        <p className={cn("font-bold text-sm truncate", isActive ? "text-primary" : "")}>{item.title}</p>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold">{item.contentType === 'Video' ? 'فيديو' : 'امتحان'}</span>
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
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2] && match[2].length === 11) ? match[2] : url;
}