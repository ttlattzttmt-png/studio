import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Video, Ticket, ClipboardList, TrendingUp } from 'lucide-react';

export default function AdminOverview() {
  const stats = [
    { title: 'إجمالي الطلاب', val: '1,250', icon: <Users className="text-blue-500" />, trend: '+12% هدا الشهر' },
    { title: 'الكورسات المفعلة', val: '14', icon: <Video className="text-primary" />, trend: '2 كورسات جديدة' },
    { title: 'الأكواد النشطة', val: '430', icon: <Ticket className="text-accent" />, trend: '85% استهلاك' },
    { title: 'تسليمات الامتحانات', val: '890', icon: <ClipboardList className="text-purple-500" />, trend: 'تنتظر التصحيح' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-headline font-bold">لوحة تحكم البشمهندس</h1>
        <div className="bg-primary/10 text-primary px-4 py-2 rounded-xl text-sm font-bold border border-primary/20">
          آخر تحديث: {new Date().toLocaleTimeString('ar-EG')}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((s, i) => (
          <Card key={i} className="bg-card border-primary/5 hover:border-primary/20 transition-all group">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-bold text-muted-foreground">{s.title}</CardTitle>
              <div className="p-2 rounded-lg bg-secondary group-hover:scale-110 transition-transform">{s.icon}</div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">{s.val}</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-accent" /> {s.trend}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-card">
          <CardHeader>
            <CardTitle>أحدث المشتركين</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">أ</div>
                    <div>
                      <p className="font-bold">أحمد محمد علي</p>
                      <p className="text-xs text-muted-foreground">01234567891 - الصف الثالث الثانوي</p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-primary">فعل كورس الفيزياء</p>
                    <p className="text-[10px] text-muted-foreground">منذ 5 دقائق</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader>
            <CardTitle>أكواد جديدة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="p-6 rounded-2xl bg-primary/5 border border-dashed border-primary/50 text-center space-y-4">
               <p className="text-sm text-muted-foreground">تحتاج لإنشاء أكواد جديدة لهذا الأسبوع؟</p>
               <button className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-colors">إنشاء 100 كود جديد</button>
             </div>
             
             <div className="space-y-2">
               <p className="text-sm font-bold">آخر الأكواد المنشأة</p>
               <div className="grid grid-cols-1 gap-2">
                  {['ENG-2342-XP', 'ENG-9912-LM', 'ENG-0032-QW'].map(code => (
                    <div key={code} className="flex items-center justify-between p-3 rounded-lg bg-background text-xs font-mono border">
                      <span>{code}</span>
                      <span className="text-accent">نشط</span>
                    </div>
                  ))}
               </div>
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}