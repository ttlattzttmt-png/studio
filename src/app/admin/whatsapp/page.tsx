
"use client";

import { useState, useMemo } from 'react';
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
import { 
  MessageCircle, 
  Send, 
  Smartphone, 
  CheckCircle2, 
  Users, 
  Zap, 
  Loader2,
  Trash2,
  Search,
  Wifi,
  WifiOff
} from 'lucide-react';
import { useFirestore, useDoc, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { doc, setDoc, collection, deleteDoc, collectionGroup } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { sendWhatsAppMessage } from '@/lib/whatsapp-utils';

export default function WhatsAppDashboard() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  
  const [newSenderNumber, setNewSenderNumber] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [targetType, setTargetType] = useState<'all' | 'course' | 'specific'>('all');
  const [audienceTarget, setAudienceTarget] = useState<'student' | 'parent' | 'both'>('student');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  const configRef = useMemoFirebase(() => (firestore ? doc(firestore, 'admin_config', 'whatsapp') : null), [firestore]);
  const { data: config } = useDoc(configRef);
  const isConnected = !!config?.senderNumber;

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
    if (!firestore || !newSenderNumber) return;
    setIsSaving(true);
    try {
      await setDoc(doc(firestore, 'admin_config', 'whatsapp'), { senderNumber: newSenderNumber, status: 'connected', lastUpdated: new Date().toISOString() }, { merge: true });
      toast({ title: "تم الربط بنجاح" });
      setNewSenderNumber('');
    } catch (e) { console.error(e); } finally { setIsSaving(false); }
  };

  const startBroadcastAction = () => {
    if (!broadcastMessage) return;
    const targets = targetType === 'specific' ? students?.filter(s => selectedStudentIds.includes(s.id)) : filteredStudents;
    if (!targets || targets.length === 0) {
      toast({ variant: "destructive", title: "لا يوجد مستلمون" });
      return;
    }

    targets.forEach(s => {
      if (audienceTarget === 'student' || audienceTarget === 'both') sendWhatsAppMessage(s.studentPhoneNumber, broadcastMessage);
      if (audienceTarget === 'parent' || audienceTarget === 'both') sendWhatsAppMessage(s.parentPhoneNumber, broadcastMessage);
    });

    toast({ title: "تم بدء البث", description: "سيقوم النظام بفتح المحادثات المختارة تباعاً." });
  };

  if (isUserLoading) return <div className="flex justify-center py-20"><Loader2 className="w-10 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20 text-right">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-headline font-black mb-2 flex items-center gap-3 justify-end">
            مركز المراسلة الذكي <MessageCircle className="w-10 h-10 text-accent" />
          </h1>
          <p className="text-muted-foreground font-bold">تحكم في هوية المرسل وحدد وجهة الرسائل (طالب/ولي أمر).</p>
        </div>
        <div className={`px-6 py-3 rounded-2xl border flex items-center gap-3 shadow-lg ${isConnected ? 'bg-accent/10 border-accent/20 text-accent' : 'bg-destructive/10 border-destructive/20 text-destructive'}`}>
           {isConnected ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
           <span className="font-black text-sm">{isConnected ? 'النظام نشط' : 'النظام غير مفعل'}</span>
        </div>
      </div>

      <Tabs defaultValue="broadcast" className="space-y-8">
        <TabsList className="bg-card border h-16 p-1.5 rounded-3xl">
          <TabsTrigger value="broadcast" className="h-full rounded-2xl px-8 font-black">البث المطور</TabsTrigger>
          <TabsTrigger value="sender" className="h-full rounded-2xl px-8 font-black">إعدادات الرقم</TabsTrigger>
        </TabsList>

        <TabsContent value="broadcast" className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-1 bg-card border-primary/10 rounded-[2rem] overflow-hidden flex flex-col h-[700px]">
               <CardHeader className="bg-secondary/10 border-b p-6">
                  <div className="space-y-4">
                     <Select value={targetType} onValueChange={(v:any) => setTargetType(v)}>
                        <SelectTrigger className="h-10 bg-background font-bold"><SelectValue placeholder="الفئة المستهدفة" /></SelectTrigger>
                        <SelectContent>
                           <SelectItem value="all">كل طلاب المنصة</SelectItem>
                           <SelectItem value="course">طلاب كورس معين</SelectItem>
                           <SelectItem value="specific">تحديد يدوي</SelectItem>
                        </SelectContent>
                     </Select>
                     
                     <div className="bg-primary/5 p-4 rounded-xl space-y-3">
                        <Label className="text-xs font-black">إرسال إلى:</Label>
                        <RadioGroup value={audienceTarget} onValueChange={(v:any) => setAudienceTarget(v)} className="flex flex-col gap-2">
                           <div className="flex items-center gap-2 justify-end"><Label>الطالب فقط</Label><RadioGroupItem value="student" /></div>
                           <div className="flex items-center gap-2 justify-end"><Label>ولي الأمر فقط</Label><RadioGroupItem value="parent" /></div>
                           <div className="flex items-center gap-2 justify-end"><Label>الاثنين معاً</Label><RadioGroupItem value="both" /></div>
                        </RadioGroup>
                     </div>

                     <div className="relative">
                        <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                        <Input placeholder="بحث بالاسم..." className="h-9 pr-7 text-[11px] text-right" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                     </div>
                  </div>
               </CardHeader>
               <CardContent className="p-0 flex-grow">
                  <ScrollArea className="h-full">
                     <div className="p-4 space-y-2">
                        {filteredStudents.map(s => (
                           <div key={s.id} className={`flex flex-row-reverse items-center justify-between p-3 rounded-xl border ${selectedStudentIds.includes(s.id) ? 'bg-primary/5 border-primary/30' : 'bg-secondary/5 border-white/5'}`}>
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

            <Card className="lg:col-span-2 bg-card border-primary/10 rounded-[2rem] overflow-hidden shadow-2xl flex flex-col h-[700px]">
               <CardHeader className="bg-secondary/10 p-8 border-b">
                  <CardTitle className="text-3xl font-black">نص الرسالة الجماعية</CardTitle>
               </CardHeader>
               <CardContent className="p-8 flex-grow flex flex-col gap-8">
                  <Textarea 
                    placeholder="اكتب رسالتك هنا.. سيتم فتح محادثة كل مستهدف تلقائياً."
                    className="flex-grow bg-secondary/10 rounded-[2rem] border-primary/10 p-8 font-bold text-xl text-right"
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                  />
                  <Button 
                    className="w-full h-20 bg-accent hover:bg-accent/90 text-white font-black text-2xl rounded-[2rem] shadow-2xl gap-4"
                    onClick={startBroadcastAction}
                    disabled={!broadcastMessage || !isConnected}
                  >
                    <Send className="w-8 h-8" /> بدء الإرسال الآن
                  </Button>
               </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="sender">
           <Card className="max-w-2xl mx-auto bg-card border-primary/10 rounded-[2.5rem] p-8 text-center space-y-8">
              {config?.senderNumber ? (
                <div className="space-y-6">
                  <div className="p-8 bg-accent/5 border-2 border-dashed border-accent/30 rounded-[2rem]">
                     <p className="text-xs font-bold text-muted-foreground mb-2">الرقم المعتمد حالياً</p>
                     <p className="text-4xl font-black text-accent tracking-widest" dir="ltr">{config.senderNumber}</p>
                  </div>
                  <Button onClick={() => deleteDoc(doc(firestore!, 'admin_config', 'whatsapp'))} variant="outline" className="w-full h-14 rounded-2xl border-destructive/20 text-destructive font-black">حذف الرقم وتغييره</Button>
                </div>
              ) : (
                <div className="space-y-6">
                  <Input 
                    placeholder="أدخل رقم الواتساب المصري (مثال: 010...)" 
                    className="h-16 text-center text-2xl font-black rounded-2xl bg-secondary/20"
                    value={newSenderNumber}
                    onChange={(e) => setNewSenderNumber(e.target.value)}
                  />
                  <Button onClick={handleSaveConfig} disabled={isSaving || !newSenderNumber} className="w-full h-16 bg-primary text-primary-foreground font-black text-lg rounded-2xl shadow-xl">ربط الرقم وتفعيل المراسلة 🇪🇬</Button>
                </div>
              )}
           </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
