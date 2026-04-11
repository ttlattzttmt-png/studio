import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Video, Edit3, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function ManageCourses() {
  const courses = [
    { id: 1, title: 'كورس الفيزياء التجريبي', students: 0, price: '250 ج.م', year: 'الثالث الثانوي' },
    { id: 2, title: 'كورس الميكانيكا التجريبي', students: 0, price: '200 ج.م', year: 'الثاني الثانوي' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-headline font-bold mb-2">إدارة الكورسات</h1>
          <p className="text-muted-foreground">أضف فيديوهات، عدل الأسعار، وتابع مبيعاتك.</p>
        </div>
        <Button className="h-14 px-8 bg-primary text-primary-foreground font-bold rounded-xl gap-2 text-lg">
          <Plus className="w-6 h-6" /> كورس جديد
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {courses.map((course, i) => (
          <Card key={course.id} className="bg-card hover:border-primary/20 transition-all">
            <CardContent className="p-0">
              <div className="flex flex-col md:flex-row">
                <div className="relative w-full md:w-64 h-48 md:h-auto">
                   <Image 
                    src={PlaceHolderImages[i+1]?.imageUrl || ''} 
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
                        {course.year}
                      </span>
                      <h3 className="text-2xl font-bold">{course.title}</h3>
                      <p className="text-muted-foreground mt-1">جاهز لإضافة المحتوى</p>
                    </div>
                    <div className="text-left">
                      <p className="text-2xl font-black text-primary">{course.price}</p>
                      <p className="text-sm text-muted-foreground">{course.students} مشترك</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-4 mt-8">
                    <Button variant="outline" className="gap-2 border-primary/20 text-primary hover:bg-primary/5">
                      <Video className="w-4 h-4" /> إدارة الفيديوهات
                    </Button>
                    <Button variant="outline" className="gap-2 border-primary/20 text-primary hover:bg-primary/5">
                      <Edit3 className="w-4 h-4" /> تعديل البيانات
                    </Button>
                    <Button variant="ghost" className="gap-2 text-destructive hover:bg-destructive/10">
                      <Trash2 className="w-4 h-4" /> حذف
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
