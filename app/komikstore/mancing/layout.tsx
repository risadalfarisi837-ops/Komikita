import type { ReactNode } from 'react';
import GameMode from '@/components/GameMode';

// Hanya game Mancing yang masuk mode game (landscape).
// Keluar dari Mancing (ke KomikStore / beranda) → otomatis kembali ke mode HP (portrait).
export default function MancingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <GameMode />
      {children}
    </>
  );
}
