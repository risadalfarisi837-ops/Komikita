// Pulihkan app/page.tsx (beranda) kalau ketimpa file panel Dev. Jalankan dari ~/komikita:  node restore-home.js
const fs = require('fs');
const { execSync } = require('child_process');
const MARK = 'Dev Tools (khusus role Developer)';
const sh = (c) => execSync(c, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

let cur = fs.readFileSync('app/page.tsx', 'utf8');
if (!cur.includes(MARK)) { console.log('SKIP: app/page.tsx bukan file panel Dev. Beranda aman di file ini.'); }
else {
  const hashes = sh('git log --format=%H -- app/page.tsx').split('\n').filter(Boolean);
  let ok = false;
  for (const h of hashes) {
    const t = sh(`git show ${h}:app/page.tsx`);
    if (!t.includes(MARK)) { fs.writeFileSync('app/page.tsx', t); console.log('OK: beranda dipulihkan dari commit ' + h.slice(0, 7)); ok = true; break; }
  }
  if (!ok) { console.log('GAGAL: tidak ada versi beranda di riwayat git. Ambil app/page.tsx dari zip Komikita-main.zip lalu jalankan lagi.'); process.exit(1); }
}

// perbaikan cache chapter (v3 -> v4)
let s = fs.readFileSync('app/page.tsx', 'utf8');
if (s.includes('komiku_home_v3')) { fs.writeFileSync('app/page.tsx', s.replace('komiku_home_v3', 'komiku_home_v4')); console.log('OK: cache key beranda -> v4'); }

// pastikan panel Dev ada di tempatnya
const d = fs.existsSync('app/dev/page.tsx') ? fs.readFileSync('app/dev/page.tsx', 'utf8') : '';
if (!d.includes(MARK)) console.log('CATATAN: app/dev/page.tsx belum berisi panel Dev. Salin lagi file panel Dev ke app/dev/page.tsx.');
