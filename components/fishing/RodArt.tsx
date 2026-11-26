'use client';

// Ikon joran dari gambar pixel yang sama dengan joran di tangan karakter (lengkap dengan efeknya).
import { useEffect, useRef } from 'react';
import { ROD_PREVIEW, drawRodPreview } from './art';

export default function RodArt({ id, size, animate = false }: { id: string; size: number; animate?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    let raf = 0;
    let last = 0;
    let alive = true;
    const draw = (now = 0) => {
      if (!alive) return;
      if (!animate || now - last > 33) { // animasi ~30 fps cukup & hemat baterai
        last = now;
        ctx.clearRect(0, 0, ROD_PREVIEW, ROD_PREVIEW);
        ctx.imageSmoothingEnabled = false;
        drawRodPreview(ctx, id);
      }
      if (animate) raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { alive = false; cancelAnimationFrame(raf); };
  }, [id, animate]);
  return <canvas ref={ref} data-rod={id} width={ROD_PREVIEW} height={ROD_PREVIEW} style={{ width: size, height: size, imageRendering: 'pixelated', display: 'block' }} />;
}
