"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Trash2, 
  Loader2, 
  AlertTriangle, 
  BookOpen, 
  RefreshCw,
  Search
} from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function DeleteCoursesPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // جلب كافة الكورسات بتزامن لحظي
  const coursesRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'courses'), orderBy('createdAt', 'desc'));
  }, [firestore, user]);

  const { data: courses, isLoading } = useCollection(coursesRef);

  const handleDelete = async (id: string, title: string) => {
    if (!firestore) return;
    
    const confirmed = window.confirm(`⚠️ تحذير نهائي: هل أنت متأكد من حذف كورس "${title}" بالكامل من قاعدة البيانات؟ لا يمكن التراجع.`);
    if (!confirmed) return;

    setIsDeleting(id);
    try {
      // تنفيذ عملية الحذف المباشرة بانتظار رد السيرفر
      const courseRef = doc(firestore, 'courses', id);
      await deleteDoc(courseRef);
      
      toast({ 
        title: "تم الحذف بنجاح", 
        description: `تمت إزالة كورس ${title} نهائياً من قاعدة البيانات.` 
      });
    } catch (e: any) {
      console.error("Critical Deletion Error:", e);
      let errorMsg = "حدث خطأ غير متوقع.";
      if (e.code === 'permission-denied') errorMsg = "السيرفر رفض العملية (نقص صلاحيات).";
      
      toast({ 
        variant: "destructive", 
        title: "فشل الحذف", 
        description: errorMsg 
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const filteredCourses = courses?.filter(c => 
    c.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isUserLoading) return <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="text-right">
          <h1 className="text-4xl font-headline font-bold text-destructive mb-2 flex items-center gap-3 justify-end">
            مركز الحذف النهائي <AlertTriangle className="w-8 h-8" />
          </h1>
          <p className="text-muted-foreground">أي كورس يتم حذفه من هنا يختفي من عند كافة الطلاب ومن قاعدة البيانات فوراً.</p>
        </div>
        <div className="bg-accent/10 text-accent px-6 py-3 rounded-2xl border border-accent/20 flex items-center gap-3">
          <RefreshCw className="w-5 h-5 animate-pulse" />
          <span className="font-bold text-sm">تزامن مباشر: {courses?.length || 0} كورس</span>
        </div>
      </div>

      <Card className="bg-card border-destructive/10 overflow-hidden rounded-[2rem]">
        <CardHeader className="border-b bg-secondary/5 p-6">
          <div className="relative w-full max-w-md mr-auto">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="ابحث عن اسم الكورس للحذف..." 
              className="pr-10 bg-background border-primary/10 text-right h-12 rounded-xl"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-8">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-40 gap-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <p className="font-bold text-muted-foreground italic">جاري جلب الكورسات من السيرفر...</p>
            </div>
          ) : !filteredCourses || filteredCourses.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground opacity-30 italic">
              <BookOpen className="w-20 h-20 mx-auto mb-4" />
              <p className="text-xl">لا توجد كورسات متاحة حالياً.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map((course, i) => (
                <Card key={course.id} className="bg-background border-primary/5 hover:border-destructive/30 transition-all group overflow-hidden rounded-3xl relative">
                  <div className="relative h-40 bg-secondary">
                    <Image 
                      src={course.imageUrl || PlaceHolderImages[(i % 3) + 1]?.imageUrl || ''} 
                      alt="" 
                      fill 
                      className="object-cover opacity-60 grayscale group-hover:grayscale-0 transition-all" 
                      unoptimized={!!course.imageUrl}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
                  </div>
                  <CardContent className="p-6 space-y-4 text-right">
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant="outline" className="text-[10px]">{course.targetAcademicYear}</Badge>
                      <h3 className="font-bold text-lg leading-tight">{course.title}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{course.description}</p>
                    
                    <Button 
                      onClick={() => handleDelete(course.id, course.title)}
                      disabled={isDeleting === course.id}
                      variant="destructive"
                      className="w-full h-12 font-bold rounded-xl gap-2 shadow-lg shadow-destructive/20 mt-4"
                    >
                      {isDeleting === course.id ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> جاري المسح...</>
                      ) : (
                        <><Trash2 className="w-4 h-4" /> حذف الكورس نهائياً</>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}