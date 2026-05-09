
"use client";

import { useState, useEffect } from 'react';
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
  AlertTriangle,
  Terminal,
  Copy,
  MessageCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { packageProject } from './actions';
import { BrandConfig as CurrentConfig } from '@/lib/brand-config';
import { firebaseConfig as CurrentFirebase } from '@/firebase/config';

export default function MasterRebranderPage() {
  const [isAuth, setIsAuth] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [isPackaging, setIsPackaging] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    ...CurrentConfig,
    firebase: { ...CurrentFirebase },
    github: { token: '', repoName: '' }
  });

  const [firebaseJson, setFirebaseJson] = useState('');

  // تحويل Hex إلى HSL للحقن في CSS
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
      toast({ title: "مرحباً يا ماستر", description: "محرك التطهير العميق جاهز." });
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

      toast({ 
        title: "اكتمل التطهير والتحميل", 
        description: "تم إنتاج نسخة بِكر 100% بدون أي أثر قديم." 
      });
    } catch (e: any) {
      console.error(e);
      toast({ variant: "destructive", title: "فشل التعبئة", description: "حدث خطأ أثناء فحص الملفات." });
    } finally {
      setIsPackaging(false);
    }
  };

  const githubCommand = `git init
git remote add origin https://github.com/${formData.github.repoName || 'YOUR_USERNAME/REPO_NAME'}.git
git add .
git commit -m "الإطلاق الأول للمنصة - نسخة العميل: ${formData.shortName}"
git branch -M main
git push -u origin main`;

  if (!isAuth) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 text-right">
        <Card className="w-full max-w-md bg-zinc-900 border-primary/20 text-white">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto text-primary mb-4">
              <ShieldCheck className="w-10 h-10" />
            </div>
            <CardTitle className="text-xl font-black">مصنع النسخ (The Ultimate Purger)</CardTitle>
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
              <h1 className="text-4xl font-black text-primary flex items-center gap-3 justify-end">محرك التطهير والتغليف الشامل <RefreshCw className="w-8 h-8 animate-spin-slow" /></h1>
              <p className="text-zinc-400 mt-2 font-bold">المحرك سيفحص كل حرف ويستبدله، ويعدل الألوان، ويجهز لك كود الرفع لـ GitHub.</p>
           </div>
           <Button variant="outline" className="border-white/10" onClick={() => window.location.reload()}>خروج آمن</Button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* 1. بيانات الهوية */}
          <Card className="bg-zinc-900 border-white/5 text-white shadow-2xl">
            <CardHeader className="bg-white/5 border-b"><CardTitle className="text-lg font-black flex items-center gap-2 justify-end"><Globe className="w-5 h-5 text-primary" /> 1. بيانات الهوية الجديدة</CardTitle></CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><Label>اسم المنصة</Label><Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="bg-black border-white/10" /></div>
                <div className="space-y-1"><Label>الاسم المختصر</Label><Input value={formData.shortName} onChange={(e) => setFormData({...formData, shortName: e.target.value})} className="bg-black border-white/10" /></div>
              </div>
              <div className="space-y-1"><Label>بريد الأدمن الجديد (مهم جداً)</Label><Input value={formData.adminEmail} onChange={(e) => setFormData({...formData, adminEmail: e.target.value})} className="bg-black border-white/10 text-center text-primary" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><Label>رقم الواتساب (بالكود)</Label><Input value={formData.whatsappNumber} onChange={(e) => setFormData({...formData, whatsappNumber: e.target.value})} className="bg-black border-white/10" /></div>
                <div className="space-y-1"><Label>رقم دعم السكرتارية</Label><Input value={formData.supportPhone} onChange={(e) => setFormData({...formData, supportPhone: e.target.value})} className="bg-black border-white/10" /></div>
              </div>
              <div className="pt-4 border-t border-white/5 space-y-4">
                <div className="space-y-1"><Label>توقيع المطور (يظهر في الفوتر)</Label><Input value={formData.developerName} onChange={(e) => setFormData({...formData, developerName: e.target.value})} className="bg-black border-white/10" /></div>
              </div>
            </CardContent>
          </Card>

          {/* 2. الألوان المرئية */}
          <div className="space-y-8">
            <Card className="bg-zinc-900 border-white/5 text-white shadow-2xl">
              <CardHeader className="bg-white/5 border-b"><CardTitle className="text-lg font-black flex items-center gap-2 justify-end"><Palette className="w-5 h-5 text-accent" /> 2. الألوان والثيم المرئي</CardTitle></CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="grid grid-cols-2 gap-10">
                   <div className="space-y-4">
                      <Label className="block">اللون الأساسي (Primary)</Label>
                      <input 
                        type="color" 
                        className="w-full h-16 rounded-xl cursor-pointer bg-transparent border-2 border-white/10"
                        onChange={(e) => handleColorChange('primary', e.target.value)}
                      />
                      <div className="text-[10px] font-mono text-zinc-500">HSL: {formData.colors.primary}</div>
                   </div>
                   <div className="space-y-4">
                      <Label className="block">لون التميز (Accent)</Label>
                      <input 
                        type="color" 
                        className="w-full h-16 rounded-xl cursor-pointer bg-transparent border-2 border-white/10"
                        onChange={(e) => handleColorChange('accent', e.target.value)}
                      />
                      <div className="text-[10px] font-mono text-zinc-500">HSL: {formData.colors.accent}</div>
                   </div>
                </div>
                <div className="p-4 bg-primary/5 rounded-xl flex items-center gap-3 border border-primary/20">
                   <div className="w-8 h-8 rounded bg-primary" style={{ backgroundColor: `hsl(${formData.colors.primary})` }} />
                   <div className="w-8 h-8 rounded bg-accent" style={{ backgroundColor: `hsl(${formData.colors.accent})` }} />
                   <p className="text-xs text-zinc-400">هذه الألوان سيتم تطبيقها عالمياً على الأزرار، الأيقونات، والروابط.</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-white/5 text-white shadow-2xl border-dashed border-2 border-blue-500/20">
              <CardHeader className="bg-blue-500/5 border-b"><CardTitle className="text-lg font-black flex items-center gap-2 justify-end text-blue-400"><Github className="w-5 h-5" /> 3. الربط مع GitHub</CardTitle></CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="space-y-1"><Label>اسم المستودع (Repo Name)</Label><Input placeholder="physics-academy-client" value={formData.github.repoName} onChange={(e) => setFormData({...formData, github: {...formData.github, repoName: e.target.value}})} className="bg-black border-white/10" /></div>
                <div className="p-4 bg-zinc-950 rounded-xl space-y-3">
                   <div className="flex justify-between items-center flex-row-reverse">
                      <Label className="text-[10px] font-black text-blue-400 flex items-center gap-1"><Terminal className="w-3 h-3" /> كود الرفع السريع</Label>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { navigator.clipboard.writeText(githubCommand); toast({title: "تم النسخ"}); }}><Copy className="w-3 h-3" /></Button>
                   </div>
                   <pre className="text-[9px] font-mono text-zinc-500 bg-black/50 p-3 rounded border border-white/5 overflow-x-auto leading-relaxed">
                      {githubCommand}
                   </pre>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 3. إعدادات Firebase JSON */}
          <Card className="lg:col-span-2 bg-zinc-900 border-white/5 text-white shadow-2xl">
            <CardHeader className="bg-white/5 border-b"><CardTitle className="text-lg font-black flex items-center gap-2 justify-end"><Code2 className="w-5 h-5 text-accent" /> 4. إعدادات Firebase (نسخ من الموقع)</CardTitle></CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 justify-end">ألصق كود الـ JSON الخاص بمشروع العميل هنا <Zap className="w-3 h-3 text-accent" /></Label>
                <Textarea 
                  placeholder='{"apiKey": "AIza...", "projectId": "...", ...}' 
                  className="min-h-[150px] bg-black border-white/10 font-mono text-[10px] text-accent"
                  value={firebaseJson}
                  onChange={(e) => setFirebaseJson(e.target.value)}
                />
                <Button onClick={handleParseFirebaseJson} variant="secondary" className="w-full text-xs font-bold gap-2">تطبيق وبرمجة الإعدادات</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* زر الإنتاج النهائي */}
        <div className="flex flex-col items-center gap-6 py-20 bg-primary/5 rounded-[4rem] border-4 border-dashed border-primary/20 relative overflow-hidden">
            <div className="absolute inset-0 bg-primary/5 animate-pulse pointer-events-none" />
            <PackageCheck className="w-24 h-24 text-primary" />
            <div className="text-center space-y-4 relative z-10">
              <h2 className="text-5xl font-black">جاهز للتحويل العالمي؟</h2>
              <p className="text-zinc-400 font-bold max-w-3xl px-8 leading-relaxed">
                سيقوم المحرك بمسح المشروع بالكامل، استبدال كافة البيانات، تعديل الهوية البصرية، <br/>
                وحذف نظام الماستر لضمان خصوصية مطلقة للنسخة الجديدة.
              </p>
            </div>
            
            <div className="flex flex-wrap justify-center gap-6 relative z-10">
              <Button 
                onClick={handleDownloadFullProject} 
                disabled={isPackaging}
                className="h-24 px-16 bg-primary text-black font-black text-3xl rounded-[2rem] shadow-2xl hover:scale-105 transition-all gap-5"
              >
                {isPackaging ? (
                  <><Loader2 className="w-10 h-10 animate-spin" /> جاري التطهير والضغط...</>
                ) : (
                  <><Download className="w-10 h-10" /> إنتاج وتحميل نسخة العميل ZIP</>
                )}
              </Button>
            </div>

            <div className="flex items-center gap-4 text-accent font-bold animate-bounce mt-8">
               <CheckCircle2 className="w-6 h-6" />
               <span>تنبيه: النسخة الناتجة هي "مشروع بِكر" جاهز للرفع المباشر.</span>
            </div>
        </div>
      </div>
    </div>
  );
}
