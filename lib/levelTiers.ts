// 15 tier level + Admin (sama seperti lembar "Semua Tier Level" di desain acuan)
export type LevelTier = {
  key: string; name: string; min: number; max: number;
  nameColor: string; // warna nama tier di daftar
  text: string;      // warna teks di dalam pil
  pill: string;      // latar pil (CSS background)
  border: string;    // garis pil (CSS border)
  circle: string;    // latar lingkaran ikon
  ring: string;      // warna garis lingkaran ikon
};

const T = (key: string, name: string, min: number, max: number, nameColor: string, text: string, pill: string, border: string, circle: string, ring: string): LevelTier =>
  ({ key, name, min, max, nameColor, text, pill, border, circle, ring });

export const TIERS: LevelTier[] = [
  T('stone', 'Stone', 0, 49, '#d4d6dc', '#e6e7eb', 'linear-gradient(135deg,#3a3c43,#4a4d56)', '1px solid rgba(255,255,255,.14)', '#1d1e22', '#5a5d68'),
  T('bronze', 'Bronze', 50, 149, '#f0b48a', '#ffd9b8', 'linear-gradient(135deg,#5c301b,#8a4a2b)', '1px solid rgba(240,150,90,.35)', '#3a2218', '#8a4a2b'),
  T('silver', 'Silver', 150, 499, '#eef1f5', '#f4f6fa', 'linear-gradient(135deg,#465062,#6b7a8f)', '1px solid rgba(220,230,245,.35)', '#2a3039', '#8895a8'),
  T('gold', 'Gold', 500, 2499, '#f6d869', '#ffe9a0', 'linear-gradient(135deg,#6e500e,#a8801a)', '1px solid rgba(246,216,105,.45)', '#4f3b0a', '#b8902a'),
  T('emerald', 'Emerald', 2500, 4999, '#62d49c', '#b8f5d0', 'linear-gradient(135deg,#0f4426,#1c6b3d)', '1px solid rgba(98,212,156,.35)', '#0f2c1b', '#22804a'),
  T('diamond', 'Diamond', 5000, 9999, '#7fc4e6', '#cfeaff', 'linear-gradient(135deg,#0f3a63,#1b5f93)', '1px solid rgba(127,196,230,.35)', '#0f2538', '#2b6e9e'),
  T('master', 'Master', 10000, 19999, '#b8cf68', '#e4f08a', 'linear-gradient(135deg,#343d0a,#566411)', '1px solid rgba(184,207,104,.35)', '#202607', '#6b7a1a'),
  T('mythic', 'Mythic', 20000, 49999, '#c9b6f2', '#e6dcff', 'linear-gradient(135deg,#34166a,#5b2aa3)', '1px solid rgba(201,182,242,.35)', '#2b1459', '#6a3cc0'),
  T('ascendant', 'Ascendant', 50000, 99999, '#f0a2ac', '#ffd0d6', 'linear-gradient(135deg,#5c1020,#9b1c33)', '1px solid rgba(240,162,172,.35)', '#3d0f1a', '#b02040'),
  T('celestial', 'Celestial', 100000, 199999, '#e8c46a', '#fff4d0', 'linear-gradient(100deg,#2e5aa8,#c58a1a 55%,#2e5aa8)', '1px solid rgba(255,225,150,.45)', '#4a3a10', '#c99a2e'),
  T('eternal', 'Eternal', 200000, 999999, '#e8d08a', '#f5e3a8', 'linear-gradient(135deg,#1b1d33,#2b2f55)', '1.5px solid #e8c46a', '#1b1f3a', '#e8c46a'),
  T('divine', 'Divine', 1000000, 2499999, '#5fe0e0', '#e6ffff', 'linear-gradient(135deg,#0d6b78,#1aa6b3)', '1.5px solid rgba(180,250,255,.7)', '#0e3a42', '#2bb5c2'),
  T('transcendent', 'Transcendent', 2500000, 4999999, '#f27ac0', '#fff0fb', 'linear-gradient(135deg,#b3239a,#7b2bd1)', '1.5px solid rgba(230,170,255,.8)', '#4a1240', '#d23fae'),
  T('cosmic', 'Cosmic', 5000000, 9999999, '#d9d2ff', '#ffffff', 'linear-gradient(135deg,#3a2a9a,#5a46d6)', '1.5px solid rgba(160,150,255,.8)', '#1b1740', '#6a5cff'),
  T('infinity', 'Infinity', 10000000, Infinity, '#e8c46a', '#f2dc9a', 'linear-gradient(135deg,#17171c,#26262d)', '1.5px solid #c9a24a', '#1c1b14', '#c9a24a'),
];

// Khusus akun admin — tidak ikut hitungan level
export const ADMIN_TIER: LevelTier = T('admin', 'Admin', 0, 0, '#ffffff', '#ffffff', 'transparent', '1.5px solid #e6e6ee', '#2a2a30', '#6a6a75');

export const nf = (n: number) => Math.max(0, Math.floor(Number(n) || 0)).toLocaleString('id-ID');

export function tierFor(level: number): LevelTier {
  const lv = Math.max(0, Math.floor(Number(level) || 0));
  return TIERS.find((t) => lv >= t.min && lv <= t.max) || TIERS[0];
}
export function nextTier(level: number): LevelTier | null {
  const i = TIERS.indexOf(tierFor(level));
  return i >= 0 && i < TIERS.length - 1 ? TIERS[i + 1] : null;
}
export const rangeText = (t: LevelTier) =>
  t.key === 'admin' ? 'Lvl. ?' : t.max === Infinity ? `Lvl. ${nf(t.min)}+` : `Lvl. ${nf(t.min)} – ${nf(t.max)}`;
