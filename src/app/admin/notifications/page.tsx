
"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Megaphone, Send, Loader2, Users, BookOpen } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export default function AdminNotifications() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetType, setTargetType] = useState('all');
  const [targetCourseId, setTargetCourseId] = useState('');
  const [isSending, setIsSending] = useState(false);
  
  const firestore = useFirestore();
  const { toast } = useToast();

  const coursesRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'courses');
  }, [firestore]);

  const { data: courses } = useCollection(coursesRef);

  const handleSend = async () => {
    if (!firestore || !title || !message) return;
    
    setIsSending(true);
    try {
      await addDoc(collection(firestore, 'notifications'), {
        title,
        message,
        targetType,
        targetCourseId: targetType === 'course' ? targetCourseId : null,
        createdAt: serverTimestamp(),
      });
      
      toast({ title: "تم الإرسال", description: "تم إرسال الإشعار للطلاب بنجاح." });
      setTitle('');
      setMessage('');
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "خطأ", description: "فشل إرسال الإشعار." });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center">
          <Megaphone className="w-10 h-10" />
        </div>
        <div>
          <h1 className="text-4xl font-headline font-bold">مركز الإشعارات</h1>
          <p className="text-muted-foreground">تواصل مع طلابك بإرسال رسائل مباشرة وتنبيهات هامة.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" /> إنشاء إشعار جديد
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold">عنوان الرسالة</label>
              <Input 
                placeholder="مثال: موعد المراجعة النهائية" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-12 bg-background"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold">نص الرسالة</label>
              <Textarea 
                placeholder="اكتب تفاصيل الإشعار هنا..." 
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-[150px] bg-background"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold">الفئة المستهدفة</label>
                <Select value={targetType} onValueChange={setTargetType}>
                  <SelectTrigger className="h-12 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الطلاب</SelectItem>
                    <SelectItem value="course">طلاب كورس معين</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {targetType === 'course' && (
                <div className="space-y-2">
                  <label className="text-sm font-bold">اختر الكورس</label>
                  <Select value={targetCourseId} onValueChange={setTargetCourseId}>
                    <SelectTrigger className="h-12 bg-background">
                      <SelectValue placeholder="اختر الكورس" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses?.map(course => (
                        <SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <Button 
              onClick={handleSend}
              disabled={isSending || !title || !message || (targetType === 'course' && !targetCourseId)}
              className="w-full h-14 bg-primary text-primary-foreground font-bold rounded-xl text-lg shadow-lg"
            >
              {isSending ? <Loader2 className="w-5 h-5 ml-2 animate-spin" /> : "إرسال الإشعار الآن"}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-secondary/20 border-primary/10">
            <CardHeader><CardTitle className="text-sm">إحصائيات التواصل</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-background border">
                <Users className="w-5 h-5 text-blue-500 mb-2" />
                <p className="text-xs text-muted-foreground">طلاب نشطين</p>
                <p className="text-2xl font-bold">1,250</p>
              </div>
              <div className="p-4 rounded-xl bg-background border">
                <BookOpen className="w-5 h-5 text-accent mb-2" />
                <p className="text-xs text-muted-foreground">كورسات متاحة</p>
                <p className="text-2xl font-bold">14</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card">
            <CardHeader><CardTitle className="text-sm">نصائح التواصل الذكي</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-4">
              <p>• استخدم عناوين واضحة ومختصرة لزيادة نسبة فتح الرسائل.</p>
              <p>• الإشعارات المخصصة لطلاب كورس معين تكون أكثر فاعلية.</p>
              <p>• تجنب إرسال أكثر من إشعارين في اليوم الواحد لعدم إزعاج الطلاب.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
