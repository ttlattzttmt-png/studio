
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
  Clock,
  RefreshCw,
  Search
} from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, collectionGroup } from 'firebase/firestore';
import { Input } from '@/components/ui/input';

export default function CourseInsightsPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [searchTerm, setSearchTerm] = useState('');

  // جلب الكورسات والطلاب لبناء خارطة الأسماء الحقيقية
  const coursesRef = useMemoFirebase(() => collection(firestore, 'courses'), [firestore]);
  const studentsRef = useMemoFirebase(() => collection(firestore, 'students'), [firestore]);
  
  const { data: courses } = useCollection(coursesRef);
  const { data: allStudents } = useCollection(studentsRef);

  // جلب كافة البيانات بنظام المجموعات (تزامن لحظي)
  const allEnrollmentsRef = useMemoFirebase(() => collectionGroup(firestore, 'enrollments'), [firestore]);
  const allAttemptsRef = useMemoFirebase(() => collectionGroup(firestore, 'quiz_attempts'), [firestore]);
  const allVideoLogsRef = useMemoFirebase(() => collectionGroup(firestore, 'video_progress'), [firestore]);

  const { data: rawEnrollments, isLoading: isEnLoading } = useCollection(allEnrollmentsRef);
  const { data: rawAttempts } = useCollection(allAttemptsRef);
  const { data: rawVideoLogs } = useCollection(allVideoLogsRef);

  // إنشاء خارطة أسماء الطلاب (Student ID -> Student Info)
  const studentMap = useMemo(() => {
    const map: Record<string, any> = {};
    allStudents?.forEach(s => { map[s.id] = s; });
    return map;
  }, [allStudents]);

  // جلب محتوى الكورس المختار لحساب عدد الفيديوهات
  const courseContentRef = useMemoFirebase(() => {
    if (!firestore || !selectedCourseId) return null;
    return collection(firestore, 'courses', selectedCourseId, 'content');
  }, [firestore, selectedCourseId]);
  const { data: contents } = useCollection(courseContentRef);

  const totalVideos = useMemo(() => contents?.filter(c => c.contentType === 'Video').length || 0, [contents]);

  // معالجة الإحصائيات برمجياً (تزامن 100% وبحث دقيق بالاسم الرباعي)
  const processedData = useMemo(() => {
    if (!selectedCourseId || !rawEnrollments) return [];

    // 1. فلترة الاشتراكات للكورس المختار
    const filteredEnrollments = rawEnrollments.filter(en => en.courseId === selectedCourseId);
    
    // 2. تجميع البيانات لكل طالب بربطها بخارطة الطلاب
    const stats = filteredEnrollments.map(en => {
      const studentInfo = studentMap[en.studentId] || {};
      
      // جلب أفضل درجة في امتحانات هذا الكورس
      const studentAttempts = rawAttempts?.filter(at => at.studentId === en.studentId && at.courseId === selectedCourseId) || [];
      const bestAttempt = studentAttempts.length > 0 
        ? studentAttempts.reduce((prev, curr) => (prev.score > curr.score) ? prev : curr)
        : null;

      // جلب سجلات المشاهدة ودقائق الإنجاز
      const studentVideoLogs = rawVideoLogs?.filter(vl => vl.studentId === en.studentId && vl.courseId === selectedCourseId) || [];
      const completedVideosCount = studentVideoLogs.filter(vl => vl.isCompleted).length;
      const totalSecondsWatched = studentVideoLogs.reduce((acc, curr) => acc + (curr.watchedDurationInSeconds || 0), 0);

      return {
        ...en,
        studentName: studentInfo.name || en.studentName || 'طالب مجهول',
        studentPhone: studentInfo.studentPhoneNumber || '---',
        bestScore: bestAttempt?.score ?? null,
        pointsAchieved: bestAttempt?.pointsAchieved ?? 0,
        totalPoints: bestAttempt?.totalPoints ?? 0,
        watchedCount: completedVideosCount,
        totalMinutes: Math.round(totalSecondsWatched / 60)
      };
    });

    // 3. تطبيق البحث بالاسم الرباعي الحقيقي أو الهاتف
    const searched = stats.filter(s => 
      s.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.studentPhone.includes(searchTerm)
    );

    // 4. تطبيق الترتيب
    return searched.sort((a, b) => {
      const scoreA = a.bestScore ?? -1;
      const scoreB = b.bestScore ?? -1;
      return sortOrder === 'desc' ? scoreB - scoreA : scoreA - scoreB;
    });
  }, [selectedCourseId, rawEnrollments, rawAttempts, rawVideoLogs, studentMap, sortOrder, searchTerm]);

  if (isUserLoading) return <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 text-right">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-headline font-bold mb-2">إحصائيات المتابعة الحية</h1>
          <p className="text-muted-foreground font-bold">راقب تقدم الطلاب ودقائق المشاهدة لحظياً بالاسم الرباعي.</p>
        </div>
        <div className="w-full md:w-80">
          <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
            <SelectTrigger className="h-14 bg-card border-primary/20 rounded-2xl shadow-lg"><SelectValue placeholder="اختر الكورس للتحليل" /></SelectTrigger>
            <SelectContent>
              {courses?.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!selectedCourseId ? (
        <Card className="p-20 text-center border-dashed border-2 bg-secondary/5 rounded-[3rem]">
           <BarChart3 className="w-20 h-20 mx-auto mb-6 opacity-10 text-primary" />
           <p className="text-xl font-black text-muted-foreground italic">اختر كورس من القائمة لعرض الرقابة الحية.</p>
        </Card>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatsCard title="إجمالي المشتركين" value={processedData.length} icon={<Users />} color="text-blue-500" />
            <StatsCard title="متوسط الإنجاز" value={`${processedData.length > 0 ? Math.round(processedData.reduce((acc, curr) => acc + (curr.progressPercentage || 0), 0) / processedData.length) : 0}%`} icon={<PlayCircle />} color="text-primary" />
            <StatsCard title="أدوا امتحانات" value={processedData.filter(p => p.bestScore !== null).length} icon={<Trophy />} color="text-accent" />
            <StatsCard title="إجمالي الدقائق" value={processedData.reduce((acc, curr) => acc + curr.totalMinutes, 0)} icon={<Clock />} color="text-purple-500" />
          </div>

          <Card className="bg-card border-primary/10 shadow-2xl rounded-[2.5rem] overflow-hidden">
            <CardHeader className="border-b bg-secondary/5 p-6 flex flex-col md:flex-row-reverse items-center justify-between gap-4">
              <div className="relative w-full max-w-md">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="ابحث باسم الطالب الرباعي الحقيقي..." 
                  className="pr-10 bg-background border-primary/10 text-right h-12 rounded-xl font-bold"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-3">
                 <RefreshCw className="w-4 h-4 animate-spin-slow text-primary" />
                 <Button variant="outline" className="gap-2 font-black rounded-xl border-primary/20" onClick={() => setSortOrder(p => p === 'desc' ? 'asc' : 'desc')}>
                   <ArrowUpDown className="w-4 h-4" /> ترتيب الأوائل
                 </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead className="bg-secondary/10 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                  <tr>
                    <th className="px-6 py-5">الطالب</th>
                    <th className="px-6 py-5">إنجاز الكورس</th>
                    <th className="px-6 py-5">أفضل درجة</th>
                    <th className="px-6 py-5">الفيديوهات</th>
                    <th className="px-6 py-5">وقت المشاهدة</th>
                    <th className="px-6 py-5">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary/5">
                  {processedData.map((stat) => (
                    <tr key={stat.studentId} className="hover:bg-primary/5 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3 justify-end">
                          <div className="text-right">
                            <p className="font-black text-sm text-foreground">{stat.studentName}</p>
                            <p className="text-[9px] text-muted-foreground font-mono" dir="ltr">{stat.studentPhone}</p>
                          </div>
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-xs font-black text-primary border border-primary/10 shadow-sm">
                            {stat.studentName[0]}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3 justify-end">
                           <span className="text-xs font-black text-primary">{stat.progressPercentage || 0}%</span>
                           <div className="w-20 h-1.5 bg-secondary rounded-full overflow-hidden">
                              <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${stat.progressPercentage || 0}%` }} />
                           </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {stat.bestScore !== null ? (
                          <div className="flex flex-col items-end">
                            <Badge className="bg-accent text-white font-black border-none text-[10px] shadow-sm">{stat.bestScore}%</Badge>
                            <span className="text-[9px] text-muted-foreground mt-1 font-bold">{stat.pointsAchieved} من {stat.totalPoints}</span>
                          </div>
                        ) : (
                          <Badge variant="secondary" className="opacity-40 text-[9px] font-bold">لم يمتحن</Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                         <p className={`text-xs font-black ${stat.watchedCount >= totalVideos && totalVideos > 0 ? "text-accent" : "text-foreground"}`}>
                            {stat.watchedCount} من {totalVideos}
                         </p>
                         <p className="text-[9px] text-muted-foreground font-bold">فيديو مكتمل</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 justify-end font-mono text-xs text-primary font-bold">
                           <span>{stat.totalMinutes} دقيقة</span>
                           <Clock className="w-3 h-3 opacity-50" />
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[10px] font-bold">
                        <Badge variant={stat.status === 'active' ? 'default' : 'secondary'} className="text-[8px]">
                           {stat.status === 'active' ? 'مفعل' : 'معلق'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {processedData.length === 0 && (
                    <tr><td colSpan={6} className="py-20 text-center text-muted-foreground italic font-bold">لا توجد بيانات مطابقة للبحث أو الكورس حالياً.</td></tr>
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
    <Card className="bg-card border-primary/5 shadow-lg rounded-2xl overflow-hidden relative">
      <div className={`absolute top-0 right-0 w-1 h-full bg-current ${color}`} />
      <CardContent className="p-6 flex flex-row-reverse items-center justify-between">
        <div className="text-right">
          <p className="text-[10px] font-black text-muted-foreground mb-1 uppercase tracking-tighter">{title}</p>
          <p className={`text-2xl font-black ${color}`}>{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl bg-secondary flex items-center justify-center ${color} shadow-inner`}>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}
