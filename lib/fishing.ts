// Data & aturan game Mancing (murni logika, tanpa tampilan).

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type Shape = 'oval' | 'round' | 'long' | 'flat' | 'big';
export type Pattern = 'none' | 'stripes' | 'spots' | 'band';

export const RARITY: Record<Rarity, { label: string; color: string; weight: number; xp: number; diff: number }> = {
  common: { label: 'Umum', color: '#cbd5e1', weight: 55, xp: 6, diff: 1 },
  uncommon: { label: 'Tidak Umum', color: '#86efac', weight: 25, xp: 14, diff: 1.2 },
  rare: { label: 'Langka', color: '#7dd3fc', weight: 12, xp: 34, diff: 1.45 },
  epic: { label: 'Epik', color: '#c4b5fd', weight: 6, xp: 80, diff: 1.75 },
  legendary: { label: 'Legendary', color: '#fcd34d', weight: 2, xp: 220, diff: 2.05 },
};

export interface Species {
  id: string;
  name: string;
  rarity: Rarity;
  min: number; // kg
  max: number; // kg
  price: number; // Crystal (harga dasar)
  shape: Shape;
  body: string;
  belly: string;
  fin: string;
  pattern: Pattern;
  accent: string;
  glow?: boolean;
}

export const SPECIES: Species[] = [
  { id: 'teri', name: 'Teri Pasir', rarity: 'common', min: 0.003, max: 0.015, price: 4, shape: 'long', body: '#cfd8dc', belly: '#eceff1', fin: '#b0bec5', pattern: 'none', accent: '#90a4ae' },
  { id: 'kembung', name: 'Kembung Biru', rarity: 'common', min: 0.08, max: 0.25, price: 10, shape: 'oval', body: '#4f8fbf', belly: '#cfe8f7', fin: '#356a94', pattern: 'stripes', accent: '#2b4f73' },
  { id: 'selar', name: 'Selar Kuning', rarity: 'common', min: 0.1, max: 0.3, price: 12, shape: 'oval', body: '#e6c24a', belly: '#fff3b0', fin: '#c9a227', pattern: 'band', accent: '#8a6d0f' },
  { id: 'baronang', name: 'Baronang Belang', rarity: 'common', min: 0.2, max: 0.6, price: 16, shape: 'round', body: '#8bbf6a', belly: '#e6f4d3', fin: '#5e9444', pattern: 'stripes', accent: '#3d6b2b' },
  { id: 'kakap', name: 'Kakap Merah', rarity: 'uncommon', min: 0.8, max: 2.5, price: 36, shape: 'oval', body: '#e0584d', belly: '#ffd4cf', fin: '#b83a30', pattern: 'none', accent: '#8f2a22' },
  { id: 'tongkol', name: 'Tongkol Perak', rarity: 'uncommon', min: 1, max: 3, price: 40, shape: 'long', body: '#6c8ea8', belly: '#dbe7ef', fin: '#4a6a82', pattern: 'stripes', accent: '#3b546a' },
  { id: 'buntal', name: 'Buntal Duri', rarity: 'uncommon', min: 0.3, max: 1, price: 46, shape: 'round', body: '#e9b86a', belly: '#fff0d2', fin: '#c08a3e', pattern: 'spots', accent: '#8a5a1c' },
  { id: 'kerapu', name: 'Kerapu Macan', rarity: 'rare', min: 3, max: 9, price: 110, shape: 'big', body: '#b9835a', belly: '#f1d9c0', fin: '#8b5b38', pattern: 'spots', accent: '#5b3a22' },
  { id: 'pari', name: 'Pari Elang', rarity: 'rare', min: 5, max: 14, price: 150, shape: 'flat', body: '#5f7fa6', belly: '#d9e5f2', fin: '#3f5c82', pattern: 'spots', accent: '#e8f1ff' },
  { id: 'lentera', name: 'Ikan Lentera', rarity: 'rare', min: 0.5, max: 2.2, price: 130, shape: 'round', body: '#3b3f77', belly: '#6b70b8', fin: '#272b57', pattern: 'spots', accent: '#7df9ff', glow: true },
  { id: 'tuna', name: 'Tuna Sirip Biru', rarity: 'epic', min: 30, max: 90, price: 360, shape: 'long', body: '#2f5fa8', belly: '#cfe0f5', fin: '#f2c230', pattern: 'stripes', accent: '#1d3f78' },
  { id: 'marlin', name: 'Marlin Senja', rarity: 'epic', min: 60, max: 180, price: 480, shape: 'long', body: '#3a8fa8', belly: '#d6f0f6', fin: '#ff9a62', pattern: 'band', accent: '#ff9a62' },
  { id: 'bulan', name: 'Ikan Bulan Emas', rarity: 'legendary', min: 200, max: 900, price: 1200, shape: 'round', body: '#ffd24a', belly: '#fff1b8', fin: '#ffb300', pattern: 'spots', accent: '#fff8d6', glow: true },
  { id: 'paus', name: 'Paus Kristal', rarity: 'legendary', min: 500, max: 1500, price: 1800, shape: 'big', body: '#58c7ff', belly: '#e0f7ff', fin: '#2f9bdc', pattern: 'spots', accent: '#ffffff', glow: true },
];

export const SPECIES_BY_ID: Record<string, Species> = Object.fromEntries(SPECIES.map((s) => [s.id, s]));

export interface BagItem {
  id: string; // id unik tiap tangkapan
  s: string; // id spesies
  w: number; // berat (kg)
}

export const BAG_MAX = 30;
export const MAX_LEVEL = 50;

export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ---- Level & XP ----
export const xpNeed = (lv: number) => 80 + lv * 40; // XP yang dibutuhkan dari level lv ke lv+1

export function levelFromXp(xp: number) {
  let level = 1;
  let rest = Math.max(0, Math.floor(xp));
  while (level < MAX_LEVEL && rest >= xpNeed(level)) {
    rest -= xpNeed(level);
    level++;
  }
  return { level, into: rest, need: level >= MAX_LEVEL ? Math.max(1, rest) : xpNeed(level) };
}

const TITLES: [number, string][] = [
  [1, 'Pendatang Baru'],
  [3, 'Pemancing Pantai'],
  [6, 'Pemancing Karang'],
  [10, 'Pemancing Laut Dalam'],
  [16, 'Pawang Ikan'],
  [25, 'Raja Pancing'],
  [40, 'Legenda Samudra'],
];
export function titleFor(level: number): string {
  let t = TITLES[0][1];
  for (const [lv, name] of TITLES) if (level >= lv) t = name;
  return t;
}

// ---- Tangkapan ----
export function rollFish(level: number, luck: number = 0, rnd: () => number = Math.random): { species: Species; weight: number } {
  const b = Math.min(Math.max(level, 1), MAX_LEVEL) / MAX_LEVEL; // 0..1
  const lk = Math.max(0, Math.min(1.5, luck)); // bonus dari joran yang dipakai
  const w: Record<Rarity, number> = {
    common: Math.max(2, RARITY.common.weight - 20 * b - 16 * lk),
    uncommon: RARITY.uncommon.weight + 3 * b + 2 * lk,
    rare: RARITY.rare.weight + 8 * b + 6 * lk,
    epic: RARITY.epic.weight + 8 * b + 6 * lk,
    legendary: RARITY.legendary.weight + 4 * b + 3 * lk,
  };
  const order: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
  const total = order.reduce((a, r) => a + w[r], 0);
  let roll = rnd() * total;
  let rarity: Rarity = 'common';
  for (const r of order) {
    if (roll < w[r]) { rarity = r; break; }
    roll -= w[r];
  }
  const pool = SPECIES.filter((s) => s.rarity === rarity);
  const species = pool[Math.min(pool.length - 1, Math.floor(rnd() * pool.length))];
  const raw = species.min + (species.max - species.min) * Math.pow(rnd(), 1.7);
  const weight = raw < 1 ? Math.round(raw * 1000) / 1000 : Math.round(raw * 100) / 100;
  return { species, weight };
}

export function fishPrice(s: Species, weight: number, moneyBonus: number = 0): number {
  const t = s.max > s.min ? (weight - s.min) / (s.max - s.min) : 0.5;
  const base = s.price * (0.75 + 0.5 * Math.min(1, Math.max(0, t)));
  return Math.max(1, Math.round(base * (1 + Math.max(0, moneyBonus))));
}

export function xpFor(s: Species, weight: number, xpBonus: number = 0): number {
  const base = RARITY[s.rarity].xp + Math.round(Math.min(40, Math.sqrt(weight) * 2));
  return Math.round(base * (1 + Math.max(0, xpBonus)));
}

export function formatWeight(kg: number): string {
  if (kg < 1) return Math.max(1, Math.round(kg * 1000)) + ' gr';
  if (kg >= 1000) return (kg / 1000).toFixed(1).replace('.', ',') + ' ton';
  if (kg >= 10) return Math.round(kg) + ' kg';
  return kg.toFixed(1).replace('.', ',') + ' kg';
}

export const formatNum = (n: number) => Math.round(n).toLocaleString('id-ID');

// Bersihkan data tas dari Firebase (bisa berupa array/objek, bisa ada yang rusak)
export function sanitizeBag(raw: unknown): BagItem[] {
  const arr: unknown[] = Array.isArray(raw) ? raw : raw && typeof raw === 'object' ? Object.values(raw as object) : [];
  const out: BagItem[] = [];
  for (const it of arr) {
    const o = it as { id?: unknown; s?: unknown; w?: unknown };
    if (o && typeof o.s === 'string' && SPECIES_BY_ID[o.s] && typeof o.w === 'number' && o.w > 0) {
      out.push({ id: typeof o.id === 'string' ? o.id : newId(), s: o.s, w: o.w });
    }
    if (out.length >= BAG_MAX) break;
  }
  return out;
}

// ---- Joran (Toko & Gacha) ----
export interface Rod {
  id: string;
  name: string;
  rarity: Rarity;
  power: number; // kekuatan tarik, sekadar tampilan
  luck: number;  // bonus peluang dapat ikan langka (0..1)
  money: number; // bonus harga jual, mis. 0.2 = +20%
  xp: number;    // bonus XP, mis. 0.2 = +20%
  price: number; // harga di Toko (Crystal); 0 = tidak dijual langsung, hanya lewat Gacha
  gachaOnly?: boolean;
}

export const DEFAULT_ROD = 'default';

export const RODS: Rod[] = [
  { id: 'default', name: 'Joran Kayu', rarity: 'common', power: 1, luck: 0, money: 0, xp: 0, price: 0 },
  { id: 'fiber', name: 'Joran Fiber', rarity: 'common', power: 2, luck: 0.06, money: 0.08, xp: 0.08, price: 300 },
  { id: 'karbon', name: 'Joran Karbon', rarity: 'uncommon', power: 3, luck: 0.14, money: 0.16, xp: 0.16, price: 900 },
  { id: 'perak', name: 'Joran Perak Laut', rarity: 'rare', power: 4, luck: 0.24, money: 0.26, xp: 0.26, price: 2400 },
  { id: 'emas', name: 'Joran Emas Samudra', rarity: 'epic', power: 5, luck: 0.36, money: 0.38, xp: 0.36, price: 6000 },
  { id: 'kristal', name: 'Joran Kristal Badai', rarity: 'epic', power: 6, luck: 0.46, money: 0.44, xp: 0.42, price: 0, gachaOnly: true },
  { id: 'bulan', name: 'Joran Bulan Purnama', rarity: 'legendary', power: 7, luck: 0.6, money: 0.55, xp: 0.5, price: 0, gachaOnly: true },
  { id: 'naga', name: 'Joran Naga Laut', rarity: 'legendary', power: 8, luck: 0.75, money: 0.68, xp: 0.6, price: 0, gachaOnly: true },
];
export const RODS_BY_ID: Record<string, Rod> = Object.fromEntries(RODS.map((r) => [r.id, r]));

// Bersihkan daftar joran milik user dari Firebase; "default" selalu dianggap dimiliki.
export function sanitizeRods(raw: unknown): string[] {
  const arr: unknown[] = Array.isArray(raw) ? raw : raw && typeof raw === 'object' ? Object.values(raw as object) : [];
  const owned = arr.filter((x): x is string => typeof x === 'string' && !!RODS_BY_ID[x]);
  return Array.from(new Set([DEFAULT_ROD, ...owned]));
}

// ---- Gacha joran ----
export const GACHA_PRICE = 500;
// Dapat joran yang sudah dimiliki? dikembalikan jadi Crystal supaya nggak sia-sia.
export const GACHA_DUPLICATE_REFUND = Math.round(GACHA_PRICE * 0.5);

const GACHA_POOL: { rod: Rod; weight: number }[] = RODS.filter((r) => r.gachaOnly).map((r) => ({
  rod: r,
  weight: r.id === 'naga' ? 6 : r.id === 'bulan' ? 16 : 60,
}));

export function rollGacha(rnd: () => number = Math.random): Rod {
  const total = GACHA_POOL.reduce((a, p) => a + p.weight, 0);
  let roll = rnd() * total;
  for (const p of GACHA_POOL) {
    if (roll < p.weight) return p.rod;
    roll -= p.weight;
  }
  return GACHA_POOL[GACHA_POOL.length - 1].rod;
}
