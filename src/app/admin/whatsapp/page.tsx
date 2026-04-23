
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
import { 
  MessageCircle, 
  Settings, 
  Send, 
  Smartphone, 
  CheckCircle2, 
  RefreshCw, 
  Users, 
  Zap, 
  Layout, 
  ShieldCheck,
  ClipboardCheck,
  Loader2,
  Trash2,
  ArrowLeftRight,
  Search,
  BookOpen,
  UserCheck
} from 'lucide-react';
import { useFirestore, useDoc, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { doc, setDoc, collection, deleteDoc, collectionGroup, query, where, getDocs } from 'firebase/firestore';
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
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  // جلب إعدادات واتساب
  const configRef = useMemoFirebase(() => (firestore ? doc(firestore, 'admin_config', 'whatsapp') : null), [firestore]);
  const { data: config } = useDoc(configRef);

  // جلب البيانات الأساسية
  const studentsRef = useMemoFirebase(() => (firestore ? collection(firestore, 'students') : null), [firestore]);
  const coursesRef = useMemoFirebase(() => (firestore ? collection(firestore, 'courses') : null), [firestore]);
  const enrollmentsGroupRef = useMemoFirebase(() => (firestore ? collectionGroup(firestore, 'enrollments') : null), [firestore]);
  
  const { data: students } = useCollection(studentsRef);
  const { data: courses } = useCollection(coursesRef);
  const { data: allEnrollments } = useCollection(enrollmentsGroupRef);

  // منطق تصفية الطلاب بناءً على الاختيارات
  const filteredStudents = useMemo(() => {
    if (!students) return [];
    let list = [...students];

    // 1. فلترة حسب الكورس
    if (targetType === 'course' && selectedCourseId) {
      const courseStudentIds = allEnrollments
        ?.filter(en => en.courseId === selectedCourseId)
        .map(en => en.studentId) || [];
      list = list.filter(s => courseStudentIds.includes(s.id));
    }

    // 2. فلترة حسب البحث
    if (searchTerm) {
      const sLower = searchTerm.toLowerCase();
      list = list.filter(s => 
        s.name.toLowerCase().includes(sLower) || 
        s.studentPhoneNumber?.includes(sLower)
      );
    }

    return list;
  }, [students, targetType, selectedCourseId, searchTerm, allEnrollments]);

  const handleToggleStudent = (id: string) => {
    setSelectedStudentIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    const allIds = filteredStudents.map(s => s.id);
    setSelectedStudentIds(allIds);
  };

  const handleSaveConfig = async () => {
    if (!firestore || !newSenderNumber) return;
    setIsSaving(true);
    try {
      await setDoc(doc(firestore, 'admin_config', 'whatsapp'), {
        senderNumber: newSenderNumber,
        status: 'connected',
        lastUpdated: new Date().toISOString()
      }, { merge: true });
      toast({ title: "تم ربط الرقم بنجاح" });
      setNewSenderNumber('');
    } catch (e) { console.error(e); } finally { setIsSaving(false); }
  };

  const handleRemoveConfig = async () => {
    if (!firestore) return;
    if (!confirm("🚨 هل أنت متأكد من حذف رقم المرسل؟")) return;
    await deleteDoc(doc(firestore, 'admin_config', 'whatsapp'));
    toast({ title: "تم الحذف" });
  };

  const startBroadcastAction = () => {
    if (!broadcastMessage) return;
    
    // تحديد المستهدفين الفعليين
    const targets = targetType === 'specific' 
      ? students?.filter(s => selectedStudentIds.includes(s.id))
      : filteredStudents;

    if (!targets || targets.length === 0) {
      toast({ variant: "destructive", title: "لا يوجد مستلمون", description: "يرجى تحديد طلاب لإرسال الرسالة لهم." });
      return;
    }

    // فتح أول محادثة وتنبيه المسؤول بالباقي
    const first = targets[0];
    sendWhatsAppMessage(first.studentPhoneNumber, broadcastMessage);
    
    if (targets.length > 1) {
      toast({ 
        title: `تم فتح أول محادثة من أصل ${targets.length}`, 
        description: "يرجى العودة والضغط على أيقونات الواتساب بجانب الأسماء لإكمال البقية يدوياً." 
      });
    }
  };

  if (isUserLoading) return <div className="flex justify-center py-20"><Loader2 className="w-10 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20 text-right">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-headline font-black mb-2 flex items-center gap-3 justify-end">
            مركز تحكم واتساب <MessageCircle className="w-10 h-10 text-accent" />
          </h1>
          <p className="text-muted-foreground font-bold text-lg">أدر تواصلك مع الطلاب وأولياء الأمور بذكاء واحترافية.</p>
        </div>
      </div>

      <Tabs defaultValue="broadcast" className="space-y-8">
        <TabsList className="bg-card border h-16 p-1.5 rounded-3xl w-full md:w-fit">
          <TabsTrigger value="broadcast" className="h-full rounded-2xl px-8 font-black data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Send className="w-4 h-4 ml-2" /> البث الجماعي المطور
          </TabsTrigger>
          <TabsTrigger value="sender" className="h-full rounded-2xl px-8 font-black data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Smartphone className="w-4 h-4 ml-2" /> إعدادات الرقم
          </TabsTrigger>
        </TabsList>

        <TabsContent value="broadcast" className="space-y-8">
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* قائمة اختيار الطلاب */}
              <Card className="lg:col-span-1 bg-card border-primary/10 rounded-[2rem] overflow-hidden flex flex-col h-[700px]">
                 <CardHeader className="bg-secondary/10 border-b p-6">
                    <div className="space-y-4">
                       <div className="flex flex-col gap-2">
                          <label className="text-xs font-black text-muted-foreground">فلترة حسب الفئة</label>
                          <div className="grid grid-cols-3 gap-1">
                             <Button variant={targetType === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setTargetType('all')} className="text-[10px] h-8 rounded-lg">الكل</Button>
                             <Button variant={targetType === 'course' ? 'default' : 'outline'} size="sm" onClick={() => setTargetType('course')} className="text-[10px] h-8 rounded-lg">كورس</Button>
                             <Button variant={targetType === 'specific' ? 'default' : 'outline'} size="sm" onClick={() => setTargetType('specific')} className="text-[10px] h-8 rounded-lg">اختياري</Button>
                          </div>
                       </div>
                       
                       {targetType === 'course' && (
                         <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                            <SelectTrigger className="h-10 bg-background text-[10px]"><SelectValue placeholder="اختر الكورس" /></SelectTrigger>
                            <SelectContent>
                               {courses?.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                            </SelectContent>
                         </Select>
                       )}

                       <div className="relative">
                          <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                          <Input 
                            placeholder="ابحث بالاسم..." 
                            className="h-9 pr-7 text-[11px] bg-background rounded-lg"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                          />
                       </div>
                    </div>
                 </CardHeader>
                 <CardContent className="p-0 flex-grow">
                    <ScrollArea className="h-full">
                       <div className="p-4 space-y-2">
                          <Button variant="ghost" onClick={handleSelectAllFiltered} className="w-full h-8 text-[10px] text-primary border border-primary/10 mb-2">تحديد الكل في القائمة</Button>
                          {filteredStudents.map(student => (
                             <div key={student.id} className={`flex flex-row-reverse items-center justify-between p-3 rounded-xl border transition-all ${selectedStudentIds.includes(student.id) ? 'bg-primary/5 border-primary/30' : 'bg-secondary/5 border-white/5'}`}>
                                <div className="flex flex-row-reverse items-center gap-3">
                                   <Checkbox 
                                     checked={selectedStudentIds.includes(student.id)} 
                                     onCheckedChange={() => handleToggleStudent(student.id)} 
                                   />
                                   <div className="text-right">
                                      <p className="text-[11px] font-black">{student.name}</p>
                                      <p className="text-[9px] text-muted-foreground font-mono" dir="ltr">{student.studentPhoneNumber}</p>
                                   </div>
                                </div>
                                <Button size="icon" variant="ghost" onClick={() => sendWhatsAppMessage(student.studentPhoneNumber, broadcastMessage)} className="h-7 w-7 text-accent"><MessageCircle className="w-4 h-4" /></Button>
                             </div>
                          ))}
                       </div>
                    </ScrollArea>
                 </CardContent>
                 <div className="p-4 bg-secondary/10 border-t flex justify-between items-center flex-row-reverse">
                    <span className="text-[10px] font-bold">المختارون: {selectedStudentIds.length}</span>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedStudentIds([])} className="text-[10px] text-destructive h-7">مسح التحديد</Button>
                 </div>
              </Card>

              {/* منطقة كتابة الرسالة */}
              <Card className="lg:col-span-2 bg-card border-primary/10 rounded-[2rem] overflow-hidden shadow-2xl flex flex-col h-[700px]">
                 <CardHeader className="bg-secondary/10 p-8 border-b">
                    <CardTitle className="text-3xl font-black">إرسال الرسالة الجماعية</CardTitle>
                    <CardDescription className="font-bold">سيتم إرسال هذا النص لكافة الطلاب المحددين في القائمة الجانبية.</CardDescription>
                 </CardHeader>
                 <CardContent className="p-8 flex-grow flex flex-col gap-8">
                    <div className="flex-grow flex flex-col gap-4">
                       <label className="text-sm font-black flex items-center gap-2 justify-end">نص الرسالة <MessageCircle className="w-5 h-5 text-primary" /></label>
                       <Textarea 
                         placeholder="اكتب رسالتك هنا.. يمكنك استخدام قوالب جاهزة من قسم القوالب."
                         className="flex-grow bg-secondary/10 rounded-[2rem] border-primary/10 p-8 font-bold text-xl leading-relaxed text-right"
                         value={broadcastMessage}
                         onChange={(e) => setBroadcastMessage(e.target.value)}
                       />
                    </div>

                    <div className="space-y-4">
                       <div className="flex items-center gap-3 bg-accent/5 p-4 rounded-2xl border border-accent/10">
                          <Zap className="w-5 h-5 text-accent animate-pulse" />
                          <p className="text-xs font-bold text-accent">ملاحظة: سيتم فتح واتساب لكل مستلم تباعاً لضمان عدم حظر رقمك.</p>
                       </div>
                       <Button 
                         className="w-full h-20 bg-accent hover:bg-accent/90 text-white font-black text-2xl rounded-[2rem] shadow-2xl shadow-accent/20 gap-4 transition-transform active:scale-95"
                         onClick={startBroadcastAction}
                         disabled={!broadcastMessage}
                       >
                         <Send className="w-8 h-8" /> بدء إرسال البث المختار الآن
                       </Button>
                    </div>
                 </CardContent>
              </Card>
           </div>
        </TabsContent>

        <TabsContent value="sender">
           <Card className="max-w-2xl mx-auto bg-card border-primary/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
              <CardHeader className="bg-secondary/10 p-8 border-b text-center">
                <CardTitle className="text-2xl font-black">إعدادات رقم الإرسال</CardTitle>
                <CardDescription className="font-bold">هذا الرقم يستخدم كمرجع وهوية للمنصة في المراسلات.</CardDescription>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                {config?.senderNumber ? (
                  <div className="space-y-6">
                    <div className="p-8 bg-accent/5 border-2 border-dashed border-accent/30 rounded-[2rem] text-center">
                       <p className="text-xs font-bold text-muted-foreground mb-2 uppercase">الرقم المتصل حالياً</p>
                       <p className="text-4xl font-black text-accent tracking-widest" dir="ltr">{config.senderNumber}</p>
                       <div className="flex items-center justify-center gap-2 mt-4 text-accent font-black text-sm">
                          <CheckCircle2 className="w-5 h-5" /> الربط نشط ويعمل كمرجع
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
