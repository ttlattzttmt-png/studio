
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Plus, Video, Edit3, Trash2, Loader2, BookOpen, DollarSign, GraduationCap } from 'lucide-react';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, addDoc, serverTimestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export default function ManageCourses() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    targetAcademicYear: 'الصف الثالث الثانوي'
  });

  const coursesRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'courses');
  }, [firestore]);

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
        createdAt: serverTimestamp(),
        uploadedByAdminUserId: user.uid
      });
      toast({ title: "تمت الإضافة", description: "تم إنشاء الكورس بنجاح وهو متاح الآن للطلاب." });
      setFormData({ title: '', description: '', price: '', targetAcademicYear: 'الصف الثالث الثانوي' });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "خطأ", description: "فشل إضافة الكورس." });
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteCourse = async (id: string) => {
    if (!firestore) return;
    if (!confirm('هل أنت متأكد من حذف هذا الكورس؟ سيتم حذف جميع البيانات المرتبطة به.')) return;
    
    try {
      await deleteDoc(doc(firestore, 'courses', id));
      toast({ title: "تم الحذف", description: "تم إزالة الكورس من المنصة." });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "خطأ", description: "فشل حذف الكورس." });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-headline font-bold mb-2">إدارة المحتوى التعليمي</h1>
          <p className="text-muted-foreground">أضف فيديوهات، عدل الأسعار، وتابع مبيعاتك لحظة بلحظة.</p>
        </div>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button className="h-14 px-8 bg-primary text-primary-foreground font-bold rounded-xl gap-2 text-lg shadow-lg shadow-primary/20">
              <Plus className="w-6 h-6" /> كورس جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-primary/20">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">إنشاء كورس جديد</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-bold">عنوان الكورس</label>
                <Input 
                  placeholder="مثال: مراجعة قوانين كيرشوف" 
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">وصف الكورس</label>
                <Textarea 
                  placeholder="اكتب نبذة عن محتويات الكورس..." 
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold flex items-center gap-1"><DollarSign className="w-3 h-3"/> السعر (ج.م)</label>
                  <Input 
                    type="number" 
                    placeholder="250" 
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold flex items-center gap-1"><GraduationCap className="w-3 h-3"/> السنة الدراسية</label>
                  <Select value={formData.targetAcademicYear} onValueChange={(val) => setFormData({...formData, targetAcademicYear: val})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
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
              <Button 
                onClick={handleAddCourse} 
                disabled={isAdding || !formData.title || !formData.price}
                className="w-full h-12 bg-primary font-bold"
              >
                {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : "نشر الكورس الآن"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
        ) : !courses || courses.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed rounded-3xl bg-secondary/10">
            <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-10" />
            <p className="text-muted-foreground">لا توجد كورسات حالياً. ابدأ بإضافة كورس جديد للمنصة.</p>
          </div>
        ) : (
          courses.map((course, i) => (
            <Card key={course.id} className="bg-card hover:border-primary/20 transition-all group overflow-hidden border-primary/5">
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row">
                  <div className="relative w-full md:w-64 h-52 md:h-auto overflow-hidden">
                    <Image 
                      src={PlaceHolderImages[(i % 3) + 1]?.imageUrl || ''} 
                      alt={course.title}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-700"
                      data-ai-hint="physics mathematics"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-4 right-4">
                       <span className="text-[10px] font-bold bg-primary text-primary-foreground px-2 py-1 rounded shadow-lg">
                        {course.targetAcademicYear}
                      </span>
                    </div>
                  </div>
                  <div className="flex-grow p-6 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-2xl font-bold text-primary group-hover:text-primary/80 transition-colors">{course.title}</h3>
                        <div className="text-left">
                          <p className="text-2xl font-black text-accent">{course.price} ج.م</p>
                        </div>
                      </div>
                      <p className="text-muted-foreground line-clamp-2 leading-relaxed">{course.description}</p>
                    </div>
                    
                    <div className="flex flex-wrap gap-4 mt-8">
                      <Button variant="outline" className="gap-2 border-primary/20 text-primary hover:bg-primary/5 rounded-xl h-11">
                        <Video className="w-4 h-4" /> المحتوى التعليمي
                      </Button>
                      <Button variant="outline" className="gap-2 border-primary/20 text-primary hover:bg-primary/5 rounded-xl h-11">
                        <Edit3 className="w-4 h-4" /> تعديل السعر
                      </Button>
                      <Button variant="ghost" className="gap-2 text-destructive hover:bg-destructive/10 rounded-xl h-11 mr-auto" onClick={() => handleDeleteCourse(course.id)}>
                        <Trash2 className="w-4 h-4" /> حذف الكورس
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
