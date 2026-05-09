
'use server';

/**
 * @fileOverview محرك التطهير والتصدير الشامل (The Master Purger Engine V3)
 * يدعم التطهير العميق، تعديل الألوان الذكي، وتوليد مشروع بِكر 100%.
 */

import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import { BrandConfig as OldConfig } from '@/lib/brand-config';

export async function packageProject(formData: any) {
  const zip = new JSZip();
  const rootDir = process.cwd();

  // 1. قائمة الاستبدال الشاملة للهوية (البحث عن القديم واستبداله بالجديد)
  const replacements = [
    { search: OldConfig.name, replace: formData.name },
    { search: OldConfig.shortName, replace: formData.shortName },
    { search: OldConfig.adminEmail, replace: formData.adminEmail },
    { search: OldConfig.supportPhone, replace: formData.supportPhone },
    { search: OldConfig.supportEmail, replace: formData.supportEmail },
    { search: OldConfig.developerName, replace: formData.developerName },
    { search: OldConfig.developerContact, replace: formData.developerContact },
    { search: OldConfig.whatsappNumber, replace: formData.whatsappNumber },
  ];

  // 2. دالة التطهير العميق للمحتوى
  function purgeContent(content: string, fileName: string): string {
    let purged = content;
    
    // استبدال نصوص الهوية في كل مكان
    replacements.forEach(({ search, replace }) => {
      if (search && replace) {
        const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        purged = purged.replace(regex, replace);
      }
    });

    // معالجة خاصة للألوان في ملف CSS (الذهبي والأخضر الافتراضي)
    if (fileName === 'globals.css') {
      purged = purged.replace(/--primary: .*;/, `--primary: ${formData.colors.primary};`);
      purged = purged.replace(/--accent: .*;/, `--accent: ${formData.colors.accent};`);
    }

    return purged;
  }

  // 3. بناء هيكل المشروع داخل الـ ZIP
  async function addDirectoryToZip(currentDir: string, zipFolder: JSZip) {
    const files = fs.readdirSync(currentDir);

    for (const file of files) {
      const fullPath = path.join(currentDir, file);
      const stats = fs.statSync(fullPath);
      const relativePath = path.relative(rootDir, fullPath);

      // استثناءات الأمان والتطهير (عدم تضمينها في نسخة العميل)
      if (
        file === 'node_modules' || 
        file === '.next' || 
        file === '.git' || 
        file === 'rebrand' || // حذف مجلد الماستر تماماً
        file === '.env' ||
        file === 'package-lock.json' ||
        file === '.DS_Store'
      ) continue;

      if (stats.isDirectory()) {
        const nextFolder = zipFolder.folder(file);
        if (nextFolder) await addDirectoryToZip(fullPath, nextFolder);
      } else {
        let content: string | Buffer = fs.readFileSync(fullPath);
        const ext = path.extname(file);

        // تطهير الملفات النصية فقط
        const textExtensions = ['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.rules', '.css', '.html', '.txt', '.yaml', '.yml'];
        if (textExtensions.includes(ext)) {
          let textContent = content.toString();

          // حقن الإعدادات الجديدة في الملفات المركزية للعميل
          if (relativePath === 'src/lib/brand-config.ts') {
             textContent = `export const BrandConfig = ${JSON.stringify({
               name: formData.name,
               shortName: formData.shortName,
               description: formData.description,
               supportPhone: formData.supportPhone,
               supportEmail: formData.supportEmail,
               whatsappNumber: formData.whatsappNumber,
               adminEmail: formData.adminEmail,
               developerName: formData.developerName,
               developerContact: formData.developerContact,
               social: formData.social,
               colors: formData.colors
             }, null, 2)};`;
          } else if (relativePath === 'src/firebase/config.ts') {
             textContent = `export const firebaseConfig = ${JSON.stringify(formData.firebase, null, 2)};`;
          } else if (relativePath === 'README.md') {
             textContent = `# ${formData.name} (eplat) - النسخة النهائية المستقرة\n\nهذا هو الكود المصدري الكامل للمنصة، جاهز للرفع والتشغيل الفوري.\n\n## 🚀 كيفية رفع المشروع على GitHub الخاص بك:\n\nاتبع هذه الخطوات بدقة في الـ Terminal داخل مجلد المشروع:\n\n1. **تهيئة Git:**\n   \`\`\`bash\n   git init\n   \`\`\`\n\n2. **إضافة رابط مستودعك:**\n   \`\`\`bash\n   git remote add origin https://github.com/${formData.github.repoName || 'user/repo'}.git\n   \`\`\`\n\n3. **إضافة كافة الملفات:**\n   \`\`\`bash\n   git add .\n   \`\`\`\n\n4. **تسجيل التغييرات:**\n   \`\`\`bash\n   git commit -m "الإطلاق النهائي للمنصة - نسخة مستقرة 100%"\n   \`\`\`\n\n5. **رفع الكود:**\n   \`\`\`bash\n   git branch -M main\n   git push -u origin main\n   \`\`\`\n\n**صنع بكل فخر بواسطة: ${formData.developerName}**`;
          } else {
             // تطهير عام لأي ملف آخر
             textContent = purgeContent(textContent, file);
          }
          
          content = textContent;
        }

        zipFolder.file(file, content);
      }
    }
  }

  await addDirectoryToZip(rootDir, zip);

  // 4. توليد ملف الـ ZIP النهائي
  const base64 = await zip.generateAsync({ 
    type: 'base64',
    compression: "DEFLATE",
    compressionOptions: { level: 9 }
  });
  
  return base64;
}
