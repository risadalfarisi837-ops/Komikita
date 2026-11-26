'use client';

import { useEffect, useRef, useState } from 'react';
import { useGameFrame } from '@/components/GameMode';

// Layar muat Wibu Fish (urutan "Lagi bangunin pulaunya..." -> "Masuk ke pulau...").
// Ukuran dirancang di kanvas 800x360 seperti lobi, lalu diskalakan pas ke layar (diputar kalau HP masih tegak).
// Ukuran & warna diukur dari rekaman layar referensi.
const W = 800;
const H = 360;
const FONT = '"Nunito", system-ui, sans-serif';

export const LOAD_TIP = 'Lengkapi satu daerah di Buku Koleksi buat hadiah besar.';

export default function FishLoading({ pct, label, tips, sub = 'Pulau Pemula' }: { pct: number; label: string; tips: boolean; sub?: string }) {
  const { ready, style } = useGameFrame();
  const frameRef = useRef<HTMLDivElement>(null);
  const [u, setU] = useState(1);

  useEffect(() => {
    if (document.getElementById('komikita-fish-fonts-lobby')) return;
    const l = document.createElement('link');
    l.id = 'komikita-fish-fonts-lobby';
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito:wght@600;700;800;900&display=swap';
    document.head.appendChild(l);
  }, []);

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const upd = () => setU(Math.max(0.2, Math.min(el.clientWidth / W, el.clientHeight / H)));
    upd();
    const ro = new ResizeObserver(upd);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ready]);

  const p = Math.max(0, Math.min(100, pct));

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 90, overflow: 'hidden', background: '#094b99', userSelect: 'none', fontFamily: FONT }}>
      {ready && (
        <div ref={frameRef} style={{ ...style, overflow: 'hidden', background: 'radial-gradient(ellipse 85% 85% at 50% 108%, #3590db 0%, #1b68b4 48%, #094b99 100%)' }}>
          <div style={{ position: 'absolute', left: '50%', top: '50%', width: W, height: H, transform: `translate(-50%,-50%) scale(${u})`, transformOrigin: 'center center' }}>
            <div style={{
              position: 'absolute', left: (W - 376) / 2, top: 86, width: 376, height: 187, boxSizing: 'border-box',
              borderRadius: 18, border: '3px solid #0a2468', background: 'linear-gradient(180deg,#fefaf2 0%,#fdf3e1 55%,#f9edd5 100%)',
              boxShadow: 'inset 0 0 0 2px #ebc16c, inset 0 -3px 0 2px #e2c57a, 0 10px 24px rgba(0,16,60,0.5)',
              padding: '13px 21px 0', textAlign: 'center',
            }}>
              <div style={{ fontSize: 31, fontWeight: 900, lineHeight: '34px', letterSpacing: -0.3 }}>
                <span style={{ color: '#0f4a96' }}>Wibu</span> <span style={{ color: '#ee8466' }}>Fish</span>
              </div>
              <div style={{ marginTop: 6, fontSize: 14, fontWeight: 800, lineHeight: '18px', color: '#5c4636' }}>{sub}</div>
              <div style={{ marginTop: 9, height: 12, borderRadius: 6, background: '#ead7ae', overflow: 'hidden' }}>
                <div style={{ width: p + '%', height: '100%', borderRadius: 6, background: 'linear-gradient(90deg,#5ba262 0%,#73bb70 50%,#8dd47e 100%)', transition: 'width .3s ease-out' }} />
              </div>
              <div style={{ marginTop: 8, fontSize: 11, fontWeight: 800, lineHeight: '16px', color: '#594a39' }}>{label}</div>
              {tips && (
                <div style={{ marginTop: 15, fontSize: 10, fontWeight: 600, lineHeight: '16px', color: '#5e4936' }}>
                  <b style={{ fontWeight: 800 }}>Tips:</b> {LOAD_TIP}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
