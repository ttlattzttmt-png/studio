
"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck, Lock, Save, Download, RefreshCw, Terminal, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { BrandConfig as CurrentConfig } from '@/lib/brand-config';

export default function MasterRebranderPage() {
  const [isAuth, setIsAuth] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const { toast } = useToast();

  // بيانات النموذج (منفصلة عن إعدادات المنصة الحالية)
  const [newConfig, setNewConfig] = useState({ ...CurrentConfig });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // بيانات الدخول الخاصة بالماستر
    if (loginEmail === 'master@admin.com' && loginPass === 'master2025') {
      setIsAuth(true);
      toast({ title: "مرحباً يا ماستر", description: "يمكنك الآن توليد هوية جديدة للمنصة." });
    } else {
      toast({ variant: "destructive", title: "خطأ في الدخول", description: "البريد أو كلمة السر غير صحيحة." });
    }
  };

  const handleDownloadConfig = () => {
    const fileContent = `
/**
 * @fileOverview ملف إعدادات الهوية المولد آلياً لعميل جديد.
 * استبدل هذا الملف في مسار src/lib/brand-config.ts
 */

export const BrandConfig = ${JSON.stringify(newConfig, null, 2)};
`;
    const blob = new Blob([fileContent], { type: 'text/typescript' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'brand-config.ts';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({ 
      title: "تم تجهيز الملف", 
      description: "قم بوضع هذا الملف في مشروع العميل الجديد لاستبدال الهوية بالكامل." 
    });
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
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>بريد الماستر</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                    <Input 
                      type="email" 
                      placeholder="master@admin.com"
                      className="bg-black border-white/10 text-center pr-10" 
                      value={loginEmail} 
                      onChange={(e) => setLoginEmail(e.target.value)} 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>كلمة سر النظام الجذري</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                    <Input 
                      type="password" 
                      className="bg-black border-white/10 text-center text-xl pr-10" 
                      value={loginPass} 
                      onChange={(e) => setLoginPass(e.target.value)} 
                    />
                  </div>
                </div>
              </div>
              <Button className="w-full h-14 bg-primary text-black font-black text-lg shadow-lg shadow-primary/10">فتح المنظومة</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8 text-right font-body">
      <div className="max-w-4xl mx-auto space-y-10">
        <header className="flex flex-col md:flex-row-reverse justify-between items-center border-b border-white/10 pb-8 gap-4">
           <div className="text-right">
              <h1 className="text-4xl font-black text-primary flex items-center gap-3 justify-end">أداة توليد الهوية (Rebrander) <Terminal className="w-10 h-10" /></h1>
              <p className="text-zinc-400 mt-2 font-bold">هذه الصفحة لا تعدل مشروعك الحالي؛ هي فقط تولد ملف إعدادات جديد لتحميله.</p>
           </div>
           <Button variant="outline" className="border-white/10" onClick={() => window.location.reload()}>خروج آمن</Button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="bg-zinc-900 border-white/5 text-white">
            <CardHeader><CardTitle className="text-lg font-black border-r-4 border-primary pr-3">1. بيانات العميل الجديد</CardTitle></CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-1"><Label>اسم المنصة الجديد</Label><Input value={newConfig.name} onChange={(e) => setNewConfig({...newConfig, name: e.target.value})} className="bg-black border-white/10" /></div>
              <div className="space-y-1"><Label>الاسم المختصر</Label><Input value={newConfig.shortName} onChange={(e) => setNewConfig({...newConfig, shortName: e.target.value})} className="bg-black border-white/10" /></div>
              <div className="space-y-1"><Label>بريد الأدمن الرسمي</Label><Input value={newConfig.adminEmail} onChange={(e) => setNewConfig({...newConfig, adminEmail: e.target.value})} className="bg-black border-white/10" /></div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-white/5 text-white">
            <CardHeader><CardTitle className="text-lg font-black border-r-4 border-primary pr-3">2. أرقام الدعم</CardTitle></CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-1"><Label>رقم الدعم (للاتصال)</Label><Input value={newConfig.supportPhone} onChange={(e) => setNewConfig({...newConfig, supportPhone: e.target.value})} className="bg-black border-white/10" /></div>
              <div className="space-y-1"><Label>رقم الواتساب (بدون +)</Label><Input value={newConfig.whatsappNumber} onChange={(e) => setNewConfig({...newConfig, whatsappNumber: e.target.value})} className="bg-black border-white/10" /></div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-white/5 text-white">
            <CardHeader><CardTitle className="text-lg font-black border-r-4 border-primary pr-3">3. ملكية المطور</CardTitle></CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-1"><Label>اسم المطور في الأسفل</Label><Input value={newConfig.developerName} onChange={(e) => setNewConfig({...newConfig, developerName: e.target.value})} className="bg-black border-white/10" /></div>
              <div className="space-y-1"><Label>رابط/هاتف المطور</Label><Input value={newConfig.developerContact} onChange={(e) => setNewConfig({...newConfig, developerContact: e.target.value})} className="bg-black border-white/10" /></div>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20 text-white">
            <CardHeader><CardTitle className="text-lg font-black text-primary">4. معالجة وتصدير</CardTitle></CardHeader>
            <CardContent className="space-y-4 pt-4">
               <p className="text-xs text-zinc-400 leading-relaxed">بشمهندس، بمجرد الضغط على تحميل، ستحصل على ملف `brand-config.ts`. ضعه في المشروع الذي ستسلمه للعميل وسيعمل فوراً بهويته الجديدة.</p>
               <Button onClick={handleDownloadConfig} className="w-full bg-primary text-black font-black gap-2 h-16 shadow-xl shadow-primary/20 text-xl">
                  <Download className="w-6 h-6" /> تحميل ملف "عقل المنصة" الجديد
               </Button>
            </CardContent>
          </Card>
        </div>

        <div className="p-10 bg-zinc-900 border-2 border-dashed border-white/10 rounded-[3rem] text-center space-y-6 shadow-inner">
           <RefreshCw className="w-20 h-20 mx-auto text-primary animate-spin-slow opacity-20" />
           <div className="space-y-2">
             <h3 className="text-3xl font-black">جاهز لتسليم النسخة؟</h3>
             <p className="text-zinc-400 max-w-xl mx-auto font-bold leading-relaxed">
               بعد تحميل الملف أعلاه، استبدله بالملف الحالي في نسخة العميل. <br/>
               لا تنسَ تغيير كود الـ Firebase Config في ملف `src/firebase/config.ts` لضمان فصل قواعد البيانات.
             </p>
           </div>
        </div>
      </div>
    </div>
  );
}
