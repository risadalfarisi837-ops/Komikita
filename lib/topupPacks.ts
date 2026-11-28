// Daftar paket top up. Dipakai layar Top Up (klien) DAN server (harga selalu dicek ulang di server).
// Harga & bonus contoh, sesuaikan dengan ekonomi game.
export type TopUpCurrency = 'gems' | 'crystal';
export interface TopUpPack { id: string; amount: number; bonus: number; rupiah: number; tag?: string }

export const TOPUP_PACKS: Record<TopUpCurrency, TopUpPack[]> = {
  gems: [
    { id: 'g1', amount: 300, bonus: 20, rupiah: 5000 },
    { id: 'g2', amount: 700, bonus: 70, rupiah: 10000 },
    { id: 'g3', amount: 1500, bonus: 200, rupiah: 20000, tag: 'Populer' },
    { id: 'g4', amount: 4000, bonus: 600, rupiah: 50000, tag: 'Terlaris' },
    { id: 'g5', amount: 8500, bonus: 1700, rupiah: 100000 },
    { id: 'g6', amount: 18000, bonus: 4500, rupiah: 200000, tag: 'Paling hemat' },
  ],
  crystal: [
    { id: 'c1', amount: 10000, bonus: 500, rupiah: 5000 },
    { id: 'c2', amount: 25000, bonus: 2500, rupiah: 10000 },
    { id: 'c3', amount: 60000, bonus: 9000, rupiah: 20000, tag: 'Populer' },
    { id: 'c4', amount: 160000, bonus: 32000, rupiah: 50000, tag: 'Terlaris' },
    { id: 'c5', amount: 340000, bonus: 85000, rupiah: 100000 },
    { id: 'c6', amount: 720000, bonus: 216000, rupiah: 200000, tag: 'Paling hemat' },
  ],
};

// Lokasi saldo di Realtime Database: users/{uid}/{field}
export const WALLET_FIELD: Record<TopUpCurrency, string> = { gems: 'gems', crystal: 'koin' };

export function findPack(currency: unknown, id: unknown): TopUpPack | null {
  if (currency !== 'gems' && currency !== 'crystal') return null;
  return TOPUP_PACKS[currency].find((p) => p.id === id) ?? null;
}
