import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ID tampilan pengguna: 4 angka. Dihitung dari uid Firebase (FNV-1a), dipakai
// hanya sebagai cadangan untuk akun yang belum punya ID urut (lihat lib/shortid.ts),
// dan untuk tempat yang menampilkan banyak akun sekaligus (mis. daftar komentar)
// di mana mengambil ID urut tiap akun dari database akan terlalu banyak query.
export function numericId(uid: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < uid.length; i++) {
    h ^= uid.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return '#' + String(h % 10000).padStart(4, '0');
}

// ID urut (#0001, #0002, ...) kalau sudah pernah ditetapkan (field shortId di users/<uid>),
// kalau belum pakai numericId(uid) sebagai cadangan sementara.
export function formatShortId(shortId: number | string | null | undefined, uid: string): string {
  if (shortId !== null && shortId !== undefined && shortId !== '') {
    return '#' + String(shortId).padStart(4, '0');
  }
  return numericId(uid);
}
