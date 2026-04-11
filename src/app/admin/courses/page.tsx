"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Video, Edit3, Trash2, Loader2, BookOpen } from 'lucide-react';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export default function ManageCourses() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const coursesRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'courses');
  }, [firestore]);

  const { data: courses, isLoading } = useCollection(coursesRef);

  const handleAddCourse = async () => {
    if (!firestore) return;
    try {
      await addDoc(collection(firestore, 'courses'), {
        title: 'كورس تجريبي جديد',
        description: 'هذا كورس تجريبي مضاف حديثاً لتجربة المنصة.',
        price: 250,
        targetAcademicYear: 'الثالث الثانوي',
        createdAt: serverTimestamp(),
        uploadedByAdminUserId: 'admin'
      });
      toast({ title: "تمت الإضافة", description: "تم إنشاء كورس تجريبي جديد بنجاح." });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "خطأ", description: "فشل إضافة الكورس." });
    }
  };

  const handleDeleteCourse = async (id: string) => {
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, 'courses', id));
      toast({ title: "تم الحذف", description: "تم حذف الكورس بنجاح." });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "خطأ", description: "فشل حذف الكورس." });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-headline font-bold mb-2">إدارة الكورسات</h1>
          <p className="text-muted-foreground">أضف فيديوهات، عدل الأسعار، وتابع مبيعاتك.</p>
        </div>
        <Button onClick={handleAddCourse} className="h-14 px-8 bg-primary text-primary-foreground font-bold rounded-xl gap-2 text-lg">
          <Plus className="w-6 h-6" /> كورس جديد
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
        ) : !courses || courses.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed rounded-3xl">
            <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-10" />
            <p className="text-muted-foreground">لا توجد كورسات حالياً. ابدأ بإضافة كورس جديد.</p>
          </div>
        ) : (
          courses.map((course, i) => (
            <Card key={course.id} className="bg-card hover:border-primary/20 transition-all">
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row">
                  <div className="relative w-full md:w-64 h-48 md:h-auto">
                    <Image 
                      src={PlaceHolderImages[(i % 3) + 1]?.imageUrl || ''} 
                      alt={course.title}
                      fill
                      className="object-cover rounded-t-xl md:rounded-r-xl md:rounded-tl-none"
                      data-ai-hint="physics mathematics"
                    />
                  </div>
                  <div className="flex-grow p-6 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-bold bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/20 mb-2 inline-block">
                          {course.targetAcademicYear}
                        </span>
                        <h3 className="text-2xl font-bold">{course.title}</h3>
                        <p className="text-muted-foreground mt-1">{course.description}</p>
                      </div>
                      <div className="text-left">
                        <p className="text-2xl font-black text-primary">{course.price} ج.م</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-4 mt-8">
                      <Button variant="outline" className="gap-2 border-primary/20 text-primary hover:bg-primary/5">
                        <Video className="w-4 h-4" /> إدارة الفيديوهات
                      </Button>
                      <Button variant="outline" className="gap-2 border-primary/20 text-primary hover:bg-primary/5">
                        <Edit3 className="w-4 h-4" /> تعديل البيانات
                      </Button>
                      <Button variant="ghost" className="gap-2 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteCourse(course.id)}>
                        <Trash2 className="w-4 h-4" /> حذف
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