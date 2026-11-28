// Gaya karakter Mancing (Lemari): warna kulit/rambut, baju, celana, topi. Dipakai karakter sendiri & dikirim ke pemain lain.
import { PAL_PLAYER } from './art';
import type { Pal } from './art';
import { TITLES, titleFor } from '@/lib/fishing';

// limited = baju dari Gacha Baju Limited yang sedang dipakai (0 = tidak ada, 1 = Setelan Pemburu Malam, 2 = Jubah Kilat Bara)
export interface Outfit { skin: number; hair: number; shirt: number; top: number; pants: number; hat: number; hatCol: number; ttl: number; limited: number }
export const LIMITED_OUTFITS = [
  { key: 'night', name: 'Setelan Pemburu Malam', pal: { shirt: '#10141f', shirtD: '#060910', top: '#1c2a3f', pants: '#0a0d15', boot: '#0a0d15', band: '#35e6ff', hat: '#10141f', hatD: '#060910' } },
  { key: 'flame', name: 'Jubah Kilat Bara', pal: { shirt: '#f6efe4', shirtD: '#cbbfae', top: '#ff7a1a', pants: '#3a2a22', boot: '#2a1c16', band: '#ff9b3a', hat: '#ff7a1a', hatD: '#c4570a' } },
] as const;

// lv = level minimal agar item terbuka (akun Developer membuka semuanya)
export const SKINS = [
  { c: '#fbd5bb', d: '#e6a98c', lv: 1 }, { c: '#f0c09a', d: '#d49a74', lv: 1 }, { c: '#d9a577', d: '#b88358', lv: 1 },
  { c: '#a8704a', d: '#85532f', lv: 1 }, { c: '#6e4328', d: '#52301c', lv: 1 },
];
export const HAIRS = [
  { c: '#5a3a28', lv: 1 }, { c: '#2a2a35', lv: 1 }, { c: '#c8793a', lv: 1 }, { c: '#e8c15a', lv: 3 }, { c: '#d9d6cf', lv: 5 }, { c: '#e0457b', lv: 8 },
  { c: '#4aa3d8', lv: 10 }, { c: '#9a68d8', lv: 13 }, { c: '#4a8a4a', lv: 16 }, { c: '#ff6b6b', lv: 20 }, { c: '#33d6c1', lv: 25 }, { c: '#f5f5ff', lv: 30 },
];
export const SHIRTS = [
  { c: '#3fa24a', lv: 1 }, { c: '#2f6fd0', lv: 1 }, { c: '#d04a4a', lv: 2 }, { c: '#e8a33a', lv: 4 }, { c: '#8a5ad0', lv: 6 }, { c: '#2f9aa8', lv: 8 },
  { c: '#d85a8a', lv: 11 }, { c: '#2b2f3e', lv: 14 }, { c: '#f2f2f2', lv: 18 }, { c: '#c9a227', lv: 24 }, { c: '#1fd1a5', lv: 32 }, { c: '#ff7a1a', lv: 40 },
];
export const TOPS = [
  { c: '#f6eee0', lv: 1 }, { c: '#ffffff', lv: 1 }, { c: '#f6e3a8', lv: 3 }, { c: '#cfe6ff', lv: 7 }, { c: '#222831', lv: 12 }, { c: '#ffc9d9', lv: 17 },
];
export const PANTS = [
  { c: '#3fa24a', lv: 1 }, { c: '#2b4375', lv: 1 }, { c: '#5a3a28', lv: 2 }, { c: '#555a66', lv: 5 }, { c: '#8a3a3a', lv: 9 }, { c: '#222831', lv: 13 },
  { c: '#c8a96a', lv: 19 }, { c: '#e8e8f0', lv: 26 },
];
export const HATS = [{ n: 'Tanpa', lv: 1 }, { n: 'Jerami', lv: 4 }, { n: 'Pelaut', lv: 9 }];
export const HAT_COLORS = [
  { c: '#e8c76a', lv: 1 }, { c: '#2b4375', lv: 1 }, { c: '#d04a4a', lv: 3 }, { c: '#3fa24a', lv: 5 }, { c: '#222831', lv: 8 },
  { c: '#f2f2f2', lv: 12 }, { c: '#8a5ad0', lv: 16 }, { c: '#ff7a1a', lv: 22 },
];

export const DEFAULT_OUTFIT: Outfit = { skin: 0, hair: 0, shirt: 0, top: 0, pants: 0, hat: 0, hatCol: 1, ttl: -1, limited: 0 };

const clampI = (v: unknown, n: number, min = 0) => {
  const x = Math.floor(Number(v));
  return Number.isFinite(x) ? Math.min(n - 1, Math.max(min, x)) : min;
};

export function sanitizeOutfit(raw: any): Outfit {
  const r = raw && typeof raw === 'object' ? raw : {};
  return {
    skin: clampI(r.skin, SKINS.length), hair: clampI(r.hair, HAIRS.length), shirt: clampI(r.shirt, SHIRTS.length),
    top: clampI(r.top, TOPS.length), pants: clampI(r.pants, PANTS.length), hat: clampI(r.hat, HATS.length),
    hatCol: clampI(r.hatCol, HAT_COLORS.length), ttl: clampI(r.ttl, TITLES.length, -1), limited: clampI(r.limited, LIMITED_OUTFITS.length + 1),
  };
}

function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f)));
  return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => ch(v).toString(16).padStart(2, '0')).join('');
}

export function palFromOutfit(o: Outfit): Pal {
  const sk = SKINS[o.skin] || SKINS[0];
  const shirt = (SHIRTS[o.shirt] || SHIRTS[0]).c;
  const hat = (HAT_COLORS[o.hatCol] || HAT_COLORS[0]).c;
  const lim = o.limited > 0 ? LIMITED_OUTFITS[o.limited - 1] : null;
  const base: Pal = {
    ...PAL_PLAYER,
    skin: sk.c, skinD: sk.d,
    hair: (HAIRS[o.hair] || HAIRS[0]).c,
    shirt, shirtD: shade(shirt, -0.28),
    top: (TOPS[o.top] || TOPS[0]).c,
    pants: (PANTS[o.pants] || PANTS[0]).c,
    hat, hatD: shade(hat, -0.3),
    nohat: o.hat === 0, cap: o.hat === 2,
  };
  return lim ? { ...base, ...lim.pal, fx: lim.key } : base;
}

// kode ringkas untuk dikirim ke pemain lain (tanpa title)
export const encodeOutfit = (o: Outfit) => [o.skin, o.hair, o.shirt, o.top, o.pants, o.hat, o.hatCol, o.limited || 0].join('.');
const palCache = new Map<string, Pal | null>();
export function palFromCode(code: unknown): Pal | null {
  if (typeof code !== 'string' || code.length > 40) return null;
  const hit = palCache.get(code);
  if (hit !== undefined) return hit;
  const a = code.split('.').map(Number);
  let pal: Pal | null = null;
  if ((a.length === 7 || a.length === 8) && a.every((n) => Number.isFinite(n))) {
    pal = palFromOutfit(sanitizeOutfit({ skin: a[0], hair: a[1], shirt: a[2], top: a[3], pants: a[4], hat: a[5], hatCol: a[6], limited: a[7] ?? 0 }));
  }
  if (palCache.size > 200) palCache.clear();
  palCache.set(code, pal);
  return pal;
}

// Title yang dipakai: pilihan pemain kalau sudah terbuka, kalau tidak otomatis sesuai level
export function titleOf(level: number, ttl: number): string {
  const t = TITLES[ttl];
  return t && level >= t[0] ? t[1] : titleFor(level);
}

export function randomOutfit(level: number, dev: boolean, base: Outfit): Outfit {
  const pick = (list: { lv: number }[]) => {
    const ok = list.map((x, i) => (dev || level >= x.lv ? i : -1)).filter((i) => i >= 0);
    return ok[Math.floor(Math.random() * ok.length)] ?? 0;
  };
  return { ...base, skin: pick(SKINS), hair: pick(HAIRS), shirt: pick(SHIRTS), top: pick(TOPS), pants: pick(PANTS), hat: pick(HATS), hatCol: pick(HAT_COLORS) };
}

// Title tampilan: role (Developer / Admin / Premium) menggantikan title level; tanpa role = title biasa
export function roleLabel(role?: string): string {
  return role === 'dev' ? 'DEVELOPER' : role === 'admin' ? 'ADMIN' : role === 'premium' ? 'PREMIUM' : '';
}
export function displayTitle(level: number, ttl: number, role?: string): string {
  return roleLabel(role) || titleOf(level, ttl);
}
