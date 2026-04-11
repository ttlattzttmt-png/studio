"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, ClipboardList, BookOpen, Clock, Settings2 } from 'lucide-react';
import Link from 'next/link';

export default function AdminExams() {
  const exams = [
    { id: 1, title: 'اختبار الفصل الأول: الفيزياء والكيمياء', course: 'الفيزياء الحديثة', date: '2023-11-15', duration: '60 دقيقة' },
    { id: 2, title: 'امتحان منتصف الشهر', course: 'الميكانيكا الأساسية', date: '2023-11-20', duration: '45 دقيقة' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-headline font-bold mb-2">بناء الاختبارات</h1>
          <p className="text-muted-foreground">قم بإنشاء امتحانات إلكترونية ومقالية لطلابك.</p>
        </div>
        <Button className="h-14 px-8 bg-primary text-primary-foreground font-bold rounded-xl gap-2 text-lg">
          <Plus className="w-6 h-6" /> اختبار جديد
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {exams.map((exam) => (
          <Card key={exam.id} className="bg-card hover:border-primary/20 transition-all group">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <ClipboardList className="w-6 h-6" />
              </div>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
                <Settings2 className="w-5 h-5" />
              </Button>
            </CardHeader>
            <CardContent>
              <h3 className="text-xl font-bold mb-2">{exam.title}</h3>
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <BookOpen className="w-4 h-4" /> <span>الكورس: {exam.course}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" /> <span>المدة: {exam.duration}</span>
                </div>
              </div>
              <div className="flex gap-4">
                <Button className="flex-grow bg-secondary text-foreground hover:bg-secondary/80">تعديل الأسئلة</Button>
                <Button variant="outline" className="border-primary/20 text-primary">النتائج</Button>
              </div>
            </CardContent>
          </Card>
        ))}

        <Link href="/admin/ai-tools" className="group">
          <Card className="h-full border-dashed border-2 border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/20 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
              <BrainCircuit className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-primary">توليد أسئلة بالذكاء الاصطناعي</h3>
              <p className="text-sm text-muted-foreground">استخدم المساعد الذكي لإنشاء بنك أسئلة في ثوانٍ.</p>
            </div>
            <Button variant="link" className="text-primary font-bold">جرب الآن</Button>
          </Card>
        </Link>
      </div>
    </div>
  );
}
