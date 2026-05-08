
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
  Clock,
  Monitor
} from 'lucide-react';
import { useState, useEffect, useMemo, forwardRef, isValidElement, type ReactNode, type CSSProperties, type ComponentProps } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button as ShadButton } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import Link from 'next/link';

// Video.js React Imports
import { createPlayer, Poster, Container, usePlayer, BufferingIndicator, CaptionsButton, CastButton, Controls, ErrorDialog, FullscreenButton, Gesture, Hotkey, MuteButton, PiPButton, PlayButton, PlaybackRateButton, Popover, SeekButton, Slider, Time, TimeSlider, Tooltip, VolumeSlider, type RenderProp } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';
import './player.css';

// ================================================================
// Player Implementation (User Provided Code)
// ================================================================

const SEEK_TIME = 10;
export const Player = createPlayer({ features: videoFeatures });

export interface VideoPlayerProps {
  src: string;
  style?: CSSProperties;
  className?: string;
  poster?: string | RenderProp<Poster.State> | undefined;
}

export function VideoPlayer({ src, className, poster, ...rest }: VideoPlayerProps): ReactNode {
  return (
    <Player.Provider>
      <Container className={`media-default-skin media-default-skin--video ${className ?? ''}`} {...rest}>
        <Video src={src} playsInline />

        {poster && (
          <Poster src={isString(poster) ? poster : undefined} render={isRenderProp(poster) ? poster : undefined} />
        )}

        <BufferingIndicator
          render={(props) => (
            <div {...props} className="media-buffering-indicator">
              <div className="media-surface">
                <SpinnerIcon className="media-icon" />
              </div>
            </div>
          )}
        />

        <ErrorDialog.Root>
          <ErrorDialog.Popup className="media-error">
            <div className="media-error__dialog media-surface">
              <div className="media-error__content">
                <ErrorDialog.Title className="media-error__title">حدث خطأ ما.</ErrorDialog.Title>
                <ErrorDialog.Description className="media-error__description" />
              </div>
              <div className="media-error__actions">
                <ErrorDialog.Close className="media-button media-button--primary">حسناً</ErrorDialog.Close>
              </div>
            </div>
          </ErrorDialog.Popup>
        </ErrorDialog.Root>

        <Controls.Root className="media-surface media-controls">
          <Tooltip.Provider>
            <div className="media-button-group">
              <Tooltip.Root side="top">
                <Tooltip.Trigger
                  render={
                    <PlayButton className="media-button--play" render={<Button />}>
                      <RestartIcon className="media-icon media-icon--restart" />
                      <PlayIcon className="media-icon media-icon--play" />
                      <PauseIcon className="media-icon media-icon--pause" />
                    </PlayButton>
                  }
                />
                <Tooltip.Popup className="media-surface media-tooltip" />
              </Tooltip.Root>

              <Tooltip.Root side="top">
                <Tooltip.Trigger
                  render={
                    <SeekButton seconds={-SEEK_TIME} className="media-button--seek" render={<Button />}>
                      <span className="media-icon__container">
                        <SeekIcon className="media-icon media-icon--seek media-icon--flipped" />
                        <span className="media-icon__label">{SEEK_TIME}</span>
                      </span>
                    </SeekButton>
                  }
                />
                <Tooltip.Popup className="media-surface media-tooltip">رجوع {SEEK_TIME} ثوانٍ</Tooltip.Popup>
              </Tooltip.Root>

              <Tooltip.Root side="top">
                <Tooltip.Trigger
                  render={
                    <SeekButton seconds={SEEK_TIME} className="media-button--seek" render={<Button />}>
                      <span className="media-icon__container">
                        <SeekIcon className="media-icon media-icon--seek" />
                        <span className="media-icon__label">{SEEK_TIME}</span>
                      </span>
                    </SeekButton>
                  }
                />
                <Tooltip.Popup className="media-surface media-tooltip">تقديم {SEEK_TIME} ثوانٍ</Tooltip.Popup>
              </Tooltip.Root>
            </div>

            <div className="media-time-controls">
              <Time.Value type="current" className="media-time" />
              <TimeSlider.Root className="media-slider">
                <TimeSlider.Track className="media-slider__track">
                  <TimeSlider.Fill className="media-slider__fill" />
                  <TimeSlider.Buffer className="media-slider__buffer" />
                </TimeSlider.Track>
                <TimeSlider.Thumb className="media-slider__thumb" />

                <div className="media-surface media-preview media-slider__preview">
                  <Slider.Thumbnail className="media-preview__thumbnail" />
                  <TimeSlider.Value type="pointer" className="media-time media-preview__time" />
                  <SpinnerIcon className="media-preview__spinner media-icon" />
                </div>
              </TimeSlider.Root>
              <Time.Value type="duration" className="media-time" />
            </div>

            <div className="media-button-group">
              <Tooltip.Root side="top">
                <Tooltip.Trigger
                  render={<PlaybackRateButton className="media-button--playback-rate" render={<Button />} />}
                />
                <Tooltip.Popup className="media-surface media-tooltip">سرعة التشغيل</Tooltip.Popup>
              </Tooltip.Root>

              <VolumePopover />

              <Tooltip.Root side="top">
                <Tooltip.Trigger
                  render={
                    <FullscreenButton className="media-button--fullscreen" render={<Button />}>
                      <FullscreenEnterIcon className="media-icon media-icon--fullscreen-enter" />
                      <FullscreenExitIcon className="media-icon media-icon--fullscreen-exit" />
                    </FullscreenButton>
                  }
                />
                <Tooltip.Popup className="media-surface media-tooltip" />
              </Tooltip.Root>
            </div>
          </Tooltip.Provider>
        </Controls.Root>

        <div className="media-overlay" />

        {/* Hotkeys */}
        <Hotkey keys="Space" action="togglePaused" />
        <Hotkey keys="k" action="togglePaused" />
        <Hotkey keys="m" action="toggleMuted" />
        <Hotkey keys="f" action="toggleFullscreen" />
        <Hotkey keys="ArrowRight" action="seekStep" value={5} />
        <Hotkey keys="ArrowLeft" action="seekStep" value={-5} />

        {/* Gestures */}
        <Gesture type="tap" action="togglePaused" pointer="mouse" region="center" />
        <Gesture type="tap" action="toggleControls" pointer="touch" />
        <Gesture type="doubletap" action="seekStep" value={-10} region="left" />
        <Gesture type="doubletap" action="toggleFullscreen" region="center" />
        <Gesture type="doubletap" action="seekStep" value={10} region="right" />
      </Container>
    </Player.Provider>
  );
}

// ================================================================
// Internal Components
// ================================================================

const Button = forwardRef<HTMLButtonElement, ComponentProps<'button'>>(function Button({ className, ...props }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      className={`media-button media-button--subtle media-button--icon ${className ?? ''}`}
      {...props}
    />
  );
});

function VolumePopover(): ReactNode {
  const volumeUnsupported = usePlayer((s) => s.volumeAvailability === 'unsupported');

  const muteButton = (
    <MuteButton className="media-button--mute" render={<Button />}>
      <VolumeOffIcon className="media-icon media-icon--volume-off" />
      <VolumeLowIcon className="media-icon media-icon--volume-low" />
      <VolumeHighIcon className="media-icon media-icon--volume-high" />
    </MuteButton>
  );

  if (volumeUnsupported) return muteButton;

  return (
    <Popover.Root openOnHover delay={200} closeDelay={100} side="top">
      <Popover.Trigger render={muteButton} />
      <Popover.Popup className="media-surface media-popover media-popover--volume">
        <VolumeSlider.Root className="media-slider" orientation="vertical" thumbAlignment="edge">
          <VolumeSlider.Track className="media-slider__track">
            <VolumeSlider.Fill className="media-slider__fill" />
          </VolumeSlider.Track>
          <VolumeSlider.Thumb className="media-slider__thumb media-slider__thumb--persistent" />
        </VolumeSlider.Root>
      </Popover.Popup>
    </Popover.Root>
  );
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isRenderProp(value: unknown): value is RenderProp<any> {
  return typeof value === 'function' || isValidElement(value);
}

// ================================================================
// Icons
// ================================================================

function FullscreenEnterIcon(props: ComponentProps<'svg'>): ReactNode {
  return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" aria-hidden="true" viewBox="0 0 18 18" {...props}><path fill="currentColor" d="M9.57 3.617A1 1 0 0 0 8.646 3H4c-.552 0-1 .449-1 1v4.646a.996.996 0 0 0 1.001 1 1 1 0 0 0 .706-.293l4.647-4.647a1 1 0 0 0 .216-1.089m4.812 4.812a1 1 0 0 0-1.089.217l-4.647 4.647a.998.998 0 0 0 .708 1.706H14c.552 0 1-.449 1-1V9.353a1 1 0 0 0-.618-.924"/></svg>;
}

function FullscreenExitIcon(props: ComponentProps<'svg'>): ReactNode {
  return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" aria-hidden="true" viewBox="0 0 18 18" {...props}><path fill="currentColor" d="M7.883 1.93a.99.99 0 0 0-1.09.217L2.146 6.793A.998.998 0 0 0 2.853 8.5H7.5c.551 0 1-.449 1-1V2.854a1 1 0 0 0-.617-.924m7.263 7.57H10.5c-.551 0-1 .449-1 1v4.646a.996.996 0 0 0 1.001 1.001 1 1 0 0 0 .706-.293l4.646-4.646a.998.998 0 0 0-.707-1.707z"/></svg>;
}

function PauseIcon(props: ComponentProps<'svg'>): ReactNode {
  return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" aria-hidden="true" viewBox="0 0 18 18" {...props}><rect width="5" height="14" x="2" y="2" fill="currentColor" rx="1.75"/><rect width="5" height="14" x="11" y="2" fill="currentColor" rx="1.75"/></svg>;
}

function PlayIcon(props: ComponentProps<'svg'>): ReactNode {
  return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" aria-hidden="true" viewBox="0 0 18 18" {...props}><path fill="currentColor" d="m14.051 10.723-7.985 4.964a1.98 1.98 0 0 1-2.758-.638A2.06 2.06 0 0 1 3 13.964V4.036C3 2.91 3.895 2 5 2c.377 0 .747.109 1.066.313l7.985 4.964a2.057 2.057 0 0 1 .627 2.808c-.16.257-.373.475-.627.637"/></svg>;
}

function RestartIcon(props: ComponentProps<'svg'>): ReactNode {
  return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" aria-hidden="true" viewBox="0 0 18 18" {...props}><path fill="currentColor" d="M9 17a8 8 0 0 1-8-8h2a6 6 0 1 0 1.287-3.713l1.286 1.286A.25.25 0 0 1 5.396 7H1.25A.25.25 0 0 1 1 6.75V2.604a.25.25 0 0 1 .427-.177l1.438 1.438A8 8 0 1 1 9 17"/><path fill="currentColor" d="m11.61 9.639-3.331 2.07a.826.826 0 0 1-1.15-.266.86.86 0 0 1-.129-.452V6.849C7 6.38 7.374 6 7.834 6c.158 0 .312.045.445.13l3.331 2.071a.858.858 0 0 1 0 1.438"/></svg>;
}

function SeekIcon(props: ComponentProps<'svg'>): ReactNode {
  return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" aria-hidden="true" viewBox="0 0 18 18" {...props}><path fill="currentColor" d="M1 9c0 2.21.895 4.21 2.343 5.657l1.414-1.414a6 6 0 1 1 8.956-7.956l-1.286 1.286a.25.25 0 0 0 .177.427h4.146a.25.25 0 0 0 .25-.25V2.604a.25.25 0 0 0-.427-.177l-1.438 1.438A8 8 0 0 0 1 9"/></svg>;
}

function SpinnerIcon(props: ComponentProps<'svg'>): ReactNode {
  return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" aria-hidden="true" viewBox="0 0 18 18" {...props}><rect width="2" height="5" x="8" y=".5" opacity=".5" rx="1"><animate attributeName="opacity" begin="0s" calcMode="linear" dur="1s" repeatCount="indefinite" values="1;0"/></rect><rect width="2" height="5" x="12.243" y="2.257" opacity=".45" rx="1" transform="rotate(45 13.243 4.757)"><animate attributeName="opacity" begin="0.125s" calcMode="linear" dur="1s" repeatCount="indefinite" values="1;0"/></rect><rect width="5" height="2" x="12.5" y="8" opacity=".4" rx="1"><animate attributeName="opacity" begin="0.25s" calcMode="linear" dur="1s" repeatCount="indefinite" values="1;0"/></rect><rect width="5" height="2" x="10.743" y="12.243" opacity=".35" rx="1" transform="rotate(45 13.243 13.243)"><animate attributeName="opacity" begin="0.375s" calcMode="linear" dur="1s" repeatCount="indefinite" values="1;0"/></rect><rect width="2" height="5" x="8" y="12.5" opacity=".3" rx="1"><animate attributeName="opacity" begin="0.5s" calcMode="linear" dur="1s" repeatCount="indefinite" values="1;0"/></rect><rect width="2" height="5" x="3.757" y="10.743" opacity=".25" rx="1" transform="rotate(45 4.757 13.243)"><animate attributeName="opacity" begin="0.625s" calcMode="linear" dur="1s" repeatCount="indefinite" values="1;0"/></rect><rect width="5" height="2" x=".5" y="8" opacity=".15" rx="1"><animate attributeName="opacity" begin="0.75s" calcMode="linear" dur="1s" repeatCount="indefinite" values="1;0"/></rect><rect width="5" height="2" x="2.257" y="3.757" opacity=".1" rx="1" transform="rotate(45 4.757 4.757)"><animate attributeName="opacity" begin="0.875s" calcMode="linear" dur="1s" repeatCount="indefinite" values="1;0"/></rect></svg>;
}

function VolumeHighIcon(props: ComponentProps<'svg'>): ReactNode {
  return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" aria-hidden="true" viewBox="0 0 18 18" {...props}><path fill="currentColor" d="M15.6 3.3c-.4-.4-1-.4-1.4 0s-.4 1 0 1.4C15.4 5.9 16 7.4 16 9s-.6 3.1-1.8 4.3c-.4.4-.4 1 0 1.4.2.2.5.3.7.3.3 0 .5-.1.7-.3C17.1 13.2 18 11.2 18 9s-.9-4.2-2.4-5.7"/><path fill="currentColor" d="M.714 6.008h3.072l4.071-3.857c.5-.376 1.143 0 1.143.601V15.28c0 .602-.643.903-1.143.602l-4.071-3.858H.714c-.428 0-.714-.3-.714-.752V6.76c0-.451.286-.752.714-.752m10.568.59a.91.91 0 0 1 0-1.316.91.91 0 0 1 1.316 0c1.203 1.203 1.47 2.216 1.522 3.208q.012.255.011.51c0 1.16-.358 2.733-1.533 3.803a.7.7 0 0 1-.298.156c-.382.106-.873-.011-1.018-.156a.91.91 0 0 1 0-1.316c.57-.57.995-1.551.995-2.487 0-.944-.26-1.667-.995-2.402"/></svg>;
}

function VolumeLowIcon(props: ComponentProps<'svg'>): ReactNode {
  return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" aria-hidden="true" viewBox="0 0 18 18" {...props}><path fill="currentColor" d="M.714 6.008h3.072l4.071-3.857c.5-.376 1.143 0 1.143.601V15.28c0 .602-.643.903-1.143.602l-4.071-3.858H.714c-.428 0-.714-.3-.714-.752V6.76c0-.451.286-.752.714-.752m10.568.59a.91.91 0 0 1 0-1.316.91.91 0 0 1 1.316 0c1.203 1.203 1.47 2.216 1.522 3.208q.012.255.011.51c0 1.16-.358 2.733-1.533 3.803a.7.7 0 0 1-.298.156c-.382.106-.873-.011-1.018-.156a.91.91 0 0 1 0-1.316c.57-.57.995-1.551.995-2.487 0-.944-.26-1.667-.995-2.402"/></svg>;
}

function VolumeOffIcon(props: ComponentProps<'svg'>): ReactNode {
  return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" aria-hidden="true" viewBox="0 0 18 18" {...props}><path fill="currentColor" d="M.714 6.008h3.072l4.071-3.857c.5-.376 1.143 0 1.143.601V15.28c0 .602-.643.903-1.143.602l-4.071-3.858H.714c-.428 0-.714-.3-.714-.752V6.76c0-.451.286-.752.714-.752M14.5 7.586l-1.768-1.768a1 1 0 1 0-1.414 1.414L13.085 9l-1.767 1.768a1 1 0 0 0 1.414 1.414l1.768-1.768 1.768 1.768a1 1 0 0 0 1.414-1.414L15.914 9l1.768-1.768a1 1 0 0 0-1.414-1.414z"/></svg>;
}

// ================================================================
// Course Viewer Page (Integration)
// ================================================================

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
    const videoLogRef = doc(firestore, 'students', user.uid, 'video_progress', contentId);
    await setDoc(videoLogRef, { 
      studentId: user.uid, 
      studentName: studentProfile.name, 
      courseId: id, 
      courseContentId: contentId, 
      isCompleted: true, 
      lastWatchedAt: serverTimestamp() 
    }, { merge: true });
    
    const watchedSnap = await getDocs(query(collection(firestore, 'students', user.uid, 'video_progress'), where('courseId', '==', id)));
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
      <Lock className="w-16 h-16 text-primary/40" />
      <h2 className="text-3xl font-black text-white">هذا الكورس يتطلب تفعيل</h2>
      <Link href="/student/redeem"><ShadButton className="bg-primary h-14 px-10 rounded-2xl font-black shadow-lg">تفعيل الكود الآن</ShadButton></Link>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background text-right overflow-x-hidden">
      <Navbar />
      <main className="flex-grow pt-24 pb-20 container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {activeContent?.contentType === 'Video' ? (
              <div className="space-y-6 animate-in fade-in duration-700">
                <VideoPlayer 
                  src={activeContent.youtubeLink} 
                  poster={course?.imageUrl}
                  className="rounded-3xl shadow-2xl"
                />

                <Card className="bg-card/60 backdrop-blur-3xl p-6 md:p-10 rounded-[2.5rem] border-primary/20 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-2 h-full bg-primary" />
                  <div className="flex flex-col md:flex-row-reverse justify-between items-center gap-6">
                    <div className="text-right flex-grow space-y-3">
                      <h1 className="text-2xl md:text-4xl font-black text-primary leading-tight">{activeContent.title}</h1>
                      <div className="flex items-center gap-3 justify-end opacity-70">
                         <Badge className="bg-primary/20 text-primary text-[10px] md:text-xs font-black">حصة فيديو مؤمنة</Badge>
                         <p className="text-[10px] md:text-sm text-muted-foreground font-bold flex items-center gap-2">
                           <Clock className="w-4 h-4" /> تم النشر: {activeContent.createdAt?.seconds ? new Date(activeContent.createdAt.seconds * 1000).toLocaleDateString('ar-EG') : 'الآن'}
                         </p>
                      </div>
                    </div>
                    <ShadButton 
                      onClick={() => markAsWatched(activeContent.id)} 
                      disabled={watchedVideos?.some(v => v.courseContentId === activeContent.id)} 
                      className="w-full md:w-auto h-16 px-10 rounded-2xl font-black bg-primary text-primary-foreground shadow-xl hover:scale-105 transition-all"
                    >
                      {watchedVideos?.some(v => v.courseContentId === activeContent.id) ? (
                        <span className="flex items-center gap-3"><CheckCircle className="w-6 h-6" /> تم تأكيد الحضور ✓</span>
                      ) : "تأكيد حضور الحصة"}
                    </ShadButton>
                  </div>
                </Card>
              </div>
            ) : activeContent ? (
              <Card className="bg-gradient-to-br from-primary/15 via-card to-background border-[4px] border-dashed border-primary/30 p-14 md:p-32 text-center space-y-10 rounded-[3.5rem] shadow-2xl">
                  <div className="w-24 h-24 bg-primary/20 rounded-[2rem] flex items-center justify-center mx-auto text-primary">
                    <FileQuestion className="w-12 h-12" />
                  </div>
                  <h2 className="text-4xl md:text-5xl font-black text-white">{activeContent.title}</h2>
                  <Link href={`/student/exams/${activeContent.id}`}>
                    <ShadButton size="lg" className="h-20 px-16 bg-primary text-primary-foreground font-black rounded-3xl text-2xl shadow-2xl">
                      ابدأ الاختبار الآن ✍️
                    </ShadButton>
                  </Link>
              </Card>
            ) : null}
          </div>

          <div className="lg:col-span-1">
            <Card className="bg-card/50 backdrop-blur-3xl border-primary/20 overflow-hidden shadow-2xl rounded-[2.5rem] sticky top-24">
              <CardHeader className="border-b bg-secondary/40 py-8 px-8 flex flex-row-reverse items-center justify-between">
                <CardTitle className="text-2xl font-black flex items-center gap-4 justify-end text-primary">
                  محتوى الكورس <Monitor className="w-6 h-6" />
                </CardTitle>
                <div className="bg-primary/25 text-primary px-4 py-2 rounded-full font-black text-xs border border-primary/30">
                  {enrollment?.progressPercentage || 0}%
                </div>
              </CardHeader>
              <CardContent className="p-0 max-h-[60vh] overflow-y-auto">
                {visibleContents.length === 0 ? (
                   <div className="p-16 text-center text-muted-foreground italic font-bold">لا يوجد محتوى متاح حالياً.</div>
                ) : visibleContents.map((item, idx) => (
                  <button 
                    key={item.id} 
                    onClick={() => setActiveContent(item)} 
                    className={cn(
                      "w-full p-8 text-right flex flex-row-reverse items-center gap-5 transition-all border-b border-white/5", 
                      activeContent?.id === item.id ? "bg-primary/15" : "hover:bg-white/5"
                    )}
                  >
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 font-black", 
                      watchedVideos?.some(v => v.courseContentId === item.id) ? "bg-accent text-white" : "bg-secondary"
                    )}>
                      {watchedVideos?.some(v => v.courseContentId === item.id) ? <CheckCircle className="w-6 h-6" /> : idx+1}
                    </div>
                    <div className="min-w-0 text-right">
                      <p className={cn("font-black text-lg truncate", activeContent?.id === item.id ? "text-primary" : "text-white/90")}>
                        {item.title}
                      </p>
                    </div>
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
