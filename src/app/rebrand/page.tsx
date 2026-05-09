
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
  AlertTriangle
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

  if (!isAuth) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 text-right">
        <Card className="w-full max-w-md bg-zinc-900 border-primary/20 text-white">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto text-primary mb-4">
              <ShieldCheck className="w-10 h-10" />
            </div>
            <CardTitle className="text-xl font-black">مصنع النسخ (The Deep Purger)</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label className="block text-right">بريد الماستر</Label>
                <Input type="email" placeholder="master@admin.com" className="bg-black border-white/10 text-center" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="block text-right">كلمة السر</Label>
                <Input type="password" className="bg-black border-white/10 text-center" value={loginPass} onChange={(e) => setLoginPass(e.target.value)} />
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
              <h1 className="text-4xl font-black text-primary flex items-center gap-3 justify-end">محرك التطهير والتغليف الشامل <RefreshCw className="w-8 h-8 animate-spin-slow" /></h1>
              <p className="text-zinc-400 mt-2 font-bold">المحرك سيفحص كل حرف ويستبدله، ويعدل الألوان، ويرفع الكود باسم العميل الجديد.</p>
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
              <div className="space-y-1"><Label>بريد الأدمن الجديد (مهم للأمان)</Label><Input value={formData.adminEmail} onChange={(e) => setFormData({...formData, adminEmail: e.target.value})} className="bg-black border-white/10 text-center text-primary" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><Label>رقم الواتساب (بالكود)</Label><Input value={formData.whatsappNumber} onChange={(e) => setFormData({...formData, whatsappNumber: e.target.value})} className="bg-black border-white/10" /></div>
                <div className="space-y-1"><Label>رقم الدعم</Label><Input value={formData.supportPhone} onChange={(e) => setFormData({...formData, supportPhone: e.target.value})} className="bg-black border-white/10" /></div>
              </div>
              <div className="pt-4 border-t border-white/5 space-y-4">
                <div className="space-y-1"><Label>توقيع المطور (سيتم استبداله عالمياً)</Label><Input value={formData.developerName} onChange={(e) => setFormData({...formData, developerName: e.target.value})} className="bg-black border-white/10" /></div>
              </div>
            </CardContent>
          </Card>

          {/* 2. الألوان والـ GitHub */}
          <div className="space-y-8">
            <Card className="bg-zinc-900 border-white/5 text-white shadow-2xl">
              <CardHeader className="bg-white/5 border-b"><CardTitle className="text-lg font-black flex items-center gap-2 justify-end"><Palette className="w-5 h-5 text-accent" /> 2. الألوان والثيم</CardTitle></CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="grid grid-cols-2 gap-6">
                   <div className="space-y-2">
                      <Label>اللون الأساسي (Primary HSL)</Label>
                      <Input value={formData.colors.primary} onChange={(e) => setFormData({...formData, colors: {...formData.colors, primary: e.target.value}})} className="bg-black border-white/10 font-mono text-xs" />
                      <div className="h-4 rounded" style={{ backgroundColor: `hsl(${formData.colors.primary})` }} />
                   </div>
                   <div className="space-y-2">
                      <Label>لون التميز (Accent HSL)</Label>
                      <Input value={formData.colors.accent} onChange={(e) => setFormData({...formData, colors: {...formData.colors, accent: e.target.value}})} className="bg-black border-white/10 font-mono text-xs" />
                      <div className="h-4 rounded" style={{ backgroundColor: `hsl(${formData.colors.accent})` }} />
                   </div>
                </div>
                <p className="text-[10px] text-zinc-500 italic">ملاحظة: سيتم حقن هذه الألوان في ملف globals.css لتغيير هوية الموقع بالكامل.</p>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-white/5 text-white shadow-2xl border-dashed border-2 border-blue-500/20">
              <CardHeader className="bg-blue-500/5 border-b"><CardTitle className="text-lg font-black flex items-center gap-2 justify-end text-blue-400"><Github className="w-5 h-5" /> 3. الربط مع GitHub</CardTitle></CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="space-y-1"><Label>GitHub Personal Token</Label><Input type="password" placeholder="ghp_xxxx..." value={formData.github.token} onChange={(e) => setFormData({...formData, github: {...formData.github, token: e.target.value}})} className="bg-black border-white/10 text-xs" /></div>
                <div className="space-y-1"><Label>اسم المستودع (Repo Name)</Label><Input placeholder="new-client-platform" value={formData.github.repoName} onChange={(e) => setFormData({...formData, github: {...formData.github, repoName: e.target.value}})} className="bg-black border-white/10" /></div>
                <div className="p-3 bg-blue-500/10 rounded-lg flex items-center gap-3 text-[10px] text-blue-300">
                   <AlertTriangle className="w-4 h-4 shrink-0" />
                   <p>سيتم رفع النسخة "المطهّرة" فقط (بدون نظام الماستر) إلى حسابك على GitHub آلياً بعد التحميل.</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 3. إعدادات Firebase السهلة */}
          <Card className="lg:col-span-2 bg-zinc-900 border-white/5 text-white shadow-2xl">
            <CardHeader className="bg-white/5 border-b"><CardTitle className="text-lg font-black flex items-center gap-2 justify-end"><Code2 className="w-5 h-5 text-accent" /> 4. إعدادات Firebase (JSON)</CardTitle></CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 justify-end">ألصق كود الـ JSON الخاص بالمشروع الجديد هنا <Zap className="w-3 h-3 text-accent" /></Label>
                <Textarea 
                  placeholder='{"apiKey": "...", "projectId": "...", ...}' 
                  className="min-h-[150px] bg-black border-white/10 font-mono text-[10px] text-accent"
                  value={firebaseJson}
                  onChange={(e) => setFirebaseJson(e.target.value)}
                />
                <Button onClick={handleParseFirebaseJson} variant="secondary" className="w-full text-xs font-bold gap-2">تطبيق إعدادات الربط</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* زر الإنتاج النهائي */}
        <div className="flex flex-col items-center gap-6 py-20 bg-primary/5 rounded-[4rem] border-4 border-dashed border-primary/20 relative overflow-hidden">
            <div className="absolute inset-0 bg-primary/5 animate-pulse pointer-events-none" />
            <PackageCheck className="w-24 h-24 text-primary" />
            <div className="text-center space-y-4 relative z-10">
              <h2 className="text-5xl font-black">جاهز للتحميل والتصدير؟</h2>
              <p className="text-zinc-400 font-bold max-w-3xl px-8 leading-relaxed">
                الضغط على الزر أدناه سيقوم بعملية "تطهير شاملة"، تعديل الألوان، تغيير هوية الـ CSS، <br/>
                وحذف كل ما له علاقة بك من النسخة النهائية لضمان ملكية كاملة للعميل الجديد.
              </p>
            </div>
            
            <div className="flex flex-wrap justify-center gap-6 relative z-10">
              <Button 
                onClick={handleDownloadFullProject} 
                disabled={isPackaging}
                className="h-24 px-16 bg-primary text-black font-black text-3xl rounded-[2rem] shadow-2xl hover:scale-105 transition-all gap-5"
              >
                {isPackaging ? (
                  <><Loader2 className="w-10 h-10 animate-spin" /> جاري التطهير العالمي...</>
                ) : (
                  <><Download className="w-10 h-10" /> إنتاج النسخة المطهّرة ZIP</>
                )}
              </Button>
            </div>

            <div className="flex items-center gap-4 text-accent font-bold animate-bounce mt-8">
               <CheckCircle2 className="w-6 h-6" />
               <span>تنبيه: سيتم حذف صفحة الماستر هذه تماماً من النسخة المحملة لضمان السرية.</span>
            </div>
        </div>
      </div>
    </div>
  );
}
