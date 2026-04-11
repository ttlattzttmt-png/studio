
"use client";

import { useParams, useRouter } from 'next/navigation';
import { Navbar } from '@/components/ui/navbar';
import { Footer } from '@/components/ui/footer';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, orderBy } from 'firebase/firestore';
import { Loader2, PlayCircle, BookOpen, Clock, ChevronRight, Lock } from 'lucide-react';
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function CourseViewer() {
  const { id } = useParams();
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [activeVideo, setActiveVideo] = useState<any>(null);

  // التأكد من أن الطالب مفعل في هذا الكورس
  const enrollmentRef = useMemoFirebase(() => {
    if (!firestore || !user || !id) return null;
    return doc(firestore, 'students', user.uid, 'enrollments', id as string);
  }, [firestore, user, id]);

  const { data: enrollment, isLoading: isChecking } = useDoc(enrollmentRef);

  // جلب بيانات الكورس
  const courseRef = useMemoFirebase(() => {
    if (!firestore || !id) return null;
    return doc(firestore, 'courses', id as string);
  }, [firestore, id]);
  
  const { data: course } = useDoc(courseRef);

  // جلب المحتوى (الفيديوهات)
  const contentRef = useMemoFirebase(() => {
    if (!firestore || !id) return null;
    return query(collection(firestore, 'courses', id as string, 'content'), orderBy('orderIndex', 'asc'));
  }, [firestore, id]);

  const { data: contents } = useCollection(contentRef);

  if (isUserLoading || isChecking) return <div className="flex justify-center py-40"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;

  // إذا لم يكن هناك اشتراك أو الاشتراك غير مفعل، ارجع لمكتبة الكورسات
  if (!enrollment || enrollment.status !== 'active') {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-grow flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-8 text-center space-y-6 border-destructive/20 bg-destructive/5">
            <Lock className="w-16 h-16 mx-auto text-destructive opacity-50" />
            <h2 className="text-2xl font-bold">وصول غير مسموح</h2>
            <p className="text-muted-foreground">يجب أن تكون مشتركاً في هذا الكورس لتتمكن من مشاهدة محتواه.</p>
            <Button onClick={() => router.push('/courses')} className="w-full bg-primary font-bold">استكشف الكورسات واشترك الآن</Button>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  const videos = contents?.filter(c => c.contentType === 'Video') || [];
  const currentVideo = activeVideo || videos[0];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-grow pt-24 pb-20 container mx-auto px-4">
        <div className="flex items-center gap-2 mb-8 text-sm text-muted-foreground">
          <Link href="/student/dashboard" className="hover:text-primary">لوحة الطالب</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-foreground font-bold">{course?.title}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* مشغل الفيديو */}
          <div className="lg:col-span-2 space-y-6">
            {currentVideo ? (
              <div className="aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl relative">
                 <iframe 
                  src={`https://www.youtube.com/embed/${getYouTubeId(currentVideo.youtubeLink)}`}
                  className="w-full h-full"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="aspect-video bg-secondary/20 rounded-3xl flex items-center justify-center border-2 border-dashed">
                <p className="text-muted-foreground">لا توجد فيديوهات في هذا الكورس بعد.</p>
              </div>
            )}
            
            <div className="bg-card p-8 rounded-3xl border border-primary/5">
              <h1 className="text-3xl font-bold mb-4">{currentVideo?.title || course?.title}</h1>
              <p className="text-muted-foreground leading-relaxed">{course?.description}</p>
            </div>
          </div>

          {/* قائمة الدروس */}
          <div className="lg:col-span-1">
            <Card className="bg-card border-primary/10 h-full">
              <CardHeader className="border-b bg-secondary/5">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <BookOpen className="w-5 h-5 text-primary" /> محتوى الكورس
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-y-auto max-h-[600px]">
                {videos.length === 0 ? (
                  <p className="p-8 text-center text-muted-foreground italic">قريباً...</p>
                ) : (
                  <div className="divide-y">
                    {videos.map((vid, idx) => (
                      <button 
                        key={vid.id}
                        onClick={() => setActiveVideo(vid)}
                        className={`w-full p-4 text-right flex items-center gap-3 transition-colors ${currentVideo?.id === vid.id ? 'bg-primary/10 border-r-4 border-primary' : 'hover:bg-secondary/10'}`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${currentVideo?.id === vid.id ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
                          {idx + 1}
                        </div>
                        <div className="flex-grow min-w-0">
                          <p className={`font-bold text-sm truncate ${currentVideo?.id === vid.id ? 'text-primary' : ''}`}>{vid.title}</p>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> 15:00</span>
                        </div>
                        <PlayCircle className={`w-5 h-5 ${currentVideo?.id === vid.id ? 'text-primary' : 'text-muted-foreground'}`} />
                      </button>
                    ))}
                  </div>
                )}
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
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url?.match(regExp);
  return (match && match[2].length === 11) ? match[2] : url;
}

import Link from 'next/link';
