'use client';

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import PetSvg from '@/components/PetArt';
import { getFirebase, loginWithGoogle } from '@/lib/firebase-client';

type Rar = 'Common' | 'Rare' | 'Epic' | 'Legend' | 'Mythic';
type Species = { name: string; r: Rar; e: string };
type Pet = Species & { id: number; readyAt: number };

const SPRITES = true;
const CD = (16 * 60 + 42) * 60000;
const DAY = 86400000;
const MAX = 15;
const COST = 100;
const MIGRATE_CAP = 5000; // saldo ✦ lama dipindah ke Crystal sekali per akun, maksimal segini
const KEY = 'kz-pet-v1';
const ORDER: Rar[] = ['Common', 'Rare', 'Epic', 'Legend', 'Mythic'];
const RAR: Record<Rar, { l: string; bg: string; fg: string; rate: number; w: number }> = {
  Common: { l: 'C', bg: '#6b6f7a', fg: '#fff', rate: 50, w: 50 },
  Rare: { l: 'R', bg: '#1b9ad6', fg: '#fff', rate: 100, w: 28 },
  Epic: { l: 'E', bg: '#9b5cf0', fg: '#fff', rate: 200, w: 14 },
  Legend: { l: 'L', bg: 'linear-gradient(135deg,#fff176,#fbbf24)', fg: '#713f12', rate: 500, w: 6 },
  Mythic: { l: 'M', bg: 'linear-gradient(135deg,#f472b6,#8b5cf6)', fg: '#fff', rate: 1200, w: 2 },
};
const POOL: Species[] = [
  { name: 'Ceruh the Dragon', r: 'Common', e: '🐲' }, { name: 'Drako the Dragon', r: 'Common', e: '🦎' },
  { name: 'Kova the Dragon', r: 'Common', e: '🐋' }, { name: 'Hijau the Pokemon', r: 'Common', e: '🐸' },
  { name: 'Frosta the Mini', r: 'Common', e: '🐧' }, { name: 'Luna the Mini', r: 'Common', e: '🐈‍⬛' },
  { name: 'Ignis the Fire', r: 'Rare', e: '🦖' }, { name: 'Glacius the Ice', r: 'Rare', e: '🐉' },
  { name: 'Blazon the Rare', r: 'Rare', e: '🦁' }, { name: 'Stormo the Rare', r: 'Rare', e: '🦄' },
  { name: 'Eran the Dragon', r: 'Epic', e: '🐍' }, { name: 'Sylax the Dragon', r: 'Epic', e: '🦋' },
  { name: 'Nexar the Dragon', r: 'Epic', e: '🦕' }, { name: 'Vreth the Dragon', r: 'Epic', e: '🐊' },
  { name: 'Volt the Legend', r: 'Legend', e: '🐅' }, { name: 'Verdra the Legend', r: 'Legend', e: '🦜' },
  { name: 'Purplex the Legend', r: 'Legend', e: '🦇' },
  { name: 'Bara the Dragon', r: 'Mythic', e: '🦂' }, { name: 'Kurama the Fox', r: 'Mythic', e: '🦊' },
  { name: 'Shukaku the Tanuki', r: 'Mythic', e: '🦝' }, { name: 'Matatabi the Cat', r: 'Mythic', e: '🐱' },
];
const START = ['Glacius the Ice', 'Blazon the Rare', 'Ceruh the Dragon'];
const POS: number[][] = [
  [62, 24], [36, 20], [72, 48], [26, 50], [52, 70], [14, 30], [84, 30], [48, 44],
  [20, 74], [80, 74], [50, 8], [34, 90], [68, 90], [10, 56], [88, 54],
];

const short = (n: string) => n.split(' ')[0];
const reward = (s: Species) => Math.round((RAR[s.r].rate * CD) / DAY);
const fmt = (ms: number) => {
  if (ms <= 0) return 'Klaim';
  const m = Math.floor(ms / 60000);
  return Math.floor(m / 60) + 'h ' + (m % 60) + 'm';
};

const CSS = `
@keyframes kzBob{0%,100%{transform:translate3d(0,0,0)}50%{transform:translate3d(0,-4px,0)}}
@keyframes kzStep{0%,100%{transform:translate3d(0,0,0) rotate(-2deg)}50%{transform:translate3d(0,-7px,0) rotate(2deg)}}
@keyframes kzHop{0%,100%{transform:translate3d(0,0,0) scale(1)}40%{transform:translate3d(0,-14px,0) scale(1.06)}60%{transform:translate3d(0,0,0) scale(.97)}}
@keyframes kzPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}
@keyframes kzPop{0%{transform:scale(.3);opacity:0}60%{transform:scale(1.12);opacity:1}100%{transform:scale(1)}}
@keyframes kzToast{0%{transform:translate(-50%,10px);opacity:0}15%,80%{transform:translate(-50%,0);opacity:1}100%{transform:translate(-50%,-14px);opacity:0}}
@keyframes kzSpin{to{transform:rotate(360deg)}}
@keyframes kzUp{from{transform:translate3d(0,100%,0)}to{transform:translate3d(0,0,0)}}
.kzb{animation:kzBob 2.6s ease-in-out infinite;will-change:transform}
.kzw .kzb{animation:kzStep .55s ease-in-out infinite}
.kzr .kzb{animation:kzHop 1.1s ease-in-out infinite}
@media (prefers-reduced-motion:reduce){.kzb,.kzw .kzb,.kzr .kzb{animation:none}}
`;

const SPR = new Map<string, boolean>();
function useSprite(src: string) {
  const [ok, setOk] = useState(SPR.get(src) === true);
  useEffect(() => {
    if (!SPRITES) return;
    const c = SPR.get(src);
    if (c !== undefined) { setOk(c); return; }
    let alive = true;
    const im = new window.Image();
    im.onload = () => { SPR.set(src, true); if (alive) setOk(true); };
    im.onerror = () => { SPR.set(src, false); };
    im.src = src;
    return () => { alive = false; };
  }, [src]);
  return ok;
}

const PetArt = memo(function PetArt({ s, size }: { s: Species; size: number }) {
  const src = '/pet/' + short(s.name).toLowerCase() + '.png';
  const ok = useSprite(src);
  if (!ok) return <span style={{ fontSize: size * 0.8, lineHeight: 1, display: 'inline-flex' }}><PetSvg e={s.e} ground={false} still /></span>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={s.name} draggable={false} decoding="async" style={{ width: size, height: size, objectFit: 'contain' }} />
  );
});

function Gem({ s = 16 }: { s?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
      <defs>
        <linearGradient id="kzgem" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#9fe0ff" /><stop offset="1" stopColor="#3b9be0" /></linearGradient>
      </defs>
      <path d="M12 2.5 20.5 8.5 12 21.5 3.5 8.5Z" fill="url(#kzgem)" stroke="#2b7fc4" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M3.8 8.7h16.4M12 2.7 8.6 8.7 12 21 15.4 8.7Z" fill="none" stroke="#e8f7ff" strokeWidth=".9" strokeLinejoin="round" opacity=".85" />
    </svg>
  );
}

function Chip({ r, big }: { r: Rar; big?: boolean }) {
  return (
    <span
      className={'inline-block rounded-full font-extrabold leading-none ' + (big ? 'px-3.5 py-1.5 text-sm' : 'px-2.5 py-[3px] text-[11px]')}
      style={{ background: RAR[r].bg, color: RAR[r].fg, boxShadow: r === 'Legend' ? '0 0 8px rgba(251,191,36,.7)' : undefined }}
    >{r}</span>
  );
}

function Tree({ x, y, k, flip }: { x: number; y: number; k: number; flip?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -k : k} ${k})`} style={{ transformOrigin: `${x}px ${y}px` }}>
      <rect x="-6" y="0" width="12" height="46" rx="5" fill="#8b5a3c" />
      <rect x="1" y="0" width="5" height="46" rx="2.5" fill="#6f4529" opacity=".55" />
      <circle cx="-16" cy="-8" r="30" fill="#52bd5c" />
      <circle cx="14" cy="-18" r="34" fill="#46b052" />
      <circle cx="-2" cy="-34" r="28" fill="#5cc666" />
      <circle cx="-14" cy="-24" r="14" fill="#7bdc7f" opacity=".55" />
    </g>
  );
}

function Tufts({ pts }: { pts: number[][] }) {
  return (
    <g stroke="#4aa24f" strokeWidth="2" strokeLinecap="round" fill="none" opacity=".75">
      {pts.map(([x, y], i) => <path key={i} d={`M${x} ${y}l-4-9M${x} ${y}l0-11M${x} ${y}l4-9`} />)}
    </g>
  );
}

const DOTS: [number, number, string][] = [[22, 22, '#f9a8d4'], [28, 24, '#fff'], [66, 20, '#fff'], [72, 26, '#f9a8d4'], [55, 30, '#fde047'], [14, 40, '#f9a8d4'], [88, 38, '#fff'], [40, 56, '#fde047'], [74, 62, '#fff'], [18, 62, '#f9a8d4']];

const Meadow = memo(function Meadow() {
  return (
    <>
      <svg viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 w-full h-full" aria-hidden="true">
        <defs>
          <linearGradient id="kzm" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8fd56d" /><stop offset=".5" stopColor="#7acb5e" /><stop offset="1" stopColor="#66bd5b" />
          </linearGradient>
        </defs>
        <rect width="400" height="800" fill="url(#kzm)" />
        <rect y="250" width="400" height="150" fill="#9be07a" opacity=".45" />
        <rect y="400" width="400" height="140" fill="#86d36a" opacity=".55" />
        <circle cx="330" cy="520" r="150" fill="#c4eea0" opacity=".35" />
        <circle cx="110" cy="470" r="110" fill="#c4eea0" opacity=".22" />
        <circle cx="48" cy="650" r="82" fill="#f2b84a" opacity=".88" />
        <ellipse cx="170" cy="860" rx="340" ry="200" fill="#5cb866" />
        <ellipse cx="60" cy="800" rx="120" ry="40" fill="#4fae5e" opacity=".7" />
        <ellipse cx="400" cy="835" rx="130" ry="60" fill="#e9c872" />
        <Tufts pts={[[120, 260], [200, 250], [70, 330], [250, 330], [330, 300], [110, 420], [300, 470], [40, 520]]} />
        <Tree x={68} y={228} k={0.62} />
        <Tree x={392} y={200} k={1.05} flip />
      </svg>
      {DOTS.map((d, i) => (
        <span key={i} className="absolute rounded-full" style={{ left: d[0] + '%', top: d[1] + '%', width: 5 + (i % 3) * 2, height: 5 + (i % 3) * 2, background: d[2], opacity: 0.9 }} />
      ))}
    </>
  );
});

const FrontTree = memo(function FrontTree() {
  return (
    <svg viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 w-full h-full pointer-events-none z-[6]" aria-hidden="true" style={{ opacity: 0.93 }}>
      <Tree x={352} y={330} k={0.5} />
    </svg>
  );
});

function EggIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
      <ellipse cx="17" cy="19" rx="11" ry="13" fill="#fff4dc" stroke="#f3d9a8" strokeWidth="2" />
      <ellipse cx="17" cy="24" rx="8" ry="6" fill="#fde7b8" />
      <circle cx="13" cy="15" r="1.6" fill="#f6c98a" /><circle cx="20" cy="18" r="1.3" fill="#f6c98a" />
    </svg>
  );
}

function CatalogIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
      <rect x="2" y="2" width="26" height="26" rx="7" fill="#fff" stroke="#2b3a55" strokeWidth="3" />
      <rect x="7" y="7" width="7" height="16" rx="2" fill="#3aa0e6" />
      <rect x="16" y="7" width="7" height="16" rx="2" fill="#f7c948" />
    </svg>
  );
}

type WProps = { p: Pet; i: number; W: number; H: number; label: string; ok: boolean; onClaim: (id: number) => void };

// Setiap pet jalan sendiri lewat transform (compositor-only), tanpa re-render React per frame.
const Wanderer = memo(function Wanderer({ p, i, W, H, label, ok, onClaim }: WProps) {
  const box = useRef<HTMLDivElement>(null);
  const flip = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = box.current, fl = flip.current;
    if (!el || !fl || W < 120 || H < 120) return;
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const [px, py] = POS[i % POS.length];
    let x = (px / 100) * W, y = (py / 100) * H;
    let dir = 1;
    let t1: ReturnType<typeof setTimeout>, t2: ReturnType<typeof setTimeout>;
    let alive = true;
    const put = (nx: number, ny: number) => { el.style.transform = 'translate3d(' + nx.toFixed(1) + 'px,' + ny.toFixed(1) + 'px,0)'; el.style.zIndex = String(Math.round(ny)); };
    el.style.transition = 'none';
    put(x, y);
    if (calm) return;
    const step = () => {
      if (!alive) return;
      if (document.hidden) { t1 = setTimeout(step, 1500); return; }
      const ang = Math.random() * Math.PI * 2;
      const dist = 60 + Math.random() * 110;
      const nx = Math.min(W - 44, Math.max(44, x + Math.cos(ang) * dist));
      const ny = Math.min(H - 56, Math.max(70, y + Math.sin(ang) * dist * 0.6));
      const d = Math.hypot(nx - x, ny - y);
      if (d < 20) { t1 = setTimeout(step, 600); return; }
      const dur = Math.max(1.6, d / 24);
      if (Math.abs(nx - x) > 8) { dir = nx < x ? -1 : 1; fl.style.transform = 'scaleX(' + dir + ')'; }
      el.style.transition = 'transform ' + dur.toFixed(2) + 's linear';
      el.classList.add('kzw');
      put(nx, ny);
      x = nx; y = ny;
      t2 = setTimeout(() => {
        el.classList.remove('kzw');
        t1 = setTimeout(step, 900 + Math.random() * 2600);
      }, dur * 1000);
    };
    t1 = setTimeout(step, 500 + i * 400 + Math.random() * 1800);
    return () => { alive = false; clearTimeout(t1); clearTimeout(t2); };
  }, [W, H, i]);

  return (
    <div ref={box} className="absolute left-0 top-0" style={{ willChange: 'transform', transform: 'translate3d(-999px,-999px,0)' }}>
      <div style={{ transform: 'translate(-50%,-50%)' }}>
        <div className={ok ? 'kzr' : ''}>
          <div className="kzb flex flex-col items-center" style={{ animationDelay: (i % 5) * 0.35 + 's' }}>
            <button
              onClick={() => ok && onClaim(p.id)}
              className={'mb-1 rounded-full pl-1.5 pr-3 py-1 text-[13px] font-black flex items-center gap-1 whitespace-nowrap ' + (ok ? 'bg-emerald-500 text-white' : 'bg-white/95 text-slate-800')}
              style={{ boxShadow: '0 3px 8px rgba(0,0,0,.12)' }}
            >
              {ok ? <span className="pl-1.5">Klaim</span> : <><Gem s={17} />{label}</>}
            </button>
            <div className="relative" style={{ width: 72, height: 72 }}>
              <span className="absolute left-1/2 bottom-0 -translate-x-1/2 rounded-full bg-black/15" style={{ width: 44, height: 9 }} />
              <div ref={flip} style={{ transition: 'transform .2s' }}><PetArt s={p} size={72} /></div>
            </div>
            <span className="-mt-1 flex items-center gap-1 rounded-full bg-white/85 pl-0.5 pr-2.5 py-0.5 text-[12px] font-extrabold" style={{ color: '#2f3b4a', boxShadow: '0 2px 6px rgba(0,0,0,.12)' }}>
              <span className="w-[18px] h-[18px] rounded-full text-[10px] font-black flex items-center justify-center" style={{ background: RAR[p.r].bg, color: RAR[p.r].fg }}>{RAR[p.r].l}</span>
              {short(p.name)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

export default function PetPage() {
  const router = useRouter();
  const [koin, setKoin] = useState(0);   // Crystal akun (users/{uid}/koin), sama dengan toko lain
  const [uid, setUid] = useState('');
  const [who, setWho] = useState<{ n: string; ph: string }>({ n: '', ph: '' });
  const [fb, setFb] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const legacy = useRef(0);               // saldo ✦ lama dari localStorage, menunggu dipindah ke Crystal
  const [now, setNow] = useState(0);
  const [pets, setPets] = useState<Pet[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [sheet, setSheet] = useState<'' | 'kelola' | 'katalog'>('');
  const [toast, setToast] = useState<{ m: string; k: number } | null>(null);
  const [reveal, setReveal] = useState<Pet | null>(null);
  const play = useRef<HTMLDivElement>(null);
  const [dim, setDim] = useState({ w: 0, h: 0 });
  const claimRef = useRef<(ids: number[]) => void>(() => {});
  const onClaim = useCallback((id: number) => claimRef.current([id]), []);

  useEffect(() => {
    const el = play.current;
    if (!el) return;
    const read = () => {
      const w = Math.round(el.clientWidth / 20) * 20, h = Math.round(el.clientHeight / 20) * 20;
      setDim(d => (d.w === w && d.h === h ? d : { w, h }));
    };
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const t = Date.now();
    setNow(t);
    let list: Pet[] | null = null;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const d = JSON.parse(raw) as { coins?: number; pets?: { n: string; id: number; at: number }[] };
        if (typeof d.coins === 'number' && d.coins > 0) legacy.current = Math.floor(d.coins);
        if (Array.isArray(d.pets)) {
          const out: Pet[] = [];
          for (const x of d.pets) {
            const s = POOL.find(p => p.name === x.n);
            if (s) out.push({ ...s, id: x.id, readyAt: x.at });
          }
          list = out;
        }
      }
    } catch {}
    if (!list) {
      list = START.map((n, i) => ({ ...(POOL.find(p => p.name === n) as Species), id: i + 1, readyAt: t + CD }));
    }
    setPets(list);
    setLoaded(true);
    const iv = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(KEY, JSON.stringify({ coins: legacy.current, pets: pets.map(p => ({ n: p.name, id: p.id, at: p.readyAt })) }));
    } catch {}
  }, [pets, loaded]);

  // Login + saldo Crystal. Saldo ✦ lama (kalau ada) dipindah ke Crystal satu kali per akun.
  useEffect(() => {
    let stop = false;
    let off: (() => void) | undefined;
    getFirebase().then((f: any) => {
      if (stop) return;
      setFb(f);
      off = f.auth.onAuthStateChanged(async (u: any) => {
        if (stop) return;
        if (!u) { setUid(''); setKoin(0); setWho({ n: '', ph: '' }); return; }
        setUid(u.uid);
        setWho({ n: String(u.displayName || ''), ph: String(u.photoURL || '') });
        const ref = f.db.ref('users/' + u.uid);
        try {
          if (legacy.current > 0) {
            const flag = await ref.child('petMigrated').transaction((cur: any) => (cur ? undefined : true));
            if (flag.committed && flag.snapshot.val() === true) {
              const add = Math.min(legacy.current, MIGRATE_CAP);
              await ref.child('koin').transaction((cur: any) => (typeof cur === 'number' ? cur : 0) + add);
              say('Saldo ✦ lamamu jadi +' + add + ' Crystal');
            }
            legacy.current = 0;
            try {
              const d = JSON.parse(localStorage.getItem(KEY) || '{}');
              d.coins = 0;
              localStorage.setItem(KEY, JSON.stringify(d));
            } catch {}
          }
          const v = (await ref.child('koin').get()).val();
          if (!stop) setKoin(typeof v === 'number' ? v : 0);
        } catch {}
      });
    }).catch(() => {});
    return () => { stop = true; if (off) off(); };
  }, []);

  const say = (m: string) => setToast({ m, k: Date.now() });
  const ready = pets.filter(p => p.readyAt <= now);

  const needLogin = () => { say('Login dulu buat pakai Crystal'); };

  const claim = async (ids: number[]) => {
    if (lock.current) return;
    if (!uid || !fb) { needLogin(); return; }
    const t = Date.now();
    const g = pets.filter(p => ids.includes(p.id) && p.readyAt <= t);
    if (!g.length) return;
    const total = g.reduce((a, p) => a + reward(p), 0);
    lock.current = true; setBusy(true);
    try {
      const res = await fb.db.ref('users/' + uid + '/koin').transaction((cur: any) => (typeof cur === 'number' ? cur : 0) + total);
      if (!res.committed) throw new Error('x');
      const got = g.map(p => p.id);
      setKoin(Number(res.snapshot.val()) || 0);
      setPets(ps => ps.map(p => (got.includes(p.id) ? { ...p, readyAt: Date.now() + CD } : p)));
      say('+' + total.toLocaleString('id-ID') + ' Crystal');
    } catch { say('Gagal klaim, coba lagi'); }
    lock.current = false; setBusy(false);
  };

  const gacha = async () => {
    if (lock.current) return;
    if (!uid || !fb) { needLogin(); return; }
    if (pets.length >= MAX) { say('Kandang penuh (' + MAX + '/' + MAX + ')'); return; }
    if (koin < COST) { say('Crystal kurang (butuh ' + COST + ')'); return; }
    lock.current = true; setBusy(true);
    try {
      // potong saldo pakai transaction supaya nggak bisa dobel dari 2 tab
      const res = await fb.db.ref('users/' + uid + '/koin').transaction((cur: any) => (typeof cur !== 'number' ? cur : cur >= COST ? cur - COST : undefined));
      const left = res.snapshot.val();
      if (!res.committed || typeof left !== 'number') { say('Crystal kurang (butuh ' + COST + ')'); lock.current = false; setBusy(false); return; }
      setKoin(left);
      let roll = Math.random() * 100;
      let r: Rar = 'Common';
      for (const k of ORDER) { roll -= RAR[k].w; if (roll < 0) { r = k; break; } }
      const list = POOL.filter(s => s.r === r);
      const s = list[Math.floor(Math.random() * list.length)];
      const p: Pet = { ...s, id: Date.now(), readyAt: Date.now() + CD };
      setPets(ps => [...ps, p]);
      setReveal(p);
    } catch { say('Gagal, coba lagi'); }
    lock.current = false; setBusy(false);
  };

  claimRef.current = claim;
  const owned = (n: string) => pets.filter(p => p.name === n).length;

  const flat = '0 3px 0 rgba(0,0,0,.07), 0 8px 14px rgba(0,0,0,.07)';

  return (
    <div onContextMenu={e => e.preventDefault()} className="min-h-screen max-w-md mx-auto relative overflow-hidden text-slate-800 select-none [-webkit-touch-callout:none] [-webkit-tap-highlight-color:transparent]" style={{ background: '#7acb5e' }}>
      <style>{CSS}</style>
      <Meadow />

      <div className="relative z-20 px-3 pt-5">
        <div className="flex items-center gap-2">
          <button onClick={() => router.back()} aria-label="Kembali" className="w-11 h-11 shrink-0 rounded-full bg-white/70 flex items-center justify-center" style={{ boxShadow: flat }}>
            <ChevronLeft className="w-6 h-6" strokeWidth={3.5} style={{ color: '#17476b' }} />
          </button>
          <h1 className="text-[30px] leading-none font-black whitespace-nowrap" style={{ color: '#17476b', textShadow: '0 2px 0 rgba(255,255,255,.55)' }}>KomikZoo</h1>
          <div className="flex-1" />
          <button
            onClick={() => { if (!uid) loginWithGoogle().catch(() => say('Login gagal, coba lagi')); }}
            aria-label="Crystal"
            className="h-11 rounded-full pl-2.5 pr-4 text-[15px] font-black text-slate-800 bg-white/75 flex items-center gap-1.5 shrink-0"
            style={{ boxShadow: flat }}
          >
            <Gem s={20} />{uid ? koin.toLocaleString('id-ID') : 'Login'}
          </button>
        </div>

        <div className="mt-3 rounded-[24px] bg-white/70 pl-2.5 pr-3 py-2.5 flex items-center gap-3" style={{ boxShadow: flat }}>
          <div className="w-11 h-11 rounded-full overflow-hidden bg-emerald-100 border-2 border-white shrink-0 flex items-center justify-center text-lg">
            {who.ph
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={who.ph} alt="" draggable={false} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
              : '🐾'}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="text-[11px] font-extrabold text-slate-500">{uid ? 'Zoo milikmu' : 'Belum login'}</p>
            <p className="text-[19px] font-black text-slate-800 truncate uppercase">{who.n || 'Tamu'}</p>
          </div>
          <button
            onClick={() => claim(ready.map(p => p.id))}
            className={'rounded-full pl-3 pr-1.5 py-1.5 text-[12px] font-extrabold whitespace-nowrap flex items-center gap-1.5 shrink-0 ' + (ready.length ? 'bg-orange-400 text-white' : 'bg-slate-200/80 text-slate-500')}
            style={{ animation: ready.length ? 'kzPulse 1.2s ease-in-out infinite' : undefined }}
          >
            Klaim Semua
            <span className={'min-w-[20px] h-5 rounded-full text-[11px] flex items-center justify-center text-white ' + (ready.length ? 'bg-red-500' : 'bg-slate-400/80')}>{ready.length}</span>
          </button>
        </div>
      </div>

      <div ref={play} className="absolute inset-x-0 z-[5]" style={{ top: 170, bottom: 96 }}>
        {pets.map((p, i) => {
          const left = p.readyAt - now;
          const ok = !!now && left <= 0;
          return <Wanderer key={p.id} p={p} i={i} W={dim.w} H={dim.h} label={now ? fmt(left) : '...'} ok={ok} onClaim={onClaim} />;
        })}
      </div>
      <FrontTree />

      {toast && <div key={toast.k} className="fixed top-24 left-1/2 z-40 rounded-full bg-slate-900/85 text-white px-4 py-2 text-sm font-bold" style={{ animation: 'kzToast 2.4s ease forwards' }}>{toast.m}</div>}

      {sheet && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setSheet('')} />
          <div className="fixed left-0 right-0 top-[128px] bottom-[84px] max-w-md mx-auto z-10 rounded-t-[28px] bg-white/85 overflow-y-auto px-4 pb-8" style={{ animation: 'kzUp .25s ease-out', boxShadow: '0 -6px 24px rgba(0,0,0,.08)' }}>
            <div className="sticky top-0 z-10 -mx-4 px-4 pt-2.5 pb-3" style={{ background: 'linear-gradient(180deg,rgba(255,255,255,.96) 70%,rgba(255,255,255,0))' }}>
              <div className="mx-auto w-14 h-1.5 rounded-full bg-slate-300/90 mb-2.5" />
              <div className="flex items-center justify-between">
                <h2 className="text-[18px] font-black text-slate-800">{sheet === 'kelola' ? 'Kelola Pet (' + pets.length + '/' + MAX + ')' : 'Katalog Pet'}</h2>
                <button onClick={() => setSheet('')} aria-label="Tutup" className="w-10 h-10 rounded-xl bg-slate-100/80 text-[20px] font-black leading-none text-slate-700">x</button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {(sheet === 'kelola' ? pets : POOL).map((p, i) => {
                const pet = p as Pet;
                return (
                  <div key={i} className="rounded-2xl border border-[#dbe6d3] bg-[#f6f9ec] p-2 flex gap-2 items-center" style={{ boxShadow: '0 1px 0 rgba(255,255,255,.9) inset' }}>
                    <div className="w-11 h-11 shrink-0 flex items-center justify-center"><PetArt s={p} size={44} /></div>
                    <div className="min-w-0">
                      <p className="text-[14px] font-black leading-tight text-[#243044]">{p.name}</p>
                      <div className="mt-1"><Chip r={p.r} /></div>
                      <p className="mt-1 inline-flex items-center gap-1 rounded-full border border-teal-200 bg-[#e9fbf8] px-1.5 py-[2px] text-[10px] font-black text-teal-700 whitespace-nowrap">
                        HASILKAN <Gem s={13} /> {RAR[p.r].rate} /hari
                      </p>
                      {sheet === 'katalog' && owned(p.name) > 0 && <p className="text-[11px] font-bold text-emerald-600">Dimiliki ×{owned(p.name)}</p>}
                      {sheet === 'kelola' && <p className="text-[11px] font-bold text-slate-500">{now ? (pet.readyAt - now <= 0 ? 'Siap klaim' : fmt(pet.readyAt - now)) : ''}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
            {sheet === 'kelola' && !pets.length && <p className="text-center text-slate-500 py-8">Belum punya pet. Coba Gacha dulu.</p>}
            {sheet === 'katalog' && (
              <div className="mt-3 rounded-2xl border border-[#cfe8f5] p-3.5" style={{ background: 'linear-gradient(180deg,#eef8ff,#e3f3fb)', boxShadow: '0 4px 10px rgba(80,150,200,.10)' }}>
                <p className="text-[13px] font-black text-[#1b4a6b]">KomikZoo masih tahap uji coba</p>
                <p className="mt-1 text-[12px] font-bold leading-snug text-slate-500">Akan ada fitur dan pet lain pada update berikutnya. Nantikan updatenya.</p>
              </div>
            )}
          </div>
        </>
      )}

      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-20 px-3 pt-3 pb-4" style={{ background: '#fdf6ea', boxShadow: '0 -6px 18px rgba(0,0,0,.08)' }}>
        <div className="flex gap-2.5 items-stretch">
          <button onClick={gacha} disabled={busy} className="flex-[1.15] h-[60px] rounded-2xl text-white text-[16px] font-black flex items-center justify-center gap-2 active:translate-y-0.5 disabled:opacity-60" style={{ background: '#f9a99b', boxShadow: flat }}>
            <EggIcon />
            <span className="flex flex-col items-start leading-tight">Gacha<span className="text-[11px] font-extrabold text-white/90 flex items-center gap-0.5"><Gem s={11} />{COST}</span></span>
          </button>
          <button onClick={() => setSheet(v => (v === 'kelola' ? '' : 'kelola'))} className="relative flex-[1.35] h-[60px] rounded-2xl text-white text-[15px] font-black flex items-center justify-center gap-1.5 active:translate-y-0.5" style={{ background: '#a8c9b3', boxShadow: flat }}>
            Kelola
            <span className="rounded-lg bg-white/80 text-slate-600 px-2.5 py-0.5 text-[15px] font-black">{pets.length}/{MAX}</span>
            <span className="absolute -top-2 -right-1 min-w-[22px] h-[22px] rounded-full bg-[#f28b82] text-white text-[12px] font-black flex items-center justify-center border-2 border-[#fdf6ea]">{ready.length}</span>
          </button>
          <button onClick={() => setSheet(v => (v === 'katalog' ? '' : 'katalog'))} className="flex-1 h-[60px] rounded-2xl bg-white text-slate-800 text-[14px] font-black flex flex-col items-center justify-center gap-0.5 active:translate-y-0.5" style={{ boxShadow: flat }}>
            <CatalogIcon />Katalog
          </button>
        </div>
      </div>

      {reveal && (
        <div className="fixed inset-0 z-40 bg-black/65 flex items-center justify-center" onClick={() => setReveal(null)}>
          <div className="relative flex flex-col items-center" style={{ animation: 'kzPop .5s ease-out' }}>
            <div className="absolute w-80 h-80 rounded-full opacity-60" style={{ background: 'conic-gradient(from 0deg,transparent,rgba(253,224,71,.8),transparent,rgba(253,224,71,.8),transparent,rgba(253,224,71,.8),transparent)', animation: 'kzSpin 6s linear infinite', maskImage: 'radial-gradient(circle,#000 30%,transparent 70%)', WebkitMaskImage: 'radial-gradient(circle,#000 30%,transparent 70%)' }} />
            <div className="relative" style={{ animation: 'kzBob 2s ease-in-out infinite' }}><PetArt s={reveal} size={150} /></div>
            <p className="relative mt-3 text-3xl font-extrabold text-white">{reveal.name}</p>
            <div className="relative mt-2"><Chip r={reveal.r} big /></div>
            <p className="relative mt-2 text-white/90 font-bold">{RAR[reveal.r].rate} Crystal/hari</p>
            <p className="relative mt-5 text-white/60 text-sm">Ketuk untuk tutup</p>
          </div>
        </div>
      )}
    </div>
  );
}
