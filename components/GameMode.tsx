'use client';

import { useEffect } from 'react';

// Mode game: masuk halaman → layar landscape. Keluar halaman → kembali ke mode HP (portrait).
// Android hanya mengizinkan kunci landscape di dalam layar penuh (atau aplikasi terpasang), dan layar penuh
// hanya boleh dibuka lewat sentuhan pemain. Jadi: coba kunci langsung; kalau ditolak, sentuhan pertama
// di game otomatis membuka layar penuh + kunci landscape. Kalau tetap ditolak, game memutar tampilannya
// sendiri (lihat FishingGame.tsx). Keluar dari layar penuh? Sentuhan berikutnya membukanya lagi.

type Orient = ScreenOrientation & { lock?: (o: string) => Promise<void>; unlock?: () => void };

const getOrient = () => (typeof screen !== 'undefined' ? (screen.orientation as Orient | undefined) : undefined);

// penanda urutan supaya "keluar" yang telat tidak membatalkan "masuk" berikutnya
let seq = 0;

async function lockLandscape(): Promise<boolean> {
  const o = getOrient();
  if (!o?.lock) return false;
  try { await o.lock('landscape'); return true; } catch { return false; }
}

async function enterGameMode(): Promise<boolean> {
  seq++;
  return lockLandscape();
}

// harus dipanggil dari dalam sentuhan pemain
async function enterFullscreenLandscape() {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
  } catch { /* ditolak (mis. iPhone): cukup pakai rotasi sendiri */ }
  await lockLandscape();
}

async function leaveGameMode() {
  const my = ++seq;
  const o = getOrient();
  try { await o?.lock?.('portrait'); } catch { /* tidak diizinkan, cukup di-unlock */ }
  try { if (document.fullscreenElement) await document.exitFullscreen(); } catch { /* abaikan */ }
  setTimeout(() => {
    if (my !== seq) return;
    try { o?.unlock?.(); } catch { /* abaikan */ }
  }, 600);
}

export default function GameMode() {
  useEffect(() => {
    enterGameMode();
    let armed = false;
    const onTap = () => {
      armed = false;
      if (!document.fullscreenElement) enterFullscreenLandscape();
    };
    const arm = () => {
      if (armed) return;
      armed = true;
      window.addEventListener('pointerup', onTap, { once: true, capture: true });
    };
    const onFs = () => { if (!document.fullscreenElement) arm(); };
    arm();
    document.addEventListener('fullscreenchange', onFs);
    return () => {
      window.removeEventListener('pointerup', onTap, true);
      document.removeEventListener('fullscreenchange', onFs);
      leaveGameMode();
    };
  }, []);
  return null;
}
