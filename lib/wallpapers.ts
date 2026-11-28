import type { EffectItem } from './effects';

export type Rarity = 'Normal' | 'Rare' | 'Epic' | 'Legendary';

export interface WallpaperItem {
  nama: string;
  rarity: Rarity;
  grad: string;   // background gradient (dipakai kalau url kosong)
  url?: string;   // gambar anime: /public/wallpapers/<key>.webp
  pos?: string;   // posisi crop saat dipotong lebar (background-position), mis. 'center 30%'
}

export const COST_1 = 100;
export const COST_10 = 1000;
// Wallpaper yang sudah dimiliki tidak bertambah lagi: duplikat jadi token (sesuai rarity), token ditukar di toko.
export const TOKEN_DUP: Record<Rarity, number> = { Normal: 10, Rare: 30, Epic: 80, Legendary: 200 };
export const TOKEN_PRICE: Record<Rarity, number> = { Normal: 60, Rare: 180, Epic: 480, Legendary: 1200 };
export const RARITIES: Rarity[] = ['Normal', 'Rare', 'Epic', 'Legendary'];
export const RATES: Record<Rarity, number> = { Normal: 70, Rare: 22, Epic: 7, Legendary: 1 }; // persen

export const RARITY_STYLE: Record<Rarity, { color: string; border: string; glow: string; shimmer: boolean; pulse: boolean; sparkle?: EffectItem }> = {
  Normal:    { color: '#cbd5e1', border: 'rgba(255,255,255,.10)', glow: 'none', shimmer: false, pulse: false },
  Rare:      { color: '#38bdf8', border: '#38bdf8', glow: '0 0 12px rgba(56,189,248,.35)', shimmer: false, pulse: false },
  Epic:      { color: '#c084fc', border: '#a855f7', glow: '0 0 16px rgba(168,85,247,.45)', shimmer: true, pulse: false },
  Legendary: { color: '#fcd34d', border: '#fbbf24', glow: '0 0 20px rgba(251,191,36,.55)', shimmer: true, pulse: true,
    sparkle: { nama: '', harga: 0, tier: 'Premium', kind: 'sparkle', color: '#fde68a', color2: '#fbbf24' } },
};

export const WALLPAPER_CATALOG: Record<string, WallpaperItem> = {
  // Hanya 4 wallpaper (satu per rarity). Gambar diam .webp ringan di /public/wallpapers.
  'tunjuk-hati':       { nama: 'Tunjuk Hati',       rarity: 'Normal',    grad: 'linear-gradient(180deg,#f7c6d9,#ffeef4)', url: '/wallpapers/tunjuk-hati.webp',       pos: 'center 35%' },
  'senyum-ceria':      { nama: 'Senyum Ceria',      rarity: 'Rare',      grad: 'linear-gradient(180deg,#f3b6cf,#e8e8ea)', url: '/wallpapers/senyum-ceria.webp',      pos: 'center 40%' },
  'hening-monokrom':   { nama: 'Hening Monokrom',   rarity: 'Epic',      grad: 'linear-gradient(180deg,#111,#3a3a3a)',    url: '/wallpapers/hening-monokrom.webp',   pos: 'center 42%' },
  'penguasa-bayangan': { nama: 'Penguasa Bayangan', rarity: 'Legendary', grad: 'linear-gradient(180deg,#0a0204,#5a0f1a)', url: '/wallpapers/penguasa-bayangan.webp', pos: 'center 24%' },
};

/** Nilai CSS `background` untuk wallpaper: satu gambar diam (webp) + gradien cadangan. Parameter kedua dipertahankan agar pemanggil lama tidak error. */
export function wpBg(key: string | undefined | null, _animated = false): string {
  const w = key ? WALLPAPER_CATALOG[key] : undefined;
  if (!w) return '';
  if (!w.url) return w.grad;
  return 'url(' + w.url + ') ' + (w.pos || 'center') + '/cover, ' + w.grad;
}

/** Info yang ditampilkan di panel "Info Rarity" (urut dari terbaik). */
export const RARITY_INFO: Record<Rarity, { label: string; stars: number; desc: string }> = {
  Legendary: { label: 'TERBAIK', stars: 4, desc: 'Banner profil dan bingkai emas berkilau di komentar. Paling langka.' },
  Epic:      { label: 'LANGKA',  stars: 3, desc: 'Adegan dramatis bergaya anime, bingkai ungu berkilau di komentar.' },
  Rare:      { label: 'BAGUS',   stars: 2, desc: 'Ilustrasi anime dengan bingkai biru bercahaya.' },
  Normal:    { label: 'UMUM',    stars: 1, desc: 'Ilustrasi anime sederhana tanpa efek tambahan. Paling mudah didapat.' },
};

const byRarity = (r: Rarity) => Object.keys(WALLPAPER_CATALOG).filter((k) => WALLPAPER_CATALOG[k].rarity === r);

export function rollRarity(): Rarity {
  const x = Math.random() * 100;
  let acc = 0;
  for (const r of RARITIES) { acc += RATES[r]; if (x < acc) return r; }
  return 'Normal';
}

/** n pull. Kalau n >= 10, pull terakhir dijamin minimal Rare. */
export function rollMany(n: number): string[] {
  const out: string[] = [];
  let sawRare = false;
  for (let i = 0; i < n; i++) {
    let r = rollRarity();
    if (n >= 10 && i === n - 1 && !sawRare && r === 'Normal') r = 'Rare';
    if (r !== 'Normal') sawRare = true;
    let pool = byRarity(r);
    if (!pool.length) pool = byRarity('Normal');
    out.push(pool[Math.floor(Math.random() * pool.length)]);
  }
  return out;
}
