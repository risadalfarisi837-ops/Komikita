'use client';

import { useEffect, useState } from 'react';

// Mode game: masuk halaman → layar otomatis landscape.
// Keluar halaman → layar dikembalikan ke mode HP (portrait), lalu rotasi bebas lagi.
// Sengaja TANPA layar penuh, supaya pesan sistem Android "Tarik dari atas..." tidak muncul.
// Catatan: kunci landscape hanya diizinkan Android di aplikasi terpasang (APK / PWA).
// Di tab Chrome biasa kuncinya ditolak, jadi cuma muncul petunjuk untuk memutar HP sendiri.

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
  const [hint, setHint] = useState(false);

  useEffect(() => {
    let alive = true;
    let t: ReturnType<typeof setTimeout> | undefined;
    enterGameMode().then((ok) => {
      if (!alive || ok) return;
      const portrait = window.innerHeight > window.innerWidth;
      const touch = window.matchMedia('(pointer: coarse)').matches;
      if (portrait && touch) {
        setHint(true);
        t = setTimeout(() => setHint(false), 6000);
      }
    });
    return () => { alive = false; if (t) clearTimeout(t); leaveGameMode(); };
  }, []);

  if (!hint) return null;

  return (
    <div
      style={{
        position: 'fixed', left: '50%', top: 16, transform: 'translateX(-50%)', zIndex: 200, pointerEvents: 'none',
        padding: '10px 18px', borderRadius: 999, background: 'rgba(15,23,42,0.94)', border: '2px solid #ffd36a',
        color: '#fff', fontWeight: 700, fontSize: 14, maxWidth: '90vw', textAlign: 'center',
      }}
    >
      🎮 Putar HP ke landscape untuk main
    </div>
  );
}
