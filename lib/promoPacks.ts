// Paket Promo di Toko mancing. Dipakai layar bayar (klien) dan panel admin (profil).
// Pembayaran manual: QRIS + nominal unik, lalu bukti dikirim ke WhatsApp admin. Admin menyetujui, hadiah masuk.

export type PromoPackId = 'monthly' | 'perdana' | 'lanjut' | 'buah' | 'bekal';

// akun = sekali per akun, minggu = sekali per minggu, bulan = sekali per bulan kalender, rod = habis kalau joran sudah dimiliki
export type PromoLimit = 'akun' | 'minggu' | 'bulan' | 'rod';

export interface PromoPack {
  id: PromoPackId;
  nama: string;
  rupiah: number;
  limit: PromoLimit;
  gems?: number;
  crystal?: number;
  rods?: string[];
  /** Barang non-saldo, disimpan di users/{uid}/fishing/promoItems/{kunci} */
  items?: Record<string, number>;
}

export const PROMO_PACKS: Record<PromoPackId, PromoPack> = {
  monthly: { id: 'monthly', nama: 'Rod Bulan Purnama', rupiah: 99000, limit: 'rod', rods: ['bulan'] },
  perdana: { id: 'perdana', nama: 'Paket Perdana', rupiah: 29000, limit: 'akun', gems: 3000, rods: ['bulan'] },
  lanjut: { id: 'lanjut', nama: 'Paket Lanjut', rupiah: 99000, limit: 'bulan', gems: 6000, items: { ticket: 1, feather: 10 } },
  buah: { id: 'buah', nama: 'Paket Musim Buah', rupiah: 15000, limit: 'akun', items: { fruit: 1, feather: 10 } },
  bekal: { id: 'bekal', nama: 'Bekal Mingguan', rupiah: 49000, limit: 'minggu', gems: 6000, items: { star: 300 } },
};

export const ITEM_NAMES: Record<string, string> = { ticket: 'Tiket', feather: 'Bulu', fruit: 'Buah', star: 'Bintang' };

// Nomor WhatsApp admin (sama dengan halaman Premium) dan nama QRIS
export const PROMO_WA = '6281315059849';
export const PROMO_QRIS_NAME = 'Risyadh All Store';
export const PROMO_TTL = 24 * 60 * 60 * 1000; // pesanan berlaku 24 jam

export const isPromoPackId = (v: unknown): v is PromoPackId => typeof v === 'string' && v in PROMO_PACKS;

// Nominal unik (harga + 100..999) supaya admin mudah mencocokkan pembayaran, sama seperti Premium
export const uniqueAmount = (base: number) => base + 100 + Math.floor(Math.random() * 900);

const weekStart = (ts: number) => {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Senin
  return d.getTime();
};
const monthKey = (ts: number) => { const d = new Date(ts); return d.getFullYear() * 12 + d.getMonth(); };

/** Apakah paket sedang terkunci karena sudah dibeli (boughtAt = waktu hadiah terakhir diterima, ms). */
export function packLocked(pack: PromoPack, boughtAt: number | undefined, now = Date.now()): boolean {
  if (!boughtAt) return false;
  if (pack.limit === 'akun') return true;
  if (pack.limit === 'minggu') return weekStart(boughtAt) === weekStart(now);
  if (pack.limit === 'bulan') return monthKey(boughtAt) === monthKey(now);
  return false;
}

/** Kunci hari (waktu setempat) untuk Umpan Gratis harian. */
export const dayKey = (ts = Date.now()) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const FREE_BAIT = { id: 'cacing', qty: 10 } as const;

export function sanitizePromoBought(raw: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (raw && typeof raw === 'object') {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (isPromoPackId(k) && typeof v === 'number' && Number.isFinite(v) && v > 0) out[k] = v;
    }
  }
  return out;
}

/** Ringkasan hadiah untuk pesan WhatsApp dan panel admin. */
export function rewardText(pack: PromoPack): string {
  const parts: string[] = [];
  if (pack.gems) parts.push(`${pack.gems.toLocaleString('id-ID')} Permata`);
  if (pack.crystal) parts.push(`${pack.crystal.toLocaleString('id-ID')} Crystal`);
  if (pack.rods?.length) parts.push('Rod Bulan Purnama');
  for (const [k, n] of Object.entries(pack.items || {})) parts.push(`${n > 1 ? n + ' ' : ''}${ITEM_NAMES[k] || k}`);
  return parts.join(' + ');
}
