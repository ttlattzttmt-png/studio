
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/**
 * تم توجيه الطالب للوحة التحكم الرئيسية لعرض الكورسات
 */
export default function MyCoursesRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/student');
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <p className="text-muted-foreground font-bold">جاري تحويلك للوحة التحكم...</p>
    </div>
  );
}
