// Gacha Baju Limited (banner "Baju Secret Hunter"): isi peti, peluang, dan pity.
export const LIMITED_PRICE = { one: 320, ten: 2880 } as const; // Gems
export const MYTHIC_PITY = 1000;                               // Mythic dijamin paling lambat di peti ke-1.000
export const DUP_REFUND = { mythic: 800, legendary: 320 } as const; // baju dobel -> Gems balik

export type LimitedRarity = 'Mythic' | 'Legendary' | 'Epic' | 'Rare' | 'Common';
export interface LimitedItem { key: string; name: string; rarity: LimitedRarity; weight: number; qty: number; outfit?: boolean; crystal?: number }
export interface LimitedDrop extends LimitedItem { duplicate?: boolean; refund?: number }

// weight dalam persen (total 100)
export const LIMITED_POOL: LimitedItem[] = [
  { key: 'night', name: 'Setelan Pemburu Malam', rarity: 'Mythic', weight: 0.1, qty: 1, outfit: true },
  { key: 'flame', name: 'Jubah Kilat Bara', rarity: 'Legendary', weight: 2.4, qty: 1, outfit: true },
  { key: 'star', name: 'Debu Bintang', rarity: 'Epic', weight: 12, qty: 5 },
  { key: 'squid', name: 'Cumi', rarity: 'Rare', weight: 11.67, qty: 10 },
  { key: 'glow', name: 'Umpan Glow', rarity: 'Rare', weight: 11.67, qty: 10 },
  { key: 'cricket', name: 'Jangkrik Emas', rarity: 'Rare', weight: 11.66, qty: 10 },
  { key: 'crystal', name: 'Wibugem', rarity: 'Common', weight: 16.83, qty: 10, crystal: 10 },
  { key: 'worm', name: 'Cacing', rarity: 'Common', weight: 16.83, qty: 20 },
  { key: 'shrimp', name: 'Udang', rarity: 'Common', weight: 16.84, qty: 10 },
];

const LIMITED_RANK: LimitedRarity[] = ['Common', 'Rare', 'Epic', 'Legendary', 'Mythic'];

/** Satu tarikan. pity = jumlah peti sejak Mythic terakhir. Mengembalikan item dan pity baru.
 *  min hanya dipakai Dev Tools (gacha hoki): hanya item dengan rarity itu atau lebih tinggi yang keluar. */
export function rollLimited(pity: number, rnd: () => number = Math.random, min: LimitedRarity | '' = ''): { item: LimitedItem; pity: number } {
  const force = pity + 1 >= MYTHIC_PITY;
  let item = LIMITED_POOL[0];
  if (!force) {
    const pool = min ? LIMITED_POOL.filter((i) => LIMITED_RANK.indexOf(i.rarity) >= LIMITED_RANK.indexOf(min)) : LIMITED_POOL;
    const total = pool.reduce((a, i) => a + i.weight, 0);
    let r = rnd() * total;
    item = pool[pool.length - 1];
    for (const i of pool) { if (r < i.weight) { item = i; break; } r -= i.weight; }
  }
  return { item, pity: item.rarity === 'Mythic' ? 0 : pity + 1 };
}

export function sanitizeLimited(raw: any): { owned: string[]; pity: number; items: Record<string, number> } {
  const r = raw && typeof raw === 'object' ? raw : {};
  const ownedRaw: unknown[] = Array.isArray(r.owned) ? r.owned : r.owned && typeof r.owned === 'object' ? Object.values(r.owned) : [];
  const owned = Array.from(new Set(ownedRaw.filter((k): k is string => k === 'night' || k === 'flame')));
  const pity = typeof r.pity === 'number' && Number.isFinite(r.pity) ? Math.min(MYTHIC_PITY - 1, Math.max(0, Math.floor(r.pity))) : 0;
  const items: Record<string, number> = {};
  if (r.items && typeof r.items === 'object') {
    for (const [k, v] of Object.entries(r.items)) if (typeof v === 'number' && Number.isFinite(v) && v > 0) items[k] = Math.floor(v);
  }
  return { owned, pity, items };
}
