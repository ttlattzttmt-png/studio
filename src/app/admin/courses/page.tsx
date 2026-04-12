
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { 
  Plus, 
  Video, 
  Edit3, 
  Trash2, 
  Loader2, 
  BookOpen, 
  Youtube, 
  ImageIcon,
  Save
} from 'lucide-react';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, addDoc, serverTimestamp, deleteDoc, doc, updateDoc, orderBy, query } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export default function ManageCourses() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingCourse, setEditingCourse] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    targetAcademicYear: 'الصف الثالث الثانوي',
    imageUrl: ''
  });

  const [selectedCourseForContent, setSelectedCourseForContent] = useState<any>(null);

  const coursesRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'courses'), orderBy('createdAt', 'desc'));
  }, [firestore, user]);

  const { data: courses, isLoading } = useCollection(coursesRef);

  const handleAddCourse = async () => {
    if (!firestore || !user) return;
    setIsAdding(true);
    try {
      await addDoc(collection(firestore, 'courses'), {
        title: formData.title,
        description: formData.description,
        price: Number(formData.price),
        targetAcademicYear: formData.targetAcademicYear,
        imageUrl: formData.imageUrl || '',
        createdAt: serverTimestamp(),
        uploadedByAdminUserId: user.uid
      });
      toast({ title: "تمت الإضافة", description: "تم إنشاء الكورس بنجاح." });
      setFormData({ title: '', description: '', price: '', targetAcademicYear: 'الصف الثالث الثانوي', imageUrl: '' });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "خطأ", description: "فشل إضافة الكورس." });
    } finally {
      setIsAdding(false);
    }
  };

  const handleUpdateCourse = async () => {
    if (!firestore || !editingCourse) return;
    try {
      const ref = doc(firestore, 'courses', editingCourse.id);
      await updateDoc(ref, {
        title: editingCourse.title,
        description: editingCourse.description,
        price: Number(editingCourse.price),
        targetAcademicYear: editingCourse.targetAcademicYear,
        imageUrl: editingCourse.imageUrl || '',
        updatedAt: serverTimestamp()
      });
      toast({ title: "تم التحديث", description: "تم حفظ التعديلات بنجاح." });
      setEditingCourse(null);
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "خطأ", description: "فشل تحديث البيانات." });
    }
  };

  const handleDeleteCourse = async (id: string) => {
    if (!firestore) return;
    if (!confirm('هل أنت متأكد من حذف هذا الكورس؟')) return;
    try {
      await deleteDoc(doc(firestore, 'courses', id));
      toast({ title: "تم الحذف", description: "تم إزالة الكورس نهائياً." });
    } catch (e) {
      console.error(e);
    }
  };

  if (isUserLoading) return <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="text-right">
          <h1 className="text-4xl font-headline font-bold mb-2">إدارة الكورسات</h1>
          <p className="text-muted-foreground">تحكم في محتوى المنصة، الأسعار، وصور الغلاف.</p>
        </div>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button className="h-14 px-8 bg-primary text-primary-foreground font-bold rounded-xl gap-2 text-lg shadow-lg">
              <Plus className="w-6 h-6" /> كورس جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card text-right">
            <DialogHeader><DialogTitle className="text-2xl font-bold text-right">إنشاء كورس جديد</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>عنوان الكورس</Label>
                <Input className="text-right" placeholder="مثال: فيزياء الفصل الأول" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>وصف مختصر</Label>
                <Textarea className="text-right" placeholder="اكتب نبذة عن محتوى الكورس..." value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>رابط صورة الغلاف (Direct Link)</Label>
                <div className="relative">
                  <ImageIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input className="pr-10 text-right" placeholder="ألصق رابط الصورة هنا (اختياري)" value={formData.imageUrl} onChange={(e) => setFormData({...formData, imageUrl: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>السعر (ج.م)</Label>
                  <Input type="number" className="text-right" placeholder="السعر" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>السنة الدراسية</Label>
                  <Select value={formData.targetAcademicYear} onValueChange={(v) => setFormData({...formData, targetAcademicYear: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="الصف الأول الثانوي">الصف الأول الثانوي</SelectItem>
                      <SelectItem value="الصف الثاني الثانوي">الصف الثاني الثانوي</SelectItem>
                      <SelectItem value="الصف الثالث الثانوي">الصف الثالث الثانوي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddCourse} disabled={isAdding} className="w-full h-12 bg-primary font-bold">نشر الكورس</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
        ) : courses?.map((course, i) => (
          <Card key={course.id} className="bg-card hover:border-primary/20 transition-all group overflow-hidden border-primary/5">
            <CardContent className="p-0">
              <div className="flex flex-col md:flex-row-reverse text-right">
                <div className="relative w-full md:w-72 h-52 md:h-auto overflow-hidden bg-secondary">
                  <Image 
                    src={course.imageUrl || PlaceHolderImages[(i % 3) + 1]?.imageUrl || ''} 
                    alt="" 
                    fill 
                    className="object-cover" 
                    unoptimized={!!course.imageUrl}
                  />
                  <div className="absolute top-4 left-4 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-1 rounded">
                    {course.targetAcademicYear}
                  </div>
                </div>
                <div className="flex-grow p-6">
                  <div className="flex flex-row-reverse justify-between items-start mb-4 gap-4">
                    <div className="text-right flex-grow">
                      <h3 className="text-2xl font-bold text-primary mb-1">{course.title}</h3>
                      <p className="text-muted-foreground line-clamp-2 text-sm">{course.description}</p>
                    </div>
                    <div className="text-left shrink-0">
                      <p className="text-2xl font-black text-accent">{course.price} ج.م</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-row-reverse flex-wrap gap-3 mt-6">
                    <Button variant="outline" className="gap-2 border-primary/20 text-primary h-11" onClick={() => setSelectedCourseForContent(course)}>
                      <Video className="w-4 h-4" /> إدارة المحتوى
                    </Button>
                    
                    <Dialog open={!!editingCourse} onOpenChange={(o) => !o && setEditingCourse(null)}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="gap-2 border-primary/20 text-primary h-11" onClick={() => setEditingCourse(course)}>
                          <Edit3 className="w-4 h-4" /> تعديل
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-card text-right">
                        <DialogHeader><DialogTitle className="text-right">تعديل كورس: {course.title}</DialogTitle></DialogHeader>
                        {editingCourse && (
                          <div className="space-y-4 py-4">
                            <Input className="text-right" value={editingCourse.title} onChange={(e) => setEditingCourse({...editingCourse, title: e.target.value})} placeholder="العنوان" />
                            <Textarea className="text-right" value={editingCourse.description} onChange={(e) => setEditingCourse({...editingCourse, description: e.target.value})} placeholder="الوصف" />
                            <div className="space-y-2">
                              <Label className="text-xs font-bold">رابط صورة الغلاف</Label>
                              <Input className="text-right" value={editingCourse.imageUrl || ''} onChange={(e) => setEditingCourse({...editingCourse, imageUrl: e.target.value})} placeholder="رابط الصورة المباشر" />
                            </div>
                            <Input className="text-right" type="number" value={editingCourse.price} onChange={(e) => setEditingCourse({...editingCourse, price: e.target.value})} placeholder="السعر" />
                            <Button onClick={handleUpdateCourse} className="w-full bg-primary font-bold">حفظ التعديلات</Button>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                    
                    <Button variant="ghost" className="gap-2 text-destructive h-11" onClick={() => handleDeleteCourse(course.id)}>
                      <Trash2 className="w-4 h-4" /> حذف
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!selectedCourseForContent} onOpenChange={() => setSelectedCourseForContent(null)}>
        <DialogContent className="max-w-4xl bg-card border-primary/20 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="text-2xl font-bold flex flex-row-reverse items-center gap-2">
              <Video className="w-6 h-6 text-primary" /> محتوى كورس: {selectedCourseForContent?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="py-6">
            <CourseContentManager course={selectedCourseForContent} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CourseContentManager({ course }: { course: any }) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [isAdding, setIsAdding] = useState(false);
  const [newVideo, setNewVideo] = useState({ title: '', link: '', order: '' });

  const contentRef = useMemoFirebase(() => {
    if (!firestore || !course || !user) return null;
    return query(collection(firestore, 'courses', course.id, 'content'), orderBy('orderIndex', 'asc'));
  }, [firestore, course, user]);

  const { data: contents, isLoading } = useCollection(contentRef);

  const handleAddVideo = async () => {
    if (!firestore || !course || !user || !newVideo.title || !newVideo.link) return;
    setIsAdding(true);
    try {
      await addDoc(collection(firestore, 'courses', course.id, 'content'), {
        courseId: course.id,
        title: newVideo.title,
        description: '',
        contentType: 'Video',
        youtubeLink: newVideo.link,
        orderIndex: Number(newVideo.order) || (contents?.length || 0) + 1,
        createdAt: serverTimestamp(),
        course_uploadedByAdminUserId: user.uid
      });
      toast({ title: "تمت الإضافة", description: "تمت إضافة الفيديو بنجاح." });
      setNewVideo({ title: '', link: '', order: '' });
    } catch (e) {
      console.error(e);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteContent = async (id: string) => {
    if (!firestore || !course) return;
    try {
      await deleteDoc(doc(firestore, 'courses', course.id, 'content', id));
      toast({ title: "تم الحذف", description: "تم حذف الفيديو من الكورس." });
    } catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-6 text-right">
      <Card className="bg-secondary/20 border-dashed">
        <CardContent className="p-6">
          <h4 className="font-bold mb-4 flex flex-row-reverse items-center gap-2"><Plus className="w-4 h-4" /> إضافة فيديو جديد</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input className="text-right" placeholder="عنوان الفيديو" value={newVideo.title} onChange={(e) => setNewVideo({...newVideo, title: e.target.value})} />
            <Input className="text-right" placeholder="رابط يوتيوب" value={newVideo.link} onChange={(e) => setNewVideo({...newVideo, link: e.target.value})} />
            <div className="flex gap-2">
              <Input type="number" placeholder="الترتيب" value={newVideo.order} onChange={(e) => setNewVideo({...newVideo, order: e.target.value})} className="w-24 text-center" />
              <Button onClick={handleAddVideo} disabled={isAdding} className="bg-primary flex-grow font-bold">
                {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : "إضافة"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {isLoading ? <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /> : 
        !contents || contents.length === 0 ? <p className="text-center text-muted-foreground italic py-10">لا يوجد محتوى في هذا الكورس حالياً.</p> :
        contents.map((item) => (
          <div key={item.id} className="flex flex-row-reverse items-center justify-between p-4 bg-card border rounded-xl group hover:border-primary/30 transition-colors">
            <div className="flex flex-row-reverse items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                {item.orderIndex}
              </div>
              <div className="text-right">
                <p className="font-bold">{item.title}</p>
                <p className="text-xs text-muted-foreground flex flex-row-reverse items-center gap-1"><Youtube className="w-3 h-3"/> {item.youtubeLink}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDeleteContent(item.id)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
