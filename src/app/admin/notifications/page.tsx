"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Megaphone, Send, Loader2, Users, BookOpen, Clock, Trash2 } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, orderBy, query, deleteDoc, doc } from 'firebase/firestore';
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

  const { data: courses, isLoading: isCoursesLoading } = useCollection(coursesRef);

  const notificationsRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'notifications'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: pastNotifications, isLoading: isNotificationsLoading } = useCollection(notificationsRef);

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
    } catch (e: any) {
      console.error(e);
      toast({ variant: "destructive", title: "خطأ", description: "فشل إرسال الإشعار." });
    } finally {
      setIsSending(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, 'notifications', id));
      toast({ title: "تم الحذف", description: "تم حذف الإشعار بنجاح." });
    } catch (e) {
      console.error(e);
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
                      <SelectValue placeholder={isCoursesLoading ? "جاري التحميل..." : "اختر الكورس"} />
                    </SelectTrigger>
                    <SelectContent>
                      {courses && courses.length > 0 ? (
                        courses.map(course => (
                          <SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>
                        ))
                      ) : (
                        <SelectItem value="_none" disabled>لا توجد كورسات متاحة</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <Button 
              onClick={handleSend}
              disabled={isSending || !title || !message || (targetType === 'course' && (!targetCourseId || targetCourseId === '_none'))}
              className="w-full h-14 bg-primary text-primary-foreground font-bold rounded-xl text-lg shadow-lg"
            >
              {isSending ? <Loader2 className="w-5 h-5 ml-2 animate-spin" /> : "إرسال الإشعار الآن"}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-card">
            <CardHeader className="border-b">
              <CardTitle className="text-lg font-bold">الإشعارات المرسلة سابقاً</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isNotificationsLoading ? (
                <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></div>
              ) : !pastNotifications || pastNotifications.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground italic">لا توجد إشعارات مرسلة حتى الآن.</div>
              ) : (
                <div className="divide-y max-h-[500px] overflow-y-auto">
                  {pastNotifications.map((notif: any) => (
                    <div key={notif.id} className="p-4 hover:bg-secondary/10 transition-colors group">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-bold text-primary">{notif.title}</h4>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDelete(notif.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{notif.message}</p>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {notif.targetType === 'all' ? 'الكل' : 'كورس محدد'}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {notif.createdAt?.toDate ? notif.createdAt.toDate().toLocaleString('ar-EG') : 'جاري الإرسال...'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}