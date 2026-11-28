// 1) buang baris "Dev Tools" di Pengaturan + halaman /dev  2) buang dev tool di dalam game Mancing
// 3) rapikan "Panel Developer" (lebih ringkas).   Jalankan dari ~/komikita:   node patch-dev-final.js
const fs = require('fs');
const MARK = 'Dev Tools (khusus role Developer)';
const rd = (f) => fs.readFileSync(f, 'utf8');
const wr = (f, s) => fs.writeFileSync(f, s);
let fail = 0;
const step = (name, fn) => { try { const r = fn(); console.log((r === 'skip' ? 'SKIP  ' : 'OK    ') + name); } catch (e) { fail++; console.log('GAGAL ' + name + ' -> ' + e.message); } };
// ganti teks persis; kalau sudah terganti -> skip; kalau tidak ketemu -> error
const swap = (s, a, b, label) => { if (!s.includes(a)) throw new Error('tidak ketemu: ' + label); return s.replace(a, b); };

step('cek app/page.tsx (beranda)', () => {
  if (rd('app/page.tsx').includes(MARK)) throw new Error('beranda ketimpa panel Dev, jalankan node restore-home.js dulu');
});

step('Pengaturan: buang baris "Dev Tools"', () => {
  const f = 'app/settings/page.tsx';
  let s = rd(f);
  const row = "\n                <Row title=\"Dev Tools\" chevron onClick={() => router.push('/dev')} />";
  if (!s.includes(row)) return 'skip';
  wr(f, s.replace(row, ''));
});

step('hapus halaman /dev', () => {
  if (!fs.existsSync('app/dev')) return 'skip';
  fs.rmSync('app/dev', { recursive: true, force: true });
});

step('game Mancing: buang tombol & panel Dev Tools', () => {
  const f = 'components/fishing/FishingGame.tsx';
  let s = rd(f);
  if (!s.includes('<DevFab')) return 'skip';
  s = swap(s, "import DevTools, { DevFab, EMPTY_STATS } from './DevTools';", "import { EMPTY_STATS } from './DevTools';", 'import DevTools');
  s = s.replace("  const [devOpen, setDevOpen] = useState(false);\n", '');
  const re = /      \{\/\* Dev Tools \(auto fishing dll\): hanya role Developer \*\/\}\n      \{dev && \(\n[\s\S]*?\n      \)\}\n\n/;
  if (!re.test(s)) throw new Error('blok JSX Dev Tools tidak ketemu');
  wr(f, s.replace(re, ''));
});

step('Mancing: role Developer tidak mengaktifkan fitur dev di game', () => {
  const f = 'app/komikstore/mancing/page.tsx';
  let s = rd(f);
  const a = "setIsDev(v.role === 'Developer'); isDevRef.current = v.role === 'Developer';";
  if (!s.includes(a)) return 'skip';
  wr(f, s.replace(a, 'setIsDev(false); isDevRef.current = false;'));
});

step('Panel Developer: tampilan lebih ringkas', () => {
  const f = 'app/profile/page.tsx';
  let s = rd(f);
  if (s.includes('/*dev-ringkas*/')) return 'skip';
  // judul & tab lebih pendek
  s = swap(s, "[['user', 'Kelola user'], ['global', 'Hadiah semua'], ['bayar', 'Pembayaran']]", "[['user', 'User'], ['global', 'Semua'], ['bayar', 'Bayar']]", 'label tab');
  s = swap(s, '1 · Pilih user</label>', 'User</label>', 'label 1');
  s = swap(s, '2 · Mau ngapain?</label>', 'Aksi</label>', 'label 2');
  // buang keterangan "Punya/Dipakai" yang panjang
  const re = /\n                <div style=\{\{ marginTop: 10, fontSize: 12, fontWeight: 700, color: '#8F8D9B', lineHeight: 1\.5 \}\}>\n                  Punya:[\s\S]*?\n                <\/div>/;
  if (!re.test(s)) throw new Error('blok Punya/Dipakai tidak ketemu');
  s = s.replace(re, '');
  // gaya lebih flat & kecil
  s = swap(s, "const FIELD: React.CSSProperties = { width: '100%', boxSizing: 'border-box', background: '#1F1E24', border: '1px solid rgba(255,255,255,.08)', borderRadius: 14, padding: '13px 14px', color: '#fff', fontSize: 14, fontWeight: 700,",
              "/*dev-ringkas*/ const FIELD: React.CSSProperties = { width: '100%', boxSizing: 'border-box', background: '#1F1E24', border: '1px solid rgba(255,255,255,.08)', borderRadius: 12, padding: '11px 13px', color: '#fff', fontSize: 14, fontWeight: 600,", 'FIELD');
  s = swap(s, "fontSize: 12, fontWeight: 800, color: '#8F8D9B', letterSpacing: -0.2, textTransform: 'uppercase', margin: '0 0 6px 2px' }",
              "fontSize: 12.5, fontWeight: 700, color: '#8F8D9B', margin: '0 0 6px 2px' }", 'LABEL');
  s = swap(s, "borderRadius: 16, padding: '14px 0', fontSize: 15, fontWeight: 800, cursor: 'pointer'", "borderRadius: 12, padding: '12px 0', fontSize: 14, fontWeight: 700, cursor: 'pointer'", 'BTN');
  s = swap(s, "borderRadius: 99, padding: '9px 14px', fontSize: 14, fontWeight: 800,", "borderRadius: 99, padding: '7px 12px', fontSize: 13, fontWeight: 700,", 'chip');
  // menu perawatan dilipat, tidak menuh layar
  s = swap(s, '<label style={LABEL}>Perawatan Premium</label>', "<details><summary style={{ ...LABEL, cursor: 'pointer', margin: 0 }}>Perawatan Premium</summary><div style={{ marginTop: 10 }}>", 'perawatan premium');
  s = swap(s, '>Turunkan Premium yang habis</button>', '>Turunkan Premium yang habis</button></div></details>', 'tombol premium');
  s = swap(s, '<label style={LABEL}>Perawatan peringkat</label>', "<details><summary style={{ ...LABEL, cursor: 'pointer', margin: 0 }}>Perawatan peringkat</summary><div style={{ marginTop: 10 }}>", 'perawatan peringkat');
  s = swap(s, "{saving ? 'Memproses...' : 'Isi peringkat dari akun lama'}</button>", "{saving ? 'Memproses...' : 'Isi peringkat dari akun lama'}</button></div></details>", 'tombol peringkat');
  wr(f, s);
});

console.log(fail ? '\nAda ' + fail + ' langkah GAGAL, kirim output ini ke Claude (file yang gagal tidak diubah).' : '\nSelesai. Lanjut: git add . && git commit -m "rapikan panel developer, hapus dev tools" && git push origin main');
