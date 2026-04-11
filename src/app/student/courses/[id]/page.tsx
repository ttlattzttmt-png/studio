
"use client";

import { useParams, useRouter } from 'next/navigation';
import { Navbar } from '@/components/ui/navbar';
import { Footer } from '@/components/ui/footer';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, orderBy } from 'firebase/firestore';
import { Loader2, PlayCircle, BookOpen, Clock, ChevronRight, Lock, FileQuestion, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function CourseViewer() {
  const { id } = useParams();
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [activeContent, setActiveContent] = useState<any>(null);

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

  // جلب المحتوى (فيديوهات وامتحانات)
  const contentRef = useMemoFirebase(() => {
    if (!firestore || !id) return null;
    return query(collection(firestore, 'courses', id as string, 'content'), orderBy('orderIndex', 'asc'));
  }, [firestore, id]);

  const { data: contents, isLoading: isContentLoading } = useCollection(contentRef);

  if (isUserLoading || isChecking || isContentLoading) return <div className="flex justify-center py-40"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;

  // التحقق من حالة الاشتراك
  if (!enrollment || enrollment.status !== 'active') {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-grow flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-8 text-center space-y-6 border-destructive/20 bg-destructive/5">
            <Lock className="w-16 h-16 mx-auto text-destructive opacity-50" />
            <h2 className="text-2xl font-bold">وصول غير مسموح</h2>
            <p className="text-muted-foreground">هذا الكورس قيد الانتظار أو لم تشترك به بعد. يرجى مراجعة الإدارة.</p>
            <Button onClick={() => router.push('/courses')} className="w-full bg-primary font-bold">استكشف الكورسات</Button>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  const currentItem = activeContent || contents?.[0];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-grow pt-24 pb-20 container mx-auto px-4">
        <div className="flex items-center gap-2 mb-8 text-sm text-muted-foreground">
          <Link href="/student" className="hover:text-primary">لوحة الطالب</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-foreground font-bold">{course?.title}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* مشغل المحتوى */}
          <div className="lg:col-span-2 space-y-6">
            {currentItem?.contentType === 'Video' ? (
              <div className="aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl relative">
                 <iframe 
                  src={`https://www.youtube.com/embed/${getYouTubeId(currentItem.youtubeLink)}`}
                  className="w-full h-full"
                  allowFullScreen
                />
              </div>
            ) : currentItem?.contentType === 'Quiz' || currentItem?.contentType === 'Exam' ? (
              <Card className="bg-primary/5 border-2 border-dashed border-primary/20 p-12 text-center space-y-6 rounded-[2rem]">
                <FileQuestion className="w-20 h-20 mx-auto text-primary" />
                <h2 className="text-3xl font-bold">{currentItem.title}</h2>
                <p className="text-muted-foreground max-w-md mx-auto">{currentItem.description || 'هذا امتحان لتقييم مستواك في هذا الجزء من الكورس.'}</p>
                <Link href={`/student/exams/${currentItem.id}`}>
                  <Button size="lg" className="h-16 px-12 bg-primary text-primary-foreground font-bold rounded-2xl text-xl shadow-xl shadow-primary/20">
                    <ExternalLink className="w-5 h-5 ml-2" /> ابدأ الامتحان الآن
                  </Button>
                </Link>
              </Card>
            ) : (
              <div className="aspect-video bg-secondary/20 rounded-3xl flex items-center justify-center border-2 border-dashed">
                <p className="text-muted-foreground">لا يوجد محتوى لعرضه حالياً.</p>
              </div>
            )}
            
            <div className="bg-card p-8 rounded-3xl border border-primary/5">
              <h1 className="text-3xl font-bold mb-4">{currentItem?.title || course?.title}</h1>
              <p className="text-muted-foreground leading-relaxed">{currentItem?.description || course?.description}</p>
            </div>
          </div>

          {/* قائمة الدروس والامتحانات */}
          <div className="lg:col-span-1">
            <Card className="bg-card border-primary/10 h-full overflow-hidden">
              <CardHeader className="border-b bg-secondary/5">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <BookOpen className="w-5 h-5 text-primary" /> قائمة المحتوى
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-y-auto max-h-[600px]">
                {!contents || contents.length === 0 ? (
                  <p className="p-8 text-center text-muted-foreground italic">قريباً...</p>
                ) : (
                  <div className="divide-y">
                    {contents.map((item, idx) => (
                      <button 
                        key={item.id}
                        onClick={() => setActiveContent(item)}
                        className={`w-full p-5 text-right flex items-center gap-4 transition-all ${currentItem?.id === item.id ? 'bg-primary/10 border-r-4 border-primary' : 'hover:bg-secondary/10'}`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold ${currentItem?.id === item.id ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
                          {idx + 1}
                        </div>
                        <div className="flex-grow min-w-0">
                          <p className={`font-bold text-sm truncate ${currentItem?.id === item.id ? 'text-primary' : ''}`}>{item.title}</p>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            {item.contentType === 'Video' ? <PlayCircle className="w-3 h-3" /> : <FileQuestion className="w-3 h-3" />}
                            {item.contentType === 'Video' ? 'فيديو شرح' : 'امتحان تقييمي'}
                          </span>
                        </div>
                        {item.contentType === 'Video' ? (
                          <PlayCircle className={`w-5 h-5 ${currentItem?.id === item.id ? 'text-primary' : 'text-muted-foreground'}`} />
                        ) : (
                          <FileQuestion className={`w-5 h-5 ${currentItem?.id === item.id ? 'text-primary' : 'text-muted-foreground'}`} />
                        )}
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
  if (!url) return '';
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : url;
}
