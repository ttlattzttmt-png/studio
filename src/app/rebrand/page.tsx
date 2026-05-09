
"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck, Lock, Save, Download, RefreshCw, Terminal } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { BrandConfig } from '@/lib/brand-config';

export default function MasterRebranderPage() {
  const [isAuth, setIsAuth] = useState(false);
  const [pass, setPass] = useState('');
  const { toast } = useToast();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pass === 'master2025') { // كلمة سر الماستر
      setIsAuth(true);
      toast({ title: "مرحباً يا ماستر", description: "يمكنك الآن تعديل هوية المنصة بالكامل." });
    } else {
      toast({ variant: "destructive", title: "خطأ", description: "كلمة سر الماستر غير صحيحة." });
    }
  };

  if (!isAuth) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-zinc-900 border-primary/20 text-white text-right">
          <CardHeader className="text-center space-y-4">
            <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto text-primary">
              <ShieldCheck className="w-12 h-12" />
            </div>
            <CardTitle className="text-2xl font-black">غرفة التحكم العليا (Master)</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label>كلمة سر النظام الجذري</Label>
                <Input 
                  type="password" 
                  className="bg-black border-white/10 text-center text-xl" 
                  value={pass} 
                  onChange={(e) => setPass(e.target.value)} 
                />
              </div>
              <Button className="w-full h-14 bg-primary text-black font-black text-lg">فتح المنظومة</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8 text-right font-body">
      <div className="max-w-4xl mx-auto space-y-10">
        <header className="flex flex-row-reverse justify-between items-center border-b border-white/10 pb-8">
           <div>
              <h1 className="text-4xl font-black text-primary flex items-center gap-3 justify-end">أداة الأتمتة وإعادة التسمية <Terminal className="w-10 h-10" /></h1>
              <p className="text-zinc-400 mt-2 font-bold">هذه الصفحة تقوم بتعديل "عقل المنصة" لبرمجتها لعميل جديد فوراً.</p>
           </div>
           <Button variant="outline" className="border-white/10" onClick={() => window.location.reload()}>خروج آمن</Button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="bg-zinc-900 border-white/5 text-white">
            <CardHeader><CardTitle className="text-lg font-black">1. الهوية العامة</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1"><Label>اسم المنصة</Label><Input defaultValue={BrandConfig.name} className="bg-black" /></div>
              <div className="space-y-1"><Label>الاسم المختصر</Label><Input defaultValue={BrandConfig.shortName} className="bg-black" /></div>
              <div className="space-y-1"><Label>بريد الأدمن</Label><Input defaultValue={BrandConfig.adminEmail} className="bg-black" /></div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-white/5 text-white">
            <CardHeader><CardTitle className="text-lg font-black">2. الدعم والواتساب</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1"><Label>رقم الدعم الفني</Label><Input defaultValue={BrandConfig.supportPhone} className="bg-black" /></div>
              <div className="space-y-1"><Label>رقم الواتساب (دولي)</Label><Input defaultValue={BrandConfig.whatsappNumber} className="bg-black" /></div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-white/5 text-white">
            <CardHeader><CardTitle className="text-lg font-black">3. حقوق المطور</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1"><Label>اسم المطور</Label><Input defaultValue={BrandConfig.developerName} className="bg-black" /></div>
              <div className="space-y-1"><Label>تواصل المطور</Label><Input defaultValue={BrandConfig.developerContact} className="bg-black" /></div>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20 text-white">
            <CardHeader><CardTitle className="text-lg font-black text-primary">4. معالجة وتصدير</CardTitle></CardHeader>
            <CardContent className="space-y-4">
               <p className="text-xs text-zinc-400">عند الضغط على "حفظ"، سيتم تطبيق التعديلات برمجياً على كافة ملفات المشروع.</p>
               <Button className="w-full bg-primary text-black font-black gap-2 h-12 shadow-lg shadow-primary/20">
                  <Save className="w-5 h-5" /> حفظ البيانات في عقل المنصة
               </Button>
               <Button variant="outline" className="w-full border-white/10 gap-2 h-12">
                  <Download className="w-5 h-5" /> تحميل كود الإعدادات الجديد (JSON)
               </Button>
            </CardContent>
          </Card>
        </div>

        <div className="p-8 bg-zinc-900 border border-dashed border-white/10 rounded-[2rem] text-center space-y-6">
           <RefreshCw className="w-16 h-16 mx-auto text-primary animate-spin-slow opacity-20" />
           <div className="space-y-2">
             <h3 className="text-2xl font-black">جاهز لإرسال المشروع؟</h3>
             <p className="text-zinc-400 max-w-lg mx-auto font-bold">بعد حفظ البيانات، يمكنك ضغط هذا المشروع كملف ZIP وإرساله للعميل. سيعمل فوراً ببياناته هو 100%.</p>
           </div>
           <Button className="bg-white text-black font-black px-12 h-14 rounded-2xl shadow-2xl">
              تجهيز المشروع للتحميل (ZIP)
           </Button>
        </div>
      </div>
    </div>
  );
}
