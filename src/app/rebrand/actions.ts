
'use server';

/**
 * @fileOverview محرك التطهير والتصدير العالمي (The Ultimate Purger V2)
 * يدعم التطهير العميق، تعديل الألوان، وتوليد حزم ZIP نظيفة 100%.
 */

import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import { BrandConfig as OldConfig } from '@/lib/brand-config';

export async function packageProject(formData: any) {
  const zip = new JSZip();
  const rootDir = process.cwd();

  // 1. قائمة الاستبدال الشاملة للهوية
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
    
    // استبدال نصوص الهوية
    replacements.forEach(({ search, replace }) => {
      if (search && replace) {
        const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        purged = purged.replace(regex, replace);
      }
    });

    // معالجة خاصة للألوان في ملف CSS
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

      // استثناءات الأمان والتطهير
      if (
        file === 'node_modules' || 
        file === '.next' || 
        file === '.git' || 
        file === 'rebrand' || // حذف أداة الأتمتة تماماً
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

        // تطهير الملفات النصية
        const textExtensions = ['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.rules', '.css', '.html', '.txt', '.yaml', '.yml'];
        if (textExtensions.includes(ext)) {
          let textContent = content.toString();

          // حقن الإعدادات الجديدة في الملفات المركزية
          if (relativePath === 'src/lib/brand-config.ts') {
             textContent = `export const BrandConfig = ${JSON.stringify(formData, null, 2)};`;
          } else if (relativePath === 'src/firebase/config.ts') {
             textContent = `export const firebaseConfig = ${JSON.stringify(formData.firebase, null, 2)};`;
          } else if (relativePath === 'README.md') {
             textContent = `# ${formData.name} (eplat) - النسخة النهائية المستقرة\n\nهذا هو الكود المصدري الكامل للمنصة، جاهز للرفع والتشغيل الفوري.\n\n**صنع بكل فخر بواسطة: ${formData.developerName}**`;
          } else {
             textContent = purgeContent(textContent, file);
          }
          
          content = textContent;
        }

        zipFolder.file(file, content);
      }
    }
  }

  await addDirectoryToZip(rootDir, zip);

  // 4. توليد الملف النهائي
  const base64 = await zip.generateAsync({ 
    type: 'base64',
    compression: "DEFLATE",
    compressionOptions: { level: 9 }
  });
  
  return base64;
}
