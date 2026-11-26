'use client';

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Montserrat } from 'next/font/google';
import { ArrowLeft, Sparkles, Target } from 'lucide-react';
import { getFirebase } from '@/lib/firebase-client';
import { primeGameFullscreen } from '@/components/GameMode';

// Font mirip desain acuan (geometris, tebal)
const mont = Montserrat({ subsets: ['latin'], weight: ['500', '600', '700', '800'], display: 'swap' });

// 1u = 1% lebar layar (maks. selebar kolom 448px) → seluruh tata letak ikut mengecil/membesar
const U = (n: number) => `calc(var(--u) * ${n})`;
const SQ = Math.SQRT1_2; // diagonal → sisi persegi yang diputar 45°

// ---------- latar: bintang & garis melayang (deterministik, server = klien) ----------
const rng = (seed: number) => { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; };
const STAR_COLORS = ['#5aa9e6', '#e0b84c', '#8fb7d9', '#6c7a99'];
const STARS = (() => {
  const r = rng(20260);
  return Array.from({ length: 60 }, (_, i) => {
    const k = r() < 0.2 ? 'plus' : r() < 0.22 ? 'ring' : 'dot';
    return { g: i % 3, x: r() * 100, y: r() * 100, k, z: k === 'plus' ? 2.5 + r() * 2.5 : k === 'ring' ? 1.6 + r() * 1.2 : 0.8 + r() * 1.4, c: STAR_COLORS[Math.floor(r() * 4)] };
  });
})();
const DASHES = (() => {
  const r = rng(777);
  return Array.from({ length: 14 }, (_, i) => ({ g: i % 2, x: r() * 100, y: r() * 100, len: 4 + r() * 7, rot: (r() < 0.5 ? 40 : 130) + r() * 30, c: STAR_COLORS[Math.floor(r() * 4)], o: 0.25 + r() * 0.4 }));
})();

// Bintang dikelompokkan jadi 3 lapisan (bukan 64 elemen beranimasi) → jauh lebih ringan
const StarLayer = memo(function StarLayer({ g }: { g: number }) {
  return (
    <div className={'k-sl k-sl' + g}>
      {STARS.filter((s) => s.g === g).map((s, i) => (
        <span key={i} style={{ position: 'absolute', left: s.x + '%', top: s.y + '%', width: U(s.z), height: U(s.z), color: s.c }}>
          {s.k === 'plus' ? (<><i style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 1, background: 'currentColor' }} /><i style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, background: 'currentColor' }} /></>)
            : <i style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: s.k === 'dot' ? 'currentColor' : 'transparent', border: s.k === 'ring' ? '1.5px solid currentColor' : 'none', opacity: 0.8 }} />}
        </span>
      ))}
    </div>
  );
});
const DashLayer = memo(function DashLayer({ g }: { g: number }) {
  return (
    <div className={'k-dl k-dr' + (g + 1)}>
      {DASHES.filter((d) => d.g === g).map((d, i) => (
        <i key={i} style={{ position: 'absolute', left: d.x + '%', top: d.y + '%', width: U(d.len), height: 1, background: `linear-gradient(90deg, transparent, ${d.c})`, opacity: d.o, transform: `rotate(${d.rot}deg)`, transformOrigin: '0 50%' }} />
      ))}
    </div>
  );
});

// ---------- ilustrasi beranimasi ----------
// Tiap bagian yang bergerak = 1 lapisan HTML sendiri (transform/opacity saja) → jalan di GPU, tidak repaint SVG tiap frame.
const Layer = ({ cls, children, style }: { cls?: string; children: ReactNode; style?: CSSProperties }) => (
  <div className={'k-l' + (cls ? ' ' + cls : '')} style={style}>{children}</div>
);
const Sparkle = ({ x, y, size, d, vb }: { x: number; y: number; size: number; d: number; vb: number }) => (
  <div className="k-tw" style={{ position: 'absolute', left: ((x - size) / vb) * 100 + '%', top: ((y - size) / vb) * 100 + '%', width: ((size * 2) / vb) * 100 + '%', height: ((size * 2) / vb) * 100 + '%', animationDelay: d + 's' }}>
    <svg viewBox={`${-size} ${-size} ${size * 2} ${size * 2}`}>
      <path d={`M0 ${-size}C1 ${-size / 4} ${size / 4} -1 ${size} 0 ${size / 4} 1 1 ${size / 4} 0 ${size} -1 ${size / 4} ${-size / 4} 1 ${-size} 0 ${-size / 4} -1 -1 ${-size / 4}Z`} fill="#fff" stroke="#79b7ff" strokeWidth="1" />
    </svg>
  </div>
);

const GachaArt = memo(function GachaArt() {
  const small: [number, number, number, number][] = [[24, 40, 9, 0], [98, 38, 8, 0.7], [30, 92, 9, 1.4], [92, 96, 11, 0.35], [14, 14, 6, 1.1]];
  return (
    <div className="k-art">
      <Layer cls="k-glow"><svg viewBox="0 0 120 120"><defs><radialGradient id="kg-glow"><stop offset="0" stopColor="#bfe3ff" stopOpacity="0.95" /><stop offset="1" stopColor="#5aaeff" stopOpacity="0" /></radialGradient></defs><circle cx="60" cy="60" r="46" fill="url(#kg-glow)" /></svg></Layer>
      <Layer cls="k-spin"><svg viewBox="0 0 120 120"><path d="M60 14C62 42 78 58 106 60 78 62 62 78 60 106 58 78 42 62 14 60 42 58 58 42 60 14Z" fill="none" stroke="#8fd0ff" strokeWidth="1.2" opacity="0.7" /></svg></Layer>
      <Layer cls="k-pulse"><svg viewBox="0 0 120 120"><defs><linearGradient id="kg-star" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#7fc0ff" /></linearGradient></defs><path d="M60 8C63 40 80 57 112 60 80 63 63 80 60 112 57 80 40 63 8 60 40 57 57 40 60 8Z" fill="url(#kg-star)" stroke="#5aaeff" strokeWidth="2" strokeLinejoin="round" /><path d="M60 34C61.5 48 72 58.5 86 60 72 61.5 61.5 72 60 86 58.5 72 48 61.5 34 60 48 58.5 58.5 48 60 34Z" fill="#2f86ff" opacity="0.9" /></svg></Layer>
      {small.map(([x, y, s, d], i) => <Sparkle key={i} x={x} y={y} size={s} d={d} vb={120} />)}
    </div>
  );
});

const Heart = ({ x, y, w, c, d, hx }: { x: number; y: number; w: number; c: string; d: number; hx: number }) => (
  <div className="k-heart" style={{ position: 'absolute', left: x - w / 2 + '%', top: y - w / 2 + '%', width: w + '%', aspectRatio: '1', animationDelay: d + 's', ['--hx' as string]: U(hx) } as CSSProperties}>
    <svg viewBox="-13 -11 26 22"><path d="M0 -3C-6 -10 -13 0 0 9 13 0 6 -10 0 -3Z" fill={c} /></svg>
  </div>
);

const PetArt = memo(function PetArt() {
  return (
    <div className="k-art">
      <Layer cls="k-shadow"><svg viewBox="0 0 100 100"><ellipse cx="50" cy="90" rx="26" ry="4.5" fill="#000" opacity="0.28" /></svg></Layer>
      <Layer cls="k-bob">
        <svg viewBox="0 0 100 100">
          <ellipse cx="50" cy="62" rx="36" ry="27" fill="#ffe14d" stroke="#e8b800" strokeWidth="1.5" />
          <path d="M28 70c6 8 16 11 22 11s16-3 22-11" stroke="#f0c000" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.6" />
          <path d="M18 56c-8 2-10 10-5 14 4 3 9 0 10-6z" fill="#ffd61f" stroke="#e8b800" strokeWidth="1.2" />
          <path d="M82 56c8 2 10 10 5 14-4 3-9 0-10-6z" fill="#ffd61f" stroke="#e8b800" strokeWidth="1.2" />
          <circle cx="30" cy="62" r="6" fill="#ff9a8a" opacity="0.8" /><circle cx="70" cy="62" r="6" fill="#ff9a8a" opacity="0.8" />
          <path d="M45 62l5 4 5-4z" fill="#ff9d2e" stroke="#d97a10" strokeWidth="1" strokeLinejoin="round" />
          <path d="M18 42C20 18 36 10 52 11c16 1 29 12 30 31z" fill="#3a56c8" stroke="#243a96" strokeWidth="1.8" />
          <path d="M14 43c14-5 38-5 70 0 3 1 3 4 0 5-30 4-56 4-70 0-3-1-3-4 0-5z" fill="#2c44a8" stroke="#243a96" strokeWidth="1.6" />
          <path d="M30 24c4-5 10-8 16-8" stroke="#7d95f0" strokeWidth="2.2" strokeLinecap="round" fill="none" opacity="0.8" />
          <path d="M40 88v5M60 88v5" stroke="#ff9d2e" strokeWidth="3" strokeLinecap="round" />
        </svg>
        <Layer cls="k-blink"><svg viewBox="0 0 100 100"><path d="M34 54h14M52 54h14" stroke="#4a3b12" strokeWidth="2.6" strokeLinecap="round" /><path d="M36 57.5h10M54 57.5h10" stroke="#4a3b12" strokeWidth="2" strokeLinecap="round" opacity="0.7" /></svg></Layer>
      </Layer>
      <Heart x={80} y={34} w={15} c="#ff4f7b" d={0} hx={1.5} />
      <Heart x={90} y={50} w={11} c="#ff8fb1" d={0.8} hx={2} />
      <Heart x={70} y={26} w={10} c="#ff3d6e" d={1.6} hx={-1} />
      <Heart x={22} y={44} w={11} c="#ff7aa2" d={2.2} hx={-1.5} />
    </div>
  );
});

const FishArt = memo(function FishArt() {
  const bub: [number, number, number][] = [[20, 78, 0], [34, 84, 1.1], [14, 62, 2]];
  return (
    <div className="k-art">
      <Layer cls="k-line"><svg viewBox="0 0 120 90"><path d="M104 -6V40" stroke="#dff7ee" strokeWidth="1.4" /><path d="M104 40v10a5 5 0 01-10 0" stroke="#dff7ee" strokeWidth="2" fill="none" strokeLinecap="round" /></svg></Layer>
      <Layer cls="k-swim">
        <Layer cls="k-tail"><svg viewBox="0 0 120 90"><path d="M30 46C16 30 8 34 6 28c-1 8 1 14 4 18-3 4-5 10-4 18 2-6 10-2 24-18z" fill="#ff8a3d" stroke="#e0631a" strokeWidth="1.2" strokeLinejoin="round" /></svg></Layer>
        <svg viewBox="0 0 120 90" style={{ position: 'absolute', inset: 0 }}>
          <path d="M28 46c6-18 24-26 42-22 16 3 26 14 26 22s-10 20-26 22c-18 3-36-4-42-22z" fill="#fff6ea" stroke="#f0d3b4" strokeWidth="1.4" />
          <path d="M34 36c10-10 28-14 42-6-6 2-10 6-12 10-8-4-18-5-30-4z" fill="#ff8a3d" opacity="0.95" />
          <path d="M70 26c12-1 24 6 26 20-4-3-8-5-12-6 0-6-6-11-14-14z" fill="#ff8a3d" />
          <path d="M52 62c6 6 16 8 24 4-6-1-10-3-14-8z" fill="#ffb27a" />
          <circle cx="84" cy="42" r="6" fill="#fff" stroke="#c9a47a" strokeWidth="1" /><circle cx="85.5" cy="42" r="3.2" fill="#2b2b2b" /><circle cx="86.5" cy="40.8" r="1" fill="#fff" />
          <path d="M95 50c-3 2-6 2-8 1" stroke="#e0631a" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        </svg>
      </Layer>
      {bub.map(([x, y, d], i) => (
        <div key={i} className="k-bubble" style={{ position: 'absolute', left: ((x - 3) / 120) * 100 + '%', top: (0.125 + (y - 3) / 120) * 100 + '%', width: '5%', aspectRatio: '1', animationDelay: d + 's' }}>
          <svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="3.6" fill="none" stroke="#c8fff0" strokeWidth="1.3" /></svg>
        </div>
      ))}
    </div>
  );
});

const GemIcon = memo(function GemIcon() {
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%"><path d="M6 4h12l4 6-10 11L2 10z" fill="#39b6ff" stroke="#1b6fc4" strokeWidth="1.4" strokeLinejoin="round" /><path d="M2 10h20M9 4l-2 6 5 11M15 4l2 6-5 11" stroke="#d6f0ff" strokeWidth="0.9" fill="none" opacity="0.75" /></svg>
  );
});

const ART_GACHA = <GachaArt />;
const ART_PET = <PetArt />;
const ART_FISH = <FishArt />;
const ART_GEM = <GemIcon />;
const ART_MISI = <Target style={{ width: '100%', height: '100%' }} strokeWidth={2.4} />;

// ---------- ubin berlian ----------
type D = {
  cx: number; cy: number; d: number; // pusat & diagonal (satuan u)
  from: string; to: string; edge: string; ghost?: string;
  title: string; sub?: string; art?: ReactNode; artSize?: number; artDy?: number;
  dark?: boolean; tsize?: number; onClick?: () => void; float?: number; gx?: number; gy?: number;
  enter?: 'l' | 'r' | 'p' | 'f'; delay?: number; // animasi muncul: l = dari kiri, r = dari kanan, p = fade+zoom, f = pop
  glow?: boolean; // cahaya radial di tengah (ubin Gacha)
};
const Diamond = memo(function Diamond(p: D) {
  const L = p.d * SQ;
  const ink = p.dark ? '#3a2400' : '#fff';
  const delay = p.delay || 0;
  const sq = (extra: CSSProperties): CSSProperties => ({ position: 'absolute', left: '50%', top: '50%', width: U(L), height: U(L), borderRadius: U(L * 0.2), transform: 'translate(-50%,-50%) rotate(45deg)', ...extra });
  return (
    <div className={p.enter ? 'k-in-' + p.enter : undefined} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', animationDelay: delay + 's' }}>
      <div className="k-float" style={{ position: 'absolute', left: U(p.cx - p.d / 2), top: U(p.cy - p.d / 2), width: U(p.d), height: U(p.d), pointerEvents: 'none', animationDuration: 5 + (p.float || 0) * 0.7 + 's', animationDelay: -(p.float || 0) + 's' }}>
        <div className="k-press" style={{ position: 'absolute', inset: 0 }}>
          {p.ghost && <div style={sq({ background: p.ghost, opacity: 0.6, transform: `translate(-50%,-50%) translate(${U(p.d * (p.gx ?? 0.1))},${U(p.d * (p.gy ?? -0.1))}) rotate(45deg) scale(0.93)` })} />}
          <button type="button" aria-label={p.title} onClick={p.onClick} className="k-tile"
            style={sq({ pointerEvents: 'auto', cursor: p.onClick ? 'pointer' : 'default', padding: 0, border: `${U(0.55)} solid ${p.edge}`, background: `linear-gradient(135deg,${p.from},${p.to})`, boxShadow: `0 ${U(1)} ${U(3)} rgba(0,0,0,0.45), inset 0 0 ${U(5)} rgba(255,255,255,0.12)`, overflow: 'hidden' })}>
            {/* kilau statis (mirip acuan) — tidak dianimasikan supaya tidak repaint */}
            <span style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(255,255,255,.30) 0%, rgba(255,255,255,.07) 34%, rgba(255,255,255,0) 55%)' }} />
            {p.glow && <span style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 42%, rgba(190,225,255,.5) 0%, rgba(120,190,255,.16) 38%, rgba(120,190,255,0) 62%)' }} />}
          </button>
          <div style={{ position: 'absolute', left: '50%', top: '50%', width: U(p.d * (p.sub && p.sub.length > 12 ? 0.62 : 0.8)), height: U(p.d * 0.8), transform: 'translate(-50%,-50%)', pointerEvents: 'none' }}>
            <div className="k-ct" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: ink, textShadow: p.dark ? 'none' : '0 1px 3px rgba(0,0,0,0.35)', animationDelay: delay + 0.28 + 's' }}>
              {p.art && <div style={{ width: U(p.artSize || p.d * 0.34), height: U(p.artSize || p.d * 0.34), marginTop: U(p.artDy || 0), flex: '0 0 auto' }}>{p.art}</div>}
              <div style={{ fontWeight: 800, fontSize: U(p.tsize || 5), lineHeight: 1.05, marginTop: U(p.art ? 1.2 : 0) }}>{p.title}</div>
              {p.sub && <div style={{ fontWeight: 500, fontSize: U(2.8), lineHeight: 1.15, marginTop: U(0.8), opacity: 0.95, maxWidth: '100%' }}>{p.sub}</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

// Semua animasi hanya memakai transform & opacity (di-composite GPU) → tidak ngelag.
const CSS = `
@keyframes kfloat{0%,100%{transform:translate3d(0,0,0)}50%{transform:translate3d(0,-1.6%,0)}}
@keyframes ktwk{0%,100%{opacity:.3}50%{opacity:1}}
@keyframes kspin{to{transform:rotate(360deg)}}
@keyframes kpulse{0%,100%{transform:scale(1)}50%{transform:scale(1.09)}}
@keyframes kglow{0%,100%{opacity:.55;transform:scale(.92)}50%{opacity:1;transform:scale(1.1)}}
@keyframes ktw2{0%,100%{opacity:.15;transform:scale(.5) rotate(0)}50%{opacity:1;transform:scale(1.15) rotate(25deg)}}
@keyframes kbob{0%,100%{transform:translate3d(0,0,0) scale(1,1)}50%{transform:translate3d(0,-4%,0) scale(1.02,.97)}}
@keyframes kshadow{0%,100%{transform:scaleX(1);opacity:1}50%{transform:scaleX(.88);opacity:.75}}
@keyframes kheart{0%{transform:translate3d(0,calc(var(--u)*2),0) scale(.4);opacity:0}20%{opacity:1}100%{transform:translate3d(var(--hx),calc(var(--u)*-7),0) scale(1.1);opacity:0}}
@keyframes kblink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}
@keyframes kswim{0%,100%{transform:translate3d(-3%,1%,0) rotate(-2deg)}50%{transform:translate3d(4%,-3%,0) rotate(2deg)}}
@keyframes ktail{0%,100%{transform:rotate(-12deg)}50%{transform:rotate(14deg)}}
@keyframes kline{0%,100%{transform:rotate(-3deg)}50%{transform:rotate(3deg)}}
@keyframes kbubble{0%{transform:translate3d(0,0,0);opacity:0}20%{opacity:.9}100%{transform:translate3d(0,calc(var(--u)*-7),0);opacity:0}}
@keyframes kinl{from{transform:translate3d(-75%,0,0) scale(.9);opacity:0}55%{opacity:1}to{transform:none;opacity:1}}
@keyframes kinr{from{transform:translate3d(75%,0,0) scale(.9);opacity:0}55%{opacity:1}to{transform:none;opacity:1}}
@keyframes kinp{from{transform:scale(.6);opacity:0}to{transform:none;opacity:1}}
@keyframes kinf{from{transform:translate3d(0,25%,0) scale(.4);opacity:0}to{transform:none;opacity:1}}
@keyframes kinh{from{transform:translate3d(0,-30%,0);opacity:0}to{transform:none;opacity:1}}
@keyframes kfade{from{opacity:0}to{opacity:1}}
@keyframes kct{from{transform:translate3d(0,8%,0) scale(.82);opacity:0}to{transform:none;opacity:1}}
@keyframes kdr1{from{transform:translate3d(0,0,0)}to{transform:translate3d(calc(var(--u)*-7),calc(var(--u)*9),0)}}
@keyframes kdr2{from{transform:translate3d(0,0,0)}to{transform:translate3d(calc(var(--u)*6),calc(var(--u)*-8),0)}}
.k-art{position:relative;width:100%;height:100%}
.k-l{position:absolute;inset:0;will-change:transform,opacity}
.k-l svg,.k-tw svg,.k-heart svg,.k-bubble svg{display:block;width:100%;height:100%;overflow:visible}
.k-spin{animation:kspin 14s linear infinite}
.k-pulse{animation:kpulse 2.6s ease-in-out infinite}
.k-glow{animation:kglow 2.6s ease-in-out infinite}
.k-tw{animation:ktw2 2.2s ease-in-out infinite;will-change:transform,opacity}
.k-bob{animation:kbob 1.6s ease-in-out infinite;transform-origin:50% 100%}
.k-shadow{animation:kshadow 1.6s ease-in-out infinite}
.k-blink{animation:kblink 4s infinite;transform-origin:50% 57%}
.k-heart{animation:kheart 2.8s ease-out infinite;will-change:transform,opacity}
.k-swim{animation:kswim 3.2s ease-in-out infinite}
.k-tail{animation:ktail .9s ease-in-out infinite;transform-origin:25% 51%}
.k-line{animation:kline 3s ease-in-out infinite;transform-origin:87% 8%}
.k-bubble{animation:kbubble 3s ease-in infinite;will-change:transform,opacity}
.k-float{animation:kfloat 5s ease-in-out infinite;will-change:transform}
.k-sl{position:absolute;inset:0;animation:ktwk 3.4s ease-in-out infinite;will-change:opacity}
.k-sl1{animation-delay:-1.1s}.k-sl2{animation-delay:-2.2s}
.k-dl{position:absolute;inset:0;will-change:transform}
.k-dr1{animation:kdr1 24s ease-in-out infinite alternate}
.k-dr2{animation:kdr2 31s ease-in-out infinite alternate}
.k-in-l,.k-in-r,.k-in-p,.k-in-f{animation-duration:.75s;animation-timing-function:cubic-bezier(.2,.9,.25,1.08);animation-fill-mode:both}
.k-in-l{animation-name:kinl}.k-in-r{animation-name:kinr}.k-in-p{animation-name:kinp}.k-in-f{animation-name:kinf;animation-timing-function:cubic-bezier(.3,1.5,.5,1)}
.k-ct{animation:kct .55s cubic-bezier(.3,1.35,.5,1) both}
.k-head{animation:kinh .45s ease-out both}
.k-bg{animation:kfade .8s ease-out both}
.k-press{transition:transform .18s cubic-bezier(.3,1.5,.5,1)}
.k-press:has(.k-tile:active){transform:scale(.94)}
.k-tile{-webkit-tap-highlight-color:transparent;touch-action:manipulation}
.k-paused *{animation-play-state:paused!important}
@media (prefers-reduced-motion:reduce){.k-root *{animation:none!important}}
`;

export default function KomikStorePage() {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [name, setName] = useState<string>('');
  const [photo, setPhoto] = useState<string>('');
  const [koin, setKoin] = useState<number | null>(null);

  useEffect(() => {
    let stop = false;
    let off: (() => void) | undefined;
    getFirebase().then(({ auth, db }: any) => {
      if (stop) return;
      off = auth.onAuthStateChanged(async (u: any) => {
        if (stop) return;
        setName(u?.displayName || '');
        setPhoto(u?.photoURL || '');
        if (!u) { setKoin(null); return; }
        try {
          const v = (await db.ref('users/' + u.uid).get()).val();
          if (stop || !v) return;
          if (typeof v.displayName === 'string' && v.displayName) setName(v.displayName);
          if (typeof v.photoURL === 'string' && v.photoURL) setPhoto(v.photoURL);
          setKoin(typeof v.koin === 'number' ? v.koin : 0);
        } catch {}
      });
    }).catch(() => {});
    return () => { stop = true; if (off) off(); };
  }, []);

  // Hentikan semua animasi saat tab/app tidak terlihat (hemat baterai & CPU)
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const f = () => el.classList.toggle('k-paused', document.hidden);
    document.addEventListener('visibilitychange', f);
    return () => document.removeEventListener('visibilitychange', f);
  }, []);

  // handler stabil supaya <Diamond> (memo) tidak render ulang tiap data masuk
  const nav = useMemo(() => ({
    profile: () => router.push('/profile'),
    misi: () => router.push('/misi'),
    gacha: () => router.push('/komikstore/gacha-wallpaper'),
    pet: () => router.push('/komikstore/pet'),
    mancing: () => { primeGameFullscreen(); router.push('/komikstore/mancing'); }, // masuk mode game langsung dari sentuhan ini
  }), [router]);

  const avatar = useMemo(() => (
    photo ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={photo} alt="" decoding="async" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.15)' }} />
    ) : <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Sparkles style={{ width: '50%', height: '50%', opacity: 0.6 }} /></div>
  ), [photo]);

  const first = (name || 'Tamu').split(' ')[0];

  return (
    <div ref={rootRef} className={'k-root fixed inset-0 text-white max-w-md mx-auto ' + mont.className} style={{ '--u': 'min(1vw, 4.48px)', background: 'linear-gradient(180deg, #0a0c11 0%, #05070b 60%, #030508 100%)' } as CSSProperties}>
      <style>{CSS}</style>

      {/* latar bintang + garis melayang (diam di layar, tidak ikut scroll) */}
      <div aria-hidden className="k-bg" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <StarLayer g={0} /><StarLayer g={1} /><StarLayer g={2} />
        <DashLayer g={0} /><DashLayer g={1} />
      </div>

      <div className="absolute inset-0 overflow-y-auto overflow-x-hidden" style={{ overscrollBehavior: 'contain' }}>
        {/* header */}
        <div className="relative flex items-center k-head" style={{ gap: U(5), padding: `${U(3.5)} ${U(4)} 0` }}>
          <button onClick={() => router.back()} aria-label="Kembali" className="flex items-center justify-center rounded-full border border-white/25 bg-black/40 active:scale-90 transition-transform" style={{ width: U(12.5), height: U(12.5) }}>
            <ArrowLeft style={{ width: U(6), height: U(6) }} />
          </button>
          <h1 className="font-extrabold tracking-tight relative" style={{ fontSize: U(9.6) }}>
            KomikStore<sup style={{ position: 'absolute', top: U(-1.5), right: U(-12), fontSize: U(3.4), fontWeight: 800, color: '#3fb34f', letterSpacing: 0.5 }}>BETA</sup>
          </h1>
        </div>

        {/* peta ubin (posisi & ukuran mengikuti desain acuan) */}
        <div className="relative" style={{ height: U(192), contain: 'layout style' }}>
          <Diamond cx={25.5} cy={26.1} d={37.5} from="#1a1d24" to="#101318" edge="#343a46" title={first} tsize={5.4} float={0} enter="p" delay={0} onClick={nav.profile} art={avatar} artSize={11.6} artDy={-2.5} />

          <Diamond cx={15.6} cy={64.3} d={26} from="#0fa08c" to="#087a6d" edge="#33d1b9" title="Misi" tsize={5.4} float={2} enter="l" delay={0.06} onClick={nav.misi} art={ART_MISI} artSize={7.5} artDy={-1.5} />

          <Diamond cx={72.2} cy={68.9} d={62.4} from="#3aa3ee" to="#2a58a8" edge="#8ad4ff" ghost="#0d4a78" gx={0.09} gy={-0.07} glow title="Gacha" sub="Wallpaper & Border" float={1} enter="r" delay={0.12} onClick={nav.gacha} art={ART_GACHA} artSize={21} artDy={-6} tsize={6.6} />

          <Diamond cx={27.8} cy={119.1} d={61.5} from="#ffd21f" to="#ffae3a" edge="#ffd400" ghost="#8a6a12" gx={-0.1} gy={0.12} dark title="Pet" sub="Pelihara Pet dan Hasilkan Koin" float={3} enter="l" delay={0.18} onClick={nav.pet} art={ART_PET} artSize={21} artDy={-4} tsize={7.4} />

          <Diamond cx={69.9} cy={123.1} d={53.7} from="#13b88a" to="#0a5a62" edge="#5ff0c4" ghost="#0b4b4a" gx={-0.06} gy={0.1} title="Mancing" sub="Mancing ikan, dan Hangout bareng teman" float={4} enter="r" delay={0.24} onClick={nav.mancing} art={ART_FISH} artSize={19} artDy={-4} tsize={6.6} />

          <Diamond cx={78.6} cy={170.4} d={29.8} from="#1a1d24" to="#101318" edge="#343a46" title={koin === null ? '–' : koin.toLocaleString('id-ID')} sub="Crystal" tsize={4.2} float={5} enter="f" delay={0.5} art={ART_GEM} artSize={8} artDy={-1.5} />
        </div>
      </div>
    </div>
  );
}
