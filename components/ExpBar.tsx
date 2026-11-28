'use client';

import { useEffect, useState } from 'react';
import { TIERS, nf, tierFor } from '@/lib/levelTiers';

// Warna isi bar mengikuti tier level (sama dengan pil level)
const BAR: Record<string, string> = {
  stone: 'linear-gradient(90deg,#8d929d,#d2d6de)',
  bronze: 'linear-gradient(90deg,#a85a2e,#f0b48a)',
  silver: 'linear-gradient(90deg,#7c8aa0,#f4f6fa)',
  gold: 'linear-gradient(90deg,#9a7416,#f6d869)',
  emerald: 'linear-gradient(90deg,#1c6b3d,#62d49c)',
  diamond: 'linear-gradient(90deg,#1b5f93,#9fdcff)',
  master: 'linear-gradient(90deg,#566411,#e4f08a)',
  mythic: 'linear-gradient(90deg,#5b2aa3,#d6c6ff)',
  ascendant: 'linear-gradient(90deg,#9b1c33,#ffb3bd)',
  celestial: 'linear-gradient(90deg,#2e5aa8,#e8c46a 55%,#fff0b8)',
  eternal: 'linear-gradient(90deg,#b8902a,#fff4d0)',
  divine: 'linear-gradient(90deg,#1aa6b3,#e6ffff)',
  transcendent: 'linear-gradient(90deg,#b3239a,#7b2bd1 60%,#f0a8ff)',
  cosmic: 'linear-gradient(90deg,#3a2a9a,#6a5cff 55%,#e0daff)',
  infinity: 'linear-gradient(90deg,#8a6a1c,#f2dc9a 60%,#ffffff)',
};

/**
 * Bar EXP: isi naik dari 0 saat tampil, warna ikut tier.
 * Efek makin banyak sesuai tier: kilau menyapu (mulai Gold), cahaya (mulai Diamond), kerlip bintang (mulai Eternal).
 */
export default function ExpBar({ level, exp, max }: { level: number; exp: number; max: number }) {
  const t = tierFor(level);
  const idx = TIERS.indexOf(t);
  const pct = Math.max(0, Math.min(100, max > 0 ? (exp / max) * 100 : 0));
  const [go, setGo] = useState(false);
  useEffect(() => { const r = requestAnimationFrame(() => setGo(true)); return () => cancelAnimationFrame(r); }, []);
  const w = go ? pct : 0;
  const sweep = idx >= 3;
  const glow = idx >= 5;
  const twinkle = idx >= 10;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: 0.5, color: '#8F8D9B' }}>EXP</span>
      <div style={{ position: 'relative', flex: 1, height: 10, borderRadius: 99, background: '#3A3942' }}>
        <div className={sweep ? 'tier-shine' : undefined} style={{ width: `${w}%`, minWidth: pct > 0 ? 8 : 0, height: '100%', borderRadius: 99, background: BAR[t.key] || BAR.stone, boxShadow: glow ? `0 0 ${idx >= 10 ? 14 : 9}px ${t.ring}aa` : 'none', transition: 'width 1s cubic-bezier(.2,.9,.25,1) .2s' }} />
        {twinkle && pct > 0 && (<>
          <i className="tier-spark" style={{ left: `max(2px, calc(${w}% - 12px))`, top: -4, width: 10, height: 10, transition: 'left 1s cubic-bezier(.2,.9,.25,1) .2s' }} />
          <i className="tier-spark" style={{ left: `${w * 0.45}%`, top: 2, width: 6, height: 6, ['--d' as string]: '.9s', transition: 'left 1s cubic-bezier(.2,.9,.25,1) .2s' }} />
        </>)}
      </div>
      <span style={{ fontSize: 14, fontWeight: 800, color: '#fff', letterSpacing: -0.2, whiteSpace: 'nowrap' }}>{nf(exp)} / {nf(max)}</span>
    </div>
  );
}
