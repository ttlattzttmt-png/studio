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
  RefreshCw,
  ShieldAlert
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

  // استعلام متزامن لجلب كافة طلبات التفعيل المعلقة
  const enrollmentsRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    try {
      return query(
        collectionGroup(firestore, 'enrollments'), 
        where('status', '==', 'pending')
      );
    } catch (e) {
      console.error("Query building error:", e);
      return null;
    }
  }, [firestore, user]);

  const { data: pendingRequests, isLoading, error } = useCollection(enrollmentsRef);

  // تصفية وترتيب الطلبات
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
      toast({ variant: "destructive", title: "خطأ في التفعيل", description: "تأكد من صلاحيات المسؤول واتصالك بالإنترنت." });
    }
  };

  if (isUserLoading) return <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="text-right">
          <h1 className="text-4xl font-headline font-bold mb-2">طلبات التفعيل المعلقة</h1>
          <p className="text-muted-foreground">راجع بيانات الطلاب وقم بتفعيل حساباتهم لحظياً من مكان واحد.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-accent/10 text-accent px-6 py-3 rounded-2xl border border-accent/20 flex items-center gap-3">
            <RefreshCw className="w-5 h-5 animate-pulse" />
            <span className="font-bold text-sm">تزامن مباشر: {pendingRequests?.length || 0} طلب</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-10 bg-destructive/10 text-destructive rounded-[2rem] border-2 border-dashed border-destructive/20 text-center space-y-4">
          <ShieldAlert className="w-16 h-16 mx-auto opacity-50" />
          <div className="space-y-2">
            <h3 className="text-xl font-bold">عذراً، هناك مشكلة في الصلاحيات</h3>
            <p className="text-sm opacity-80 max-w-md mx-auto leading-relaxed">
              تأكد أنك قمت بتسجيل الدخول ببريد المسؤول (admin@al-bashmohandes.com) 
              وأن قواعد الحماية تم تحديثها بنجاح.
            </p>
          </div>
          <Button variant="outline" onClick={() => window.location.reload()} className="border-destructive/30 hover:bg-destructive/10">
            إعادة محاولة الاتصال
          </Button>
        </div>
      )}

      <Card className="bg-card border-primary/5 shadow-2xl overflow-hidden rounded-[2.5rem]">
        <CardHeader className="border-b bg-secondary/5 p-6 flex flex-row items-center justify-between">
          <div className="relative w-full max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="ابحث باسم الكورس أو معرف الطالب..." 
              className="pr-10 bg-background border-primary/10 text-right h-12 rounded-xl"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Badge variant="outline" className="hidden md:flex border-primary/20 text-primary">لوحة التحكم المركزية</Badge>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[70vh]">
            <div className="p-8">
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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

function RequestCard({ req, onActivate }: { req: any, onActivate: (r: any) => void }) {
  const firestore = useFirestore();
  
  // جلب بيانات الطالب الأصلية لحظياً للتأكد من هويته
  const studentRef = useMemoFirebase(() => 
    req.studentId ? doc(firestore, 'students', req.studentId) : null, 
    [firestore, req.studentId]
  );
  const { data: student, isLoading: isStudentLoading } = useDoc(studentRef);

  return (
    <Card className="bg-background border-accent/10 hover:border-accent/40 transition-all shadow-lg group text-right rounded-3xl overflow-hidden relative">
      <div className="absolute top-0 right-0 w-1 h-full bg-accent opacity-20" />
      
      <CardHeader className="pb-4 border-b border-dashed border-accent/10 bg-secondary/5">
        <div className="flex justify-between items-center mb-3">
          <Badge className="bg-accent/10 text-accent border-accent/20 hover:bg-accent/20">طلب جديد</Badge>
          <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
            <Clock className="w-3 h-3" /> {req.enrollmentDate ? new Date(req.enrollmentDate).toLocaleDateString('ar-EG') : '---'}
          </span>
        </div>
        <div className="flex items-center gap-3 justify-end">
          <CardTitle className="text-base font-black leading-tight text-foreground line-clamp-1">
            {req.courseTitle || 'كورس غير معروف'}
          </CardTitle>
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-5">
        <div className="bg-secondary/20 p-5 rounded-[1.5rem] space-y-4 border border-white/5">
          <div className="flex items-center gap-4 justify-end">
            <div className="min-w-0 text-right">
              <p className="text-[10px] text-muted-foreground font-bold mb-0.5">اسم الطالب:</p>
              <p className="text-xs font-black text-foreground truncate">
                {isStudentLoading ? 'جاري التحميل...' : student?.name || 'مستخدم مجهول'}
              </p>
            </div>
            <div className="w-11 h-11 rounded-full bg-accent/10 flex items-center justify-center text-accent shrink-0 border border-accent/10">
              <UserIcon className="w-5 h-5" />
            </div>
          </div>
          
          <div className="flex items-center gap-4 justify-end">
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground font-bold mb-0.5">رقم الموبايل:</p>
              <p className="text-xs font-mono font-bold text-primary" dir="ltr">
                {isStudentLoading ? '...' : student?.studentPhoneNumber || 'غير مسجل'}
              </p>
            </div>
            <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/10">
              <Phone className="w-5 h-5" />
            </div>
          </div>
        </div>

        <Button 
          onClick={() => onActivate(req)}
          className="w-full h-14 bg-accent hover:bg-accent/90 text-white font-bold rounded-2xl shadow-xl shadow-accent/10 gap-2 text-base transition-transform active:scale-95"
        >
          <CheckCircle2 className="w-5 h-5" /> تفعيل الكورس الآن
        </Button>
      </CardContent>
    </Card>
  );
}