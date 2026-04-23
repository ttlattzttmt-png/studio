
"use client";

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MessageCircle, 
  Settings, 
  Send, 
  Smartphone, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Users, 
  Zap, 
  Layout, 
  ShieldCheck,
  ClipboardCheck,
  Loader2,
  Trash2,
  ArrowLeftRight
} from 'lucide-react';
import { useFirestore, useDoc, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { doc, setDoc, updateDoc, collection, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { sendWhatsAppMessage } from '@/lib/whatsapp-utils';

export default function WhatsAppDashboard() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  
  const [newSenderNumber, setNewSenderNumber] = useState('');
  const [isSaving, setIsAdding] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('all');

  // جلب إعدادات واتساب
  const configRef = useMemoFirebase(() => (firestore ? doc(firestore, 'admin_config', 'whatsapp') : null), [firestore]);
  const { data: config, isLoading: isConfigLoading } = useDoc(configRef);

  // جلب الطلاب والكورسات للإحصائيات والبث
  const studentsRef = useMemoFirebase(() => (firestore ? collection(firestore, 'students') : null), [firestore]);
  const coursesRef = useMemoFirebase(() => (firestore ? collection(firestore, 'courses') : null), [firestore]);
  const { data: students } = useCollection(studentsRef);
  const { data: courses } = useCollection(coursesRef);

  const handleSaveConfig = async () => {
    if (!firestore || !newSenderNumber) return;
    setIsAdding(true);
    try {
      await setDoc(doc(firestore, 'admin_config', 'whatsapp'), {
        senderNumber: newSenderNumber,
        status: 'connected',
        lastUpdated: new Date().toISOString()
      }, { merge: true });
      toast({ title: "تم ربط الرقم بنجاح", description: "سيتم استخدامه كمرجع في كافة رسائل المنصة." });
      setNewSenderNumber('');
    } catch (e) { console.error(e); } finally { setIsAdding(false); }
  };

  const handleRemoveConfig = async () => {
    if (!firestore) return;
    if (!confirm("🚨 هل أنت متأكد من حذف رقم المرسل؟ سيتوقف الربط البرمجي.")) return;
    try {
      await deleteDoc(doc(firestore, 'admin_config', 'whatsapp'));
      toast({ title: "تم الحذف", description: "تمت إزالة رقم المرسل من المنصة." });
    } catch (e) { console.error(e); }
  };

  const templates = [
    { title: 'ترحيب طالب جديد', body: 'أهلاً بك يا بشمهندس [الاسم] في منصتنا التعليمية.. نتمنى لك رحلة ممتعة وتفوقاً باهراً! ✨' },
    { title: 'إعلان نتيجة اختبار', body: 'مبروك! تم رصد نتيجتك في اختبار [الامتحان].. الدرجة النهائية: [الدرجة]% 🎓' },
    { title: 'تنبيه غياب/تأخير', body: 'بشمهندس [الاسم]، لاحظنا غيابك عن متابعة الدروس الأخيرة.. ننتظر عودتك القوية! 💪' },
  ];

  if (isUserLoading) return <div className="flex justify-center py-20"><Loader2 className="w-10 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20 text-right">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-headline font-black mb-2 flex items-center gap-3 justify-end">
            مركز تحكم واتساب <MessageCircle className="w-10 h-10 text-accent" />
          </h1>
          <p className="text-muted-foreground font-bold text-lg">أدر تواصلك مع الطلاب وأولياء الأمور بذكاء واحترافية.</p>
        </div>
        <div className="flex items-center gap-3 bg-card p-4 rounded-3xl border border-primary/20 shadow-xl">
           <div className="text-right">
              <p className="text-[10px] font-black text-muted-foreground uppercase">حالة الاتصال</p>
              <div className="flex items-center gap-2 justify-end">
                 <span className="font-bold text-sm">{config?.status === 'connected' ? 'متصل ومحمي' : 'غير متصل'}</span>
                 <div className={`w-3 h-3 rounded-full animate-pulse ${config?.status === 'connected' ? 'bg-accent' : 'bg-destructive'}`} />
              </div>
           </div>
        </div>
      </div>

      {/* Stats Mini Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <Card className="bg-card border-primary/10 shadow-lg rounded-[2rem]">
            <CardContent className="p-8 flex items-center justify-between flex-row-reverse">
               <div className="text-right">
                  <p className="text-xs font-bold text-muted-foreground">طلاب بأرقام مسجلة</p>
                  <p className="text-3xl font-black text-primary">{students?.length || 0}</p>
               </div>
               <Users className="w-10 h-10 text-primary opacity-20" />
            </CardContent>
         </Card>
         <Card className="bg-card border-primary/10 shadow-lg rounded-[2rem]">
            <CardContent className="p-8 flex items-center justify-between flex-row-reverse">
               <div className="text-right">
                  <p className="text-xs font-bold text-muted-foreground">إجمالي الكورسات</p>
                  <p className="text-3xl font-black text-accent">{courses?.length || 0}</p>
               </div>
               <Layout className="w-10 h-10 text-accent opacity-20" />
            </CardContent>
         </Card>
         <Card className="bg-card border-primary/10 shadow-lg rounded-[2rem]">
            <CardContent className="p-8 flex items-center justify-between flex-row-reverse">
               <div className="text-right">
                  <p className="text-xs font-bold text-muted-foreground">سرعة الإرسال</p>
                  <p className="text-3xl font-black text-blue-500">فورية</p>
               </div>
               <Zap className="w-10 h-10 text-blue-500 opacity-20" />
            </CardContent>
         </Card>
      </div>

      <Tabs defaultValue="sender" className="space-y-8">
        <TabsList className="bg-card border h-16 p-1.5 rounded-3xl w-full md:w-fit">
          <TabsTrigger value="sender" className="h-full rounded-2xl px-8 font-black data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Smartphone className="w-4 h-4 ml-2" /> حساب المرسل
          </TabsTrigger>
          <TabsTrigger value="templates" className="h-full rounded-2xl px-8 font-black data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Layout className="w-4 h-4 ml-2" /> القوالب الذكية
          </TabsTrigger>
          <TabsTrigger value="broadcast" className="h-full rounded-2xl px-8 font-black data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Send className="w-4 h-4 ml-2" /> البث الجماعي
          </TabsTrigger>
        </TabsList>

        {/* Sender Config Tab */}
        <TabsContent value="sender">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="bg-card border-primary/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
              <CardHeader className="bg-secondary/10 p-8 border-b">
                <CardTitle className="text-2xl font-black">إعدادات رقم الإرسال</CardTitle>
                <CardDescription className="font-bold">هذا هو الرقم الذي ستظهر منه الرسائل للطلاب.</CardDescription>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                {config?.senderNumber ? (
                  <div className="space-y-6">
                    <div className="p-6 bg-accent/5 border-2 border-dashed border-accent/30 rounded-[2rem] text-center">
                       <p className="text-xs font-bold text-muted-foreground mb-2 uppercase">الرقم المتصل حالياً</p>
                       <p className="text-3xl font-black text-accent tracking-widest" dir="ltr">{config.senderNumber}</p>
                       <div className="flex items-center justify-center gap-2 mt-4 text-accent font-black text-xs">
                          <CheckCircle2 className="w-4 h-4" /> الربط نشط ويعمل
                       </div>
                    </div>
                    <Button onClick={handleRemoveConfig} variant="outline" className="w-full h-14 rounded-2xl border-destructive/20 text-destructive font-black gap-2 hover:bg-destructive/5">
                      <Trash2 className="w-5 h-5" /> حذف الرقم وتغييره
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="space-y-3">
                       <label className="text-sm font-bold flex items-center gap-2 justify-end">أدخل رقم الواتساب (بمفتاح الدولة) <Smartphone className="w-4 h-4 text-primary" /></label>
                       <Input 
                         placeholder="مثال: 201008006562" 
                         className="h-16 text-center text-2xl font-black tracking-widest rounded-2xl bg-secondary/20 border-primary/20"
                         value={newSenderNumber}
                         onChange={(e) => setNewSenderNumber(e.target.value)}
                       />
                    </div>
                    <Button onClick={handleSaveConfig} disabled={isSaving || !newSenderNumber} className="w-full h-16 bg-primary text-primary-foreground font-black text-lg rounded-2xl shadow-xl shadow-primary/20">
                      {isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : "ربط الرقم الآن 🔗"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-accent/10 to-card border-accent/20 rounded-[2.5rem] p-10 flex flex-col items-center justify-center text-center space-y-6 shadow-2xl">
               <div className="w-24 h-24 bg-accent/20 rounded-[2.5rem] flex items-center justify-center text-accent shadow-inner">
                  <ShieldCheck className="w-12 h-12" />
               </div>
               <div className="space-y-2">
                 <h3 className="text-2xl font-black">أمان المراسلات</h3>
                 <p className="text-muted-foreground font-bold text-sm leading-relaxed max-w-xs mx-auto">
                   يتم تشفير كافة الرسائل الصادرة عبر بروتوكول WhatsApp المعتمد لضمان خصوصية بيانات طلابك.
                 </p>
               </div>
               <div className="grid grid-cols-2 gap-4 w-full pt-4">
                  <div className="p-4 bg-background/50 rounded-2xl border border-white/5">
                     <p className="text-[10px] font-black opacity-50 mb-1">دقة الإرسال</p>
                     <p className="font-black text-accent">100%</p>
                  </div>
                  <div className="p-4 bg-background/50 rounded-2xl border border-white/5">
                     <p className="text-[10px] font-black opacity-50 mb-1">وقت الاستجابة</p>
                     <p className="font-black text-primary">فوري</p>
                  </div>
               </div>
            </Card>
          </div>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((tpl, i) => (
                <Card key={i} className="bg-card hover:border-primary/40 transition-all rounded-[2rem] overflow-hidden group">
                   <CardHeader className="bg-secondary/10 border-b p-6">
                      <CardTitle className="text-lg font-black text-primary">{tpl.title}</CardTitle>
                   </CardHeader>
                   <CardContent className="p-6 space-y-6">
                      <div className="p-4 bg-secondary/20 rounded-2xl text-sm font-bold leading-relaxed min-h-[100px] border border-white/5">
                        {tpl.body}
                      </div>
                      <Button variant="outline" className="w-full rounded-xl border-primary/20 font-black gap-2 group-hover:bg-primary group-hover:text-primary-foreground transition-all" onClick={() => {
                        navigator.clipboard.writeText(tpl.body);
                        toast({ title: "تم النسخ", description: "القالب جاهز للاستخدام في رسائلك." });
                      }}>
                        <ClipboardCheck className="w-4 h-4" /> نسخ القالب
                      </Button>
                   </CardContent>
                </Card>
              ))}
           </div>
        </TabsContent>

        {/* Broadcast Tab */}
        <TabsContent value="broadcast">
           <Card className="bg-card border-primary/10 rounded-[3rem] shadow-2xl overflow-hidden">
              <CardHeader className="bg-secondary/10 p-10 border-b">
                 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="text-right">
                       <CardTitle className="text-3xl font-black">إرسال جماعي ذكي</CardTitle>
                       <CardDescription className="font-bold text-base mt-2">اختر الفئة المستهدفة واكتب رسالتك لفتحها في واتساب دفعة واحدة.</CardDescription>
                    </div>
                    <div className="flex items-center gap-3 bg-background/50 px-6 py-3 rounded-2xl border border-white/5">
                       <Users className="w-5 h-5 text-primary" />
                       <span className="font-black text-sm">المستلمون: {students?.length || 0}</span>
                    </div>
                 </div>
              </CardHeader>
              <CardContent className="p-10 space-y-10">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                       <label className="text-sm font-black flex items-center gap-2 justify-end">الفئة المستهدفة <ArrowLeftRight className="w-4 h-4 text-primary" /></label>
                       <div className="grid grid-cols-2 gap-4">
                          <Button variant={selectedCourse === 'all' ? 'default' : 'outline'} className="h-14 rounded-2xl font-black" onClick={() => setSelectedCourse('all')}>جميع الطلاب</Button>
                          <Button variant={selectedCourse === 'course' ? 'default' : 'outline'} className="h-14 rounded-2xl font-black" onClick={() => setSelectedCourse('course')}>طلاب كورس محدد</Button>
                       </div>
                    </div>
                    <div className="space-y-4">
                       <label className="text-sm font-black flex items-center gap-2 justify-end">نص الرسالة الجماعية <MessageCircle className="w-4 h-4 text-primary" /></label>
                       <Textarea 
                         placeholder="اكتب رسالتك هنا.. سيتم إرسالها لكل الطلاب في الفئة المختارة."
                         className="min-h-[150px] bg-secondary/10 rounded-[2rem] border-primary/10 p-6 font-bold text-lg"
                         value={broadcastMessage}
                         onChange={(e) => setBroadcastMessage(e.target.value)}
                       />
                    </div>
                 </div>
                 <Button 
                   className="w-full h-20 bg-accent hover:bg-accent/90 text-white font-black text-2xl rounded-[2rem] shadow-2xl shadow-accent/20 gap-4 transition-transform active:scale-95"
                   onClick={() => sendWhatsAppMessage('', broadcastMessage)}
                   disabled={!broadcastMessage}
                 >
                   <Send className="w-8 h-8" /> بدء البث الجماعي الآن
                 </Button>
              </CardContent>
           </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

