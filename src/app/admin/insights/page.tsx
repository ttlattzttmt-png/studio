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
  Search, 
  ArrowUpDown,
  FileText,
  Clock
} from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where, collectionGroup } from 'firebase/firestore';

export default function CourseInsightsPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // جلب الكورسات للاختيار
  const coursesRef = useMemoFirebase(() => collection(firestore, 'courses'), [firestore]);
  const { data: courses } = useCollection(coursesRef);

  // جلب كافة الاشتراكات لهذا الكورس
  const enrollmentsRef = useMemoFirebase(() => {
    if (!firestore || !selectedCourseId) return null;
    return query(collectionGroup(firestore, 'enrollments'), where('courseId', '==', selectedCourseId));
  }, [firestore, selectedCourseId]);
  const { data: enrollments, isLoading: isEnLoading } = useCollection(enrollmentsRef);

  // جلب كافة محاولات الامتحانات المتعلقة بالكورس
  const quizAttemptsRef = useMemoFirebase(() => {
    if (!firestore || !selectedCourseId) return null;
    return query(collectionGroup(firestore, 'quiz_attempts'), where('courseId', '==', selectedCourseId));
  }, [firestore, selectedCourseId]);
  const { data: attempts } = useCollection(quizAttemptsRef);

  // جلب سجلات مشاهدة الفيديوهات
  const videoProgressRef = useMemoFirebase(() => {
    if (!firestore || !selectedCourseId) return null;
    return query(collectionGroup(firestore, 'video_progress'));
  }, [firestore, selectedCourseId]);
  const { data: videoLogs } = useCollection(videoProgressRef);

  // ترتيب الطلاب حسب الدرجة (الأوائل)
  const sortedStudents = useMemo(() => {
    if (!enrollments) return [];
    return [...enrollments].sort((a, b) => {
      const scoreA = attempts?.find(at => at.studentId === a.studentId)?.score || 0;
      const scoreB = attempts?.find(at => at.studentId === b.studentId)?.score || 0;
      return sortOrder === 'desc' ? scoreB - scoreA : scoreA - scoreB;
    });
  }, [enrollments, attempts, sortOrder]);

  if (isUserLoading) return <div className="flex justify-center py-20"><Loader2 className="w-10 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="text-right">
          <h1 className="text-4xl font-headline font-bold mb-2">تحليلات الكورسات والطلاب</h1>
          <p className="text-muted-foreground">تابع تقدم الطلاب، نسب الإنجاز، وقائمة الأوائل لكل كورس.</p>
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
           <p className="text-xl font-bold text-muted-foreground">يرجى اختيار كورس من القائمة بالأعلى لعرض تفاصيله.</p>
        </Card>
      ) : isEnLoading ? (
        <div className="flex flex-col items-center justify-center py-40 gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="font-bold text-muted-foreground italic">جاري تحليل بيانات الطلاب...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatsCard title="إجمالي الطلاب" value={enrollments?.length || 0} icon={<Users />} color="text-blue-500" />
            <StatsCard title="متوسط الإنجاز" value={`${Math.round(enrollments?.reduce((acc, curr) => acc + (curr.progressPercentage || 0), 0) / (enrollments?.length || 1))}%`} icon={<PlayCircle />} color="text-primary" />
            <StatsCard title="طلاب امتحنوا" value={new Set(attempts?.map(a => a.studentId)).size} icon={<Trophy />} color="text-accent" />
          </div>

          {/* Students Table */}
          <Card className="bg-card border-primary/10 shadow-2xl rounded-[2.5rem] overflow-hidden">
            <CardHeader className="border-b bg-secondary/5 p-6 flex flex-row items-center justify-between">
              <CardTitle className="text-xl font-bold">قائمة الطلاب والمستوى الدراسي</CardTitle>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setSortOrder(p => p === 'desc' ? 'asc' : 'desc')}>
                <ArrowUpDown className="w-4 h-4" /> ترتيب حسب الدرجة
              </Button>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-right">
                <thead className="bg-secondary/10 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">اسم الطالب</th>
                    <th className="px-6 py-4">نسبة إنجاز الكورس</th>
                    <th className="px-6 py-4">درجة أحدث امتحان</th>
                    <th className="px-6 py-4">مشاهدة الفيديوهات</th>
                    <th className="px-6 py-4">حالة الاشتراك</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary/5">
                  {sortedStudents.map((en) => {
                    const studentAttempts = attempts?.filter(a => a.studentId === en.studentId) || [];
                    const latestScore = studentAttempts.length > 0 ? studentAttempts[0].score : 'لم يمتحن';
                    const watchedCount = videoLogs?.filter(v => v.studentId === en.studentId && v.isCompleted).length || 0;
                    
                    return (
                      <tr key={en.id} className="hover:bg-primary/5 transition-colors">
                        <td className="px-6 py-4 font-bold text-sm">
                          <StudentNameById studentId={en.studentId} />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                             <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
                                <div className="h-full bg-primary" style={{ width: `${en.progressPercentage || 0}%` }} />
                             </div>
                             <span className="text-xs font-black">{en.progressPercentage || 0}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={typeof latestScore === 'number' ? 'default' : 'secondary'} className="font-bold">
                            {typeof latestScore === 'number' ? `${latestScore}%` : latestScore}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-muted-foreground">
                          {watchedCount} فيديوهات مكتملة
                        </td>
                        <td className="px-6 py-4">
                          <Badge className="bg-accent/10 text-accent border-accent/20">نشط</Badge>
                        </td>
                      </tr>
                    );
                  })}
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
      <CardContent className="p-6 flex items-center justify-between">
        <div className="text-right">
          <p className="text-xs font-bold text-muted-foreground mb-1">{title}</p>
          <p className={`text-3xl font-black ${color}`}>{value}</p>
        </div>
        <div className={`w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center ${color}`}>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

import { useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';

function StudentNameById({ studentId }: { studentId: string }) {
  const firestore = useFirestore();
  const studentRef = useMemoFirebase(() => studentId ? doc(firestore, 'students', studentId) : null, [firestore, studentId]);
  const { data: student } = useDoc(studentRef);
  return <span className="truncate max-w-[150px] inline-block">{student?.name || 'جاري التحميل...'}</span>;
}
