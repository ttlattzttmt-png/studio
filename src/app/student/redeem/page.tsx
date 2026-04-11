"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/**
 * تم استبدال صفحة التفعيل بصفحة الكورسات المباشرة
 * سيتم تحويل أي طالب يدخل هنا إلى صفحة استكشاف الكورسات لطلب الانضمام
 */
export default function RedirectToCourses() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/courses');
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
      <Loader2 className="w-12 h-12 animate-spin text-primary" />
      <p className="text-muted-foreground font-bold">جاري تحويلك لمكتبة الكورسات لتفعيل الكورسات...</p>
    </div>
  );
}