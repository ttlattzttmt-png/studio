/**
 * @fileOverview أدوات مساعدة للربط مع واتساب
 */

export const sendWhatsAppMessage = (phoneNumber: string, message: string) => {
  if (!phoneNumber) return;
  
  // تنظيف الرقم من أي رموز غير رقمية
  const cleanNumber = phoneNumber.replace(/\D/g, '');
  
  // التأكد من وجود مفتاح الدولة (مصر بشكل افتراضي إذا بدأ بـ 01)
  let finalNumber = cleanNumber;
  if (cleanNumber.startsWith('01')) {
    finalNumber = `2${cleanNumber}`;
  }

  const url = `https://wa.me/${finalNumber}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
};

export const formatExamResultMessage = (studentName: string, examTitle: string, score: number, points: number, total: number) => {
  return `*منصة البشمهندس التعليمية* 🎓
  
مرحباً، نود إبلاغكم بنتيجة اختبار الطالب: *${studentName}*
في مادة/اختبار: *${examTitle}*

الدرجة النهائية: *${score}%*
نقاط الطالب: ${points} من ${total}

مع تمنياتنا بدوام التفوق والنجاح. ✨`;
};

export const formatNotificationMessage = (title: string, message: string) => {
  return `*إشعار هام من منصة البشمهندس* 📢

*${title}*

${message}

يمكنك الدخول للمنصة للمتابعة: ${window.location.origin}`;
};
