import type { ReactNode } from 'react';
import GameMode from '@/components/GameMode';

// Semua halaman di /komikstore (toko + game) otomatis masuk mode game (landscape).
// Keluar dari area ini (balik ke beranda dll.) → otomatis kembali ke mode HP (portrait).
export default function KomikStoreLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <GameMode />
      {children}
    </>
  );
}
