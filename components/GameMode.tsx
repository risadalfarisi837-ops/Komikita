'use client';

import { useEffect, useState } from 'react';

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

// dipanggil dari sentuhan pemain di menu (mis. kartu "Mancing"): layar penuh + landscape sudah aktif saat game terbuka
export function primeGameFullscreen() {
  try { void enterFullscreenLandscape(); } catch { /* abaikan */ }
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
  const [needTap, setNeedTap] = useState(false);
  useEffect(() => {
    enterGameMode();
    // Sentuhan yang membuka halaman ini biasanya masih berlaku (± 5 detik): langsung masuk layar penuh + landscape.
    // Kalau ditolak (mis. dibuka lewat refresh), tampilkan "Ketuk untuk mulai" supaya jelas apa yang harus dilakukan.
    const canFs = typeof document.documentElement.requestFullscreen === 'function';
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    if (!document.fullscreenElement) {
      enterFullscreenLandscape().then(() => { if (!document.fullscreenElement && canFs && coarse) setNeedTap(true); });
    }
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
      else setNeedTap(false);
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
  if (!needTap) return null;
  return (
    <div
      onPointerDown={() => setNeedTap(false)}
      style={{ position: 'fixed', inset: 0, zIndex: 75, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'rgba(5,16,30,0.82)', color: '#fff', textAlign: 'center', touchAction: 'none' }}
    >
      <div style={{ fontSize: 40 }}>🎣</div>
      <div style={{ fontSize: 22, fontWeight: 800 }}>Ketuk untuk mulai</div>
      <div style={{ fontSize: 14, fontWeight: 600, opacity: 0.7 }}>Layar akan masuk mode game (landscape)</div>
    </div>
  );
}
