
'use server';

/**
 * @fileOverview محرك الأتمتة - يقوم بتوليد نسخة نظيفة تماماً من المشروع مع تعديل الملفات برمجياً.
 */

import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';

export async function packageProject(formData: any) {
  const zip = new JSZip();
  const rootDir = process.cwd();

  // 1. تعريف المحتوى الجديد للملفات الحساسة
  const newBrandConfig = `
/**
 * @fileOverview المكتبة المركزية لإعدادات الهوية (عقل المنصة) - نسخة مولدة آلياً
 */
export const BrandConfig = {
  name: "${formData.name}",
  shortName: "${formData.shortName}",
  description: "${formData.description}",
  supportPhone: "${formData.supportPhone}",
  supportEmail: "${formData.supportEmail}",
  whatsappNumber: "${formData.whatsappNumber}",
  adminEmail: "${formData.adminEmail}",
  developerName: "${formData.developerName}",
  developerContact: "${formData.developerContact}",
  social: {
    facebook: "https://facebook.com/${formData.shortName}",
    youtube: "https://youtube.com/c/${formData.shortName}",
  },
  colors: {
    primary: "45 100% 50%",
    accent: "122 39% 49%",
  }
};
`;

  const newFirebaseConfig = `
export const firebaseConfig = ${JSON.stringify(formData.firebase, null, 2)};
`;

  // دالة لقراءة المجلدات بشكل تتابعي وإضافتها للـ ZIP
  async function addDirectoryToZip(currentDir: string, zipFolder: JSZip) {
    const files = fs.readdirSync(currentDir);

    for (const file of files) {
      const fullPath = path.join(currentDir, file);
      const stats = fs.statSync(fullPath);

      // استثناء المجلدات غير المرغوبة
      if (
        file === 'node_modules' || 
        file === '.next' || 
        file === '.git' || 
        file === 'rebrand' // حذف أداة الأتمتة من النسخة النهائية لضمان السرية
      ) continue;

      if (stats.isDirectory()) {
        const nextFolder = zipFolder.folder(file);
        if (nextFolder) await addDirectoryToZip(fullPath, nextFolder);
      } else {
        let content: string | Buffer = fs.readFileSync(fullPath);
        const fileName = path.basename(fullPath);
        const relativePath = path.relative(rootDir, fullPath);

        // تعديل محتويات الملفات أثناء التعبئة
        if (relativePath === 'src/lib/brand-config.ts') {
          content = newBrandConfig;
        } else if (relativePath === 'src/firebase/config.ts') {
          content = newFirebaseConfig;
        } else if (relativePath === 'firestore.rules') {
          // استبدال إيميل المسؤول في القواعد
          let rules = content.toString();
          rules = rules.replace(/request\.auth\.token\.email == ".*?"/g, `request.auth.token.email == "${formData.adminEmail}"`);
          content = rules;
        } else if (relativePath === 'README.md') {
          content = `# ${formData.name}\n\n${formData.description}\n\nDeveloped by: ${formData.developerName}`;
        }

        zipFolder.file(file, content);
      }
    }
  }

  await addDirectoryToZip(rootDir, zip);

  // توليد الـ ZIP كـ Base64
  const base64 = await zip.generateAsync({ type: 'base64' });
  return base64;
}
