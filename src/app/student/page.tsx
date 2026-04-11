import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, ClipboardList, Trophy, ArrowLeft, Clock } from 'lucide-react';
import Link from 'next/link';

export default function StudentDashboard() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-headline font-bold mb-2">أهلاً بك، يا بشمهندس محمد</h1>
          <p className="text-muted-foreground">تابع دروسك وامتحاناتك من هنا بكل سهولة.</p>
        </div>
        <div className="flex items-center gap-3 bg-card p-4 rounded-2xl border">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">نقاط التفوق</p>
            <p className="text-xl font-bold">1,250 نقطة</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Progress Section */}
        <div className="lg:col-span-2 space-y-8">
           <Card className="bg-gradient-to-l from-primary/20 to-transparent border-primary/20">
             <CardHeader className="flex flex-row items-center justify-between">
               <CardTitle className="text-xl font-bold">آخر درس شاهدته</CardTitle>
               <Clock className="w-5 h-5 text-primary" />
             </CardHeader>
             <CardContent>
               <div className="flex flex-col md:flex-row gap-6 items-center">
                 <div className="w-full md:w-48 h-28 bg-black rounded-xl relative group cursor-pointer overflow-hidden border">
                   <div className="absolute inset-0 flex items-center justify-center z-10">
                     <Play className="w-10 h-10 text-primary fill-primary group-hover:scale-110 transition-transform" />
                   </div>
                   <div className="absolute inset-0 bg-primary/10 group-hover:bg-primary/20 transition-colors" />
                 </div>
                 <div className="flex-grow space-y-2">
                   <h3 className="text-xl font-bold">محاضرة 4: قوانين الحركة الدائرية</h3>
                   <p className="text-sm text-muted-foreground">كورس الفيزياء - الصف الثالث الثانوي</p>
                   <div className="w-full h-2 bg-secondary rounded-full overflow-hidden mt-4">
                     <div className="w-[65%] h-full bg-primary" />
                   </div>
                   <p className="text-[10px] text-left text-muted-foreground">65% مكتمل</p>
                 </div>
                 <Button className="w-full md:w-auto bg-primary text-primary-foreground font-bold h-12 px-8">استكمال المشاهدة</Button>
               </div>
             </CardContent>
           </Card>

           <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-headline font-bold">كورساتي المفعلة</h2>
                <Link href="/student/my-courses" className="text-primary hover:underline text-sm font-bold flex items-center gap-1">مشاهدة الكل <ArrowLeft className="w-4 h-4" /></Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2].map(i => (
                  <Card key={i} className="bg-card hover:border-primary/20 transition-all cursor-pointer">
                    <CardContent className="p-6">
                       <div className="flex justify-between items-start mb-4">
                         <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                           <Play className="w-6 h-6 text-primary" />
                         </div>
                         <span className="text-xs bg-accent/10 text-accent px-2 py-1 rounded">نشط</span>
                       </div>
                       <h4 className="text-lg font-bold mb-1">الفيزياء الحديثة 2024</h4>
                       <p className="text-xs text-muted-foreground mb-4">المحاضر: بشمهندس محمد علاء</p>
                       <div className="flex items-center justify-between pt-4 border-t">
                         <span className="text-xs font-bold text-muted-foreground">12/20 درس</span>
                         <span className="text-xs font-bold text-primary">60%</span>
                       </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
           </div>
        </div>

        {/* Sidebar Tasks */}
        <div className="space-y-8">
           <Card className="bg-card">
             <CardHeader className="border-b"><CardTitle className="text-lg font-bold">الامتحانات القادمة</CardTitle></CardHeader>
             <CardContent className="p-0">
               <div className="divide-y">
                 {[1, 2, 3].map(i => (
                    <div key={i} className="p-4 flex items-center gap-4 hover:bg-secondary/20 transition-colors">
                      <div className="w-10 h-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
                        <ClipboardList className="w-5 h-5" />
                      </div>
                      <div className="flex-grow">
                        <p className="text-sm font-bold">اختبار شهر أكتوبر</p>
                        <p className="text-[10px] text-muted-foreground">يغلق بعد 3 أيام</p>
                      </div>
                      <Button size="sm" variant="outline" className="text-[10px] h-8 border-accent/20 text-accent">ابدأ</Button>
                    </div>
                 ))}
               </div>
             </CardContent>
           </Card>

           <Card className="bg-primary/5 border-primary/20 p-6 text-center space-y-4">
              <h4 className="font-bold">هل لديك كود تفعيل؟</h4>
              <p className="text-xs text-muted-foreground">اكتب الكود الذي استلمته من السكرتارية لتفعيل الكورس فوراً.</p>
              <Input placeholder="ENG-XXXX-XXXX" className="bg-background border-primary/20 text-center font-mono font-bold" />
              <Button className="w-full bg-primary text-primary-foreground font-bold">تفعيل الآن</Button>
           </Card>
        </div>
      </div>
    </div>
  );
}