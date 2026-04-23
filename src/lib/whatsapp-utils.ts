
/**
 * @fileOverview أدوات مساعدة للربط مع واتساب - نسخة البشمهندس المتطورة
 */

export const sendWhatsAppMessage = (phoneNumber: string, message: string) => {
  // إذا لم يتم تمرير رقم، سيتم فتح الواتساب برسالة عامة ليختار المستخدم المستلم
  const cleanNumber = phoneNumber ? phoneNumber.replace(/\D/g, '') : '';
  
  let finalNumber = cleanNumber;
  if (cleanNumber && cleanNumber.startsWith('01')) {
    finalNumber = `2${cleanNumber}`;
  }

  // استخدام API الـ Desktop/Mobile الموحد
  const url = cleanNumber 
    ? `https://wa.me/${finalNumber}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message)}`;
    
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

export const formatWelcomeMessage = (studentName: string) => {
  return `*أهلاً بك في عائلة البشمهندس* 🎓
  
يا بشمهندس *${studentName.split(' ')[0]}*، تم تفعيل حسابك بنجاح!
جاهز تبدأ رحلة التفوق والوصول للقمة؟

تصفح كورساتك الآن: ${window.location.origin}/student`;
};
