
"use client";

import { useParams, useRouter } from 'next/navigation';
import { Navbar } from '@/components/ui/navbar';
import { Footer } from '@/components/ui/footer';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, orderBy, setDoc, serverTimestamp } from 'firebase/firestore';
import { Loader2, PlayCircle, CheckCircle, FileQuestion, BookOpen } from 'lucide-react';
import { useState, useEffect } from 'react';
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const enrollmentRef = useMemoFirebase(() => {
    if (!firestore || !user || !id) return null;
    return doc(firestore, 'students', user.uid, 'enrollments', id as string);
  }, [firestore, user, id]);

  const { data: enrollment, isLoading: isChecking } = useDoc(enrollmentRef);
  
  const contentRef = useMemoFirebase(() => {
    if (!firestore || !id) return null;
    return query(collection(firestore, 'courses', id as string, 'content'), orderBy('orderIndex', 'asc'));
  }, [firestore, id]);

  const { data: contents, isLoading: isContentLoading } = useCollection(contentRef);

  const progressRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'students', user.uid, 'video_progress');
  }, [firestore, user]);
  
  const { data: watchedVideos } = useCollection(progressRef);

  useEffect(() => {
    if (contents && contents.length > 0 && !activeContent) {
      setActiveContent(contents[0]);
    }
  }, [contents, activeContent]);

  const markAsWatched = async (contentId: string) => {
    if (!firestore || !user) return;
    try {
      await setDoc(doc(firestore, 'students', user.uid, 'video_progress', contentId), {
        studentId: user.uid,
        courseContentId: contentId,
        isCompleted: true,
        lastWatchedAt: serverTimestamp()
      });
      toast({ title: "تم تسجيل التقدم", description: "أحسنت! استمر في التعلم للوصول للقمة." });
    } catch (e) { 
      console.error(e);
      toast({ variant: "destructive", title: "خطأ في تسجيل التقدم" });
    }
  };

  if (!mounted || isUserLoading || isChecking || isContentLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="text-muted-foreground font-bold animate-pulse">جاري تحميل محتوى الكورس...</p>
      </div>
    );
  }

  if (!enrollment || enrollment.status !== 'active') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center space-y-6">
        <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center text-destructive">
          <BookOpen className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold">عذراً، هذا الكورس غير مفعل لك حالياً</h2>
        <p className="text-muted-foreground max-w-md">يرجى التأكد من طلب الانضمام وموافقة البشمهندس على طلبك أولاً.</p>
        <Button onClick={() => router.replace('/courses')} variant="outline">العودة للمكتبة</Button>
      </div>
    );
  }

  const currentItem = activeContent;
  const isWatched = currentItem && watchedVideos?.some(v => v.courseContentId === currentItem.id);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-grow pt-24 pb-20 container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {currentItem?.contentType === 'Video' ? (
              <div className="space-y-4 animate-in fade-in duration-500">
                <div className="aspect-video bg-black rounded-[2rem] overflow-hidden shadow-2xl border-4 border-primary/5">
                   <iframe 
                    src={`https://www.youtube.com/embed/${getYouTubeId(currentItem.youtubeLink)}`} 
                    className="w-full h-full" 
                    allowFullScreen 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                   />
                </div>
                <Card className="bg-card p-8 rounded-[2rem] border-primary/10 shadow-lg">
                  <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="text-right w-full">
                      <h1 className="text-2xl font-bold mb-2">{currentItem.title}</h1>
                      <p className="text-muted-foreground text-sm">{currentItem.description || 'شرح وافي لهذا الدرس مخصص لطلاب البشمهندس.'}</p>
                    </div>
                    <Button 
                      onClick={() => markAsWatched(currentItem.id)} 
                      disabled={isWatched}
                      className={cn(
                        "h-14 px-8 font-bold rounded-xl text-lg shrink-0",
                        isWatched ? "bg-accent text-white opacity-100" : "bg-primary text-primary-foreground shadow-xl shadow-primary/20"
                      )}
                    >
                      {isWatched ? <><CheckCircle className="w-5 h-5 ml-2" /> أكملت الدرس</> : "تعليم كـ مكتمل"}
                    </Button>
                  </div>
                </Card>
              </div>
            ) : (
              <Card className="bg-primary/5 border-2 border-dashed border-primary/20 p-20 text-center space-y-8 rounded-[3rem] animate-in zoom-in-95 duration-500">
                <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
                  <FileQuestion className="w-12 h-12" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-4xl font-headline font-bold">{currentItem?.title}</h2>
                  <p className="text-muted-foreground">امتحان شامل على الدروس السابقة لقياس مستواك.</p>
                </div>
                <Link href={`/student/exams/${currentItem?.id}`}>
                  <Button size="lg" className="h-16 px-12 bg-primary text-primary-foreground font-bold rounded-2xl text-xl shadow-2xl shadow-primary/30">
                    ابدأ الامتحان الآن
                  </Button>
                </Link>
              </Card>
            )}
          </div>

          <div className="lg:col-span-1">
            <Card className="bg-card border-primary/10 overflow-hidden shadow-xl rounded-[2rem] sticky top-24">
              <CardHeader className="border-b bg-secondary/5 py-6">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <PlayCircle className="w-5 h-5 text-primary" /> محتوى الكورس
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 max-h-[60vh] overflow-y-auto">
                {contents?.map((item, idx) => {
                  const watched = watchedVideos?.some(v => v.courseContentId === item.id);
                  const isActive = currentItem?.id === item.id;
                  return (
                    <button 
                      key={item.id}
                      onClick={() => setActiveContent(item)}
                      className={cn(
                        "w-full p-5 text-right flex items-center gap-4 transition-all border-b last:border-0",
                        isActive ? "bg-primary/10 border-r-4 border-primary" : "hover:bg-secondary/10"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm",
                        watched ? "bg-accent text-white" : isActive ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                      )}>
                        {watched ? <CheckCircle className="w-5 h-5" /> : idx + 1}
                      </div>
                      <div className="flex-grow min-w-0">
                        <p className={cn("font-bold text-sm truncate", isActive ? "text-primary" : "text-foreground")}>
                          {item.title}
                        </p>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                          {item.contentType === 'Video' ? 'درس مرئي' : 'اختبار تقييمي'}
                        </span>
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
