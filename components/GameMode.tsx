'use client';

import { useEffect, useState } from 'react';

// Mode game: masuk halaman → layar otomatis landscape (+ layar penuh kalau perlu).
// Keluar halaman → layar dikembalikan ke mode HP (portrait), lalu rotasi bebas lagi.

type Orient = ScreenOrientation & { lock?: (o: string) => Promise<void>; unlock?: () => void };

const getOrient = () => (typeof screen !== 'undefined' ? (screen.orientation as Orient | undefined) : undefined);

// penanda urutan supaya "keluar" yang telat tidak membatalkan "masuk" berikutnya
let seq = 0;

async function enterGameMode(): Promise<boolean> {
  seq++;
  const o = getOrient();
  if (!o?.lock) return false;
  // aplikasi terpasang (APK/PWA) biasanya boleh kunci landscape tanpa layar penuh
  try { await o.lock('landscape'); return true; } catch { /* coba lewat layar penuh */ }
  // browser biasa: perlu layar penuh dulu (butuh sentuhan pengguna)
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    await o.lock('landscape');
    return true;
  } catch {
    return false;
  }
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
  const [portrait, setPortrait] = useState(false);
  const [touch, setTouch] = useState(false);

  useEffect(() => {
    let alive = true;
    enterGameMode().then((ok) => { if (alive) setNeedTap(!ok); });
    return () => { alive = false; leaveGameMode(); };
  }, []);

  useEffect(() => {
    const upd = () => {
      setPortrait(window.innerHeight > window.innerWidth);
      setTouch(window.matchMedia('(pointer: coarse)').matches);
    };
    upd();
    window.addEventListener('resize', upd);
    window.addEventListener('orientationchange', upd);
    return () => {
      window.removeEventListener('resize', upd);
      window.removeEventListener('orientationchange', upd);
    };
  }, []);

  // hanya muncul di HP yang masih portrait dan gagal dikunci otomatis
  if (!needTap || !portrait || !touch) return null;

  return (
    <button
      onClick={async () => { if (await enterGameMode()) setNeedTap(false); }}
      style={{
        position: 'fixed', left: '50%', bottom: 24, transform: 'translateX(-50%)', zIndex: 200,
        padding: '12px 20px', borderRadius: 999, border: '2px solid #ffd36a', background: 'rgba(24,22,22,0.94)',
        color: '#fff', fontWeight: 700, fontSize: 15, boxShadow: '0 4px 16px rgba(0,0,0,0.5)', maxWidth: '90vw',
      }}
    >
      🎮 Ketuk untuk mode game (landscape)
    </button>
  );
}
