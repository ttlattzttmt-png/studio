
"use client";

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Loader2,
  CheckCircle2,
  User as UserIcon,
  Phone,
  AlertCircle,
  Clock,
  BookOpen,
  Search,
  RefreshCw
} from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collectionGroup, doc, updateDoc, query, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';

export default function PendingActivationsPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');

  // جلب كافة طلبات التفعيل المعلقة من كل الطلاب بشكل لحظي
  const enrollmentsRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collectionGroup(firestore, 'enrollments'), 
      where('status', '==', 'pending')
    );
  }, [firestore, user]);

  const { data: pendingRequests, isLoading, error } = useCollection(enrollmentsRef);

  // ترتيب الطلبات برمجياً (الأحدث أولاً) وتصفيتها حسب البحث
  const filteredRequests = useMemo(() => {
    if (!pendingRequests) return [];
    
    return pendingRequests
      .filter(req => {
        const searchLower = searchTerm.toLowerCase();
        const courseTitle = (req.courseTitle || '').toLowerCase();
        const studentId = (req.studentId || '').toLowerCase();
        return courseTitle.includes(searchLower) || studentId.includes(searchLower);
      })
      .sort((a, b) => {
        const dateA = a.enrollmentDate ? new Date(a.enrollmentDate).getTime() : 0;
        const dateB = b.enrollmentDate ? new Date(b.enrollmentDate).getTime() : 0;
        return dateB - dateA;
      });
  }, [pendingRequests, searchTerm]);

  const handleActivate = async (enrollment: any) => {
    if (!firestore) return;
    try {
      const enRef = doc(firestore, 'students', enrollment.studentId, 'enrollments', enrollment.id);
      await updateDoc(enRef, { 
        status: 'active', 
        activationDate: new Date().toISOString() 
      });
      toast({ 
        title: "تم التفعيل بنجاح", 
        description: `تم تفعيل كورس ${enrollment.courseTitle} للطالب.` 
      });
    } catch (e) { 
      console.error(e);
      toast({ variant: "destructive", title: "خطأ في التفعيل", description: "تأكد من صلاحيات المسؤول." });
    }
  };

  if (isUserLoading) return <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="text-right">
          <h1 className="text-4xl font-headline font-bold mb-2">طلبات التفعيل المعلقة</h1>
          <p className="text-muted-foreground">راجع بيانات الطلاب وقم بتفعيل حساباتهم لحظياً.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-accent/10 text-accent px-6 py-3 rounded-2xl border border-accent/20 flex items-center gap-3">
            <RefreshCw className="w-5 h-5 animate-pulse" />
            <span className="font-bold text-sm">تزامن مباشر: {pendingRequests?.length || 0} طلب</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-6 bg-destructive/10 text-destructive rounded-2xl border border-destructive/20 text-center font-bold flex flex-col items-center gap-2">
          <AlertCircle className="w-8 h-8" />
          <p>عذراً، حدث خطأ أثناء الاتصال بـ Firestore. يرجى مراجعة إعدادات الأمان.</p>
        </div>
      )}

      <Card className="bg-card border-primary/5 shadow-xl overflow-hidden rounded-[2rem]">
        <CardHeader className="border-b bg-secondary/5 p-6">
          <div className="relative w-full max-w-md mr-auto">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="ابحث باسم الكورس أو معرف الطالب..." 
              className="pr-10 bg-background border-primary/10 text-right h-12 rounded-xl"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[70vh]">
            <div className="p-6">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-40 gap-4">
                  <Loader2 className="w-12 h-12 animate-spin text-primary" />
                  <p className="font-bold text-muted-foreground italic">جاري جلب الطلبات المتزامنة...</p>
                </div>
              ) : filteredRequests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-40 text-muted-foreground opacity-30 italic">
                  <CheckCircle2 className="w-20 h-20 mb-4" />
                  <p className="text-xl">لا توجد طلبات تفعيل معلقة حالياً.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredRequests.map((req) => (
                    <RequestCard key={req.id} req={req} onActivate={handleActivate} />
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * مكون البطاقة لعرض طلب التفعيل مع جلب بيانات الطالب بشكل مستقل ومباشر
 */
function RequestCard({ req, onActivate }: { req: any, onActivate: (r: any) => void }) {
  const firestore = useFirestore();
  
  // جلب وثيقة الطالب الأصلية للتأكد من الاسم والرقم بدقة
  const studentRef = useMemoFirebase(() => 
    req.studentId ? doc(firestore, 'students', req.studentId) : null, 
    [firestore, req.studentId]
  );
  const { data: student, isLoading: isStudentLoading } = useDoc(studentRef);

  return (
    <Card className="bg-background border-accent/20 hover:border-accent/50 transition-all shadow-md group text-right rounded-2xl overflow-hidden">
      <CardHeader className="pb-3 border-b border-dashed border-accent/10">
        <div className="flex justify-between items-center mb-2">
          <Badge variant="outline" className="text-[10px] font-bold text-accent border-accent/30 bg-accent/5">طلب اشتراك جديد</Badge>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" /> {req.enrollmentDate ? new Date(req.enrollmentDate).toLocaleDateString('ar-EG') : '---'}
          </span>
        </div>
        <div className="flex items-center gap-2 justify-end">
          <CardTitle className="text-sm font-black leading-tight text-foreground truncate">
            {req.courseTitle || 'كورس غير معروف'}
          </CardTitle>
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <BookOpen className="w-4 h-4" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        <div className="bg-secondary/20 p-4 rounded-2xl space-y-3">
          <div className="flex items-center gap-3 justify-end">
            <div className="min-w-0 text-right">
              <p className="text-[10px] text-muted-foreground font-bold">اسم الطالب كامل:</p>
              <p className="text-xs font-black text-foreground truncate">
                {isStudentLoading ? 'جاري التحميل...' : student?.name || 'مستخدم مجهول'}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent shrink-0">
              <UserIcon className="w-5 h-5" />
            </div>
          </div>
          
          <div className="flex items-center gap-3 justify-end">
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground font-bold">رقم الهاتف للتواصل:</p>
              <p className="text-xs font-mono font-bold text-foreground" dir="ltr">
                {isStudentLoading ? '...' : student?.studentPhoneNumber || 'غير مسجل'}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Phone className="w-5 h-5" />
            </div>
          </div>
        </div>

        <Button 
          onClick={() => onActivate(req)}
          className="w-full h-12 bg-accent hover:bg-accent/90 text-white font-bold rounded-xl shadow-lg shadow-accent/10 gap-2"
        >
          <CheckCircle2 className="w-5 h-5" /> تفعيل الكورس الآن
        </Button>
      </CardContent>
    </Card>
  );
}
