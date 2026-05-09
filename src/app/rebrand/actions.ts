'use server';

/**
 * @fileOverview محرك التطهير والنشر التلقائي لـ GitHub (The Master Deployer V4)
 * يدعم الرفع المباشر عبر GitHub API وتطهير النسخة 100%.
 */

import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import { BrandConfig as OldConfig } from '@/lib/brand-config';

// دالة التطهير العميق للمحتوى
function purgeContent(content: string, fileName: string, formData: any): string {
  let purged = content;
  
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

  // استبدال نصوص الهوية
  replacements.forEach(({ search, replace }) => {
    if (search && replace) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      purged = purged.replace(regex, replace);
    }
  });

  // معالجة الألوان في ملف CSS
  if (fileName === 'globals.css') {
    purged = purged.replace(/--primary: .*;/, `--primary: ${formData.colors.primary};`);
    purged = purged.replace(/--accent: .*;/, `--accent: ${formData.colors.accent};`);
  }

  return purged;
}

// دالة لجمع الملفات المطهّرة
async function getCleanFiles(formData: any) {
  const rootDir = process.cwd();
  const cleanFiles: { path: string; content: string | Buffer; isBinary: boolean }[] = [];

  function walk(currentDir: string) {
    const files = fs.readdirSync(currentDir);
    for (const file of files) {
      const fullPath = path.join(currentDir, file);
      const relativePath = path.relative(rootDir, fullPath);
      const stats = fs.statSync(fullPath);

      if (
        file === 'node_modules' || file === '.next' || file === '.git' || 
        file === 'rebrand' || file === '.env' || file === 'package-lock.json' ||
        file === '.DS_Store'
      ) continue;

      if (stats.isDirectory()) {
        walk(fullPath);
      } else {
        let content: any = fs.readFileSync(fullPath);
        const ext = path.extname(file);
        const textExtensions = ['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.rules', '.css', '.html', '.txt', '.yaml', '.yml'];
        const isText = textExtensions.includes(ext);

        if (isText) {
          let textContent = content.toString();
          if (relativePath === 'src/lib/brand-config.ts') {
            textContent = `export const BrandConfig = ${JSON.stringify({ ...formData, colors: formData.colors }, null, 2)};`;
          } else if (relativePath === 'src/firebase/config.ts') {
            textContent = `export const firebaseConfig = ${JSON.stringify(formData.firebase, null, 2)};`;
          } else {
            textContent = purgeContent(textContent, file, formData);
          }
          content = textContent;
        }

        cleanFiles.push({ path: relativePath, content, isBinary: !isText });
      }
    }
  }

  walk(rootDir);
  return cleanFiles;
}

export async function packageProject(formData: any) {
  const zip = new JSZip();
  const files = await getCleanFiles(formData);
  files.forEach(f => zip.file(f.path, f.content));
  return await zip.generateAsync({ type: 'base64', compression: "DEFLATE", compressionOptions: { level: 9 } });
}

export async function deployToGitHub(formData: any) {
  const { token, repoName } = formData.github;
  if (!token || !repoName) throw new Error("بيانات GitHub ناقصة");

  const headers = {
    'Authorization': `token ${token}`,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  };

  try {
    // 1. إنشاء المستودع
    const createRepoRes = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: repoName, private: true, auto_init: true })
    });
    
    if (!createRepoRes.ok && createRepoRes.status !== 422) {
      throw new Error("فشل إنشاء المستودع - ربما الاسم موجود مسبقاً");
    }

    const repoData = await createRepoRes.json();
    const owner = repoData.owner?.login || '';
    
    // 2. تجهيز الملفات للرفع (نستخدم Commits API للتبسيط)
    const files = await getCleanFiles(formData);
    
    // ملاحظة: الرفع الجماعي عبر API يتطلب خطوات معقدة (Blobs -> Tree -> Commit). 
    // سنقوم برفع الملفات الأساسية لتشغيل المشروع.
    for (const file of files) {
      if (file.isBinary) continue; // تخطي الملفات الكبيرة في الرفع السريع لضمان الاستقرار

      const contentBase64 = Buffer.from(file.content as string).toString('base64');
      await fetch(`https://api.github.com/repos/${owner}/${repoName}/contents/${file.path}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          message: `إطلاق المنصة: ${formData.shortName}`,
          content: contentBase64,
          branch: 'main'
        })
      });
    }

    return { success: true, url: `https://github.com/${owner}/${repoName}` };
  } catch (e: any) {
    console.error(e);
    throw new Error(e.message || "فشل الرفع لـ GitHub");
  }
}
