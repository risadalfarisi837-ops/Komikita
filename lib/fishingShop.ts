// Data Toko Mancing: kostum karakter (Gaya), upgrade Tas, gacha dengan pity, paket pemula.
import { BAG_MAX } from './fishing';

export type Slot = 'hair' | 'shirt' | 'hat' | 'glasses' | 'back' | 'tail';
export type StyleRarity = 'common' | 'rare' | 'epic' | 'legendary';
export const SLOTS: { k: Slot; label: string }[] = [
  { k: 'hair', label: 'Rambut' }, { k: 'shirt', label: 'Baju' }, { k: 'hat', label: 'Topi' },
  { k: 'glasses', label: 'Kacamata' }, { k: 'back', label: 'Punggung' }, { k: 'tail', label: 'Ekor' },
];
const SLOT_KEYS: Slot[] = SLOTS.map((s) => s.k);

export interface StyleItem {
  id: string;
  slot: Slot;
  name: string;
  rarity: StyleRarity;
  kind: string;      // bentuk gambar (lihat drawOutfit di art.ts)
  c: string;         // warna utama
  c2?: string;       // warna kedua
  gems?: number;     // harga langsung di Toko (Permata). Kosong = hanya dari peti
  luck?: number; xp?: number; money?: number; // bonus (0.1 = +10%)
}

export const STYLES: StyleItem[] = [
  // Rambut
  { id: 'h-pendek-hitam', slot: 'hair', name: 'Pendek Hitam', rarity: 'common', kind: 'pendek', c: '#2a2a35' },
  { id: 'h-pendek-coklat', slot: 'hair', name: 'Pendek Coklat', rarity: 'common', kind: 'pendek', c: '#8a5a2b' },
  { id: 'h-pendek-pirang', slot: 'hair', name: 'Pendek Pirang', rarity: 'common', kind: 'pendek', c: '#e8c15a' },
  { id: 'h-panjang-hitam', slot: 'hair', name: 'Panjang Hitam', rarity: 'rare', kind: 'panjang', c: '#2a2a35' },
  { id: 'h-panjang-coklat', slot: 'hair', name: 'Panjang Coklat', rarity: 'rare', kind: 'panjang', c: '#8a5a2b' },
  { id: 'h-bob-pirang', slot: 'hair', name: 'Bob Pirang', rarity: 'rare', kind: 'bob', c: '#e8c15a' },
  { id: 'h-kuncir-pink', slot: 'hair', name: 'Kuncir Pink', rarity: 'epic', kind: 'kuncir', c: '#e86aa0' },
  { id: 'h-bob-biru', slot: 'hair', name: 'Bob Biru', rarity: 'epic', kind: 'bob', c: '#4aa3d8' },
  { id: 'h-bob-putih', slot: 'hair', name: 'Bob Putih', rarity: 'legendary', kind: 'bob', c: '#e9ecf2' },
  { id: 'h-panjang-putih', slot: 'hair', name: 'Panjang Putih', rarity: 'legendary', kind: 'panjang', c: '#e9ecf2', gems: 250 },
  // Baju
  { id: 's-kaos-merah', slot: 'shirt', name: 'Kaos Merah', rarity: 'common', kind: 'kaos', c: '#c94a4a', c2: '#8f2f2f' },
  { id: 's-kaos-hijau', slot: 'shirt', name: 'Kaos Hijau', rarity: 'common', kind: 'kaos', c: '#4aa56a', c2: '#2f7a48' },
  { id: 's-kaos-kuning', slot: 'shirt', name: 'Kaos Kuning', rarity: 'common', kind: 'kaos', c: '#e8c14a', c2: '#b8932a' },
  { id: 's-pelaut', slot: 'shirt', name: 'Kemeja Pelaut', rarity: 'rare', kind: 'pelaut', c: '#f1f3f6', c2: '#2f4b7e' },
  { id: 's-jaket-biru', slot: 'shirt', name: 'Jaket Biru', rarity: 'rare', kind: 'jaket', c: '#3a78c8', c2: '#24508a' },
  { id: 's-hoodie-ungu', slot: 'shirt', name: 'Hoodie Ungu', rarity: 'epic', kind: 'hoodie', c: '#7a4ac8', c2: '#53308f' },
  { id: 's-kimono-emas', slot: 'shirt', name: 'Kimono Emas', rarity: 'legendary', kind: 'kimono', c: '#e8b23a', c2: '#c0392b', gems: 350 },
  // Topi
  { id: 't-jerami', slot: 'hat', name: 'Topi Jerami', rarity: 'common', kind: 'jerami', c: '#e0c070', c2: '#b8903a' },
  { id: 't-beanie', slot: 'hat', name: 'Beanie Merah', rarity: 'common', kind: 'beanie', c: '#c94a4a', c2: '#f1f1f1' },
  { id: 't-kucing', slot: 'hat', name: 'Telinga Kucing', rarity: 'rare', kind: 'kucing', c: '#e9ecf2', c2: '#f2a6c4' },
  { id: 't-bajak', slot: 'hat', name: 'Topi Bajak Laut', rarity: 'epic', kind: 'bajak', c: '#25252e', c2: '#f1f1f1' },
  { id: 't-mahkota', slot: 'hat', name: 'Mahkota Emas', rarity: 'legendary', kind: 'mahkota', c: '#f0c040', c2: '#e0455a', gems: 450 },
  // Kacamata
  { id: 'k-bulat', slot: 'glasses', name: 'Kacamata Bulat', rarity: 'rare', kind: 'bulat', c: '#3a2a1a' },
  { id: 'k-hitam', slot: 'glasses', name: 'Kacamata Hitam', rarity: 'rare', kind: 'hitam', c: '#15151c' },
  { id: 'k-renang', slot: 'glasses', name: 'Kacamata Renang', rarity: 'epic', kind: 'renang', c: '#2a8aaa', c2: '#8fe6ff' },
  // Punggung
  { id: 'p-ransel', slot: 'back', name: 'Ransel Merah', rarity: 'common', kind: 'ransel', c: '#c94a4a', c2: '#8f2f2f' },
  { id: 'p-malaikat', slot: 'back', name: 'Sayap Malaikat', rarity: 'epic', kind: 'malaikat', c: '#f4f7fb', c2: '#c9d3e0', luck: 0.05 },
  { id: 'p-pelangi', slot: 'back', name: 'Pelangi', rarity: 'epic', kind: 'pelangi', c: '#ff6b6b', c2: '#4aa3ff', xp: 0.05 },
  { id: 'p-naga', slot: 'back', name: 'Sayap Naga Mutiara', rarity: 'legendary', kind: 'naga', c: '#b58cff', c2: '#7fe0ff', gems: 800, luck: 0.2, xp: 0.1, money: 0.1 },
  // Ekor
  { id: 'e-kucing', slot: 'tail', name: 'Ekor Kucing', rarity: 'rare', kind: 'ekorkucing', c: '#9aa0aa', c2: '#d8dde5' },
  { id: 'e-rubah', slot: 'tail', name: 'Ekor Rubah', rarity: 'epic', kind: 'rubah', c: '#e8873a', c2: '#ffffff' },
  { id: 'e-naga', slot: 'tail', name: 'Ekor Naga Zamrud', rarity: 'legendary', kind: 'ekornaga', c: '#2fbf8a', c2: '#ffd36a' },
];
export const STYLES_BY_ID: Record<string, StyleItem> = Object.fromEntries(STYLES.map((s) => [s.id, s]));
export const STYLE_RARITY: Record<StyleRarity, { label: string; color: string; weight: number }> = {
  common: { label: 'Common', color: '#b8c0cc', weight: 58 },
  rare: { label: 'Rare', color: '#4aa3ff', weight: 28 },
  epic: { label: 'Epic', color: '#b58cff', weight: 11 },
  legendary: { label: 'Legendary', color: '#f5c451', weight: 3 },
};
export const STYLE_RARITIES: StyleRarity[] = ['common', 'rare', 'epic', 'legendary'];

// ---------- outfit (apa yang sedang dipakai) ----------
export type Outfit = Partial<Record<Slot, string>>;
export function sanitizeOutfit(raw: unknown, owned: string[]): Outfit {
  const out: Outfit = {};
  if (raw && typeof raw === 'object') {
    for (const k of SLOT_KEYS) {
      const id = (raw as Record<string, unknown>)[k];
      if (typeof id === 'string' && STYLES_BY_ID[id]?.slot === k && owned.includes(id)) out[k] = id;
    }
  }
  return out;
}
export function sanitizeStyles(raw: unknown): string[] {
  const arr: unknown[] = Array.isArray(raw) ? raw : raw && typeof raw === 'object' ? Object.values(raw as object) : [];
  return Array.from(new Set(arr.filter((x): x is string => typeof x === 'string' && !!STYLES_BY_ID[x])));
}
export function outfitBonus(o: Outfit): { luck: number; xp: number; money: number } {
  let luck = 0, xp = 0, money = 0;
  for (const k of SLOT_KEYS) {
    const s = o[k] ? STYLES_BY_ID[o[k] as string] : null;
    if (s) { luck += s.luck || 0; xp += s.xp || 0; money += s.money || 0; }
  }
  return { luck, xp, money };
}
// kode ringkas untuk dikirim ke pemain lain: "h-bob-biru|s-pelaut||||e-rubah"
export function encodeOutfit(o: Outfit): string { return SLOT_KEYS.map((k) => o[k] || '').join('|'); }
export function decodeOutfit(s: unknown): Outfit {
  const out: Outfit = {};
  if (typeof s !== 'string') return out;
  s.split('|').slice(0, SLOT_KEYS.length).forEach((id, i) => { const it = STYLES_BY_ID[id]; if (it && it.slot === SLOT_KEYS[i]) out[SLOT_KEYS[i]] = id; });
  return out;
}

// ---------- gacha Gaya ----------
export const GAYA_PRICE = 350;
export const GAYA_PITY = 12;           // Epic+ dijamin dalam 12 peti
export const GAYA_DUP_REFUND = 120;    // gaya ganda -> Crystal balik
export const GAYA_POOL: StyleItem[] = STYLES.filter((s) => !s.gems);
export function gayaOdds(): { rarity: StyleRarity; pct: number; count: number; each: number }[] {
  const have = STYLE_RARITIES.filter((r) => GAYA_POOL.some((s) => s.rarity === r));
  const total = have.reduce((a, r) => a + STYLE_RARITY[r].weight, 0);
  return have.map((r) => {
    const count = GAYA_POOL.filter((s) => s.rarity === r).length;
    const pct = (STYLE_RARITY[r].weight / total) * 100;
    return { rarity: r, pct, count, each: Math.round(100 / (pct / count)) };
  });
}
/** Satu tarikan. pityCount = jumlah tarikan sejak Epic+ terakhir. Mengembalikan item & pity baru. */
export function rollGaya(pityCount: number, rnd: () => number = Math.random): { item: StyleItem; pity: number } {
  const force = pityCount + 1 >= GAYA_PITY;
  const rars = STYLE_RARITIES.filter((r) => GAYA_POOL.some((s) => s.rarity === r) && (!force || r === 'epic' || r === 'legendary'));
  const total = rars.reduce((a, r) => a + STYLE_RARITY[r].weight, 0);
  let roll = rnd() * total;
  let pick: StyleRarity = rars[rars.length - 1];
  for (const r of rars) { if (roll < STYLE_RARITY[r].weight) { pick = r; break; } roll -= STYLE_RARITY[r].weight; }
  const pool = GAYA_POOL.filter((s) => s.rarity === pick);
  const item = pool[Math.floor(rnd() * pool.length)];
  return { item, pity: pick === 'epic' || pick === 'legendary' ? 0 : pityCount + 1 };
}

// ---------- gacha Rod: Legendary dijamin ----------
export const ROD_PRICE_STEP = 500; // harga per tarikan = GACHA_PRICE di lib/fishing
export const ROD_PITY = 8;         // Legendary dijamin dalam 8 peti

// ---------- Tas ----------
export interface BagTier { id: string; slots: number; level: number; crystal?: number; gems?: number }
export const BAG_TIERS: BagTier[] = [
  { id: 'b5', slots: 5, level: 1, crystal: 1500 },
  { id: 'b10', slots: 10, level: 8, crystal: 4500 },
  { id: 'b15', slots: 15, level: 15, crystal: 12000 },
  { id: 'b20', slots: 20, level: 25, crystal: 30000 },
  { id: 'b25', slots: 25, level: 30, gems: 300 },
  { id: 'b35', slots: 35, level: 40, gems: 600 },
  { id: 'b50', slots: 50, level: 50, gems: 1000 },
];
export const bagCapacity = (extra: number) => BAG_MAX + Math.max(0, Math.floor(extra) || 0);
export function sanitizeBagExtra(raw: unknown): number {
  const n = typeof raw === 'number' && Number.isFinite(raw) ? Math.floor(raw) : 0;
  return BAG_TIERS.some((t) => t.slots === n) ? n : 0;
}

// ---------- paket pemula & hadiah Permata ----------
export const STARTER_PACK = { gems: 300, crystal: 500 };
export function gemsForCatch(rarity: string, giant: boolean): number {
  return (rarity === 'legendary' ? 15 : rarity === 'epic' ? 4 : 0) + (giant ? 25 : 0);
}
export const GEMS_PER_LEVEL = 25;
