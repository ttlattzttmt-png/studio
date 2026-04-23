
/**
 * @fileOverview أدوات مساعدة للربط مع واتساب - نسخة البشمهندس المتطورة (دعم الأرقام المصرية +20)
 */

export const sendWhatsAppMessage = (phoneNumber: string, message: string) => {
  if (!phoneNumber) return;
  
  // تنظيف الرقم من أي رموز غير رقمية
  const cleanNumber = phoneNumber.replace(/\D/g, '');
  
  let finalNumber = cleanNumber;
  
  // منطق تثبيت كود الدولة المصري
  if (cleanNumber.startsWith('01')) {
    finalNumber = `2${cleanNumber}`;
  } else if (cleanNumber.startsWith('1')) {
    finalNumber = `20${cleanNumber}`;
  } else if (!cleanNumber.startsWith('20') && cleanNumber.length === 10) {
     finalNumber = `20${cleanNumber}`;
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

مع تمنياتنا بدوام التفوق والنجاح. ✨
--------------------------------
تم الإرسال آلياً عبر نظام التواصل الذكي الخاص بالمنصة.`;
};

export const formatNotificationMessage = (title: string, message: string) => {
  return `*إشعار هام من منصة البشمهندس* 📢

*${title}*

${message}

يمكنك الدخول للمنصة للمتابعة: ${window.location.origin}
--------------------------------
بشمهندس، مستقبلك يبدأ من هنا. 🚀`;
};
