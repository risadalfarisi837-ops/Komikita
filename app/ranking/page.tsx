"use client";

import { Suspense, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Montserrat } from 'next/font/google';
import { useUserStats } from '@/lib/store';
import { currentSeason, RANKS, rankFor, fmt, fmtC, targetsFor, POINTS_PER_CHAPTER, NIGHT_BONUS, DAILY_BONUS } from '@/lib/season';
import { fetchTop, pushSeasonScore, getUser, getFirebase } from '@/lib/leaderboard';
import { charismaBuckets } from '@/lib/charisma';
import WallpaperBg from '@/components/WallpaperBg';
import PremiumName from '@/components/PremiumName';
import VerifiedBadge from '@/components/VerifiedBadge';
import DevBadge from '@/components/DevBadge';
import { BORDER_CATALOG } from '@/components/BorderSheet';
import { WALLPAPER_CATALOG } from '@/lib/wallpapers';
import { isPremiumRole } from '@/lib/premium';
import { formatShortId } from '@/lib/utils';
import { LevelPill } from '@/components/LevelPill';

// Font & ukuran mengikuti desain acuan: 1u = 1% lebar layar (maks. kolom 448px), jadi proporsinya sama di semua HP.
const mont = Montserrat({ subsets: ['latin'], weight: ['500', '600', '700', '800'], display: 'swap' });
const U = (n: number) => `calc(var(--u) * ${n})`;
const F = (n: number, min = 10) => `max(${min}px, calc(var(--u) * ${n}))`;

const MUTED = '#8F8D9B';
const GREEN = '#0E8A6A';
const MAROON = '#4A2A33';
const AVATAR_COLORS = ['#4A2A2E', '#F26B21', '#3B3F8C', '#0F6B55', '#7A1D2E', '#5B3A8C'];
const RING_GRAD = [
  'linear-gradient(135deg,#ff5c8a,#ff9a5c)', 'linear-gradient(135deg,#ff4d6d,#c13584)', 'linear-gradient(135deg,#a855f7,#ec4899)',
  'linear-gradient(135deg,#f43f5e,#fb7185)', 'linear-gradient(135deg,#6366f1,#ec4899)',
];
const ringFor = (uid: string) => RING_GRAD[(uid.charCodeAt(0) + uid.charCodeAt(uid.length - 1)) % RING_GRAD.length];
const GOLD = '#F5C451', SILVER = '#C9D1DA', BRONZE = '#E08A3C';
const PINK = '#FF5C9A';

// ───────────────────────── papan & tema ─────────────────────────
type BoardId = 'reader' | 'premium' | 'charisma';
type Theme = {
  id: BoardId; title: string; accent: string; accentText: string; border: string; bgTop: string; bgBottom: string;
  unit: string; tabs: { k: string; label: string }[]; section: (tab: string) => string; chip: (tab: string, daysLeft: number, seasonId: number) => string;
};
const THEMES: Record<BoardId, Theme> = {
  reader: {
    id: 'reader', title: 'Top Pembaca', accent: GOLD, accentText: '#2A2208', border: 'rgba(245,196,81,.5)', bgTop: '#4D3C12', bgBottom: '#1D1809', unit: 'XP',
    tabs: [], section: () => 'Top Pembaca Musim Ini',
    chip: (_t, d, s) => `Season ${s} · ${d} hari lagi`,
  },
  premium: {
    id: 'premium', title: 'Top Premium', accent: '#2DD4E8', accentText: '#06303A', border: 'rgba(45,212,232,.5)', bgTop: '#0F5266', bgBottom: '#08212C', unit: 'hari',
    tabs: [], section: () => 'Top Premium', chip: () => 'Sisa hari premium',
  },
  charisma: {
    id: 'charisma', title: 'Paling Dicintai', accent: PINK, accentText: '#3A0B22', border: 'rgba(255,92,154,.5)', bgTop: '#6E2A55', bgBottom: '#26111E', unit: 'hati',
    tabs: [{ k: 'all', label: 'All Time' }, { k: 'd30', label: 'Bulan Ini' }, { k: 'd7', label: 'Minggu Ini' }],
    section: (t) => 'Top Charisma ' + (t === 'all' ? 'Sepanjang Masa' : t === 'd30' ? 'Bulan Ini' : 'Minggu Ini'),
    chip: (t) => (t === 'all' ? 'Sepanjang masa' : t === 'd30' ? 'Bulan ini' : 'Minggu ini'),
  },
};
const BOARD_ORDER: BoardId[] = ['reader', 'premium', 'charisma'];
const BOARD_SUB: Record<BoardId, string> = { reader: 'XP baca musim ini', premium: 'Sisa hari premium terbanyak', charisma: 'Hati yang diterima komentar' };

// ───────────────────────── data ─────────────────────────
type BRow = { uid: string; name: string; photo: string; value: number; points?: number };
type Extra = { displayName?: string; photoURL?: string; role?: string; premiumUntil?: number; activeBorder?: string; activeWallpaper?: string; level?: number; lencana?: string; shortId?: number };
const XF = ['displayName', 'photoURL', 'role', 'premiumUntil', 'activeBorder', 'activeWallpaper', 'level', 'shortId'];

// Ambil detail profil (role, border, wallpaper, nama, foto, level, lencana, ID) per kelompok kecil supaya tidak membanjiri jaringan.
async function fetchExtras(uids: string[], put: (o: Record<string, Extra>) => void, have: Record<string, Extra>) {
  const ids = Array.from(new Set(uids)).filter((id) => id && !have[id]);
  if (!ids.length) return;
  let db: any;
  try { db = (await getFirebase()).db; } catch { return; }
  for (let i = 0; i < ids.length; i += 10) {
    const out: Record<string, Extra> = {};
    await Promise.all(ids.slice(i, i + 10).map(async (id) => {
      const e: Record<string, any> = {};
      await Promise.all(XF.map(async (f) => {
        try { const v = (await db.ref('users/' + id + '/' + f).get()).val(); if (v !== null && v !== undefined) e[f] = v; } catch {}
      }));
      out[id] = e as Extra;
    }));
    put(out);
  }
}

async function loadRows(b: BoardId, tab: string, seasonId: number): Promise<BRow[]> {
  const { db } = await getFirebase();
  if (b === 'reader') {
    const u = await getUser();
    if (u) await pushSeasonScore(); // sinkronkan poin lokal dulu
    const top = await fetchTop(seasonId);
    return top.map((r) => ({ uid: r.uid, name: r.name, photo: r.photo, value: r.points, points: r.points }));
  }
  if (b === 'premium') {
    const now = Date.now();
    const snap = await db.ref(`leaderboard/s${seasonId}`).orderByChild('prem').limitToLast(100).get();
    const rows: BRow[] = [];
    snap.forEach((c: any) => {
      const v = c.val() || {};
      const left = Math.ceil(((Number(v.prem) || 0) - now) / 86400000);
      if (left > 0) rows.push({ uid: String(c.key), name: v.name || 'User', photo: v.photo || '', value: left });
    });
    return rows.sort((a, b2) => b2.value - a.value);
  }
  const key = (charismaBuckets() as Record<string, string>)[tab] || 'all';
  const snap = await db.ref(`charisma/${key}`).orderByValue().limitToLast(100).get();
  const rows: BRow[] = [];
  snap.forEach((c: any) => { const n = Number(c.val()) || 0; if (n > 0) rows.push({ uid: String(c.key), name: 'User', photo: '', value: n }); });
  return rows.sort((a, b2) => b2.value - a.value);
}

// ───────────────────────── potongan UI kecil ─────────────────────────
const Shield = ({ color, size = 22 }: { color: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="rgba(255,255,255,.55)" strokeWidth={1.4} strokeLinejoin="round"><path d="M12 2.5l8 3v6c0 5-3.4 8.6-8 10-4.6-1.4-8-5-8-10v-6l8-3z" /></svg>
);
const HEART_D = 'M12 21s-8-5-8-11a4.6 4.6 0 018-3 4.6 4.6 0 018 3c0 6-8 11-8 11z';
const HeartIcon = ({ size = 14, color = PINK }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden style={{ flex: `0 0 ${size}px` }}><path d={HEART_D} /></svg>
);
const Crown = ({ w }: { w: string }) => (
  <svg aria-hidden viewBox="0 0 24 18" style={{ width: w, height: 'auto', display: 'block' }}><path d="M1 5l5 4 6-8 6 8 5-4-2 12H3z" fill="#FFC53D" stroke="#B8860B" strokeWidth={0.8} strokeLinejoin="round" /></svg>
);

// Tombol hati (tanda favorit) — tersimpan di perangkat ini
function FavBtn({ on, onToggle, round }: { on: boolean; onToggle: () => void; round?: boolean }) {
  return (
    <button type="button" aria-label={on ? 'Hapus tanda' : 'Tandai'} aria-pressed={on} onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggle(); }} className="rk-fav"
      style={{ flex: '0 0 auto', width: round ? 'max(28px, calc(var(--u) * 6))' : 'max(34px, calc(var(--u) * 8))', height: round ? 'max(28px, calc(var(--u) * 6))' : 'max(34px, calc(var(--u) * 8))', borderRadius: '50%', border: round ? '1px solid rgba(255,255,255,.14)' : 0, background: round ? 'rgba(255,255,255,.07)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
      <svg viewBox="0 0 24 24" style={{ width: round ? '56%' : '68%', height: round ? '56%' : '68%', transition: 'transform .25s cubic-bezier(.3,1.6,.5,1)', transform: on ? 'scale(1.12)' : 'scale(1)' }} fill={on ? PINK : 'none'} stroke={PINK} strokeWidth={2.1} strokeLinejoin="round"><path d={HEART_D} /></svg>
    </button>
  );
}

const LvPill = ({ lv }: { lv: number }) => <LevelPill level={lv} label="Lv." fontSize={F(2.25, 10.5)} iconSize={13} />;

function Ava({ name, photo, size, ring, ringW = 2, borderKey }: { name: string; photo?: string; size: string; ring: string; ringW?: number | string; borderKey?: string }) {
  const bg = AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length];
  const b: any = borderKey ? (BORDER_CATALOG as any)[borderKey] : null;
  const hasB = !!(b && b.url);
  return (
    <div style={{ ['--s' as string]: size, position: 'relative', width: 'var(--s)', height: 'var(--s)', flex: '0 0 var(--s)' } as CSSProperties}>
      <div style={{ width: '100%', height: '100%', borderRadius: '50%', padding: ringW, boxSizing: 'border-box', background: ring }}>
        <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'calc(var(--s) * 0.34)', fontWeight: 800 }}>
          {photo
            // eslint-disable-next-line @next/next/no-img-element
            ? <img decoding="async" src={photo} alt="" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : name.slice(0, 2).toUpperCase()}
        </div>
      </div>
      {hasB && <div style={{ position: 'absolute', top: '50%', left: '50%', width: '130%', height: '130%', transform: 'translate(-50%,-50%)', backgroundImage: "url('" + b.url + "')", backgroundSize: 'contain', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', pointerEvents: 'none', zIndex: 2 }} />}
    </div>
  );
}

function NameLine({ name, ex, size = '16px', weight = 700, prefix, center }: { name: string; ex?: Extra; size?: string; weight?: number; prefix?: string; center?: boolean }) {
  const pu = Number(ex?.premiumUntil) || 0;
  const verified = isPremiumRole(ex?.role) && (!pu || pu > Date.now());
  const dev = ex?.role === 'Developer';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0, justifyContent: center ? 'center' : 'flex-start', maxWidth: '100%', fontSize: size }}>
      {prefix && <span style={{ fontWeight: weight, whiteSpace: 'nowrap' }}>{prefix}</span>}
      <PremiumName premium={verified} dev={dev} style={{ fontWeight: weight, letterSpacing: -0.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{name}</PremiumName>
      {verified && <VerifiedBadge size={14} />}
      {dev && <DevBadge size={15} />}
    </div>
  );
}

function MiniStat({ label, value, target, unit }: { label: string; value: number; target: number; unit?: string }) {
  const pct = Math.min(100, (value / target) * 100);
  return (
    <div style={{ flex: 1, minWidth: 0, background: '#1F1E24', borderRadius: 14, padding: '12px 12px 14px' }}>
      <div style={{ color: MUTED, fontSize: 14, fontWeight: 800 }}>{label}</div>
      <div style={{ marginTop: 8, fontSize: 20, fontWeight: 800, letterSpacing: -0.8 }}>
        {fmt(value)}<span style={{ fontSize: 13, color: MUTED, letterSpacing: -0.2 }}>/ {fmt(target)}{unit ? ` ${unit}` : ''}</span>
      </div>
      <div style={{ height: 4, borderRadius: 2, background: MAROON, marginTop: 10 }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 2, background: GREEN }} />
      </div>
    </div>
  );
}

const BoardIcon = ({ id, color, size = 18 }: { id: BoardId; color: string; size?: number }) => id === 'charisma' ? <HeartIcon size={size} color={color} /> : id === 'premium'
  ? <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5L3 8z" /></svg>
  : <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden><path d="M7 3h10v3h3v3a4 4 0 01-4 4 5 5 0 01-3 2.9V18h3v3H8v-3h3v-2.1A5 5 0 018 13a4 4 0 01-4-4V6h3z" /></svg>;

// ───────────────────────── podium "The Big 3" ─────────────────────────
const SPARK: [number, number, number][] = [[10, 22, 7], [88, 18, 9], [20, 55, 6], [78, 50, 7], [50, 12, 6], [93, 62, 6], [6, 70, 5]];
const HEARTS: [number, number, number, number][] = [[18, 8, 8.5, 12], [36, 2, 10.5, 9], [58, 5, 7.5, 13], [76, 1, 9.5, 10], [88, 6, 8, 11], [47, 0, 11, 14]];

function Valtxt({ b, v, size, unit, color }: { b: BoardId; v: number; size: string; unit: string; color: string }) {
  const num = b === 'reader' ? fmtC(v) : fmt(v);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4, fontWeight: 800, fontSize: size, letterSpacing: -0.4, color, whiteSpace: 'nowrap', lineHeight: 1.1 }}>
      {b === 'charisma' && <span style={{ alignSelf: 'center', display: 'inline-flex' }}><HeartIcon size={14} color={PINK} /></span>}
      {num}{b !== 'charisma' && <span style={{ fontSize: '0.62em', color: '#B9B7C4', fontWeight: 600 }}>{unit}</span>}
    </span>
  );
}

type FavProps = { favs: string[]; onFav: (uid: string) => void };

function PodiumCol({ r, pos, ex, theme, favs, onFav }: { r?: BRow; pos: 1 | 2 | 3; ex?: Extra } & { theme: Theme } & FavProps) {
  const ring = pos === 1 ? GOLD : pos === 2 ? SILVER : BRONZE;
  const size = pos === 1 ? U(15.5) : U(10.8);
  const blockH = pos === 1 ? 14.6 : pos === 2 ? 9.8 : 7;
  const blockBg = pos === 1 ? 'linear-gradient(180deg,#8A6A14,#4B3A0C)' : pos === 2 ? 'linear-gradient(180deg,#5D6168,#2F3236)' : 'linear-gradient(180deg,#8B5A22,#4B2D10)';
  const blockBorder = pos === 1 ? GOLD : pos === 2 ? '#C3C8CF' : '#C98A4B';
  const numColor = pos === 1 ? '#F7D774' : pos === 2 ? '#DCE1E8' : '#E9A25C';
  const nm = r ? (ex?.displayName || r.name) : '';
  const info = r ? (
    <Link href={`/user?uid=${r.uid}`} className="rk-tap" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: U(0.7), width: '100%', color: 'inherit', textDecoration: 'none' }}>
      <div style={{ position: 'relative', marginBottom: U(0.6) }}>
        {pos === 1 && <div style={{ position: 'absolute', left: '50%', top: U(-4.3), transform: 'translateX(-50%) rotate(-4deg)', zIndex: 3, width: U(7.4) }}><Crown w="100%" /></div>}
        <Ava name={nm} photo={ex?.photoURL || r.photo} size={size} ring={ring} ringW={U(0.55)} borderKey={ex?.activeBorder} />
      </div>
      <NameLine name={nm} ex={ex} size={F(pos === 1 ? 3.2 : 2.9, 12)} weight={800} center />
      <div style={{ fontSize: F(2.2, 10), fontWeight: 600, color: MUTED }}>{formatShortId(ex?.shortId, r.uid)}</div>
      {ex?.level !== undefined && <LvPill lv={Number(ex.level) || 1} />}
      <Valtxt b={theme.id} v={r.value} size={F(pos === 1 ? 5.1 : 4, 15)} unit={theme.unit} color={pos === 1 ? GOLD : '#fff'} />
    </Link>
  ) : <div style={{ height: U(8) }} />;
  return (
    <div className={'rk-pod rk-pod' + pos} style={{ flex: pos === 1 ? '32 1 0' : pos === 2 ? '27 1 0' : '27.4 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', position: 'relative', zIndex: pos === 1 ? 2 : 1 }}>
      {info}
      {r && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: U(1.2), margin: `${U(1.2)} 0 ${U(1.6)}`, maxWidth: '100%' }}>
          <FavBtn round on={favs.includes(r.uid)} onToggle={() => onFav(r.uid)} />
        </div>
      )}
      <div style={{ width: '100%', height: U(blockH), borderRadius: `${U(2.6)} ${U(2.6)} 0 0`, background: blockBg, borderTop: `2px solid ${blockBorder}`, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: F(pos === 1 ? 7.2 : 5.4, 22), fontWeight: 800, color: numColor, textShadow: '0 2px 6px rgba(0,0,0,.35)' }}>{pos}</div>
    </div>
  );
}

function Podium({ rows, ex, theme, tab, chip, favs, onFav }: { rows: BRow[]; ex: Record<string, Extra>; theme: Theme; tab: string; chip: string } & FavProps) {
  return (
    <div style={{ position: 'relative', margin: `${U(2.6)} ${U(2.8)} 0`, borderRadius: U(5), border: `1.5px solid ${theme.border}`, background: `linear-gradient(180deg, ${theme.bgTop} 0%, ${theme.bgBottom} 100%)`, overflow: 'hidden', padding: `${U(3.6)} ${U(2.2)} 0`, minHeight: U(80), boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
      {/* sorotan cahaya + kilau + (khusus charisma) hati melayang */}
      <div aria-hidden style={{ position: 'absolute', left: '50%', top: 0, width: '62%', height: '88%', transform: 'translateX(-50%)', clipPath: 'polygon(36% 0, 64% 0, 100% 100%, 0 100%)', background: 'linear-gradient(180deg, rgba(255,255,255,.26) 0%, rgba(255,255,255,.06) 70%, rgba(255,255,255,0) 100%)', pointerEvents: 'none' }} />
      <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {SPARK.map(([x, y, z], i) => (
          <svg key={i} width={z * 2} height={z * 2} viewBox="0 0 24 24" style={{ position: 'absolute', left: x + '%', top: y + '%', opacity: 0.45, animationDelay: -(i * 0.7) + 's' }} className="rk-tw"><path d="M12 0l2.6 9.4L24 12l-9.4 2.6L12 24l-2.6-9.4L0 12l9.4-2.6z" fill="#fff" /></svg>
        ))}
      </div>
      {theme.id === 'charisma' && (
        <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {HEARTS.map(([x, d, z, dur], i) => <span key={i} className="rk-fh" style={{ position: 'absolute', left: x + '%', bottom: '8%', animationDuration: dur + 's', animationDelay: -(d + i * 1.7) + 's' }}><HeartIcon size={z * 1.6} color="#FF8DB5" /></span>)}
        </div>
      )}

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `0 ${U(0.8)}`, zIndex: 3 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: U(1.6), fontSize: F(3.1, 13), fontWeight: 800, color: theme.accent }}>
          {theme.id === 'charisma' ? <HeartIcon size={16} color={theme.accent} /> : <Crown w={U(3.9)} />}The Big 3
        </div>
        <span style={{ fontSize: F(2.2, 10), fontWeight: 600, color: '#D5D3DE', background: 'rgba(0,0,0,.35)', border: '1px solid rgba(255,255,255,.1)', padding: `${U(0.9)} ${U(2.2)}`, borderRadius: 99, whiteSpace: 'nowrap' }}>{chip}</span>
      </div>

      <div key={theme.id + ':' + tab} style={{ position: 'relative', zIndex: 2, flex: 1, display: 'flex', alignItems: 'flex-end', gap: U(1.7), marginTop: U(6) }}>
        <PodiumCol r={rows[1]} pos={2} ex={rows[1] ? ex[rows[1].uid] : undefined} theme={theme} favs={favs} onFav={onFav} />
        <PodiumCol r={rows[0]} pos={1} ex={rows[0] ? ex[rows[0].uid] : undefined} theme={theme} favs={favs} onFav={onFav} />
        <PodiumCol r={rows[2]} pos={3} ex={rows[2] ? ex[rows[2].uid] : undefined} theme={theme} favs={favs} onFav={onFav} />
      </div>
    </div>
  );
}

// ───────────────────────── halaman ─────────────────────────
function RankingInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const spBoard = sp?.get('board') || '';
  const spTab = sp?.get('tab') || '';
  const season = currentSeason();
  const mine = useUserStats((s) => s.season);
  const [mounted, setMounted] = useState(false);
  const [board, setBoard] = useState<BoardId | null>(null);
  const [tab, setTab] = useState<string>('Semua');
  const [data, setData] = useState<Record<string, { rows: BRow[]; err?: string }>>({});
  const [ex, setEx] = useState<Record<string, Extra>>({});
  const exRef = useRef<Record<string, Extra>>({});
  const [me, setMe] = useState<any>(null);
  const [myCh, setMyCh] = useState<number | null>(null);
  const [sheet, setSheet] = useState(false);
  const [menu, setMenu] = useState(false);
  const [favs, setFavs] = useState<string[]>([]);

  const putEx = (o: Record<string, Extra>) => { exRef.current = { ...exRef.current, ...o }; setEx(exRef.current); };
  const toggleFav = (uid: string) => setFavs((prev) => {
    const n = prev.includes(uid) ? prev.filter((x) => x !== uid) : [...prev, uid];
    try { localStorage.setItem('komikita_rk_fav', JSON.stringify(n)); } catch {}
    return n;
  });

  useEffect(() => {
    setMounted(true);
    try { const f = JSON.parse(localStorage.getItem('komikita_rk_fav') || '[]'); if (Array.isArray(f)) setFavs(f); } catch {}
    getUser().then((u) => { setMe(u || null); if (u) fetchExtras([u.uid], putEx, exRef.current); }).catch(() => {});
  }, []);

  // papan & tab mengikuti alamat (?board=reader|premium|charisma &tab=all|d30|d7), jadi banner langsung buka papan yang sesuai
  useEffect(() => {
    const id: BoardId = spBoard === 'premium' || spBoard === 'charisma' ? spBoard : 'reader';
    setBoard(id);
    setTab(id === 'charisma' ? (spTab === 'd30' || spTab === 'd7' ? spTab : 'all') : 'Semua');
  }, [spBoard, spTab]);

  const theme = THEMES[board || 'reader'];
  const key = board === 'charisma' ? 'charisma:' + tab : board || '';
  const cur = data[key];

  useEffect(() => {
    if (!board || data[key]) return;
    let alive = true;
    (async () => {
      let rows: BRow[] = [];
      let err = '';
      try { rows = await loadRows(board, tab, season.id); } catch (e: any) { err = e?.message || 'Gagal memuat peringkat'; }
      if (!alive) return;
      // 10 teratas (podium + layar pertama) dimuat dulu supaya nama & foto tidak berkedip
      await fetchExtras(rows.slice(0, 10).map((r) => r.uid), putEx, exRef.current);
      if (!alive) return;
      setData((d) => ({ ...d, [key]: { rows, err } }));
      fetchExtras(rows.slice(10).map((r) => r.uid), (o) => { if (alive) putEx(o); }, exRef.current);
    })();
    return () => { alive = false; };
  }, [board, tab, key]); // eslint-disable-line react-hooks/exhaustive-deps

  const rows = cur?.rows || [];
  const loading = !board || !cur;
  const list = rows;

  // posisi kamu
  const pts = mounted && mine.id === season.id ? mine.points + (mine.bonus || 0) : 0;
  const chapters = mounted && mine.id === season.id ? mine.chapters : 0;
  const night = mounted && mine.id === season.id ? mine.night : 0;
  const streak = mounted ? mine.streak : 0;
  const { next } = rankFor(pts);
  const targets = targetsFor(pts);
  const meEx = me ? ex[me.uid] : undefined;
  const meName = meEx?.displayName || me?.displayName || 'Pembaca';
  const myIndex = me ? rows.findIndex((r) => r.uid === me.uid) : -1;

  useEffect(() => {
    setMyCh(null);
    if (board !== 'charisma' || !me || !cur || rows.some((r) => r.uid === me.uid)) return;
    (async () => {
      try {
        const { db } = await getFirebase();
        const k = (charismaBuckets() as Record<string, string>)[tab] || 'all';
        setMyCh(Number((await db.ref(`charisma/${k}/${me.uid}`).get()).val()) || 0);
      } catch {}
    })();
  }, [board, tab, me, cur]); // eslint-disable-line react-hooks/exhaustive-deps

  let myVal = 0;
  if (board === 'reader') myVal = pts;
  else if (board === 'premium') { const pu = Number(meEx?.premiumUntil) || 0; myVal = pu > Date.now() ? Math.ceil((pu - Date.now()) / 86400000) : 0; }
  else if (myIndex >= 0) myVal = rows[myIndex].value;
  else myVal = myCh || 0;
  const myRank = myIndex >= 0 ? String(myIndex + 1) : me && myVal > 0 ? '100+' : '–';

  const pickBoard = (id: BoardId) => {
    setMenu(false);
    if (id === board) return;
    setBoard(id);
    setTab(id === 'charisma' ? 'all' : 'Semua');
    try { window.history.replaceState(null, '', '/ranking?board=' + id); } catch {}
  };
  const goBack = () => { if (window.history.length > 1) router.back(); else router.push('/'); };
  const tabIdx = Math.max(0, theme.tabs.findIndex((t) => t.k === tab));
  const valColor = theme.id === 'charisma' ? '#fff' : '#fff';

  return (
    <div className={'rk-root ' + mont.className} style={{ ['--u' as string]: 'min(1vw, 4.48px)', background: '#1B1A20', color: '#fff', minHeight: '100vh', paddingBottom: 170, maxWidth: 448, margin: '0 auto' } as CSSProperties}>
      <style>{`
a{text-decoration:none;color:inherit} button{font-family:inherit;cursor:pointer}
@keyframes rkIn{from{opacity:0;transform:translate3d(0,10px,0)}to{opacity:1;transform:none}}
@keyframes rkPod{from{opacity:0;transform:translate3d(0,26px,0) scale(.94)}to{opacity:1;transform:none}}
@keyframes rkTw{0%,100%{opacity:.15;transform:scale(.7)}50%{opacity:.75;transform:scale(1.1)}}
@keyframes rkFh{0%{transform:translate3d(0,0,0) scale(.7);opacity:0}15%{opacity:.5}100%{transform:translate3d(0,-300px,0) scale(1.1);opacity:0}}
.rk-row{animation:rkIn .4s ease both;content-visibility:auto;contain-intrinsic-size:auto 56px}
.rk-pod{animation:rkPod .55s cubic-bezier(.2,.9,.25,1.1) both}
.rk-pod1{animation-delay:.12s}.rk-pod2{animation-delay:0s}.rk-pod3{animation-delay:.2s}
.rk-tw{animation:rkTw 2.6s ease-in-out infinite;will-change:opacity,transform}
.rk-fh{animation:rkFh 11s linear infinite;will-change:transform,opacity}
.rk-tap{display:flex;transition:transform .15s}.rk-tap:active{transform:scale(.96)}
.rk-r{transition:transform .15s}.rk-r:active{transform:scale(.985)}
.rk-fav{-webkit-tap-highlight-color:transparent}.rk-fav:active svg{transform:scale(.8)!important}
@media (prefers-reduced-motion:reduce){.rk-row,.rk-pod,.rk-tw,.rk-fh{animation:none!important}}
`}</style>

      {/* header */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: U(2), padding: `${U(3.4)} ${U(3)} ${U(1.4)}` }}>
        <button onClick={goBack} aria-label="Kembali" style={{ background: 'none', border: 0, padding: 6, display: 'flex', color: '#fff' }}>
          <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
        </button>
        <button onClick={() => setMenu((m) => !m)} aria-label="Ganti papan" style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 0, color: '#fff', padding: '4px 4px', textAlign: 'left' }}>
          <span style={{ fontSize: F(4.6, 17), fontWeight: 700, letterSpacing: -0.4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{theme.title}</span>
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" style={{ flex: '0 0 auto', transform: menu ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}><path d="M6 9l6 6 6-6" /></svg>
        </button>
        <button onClick={() => setSheet(true)} aria-label="Info peringkat" style={{ background: 'none', border: 0, padding: 8, display: 'flex' }}>
          <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#D5D3DE" strokeWidth={1.8} strokeLinecap="round"><circle cx={12} cy={12} r={9.5} /><line x1={12} y1={11} x2={12} y2={17} /><circle cx={12} cy={7.6} r={0.6} fill="#D5D3DE" /></svg>
        </button>

        {menu && (
          <>
            <div onClick={() => setMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 30 }} />
            <div style={{ position: 'absolute', left: U(10), top: U(15), zIndex: 31, width: 'min(300px, calc(100% - 60px))', background: '#26252D', border: '1px solid rgba(255,255,255,.12)', borderRadius: 18, padding: 6, boxShadow: '0 12px 32px rgba(0,0,0,.5)', animation: 'rkIn .18s ease both' }}>
              {BOARD_ORDER.map((id) => {
                const t = THEMES[id]; const on = id === board;
                return (
                  <button key={id} onClick={() => pickBoard(id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 13, border: 0, background: on ? 'rgba(255,255,255,.08)' : 'transparent', color: '#fff', textAlign: 'left' }}>
                    <span style={{ width: 34, height: 34, borderRadius: 11, background: t.bgTop, border: `1.5px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 34px' }}><BoardIcon id={id} color={t.accent} /></span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 16, fontWeight: 700, letterSpacing: -0.3 }}>{t.title}</span>
                      <span style={{ display: 'block', fontSize: 12, fontWeight: 500, color: MUTED }}>{BOARD_SUB[id]}</span>
                    </span>
                    {on && <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={t.accent} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg>}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* tab (segmen) */}
      {theme.tabs.length > 0 && (
        <div style={{ position: 'relative', margin: `${U(1.4)} ${U(4)} 0`, display: 'flex', borderRadius: U(2.8), border: '1px solid rgba(255,255,255,.16)', background: '#131318', padding: U(0.8) }}>
          <span aria-hidden style={{ position: 'absolute', top: U(0.8), bottom: U(0.8), left: U(0.8), width: `calc((100% - ${U(1.6)}) / ${theme.tabs.length})`, borderRadius: U(2.2), background: theme.accent, transform: `translateX(${tabIdx * 100}%)`, transition: 'transform .32s cubic-bezier(.3,1.25,.4,1), background .3s' }} />
          {theme.tabs.map((t) => (
            <button key={t.k} onClick={() => setTab(t.k)} style={{ position: 'relative', zIndex: 1, flex: 1, border: 0, background: 'none', padding: `${U(2.5)} 0`, fontSize: F(3.2, 13), fontWeight: 700, letterSpacing: -0.1, color: tab === t.k ? theme.accentText : '#B4B2BE', transition: 'color .25s' }}>{t.label}</button>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ padding: '90px 20px', textAlign: 'center', color: MUTED, fontWeight: 600 }}>Memuat peringkat...</div>
      ) : cur?.err ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: MUTED, fontWeight: 600, lineHeight: 1.4 }}>
          Peringkat belum bisa dimuat.
          <div style={{ fontSize: 11.5, marginTop: 8, opacity: 0.8 }}>{cur.err}</div>
        </div>
      ) : list.length === 0 ? (
        <div style={{ padding: '70px 20px', textAlign: 'center', color: MUTED, fontWeight: 600, lineHeight: 1.5 }}>
          {board === 'premium' ? <>Belum ada pengguna Premium aktif.<br />Jadi yang pertama lewat menu Premium.</> : board === 'charisma' ? <>Belum ada hati yang diterima di periode ini.<br />Komentar yang disukai akan muncul di sini.</> : <>Belum ada pembaca di peringkat ini.<br />Baca chapter untuk jadi yang pertama.</>}
        </div>
      ) : (
        <>
          <Podium rows={list} ex={ex} theme={theme} tab={tab} chip={theme.chip(tab, season.daysLeft, season.id)} favs={favs} onFav={toggleFav} />

          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: `${U(5.2)} ${U(4)} ${U(2.4)}` }}>
            <div style={{ fontSize: F(3.7, 16), fontWeight: 700, letterSpacing: -0.4 }}>{theme.section(tab)}</div>
            <div style={{ fontSize: F(2.4, 11), fontWeight: 700, color: MUTED }}>4–100</div>
          </div>

          <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: U(2), padding: `0 ${U(3.1)}` }}>
            {list.slice(3).map((r, i) => {
              const e = ex[r.uid];
              const nm = e?.displayName || r.name;
              const hasWp = !!(e?.activeWallpaper && WALLPAPER_CATALOG[e.activeWallpaper]);
              const mineRow = me && r.uid === me.uid;
              return (
                <div key={r.uid} className="rk-row" style={{ animationDelay: Math.min(i, 12) * 0.03 + 's' }}>
                  <WallpaperBg wpKey={e?.activeWallpaper} noGlow className="rk-r" style={{ borderRadius: U(3), borderStyle: 'solid', borderWidth: 1, ...(hasWp ? {} : { borderColor: mineRow ? theme.accent : 'rgba(255,255,255,.09)', background: '#1D1D21' }) }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <Link href={`/user?uid=${r.uid}`} style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: U(2.2), padding: `${U(1.9)} 0 ${U(1.9)} ${U(1.2)}`, color: 'inherit', textDecoration: 'none' }}>
                        <span style={{ width: U(6.8), flex: `0 0 ${U(6.8)}`, textAlign: 'center', fontSize: F(3.5, 15), fontWeight: 700, letterSpacing: -0.3 }}>{i + 4}</span>
                        <Ava name={nm} photo={e?.photoURL || r.photo} size={`max(38px, ${U(10.2)})`} ring={ringFor(r.uid)} ringW={U(0.6)} borderKey={e?.activeBorder} />
                        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: U(1) }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: U(2) }}>
                            <div style={{ minWidth: 0, flex: '1 1 auto' }}><NameLine name={nm} ex={e} size={F(3.15, 13.5)} weight={600} /></div>
                            <Valtxt b={theme.id} v={r.value} size={F(3.2, 13.5)} unit={theme.unit} color={valColor} />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: U(1.3), overflow: 'hidden', flexWrap: 'nowrap' }}>
                            {e?.level !== undefined && <span style={{ flex: '0 0 auto' }}><LvPill lv={Number(e.level) || 1} /></span>}
                            <span style={{ flex: '0 0 auto', fontSize: F(2.3, 10), fontWeight: 600, color: MUTED }}>{formatShortId(e?.shortId, r.uid)}</span>
                          </div>
                        </div>
                      </Link>
                      <div style={{ padding: `0 ${U(1)}` }}><FavBtn on={favs.includes(r.uid)} onToggle={() => toggleFav(r.uid)} /></div>
                    </div>
                  </WallpaperBg>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Posisi kamu (menempel di atas navbar) */}
      <div style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', width: 'min(100%, 448px)', bottom: 'calc(74px + env(safe-area-inset-bottom, 0px))', padding: '8px 14px', background: '#1B1A20', borderTop: '1px solid rgba(255,255,255,.12)', zIndex: 40 }}>
        {me ? (
          <WallpaperBg wpKey={meEx?.activeWallpaper} noGlow style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#1B1A20', border: `2px solid ${theme.accent}`, borderRadius: 18, padding: '8px 12px' }}>
            <span style={{ minWidth: 42, textAlign: 'center', fontSize: myRank.length > 3 ? 17 : 20, fontWeight: 800, letterSpacing: -0.5 }}>{myRank}</span>
            <Ava name={meName} photo={meEx?.photoURL || me.photoURL} size="38px" ring={theme.accent} ringW={2} borderKey={meEx?.activeBorder} />
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
              <NameLine name={meName} ex={meEx} size="15px" weight={700} prefix="Kamu · " />
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {meEx?.level !== undefined && <LvPill lv={Number(meEx.level) || 1} />}
                <span style={{ fontSize: 11, fontWeight: 600, color: MUTED }}>{me ? formatShortId(meEx?.shortId, me.uid) : ''}</span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <Valtxt b={theme.id} v={myVal} size="17px" unit={theme.unit} color="#fff" />
            </div>
          </WallpaperBg>
        ) : (
          !loading && (
            <Link href="/profile" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#1B1A20', border: `2px solid ${theme.accent}`, borderRadius: 16, padding: '10px 14px', fontSize: 14, fontWeight: 700 }}>
              <span>Masuk untuk ikut peringkat</span>
              <span style={{ background: theme.accent, color: theme.accentText, padding: '8px 18px', borderRadius: 99 }}>Masuk</span>
            </Link>
          )
        )}
      </div>

      {/* Lembar info: aturan, progres, lencana */}
      {sheet && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div onClick={() => setSheet(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.6)' }} />
          <div style={{ position: 'relative', background: '#16151A', borderRadius: '28px 28px 0 0', maxHeight: '82vh', overflowY: 'auto', padding: '14px 20px 28px', width: 'min(100%, 448px)', margin: '0 auto' }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,.2)', margin: '0 auto 16px' }} />
            {board === 'reader' && (
              <>
                <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -1 }}>Season {season.id}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: MUTED, marginTop: 2 }}>{season.label} · {season.daysLeft} hari lagi</div>
                <div style={{ background: '#2A2931', borderRadius: 16, padding: 16, marginTop: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: 0.8, color: MUTED }}>{next ? `LENCANA BERIKUTNYA · ${next.track.toUpperCase()}` : 'LENCANA TERTINGGI'}</div>
                      <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.6, lineHeight: 1.15 }}>{next ? next.name : rankFor(pts).rank.name}</div>
                    </div>
                    {next && <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.8 }}>{fmtC(pts)}<span style={{ fontSize: 14, color: MUTED }}>/ {fmt(next.min)}</span></div>}
                  </div>
                  <div style={{ height: 8, borderRadius: 4, background: MAROON, marginBottom: 12 }}>
                    <div style={{ width: `${next ? Math.min(100, (pts / next.min) * 100) : 100}%`, height: '100%', borderRadius: 4, background: GREEN }} />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <MiniStat label="Chapter" value={chapters} target={targets.chapter} />
                    <MiniStat label="Streak" value={streak} target={targets.streak} unit="hari" />
                    <MiniStat label="Malam" value={night} target={targets.night} />
                  </div>
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -1, margin: '22px 0 8px' }}>Cara dapat XP</div>
                <div style={{ color: '#D6D4DE', fontWeight: 700, fontSize: 14, lineHeight: 1.6 }}>
                  • {POINTS_PER_CHAPTER} XP tiap chapter baru dibaca<br />
                  • +{DAILY_BONUS} XP untuk chapter pertama tiap hari<br />
                  • +{NIGHT_BONUS} XP kalau baca jam 22.00–04.59<br />
                  • Chapter yang sama hanya dihitung sekali per musim<br />
                  • XP direset tiap musim (2 bulan)
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '22px 0 10px' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -1 }}>Daftar lencana</div>
                  <Link href="/ranking/lencana" style={{ fontSize: 13, fontWeight: 800, color: theme.accent }}>Lihat semua</Link>
                </div>
                {RANKS.map((r) => (
                  <div key={r.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: r.bg, padding: '4px 12px 4px 6px', borderRadius: 99, fontSize: 14, fontWeight: 800 }}><Shield color={r.bg} />{r.name}</span>
                    <span style={{ color: MUTED, fontWeight: 800, fontSize: 14 }}>{r.track} · {fmt(r.min)} XP</span>
                  </div>
                ))}
              </>
            )}
            {board === 'premium' && (
              <>
                <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -1 }}>Top Premium</div>
                <div style={{ color: '#D6D4DE', fontWeight: 700, fontSize: 14, lineHeight: 1.6, marginTop: 8 }}>
                  • Urutan berdasarkan sisa hari Premium terbanyak<br />
                  • Perpanjang Premium untuk naik peringkat<br />
                  • Hanya akun yang aktif membaca musim ini yang tampil
                </div>
                <Link href="/premium" style={{ display: 'block', textAlign: 'center', marginTop: 18, background: theme.accent, color: theme.accentText, fontWeight: 800, fontSize: 16, padding: '13px 0', borderRadius: 99 }}>Lihat paket Premium</Link>
              </>
            )}
            {board === 'charisma' && (
              <>
                <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -1 }}>Paling Dicintai</div>
                <div style={{ color: '#D6D4DE', fontWeight: 700, fontSize: 14, lineHeight: 1.6, marginTop: 8 }}>
                  • Charisma = jumlah hati yang diterima komentar kamu<br />
                  • All Time menghitung sepanjang waktu, Bulan Ini dan Minggu Ini direset otomatis<br />
                  • Minggu dimulai tiap hari Senin
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function RankingPage() {
  return (
    <Suspense fallback={<div style={{ background: '#1B1A20', minHeight: '100vh' }} />}>
      <RankingInner />
    </Suspense>
  );
}
