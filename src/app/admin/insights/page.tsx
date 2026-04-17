"use client";

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  BarChart3, 
  Users, 
  PlayCircle, 
  Trophy, 
  Loader2, 
  ArrowUpDown,
  Video,
  Clock,
  RefreshCw
} from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, query, where, collectionGroup, doc } from 'firebase/firestore';

export default function CourseInsightsPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // جلب الكورسات للاختيار
  const coursesRef = useMemoFirebase(() => collection(firestore, 'courses'), [firestore]);
  const { data: courses } = useCollection(coursesRef);

  // جلب الاشتراكات لهذا الكورس بتزامن حي
  const enrollmentsRef = useMemoFirebase(() => {
    if (!firestore || !selectedCourseId) return null;
    return query(collectionGroup(firestore, 'enrollments'), where('courseId', '==', selectedCourseId));
  }, [firestore, selectedCourseId]);
  const { data: enrollments, isLoading: isEnLoading } = useCollection(enrollmentsRef);

  // جلب المحاولات بتزامن حي
  const quizAttemptsRef = useMemoFirebase(() => {
    if (!firestore || !selectedCourseId) return null;
    return query(collectionGroup(firestore, 'quiz_attempts'), where('courseId', '==', selectedCourseId));
  }, [firestore, selectedCourseId]);
  const { data: attempts } = useCollection(quizAttemptsRef);

  // جلب سجلات الفيديوهات بتزامن حي
  const videoProgressRef = useMemoFirebase(() => {
    if (!firestore || !selectedCourseId) return null;
    return query(collectionGroup(firestore, 'video_progress'), where('courseId', '==', selectedCourseId));
  }, [firestore, selectedCourseId]);
  const { data: videoLogs } = useCollection(videoProgressRef);

  // جلب محتوى الكورس
  const courseContentRef = useMemoFirebase(() => {
    if (!firestore || !selectedCourseId) return null;
    return collection(firestore, 'courses', selectedCourseId, 'content');
  }, [firestore, selectedCourseId]);
  const { data: contents } = useCollection(courseContentRef);

  const totalVideos = useMemo(() => contents?.filter(c => c.contentType === 'Video').length || 0, [contents]);

  // تجميع الإحصائيات لكل طالب
  const studentStats = useMemo(() => {
    if (!enrollments) return [];
    
    const stats = enrollments.map(en => {
      const studentAttempts = attempts?.filter(a => a.studentId === en.studentId) || [];
      const bestAttempt = studentAttempts.length > 0 
        ? studentAttempts.reduce((prev, current) => (prev.score > current.score) ? prev : current)
        : null;

      const watchedLogs = videoLogs?.filter(v => v.studentId === en.studentId && v.isCompleted) || [];
      const totalSeconds = videoLogs?.filter(v => v.studentId === en.studentId)
        .reduce((acc, curr) => acc + (curr.watchedDurationInSeconds || 0), 0) || 0;

      return {
        ...en,
        bestScore: bestAttempt?.score ?? null,
        pointsAchieved: bestAttempt?.pointsAchieved ?? 0,
        totalPoints: bestAttempt?.totalPoints ?? 0,
        watchedCount: watchedLogs.length,
        totalMinutes: Math.round(totalSeconds / 60)
      };
    });

    return stats.sort((a, b) => {
      const scoreA = a.bestScore ?? -1;
      const scoreB = b.bestScore ?? -1;
      return sortOrder === 'desc' ? scoreB - scoreA : scoreA - scoreB;
    });
  }, [enrollments, attempts, videoLogs, sortOrder]);

  if (isUserLoading) return <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="text-right">
          <h1 className="text-4xl font-headline font-bold mb-2">إحصائيات المتابعة والرقابة</h1>
          <p className="text-muted-foreground">راقب استهلاك المحتوى، دقائق المشاهدة، والنتائج التفصيلية لحظياً.</p>
        </div>
        <div className="w-full md:w-80">
          <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
            <SelectTrigger className="h-14 bg-card border-primary/20"><SelectValue placeholder="اختر الكورس للتحليل" /></SelectTrigger>
            <SelectContent>
              {courses?.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!selectedCourseId ? (
        <Card className="p-20 text-center border-dashed border-2 bg-secondary/5 rounded-[3rem]">
           <BarChart3 className="w-20 h-20 mx-auto mb-6 opacity-10 text-primary" />
           <p className="text-xl font-bold text-muted-foreground">اختر كورس من القائمة لعرض بيانات الطلاب المشتركين فيه.</p>
        </Card>
      ) : isEnLoading ? (
        <div className="flex flex-col items-center justify-center py-40 gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="font-bold text-muted-foreground italic">جاري سحب البيانات الحية من السيرفر...</p>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatsCard title="المشتركون" value={enrollments?.length || 0} icon={<Users />} color="text-blue-500" />
            <StatsCard title="متوسط الإنجاز" value={`${Math.round(enrollments?.reduce((acc, curr) => acc + (curr.progressPercentage || 0), 0) / (enrollments?.length || 1))}%`} icon={<PlayCircle />} color="text-primary" />
            <StatsCard title="أدوا الامتحانات" value={new Set(attempts?.map(a => a.studentId)).size} icon={<Trophy />} color="text-accent" />
            <StatsCard title="سجلات المشاهدة" value={videoLogs?.length || 0} icon={<Video />} color="text-purple-500" />
          </div>

          <Card className="bg-card border-primary/10 shadow-2xl rounded-[2.5rem] overflow-hidden">
            <CardHeader className="border-b bg-secondary/5 p-6 flex flex-row-reverse items-center justify-between">
              <CardTitle className="text-xl font-bold">جدول المتابعة التفصيلي</CardTitle>
              <div className="flex items-center gap-2">
                 <RefreshCw className="w-4 h-4 animate-spin-slow text-primary" />
                 <Button variant="outline" size="sm" className="gap-2 font-bold" onClick={() => setSortOrder(p => p === 'desc' ? 'asc' : 'desc')}>
                   <ArrowUpDown className="w-4 h-4" /> ترتيب الأوائل
                 </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead className="bg-secondary/10 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-5">الطالب</th>
                    <th className="px-6 py-5">الإنجاز الكلي</th>
                    <th className="px-6 py-5">أفضل درجة</th>
                    <th className="px-6 py-5">الفيديوهات</th>
                    <th className="px-6 py-5">وقت المشاهدة</th>
                    <th className="px-6 py-5">تاريخ التفعيل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary/5">
                  {studentStats.map((stat) => (
                    <tr key={stat.id} className="hover:bg-primary/5 transition-colors group">
                      <td className="px-6 py-4 font-bold text-sm">
                        <StudentDetails studentId={stat.studentId} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3 justify-end">
                           <span className="text-xs font-black text-primary">{stat.progressPercentage || 0}%</span>
                           <div className="w-20 h-1.5 bg-secondary rounded-full overflow-hidden">
                              <div className="h-full bg-primary" style={{ width: `${stat.progressPercentage || 0}%` }} />
                           </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {stat.bestScore !== null ? (
                          <div className="flex flex-col items-end">
                            <Badge className="bg-accent text-white font-black border-none">{stat.bestScore}%</Badge>
                            <span className="text-[9px] text-muted-foreground mt-1">{stat.pointsAchieved}/{stat.totalPoints} نقطة</span>
                          </div>
                        ) : (
                          <Badge variant="secondary" className="opacity-40 text-[9px]">لم يمتحن</Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs font-bold">
                        <span className={stat.watchedCount >= totalVideos && totalVideos > 0 ? "text-accent" : "text-foreground"}>
                          {stat.watchedCount} / {totalVideos}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-primary font-bold">
                        <div className="flex items-center gap-1 justify-end">
                           <span>{stat.totalMinutes} دقيقة</span>
                           <Clock className="w-3 h-3 opacity-50" />
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[10px] text-muted-foreground">
                        {stat.activationDate ? new Date(stat.activationDate).toLocaleDateString('ar-EG') : '---'}
                      </td>
                    </tr>
                  ))}
                  {studentStats.length === 0 && (
                    <tr><td colSpan={6} className="py-20 text-center text-muted-foreground italic">لا يوجد طلاب مسجلون في هذا الكورس بعد.</td></tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function StatsCard({ title, value, icon, color }: any) {
  return (
    <Card className="bg-card border-primary/5 shadow-md">
      <CardContent className="p-6 flex flex-row-reverse items-center justify-between">
        <div className="text-right">
          <p className="text-[10px] font-bold text-muted-foreground mb-1">{title}</p>
          <p className={`text-2xl font-black ${color}`}>{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl bg-secondary flex items-center justify-center ${color}`}>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

function StudentDetails({ studentId }: { studentId: string }) {
  const firestore = useFirestore();
  const studentRef = useMemoFirebase(() => studentId ? doc(firestore, 'students', studentId) : null, [firestore, studentId]);
  const { data: student } = useDoc(studentRef);
  
  return (
    <div className="flex items-center gap-3 justify-end">
      <div className="text-right min-w-0">
        <p className="truncate max-w-[150px]">{student?.name || 'جاري التحميل...'}</p>
        <p className="text-[9px] text-muted-foreground font-mono">{student?.studentPhoneNumber}</p>
      </div>
      <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
        {student?.name?.[0] || 'S'}
      </div>
    </div>
  );
}