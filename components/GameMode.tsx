'use client';

import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';

// Mode game: masuk halaman → layar landscape. Keluar halaman → kembali ke mode HP (portrait).
// Android hanya mengizinkan kunci landscape di dalam layar penuh (atau aplikasi terpasang), dan layar penuh
// hanya boleh dibuka lewat sentuhan pemain. Jadi: coba kunci langsung; kalau ditolak, sentuhan pertama
// di game otomatis membuka layar penuh + kunci landscape. Kalau tetap ditolak, game memutar tampilannya
// sendiri (lihat FishingGame.tsx). Keluar dari layar penuh? Sentuhan berikutnya membukanya lagi.

// Layar sentuh (HP/tablet): dipakai game untuk memutar tampilan sendiri saat HP masih tegak
export function isTouchDevice(): boolean {
  try { return window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0; } catch { return false; }
}

// HP masih tegak (portrait) → seluruh tampilan game diputar 90°, sama seperti di FishingGame.
// Dipakai juga oleh layar muat & "Ketuk untuk mulai" supaya mode game sudah terasa dari detik pertama.
export function useGameFrame(): { ready: boolean; style: CSSProperties } {
  const [vp, setVp] = useState({ w: 0, h: 0, touch: false });
  useEffect(() => {
    const upd = () => setVp({ w: window.innerWidth, h: window.innerHeight, touch: isTouchDevice() });
    upd();
    window.addEventListener('resize', upd);
    window.addEventListener('orientationchange', upd);
    return () => { window.removeEventListener('resize', upd); window.removeEventListener('orientationchange', upd); };
  }, []);
  const rot = vp.touch && vp.h > vp.w;
  const style: CSSProperties = rot
    ? { position: 'absolute', top: 0, left: vp.w, width: vp.h, height: vp.w, transform: 'rotate(90deg)', transformOrigin: 'top left' }
    : { position: 'absolute', inset: 0 };
  return { ready: vp.w > 0, style };
}

// Layar "Memuat..." yang ikut mode game (miring kalau HP masih tegak)
export function GameLoading({ text }: { text: string }) {
  const { ready, style } = useGameFrame();
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 70, overflow: 'hidden', background: '#0b1a2b' }}>
      {ready && <div style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>{text}</div>}
    </div>
  );
}

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

// satu kunci orientasi pada satu waktu: panggilan ganda (kartu menu + GameMode) saling membatalkan → layar berkedip/masuk dua kali
let lockBusy: Promise<boolean> | null = null;
function lockLandscape(): Promise<boolean> {
  if (lockBusy) return lockBusy;
  const o = getOrient();
  if (!o?.lock) return Promise.resolve(false);
  lockBusy = (async () => {
    try { await o.lock!('landscape'); return true; } catch { return false; }
  })().finally(() => { lockBusy = null; });
  return lockBusy;
}

async function enterGameMode(): Promise<boolean> {
  seq++;
  leaving = false;
  return lockLandscape();
}

// aplikasi yang memang terpasang dengan display "fullscreen" sudah tanpa bar sistem: tidak perlu minta layar penuh lagi.
// (display "standalone" masih menampilkan bar status, jadi tetap diminta layar penuh.)
function isImmersiveApp() {
  try { return window.matchMedia('(display-mode: fullscreen)').matches; } catch { return false; }
}

// Layar penuh sungguhan: bar status (jam, sinyal, baterai) dan bar navigasi bawah disembunyikan, lalu kunci landscape.
// Android hanya menerima ini dari sentuhan pemain. Chrome menampilkan pesan sistem sebentar saat masuk layar penuh.
// Hanya di layar sentuh: di komputer tidak perlu.
let fsBusy: Promise<void> | null = null;
function enterFullscreenLandscape(): Promise<void> {
  if (!isTouchDevice()) return Promise.resolve();
  if (fsBusy) return fsBusy; // permintaan layar penuh yang sedang berjalan dipakai bersama (tidak dobel)
  fsBusy = (async () => {
    if (!document.fullscreenElement && !isImmersiveApp()) {
      try { await document.documentElement.requestFullscreen({ navigationUI: 'hide' }); } catch { /* butuh sentuhan pemain */ }
    }
    await lockLandscape();
  })().finally(() => { fsBusy = null; });
  return fsBusy;
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
  useEffect(() => {
    enterGameMode();
    // Sentuhan yang membuka halaman ini biasanya masih berlaku (± 5 detik): langsung masuk layar penuh + landscape.
    // Kalau ditolak (mis. dibuka lewat refresh), tampilkan "Ketuk untuk mulai" supaya jelas apa yang harus dilakukan.
    if (!document.fullscreenElement) enterFullscreenLandscape(); // ditolak? tidak ada pesan: sentuhan pertama berikutnya yang membukanya
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
