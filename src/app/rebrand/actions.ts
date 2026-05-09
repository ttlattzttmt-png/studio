'use server';

/**
 * @fileOverview محرك التطهير والنشر التلقائي المتقدم (Git Blobs API Edition)
 * يقوم برفع الملفات ملفاً بملف كـ Blobs لتفادي مشاكل الحجم، ثم ينشئ Commit واحد شامل.
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
    { search: OldConfig.description, replace: formData.description },
    { search: OldConfig.adminEmail, replace: formData.adminEmail },
    { search: OldConfig.supportPhone, replace: formData.supportPhone },
    { search: OldConfig.supportEmail, replace: formData.supportEmail },
    { search: OldConfig.developerName, replace: formData.developerName },
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
  if (fileName === 'package.json' || fileName === 'manifest.json' || fileName === 'next.config.ts') {
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

      // استبعاد ملفات النظام والماستر
      if (
        file === 'node_modules' || file === '.next' || file === '.git' || 
        file === 'rebrand' || file === '.env' || file === 'package-lock.json' ||
        file === '.DS_Store' || file === '.firebase' || file === 'firebase-debug.log'
      ) continue;

      if (stats.isDirectory()) {
        walk(fullPath);
      } else {
        let content: any = fs.readFileSync(fullPath);
        const ext = path.extname(file).toLowerCase();
        const textExtensions = ['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.rules', '.css', '.html', '.txt', '.yaml', '.yml', '.mjs'];
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
    // 1. الحصول على اسم المستخدم
    const userRes = await fetch('https://api.github.com/user', { headers });
    if (!userRes.ok) throw new Error("فشل التحقق من الـ Token");
    const userData = await userRes.json();
    const owner = userData.login;

    // 2. إنشاء المستودع
    const createRepoRes = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: repoName, private: true, auto_init: true })
    });
    
    if (!createRepoRes.ok && createRepoRes.status !== 422) {
      const err = await createRepoRes.json();
      throw new Error(`خطأ GitHub: ${err.message}`);
    }

    // الانتظار لتهيئة المستودع
    await new Promise(r => setTimeout(r, 3000));

    // 3. الحصول على SHA آخر Commit
    const branchRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/branches/main`, { headers });
    if (!branchRes.ok) throw new Error("لم يتم العثور على فرع main - تأكد من صلاحيات الـ Token");
    const branchData = await branchRes.json();
    const baseTreeSha = branchData.commit.commit.tree.sha;
    const parentCommitSha = branchData.commit.sha;

    // 4. رفع الملفات كـ Blobs (القلب النابض للمحرك)
    const cleanFiles = await getCleanFiles(formData);
    const treeItems = [];

    // سنقوم برفع كافة الملفات النصية المطهّرة والملفات الثنائية
    for (const file of cleanFiles) {
      const blobRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/git/blobs`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          content: file.isBinary 
            ? (file.content as Buffer).toString('base64') 
            : file.content as string,
          encoding: file.isBinary ? "base64" : "utf-8"
        })
      });

      if (blobRes.ok) {
        const blobData = await blobRes.json();
        treeItems.push({
          path: file.path,
          mode: "100644",
          type: "blob",
          sha: blobData.sha
        });
      }
    }

    // 5. إنشاء الـ Tree الشامل
    const createTreeRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/git/trees`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        base_tree: baseTreeSha,
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
        parents: [parentCommitSha]
      })
    });
    const commitData = await createCommitRes.json();

    // 7. تحديث الـ Reference
    await fetch(`https://api.github.com/repos/${owner}/${repoName}/git/refs/heads/main`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ sha: commitData.sha, force: true })
    });

    return { success: true, url: `https://github.com/${owner}/${repoName}` };
  } catch (e: any) {
    console.error("GitHub Detailed Deploy Error:", e);
    throw new Error(e.message || "فشل الرفع لـ GitHub");
  }
}
