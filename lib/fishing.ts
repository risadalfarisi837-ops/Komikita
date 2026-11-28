// Data & aturan game Mancing (murni logika, tanpa tampilan).

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic' | 'divine' | 'secret';
export type Shape = 'oval' | 'round' | 'long' | 'flat' | 'big' | 'shark';
export type Pattern = 'none' | 'stripes' | 'spots' | 'band';

export const RARITY: Record<Rarity, { label: string; color: string; weight: number; xp: number; diff: number }> = {
  common: { label: 'Umum', color: '#cbd5e1', weight: 55, xp: 6, diff: 1 },
  uncommon: { label: 'Tidak Umum', color: '#86efac', weight: 25, xp: 14, diff: 1.2 },
  rare: { label: 'Langka', color: '#7dd3fc', weight: 12, xp: 34, diff: 1.45 },
  epic: { label: 'Epik', color: '#c4b5fd', weight: 6, xp: 80, diff: 1.75 },
  legendary: { label: 'Legendary', color: '#fcd34d', weight: 2, xp: 220, diff: 2.05 },
  mythic: { label: 'Mythic', color: '#ff5d7a', weight: 0, xp: 400, diff: 2.4 },
  // Divine & Secret: hanya bisa didapat dengan joran power >= DIVINE_MIN_POWER (lihat rollFish). weight = peluang dasar (tampilan "1 dari N").
  divine: { label: 'Divine', color: '#7df9ff', weight: 0.35, xp: 900, diff: 2.7 },
  secret: { label: 'Secret', color: '#e879f9', weight: 0.02, xp: 2200, diff: 3.3 },
};

// Syarat joran (kekuatan tarik / power) untuk bisa mendapat ikan Divine dan Secret. 7 = Joran Bulan Purnama ke atas.
export const DIVINE_MIN_POWER = 7;
export const isTopFish = (r: Rarity): boolean => r === 'divine' || r === 'secret';

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
  gs?: number; // skala ikan raksasa saat dipamerkan
  eventOnly?: boolean;
  giant?: boolean; // ikan raksasa: tampil sangat besar saat dipegang
}

export const SPECIES: Species[] = [
  { id: 'teri', name: 'Teri Pasir', rarity: 'common', min: 0.003, max: 0.015, price: 4, shape: 'long', body: '#cfd8dc', belly: '#eceff1', fin: '#b0bec5', pattern: 'none', accent: '#90a4ae' },
  { id: 'kembung', name: 'Kembung Biru', rarity: 'common', min: 0.08, max: 0.25, price: 10, shape: 'oval', body: '#4f8fbf', belly: '#cfe8f7', fin: '#356a94', pattern: 'stripes', accent: '#2b4f73' },
  { id: 'selar', name: 'Selar Kuning', rarity: 'common', min: 0.1, max: 0.3, price: 12, shape: 'oval', body: '#e6c24a', belly: '#fff3b0', fin: '#c9a227', pattern: 'band', accent: '#8a6d0f' },
  { id: 'baronang', name: 'Baronang Belang', rarity: 'common', min: 0.2, max: 0.6, price: 16, shape: 'round', body: '#8bbf6a', belly: '#e6f4d3', fin: '#5e9444', pattern: 'stripes', accent: '#3d6b2b' },
  { id: 'bandeng', name: 'Bandeng Tambak', rarity: 'common', min: 0.2, max: 0.9, price: 14, shape: 'long', body: '#b8c4cc', belly: '#f1f5f7', fin: '#8fa0ab', pattern: 'none', accent: '#6b7c88' },
  { id: 'belanak', name: 'Belanak Pantai', rarity: 'common', min: 0.1, max: 0.5, price: 11, shape: 'long', body: '#a9bfa0', belly: '#eef5e8', fin: '#7d9873', pattern: 'stripes', accent: '#55704c' },
  { id: 'tembang', name: 'Tembang Hijau', rarity: 'common', min: 0.03, max: 0.12, price: 7, shape: 'oval', body: '#5fae9a', belly: '#d8f2ea', fin: '#3f8a76', pattern: 'none', accent: '#2c6354' },
  { id: 'layur', name: 'Layur Pita', rarity: 'common', min: 0.3, max: 1.1, price: 18, shape: 'long', body: '#d6dde3', belly: '#ffffff', fin: '#aab6c0', pattern: 'none', accent: '#8896a2' },
  { id: 'kerong', name: 'Kerong-kerong Loreng', rarity: 'common', min: 0.15, max: 0.5, price: 13, shape: 'oval', body: '#9a8f6a', belly: '#ece4c4', fin: '#746a48', pattern: 'band', accent: '#4a4229' },
  { id: 'kakap', name: 'Kakap Merah', rarity: 'uncommon', min: 0.8, max: 2.5, price: 36, shape: 'oval', body: '#e0584d', belly: '#ffd4cf', fin: '#b83a30', pattern: 'none', accent: '#8f2a22' },
  { id: 'tongkol', name: 'Tongkol Perak', rarity: 'uncommon', min: 1, max: 3, price: 40, shape: 'long', body: '#6c8ea8', belly: '#dbe7ef', fin: '#4a6a82', pattern: 'stripes', accent: '#3b546a' },
  { id: 'buntal', name: 'Buntal Duri', rarity: 'uncommon', min: 0.3, max: 1, price: 46, shape: 'round', body: '#e9b86a', belly: '#fff0d2', fin: '#c08a3e', pattern: 'spots', accent: '#8a5a1c' },
  { id: 'badut', name: 'Ikan Badut Karang', rarity: 'uncommon', min: 0.05, max: 0.2, price: 38, shape: 'round', body: '#ff8a3d', belly: '#ffd2a8', fin: '#e0651a', pattern: 'band', accent: '#ffffff' },
  { id: 'kakatua', name: 'Kakatua Pelangi', rarity: 'uncommon', min: 0.6, max: 2, price: 52, shape: 'oval', body: '#3fc2b0', belly: '#ffc2e0', fin: '#ee7fb4', pattern: 'spots', accent: '#1f7f72' },
  { id: 'cakalang', name: 'Cakalang Garis', rarity: 'uncommon', min: 1.5, max: 4.5, price: 48, shape: 'long', body: '#3d5f8a', belly: '#d9e3ee', fin: '#2a4668', pattern: 'stripes', accent: '#1d3350' },
  { id: 'bawal', name: 'Bawal Hitam', rarity: 'uncommon', min: 0.7, max: 2.2, price: 44, shape: 'round', body: '#4a4f5c', belly: '#c7ccd6', fin: '#30343e', pattern: 'none', accent: '#1f222a' },
  { id: 'kuwe', name: 'Kuwe Bintik Emas', rarity: 'uncommon', min: 1, max: 3.5, price: 50, shape: 'oval', body: '#b9c7b2', belly: '#fff7d0', fin: '#e0b83a', pattern: 'spots', accent: '#b8901c' },
  { id: 'kerapu', name: 'Kerapu Macan', rarity: 'rare', min: 3, max: 9, price: 110, shape: 'big', body: '#b9835a', belly: '#f1d9c0', fin: '#8b5b38', pattern: 'spots', accent: '#5b3a22' },
  { id: 'pari', name: 'Pari Elang', rarity: 'rare', min: 5, max: 14, price: 150, shape: 'flat', body: '#5f7fa6', belly: '#d9e5f2', fin: '#3f5c82', pattern: 'spots', accent: '#e8f1ff' },
  { id: 'lentera', name: 'Ikan Lentera', rarity: 'rare', min: 0.5, max: 2.2, price: 130, shape: 'round', body: '#3b3f77', belly: '#6b70b8', fin: '#272b57', pattern: 'spots', accent: '#7df9ff', glow: true },
  { id: 'singa', name: 'Ikan Singa Api', rarity: 'rare', min: 0.4, max: 1.6, price: 120, shape: 'round', body: '#c8402f', belly: '#ffd9c9', fin: '#ff8a5c', pattern: 'stripes', accent: '#ffffff' },
  { id: 'moray', name: 'Moray Hijau', rarity: 'rare', min: 2, max: 8, price: 140, shape: 'long', body: '#5f8f3a', belly: '#d6e8b8', fin: '#44691f', pattern: 'spots', accent: '#e8e07a' },
  { id: 'barakuda', name: 'Barakuda Taring', rarity: 'rare', min: 4, max: 12, price: 160, shape: 'long', body: '#7d8f9c', belly: '#e8eef2', fin: '#5a6b77', pattern: 'band', accent: '#2f3b44' },
  { id: 'napoleon', name: 'Napoleon Samudra', rarity: 'rare', min: 8, max: 28, price: 190, shape: 'big', body: '#2fa6a0', belly: '#c6f0ea', fin: '#1d746f', pattern: 'spots', accent: '#7df9d8' },
  { id: 'parilistrik', name: 'Pari Listrik', rarity: 'rare', min: 3, max: 10, price: 170, shape: 'flat', body: '#6a5fa6', belly: '#e0dcf5', fin: '#4a4082', pattern: 'spots', accent: '#fff36b', glow: true },
  { id: 'tuna', name: 'Tuna Sirip Biru', rarity: 'epic', min: 30, max: 90, price: 360, shape: 'long', body: '#2f5fa8', belly: '#cfe0f5', fin: '#f2c230', pattern: 'stripes', accent: '#1d3f78' },
  { id: 'marlin', name: 'Marlin Senja', rarity: 'epic', min: 60, max: 180, price: 480, shape: 'long', body: '#3a8fa8', belly: '#d6f0f6', fin: '#ff9a62', pattern: 'band', accent: '#ff9a62' },
  { id: 'todak', name: 'Todak Pedang', rarity: 'epic', min: 50, max: 150, price: 440, shape: 'long', body: '#4a6fa8', belly: '#dbe6f5', fin: '#2d4a7c', pattern: 'band', accent: '#e8f1ff' },
  { id: 'angler', name: 'Setan Laut Dalam', rarity: 'epic', min: 15, max: 60, price: 520, shape: 'round', body: '#2a2236', belly: '#4a3d63', fin: '#1a1424', pattern: 'spots', accent: '#7df9ff', glow: true },
  { id: 'mola', name: 'Mola Raksasa', rarity: 'epic', min: 120, max: 400, price: 500, shape: 'round', body: '#aab7c4', belly: '#eef2f6', fin: '#7d8c9b', pattern: 'spots', accent: '#5f6f7e' },
  { id: 'ubur', name: 'Ikan Ubur Pelangi', rarity: 'epic', min: 20, max: 70, price: 470, shape: 'oval', body: '#b07cff', belly: '#ffd0f5', fin: '#6ee7ff', pattern: 'band', accent: '#ffffff', glow: true },
  { id: 'bulan', name: 'Ikan Bulan Emas', rarity: 'legendary', min: 200, max: 900, price: 1200, shape: 'round', body: '#ffd24a', belly: '#fff1b8', fin: '#ffb300', pattern: 'spots', accent: '#fff8d6', glow: true },
  { id: 'paus', name: 'Paus Kristal', rarity: 'legendary', min: 500, max: 1500, price: 1800, shape: 'big', body: '#58c7ff', belly: '#e0f7ff', fin: '#2f9bdc', pattern: 'spots', accent: '#ffffff', glow: true },
  { id: 'arwana', name: 'Arwana Matahari', rarity: 'legendary', min: 150, max: 600, price: 1500, shape: 'long', body: '#e8b830', belly: '#fff0a8', fin: '#ff9a1f', pattern: 'spots', accent: '#fff8d6', glow: true },
  { id: 'selakan', name: 'Selakan Purba', rarity: 'legendary', min: 300, max: 1100, price: 2100, shape: 'big', body: '#2b4b8a', belly: '#9fc0ee', fin: '#1a3262', pattern: 'spots', accent: '#cfe4ff', glow: true },
  { id: 'nagalaut', name: 'Ikan Naga Laut', rarity: 'legendary', min: 400, max: 1300, price: 2300, shape: 'long', body: '#1fa3a8', belly: '#c4f5ee', fin: '#ff5d7a', pattern: 'stripes', accent: '#ffe27a', glow: true },
  { id: 'hiu', name: 'Hiu Raksasa', rarity: 'legendary', min: 400, max: 1800, price: 2600, shape: 'shark', body: '#6b7f94', belly: '#eef3f7', fin: '#52657a', pattern: 'none', accent: '#3d4d5f', glow: true, eventOnly: true },
  { id: 'pariraksasa', name: 'Pari Manta Raksasa', rarity: 'legendary', min: 20000, max: 50000, price: 9000, shape: 'flat', body: '#2d3a52', belly: '#e6ecf5', fin: '#1d2638', pattern: 'spots', accent: '#9fc4ff', glow: true, eventOnly: true, giant: true, gs: 3.8 },
  { id: 'pausbiru', name: 'Paus Biru Samudra', rarity: 'legendary', min: 40000, max: 100000, price: 16000, shape: 'big', body: '#3f6fa6', belly: '#cfe3f5', fin: '#2c4f7c', pattern: 'none', accent: '#9fd0ff', glow: true, eventOnly: true, giant: true, gs: 5.2 },
  { id: 'hiuputih', name: 'Hiu Putih Raksasa', rarity: 'legendary', min: 80000, max: 160000, price: 26000, shape: 'shark', body: '#9fb0c2', belly: '#ffffff', fin: '#6f8196', pattern: 'none', accent: '#6f8196', glow: true, eventOnly: true, giant: true, gs: 7 },
  { id: 'leviathan', name: 'Leviathan Pulau', rarity: 'legendary', min: 150000, max: 400000, price: 40000, shape: 'big', body: '#1f6f8b', belly: '#bfeaf5', fin: '#134a63', pattern: 'spots', accent: '#7df9ff', glow: true, eventOnly: true, giant: true },
  // ---- Divine (butuh joran power 7+) ----
  { id: 'malaikat', name: 'Ikan Malaikat Cahaya', rarity: 'divine', min: 8, max: 40, price: 6500, shape: 'round', body: '#fff3b8', belly: '#ffffff', fin: '#ffe27a', pattern: 'band', accent: '#fffbe0', glow: true },
  { id: 'arwanadewa', name: 'Arwana Dewa Fajar', rarity: 'divine', min: 25, max: 110, price: 8800, shape: 'long', body: '#ffd96a', belly: '#fffbe6', fin: '#ff9a3d', pattern: 'spots', accent: '#ffffff', glow: true },
  { id: 'pariilahi', name: 'Pari Manta Ilahi', rarity: 'divine', min: 80, max: 260, price: 11500, shape: 'flat', body: '#9fe3ff', belly: '#f4fdff', fin: '#5fb8ec', pattern: 'spots', accent: '#ffffff', glow: true },
  // ---- Secret (butuh joran power 7+, sangat langka & susah ditarik) ----
  { id: 'bayangan', name: 'Ikan Bayangan Hampa', rarity: 'secret', min: 6, max: 34, price: 32000, shape: 'long', body: '#150f24', belly: '#3b2a5c', fin: '#7c3aed', pattern: 'band', accent: '#f0abfc', glow: true },
  { id: 'nagasegel', name: 'Naga Segel Terlarang', rarity: 'secret', min: 220, max: 900, price: 62000, shape: 'big', body: '#1b0f2b', belly: '#4a2a73', fin: '#d946ef', pattern: 'spots', accent: '#f5d0fe', glow: true },
];

export const SPECIES_BY_ID: Record<string, Species> = Object.fromEntries(SPECIES.map((s) => [s.id, s]));

export interface BagItem {
  id: string; // id unik tiap tangkapan
  s: string; // id spesies
  w: number; // berat (kg)
}

export const BAG_MAX = 45;
export const MAX_LEVEL = 50;

export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ---- Level & XP ----
export const xpNeed = (lv: number) => 80 + lv * 40; // XP yang dibutuhkan dari level lv ke lv+1

// Total XP minimum agar tepat berada di awal level lv (dipakai Dev Tools untuk set level)
export function xpForLevel(lv: number): number {
  const target = Math.min(MAX_LEVEL, Math.max(1, Math.floor(lv) || 1));
  let total = 0;
  for (let i = 1; i < target; i++) total += xpNeed(i);
  return total;
}

export function levelFromXp(xp: number) {
  let level = 1;
  let rest = Math.max(0, Math.floor(xp));
  while (level < MAX_LEVEL && rest >= xpNeed(level)) {
    rest -= xpNeed(level);
    level++;
  }
  return { level, into: rest, need: level >= MAX_LEVEL ? Math.max(1, rest) : xpNeed(level) };
}

export const TITLES: [number, string][] = [
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
export function rollShark(rnd: () => number = Math.random): { species: Species; weight: number } {
  const species = SPECIES_BY_ID.hiu;
  const raw = species.min + (species.max - species.min) * Math.pow(rnd(), 1.4);
  return { species, weight: Math.round(raw * 100) / 100 };
}

export function rollGiant(rnd: () => number = Math.random): { species: Species; weight: number } {
  const table: [string, number][] = [['pariraksasa', 36], ['pausbiru', 30], ['hiuputih', 24], ['leviathan', 10]];
  let x = rnd() * 100;
  let id = 'pariraksasa';
  for (const [k, w] of table) { if (x < w) { id = k; break; } x -= w; }
  const species = SPECIES_BY_ID[id];
  const raw = species.min + (species.max - species.min) * Math.pow(rnd(), 1.2);
  return { species, weight: Math.round(raw * 100) / 100 };
}
export function rollFish(level: number, luck: number = 0, rnd: () => number = Math.random, rodPower: number = 0): { species: Species; weight: number } {
  const b = Math.min(Math.max(level, 1), MAX_LEVEL) / MAX_LEVEL; // 0..1
  const lk = Math.max(0, Math.min(3, luck)); // bonus joran (+ event Gerombolan Ikan sampai +2)
  const w: Record<Rarity, number> = {
    common: Math.max(2, RARITY.common.weight - 20 * b - 16 * lk),
    uncommon: RARITY.uncommon.weight + 3 * b + 2 * lk,
    rare: RARITY.rare.weight + 8 * b + 6 * lk,
    epic: RARITY.epic.weight + 8 * b + 6 * lk,
    legendary: RARITY.legendary.weight + 4 * b + 3 * lk,
    mythic: 0,
    // Divine & Secret: hanya kalau joran power >= DIVINE_MIN_POWER. Secret jauh lebih langka daripada Divine.
    divine: rodPower >= DIVINE_MIN_POWER ? RARITY.divine.weight + 0.4 * lk : 0,
    secret: rodPower >= DIVINE_MIN_POWER ? RARITY.secret.weight + 0.015 * lk : 0,
  };
  const order: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'divine', 'secret'];
  const total = order.reduce((a, r) => a + w[r], 0);
  let roll = rnd() * total;
  let rarity: Rarity = 'common';
  for (const r of order) {
    if (roll < w[r]) { rarity = r; break; }
    roll -= w[r];
  }
  const pool = SPECIES.filter((s) => s.rarity === rarity && !s.eventOnly);
  const species = pool[Math.min(pool.length - 1, Math.floor(rnd() * pool.length))];
  // Hoki juga menentukan ukuran: makin tinggi luck, makin sering dapat yang besar (luck 0 = sama seperti dulu)
  const raw = species.min + (species.max - species.min) * Math.pow(rnd(), Math.max(0.6, 1.7 - 0.5 * lk));
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

// Posisi berat dalam rentang spesies (0 = terkecil, 1 = terbesar)
export function sizeRatio(s: Species, weight: number): number {
  return s.max > s.min ? Math.min(1, Math.max(0, (weight - s.min) / (s.max - s.min))) : 0.5;
}
// ---- Ukuran: kecil / sedang / besar ----
// Batasnya sama dengan label kualitas di kartu tangkapan (Sedang mulai 40%, Besar mulai 70% dari rentang spesies).
export type SizeTier = 'kecil' | 'sedang' | 'besar';
export const SIZE_LABEL: Record<SizeTier, string> = { kecil: 'Kecil', sedang: 'Sedang', besar: 'Besar' };
const TIER_RANGE: Record<SizeTier, [number, number]> = { kecil: [0, 0.4], sedang: [0.4, 0.7], besar: [0.7, 1] };
export function sizeTier(s: Species, weight: number): SizeTier {
  const r = sizeRatio(s, weight);
  return r >= 0.7 ? 'besar' : r >= 0.4 ? 'sedang' : 'kecil';
}
// Ganti berat tangkapan supaya jatuh di kelas ukuran tertentu (spesies tetap sama).
export function withSize(c: { species: Species; weight: number }, tier: SizeTier, rnd: () => number = Math.random): { species: Species; weight: number } {
  const [a, b] = TIER_RANGE[tier];
  const s = c.species;
  const round = (raw: number) => (raw < 1 ? Math.round(raw * 1000) / 1000 : Math.round(raw * 100) / 100);
  // Pembulatan bisa menggeser ikan berentang sempit (mis. Teri) ke kelas tetangga, jadi coba lagi beberapa kali.
  for (let i = 0; i < 8; i++) {
    const weight = round(s.min + (s.max - s.min) * (a + (b - a) * rnd()));
    if (sizeTier(s, weight) === tier) return { species: s, weight };
  }
  return { species: s, weight: Math.round((s.min + (s.max - s.min) * (a + b) / 2) * 1e6) / 1e6 };
}
// Tangkapan "XL": berat di 20% teratas rentang spesiesnya
export function isXL(s: Species, weight: number): boolean {
  return sizeRatio(s, weight) >= 0.8;
}
// Layak dipamerkan: XL, atau ikan Epik/Legendary
export function isShowoff(s: Species, weight: number): boolean {
  return isXL(s, weight) || s.rarity === 'epic' || s.rarity === 'legendary' || isTopFish(s.rarity);
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
  monthly?: boolean; // joran bulanan: dijual di tab Toko walau ada di gacha
}

export const DEFAULT_ROD = 'default';

export const RODS: Rod[] = [
  { id: 'default', name: 'Joran Kayu', rarity: 'common', power: 1, luck: 0, money: 0, xp: 0, price: 0 },
  { id: 'fiber', name: 'Joran Fiber', rarity: 'common', power: 2, luck: 0.06, money: 0.08, xp: 0.08, price: 300 },
  { id: 'karbon', name: 'Joran Karbon', rarity: 'uncommon', power: 3, luck: 0.14, money: 0.16, xp: 0.16, price: 900 },
  { id: 'perak', name: 'Joran Perak Laut', rarity: 'rare', power: 4, luck: 0.24, money: 0.26, xp: 0.26, price: 2400 },
  { id: 'emas', name: 'Joran Emas Samudra', rarity: 'epic', power: 5, luck: 0.36, money: 0.38, xp: 0.36, price: 6000 },
  { id: 'kristal', name: 'Joran Kristal Badai', rarity: 'epic', power: 6, luck: 0.46, money: 0.44, xp: 0.42, price: 0, gachaOnly: true },
  { id: 'bulan', name: 'Joran Bulan Purnama', rarity: 'legendary', power: 7, luck: 0.6, money: 0.55, xp: 0.5, price: 25000, gachaOnly: true, monthly: true },
  { id: 'naga', name: 'Joran Naga Laut', rarity: 'legendary', power: 8, luck: 0.75, money: 0.68, xp: 0.6, price: 0, gachaOnly: true },
  { id: 'sisik', name: 'Joran Sisik Naga', rarity: 'mythic', power: 9, luck: 0.9, money: 0.8, xp: 0.7, price: 0, gachaOnly: true },
  { id: 'tentakel', name: 'Joran Tentakel Laut Dalam', rarity: 'mythic', power: 10, luck: 1.0, money: 0.9, xp: 0.8, price: 0, gachaOnly: true },
];
export const RODS_BY_ID: Record<string, Rod> = Object.fromEntries(RODS.map((r) => [r.id, r]));

// Kemudahan menarik ikan dari kekuatan joran (power 1..8 -> 0..1). Joran Kayu = 0, Naga Laut = 1.
export const rodEase = (power: number): number => Math.min(1, Math.max(0, (power - 1) / 7));

// ---- Level joran (upgrade pakai Crystal) ----
export const ROD_MAX_LV = 5;
export const ROD_LV_STEP = 0.04; // tiap level di atas 1 menambah +4% hoki, harga jual, dan XP
export const rodUpgradeCost = (rod: Rod, lv: number): number => (300 + 200 * rod.power) * Math.max(1, lv);
export const clampRodLv = (lv: unknown): number => (typeof lv === 'number' && Number.isFinite(lv) ? Math.min(ROD_MAX_LV, Math.max(1, Math.floor(lv))) : 1);
// Joran dengan bonus level dihitung. Kekuatan tarik (power) tidak berubah.
export function rodAt(rod: Rod, lv?: number): Rod {
  const add = ROD_LV_STEP * (clampRodLv(lv) - 1);
  if (!add) return rod;
  return { ...rod, luck: rod.luck + add, money: rod.money + add, xp: rod.xp + add };
}
export function sanitizeRodLv(raw: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (raw && typeof raw === 'object') {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) if (RODS_BY_ID[k] && clampRodLv(v) > 1) out[k] = clampRodLv(v);
  }
  return out;
}

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
export const GACHA_PITY = 22; // joran Epic atau lebih tinggi dijamin dalam 22 peti
const TOP_RARITY: Rarity[] = ['epic', 'legendary', 'mythic'];
// Peluang per rarity (persen, jumlah = 100), dibagi rata ke joran di rarity itu
const GACHA_RARITY_PCT: Record<Rarity, number> = { common: 36, uncommon: 28, rare: 20, epic: 11, legendary: 4.9, mythic: 0.1, divine: 0, secret: 0 };
export const GACHA_RODS: Rod[] = RODS.filter((r) => r.id !== DEFAULT_ROD);

// Peluang tiap joran gacha dalam persen (jumlah = 100)
export const GACHA_ODDS: Record<string, number> = (() => {
  const out: Record<string, number> = {};
  for (const r of GACHA_RODS) out[r.id] = GACHA_RARITY_PCT[r.rarity] / GACHA_RODS.filter((x) => x.rarity === r.rarity).length;
  return out;
})();

// minRarity hanya dipakai Dev Tools (gacha wangi): hanya joran dengan rarity itu atau lebih tinggi yang bisa keluar.
const RARITY_RANK: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic', 'divine', 'secret'];
export function rollGacha(rnd: () => number = Math.random, pity = 0, minRarity: Rarity | '' = ''): Rod {
  let pool = pity >= GACHA_PITY - 1 ? GACHA_RODS.filter((r) => TOP_RARITY.includes(r.rarity)) : GACHA_RODS;
  if (minRarity) {
    const min = RARITY_RANK.indexOf(minRarity);
    const wangi = GACHA_RODS.filter((r) => RARITY_RANK.indexOf(r.rarity) >= min);
    if (wangi.length) pool = wangi;
  }
  const total = pool.reduce((a, r) => a + GACHA_ODDS[r.id], 0);
  let roll = rnd() * total;
  for (const r of pool) {
    if (roll < GACHA_ODDS[r.id]) return r;
    roll -= GACHA_ODDS[r.id];
  }
  return pool[pool.length - 1];
}
export const nextPity = (rod: Rod, pity: number) => (TOP_RARITY.includes(rod.rarity) ? 0 : pity + 1);


// ---------- umpan ----------
// Dipakai 1 setiap melempar joran; menambah peluang ikan langka (bonus luck) selama masih ada stok.
export interface Bait { id: string; name: string; price: number; luck: number; emoji: string; desc: string }
export const BAITS: Bait[] = [
  { id: 'cacing', name: 'Cacing Tanah', price: 15, luck: 0.15, emoji: '🪱', desc: 'Umpan dasar' },
  { id: 'udang', name: 'Udang Segar', price: 45, luck: 0.4, emoji: '🦐', desc: 'Disukai ikan sedang' },
  { id: 'teri', name: 'Teri Wangi', price: 120, luck: 0.9, emoji: '🐟', desc: 'Baunya memanggil ikan langka' },
  { id: 'emas', name: 'Umpan Emas', price: 350, luck: 1.8, emoji: '✨', desc: 'Peluang epik & legendary naik besar' },
];
export const BAITS_BY_ID: Record<string, Bait> = Object.fromEntries(BAITS.map((b) => [b.id, b]));
export function sanitizeBaits(raw: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (raw && typeof raw === 'object') {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (BAITS_BY_ID[k] && typeof v === 'number' && Number.isFinite(v) && v > 0) out[k] = Math.min(9999, Math.floor(v));
    }
  }
  return out;
}
