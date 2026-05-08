
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
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  ShieldCheck,
  Zap,
  EyeOff,
  Gauge,
  Monitor,
  FastForward,
  Rewind,
  Settings,
  User as UserIcon
} from 'lucide-react';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import Link from 'next/link';

/**
 * @fileOverview مشغل النخبة (Al-Bashmohandes Elite Player)
 * النسخة الاحترافية المحدثة - V1.0
 */

export default function CourseViewer() {
  const { id } = useParams();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [activeContent, setActiveContent] = useState<any>(null);
  const [isVideoBlocked, setIsVideoBlocked] = useState(false);
  const [origin, setOrigin] = useState('');
  const [watermarkPos, setWatermarkPos] = useState({ top: '10%', left: '10%' });

  // مراجع المشغل
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<HTMLIFrameElement>(null);
  
  // حالة المشغل
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

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

  // علامة مائية متحركة لحماية المحتوى
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      const top = Math.floor(Math.random() * 80) + 10;
      const left = Math.floor(Math.random() * 80) + 10;
      setWatermarkPos({ top: `${top}%`, left: `${left}%` });
    }, 8000);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // حماية الفيديوهات عند الخروج من الصفحة
  useEffect(() => {
    const handleBlur = () => setIsVideoBlocked(true);
    const handleFocus = () => setTimeout(() => setIsVideoBlocked(false), 500);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // وظيفة إرسال الأوامر ليوتيوب
  const sendCommand = useCallback((func: string, args: any[] = []) => {
    if (playerRef.current?.contentWindow) {
      playerRef.current.contentWindow.postMessage(JSON.stringify({ 
        event: 'command', 
        func, 
        args 
      }), '*');
    }
  }, []);

  const togglePlay = () => {
    if (isPlaying) {
      sendCommand('pauseVideo');
      setIsPlaying(false);
    } else {
      sendCommand('playVideo');
      setIsPlaying(true);
    }
  };

  const skipSeconds = (seconds: number) => {
    const target = currentTime + seconds;
    sendCommand('seekTo', [target, true]);
    setCurrentTime(target);
  };

  // اختصارات لوحة المفاتيح الاحترافية
  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'arrowright':
        case 'l':
          e.preventDefault();
          skipSeconds(10);
          break;
        case 'arrowleft':
        case 'j':
          e.preventDefault();
          skipSeconds(-10);
          break;
        case 'f':
          e.preventDefault();
          toggleFullScreen();
          break;
        case 'm':
          e.preventDefault();
          if(isMuted) { sendCommand('unMute'); setIsMuted(false); }
          else { sendCommand('mute'); setIsMuted(true); }
          break;
      }
    };
    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, [isPlaying, currentTime, isMuted, sendCommand]);

  const handleSeek = (value: number[]) => {
    if (!duration || duration <= 0) return;
    setIsDragging(true);
    const targetPercent = value[0];
    const seekTo = (targetPercent / 100) * duration;
    setCurrentTime(seekTo);
    sendCommand('seekTo', [seekTo, true]);
    setTimeout(() => setIsDragging(false), 200);
  };

  const changeSpeed = (rate: number) => {
    setPlaybackRate(rate);
    sendCommand('setPlaybackRate', [rate]);
    setShowSpeedMenu(false);
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      playerContainerRef.current?.requestFullscreen().catch(e => console.error(e));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // محرك المزامنة النووي (Atomic Sync Engine V12)
  useEffect(() => {
    if (!activeContent || !origin) return;

    // استجواب نشط عالي التردد (كل 200 ملي ثانية)
    const syncTimer = setInterval(() => {
      sendCommand('listening');
      // طلب الوقت والمدة بشكل صريح لضمان عدم توقف العداد
      sendCommand('getCurrentTime');
      sendCommand('getDuration');
    }, 200);

    const handleMessage = (event: MessageEvent) => {
      if (!event.origin.includes('youtube.com')) return;

      try {
        const data = JSON.parse(event.data);
        
        // التقاط بيانات المزامنة الحقيقية
        if (data.event === 'infoDelivery' && data.info) {
          const info = data.info;
          if (info.duration !== undefined && info.duration > 0) setDuration(info.duration);
          if (info.currentTime !== undefined && !isDragging) setCurrentTime(info.currentTime);
          if (info.playerState !== undefined) setIsPlaying(info.playerState === 1);
        }
        
        // دعم الاستدعاء اليدوي للوظائف (Legacy Fallback)
        if (data.event === 'onStateChange') setIsPlaying(data.info === 1);
      } catch (e) {}
    };

    window.addEventListener('message', handleMessage);
    return () => {
      clearInterval(syncTimer);
      window.removeEventListener('message', handleMessage);
    };
  }, [activeContent, isDragging, origin, sendCommand]);

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // تفعيل الكورسات المجانية تلقائياً
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
    const videoLogRef = doc(firestore, 'students', user.uid, 'video_progress', contentId);
    await setDoc(videoLogRef, { 
      studentId: user.uid, 
      studentName: studentProfile.name, 
      courseId: id, 
      courseContentId: contentId, 
      isCompleted: true, 
      watchedDurationInSeconds: duration || 600, 
      lastWatchedAt: serverTimestamp() 
    }, { merge: true });
    
    const allWatchedRef = query(collection(firestore, 'students', user.uid, 'video_progress'), where('courseId', '==', id));
    const watchedSnap = await getDocs(allWatchedRef);
    const newPercent = Math.min(100, Math.round((watchedSnap.size / (visibleContents.length || 1)) * 100));

    await updateDoc(doc(firestore, 'students', user.uid, 'enrollments', id as string), { 
      progressPercentage: newPercent, 
      studentName: studentProfile.name, 
      lastActivityDate: new Date().toISOString() 
    });
    toast({ title: "عاش يا بشمهندس!", description: `وصلت لنسبة إنجاز ${newPercent}% في هذا الكورس.` });
  };

  useEffect(() => { 
    if (visibleContents.length > 0 && !activeContent) {
      setActiveContent(visibleContents[0]);
    }
  }, [visibleContents, activeContent]);

  if (isUserLoading || isCourseLoading || isEnrollmentLoading || isContentLoading) return <div className="flex justify-center py-40"><Loader2 className="w-12 animate-spin text-primary" /></div>;

  const hasAccess = (enrollment && enrollment.status === 'active') || isFree;
  if (!hasAccess) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center space-y-6 bg-background">
      <Lock className="w-16 h-16 text-primary/40 animate-pulse" />
      <h2 className="text-3xl font-black text-white">هذا الكورس يتطلب تفعيل</h2>
      <p className="text-muted-foreground max-w-sm">يرجى استخدام كود التفعيل الخاص بك للوصول إلى هذا المحتوى التعليمي.</p>
      <Link href="/student/redeem"><Button className="bg-primary h-14 px-10 rounded-2xl font-black shadow-lg">تفعيل الكود الآن</Button></Link>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background text-right">
      <Navbar />
      <main className="flex-grow pt-24 pb-20 container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {activeContent?.contentType === 'Video' ? (
              <div className="space-y-6 animate-in fade-in duration-700">
                
                {/* مشغل النخبة (Elite Player) */}
                <div 
                  ref={playerContainerRef} 
                  className={cn(
                    "relative bg-black overflow-hidden shadow-2xl transition-all duration-500 group select-none",
                    isFullscreen ? "fixed inset-0 w-full h-full z-[9999] rounded-none flex items-center justify-center bg-black" : "rounded-[3rem] border-[6px] border-card aspect-video"
                  )}
                  onContextMenu={e => e.preventDefault()}
                >
                    {/* طبقة حماية شفافة للخصوصية */}
                    <div className="absolute inset-0 z-40 bg-transparent" />
                    
                    {/* العلامة المائية العائمة (Anti-Piracy) */}
                    <div 
                      className="absolute z-[45] pointer-events-none transition-all duration-[3000ms] ease-in-out opacity-20 text-[10px] md:text-xs font-black text-white bg-black/40 px-3 py-1.5 rounded-full border border-white/10 whitespace-nowrap"
                      style={{ top: watermarkPos.top, left: watermarkPos.left }}
                    >
                      {studentProfile?.name} - {studentProfile?.studentPhoneNumber}
                    </div>

                    {/* حماية فقدان التركيز (Blur Protection) */}
                    {isVideoBlocked && (
                      <div className="absolute inset-0 z-[100] bg-black/95 backdrop-blur-[100px] flex flex-col items-center justify-center text-center p-8">
                         <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6 border border-primary/20">
                            <ShieldCheck className="w-12 h-12 text-primary animate-pulse" />
                         </div>
                         <h3 className="text-3xl font-black text-white">المحتوى محمي يا بشمهندس</h3>
                         <p className="text-primary font-bold mt-2 text-lg">يرجى العودة للصفحة لمتابعة الشرح بأمان.</p>
                      </div>
                    )}

                    {origin && (
                      <iframe 
                        ref={playerRef}
                        src={`https://www.youtube.com/embed/${getYouTubeId(activeContent.youtubeLink)}?enablejsapi=1&rel=0&modestbranding=1&controls=0&disablekb=1&fs=0&iv_load_policy=3&showinfo=0&vq=hd1080&widgetid=1&origin=${origin}`} 
                        className="w-full h-full relative z-10 pointer-events-none scale-[1.01]"
                        allow="autoplay; encrypted-media"
                      />
                    )}

                    {/* واجهة النخبة للتحكم الاحترافي */}
                    <div className="absolute bottom-0 left-0 right-0 z-[60] bg-gradient-to-t from-black via-black/90 to-transparent p-6 md:p-12 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                      <div className="space-y-8 pointer-events-auto">
                        
                        {/* شريط التقدم التفاعلي */}
                        <div className="flex flex-row-reverse items-center gap-6">
                           <span className="text-xs text-white/90 font-black min-w-[120px] text-left tabular-nums tracking-widest" dir="ltr">
                             {formatTime(currentTime)} / {formatTime(duration)}
                           </span>
                           <div className="flex-grow pt-2">
                             <Slider 
                              value={[duration > 0 ? (currentTime / duration) * 100 : 0]} 
                              max={100} 
                              step={0.01}
                              onValueChange={handleSeek}
                              className="cursor-pointer"
                             />
                           </div>
                        </div>
                        
                        {/* أزرار التحكم الرئيسية */}
                        <div className="flex items-center justify-between flex-row-reverse">
                          <div className="flex items-center gap-12 flex-row-reverse">
                            <button onClick={() => skipSeconds(-10)} className="text-white/60 hover:text-primary transition-all active:scale-90"><Rewind className="w-8 h-8" /></button>
                            <button onClick={togglePlay} className="text-white hover:text-primary transition-all active:scale-90 scale-125">
                              {isPlaying ? <Pause className="w-14 h-14 fill-current" /> : <Play className="w-14 h-14 fill-current" />}
                            </button>
                            <button onClick={() => skipSeconds(10)} className="text-white/60 hover:text-primary transition-all active:scale-90"><FastForward className="w-8 h-8" /></button>
                            
                            <div className="h-10 w-px bg-white/10 mx-4" />

                            <button onClick={() => {
                              if(isMuted) { sendCommand('unMute'); setIsMuted(false); }
                              else { sendCommand('mute'); setIsMuted(true); }
                            }} className="text-white hover:text-primary transition-all">
                              {isMuted ? <VolumeX className="w-8 h-8" /> : <Volume2 className="w-8 h-8" />}
                            </button>
                          </div>

                          <div className="flex items-center gap-8">
                             {/* قائمة السرعة الذكية */}
                             <div className="relative">
                                <button 
                                  onClick={() => setShowSpeedMenu(!showSpeedMenu)} 
                                  className="text-white/90 hover:text-primary flex items-center gap-3 text-xs font-black bg-white/5 px-6 py-3 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors"
                                >
                                  <Gauge className="w-4 h-4 text-primary" />
                                  <span>{playbackRate}x</span>
                                </button>
                                
                                {showSpeedMenu && (
                                  <div className="absolute bottom-full mb-4 right-0 bg-card/95 backdrop-blur-3xl border border-primary/30 rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[100] w-44 animate-in slide-in-from-bottom-4 duration-300">
                                     <div className="p-3 border-b border-white/5 text-center text-[10px] font-black text-primary uppercase">سرعة الشرح</div>
                                     {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                                       <button 
                                         key={rate} 
                                         onClick={() => changeSpeed(rate)}
                                         className={cn(
                                           "w-full text-right px-6 py-4 text-xs font-black hover:bg-primary hover:text-primary-foreground transition-all flex items-center justify-between flex-row-reverse",
                                           playbackRate === rate ? "bg-primary/20 text-primary" : "text-white/70"
                                         )}
                                       >
                                         <span>{rate}x</span>
                                         {playbackRate === rate && <CheckCircle className="w-3 h-3" />}
                                       </button>
                                     ))}
                                  </div>
                                )}
                             </div>

                             <button onClick={toggleFullScreen} className="text-white/60 hover:text-primary transition-all p-2 scale-110">
                                <Maximize className="w-8 h-8" />
                             </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* شعار الحماية المطور */}
                    <div className="absolute top-8 left-10 z-40 bg-black/40 backdrop-blur-2xl px-6 py-2.5 rounded-full text-[10px] font-black border border-white/10 flex items-center gap-3 text-white/90 pointer-events-none shadow-2xl">
                       <Zap className="w-4 h-4 text-primary animate-pulse" /> 
                       <span className="tracking-widest uppercase">Al-Bashmohandes Elite Secure</span>
                    </div>
                </div>

                <Card className="bg-card/50 backdrop-blur-2xl p-8 rounded-[3rem] border-primary/10 shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-2 h-full bg-primary transition-all group-hover:w-3" />
                  <div className="flex flex-col md:flex-row-reverse justify-between items-center gap-8">
                    <div className="text-right flex-grow space-y-2">
                      <div className="flex items-center gap-3 justify-end">
                        <h1 className="text-3xl font-black text-primary">{activeContent.title}</h1>
                        <div className="bg-primary/10 text-primary p-2 rounded-xl border border-primary/20">
                          <Settings className="w-5 h-5" />
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground font-bold flex items-center gap-2 justify-end opacity-60">
                        <Clock className="w-4 h-4" /> تم النشر: {activeContent.createdAt?.seconds ? new Date(activeContent.createdAt.seconds * 1000).toLocaleDateString('ar-EG') : 'الآن'}
                      </p>
                    </div>
                    <Button 
                      onClick={() => markAsWatched(activeContent.id)} 
                      disabled={watchedVideos?.some(v => v.courseContentId === activeContent.id)} 
                      className="h-16 px-12 rounded-[1.5rem] font-black bg-primary text-primary-foreground shadow-2xl shadow-primary/20 hover:scale-105 transition-transform disabled:opacity-80"
                    >
                      {watchedVideos?.some(v => v.courseContentId === activeContent.id) ? (
                        <span className="flex items-center gap-2 text-lg"><CheckCircle className="w-6 h-6" /> تم تأكيد الحضور ✓</span>
                      ) : "تأكيد حضور الحصة الآن"}
                    </Button>
                  </div>
                </Card>
              </div>
            ) : activeContent ? (
              <Card className="bg-gradient-to-br from-primary/10 via-card to-background border-[4px] border-dashed border-primary/20 p-24 text-center space-y-10 rounded-[4rem] shadow-2xl animate-in zoom-in-95 duration-700 relative overflow-hidden">
                  <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-[100px]" />
                  <div className="w-28 h-28 bg-primary/20 rounded-[2.5rem] flex items-center justify-center mx-auto text-primary border border-primary/30 shadow-xl">
                    <FileQuestion className="w-14 h-14" />
                  </div>
                  <div className="space-y-4">
                    <h2 className="text-5xl font-black text-white tracking-tight">{activeContent.title}</h2>
                    <p className="text-muted-foreground font-bold text-xl italic opacity-70">الاختبار جاهز لتقييم مستواك يا بشمهندس.</p>
                  </div>
                  <Link href={`/student/exams/${activeContent.id}`} className="block pt-8">
                    <Button size="lg" className="h-24 px-32 bg-primary text-primary-foreground font-black rounded-[2rem] text-3xl shadow-[0_20px_50px_rgba(255,215,0,0.2)] hover:scale-105 active:scale-95 transition-all">
                      ابدأ الاختبار الآن ✍️
                    </Button>
                  </Link>
              </Card>
            ) : null}
          </div>

          <div className="lg:col-span-1">
            <Card className="bg-card/40 backdrop-blur-3xl border-primary/10 overflow-hidden shadow-2xl rounded-[3rem] sticky top-24 border-t-8 border-t-primary">
              <CardHeader className="border-b bg-secondary/30 py-8 px-10 flex flex-row-reverse items-center justify-between">
                <CardTitle className="text-2xl font-black flex items-center gap-4 justify-end text-primary">
                  محتويات الكورس <Monitor className="w-7 h-7" />
                </CardTitle>
                <div className="bg-primary/20 text-primary px-4 py-1.5 rounded-full font-black text-sm border border-primary/20">
                  {enrollment?.progressPercentage || 0}%
                </div>
              </CardHeader>
              <CardContent className="p-0 max-h-[60vh] overflow-y-auto custom-scrollbar">
                {visibleContents.length === 0 ? (
                   <div className="p-12 text-center text-muted-foreground italic opacity-50">لا يوجد محتوى متاح حالياً.</div>
                ) : visibleContents.map((item, idx) => (
                  <button 
                    key={item.id} 
                    onClick={() => setActiveContent(item)} 
                    className={cn(
                      "w-full p-8 text-right flex flex-row-reverse items-center gap-6 transition-all border-b border-white/5 group relative", 
                      activeContent?.id === item.id ? "bg-primary/10" : "hover:bg-white/5"
                    )}
                  >
                    {activeContent?.id === item.id && <div className="absolute right-0 top-0 w-1.5 h-full bg-primary" />}
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 font-black text-sm transition-all shadow-lg", 
                      watchedVideos?.some(v => v.courseContentId === item.id) ? "bg-accent text-white" : "bg-secondary group-hover:bg-primary group-hover:text-primary-foreground"
                    )}>
                      {watchedVideos?.some(v => v.courseContentId === item.id) ? <CheckCircle className="w-6 h-6" /> : idx+1}
                    </div>
                    <div className="min-w-0 text-right">
                      <p className={cn("font-black text-lg truncate mb-1", activeContent?.id === item.id ? "text-primary" : "text-white/90")}>
                        {item.title}
                      </p>
                      <div className="flex flex-row-reverse items-center gap-2 opacity-50">
                        <span className="text-[10px] font-black uppercase tracking-tighter">
                          {item.contentType === 'Video' ? 'شرح فيديو مؤمن' : 'اختبار إلكتروني'}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,215,0,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,215,0,0.3); }
      `}</style>
    </div>
  );
}

function getYouTubeId(url: string) {
  if (!url) return '';
  const match = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/);
  return (match && match[2] && match[2].length === 11) ? match[2] : url;
}
