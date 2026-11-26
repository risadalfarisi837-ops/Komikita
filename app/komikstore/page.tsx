'use client';

import { useEffect, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Sparkles, Target } from 'lucide-react';
import { getFirebase } from '@/lib/firebase-client';
import { primeGameFullscreen } from '@/components/GameMode';

// 1u = 1% lebar layar (maks. selebar kolom 448px) → seluruh tata letak ikut mengecil/membesar
const U = (n: number) => `calc(var(--u) * ${n})`;
const SQ = Math.SQRT1_2; // diagonal → sisi persegi yang diputar 45°

// ---------- latar bintang (deterministik supaya tidak beda antara server & klien) ----------
const STARS = (() => {
  let s = 20260;
  const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  return Array.from({ length: 64 }, () => { const k = r() < 0.2 ? 'plus' : r() < 0.22 ? 'ring' : 'dot'; return ({ x: r() * 100, y: r() * 100, k, z: k === 'plus' ? 2.5 + r() * 2.5 : k === 'ring' ? 1.6 + r() * 1.2 : 0.8 + r() * 1.4, d: r() * 4, c: ['#5aa9e6', '#e0b84c', '#8fb7d9', '#6c7a99'][Math.floor(r() * 4)] }); });
})();

// ---------- ilustrasi beranimasi ----------
function GachaArt() {
  const small: [number, number, number, number][] = [[24, 40, 9, 0], [98, 38, 8, 0.7], [30, 92, 9, 1.4], [92, 96, 11, 0.35], [14, 14, 6, 1.1]];
  return (
    <svg viewBox="0 0 120 120" width="100%" height="100%" style={{ overflow: 'visible' }}>
      <defs>
        <radialGradient id="kg-glow"><stop offset="0" stopColor="#bfe3ff" stopOpacity="0.95" /><stop offset="1" stopColor="#5aaeff" stopOpacity="0" /></radialGradient>
        <linearGradient id="kg-star" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#7fc0ff" /></linearGradient>
      </defs>
      <circle className="k-glow" cx="60" cy="60" r="46" fill="url(#kg-glow)" />
      <g className="k-spin"><path d="M60 14C62 42 78 58 106 60 78 62 62 78 60 106 58 78 42 62 14 60 42 58 58 42 60 14Z" fill="none" stroke="#8fd0ff" strokeWidth="1.2" opacity="0.7" /></g>
      <g className="k-pulse"><path d="M60 8C63 40 80 57 112 60 80 63 63 80 60 112 57 80 40 63 8 60 40 57 57 40 60 8Z" fill="url(#kg-star)" stroke="#5aaeff" strokeWidth="2" strokeLinejoin="round" /><path d="M60 34C61.5 48 72 58.5 86 60 72 61.5 61.5 72 60 86 58.5 72 48 61.5 34 60 48 58.5 58.5 48 60 34Z" fill="#2f86ff" opacity="0.9" /></g>
      {small.map(([x, y, sz, d], i) => (
        <g key={i} transform={`translate(${x} ${y})`}><g className="k-twinkle" style={{ animationDelay: d + 's' }}><path d={`M0 ${-sz}C1 ${-sz / 4} ${sz / 4} -1 ${sz} 0 ${sz / 4} 1 1 ${sz / 4} 0 ${sz} -1 ${sz / 4} ${-sz / 4} 1 ${-sz} 0 ${-sz / 4} -1 -1 ${-sz / 4}Z`} fill="#fff" stroke="#79b7ff" strokeWidth="1" /></g></g>
      ))}
    </svg>
  );
}

function PetArt() {
  const hearts: [number, number, string, number][] = [[78, 36, '#ff7a3d', 0], [88, 52, '#ffb17a', 0.9], [24, 46, '#ff9a6a', 1.7]];
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ overflow: 'visible' }}>
      <ellipse cx="50" cy="90" rx="26" ry="4.5" fill="#000" opacity="0.28" className="k-shadow" />
      <g className="k-bob">
        <ellipse cx="50" cy="62" rx="36" ry="27" fill="#ffe14d" stroke="#e8b800" strokeWidth="1.5" />
        <path d="M28 70c6 8 16 11 22 11s16-3 22-11" stroke="#f0c000" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.6" />
        <path d="M18 56c-8 2-10 10-5 14 4 3 9 0 10-6z" fill="#ffd61f" stroke="#e8b800" strokeWidth="1.2" />
        <path d="M82 56c8 2 10 10 5 14-4 3-9 0-10-6z" fill="#ffd61f" stroke="#e8b800" strokeWidth="1.2" />
        <circle cx="30" cy="62" r="6" fill="#ff9a8a" opacity="0.8" /><circle cx="70" cy="62" r="6" fill="#ff9a8a" opacity="0.8" />
        <g className="k-blink"><path d="M34 54h14M52 54h14" stroke="#4a3b12" strokeWidth="2.6" strokeLinecap="round" /><path d="M36 57.5h10M54 57.5h10" stroke="#4a3b12" strokeWidth="2" strokeLinecap="round" opacity="0.7" /></g>
        <path d="M45 62l5 4 5-4z" fill="#ff9d2e" stroke="#d97a10" strokeWidth="1" strokeLinejoin="round" />
        <path d="M18 42C20 18 36 10 52 11c16 1 29 12 30 31z" fill="#3a56c8" stroke="#243a96" strokeWidth="1.8" />
        <path d="M14 43c14-5 38-5 70 0 3 1 3 4 0 5-30 4-56 4-70 0-3-1-3-4 0-5z" fill="#2c44a8" stroke="#243a96" strokeWidth="1.6" />
        <path d="M30 24c4-5 10-8 16-8" stroke="#7d95f0" strokeWidth="2.2" strokeLinecap="round" fill="none" opacity="0.8" />
        <path d="M40 88v5M60 88v5" stroke="#ff9d2e" strokeWidth="3" strokeLinecap="round" />
      </g>
      {hearts.map(([x, y, c, d], i) => (
        <g key={i} transform={`translate(${x} ${y})`}><g className="k-heart" style={{ animationDelay: d + 's' }}><path d="M0 -3C-6 -10 -13 0 0 9 13 0 6 -10 0 -3Z" fill={c} /></g></g>
      ))}
    </svg>
  );
}

function FishArt() {
  return (
    <svg viewBox="0 0 120 90" width="100%" height="100%" style={{ overflow: 'visible' }}>
      <g className="k-line"><path d="M104 -6V40" stroke="#dff7ee" strokeWidth="1.4" /><path d="M104 40v10a5 5 0 01-10 0" stroke="#dff7ee" strokeWidth="2" fill="none" strokeLinecap="round" /></g>
      <g className="k-swim">
        <g className="k-tail"><path d="M30 46C16 30 8 34 6 28c-1 8 1 14 4 18-3 4-5 10-4 18 2-6 10-2 24-18z" fill="#ff8a3d" stroke="#e0631a" strokeWidth="1.2" strokeLinejoin="round" /></g>
        <path d="M28 46c6-18 24-26 42-22 16 3 26 14 26 22s-10 20-26 22c-18 3-36-4-42-22z" fill="#fff6ea" stroke="#f0d3b4" strokeWidth="1.4" />
        <path d="M34 36c10-10 28-14 42-6-6 2-10 6-12 10-8-4-18-5-30-4z" fill="#ff8a3d" opacity="0.95" />
        <path d="M70 26c12-1 24 6 26 20-4-3-8-5-12-6 0-6-6-11-14-14z" fill="#ff8a3d" />
        <path d="M52 62c6 6 16 8 24 4-6-1-10-3-14-8z" fill="#ffb27a" />
        <circle cx="84" cy="42" r="6" fill="#fff" stroke="#c9a47a" strokeWidth="1" /><circle cx="85.5" cy="42" r="3.2" fill="#2b2b2b" /><circle cx="86.5" cy="40.8" r="1" fill="#fff" />
        <path d="M95 50c-3 2-6 2-8 1" stroke="#e0631a" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      </g>
      {[[20, 78, 0], [34, 84, 1.1], [14, 62, 2]].map(([x, y, d], i) => (<circle key={i} className="k-bubble" cx={x} cy={y} r="2.6" fill="none" stroke="#c8fff0" strokeWidth="1.2" style={{ animationDelay: d + 's' }} />))}
    </svg>
  );
}

// ---------- ubin berlian ----------
type D = {
  cx: number; cy: number; d: number; // pusat & diagonal (satuan u)
  from: string; to: string; edge: string; ghost?: string;
  title: string; sub?: string; art?: ReactNode; artSize?: number; artDy?: number;
  dark?: boolean; tsize?: number; onClick?: () => void; float?: number; badge?: ReactNode; gx?: number; gy?: number;
};
function Diamond(p: D) {
  const L = p.d * SQ;
  const posStyle: CSSProperties = { position: 'absolute', left: U(p.cx - p.d / 2), top: U(p.cy - p.d / 2), width: U(p.d), height: U(p.d), pointerEvents: 'none', animation: `kfloat ${5 + (p.float || 0) * 0.7}s ease-in-out ${-(p.float || 0)}s infinite` };
  const sq = (extra: CSSProperties): CSSProperties => ({ position: 'absolute', left: '50%', top: '50%', width: U(L), height: U(L), borderRadius: U(L * 0.2), transform: 'translate(-50%,-50%) rotate(45deg)', ...extra });
  const ink = p.dark ? '#3a2400' : '#fff';
  return (
    <div style={posStyle}>
      {p.ghost && <div style={sq({ background: p.ghost, opacity: 0.55, transform: `translate(-50%,-50%) translate(${U(p.d * (p.gx ?? 0.1))},${U(p.d * (p.gy ?? -0.1))}) rotate(45deg) scale(0.92)` })} />}
      <button
        type="button" aria-label={p.title} onClick={p.onClick} className="k-tile"
        style={sq({ pointerEvents: 'auto', cursor: 'pointer', padding: 0, border: `${U(0.55)} solid ${p.edge}`, background: `linear-gradient(135deg,${p.from},${p.to})`, boxShadow: `0 ${U(1)} ${U(3)} rgba(0,0,0,0.45), inset 0 0 ${U(5)} rgba(255,255,255,0.12)`, overflow: 'hidden' })}
      >
        <span className="k-shine" />
      </button>
      <div style={{ position: 'absolute', left: '50%', top: '50%', width: U(p.d * (p.sub && p.sub.length > 12 ? 0.62 : 0.8)), height: U(p.d * 0.8), transform: 'translate(-50%,-50%)', pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: ink, textShadow: p.dark ? 'none' : '0 1px 3px rgba(0,0,0,0.35)' }}>
        {p.art && <div style={{ width: U(p.artSize || p.d * 0.34), height: U(p.artSize || p.d * 0.34), marginTop: U(p.artDy || 0), flex: '0 0 auto' }}>{p.art}</div>}
        <div style={{ fontWeight: 800, fontSize: U(p.tsize || 5), lineHeight: 1.05, marginTop: U(p.art ? 1.2 : 0) }}>{p.title}</div>
        {p.sub && <div style={{ fontWeight: 500, fontSize: U(2.8), lineHeight: 1.15, marginTop: U(0.8), opacity: 0.95, maxWidth: '100%' }}>{p.sub}</div>}
      </div>
      {p.badge}
    </div>
  );
}

const CSS = `
@keyframes kfloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-1.3%)}}
@keyframes ktwk{0%,100%{opacity:.25}50%{opacity:1}}
@keyframes kspin{to{transform:rotate(360deg)}}
@keyframes kpulse{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}
@keyframes kglow{0%,100%{opacity:.55;transform:scale(.92)}50%{opacity:1;transform:scale(1.08)}}
@keyframes ktw2{0%,100%{opacity:.2;transform:scale(.5) rotate(0)}50%{opacity:1;transform:scale(1.15) rotate(25deg)}}
@keyframes kbob{0%,100%{transform:translateY(0) scale(1,1)}50%{transform:translateY(-3px) scale(1.02,.97)}}
@keyframes kshadow{0%,100%{transform:scaleX(1)}50%{transform:scaleX(.9)}}
@keyframes kheart{0%{transform:translateY(8px) scale(.4);opacity:0}25%{opacity:1}100%{transform:translateY(-22px) scale(1.1);opacity:0}}
@keyframes kblink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}
@keyframes kswim{0%,100%{transform:translate(-3px,1px) rotate(-2deg)}50%{transform:translate(4px,-3px) rotate(2deg)}}
@keyframes ktail{0%,100%{transform:rotate(-12deg)}50%{transform:rotate(14deg)}}
@keyframes kline{0%,100%{transform:rotate(-3deg)}50%{transform:rotate(3deg)}}
@keyframes kbubble{0%{transform:translateY(0);opacity:0}20%{opacity:.9}100%{transform:translateY(-34px);opacity:0}}
@keyframes kshine{0%,55%{transform:translateX(-160%) rotate(20deg)}100%{transform:translateX(260%) rotate(20deg)}}
.k-spin,.k-pulse,.k-glow,.k-twinkle,.k-bob,.k-shadow,.k-heart,.k-blink,.k-swim,.k-tail,.k-line,.k-bubble{transform-box:fill-box;transform-origin:center}
.k-spin{animation:kspin 14s linear infinite}
.k-pulse{animation:kpulse 2.6s ease-in-out infinite}
.k-glow{animation:kglow 2.6s ease-in-out infinite}
.k-twinkle{animation:ktw2 2.2s ease-in-out infinite}
.k-bob{animation:kbob 1.6s ease-in-out infinite;transform-origin:50% 100%}
.k-shadow{animation:kshadow 1.6s ease-in-out infinite}
.k-heart{animation:kheart 2.6s ease-out infinite}
.k-blink{animation:kblink 4s infinite}
.k-swim{animation:kswim 3.2s ease-in-out infinite}
.k-tail{animation:ktail .9s ease-in-out infinite;transform-origin:100% 50%}
.k-line{animation:kline 3s ease-in-out infinite;transform-origin:50% 0}
.k-bubble{animation:kbubble 3s ease-in infinite}
.k-star{animation:ktwk 3.4s ease-in-out infinite}
.k-shine{position:absolute;top:-20%;left:0;width:35%;height:140%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.28),transparent);animation:kshine 5.5s ease-in-out infinite}
.k-tile{transition:filter .15s}.k-tile:active{filter:brightness(.88)}
@media (prefers-reduced-motion:reduce){.k-spin,.k-pulse,.k-glow,.k-twinkle,.k-bob,.k-shadow,.k-heart,.k-blink,.k-swim,.k-tail,.k-line,.k-bubble,.k-star,.k-shine{animation:none!important}}
`;

const GemIcon = () => (
  <svg viewBox="0 0 24 24" width="100%" height="100%"><path d="M6 4h12l4 6-10 11L2 10z" fill="#39b6ff" stroke="#1b6fc4" strokeWidth="1.4" strokeLinejoin="round" /><path d="M2 10h20M9 4l-2 6 5 11M15 4l2 6-5 11" stroke="#d6f0ff" strokeWidth="0.9" fill="none" opacity="0.75" /></svg>
);

export default function KomikStorePage() {
  const router = useRouter();
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

  const go = (href: string) => () => {
    if (href === '/komikstore/mancing') primeGameFullscreen(); // masuk mode game langsung dari sentuhan ini
    router.push(href);
  };
  const soon = (t: string) => () => alert(t + ' segera hadir.');

  return (
    <div className="fixed inset-0 overflow-y-auto overflow-x-hidden text-white max-w-md mx-auto" style={{ '--u': 'min(1vw, 4.48px)', background: 'linear-gradient(180deg, #0a0c11 0%, #05070b 60%, #030508 100%)' } as CSSProperties}>
      <style>{CSS}</style>

      {/* bintang latar */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {STARS.map((s, i) => (
          <span key={i} className="k-star" style={{ position: 'absolute', left: s.x + '%', top: s.y + '%', width: U(s.z), height: U(s.z), animationDelay: s.d + 's', color: s.c }}>
            {s.k === 'plus' ? (<><i style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 1, background: 'currentColor' }} /><i style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, background: 'currentColor' }} /></>)
              : <i style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: s.k === 'dot' ? 'currentColor' : 'transparent', border: s.k === 'ring' ? '1.5px solid currentColor' : 'none', opacity: 0.8 }} />}
          </span>
        ))}
      </div>

      {/* header */}
      <div className="relative flex items-center" style={{ gap: U(5), padding: `${U(3.5)} ${U(4)} 0` }}>
        <button onClick={() => router.back()} aria-label="Kembali" className="flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 active:scale-95 transition-transform" style={{ width: U(12.5), height: U(12.5) }}>
          <ArrowLeft style={{ width: U(6), height: U(6) }} />
        </button>
        <h1 className="font-extrabold tracking-tight relative" style={{ fontSize: U(10.5), textShadow: '0 2px 10px rgba(255,255,255,0.15)' }}>
          KomikStore<sup style={{ position: 'absolute', top: U(-2), right: U(-13), fontSize: U(3.8), fontWeight: 800, color: '#3fa24d', letterSpacing: 0.5 }}>BETA</sup>
        </h1>
      </div>

      {/* peta ubin (posisi & ukuran mengikuti desain Wibu Play) */}
      <div className="relative" style={{ height: U(192) }}>
        <Diamond cx={25.5} cy={26.1} d={37.5} from="#14171d" to="#101318" edge="#2c313b" title={(name || 'Tamu').split(' ')[0]} tsize={5.4} float={0} onClick={() => router.push('/profile')}
          art={photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.15)' }} />
          ) : <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Sparkles style={{ width: '50%', height: '50%', opacity: 0.6 }} /></div>}
          artSize={11.6} artDy={-2.5} />

        <Diamond cx={15.6} cy={64.3} d={26} from="#0b8f7e" to="#087a6d" edge="#33d1b9" title="Misi" tsize={5.4} float={2} onClick={go('/misi')}
          art={<Target style={{ width: '100%', height: '100%' }} strokeWidth={2.4} />} artSize={7.5} artDy={-1.5} />

        <Diamond cx={72.2} cy={68.9} d={62.4} from="#3aa3ee" to="#2a58a8" edge="#8ad4ff" ghost="#0d4a78" gx={-0.09} gy={-0.06} title="Gacha" sub="Wallpaper, Latar, Border & Efek" float={1} onClick={go('/komikstore/gacha-wallpaper')}
          art={<GachaArt />} artSize={21} artDy={-6} tsize={6.6} />

        <Diamond cx={27.8} cy={119.1} d={61.5} from="#ffd21f" to="#ffae3a" edge="#ffd400" ghost="#8a6a12" gx={0.1} gy={0.12} dark title="Pet" sub="Pelihara Pet dan Hasilkan Koin" float={3} onClick={go('/komikstore/pet')}
          art={<PetArt />} artSize={21} artDy={-4} tsize={7.4} />

        <Diamond cx={69.9} cy={123.1} d={53.7} from="#13b88a" to="#0a5a62" edge="#5ff0c4" ghost="#0b4b4a" gx={-0.1} gy={-0.1} title="Mancing" sub="Mancing ikan, dan Hangout bareng teman" float={4} onClick={go('/komikstore/mancing')}
          art={<FishArt />} artSize={19} artDy={-4} tsize={6.6} />

        <Diamond cx={78.6} cy={170.4} d={29.8} from="#14171d" to="#101318" edge="#2c313b" title={koin === null ? '–' : koin.toLocaleString('id-ID')} sub="Crystal" tsize={4.2} float={5}
          art={<GemIcon />} artSize={8} artDy={-1.5} />
      </div>
    </div>
  );
}
