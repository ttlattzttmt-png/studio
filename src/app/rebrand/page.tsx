
"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  ShieldCheck, 
  Lock, 
  Download, 
  RefreshCw, 
  Terminal, 
  Mail, 
  Database, 
  Globe, 
  Key,
  FileCode,
  PackageCheck
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { BrandConfig as CurrentConfig } from '@/lib/brand-config';
import { firebaseConfig as CurrentFirebase } from '@/firebase/config';

export default function MasterRebranderPage() {
  const [isAuth, setIsAuth] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const { toast } = useToast();

  // بيانات الهوية الجديدة
  const [newConfig, setNewConfig] = useState({ ...CurrentConfig });
  
  // بيانات فايربيز الجديدة
  const [newFirebase, setNewFirebase] = useState({ ...CurrentFirebase });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginEmail === 'master@admin.com' && loginPass === 'master2025') {
      setIsAuth(true);
      toast({ title: "مرحباً يا ماستر", description: "النظام جاهز لتوليد نسخة جديدة 100%." });
    } else {
      toast({ variant: "destructive", title: "خطأ", description: "بيانات دخول الماستر غير صحيحة." });
    }
  };

  const downloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/typescript' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGeneratePackage = () => {
    // 1. توليد ملف brand-config.ts
    const brandContent = `
export const BrandConfig = ${JSON.stringify(newConfig, null, 2)};
`;
    downloadFile('brand-config.ts', brandContent);

    // 2. توليد ملف config.ts الخاص بفايربيز
    const firebaseContent = `
export const firebaseConfig = ${JSON.stringify(newFirebase, null, 2)};
`;
    downloadFile('firebase-config.ts', firebaseContent);

    toast({ 
      title: "تم استخراج الملفات", 
      description: "استبدل هذه الملفات في المشروع الجديد ليصبح ملكاً للعميل كلياً." 
    });
  };

  if (!isAuth) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-zinc-900 border-primary/20 text-white text-right">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto text-primary mb-4">
              <ShieldCheck className="w-10 h-10" />
            </div>
            <CardTitle className="text-xl font-black">نظام توليد النسخ (Master)</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label>بريد الماستر</Label>
                <Input 
                  type="email" 
                  placeholder="master@admin.com"
                  className="bg-black border-white/10 text-center" 
                  value={loginEmail} 
                  onChange={(e) => setLoginEmail(e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <Label>كلمة السر</Label>
                <Input 
                  type="password" 
                  className="bg-black border-white/10 text-center" 
                  value={loginPass} 
                  onChange={(e) => setLoginPass(e.target.value)} 
                />
              </div>
              <Button className="w-full h-12 bg-primary text-black font-black">فتح النظام الجذري</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 md:p-12 text-right">
      <div className="max-w-6xl mx-auto space-y-12">
        <header className="flex flex-col md:flex-row-reverse justify-between items-center border-b border-white/10 pb-8 gap-6">
           <div>
              <h1 className="text-4xl font-black text-primary flex items-center gap-3 justify-end">أداة "تصفير المنصة" (Reset & Rebrand) <Terminal className="w-8 h-8" /></h1>
              <p className="text-zinc-400 mt-2 font-bold">هذه الأداة تمسح أي صلة بالمنصة القديمة وتجهز الملفات للعميل الجديد.</p>
           </div>
           <Button variant="outline" className="border-white/10" onClick={() => window.location.reload()}>خروج آمن</Button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* القسم الأول: الهوية */}
          <Card className="bg-zinc-900 border-white/5 text-white">
            <CardHeader className="bg-white/5"><CardTitle className="text-lg font-black flex items-center gap-2 justify-end"><Globe className="w-5 h-5 text-primary" /> 1. بيانات الهوية الجديدة</CardTitle></CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><Label>اسم المنصة</Label><Input value={newConfig.name} onChange={(e) => setNewConfig({...newConfig, name: e.target.value})} className="bg-black border-white/10" /></div>
                <div className="space-y-1"><Label>الاسم المختصر</Label><Input value={newConfig.shortName} onChange={(e) => setNewConfig({...newConfig, shortName: e.target.value})} className="bg-black border-white/10" /></div>
              </div>
              <div className="space-y-1"><Label>بريد الأدمن (المالك الجديد)</Label><Input value={newConfig.adminEmail} onChange={(e) => setNewConfig({...newConfig, adminEmail: e.target.value})} className="bg-black border-white/10 text-center" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><Label>رقم الواتساب</Label><Input value={newConfig.whatsappNumber} onChange={(e) => setNewConfig({...newConfig, whatsappNumber: e.target.value})} className="bg-black border-white/10" /></div>
                <div className="space-y-1"><Label>رقم الدعم</Label><Input value={newConfig.supportPhone} onChange={(e) => setNewConfig({...newConfig, supportPhone: e.target.value})} className="bg-black border-white/10" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                <div className="space-y-1"><Label>اسم المطور (توقيعك)</Label><Input value={newConfig.developerName} onChange={(e) => setNewConfig({...newConfig, developerName: e.target.value})} className="bg-black border-white/10" /></div>
                <div className="space-y-1"><Label>تواصل المطور</Label><Input value={newConfig.developerContact} onChange={(e) => setNewConfig({...newConfig, developerContact: e.target.value})} className="bg-black border-white/10" /></div>
              </div>
            </CardContent>
          </Card>

          {/* القسم الثاني: فايربيز */}
          <Card className="bg-zinc-900 border-white/5 text-white">
            <CardHeader className="bg-white/5"><CardTitle className="text-lg font-black flex items-center gap-2 justify-end"><Database className="w-5 h-5 text-accent" /> 2. ربط Firebase الجديد (قاعدة البيانات)</CardTitle></CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-1"><Label>API Key</Label><Input value={newFirebase.apiKey} onChange={(e) => setNewFirebase({...newFirebase, apiKey: e.target.value})} className="bg-black border-white/10 font-mono text-xs" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><Label>Project ID</Label><Input value={newFirebase.projectId} onChange={(e) => setNewFirebase({...newFirebase, projectId: e.target.value})} className="bg-black border-white/10 font-mono text-xs" /></div>
                <div className="space-y-1"><Label>App ID</Label><Input value={newFirebase.appId} onChange={(e) => setNewFirebase({...newFirebase, appId: e.target.value})} className="bg-black border-white/10 font-mono text-xs" /></div>
              </div>
              <div className="space-y-1"><Label>Auth Domain</Label><Input value={newFirebase.authDomain} onChange={(e) => setNewFirebase({...newFirebase, authDomain: e.target.value})} className="bg-black border-white/10 font-mono text-xs" /></div>
              <div className="space-y-1"><Label>Storage Bucket</Label><Input value={newFirebase.storageBucket} onChange={(e) => setNewFirebase({...newFirebase, storageBucket: e.target.value})} className="bg-black border-white/10 font-mono text-xs" /></div>
            </CardContent>
          </Card>
        </div>

        {/* زر التنفيذ */}
        <div className="flex flex-col items-center gap-6 py-12 bg-primary/5 rounded-[3rem] border-2 border-dashed border-primary/20">
            <PackageCheck className="w-20 h-20 text-primary animate-bounce" />
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-black">جاهز لتصدير النسخة النهائية؟</h2>
              <p className="text-zinc-400 font-bold max-w-lg">عند الضغط، ستحمل ملفات "عقل المنصة" الجديدة. <br/> ضعها في المجلدات المخصصة ثم قم بضغط المشروع كـ ZIP.</p>
            </div>
            <Button 
              onClick={handleGeneratePackage} 
              className="h-20 px-12 bg-primary text-black font-black text-2xl rounded-2xl shadow-2xl hover:scale-105 transition-transform gap-4"
            >
              <Download className="w-8 h-8" /> تحميل حزمة الإعدادات (The Core)
            </Button>
        </div>

        {/* تعليمات التسليم */}
        <Card className="bg-black border-white/10 p-8">
           <CardHeader><CardTitle className="text-xl font-black flex items-center gap-2 justify-end text-orange-500"><FileCode className="w-6 h-6" /> خطوات تسليم النسخة (صفر أخطاء)</CardTitle></CardHeader>
           <CardContent className="pt-4">
              <ul className="space-y-4 text-right text-zinc-300 font-bold">
                <li className="flex flex-row-reverse gap-3 items-start"><span className="text-primary">1.</span> <span>استبدل ملف `src/lib/brand-config.ts` بالملف الذي حملته الآن.</span></li>
                <li className="flex flex-row-reverse gap-3 items-start"><span className="text-primary">2.</span> <span>استبدل كود `src/firebase/config.ts` ببيانات الفايربيز الجديدة التي حملتها.</span></li>
                <li className="flex flex-row-reverse gap-3 items-start"><span className="text-primary">3.</span> <span>اذهب لـ Firebase Console للمشروع الجديد وفعّل (Email Auth) و (Firestore).</span></li>
                <li className="flex flex-row-reverse gap-3 items-start"><span className="text-primary">4.</span> <span>الآن، قم بضغط مجلد المشروع بالكامل لملف ZIP، وأرسله للعميل.. مبروك البيعة!</span></li>
              </ul>
           </CardContent>
        </Card>
      </div>
    </div>
  );
}
