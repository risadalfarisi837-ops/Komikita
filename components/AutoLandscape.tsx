'use client';

import { useEffect } from 'react';

// Memaksa layar HP benar-benar landscape (bukan hanya isi game yang diputar).
// Android hanya mengizinkan kunci landscape setelah sentuhan pemain dan dalam layar penuh,
// jadi: ketuk layar sekali di halaman game → layar penuh + landscape. Selama belum berhasil,
// setiap ketukan dicoba lagi. Keluar dari halaman → dikembalikan seperti semula.

type Orient = ScreenOrientation & { lock?: (o: string) => Promise<void>; unlock?: () => void };

export default function AutoLandscape() {
  useEffect(() => {
    let touch = false;
    try { touch = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0; } catch { /* abaikan */ }
    if (!touch) return; // komputer: tidak perlu
    const o = (typeof screen !== 'undefined' ? screen.orientation : undefined) as Orient | undefined;
    let busy = false;
    let locked = false;

    const enter = async () => {
      if (busy || locked) return;
      busy = true;
      try { if (!document.fullscreenElement) await document.documentElement.requestFullscreen({ navigationUI: 'hide' }); } catch { /* ditolak */ }
      try { await o?.lock?.('landscape'); locked = true; } catch { /* ditolak */ }
      busy = false;
    };
    const onTap = () => { void enter(); };
    const onFs = () => { if (!document.fullscreenElement) locked = false; }; // keluar layar penuh → ketukan berikutnya masuk lagi

    const opts = { capture: true } as const;
    window.addEventListener('click', onTap, opts);
    window.addEventListener('touchend', onTap, opts);
    window.addEventListener('pointerup', onTap, opts);
    document.addEventListener('fullscreenchange', onFs);
    void enter(); // langsung dicoba: berhasil kalau sentuhan yang membuka halaman ini masih berlaku

    return () => {
      window.removeEventListener('click', onTap, opts);
      window.removeEventListener('touchend', onTap, opts);
      window.removeEventListener('pointerup', onTap, opts);
      document.removeEventListener('fullscreenchange', onFs);
      try { if (document.fullscreenElement) void document.exitFullscreen(); } catch { /* abaikan */ }
      try { o?.unlock?.(); } catch { /* abaikan */ }
    };
  }, []);
  return null;
}
