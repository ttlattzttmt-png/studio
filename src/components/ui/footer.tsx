import { ShieldCheck } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t bg-card py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl font-headline font-bold text-primary">البشمهندس</span>
              <ShieldCheck className="w-6 h-6 text-primary" />
            </div>
            <p className="text-muted-foreground max-w-sm">
              المنصة التعليمية الرائدة لتبسيط العلوم الهندسية والفيزيائية لطلاب المرحلة الثانوية. نهدف إلى خلق جيل مبدع ومتميز.
            </p>
          </div>
          <div>
            <h4 className="font-headline font-bold mb-4">روابط سريعة</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">جميع الكورسات</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">الامتحانات</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">الدعم الفني</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-headline font-bold mb-4">تواصل معنا</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>واتساب: 01012345678</li>
              <li>فيسبوك: البشمهندس</li>
              <li>يوتيوب: قناة البشمهندس</li>
            </ul>
          </div>
        </div>
        <div className="border-t mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} منصة البشمهندس. جميع الحقوق محفوظة.
          </p>
          <p className="text-sm font-medium text-primary">
            made by : mohamed alaa
          </p>
        </div>
      </div>
    </footer>
  );
}