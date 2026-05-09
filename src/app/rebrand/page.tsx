"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  ShieldCheck, 
  Download, 
  Loader2, 
  Globe, 
  Zap,
  RefreshCw,
  Code2,
  Palette,
  Github,
  CheckCircle2,
  Rocket,
  Info,
  Mail,
  Lock,
  ArrowRight
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { packageProject, deployToGitHub } from './actions';
import { BrandConfig as CurrentConfig } from '@/lib/brand-config';
import { firebaseConfig as CurrentFirebase } from '@/firebase/config';

export default function MasterRebranderPage() {
  const [isAuth, setIsAuth] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [isPackaging, setIsPackaging] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    ...CurrentConfig,
    firebase: { ...CurrentFirebase },
    github: { token: '', repoName: '' }
  });

  const [firebaseJson, setFirebaseJson] = useState('');

  const hexToHsl = (hex: string) => {
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
      r = parseInt(hex[1] + hex[1], 16);
      g = parseInt(hex[2] + hex[2], 16);
      b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
      r = parseInt(hex.slice(1, 3), 16);
      g = parseInt(hex.slice(3, 5), 16);
      b = parseInt(hex.slice(5, 7), 16);
    }
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s, l = (max + min) / 2;
    if (max === min) h = s = 0;
    else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  };

  const handleColorChange = (type: 'primary' | 'accent', hex: string) => {
    const hsl = hexToHsl(hex);
    setFormData(prev => ({
      ...prev,
      colors: { ...prev.colors, [type]: hsl }
    }));
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginEmail.toLowerCase() === 'master@admin.com' && loginPass === 'master2025') {
      setIsAuth(true);
      toast({ title: "مرحباً يا ماستر", description: "النظام الجذري جاهز للعمل." });
    } else {
      toast({ variant: "destructive", title: "خطأ في الدخول", description: "بيانات الماستر غير صحيحة." });
    }
  };

  const handleParseFirebaseJson = () => {
    try {
      const config = JSON.parse(firebaseJson);
      setFormData(prev => ({ ...prev, firebase: config }));
      toast({ title: "تم التحديث", description: "تم استخراج إعدادات Firebase بنجاح." });
    } catch (e) {
      toast({ variant: "destructive", title: "JSON غير صالح" });
    }
  };

  const handleDownloadFullProject = async () => {
    setIsPackaging(true);
    try {
      const base64 = await packageProject(formData);
      const link = document.createElement('a');
      link.href = `data:application/zip;base64,${base64}`;
      link.download = `${formData.shortName.replace(/\s+/g, '_')}_Final.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: "اكتملت التعبئة", description: "جاري تحميل النسخة المطهّرة..." });
    } catch (e) {
      toast({ variant: "destructive", title: "فشل التعبئة" });
    } finally { setIsPackaging(false); }
  };

  const handleGitHubDeploy = async () => {
    if (!formData.github.token || !formData.github.repoName) {
      toast({ variant: "destructive", title: "بيانات ناقصة", description: "يرجى تعبئة حقول GitHub." });
      return;
    }
    setIsDeploying(true);
    try {
      const result = await deployToGitHub(formData);
      toast({ 
        title: "تم الرفع بنجاح! 🚀", 
        description: "كافة ملفات المنصة أصبحت على GitHub الآن في Commit واحد نظيف." 
      });
      window.open(result.url, '_blank');
    } catch (e: any) {
      toast({ variant: "destructive", title: "فشل الرفع", description: e.message });
    } finally { setIsDeploying(false); }
  };

  if (!isAuth) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-zinc-900 border-primary/20 text-white overflow-hidden rounded-[2rem] shadow-2xl">
          <div className="h-2 bg-primary" />
          <CardHeader className="text-center pb-8 pt-10">
            <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto text-primary mb-6">
              <ShieldCheck className="w-12 h-12" />
            </div>
            <CardTitle className="text-2xl font-black">مصنع النسخ المطهّرة</CardTitle>
            <p className="text-zinc-500 text-sm mt-2">The Ultimate Software Factory V5</p>
          </CardHeader>
          <CardContent className="space-y-6 px-8 pb-10">
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 justify-end">بريد الماستر <Mail className="w-4 h-4 text-primary" /></Label>
                <Input type="email" placeholder="master@admin.com" className="bg-black border-white/10 text-center h-14 rounded-2xl" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2 justify-end">كلمة السر <Lock className="w-4 h-4 text-primary" /></Label>
                <Input type="password" placeholder="••••••••" className="bg-black border-white/10 text-center h-14 rounded-2xl" value={loginPass} onChange={(e) => setLoginPass(e.target.value)} required />
              </div>
              <Button className="w-full h-16 bg-primary text-black font-black text-xl rounded-2xl shadow-xl shadow-primary/10 hover:scale-[1.02] transition-transform">دخول الغرفة المحصنة</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 md:p-12 text-right selection:bg-primary selection:text-black">
      <div className="max-w-6xl mx-auto space-y-12 pb-32">
        <header className="flex flex-col md:flex-row-reverse justify-between items-center border-b border-white/10 pb-8 gap-6">
           <div>
              <h1 className="text-4xl md:text-5xl font-black text-primary flex items-center gap-4 justify-end">
                محرك النشر والرفع التلقائي <RefreshCw className="w-10 h-10 animate-spin-slow" />
              </h1>
              <p className="text-zinc-400 mt-2 font-bold italic text-lg opacity-60">تطهير كامل، بناء Blobs، ورفع شامل بضغطة زر واحدة.</p>
           </div>
           <Button variant="outline" className="border-white/10 h-12 px-8 rounded-xl font-bold hover:bg-destructive hover:text-white" onClick={() => window.location.reload()}>خروج آمن</Button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* 1. الهوية والبيانات */}
          <Card className="bg-zinc-900 border-white/5 text-white shadow-2xl rounded-3xl overflow-hidden">
            <CardHeader className="bg-white/5 border-b py-6"><CardTitle className="text-xl font-black flex items-center gap-3 justify-end"><Globe className="w-6 h-6 text-primary" /> 1. هوية العميل الجديد</CardTitle></CardHeader>
            <CardContent className="space-y-6 pt-8">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2"><Label className="font-bold">اسم المنصة</Label><Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="bg-black border-white/10 h-12" /></div>
                <div className="space-y-2"><Label className="font-bold">الاسم المختصر</Label><Input value={formData.shortName} onChange={(e) => setFormData({...formData, shortName: e.target.value})} className="bg-black border-white/10 h-12" /></div>
              </div>
              <div className="space-y-2">
                <Label className="font-black text-primary">بريد الإدارة (سيصبح الأدمن)</Label>
                <Input value={formData.adminEmail} onChange={(e) => setFormData({...formData, adminEmail: e.target.value})} className="bg-black border-white/10 text-center text-primary font-black h-12" />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2"><Label className="font-bold">واتساب (201xxxx)</Label><Input value={formData.whatsappNumber} onChange={(e) => setFormData({...formData, whatsappNumber: e.target.value})} className="bg-black border-white/10 h-12" /></div>
                <div className="space-y-2"><Label className="font-bold">رقم الدعم</Label><Input value={formData.supportPhone} onChange={(e) => setFormData({...formData, supportPhone: e.target.value})} className="bg-black border-white/10 h-12" /></div>
              </div>
            </CardContent>
          </Card>

          {/* 2. الألوان والتحكم البصري */}
          <Card className="bg-zinc-900 border-white/5 text-white shadow-2xl rounded-3xl overflow-hidden">
            <CardHeader className="bg-white/5 border-b py-6"><CardTitle className="text-xl font-black flex items-center gap-3 justify-end"><Palette className="w-6 h-6 text-accent" /> 2. الألوان والبراند</CardTitle></CardHeader>
            <CardContent className="py-10">
              <div className="grid grid-cols-2 gap-12">
                 <div className="space-y-4 text-center">
                    <Label className="font-black text-lg block">اللون الأساسي</Label>
                    <div className="relative group">
                       <input type="color" className="w-full h-24 rounded-3xl cursor-pointer bg-transparent border-4 border-white/10 p-1" onChange={(e) => handleColorChange('primary', e.target.value)} />
                       <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"><Zap className="w-8 h-8 text-white drop-shadow-lg" /></div>
                    </div>
                    <div className="text-xs font-mono opacity-40 bg-black py-1 rounded-full">{formData.colors.primary}</div>
                 </div>
                 <div className="space-y-4 text-center">
                    <Label className="font-black text-lg block">لون التميز</Label>
                    <div className="relative group">
                       <input type="color" className="w-full h-24 rounded-3xl cursor-pointer bg-transparent border-4 border-white/10 p-1" onChange={(e) => handleColorChange('accent', e.target.value)} />
                       <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"><Zap className="w-8 h-8 text-white drop-shadow-lg" /></div>
                    </div>
                    <div className="text-xs font-mono opacity-40 bg-black py-1 rounded-full">{formData.colors.accent}</div>
                 </div>
              </div>
            </CardContent>
          </Card>

          {/* 3. الرفع التلقائي لـ GitHub */}
          <Card className="bg-zinc-900 border-blue-500/20 text-white shadow-2xl border-dashed border-2 rounded-3xl overflow-hidden">
            <CardHeader className="bg-blue-500/10 border-b py-6"><CardTitle className="text-xl font-black flex items-center gap-3 justify-end text-blue-400"><Github className="w-6 h-6" /> 3. محرك الرفع (GitHub API)</CardTitle></CardHeader>
            <CardContent className="space-y-6 pt-8">
              <div className="space-y-2">
                <Label className="font-bold">GitHub Token (سري للغاية)</Label>
                <Input type="password" placeholder="ghp_xxxxxxxxxxxxxxxxxxxx" value={formData.github.token} onChange={(e) => setFormData({...formData, github: {...formData.github, token: e.target.value}})} className="bg-black border-white/10 font-mono h-12 text-blue-400" />
              </div>
              <div className="space-y-2">
                <Label className="font-bold">اسم المستودع (سيتولى المحرك إنشاؤه)</Label>
                <Input placeholder="my-new-academy-repo" value={formData.github.repoName} onChange={(e) => setFormData({...formData, github: {...formData.github, repoName: e.target.value}})} className="bg-black border-white/10 h-12" />
              </div>
              <div className="p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10 flex gap-3">
                 <Info className="w-6 h-6 text-blue-400 shrink-0" />
                 <p className="text-xs text-zinc-400 leading-relaxed font-bold">يقوم المحرك برفع كل ملف على حدة كـ Blob لضمان استقرار العملية 100%.</p>
              </div>
            </CardContent>
          </Card>

          {/* 4. إعدادات الفايربيز */}
          <Card className="bg-zinc-900 border-white/5 text-white shadow-2xl rounded-3xl overflow-hidden">
            <CardHeader className="bg-white/5 border-b py-6"><CardTitle className="text-xl font-black flex items-center gap-3 justify-end"><Code2 className="w-6 h-6 text-accent" /> 4. محرك الربط (Firebase JSON)</CardTitle></CardHeader>
            <CardContent className="space-y-6 pt-8">
              <div className="space-y-4">
                <Label className="flex items-center gap-2 justify-end font-bold opacity-60">ألصق الكود البرمجي من لوحة تحكم Firebase للعميل</Label>
                <Textarea 
                  placeholder='{"apiKey": "AIza...", "authDomain": "...", ...}' 
                  className="min-h-[150px] bg-black border-white/10 font-mono text-[11px] text-accent p-6 rounded-2xl leading-relaxed shadow-inner"
                  value={firebaseJson}
                  onChange={(e) => setFirebaseJson(e.target.value)}
                />
                <Button onClick={handleParseFirebaseJson} variant="secondary" className="w-full font-black h-12 rounded-xl border border-white/5 hover:bg-accent hover:text-white transition-colors">تحليل وتوزيع البيانات آلياً</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* أزرار الإطلاق الكبرى */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 py-10">
           <Button 
             onClick={handleDownloadFullProject} 
             disabled={isPackaging || isDeploying}
             className="h-32 bg-zinc-800 text-white font-black text-3xl rounded-[2.5rem] shadow-2xl hover:bg-zinc-700 transition-all gap-5 border-4 border-white/5 relative overflow-hidden group"
           >
             {isPackaging ? <Loader2 className="w-12 h-12 animate-spin" /> : <Download className="w-12 h-12" />}
             <div className="text-right">
                <p>تعبئة وتحميل ZIP</p>
                <p className="text-xs font-normal opacity-50 mt-1">تجهيز الملفات للتسليم اليدوي</p>
             </div>
           </Button>

           <Button 
             onClick={handleGitHubDeploy} 
             disabled={isDeploying || isPackaging}
             className="h-32 bg-primary text-black font-black text-3xl rounded-[2.5rem] shadow-2xl hover:scale-[1.02] transition-all gap-5 relative group"
           >
             {isDeploying ? <Loader2 className="w-12 h-12 animate-spin" /> : <Rocket className="w-12 h-12" />}
             <div className="text-right">
                <p>رفع تلقائي لـ GitHub 🚀</p>
                <p className="text-xs font-normal opacity-50 mt-1">بناء Blobs ونشر الكود فوراً</p>
             </div>
           </Button>
        </div>

        <div className="flex items-center gap-4 text-accent font-black justify-center animate-pulse py-10 border-t border-white/5">
           <CheckCircle2 className="w-8 h-8" />
           <span className="text-xl">تنبيه الماستر: الرفع يتم في Commit واحد نظيف وبدون أي أثر لنظام الأتمتة.</span>
        </div>
      </div>
    </div>
  );
}
