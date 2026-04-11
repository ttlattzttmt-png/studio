import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Video, Ticket, ClipboardList, TrendingUp } from 'lucide-react';

export default function AdminOverview() {
  const stats = [
    { title: 'إجمالي الطلاب', val: '0', icon: <Users className="text-blue-500" />, trend: 'بداية جديدة' },
    { title: 'الكورسات المفعلة', val: '2', icon: <Video className="text-primary" />, trend: 'كورسات تجريبية' },
    { title: 'الأكواد النشطة', val: '0', icon: <Ticket className="text-accent" />, trend: '0% استهلاك' },
    { title: 'تسليمات الامتحانات', val: '0', icon: <ClipboardList className="text-purple-500" />, trend: 'لا توجد تسليمات' },
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
            <div className="text-center py-12 border-2 border-dashed rounded-2xl">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
              <p className="text-muted-foreground">لا يوجد مشتركين جدد حالياً.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader>
            <CardTitle>أكواد جديدة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="p-6 rounded-2xl bg-primary/5 border border-dashed border-primary/50 text-center space-y-4">
               <p className="text-sm text-muted-foreground">ابدأ بتوليد أكواد لطلابك الآن.</p>
               <button className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-colors">إنشاء 100 كود جديد</button>
             </div>
             
             <div className="space-y-2">
               <p className="text-sm font-bold">آخر الأكواد المنشأة</p>
               <div className="text-center py-4 bg-background rounded-lg border border-dashed">
                  <p className="text-xs text-muted-foreground">لا توجد أكواد منشأة.</p>
               </div>
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
