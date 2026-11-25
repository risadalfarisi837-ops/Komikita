'use client';

import { useEffect } from 'react';

// Mode game: masuk halaman → layar otomatis landscape.
// Keluar halaman → layar dikembalikan ke mode HP (portrait), lalu rotasi bebas lagi.
// Sengaja TANPA layar penuh, supaya pesan sistem Android "Tarik dari atas..." tidak muncul.
// Catatan: kunci landscape hanya diizinkan Android di aplikasi terpasang (APK / PWA).
// Kalau kuncinya ditolak, game Mancing memutar tampilannya sendiri (lihat FishingGame.tsx).

type Orient = ScreenOrientation & { lock?: (o: string) => Promise<void>; unlock?: () => void };

const getOrient = () => (typeof screen !== 'undefined' ? (screen.orientation as Orient | undefined) : undefined);

// penanda urutan supaya "keluar" yang telat tidak membatalkan "masuk" berikutnya
let seq = 0;

async function enterGameMode(): Promise<boolean> {
  seq++;
  const o = getOrient();
  if (!o?.lock) return false;
  try { await o.lock('landscape'); return true; } catch { return false; }
}

async function leaveGameMode() {
  const my = ++seq;
  const o = getOrient();
  try { await o?.lock?.('portrait'); } catch { /* tidak diizinkan, cukup di-unlock */ }
  // kalau pemain memakai tombol "Layar penuh landscape" di menu game, keluarkan juga
  try { if (document.fullscreenElement) await document.exitFullscreen(); } catch { /* abaikan */ }
  setTimeout(() => {
    if (my !== seq) return;
    try { o?.unlock?.(); } catch { /* abaikan */ }
  }, 600);
}

export default function GameMode() {
  useEffect(() => {
    enterGameMode();
    return () => { leaveGameMode(); };
  }, []);
  return null;
}
