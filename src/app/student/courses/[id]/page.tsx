
"use client";

import { useParams, useRouter } from 'next/navigation';
import { Navbar } from '@/components/ui/navbar';
import { Footer } from '@/components/ui/footer';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, orderBy, setDoc, serverTimestamp } from 'firebase/firestore';
import { Loader2, PlayCircle, BookOpen, Clock, ChevronRight, Lock, FileQuestion, ExternalLink, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function CourseViewer() {
  const { id } = useParams();
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [activeContent, setActiveContent] = useState<any>(null);

  const enrollmentRef = useMemoFirebase(() => {
    if (!firestore || !user || !id) return null;
    return doc(firestore, 'students', user.uid, 'enrollments', id as string);
  }, [firestore, user, id]);

  const { data: enrollment, isLoading: isChecking } = useDoc(enrollmentRef);
  const { data: course } = useDoc(useMemoFirebase(() => id ? doc(firestore, 'courses', id as string) : null, [firestore, id]));
  
  const contentRef = useMemoFirebase(() => {
    if (!firestore || !id) return null;
    return query(collection(firestore, 'courses', id as string, 'content'), orderBy('orderIndex', 'asc'));
  }, [firestore, id]);

  const { data: contents, isLoading: isContentLoading } = useCollection(contentRef);

  // جلب سجلات المشاهدة للطالب
  const progressRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'students', user.uid, 'video_progress');
  }, [firestore, user]);
  const { data: watchedVideos } = useCollection(progressRef);

  const markAsWatched = async (contentId: string) => {
    if (!firestore || !user) return;
    try {
      await setDoc(doc(firestore, 'students', user.uid, 'video_progress', contentId), {
        studentId: user.uid,
        courseContentId: contentId,
        isCompleted: true,
        lastWatchedAt: serverTimestamp()
      });
      toast({ title: "تم تسجيل المشاهدة", description: "سيتمكن البشمهندس من رؤية تقدمك الآن." });
    } catch (e) { console.error(e); }
  };

  if (isUserLoading || isChecking || isContentLoading) return <div className="flex justify-center py-40"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;

  if (!enrollment || enrollment.status !== 'active') {
    return <div className="min-h-screen flex items-center justify-center p-4">كورس غير مفعل أو لا تملك صلاحية الوصول.</div>;
  }

  const currentItem = activeContent || contents?.[0];
  const isWatched = watchedVideos?.some(v => v.courseContentId === currentItem?.id);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-grow pt-24 pb-20 container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {currentItem?.contentType === 'Video' ? (
              <div className="space-y-4">
                <div className="aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl">
                   <iframe src={`https://www.youtube.com/embed/${getYouTubeId(currentItem.youtubeLink)}`} className="w-full h-full" allowFullScreen />
                </div>
                <div className="flex justify-between items-center bg-card p-6 rounded-2xl border">
                  <h1 className="text-2xl font-bold">{currentItem.title}</h1>
                  <Button 
                    onClick={() => markAsWatched(currentItem.id)} 
                    disabled={isWatched}
                    className={isWatched ? "bg-accent text-white" : "bg-primary"}
                  >
                    {isWatched ? <><CheckCircle className="w-4 h-4 ml-2" /> تمت المشاهدة</> : "تعليم كمشاهد"}
                  </Button>
                </div>
              </div>
            ) : (
              <Card className="bg-primary/5 border-2 border-dashed border-primary/20 p-12 text-center space-y-6 rounded-[2rem]">
                <FileQuestion className="w-20 h-20 mx-auto text-primary" />
                <h2 className="text-3xl font-bold">{currentItem?.title}</h2>
                <Link href={`/student/exams/${currentItem?.id}`}>
                  <Button size="lg" className="h-16 px-12 bg-primary font-bold rounded-2xl text-xl shadow-xl shadow-primary/20">
                    ابدأ الامتحان (مؤقت مفعل)
                  </Button>
                </Link>
              </Card>
            )}
          </div>

          <div className="lg:col-span-1">
            <Card className="bg-card border-primary/10 overflow-hidden">
              <CardHeader className="border-b bg-secondary/5"><CardTitle className="text-xl">محتوى الكورس</CardTitle></CardHeader>
              <CardContent className="p-0 max-h-[600px] overflow-y-auto">
                {contents?.map((item, idx) => {
                  const watched = watchedVideos?.some(v => v.courseContentId === item.id);
                  return (
                    <button 
                      key={item.id}
                      onClick={() => setActiveContent(item)}
                      className={`w-full p-4 text-right flex items-center gap-3 transition-all ${currentItem?.id === item.id ? 'bg-primary/10 border-r-4 border-primary' : 'hover:bg-secondary/10'}`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-bold ${watched ? 'bg-accent text-white' : 'bg-secondary'}`}>
                        {watched ? '✓' : idx + 1}
                      </div>
                      <div className="flex-grow min-w-0">
                        <p className="font-bold text-sm truncate">{item.title}</p>
                        <span className="text-[10px] text-muted-foreground">{item.contentType === 'Video' ? 'فيديو' : 'امتحان'}</span>
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
  return (match && match[2].length === 11) ? match[2] : url;
}
