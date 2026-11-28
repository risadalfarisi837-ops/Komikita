import type { ReactNode } from 'react';
import type { Viewport } from 'next';
import GameMode from '@/components/GameMode';

// viewport-fit=cover: game memakai seluruh layar, termasuk area poni/kamera (tidak ada pita hitam di sisi layar).
// HUD game sendiri menjauh dari poni lewat safe-area-inset.
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' };

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
