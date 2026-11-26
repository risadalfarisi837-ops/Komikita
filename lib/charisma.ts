// Charisma = jumlah hati (like) yang diterima sebuah komentar. Dihitung otomatis saat orang menyukai komentar.
// Disimpan per periode di Firebase: charisma/<periode>/<uid pemilik komentar> = jumlah hati.
//   all = sepanjang waktu, m<YYYYMM> = bulan ini, w<YYYYMMDD> = minggu ini (mulai Senin)
import { getFirebase } from './leaderboard';

export function charismaBuckets(d: Date = new Date()) {
  const p2 = (n: number) => String(n).padStart(2, '0');
  const mon = new Date(d); mon.setHours(0, 0, 0, 0); mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7));
  return {
    all: 'all',
    d30: `m${d.getFullYear()}${p2(d.getMonth() + 1)}`,
    d7: `w${mon.getFullYear()}${p2(mon.getMonth() + 1)}${p2(mon.getDate())}`,
  };
}

export async function addCharisma(ownerUid: string, delta: 1 | -1): Promise<void> {
  try {
    if (!ownerUid) return;
    const { db } = await getFirebase();
    const inc = window.firebase.database.ServerValue.increment(delta);
    const b = charismaBuckets();
    // Satu per satu: kalau satu periode gagal (mis. belum ada nilainya), yang lain tetap jalan.
    await Promise.allSettled([b.all, b.d30, b.d7].map((k) => db.ref(`charisma/${k}/${ownerUid}`).set(inc)));
  } catch { /* abaikan, like tetap tersimpan */ }
}
