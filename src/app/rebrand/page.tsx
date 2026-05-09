"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  ShieldCheck, 
  PackageCheck, 
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
  AlertTriangle,
  Info
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
    setFormData({
      ...formData,
      colors: { ...formData.colors, [type]: hsl }
    });
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginEmail === 'master@admin.com' && loginPass === 'master2025') {
      setIsAuth(true);
      toast({ title: "مرحباً يا ماستر", description: "محرك التطهير والنشر التلقائي جاهز." });
    } else {
      toast({ variant: "destructive", title: "خطأ", description: "بيانات دخول الماستر غير صحيحة." });
    }
  };

  const handleParseFirebaseJson = () => {
    try {
      const config = JSON.parse(firebaseJson);
      setFormData({ ...formData, firebase: config });
      toast({ title: "تم تحليل الكود", description: "تم تحديث إعدادات فايربيز آلياً." });
    } catch (e) {
      toast({ variant: "destructive", title: "خطأ في الكود", description: "تأكد من نسخ كود الـ JSON بشكل صحيح." });
    }
  };

  const handleDownloadFullProject = async () => {
    setIsPackaging(true);
    try {
      const base64 = await packageProject(formData);
      const link = document.createElement('a');
      link.href = `data:application/zip;base64,${base64}`;
      link.download = `${formData.shortName.replace(/\s+/g, '_')}_Clean_Package.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: "اكتمل التطهير", description: "تم إنتاج نسخة بِكر 100%." });
    } catch (e) {
      toast({ variant: "destructive", title: "فشل التعبئة" });
    } finally { setIsPackaging(false); }
  };

  const handleGitHubDeploy = async () => {
    if (!formData.github.token || !formData.github.repoName) {
      toast({ variant: "destructive", title: "بيانات ناقصة", description: "يرجى إدخال الـ Token واسم المستودع." });
      return;
    }
    setIsDeploying(true);
    try {
      const result = await deployToGitHub(formData);
      toast({ 
        title: "تم الرفع بنجاح! 🚀", 
        description: "تم إنشاء المستودع ورفع الكود المطهّر إليه مباشرة." 
      });
      window.open(result.url, '_blank');
    } catch (e: any) {
      toast({ variant: "destructive", title: "فشل الرفع لـ GitHub", description: e.message });
    } finally { setIsDeploying(false); }
  };

  if (!isAuth) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 text-right">
        <Card className="w-full max-w-md bg-zinc-900 border-primary/20 text-white">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto text-primary mb-4">
              <ShieldCheck className="w-10 h-10" />
            </div>
            <CardTitle className="text-xl font-black">مصنع النسخ (The Deployer Engine)</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label className="block text-right">بريد الماستر</Label>
                <Input type="email" placeholder="master@admin.com" className="bg-black border-white/10 text-center" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="block text-right">كلمة السر</Label>
                <Input type="password" placeholder="••••••••" className="bg-black border-white/10 text-center" value={loginPass} onChange={(e) => setLoginPass(e.target.value)} />
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
      <div className="max-w-6xl mx-auto space-y-12 pb-20">
        <header className="flex flex-col md:flex-row-reverse justify-between items-center border-b border-white/10 pb-8 gap-6">
           <div>
              <h1 className="text-4xl font-black text-primary flex items-center gap-3 justify-end">محرك التطهير والنشر التلقائي <RefreshCw className="w-8 h-8 animate-spin-slow" /></h1>
              <p className="text-zinc-400 mt-2 font-bold italic">اربط، طهّر، وانشر.. المنصة ستصبح ملك العميل الجديد بضغطة زر واحدة.</p>
           </div>
           <Button variant="outline" className="border-white/10" onClick={() => window.location.reload()}>خروج آمن</Button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <Card className="bg-zinc-900 border-white/5 text-white shadow-2xl">
            <CardHeader className="bg-white/5 border-b"><CardTitle className="text-lg font-black flex items-center gap-2 justify-end"><Globe className="w-5 h-5 text-primary" /> 1. بيانات الهوية الجديدة</CardTitle></CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><Label>اسم المنصة</Label><Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="bg-black border-white/10" /></div>
                <div className="space-y-1"><Label>الاسم المختصر</Label><Input value={formData.shortName} onChange={(e) => setFormData({...formData, shortName: e.target.value})} className="bg-black border-white/10" /></div>
              </div>
              <div className="space-y-1"><Label>بريد المسؤول (المنصة والـ Rules)</Label><Input value={formData.adminEmail} onChange={(e) => setFormData({...formData, adminEmail: e.target.value})} className="bg-black border-white/10 text-center text-primary font-bold" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><Label>واتساب (201xxxx)</Label><Input value={formData.whatsappNumber} onChange={(e) => setFormData({...formData, whatsappNumber: e.target.value})} className="bg-black border-white/10" /></div>
                <div className="space-y-1"><Label>رقم الدعم الفني</Label><Input value={formData.supportPhone} onChange={(e) => setFormData({...formData, supportPhone: e.target.value})} className="bg-black border-white/10" /></div>
              </div>
              <div className="space-y-1"><Label>توقيع المطور النهائي</Label><Input value={formData.developerName} onChange={(e) => setFormData({...formData, developerName: e.target.value})} className="bg-black border-white/10" /></div>
            </CardContent>
          </Card>

          <div className="space-y-8">
            <Card className="bg-zinc-900 border-white/5 text-white shadow-2xl">
              <CardHeader className="bg-white/5 border-b"><CardTitle className="text-lg font-black flex items-center gap-2 justify-end"><Palette className="w-5 h-5 text-accent" /> 2. الألوان (منقي ألوان ذكي)</CardTitle></CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="grid grid-cols-2 gap-10">
                   <div className="space-y-4">
                      <Label className="block text-center font-bold">اللون الأساسي</Label>
                      <input type="color" className="w-full h-16 rounded-2xl cursor-pointer bg-transparent border-2 border-white/10" onChange={(e) => handleColorChange('primary', e.target.value)} />
                      <div className="text-[10px] text-center font-mono opacity-40">{formData.colors.primary}</div>
                   </div>
                   <div className="space-y-4">
                      <Label className="block text-center font-bold">لون التميز</Label>
                      <input type="color" className="w-full h-16 rounded-2xl cursor-pointer bg-transparent border-2 border-white/10" onChange={(e) => handleColorChange('accent', e.target.value)} />
                      <div className="text-[10px] text-center font-mono opacity-40">{formData.colors.accent}</div>
                   </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-blue-500/20 text-white shadow-2xl border-dashed border-2">
              <CardHeader className="bg-blue-500/5 border-b"><CardTitle className="text-lg font-black flex items-center gap-2 justify-end text-blue-400"><Github className="w-5 h-5" /> 3. النشر لـ GitHub (تلقائي)</CardTitle></CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="space-y-1"><Label>GitHub Personal Access Token</Label><Input type="password" placeholder="ghp_xxxx..." value={formData.github.token} onChange={(e) => setFormData({...formData, github: {...formData.github, token: e.target.value}})} className="bg-black border-white/10 font-mono" /></div>
                <div className="space-y-1"><Label>اسم المستودع الجديد</Label><Input placeholder="my-new-academy-repo" value={formData.github.repoName} onChange={(e) => setFormData({...formData, github: {...formData.github, repoName: e.target.value}})} className="bg-black border-white/10" /></div>
                <div className="p-3 bg-blue-500/5 rounded-xl border border-blue-500/10 flex gap-2">
                   <Info className="w-4 h-4 text-blue-400 shrink-0" />
                   <p className="text-[10px] text-zinc-400 leading-relaxed">بمجرد الضغط على زر الرفع، سيقوم النظام بإنشاء المستودع ورفع الملفات المطهّرة آلياً إلى حسابك.</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="lg:col-span-2 bg-zinc-900 border-white/5 text-white shadow-2xl">
            <CardHeader className="bg-white/5 border-b"><CardTitle className="text-lg font-black flex items-center gap-2 justify-end"><Code2 className="w-5 h-5 text-accent" /> 4. إعدادات Firebase (Copy/Paste JSON)</CardTitle></CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 justify-end">ألصق كود الـ JSON الخاص بمشروع العميل <Zap className="w-3 h-3 text-accent" /></Label>
                <Textarea 
                  placeholder='{"apiKey": "AIza...", "projectId": "...", ...}' 
                  className="min-h-[120px] bg-black border-white/10 font-mono text-[11px] text-accent"
                  value={firebaseJson}
                  onChange={(e) => setFirebaseJson(e.target.value)}
                />
                <Button onClick={handleParseFirebaseJson} variant="secondary" className="w-full text-xs font-bold gap-2 h-10">تحديث محرك الربط آلياً</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* أزرار التشغيل الكبرى */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-10">
           <Button 
             onClick={handleDownloadFullProject} 
             disabled={isPackaging || isDeploying}
             className="h-28 bg-zinc-800 text-white font-black text-2xl rounded-[2.5rem] shadow-2xl hover:bg-zinc-700 transition-all gap-4 border-2 border-white/5"
           >
             {isPackaging ? <Loader2 className="w-10 h-10 animate-spin" /> : <Download className="w-10 h-10" />}
             إنتاج وتحميل ZIP مطهّر
           </Button>

           <Button 
             onClick={handleGitHubDeploy} 
             disabled={isDeploying || isPackaging}
             className="h-28 bg-primary text-black font-black text-2xl rounded-[2.5rem] shadow-2xl hover:scale-[1.02] transition-all gap-4"
           >
             {isDeploying ? <Loader2 className="w-10 h-10 animate-spin" /> : <Rocket className="w-10 h-10" />}
             رفع تلقائي لـ GitHub 🚀
           </Button>
        </div>

        <div className="flex items-center gap-4 text-accent font-bold justify-center animate-pulse">
           <CheckCircle2 className="w-6 h-6" />
           <span>تنبيه الماستر: الرفع التلقائي يحذف نظام `/rebrand` لضمان خصوصية العميل.</span>
        </div>
      </div>
    </div>
  );
}
