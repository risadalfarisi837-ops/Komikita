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

// true saat pemain sudah menekan "Ya, keluar": jangan buka layar penuh lagi di sentuhan itu
let leaving = false;
export function markLeavingGame() { leaving = true; }
export function cancelLeavingGame() { leaving = false; }

// Tombol back HP di layar penuh: pertama-tama browser hanya MENUTUP layar penuh (back tidak sampai ke halaman).
// Supaya tidak perlu tekan dua kali, keluar dari layar penuh dianggap sama dengan menekan back:
// game mendengarkan event ini dan langsung menampilkan "Yakin keluar?".
export const GAME_BACK_EVENT = 'game-back-request';

async function lockLandscape(): Promise<boolean> {
  const o = getOrient();
  if (!o?.lock) return false;
  try { await o.lock('landscape'); return true; } catch { return false; }
}

async function enterGameMode(): Promise<boolean> {
  seq++;
  leaving = false;
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
      if (leaving) return;
      if (!document.fullscreenElement) enterFullscreenLandscape();
    };
    const arm = () => {
      if (armed) return;
      armed = true;
      window.addEventListener('pointerup', onTap, { once: true, capture: true });
    };
    let wasFs = !!document.fullscreenElement;
    let visChangedAt = 0;
    const onVis = () => { visChangedAt = Date.now(); };
    const onFs = () => {
      const isFs = !!document.fullscreenElement;
      if (!isFs) arm();
      // keluar layar penuh karena tombol back (bukan karena pindah aplikasi) → minta konfirmasi keluar
      if (wasFs && !isFs && !leaving && document.visibilityState === 'visible' && Date.now() - visChangedAt > 1500) {
        window.dispatchEvent(new Event(GAME_BACK_EVENT));
      }
      wasFs = isFs;
    };
    arm();
    document.addEventListener('fullscreenchange', onFs);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('pointerup', onTap, true);
      document.removeEventListener('fullscreenchange', onFs);
      document.removeEventListener('visibilitychange', onVis);
      leaveGameMode();
    };
  }, []);
  return null;
}
