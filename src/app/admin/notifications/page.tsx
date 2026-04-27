"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Megaphone, Send, Loader2, Users, Clock, Trash2, Zap, MessageCircle } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, addDoc, serverTimestamp, orderBy, query, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { sendAutomatedMessage, formatNotificationMessage } from '@/lib/whatsapp-utils';

export default function AdminNotifications() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetType, setTargetType] = useState('all');
  const [targetCourseId, setTargetCourseId] = useState('');
  
  const [isSending, setIsSending] = useState(false);
  const [isBatchWhatsApp, setIsBatchWhatsApp] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  const configRef = useMemoFirebase(() => (firestore ? doc(firestore, 'admin_config', 'whatsapp') : null), [firestore]);
  const { data: whatsappConfig } = useDoc(configRef);

  const coursesRef = useMemoFirebase(() => (firestore ? collection(firestore, 'courses') : null), [firestore]);
  const { data: courses } = useCollection(coursesRef);

  const notificationsRef = useMemoFirebase(() => (firestore && user) ? query(collection(firestore, 'notifications'), orderBy('createdAt', 'desc')) : null, [firestore, user]);
  const { data: pastNotifications } = useCollection(notificationsRef);

  const handleSendPlatform = async () => {
    if (!firestore || !title || !message) return;
    setIsSending(true);
    try {
      await addDoc(collection(firestore, 'notifications'), {
        title, message, targetType,
        targetCourseId: targetType === 'course' ? targetCourseId : null,
        createdAt: serverTimestamp(),
      });
      toast({ title: "تم النشر", description: "وصل الإشعار للطلاب داخل المنصة." });
      if (!isBatchWhatsApp) { setTitle(''); setMessage(''); }
    } catch (e: any) { console.error(e); } finally { setIsSending(false); }
  };

  const handleWhatsAppBroadcast = async () => {
    if (!title || !message || !firestore) {
      toast({ variant: "destructive", title: "بيانات ناقصة" });
      return;
    }

    setIsBatchWhatsApp(true);
    try {
      let targets: any[] = [];
      const studentsSnap = await getDocs(collection(firestore, 'students'));
      const allStudents = studentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      if (targetType === 'all') {
        targets = allStudents;
      } else {
        const enrollmentsSnap = await getDocs(collection(firestore, 'enrollments'));
        const courseStudentIds = enrollmentsSnap.docs
          .map(d => d.data())
          .filter(en => en.courseId === targetCourseId)
          .map(en => en.studentId);
        targets = allStudents.filter(s => courseStudentIds.includes(s.id));
      }

      setBatchProgress({ current: 0, total: targets.length });
      const waMsg = formatNotificationMessage(title, message);

      for (let i = 0; i < targets.length; i++) {
        const s = targets[i];
        setBatchProgress(p => ({ ...p, current: i + 1 }));
        
        await sendAutomatedMessage(s.studentPhoneNumber, waMsg, whatsappConfig as any);
        // تأخير 6 ثوانٍ بين كل رسالة لحماية الرقم
        if (i < targets.length - 1) {
          await new Promise(r => setTimeout(r, 6000));
        }
      }

      toast({ title: "اكتمل البث الآلي", description: `تمت مراسلة ${targets.length} طالب عبر واتساب.` });
      setTitle(''); setMessage('');
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "خطأ في البث الآلي" });
    } finally {
      setIsBatchWhatsApp(false);
    }
  };

  if (isUserLoading) return <div className="flex justify-center py-20"><Loader2 className="w-10 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 text-right pb-20">
      <div className="flex items-center gap-4 justify-end">
        <div className="text-right">
          <h1 className="text-4xl font-headline font-black">مركز الإشعارات المطور</h1>
          <p className="text-muted-foreground font-bold">تواصل آلياً مع طلابك عبر المنصة والواتساب في وقت واحد.</p>
        </div>
        <div className="w-16 h-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Megaphone className="w-10 h-10" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="bg-card border-primary/10 shadow-2xl rounded-[2.5rem] overflow-hidden">
          <CardHeader className="bg-secondary/10 p-8 border-b">
            <CardTitle className="text-2xl font-black flex items-center gap-3 justify-end">
              إنشاء إشعار جديد <Send className="w-6 h-6 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-black mr-2">عنوان الرسالة</label>
              <Input placeholder="مثال: موعد المراجعة النهائية" value={title} onChange={(e) => setTitle(e.target.value)} className="h-14 bg-background border-primary/5 rounded-2xl font-bold text-right" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-black mr-2">نص الرسالة</label>
              <Textarea placeholder="اكتب تفاصيل الإشعار هنا..." value={message} onChange={(e) => setMessage(e.target.value)} className="min-h-[180px] bg-background border-primary/5 rounded-2xl font-bold text-right resize-none" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-black mr-2">الفئة المستهدفة</label>
                <Select value={targetType} onValueChange={setTargetType}>
                  <SelectTrigger className="h-12 bg-background font-bold rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الطلاب</SelectItem>
                    <SelectItem value="course">طلاب كورس معين</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {targetType === 'course' && (
                <div className="space-y-2">
                  <label className="text-xs font-black mr-2">اختر الكورس</label>
                  <Select value={targetCourseId} onValueChange={setTargetCourseId}>
                    <SelectTrigger className="h-12 bg-background font-bold rounded-xl"><SelectValue placeholder="اختر الكورس" /></SelectTrigger>
                    <SelectContent>
                      {courses?.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {isBatchWhatsApp && (
               <div className="space-y-2 animate-in slide-in-from-bottom duration-300">
                  <div className="flex justify-between text-[10px] font-black text-accent">
                     <span>جاري البث الآلي: {batchProgress.current} / {batchProgress.total}</span>
                     <span>{Math.round((batchProgress.current/batchProgress.total)*100)}%</span>
                  </div>
                  <Progress value={(batchProgress.current/batchProgress.total)*100} className="h-2 bg-secondary" />
               </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              <Button 
                onClick={handleSendPlatform}
                disabled={isSending || isBatchWhatsApp || !title || !message}
                className="h-16 bg-primary text-primary-foreground font-black rounded-2xl shadow-xl shadow-primary/10 text-lg gap-2"
              >
                {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Megaphone className="w-6 h-6" />} إرسال للمنصة
              </Button>
              <Button 
                onClick={handleWhatsAppBroadcast}
                disabled={isBatchWhatsApp || !title || !message}
                variant="outline"
                className="h-16 border-accent/30 text-accent font-black rounded-2xl text-lg gap-2 hover:bg-accent/5 shadow-xl shadow-accent/5"
              >
                {isBatchWhatsApp ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-6 h-6" />} بث آلي (واتساب)
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-card border-primary/5 rounded-[2.5rem] overflow-hidden shadow-lg h-full">
            <CardHeader className="bg-secondary/5 border-b p-6"><CardTitle className="text-xl font-black">سجل الإشعارات</CardTitle></CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[600px]">
                {!pastNotifications || pastNotifications.length === 0 ? (
                  <div className="p-20 text-center text-muted-foreground opacity-30 italic font-bold">لا توجد إشعارات مرسلة بعد.</div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {pastNotifications.map((notif: any) => (
                      <div key={notif.id} className="p-6 hover:bg-secondary/10 transition-colors group">
                        <div className="flex justify-between items-start mb-2">
                          <Badge className="bg-primary/10 text-primary border-none text-[8px]">{notif.targetType === 'all' ? 'الكل' : 'كورس'}</Badge>
                          <h4 className="font-black text-primary text-base">{notif.title}</h4>
                        </div>
                        <p className="text-sm text-muted-foreground font-bold line-clamp-3 mb-4">{notif.message}</p>
                        <div className="flex items-center justify-between">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-all rounded-full" onClick={() => deleteDoc(doc(firestore!, 'notifications', notif.id))}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          <div className="flex items-center gap-3 text-[9px] text-muted-foreground font-bold">
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {notif.createdAt?.toDate ? notif.createdAt.toDate().toLocaleString('ar-EG') : '...'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
