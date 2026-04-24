"use client";

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { 
  MessageCircle, 
  Send, 
  CheckCircle2, 
  Users, 
  Loader2,
  Trash2,
  Search,
  Wifi,
  WifiOff,
  Clock,
  AlertCircle,
  Zap
} from 'lucide-react';
import { useFirestore, useDoc, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { doc, setDoc, collection, deleteDoc, collectionGroup } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { sendAutomatedMessage, formatEgyptianNumber } from '@/lib/whatsapp-utils';

export default function WhatsAppDashboard() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  
  // إعدادات الربط
  const [gatewayConfig, setGatewayConfig] = useState({
    senderNumber: '',
    apiKey: '',
    instanceId: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  // إعدادات البث
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [targetType, setTargetType] = useState<'all' | 'course' | 'specific'>('all');
  const [audienceTarget, setAudienceTarget] = useState<'student' | 'parent' | 'both'>('student');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [sendDelay, setSendDelay] = useState(5); // ثواني بين كل رسالة

  // حالة الإرسال الآلي
  const [isSending, setIsSending] = useState(false);
  const [sendingProgress, setSendingProgress] = useState({ current: 0, total: 0 });

  const configRef = useMemoFirebase(() => (firestore ? doc(firestore, 'admin_config', 'whatsapp') : null), [firestore]);
  const { data: savedConfig } = useDoc(configRef);

  useEffect(() => {
    if (savedConfig) {
      setGatewayConfig({
        senderNumber: savedConfig.senderNumber || '',
        apiKey: savedConfig.apiKey || '',
        instanceId: savedConfig.instanceId || ''
      });
    }
  }, [savedConfig]);

  const studentsRef = useMemoFirebase(() => (firestore ? collection(firestore, 'students') : null), [firestore]);
  const coursesRef = useMemoFirebase(() => (firestore ? collection(firestore, 'courses') : null), [firestore]);
  const enrollmentsGroupRef = useMemoFirebase(() => (firestore ? collectionGroup(firestore, 'enrollments') : null), [firestore]);
  
  const { data: students } = useCollection(studentsRef);
  const { data: courses } = useCollection(coursesRef);
  const { data: allEnrollments } = useCollection(enrollmentsGroupRef);

  const filteredStudents = useMemo(() => {
    if (!students) return [];
    let list = [...students];
    if (targetType === 'course' && selectedCourseId) {
      const courseStudentIds = allEnrollments?.filter(en => en.courseId === selectedCourseId).map(en => en.studentId) || [];
      list = list.filter(s => courseStudentIds.includes(s.id));
    }
    if (searchTerm) {
      const sLower = searchTerm.toLowerCase();
      list = list.filter(s => (s.name || '').toLowerCase().includes(sLower) || (s.studentPhoneNumber || '').includes(sLower));
    }
    return list;
  }, [students, targetType, selectedCourseId, searchTerm, allEnrollments]);

  const handleToggleStudent = (id: string) => {
    setSelectedStudentIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleSaveConfig = async () => {
    if (!firestore || !gatewayConfig.senderNumber) return;
    setIsSaving(true);
    try {
      await setDoc(doc(firestore, 'admin_config', 'whatsapp'), { 
        ...gatewayConfig, 
        status: gatewayConfig.apiKey ? 'connected' : 'standalone', 
        lastUpdated: new Date().toISOString() 
      }, { merge: true });
      toast({ title: "تم حفظ الإعدادات بنجاح" });
    } catch (e) { console.error(e); } finally { setIsSaving(false); }
  };

  const startAutomatedBroadcast = async () => {
    if (!broadcastMessage || isSending) return;
    
    const targets = targetType === 'specific' ? students?.filter(s => selectedStudentIds.includes(s.id)) : filteredStudents;
    if (!targets || targets.length === 0) {
      toast({ variant: "destructive", title: "لا يوجد مستلمون مختارون" });
      return;
    }

    setIsSending(true);
    setSendingProgress({ current: 0, total: targets.length });

    for (let i = 0; i < targets.length; i++) {
      const s = targets[i];
      setSendingProgress(p => ({ ...p, current: i + 1 }));

      // إرسال للطالب
      if (audienceTarget === 'student' || audienceTarget === 'both') {
        await sendAutomatedMessage(s.studentPhoneNumber, broadcastMessage, savedConfig as any);
      }
      
      // إرسال لولي الأمر
      if (audienceTarget === 'parent' || audienceTarget === 'both') {
        await sendAutomatedMessage(s.parentPhoneNumber, broadcastMessage, savedConfig as any);
      }

      // تأخير زمني لمنع الحظر
      if (i < targets.length - 1) {
        await new Promise(resolve => setTimeout(resolve, sendDelay * 1000));
      }
    }

    setIsSending(false);
    toast({ title: "اكتمل البث الآلي", description: `تمت مراسلة ${targets.length} طالب بنجاح.` });
    setBroadcastMessage('');
  };

  if (isUserLoading) return <div className="flex justify-center py-20"><Loader2 className="w-10 animate-spin text-primary" /></div>;

  const isApiReady = !!(savedConfig?.apiKey && savedConfig?.instanceId);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20 text-right">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-headline font-black mb-2 flex items-center gap-3 justify-end">
            منظومة المراسلة الآلية <MessageCircle className="w-10 h-10 text-accent" />
          </h1>
          <p className="text-muted-foreground font-bold">إرسال تلقائي في الخلفية مع نظام حماية من الحظر.</p>
        </div>
        <div className={`px-6 py-3 rounded-2xl border flex items-center gap-3 shadow-lg ${isApiReady ? 'bg-accent/10 border-accent/20 text-accent' : 'bg-orange-500/10 border-orange-500/20 text-orange-500'}`}>
           {isApiReady ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
           <span className="font-black text-sm">{isApiReady ? 'الربط الآلي نشط' : 'وضع الإرسال اليدوي'}</span>
        </div>
      </div>

      <Tabs defaultValue="broadcast" className="space-y-8">
        <TabsList className="bg-card border h-16 p-1.5 rounded-3xl">
          <TabsTrigger value="broadcast" className="h-full rounded-2xl px-8 font-black">البث الآلي المطور</TabsTrigger>
          <TabsTrigger value="config" className="h-full rounded-2xl px-8 font-black">إعدادات الربط الحقيقي</TabsTrigger>
        </TabsList>

        <TabsContent value="broadcast" className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-1 bg-card border-primary/10 rounded-[2rem] overflow-hidden flex flex-col h-[750px]">
               <CardHeader className="bg-secondary/10 border-b p-6">
                  <div className="space-y-4">
                     <div className="space-y-1">
                        <Label className="text-[10px] font-black opacity-50">الفئة المستهدفة</Label>
                        <Select value={targetType} onValueChange={(v:any) => setTargetType(v)}>
                           <SelectTrigger className="h-10 bg-background font-bold"><SelectValue placeholder="اختر الفئة" /></SelectTrigger>
                           <SelectContent>
                              <SelectItem value="all">كل طلاب المنصة</SelectItem>
                              <SelectItem value="course">طلاب كورس معين</SelectItem>
                              <SelectItem value="specific">تحديد يدوي</SelectItem>
                           </SelectContent>
                        </Select>
                     </div>

                     {targetType === 'course' && (
                        <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                           <SelectTrigger className="h-10 bg-background font-bold"><SelectValue placeholder="اختر الكورس" /></SelectTrigger>
                           <SelectContent>
                              {courses?.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                           </SelectContent>
                        </Select>
                     )}
                     
                     <div className="bg-primary/5 p-4 rounded-xl space-y-3">
                        <Label className="text-xs font-black">جهة الإرسال:</Label>
                        <RadioGroup value={audienceTarget} onValueChange={(v:any) => setAudienceTarget(v)} className="flex flex-col gap-2">
                           <div className="flex items-center gap-2 justify-end"><Label>الطالب فقط</Label><RadioGroupItem value="student" /></div>
                           <div className="flex items-center gap-2 justify-end"><Label>ولي الأمر فقط</Label><RadioGroupItem value="parent" /></div>
                           <div className="flex items-center gap-2 justify-end"><Label>الاثنين معاً</Label><RadioGroupItem value="both" /></div>
                        </RadioGroup>
                     </div>

                     <div className="relative">
                        <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                        <Input placeholder="بحث بالاسم أو الهاتف..." className="h-9 pr-7 text-[11px] text-right" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                     </div>
                  </div>
               </CardHeader>
               <CardContent className="p-0 flex-grow">
                  <ScrollArea className="h-full">
                     <div className="p-4 space-y-2">
                        {filteredStudents.map(s => (
                           <div key={s.id} className={`flex flex-row-reverse items-center justify-between p-3 rounded-xl border transition-all ${selectedStudentIds.includes(s.id) ? 'bg-primary/10 border-primary/40' : 'bg-secondary/5 border-white/5'}`}>
                              <div className="flex flex-row-reverse items-center gap-3">
                                 <Checkbox checked={selectedStudentIds.includes(s.id)} onCheckedChange={() => handleToggleStudent(s.id)} />
                                 <div className="text-right">
                                    <p className="text-[11px] font-black">{s.name}</p>
                                    <p className="text-[9px] text-muted-foreground font-mono" dir="ltr">{s.studentPhoneNumber}</p>
                                 </div>
                              </div>
                           </div>
                        ))}
                     </div>
                  </ScrollArea>
               </CardContent>
            </Card>

            <Card className="lg:col-span-2 bg-card border-primary/10 rounded-[2rem] overflow-hidden shadow-2xl flex flex-col h-[750px]">
               <CardHeader className="bg-secondary/10 p-8 border-b">
                  <div className="flex justify-between items-center flex-row-reverse">
                    <CardTitle className="text-3xl font-black">نص الرسالة الجماعية</CardTitle>
                    <div className="flex items-center gap-4 bg-background/50 px-4 py-2 rounded-2xl border">
                       <span className="text-[10px] font-black">تأخير: {sendDelay} ث</span>
                       <Input type="range" min="3" max="30" value={sendDelay} onChange={(e) => setSendDelay(Number(e.target.value))} className="w-24 h-4" />
                    </div>
                  </div>
               </CardHeader>
               <CardContent className="p-8 flex-grow flex flex-col gap-6">
                  <Textarea 
                    placeholder="اكتب رسالتك هنا.. سيتم الإرسال آلياً مع مراعاة التأخير الزمني."
                    className="flex-grow bg-secondary/10 rounded-[2rem] border-primary/10 p-8 font-bold text-xl text-right resize-none focus:border-primary"
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    disabled={isSending}
                  />

                  {isSending && (
                    <div className="space-y-2 animate-in slide-in-from-bottom duration-500">
                       <div className="flex justify-between text-xs font-black text-primary">
                          <span>جاري الإرسال: {sendingProgress.current} / {sendingProgress.total}</span>
                          <span>{Math.round((sendingProgress.current / sendingProgress.total) * 100)}%</span>
                       </div>
                       <Progress value={(sendingProgress.current / sendingProgress.total) * 100} className="h-3 bg-secondary rounded-full" />
                       <p className="text-center text-[10px] text-muted-foreground flex items-center justify-center gap-2">
                          <Clock className="w-3 h-3 animate-spin" /> نستخدم تأخير {sendDelay} ثوانٍ لحماية حسابك من الحظر.
                       </p>
                    </div>
                  )}

                  {!isApiReady && (
                    <div className="flex items-center gap-2 p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl text-orange-500 text-[11px] font-bold">
                       <AlertCircle className="w-4 h-4 shrink-0" />
                       <span>ملاحظة: لعدم وجود API Key، سيقوم النظام بفتح المحادثات يدوياً. للتشغيل الآلي بالكامل يرجى مراجعة صفحة الإعدادات.</span>
                    </div>
                  )}

                  <Button 
                    className={`w-full h-20 text-white font-black text-2xl rounded-[2rem] shadow-2xl gap-4 transition-all active:scale-95 ${isSending ? 'bg-secondary' : 'bg-accent hover:bg-accent/90'}`}
                    onClick={startAutomatedBroadcast}
                    disabled={!broadcastMessage || isSending}
                  >
                    {isSending ? <Loader2 className="w-8 h-8 animate-spin" /> : <Zap className="w-8 h-8" />}
                    {isSending ? "جاري البث الآلي..." : "بدء الإرسال التلقائي"}
                  </Button>
               </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="config">
           <Card className="max-w-3xl mx-auto bg-card border-primary/10 rounded-[2.5rem] p-10 space-y-10 text-right">
              <div className="text-center space-y-2">
                 <h2 className="text-3xl font-black text-primary">إعدادات الربط الحقيقي</h2>
                 <p className="text-muted-foreground font-bold">اربط المنصة ببوابة API لإرسال آلي وتلقائي 100%.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-3">
                    <Label className="font-black mr-2">رقم الواتساب الرسمي (المرسل)</Label>
                    <Input 
                      placeholder="010..." 
                      className="h-14 text-center text-xl font-black rounded-2xl bg-secondary/20"
                      value={gatewayConfig.senderNumber}
                      onChange={(e) => setGatewayConfig({...gatewayConfig, senderNumber: e.target.value})}
                    />
                 </div>
                 <div className="space-y-3">
                    <Label className="font-black mr-2">Instance ID (المعرف)</Label>
                    <Input 
                      placeholder="مثال: instance12345" 
                      className="h-14 text-center font-mono rounded-2xl bg-secondary/20"
                      value={gatewayConfig.instanceId}
                      onChange={(e) => setGatewayConfig({...gatewayConfig, instanceId: e.target.value})}
                    />
                 </div>
              </div>

              <div className="space-y-3">
                 <Label className="font-black mr-2">API Key (مفتاح الربط الاحترافي)</Label>
                 <Input 
                   type="password"
                   placeholder="ألصق مفتاح الـ API هنا" 
                   className="h-14 text-center font-mono rounded-2xl bg-secondary/20"
                   value={gatewayConfig.apiKey}
                   onChange={(e) => setGatewayConfig({...gatewayConfig, apiKey: e.target.value})}
                 />
              </div>

              <div className="flex flex-col gap-4">
                 <Button onClick={handleSaveConfig} disabled={isSaving || !gatewayConfig.senderNumber} className="w-full h-16 bg-primary text-primary-foreground font-black text-lg rounded-2xl shadow-xl">
                   {isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : "حفظ وتفعيل الربط الحقيقي"}
                 </Button>
                 
                 {savedConfig?.senderNumber && (
                    <Button onClick={() => deleteDoc(doc(firestore!, 'admin_config', 'whatsapp'))} variant="ghost" className="text-destructive font-bold h-12">
                      <Trash2 className="w-4 h-4 ml-2" /> حذف الرقم وإلغاء الربط
                    </Button>
                 )}
              </div>

              <div className="p-6 bg-secondary/10 rounded-[2rem] border border-dashed border-white/5 space-y-4">
                 <h4 className="font-black text-sm flex items-center gap-2 justify-end">توجيهات فنية <AlertCircle className="w-4 h-4 text-primary" /></h4>
                 <ul className="text-[10px] text-muted-foreground space-y-2 font-bold leading-relaxed">
                    <li>• نوصي بترك تأخير لا يقل عن 5 ثوانٍ بين الرسائل في حالة البث الكبير.</li>
                    <li>• كود الدولة المصري (+20) يتم إضافته آلياً بواسطة النظام.</li>
                    <li>• في حالة عدم استخدام API Key، سيعود النظام لوضع "فتح المحادثات" اليدوي.</li>
                 </ul>
              </div>
           </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
