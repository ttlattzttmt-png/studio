'use server';

/**
 * @fileOverview محرك التطهير والنشر التلقائي المتقدم (Git Data API Edition)
 * يدعم الرفع الجماعي في Commit واحد لتجنب الـ Timeout وتطهير النسخة 100%.
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

  // تحديث بيانات الـ PWA واسم المشروع
  if (fileName === 'package.json' || fileName === 'manifest.json') {
    purged = purged.replace(new RegExp(OldConfig.shortName, 'g'), formData.shortName);
    purged = purged.replace(new RegExp("nextn", 'g'), formData.shortName.toLowerCase().replace(/\s+/g, '-'));
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
      const relativePath = path.relative(rootDir, fullPath).replace(/\\/g, '/');
      const stats = fs.statSync(fullPath);

      // استبعاد ملفات التطوير والماستر لضمان خصوصية العميل
      if (
        file === 'node_modules' || file === '.next' || file === '.git' || 
        file === 'rebrand' || file === '.env' || file === 'package-lock.json' ||
        file === '.DS_Store' || file === 'dev.ts'
      ) continue;

      if (stats.isDirectory()) {
        walk(fullPath);
      } else {
        let content: any = fs.readFileSync(fullPath);
        const ext = path.extname(file);
        const textExtensions = ['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.rules', '.css', '.html', '.txt', '.yaml', '.yml', '.js', '.mjs'];
        const isText = textExtensions.includes(ext);

        if (isText) {
          let textContent = content.toString();
          // حقن الإعدادات الجديدة في الملفات المركزية
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
    // 1. الحصول على اسم المستخدم الحالي
    const userRes = await fetch('https://api.github.com/user', { headers });
    if (!userRes.ok) throw new Error("فشل التحقق من الـ Token - تأكد من صحته");
    const userData = await userRes.json();
    const owner = userData.login;

    // 2. إنشاء المستودع (إذا لم يكن موجوداً)
    const createRepoRes = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: repoName, private: true, auto_init: true })
    });
    
    // إذا كان المستودع موجوداً مسبقاً، لا مشكلة
    if (!createRepoRes.ok && createRepoRes.status !== 422) {
      const err = await createRepoRes.json();
      throw new Error(`خطأ GitHub: ${err.message}`);
    }

    // الانتظار ثانية لضمان تهيئة المستودع
    await new Promise(r => setTimeout(r, 2000));

    // 3. الحصول على الـ SHA لآخر Commit (للبدء منه)
    const branchRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/branches/main`, { headers });
    let baseTreeSha = "";
    if (branchRes.ok) {
      const branchData = await branchRes.json();
      baseTreeSha = branchData.commit.commit.tree.sha;
    }

    // 4. تجهيز كافة الملفات لرفعها في Tree واحد
    const files = await getCleanFiles(formData);
    const treeItems = [];

    for (const file of files) {
      // الرفع عبر API يتطلب معالجة خاصة للملفات الكبيرة
      // سنرفع كافة الملفات النصية المطهّرة
      if (!file.isBinary) {
        treeItems.push({
          path: file.path,
          mode: "100644",
          type: "blob",
          content: file.content as string
        });
      }
    }

    // 5. إنشاء الـ Tree الجديد
    const createTreeRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/git/trees`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        base_tree: baseTreeSha || undefined,
        tree: treeItems
      })
    });
    const treeData = await createTreeRes.json();
    if (!createTreeRes.ok) throw new Error(`فشل إنشاء Tree: ${treeData.message}`);

    // 6. إنشاء الـ Commit
    const createCommitRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/git/commits`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message: `إطلاق المنصة الجديدة: ${formData.name} 🚀`,
        tree: treeData.sha,
        parents: baseTreeSha ? [baseTreeSha] : []
      })
    });
    const commitData = await createCommitRes.json();

    // 7. تحديث الـ Reference (تفعيل الـ Commit على فرع main)
    await fetch(`https://api.github.com/repos/${owner}/${repoName}/git/refs/heads/main`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ sha: commitData.sha, force: true })
    });

    return { success: true, url: `https://github.com/${owner}/${repoName}` };
  } catch (e: any) {
    console.error("GitHub Deploy Error:", e);
    throw new Error(e.message || "حدث خطأ غير متوقع أثناء الرفع");
  }
}
