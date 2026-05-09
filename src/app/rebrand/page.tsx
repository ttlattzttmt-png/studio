
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
  Terminal, 
  Database, 
  Globe, 
  Zap,
  Lock,
  Mail
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
    firebase: { ...CurrentFirebase }
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginEmail === 'master@admin.com' && loginPass === 'master2025') {
      setIsAuth(true);
      toast({ title: "مرحباً يا ماستر", description: "مصنع النسخ جاهز للعمل." });
    } else {
      toast({ variant: "destructive", title: "خطأ", description: "بيانات دخول الماستر غير صحيحة." });
    }
  };

  const handleDownloadFullProject = async () => {
    setIsPackaging(true);
    try {
      const base64 = await packageProject(formData);
      
      // تحويل الـ base64 إلى ملف وتحميله
      const link = document.createElement('a');
      link.href = `data:application/zip;base64,${base64}`;
      link.download = `${formData.shortName}_Final_Project.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({ 
        title: "تم استخراج النسخة النهائية", 
        description: "تحقق من التنزيلات. النسخة مطهرة وجاهزة للتسليم." 
      });
    } catch (e: any) {
      console.error(e);
      toast({ variant: "destructive", title: "فشل التعبئة", description: "حدث خطأ أثناء تجميع ملفات المشروع." });
    } finally {
      setIsPackaging(false);
    }
  };

  if (!isAuth) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-zinc-900 border-primary/20 text-white text-right">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto text-primary mb-4">
              <ShieldCheck className="w-10 h-10" />
            </div>
            <CardTitle className="text-xl font-black">مصنع النسخ (The Factory)</CardTitle>
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
              <h1 className="text-4xl font-black text-primary flex items-center gap-3 justify-end">محرك إنتاج النسخ النهائية <Terminal className="w-8 h-8" /></h1>
              <p className="text-zinc-400 mt-2 font-bold">املأ البيانات، واضغط زر التحميل؛ ستحصل على كود المشروع كاملاً باسم العميل الجديد وبدون صفحة الأتمتة هذه.</p>
           </div>
           <Button variant="outline" className="border-white/10" onClick={() => window.location.reload()}>خروج آمن</Button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* بيانات الهوية */}
          <Card className="bg-zinc-900 border-white/5 text-white shadow-2xl">
            <CardHeader className="bg-white/5"><CardTitle className="text-lg font-black flex items-center gap-2 justify-end"><Globe className="w-5 h-5 text-primary" /> 1. بيانات الهوية الجديدة</CardTitle></CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><Label>اسم المنصة</Label><Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="bg-black border-white/10" /></div>
                <div className="space-y-1"><Label>الاسم المختصر</Label><Input value={formData.shortName} onChange={(e) => setFormData({...formData, shortName: e.target.value})} className="bg-black border-white/10" /></div>
              </div>
              <div className="space-y-1"><Label>وصف المنصة (SEO)</Label><Textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="bg-black border-white/10" /></div>
              <div className="space-y-1"><Label>بريد الأدمن الجديد (حساس جداً)</Label><Input value={formData.adminEmail} onChange={(e) => setFormData({...formData, adminEmail: e.target.value})} className="bg-black border-white/10 text-center text-primary" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><Label>رقم الواتساب</Label><Input value={formData.whatsappNumber} onChange={(e) => setFormData({...formData, whatsappNumber: e.target.value})} className="bg-black border-white/10" /></div>
                <div className="space-y-1"><Label>رقم الدعم</Label><Input value={formData.supportPhone} onChange={(e) => setFormData({...formData, supportPhone: e.target.value})} className="bg-black border-white/10" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                <div className="space-y-1"><Label>توقيع المطور الجديد</Label><Input value={formData.developerName} onChange={(e) => setFormData({...formData, developerName: e.target.value})} className="bg-black border-white/10" /></div>
                <div className="space-y-1"><Label>تواصل المطور</Label><Input value={formData.developerContact} onChange={(e) => setFormData({...formData, developerContact: e.target.value})} className="bg-black border-white/10" /></div>
              </div>
            </CardContent>
          </Card>

          {/* بيانات فايربيز */}
          <Card className="bg-zinc-900 border-white/5 text-white shadow-2xl">
            <CardHeader className="bg-white/5"><CardTitle className="text-lg font-black flex items-center gap-2 justify-end"><Database className="w-5 h-5 text-accent" /> 2. ربط Firebase (المحرك)</CardTitle></CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-1"><Label>API Key</Label><Input value={formData.firebase.apiKey} onChange={(e) => setFormData({...formData, firebase: {...formData.firebase, apiKey: e.target.value}})} className="bg-black border-white/10 font-mono text-xs" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><Label>Project ID</Label><Input value={formData.firebase.projectId} onChange={(e) => setFormData({...formData, firebase: {...formData.firebase, projectId: e.target.value}})} className="bg-black border-white/10 font-mono text-xs" /></div>
                <div className="space-y-1"><Label>App ID</Label><Input value={formData.firebase.appId} onChange={(e) => setFormData({...formData, firebase: {...formData.firebase, appId: e.target.value}})} className="bg-black border-white/10 font-mono text-xs" /></div>
              </div>
              <div className="space-y-1"><Label>Auth Domain</Label><Input value={formData.firebase.authDomain} onChange={(e) => setFormData({...formData, firebase: {...formData.firebase, authDomain: e.target.value}})} className="bg-black border-white/10 font-mono text-xs" /></div>
              <div className="space-y-1"><Label>Storage Bucket</Label><Input value={formData.firebase.storageBucket} onChange={(e) => setFormData({...formData, firebase: {...formData.firebase, storageBucket: e.target.value}})} className="bg-black border-white/10 font-mono text-xs" /></div>
              <div className="space-y-1"><Label>Messaging Sender ID</Label><Input value={formData.firebase.messagingSenderId} onChange={(e) => setFormData({...formData, firebase: {...formData.firebase, messagingSenderId: e.target.value}})} className="bg-black border-white/10 font-mono text-xs" /></div>
            </CardContent>
          </Card>
        </div>

        {/* زر التوليد والتحميل */}
        <div className="flex flex-col items-center gap-6 py-16 bg-primary/5 rounded-[3rem] border-2 border-dashed border-primary/30 relative overflow-hidden">
            <div className="absolute inset-0 bg-primary/5 animate-pulse pointer-events-none" />
            <PackageCheck className="w-24 h-24 text-primary" />
            <div className="text-center space-y-2 relative z-10">
              <h2 className="text-4xl font-black">تحميل المشروع كاملاً (Ready to Ship)</h2>
              <p className="text-zinc-400 font-bold max-w-2xl px-4">
                عند الضغط، سيقوم النظام بإنتاج ملف ZIP يحتوي على كافة ملفات البرمجة بعد تعديلها آلياً. <br/>
                تنبيه: سيتم حذف أدوات الماستر من الملف المحمل لضمان خصوصيتك أمام العميل.
              </p>
            </div>
            
            <Button 
              onClick={handleDownloadFullProject} 
              disabled={isPackaging}
              className="h-24 px-16 bg-primary text-black font-black text-3xl rounded-3xl shadow-2xl hover:scale-105 transition-all gap-5 relative z-10"
            >
              {isPackaging ? (
                <><Loader2 className="w-10 h-10 animate-spin" /> جاري تجميع النسخة...</>
              ) : (
                <><Download className="w-10 h-10" /> إنتاج وتحميل المشروع الآن</>
              )}
            </Button>

            {isPackaging && (
              <p className="text-primary font-black animate-bounce">يتم الآن قراءة {formData.name} وإعادة برمجتها... ثوانٍ من فضلك</p>
            )}
        </div>

        {/* شروط الأمان */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="p-6 bg-zinc-900 rounded-2xl border border-white/5 flex items-center gap-4 flex-row-reverse">
              <Zap className="w-8 h-8 text-yellow-500" />
              <div className="text-right"><p className="font-black text-sm">أتمتة كاملة</p><p className="text-[10px] opacity-50">لا حاجة لتعديل أي ملف يدوياً.</p></div>
           </div>
           <div className="p-6 bg-zinc-900 rounded-2xl border border-white/5 flex items-center gap-4 flex-row-reverse">
              <Lock className="w-8 h-8 text-accent" />
              <div className="text-right"><p className="font-black text-sm">تشفير وحماية</p><p className="text-[10px] opacity-50">يتم إخفاء أدوات الماستر عن العميل.</p></div>
           </div>
           <div className="p-6 bg-zinc-900 rounded-2xl border border-white/5 flex items-center gap-4 flex-row-reverse">
              <Mail className="w-8 h-8 text-blue-500" />
              <div className="text-right"><p className="font-black text-sm">تطهير القواعد</p><p className="text-[10px] opacity-50">تحديث إيميل الأدمن في Firestore Rules.</p></div>
           </div>
        </div>
      </div>
    </div>
  );
}
