
/**
 * @fileOverview المكتبة المركزية لإعدادات الهوية (عقل المنصة)
 * تعديل أي قيمة هنا سيغيرها فوراً في كافة أركان المنصة، الإشعارات، ملفات الـ PDF، والـ SEO.
 */

export const BrandConfig = {
  // المعلومات الأساسية
  name: "منصة البشمهندس",
  shortName: "البشمهندس",
  description: "المنصة التعليمية الأولى لطلاب الهندسة والمرحلة الثانوية",
  
  // بيانات التواصل
  supportPhone: "01008006562",
  supportEmail: "support@al-bashmohandes.com",
  whatsappNumber: "201008006562", // الصيغة الدولية بدون +
  
  // الإدارة (الأمان)
  adminEmail: "admin@al-bashmohandes.com",
  
  // توقيع المطور (Credits)
  developerName: "Mohamed Alaa",
  developerContact: "01008006562",
  
  // الروابط الاجتماعية
  social: {
    facebook: "https://facebook.com/elbashmohandes",
    youtube: "https://youtube.com/c/elbashmohandes",
  },

  // الألوان (بصيغة HSL لسهولة التعديل)
  colors: {
    primary: "45 100% 50%", // الذهبي
    accent: "122 39% 49%",   // الأخضر
  },

  // قوالب الرسائل الآلية
  whatsappTemplates: {
    examResult: (studentName: string, examTitle: string, score: number) => 
      `*${BrandConfig.name}* 🎓\n\nمرحباً، نتيجة الطالب: *${studentName}*\nفي مادة: *${examTitle}*\nالدرجة: *${score}%*\n\nمع تمنياتنا بالتوفيق. ✨`,
    notification: (title: string, msg: string) => 
      `*إشعار من ${BrandConfig.shortName}* 📢\n\n*${title}*\n\n${msg}\n\nللمتابعة: ${typeof window !== 'undefined' ? window.location.origin : ''}`
  }
};
