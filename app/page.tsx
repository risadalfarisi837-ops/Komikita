'use client';

import { useEffect, useState, memo, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useHistory } from '@/lib/store';
import { primeGameFullscreen } from '@/components/GameMode';
import { currentSeason } from '@/lib/season';
import { charismaBuckets } from '@/lib/charisma';
import { LevelPill } from '@/components/LevelPill';
import ExpBar from '@/components/ExpBar';
import { getFirebase } from '@/lib/leaderboard';

// ─── Firebase ────────────────────────────────────────────────────────────────
declare global { interface Window { firebase: any; _fbReady: boolean; } }
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDOVdnkjnjTfNMMIBT68WPOMGPH6MGbakI",
  authDomain: "komikita-11c46.firebaseapp.com",
  databaseURL: "https://komikita-11c46-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "komikita-11c46",
  storageBucket: "komikita-11c46.firebasestorage.app",
  messagingSenderId: "1001217731870",
  appId: "1:1001217731870:web:2343f4c4aa06496cfcad0f",
  measurementId: "G-LE9NQH23YR"
};
// Loader Firebase dipakai bersama dari lib/leaderboard

interface TopUser {
  uid: string; displayName: string; photoURL: string;
  level: number; koin: number; role: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getFlag(title: string, type?: string, flagField?: string): string {
  if (flagField) return flagField; // dari scraper langsung
  if (type) {
    const t = type.toLowerCase();
    if (t.includes('manhua')) return '🇨🇳';
    if (t.includes('manhwa') || t.includes('webtoon')) return '🇰🇷';
    if (t.includes('manga')) return '🇯🇵';
    if (t.includes('comic')) return '🇺🇸';
  }
  // fallback tebak dari judul
  const tl = title.toLowerCase();
  if (tl.includes('manhua') || tl.includes('chinese')) return '🇨🇳';
  if (tl.includes('manga') || tl.includes('japanese')) return '🇯🇵';
  return '🇰🇷';
}
function getRating(desc: string): string | null {
  if (!desc) return null;
  const m = desc.match(/Score:\s*([\d.]+)/i);
  if (!m) return null;
  const n = parseFloat(m[1]);
  return (isNaN(n) || n <= 0) ? null : n.toFixed(1);
}

// ─── Warna & util ────────────────────────────────────────────────────────────
const ACCENT = '#FF6B6B';
const CARD = '#2A2931';
const MUTED = '#8F8D9B';

function typeLabel(item: any): string {
  const f = getFlag(item.title, item.type, item.flag);
  if (f === '🇰🇷') return 'Manhwa';
  if (f === '🇨🇳') return 'Manhua';
  if (f === '🇯🇵') return 'Manga';
  return 'Komik';
}
const clamp = (n: number): React.CSSProperties => ({ display: '-webkit-box', WebkitLineClamp: n, WebkitBoxOrient: 'vertical', overflow: 'hidden' });
const ell: React.CSSProperties = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };

// ─── Header: kartu profil (level + EXP) + search + Minigame ─────────────────
function Header({ onSearch }: { onSearch: () => void }) {
  const router = useRouter();
  const [hasGift, setHasGift] = useState(false);
  const [me, setMe] = useState<{ name: string; photo: string; level: number; exp: number } | null>(null);
  const [ready, setReady] = useState(false);   // false = masih memuat → tampil kerangka, bukan data default "Komikita / Lvl. 1"
  useEffect(() => {
    let alive = true;
    // Tampilkan profil terakhir dari cache langsung (sebelum Firebase siap) supaya tidak ada kedipan data default
    let cached = false;
    try {
      const c = JSON.parse(localStorage.getItem('komikita-home-me') || 'null');
      if (c && typeof c.name === 'string') { setMe({ name: c.name, photo: c.photo || '', level: Math.max(1, Number(c.level) || 1), exp: Math.max(0, Number(c.exp) || 0) }); setHasGift(!!c.gift); setReady(true); cached = true; }
    } catch {}
    const t = setTimeout(async () => {
      try {
        const { auth, db } = await getFirebase();
        const u: any = auth.currentUser || await new Promise((res) => { const un = auth.onAuthStateChanged((x: any) => { un(); res(x); }); });
        if (!alive) return;
        if (!u) { try { localStorage.removeItem('komikita-home-me'); } catch {} setMe(null); setHasGift(false); setReady(true); return; }
        const d = (await db.ref(`users/${u.uid}`).get()).val() || {};
        if (!alive) return;
        const lv = Math.max(1, Math.floor(Number(d.level) || 1));
        const rawExp = d.exp === undefined || d.exp === null || !Number.isFinite(Number(d.exp)) ? (lv - 1) * 200 : Number(d.exp);
        const fresh = { name: d.displayName || u.displayName || 'User', photo: d.photoURL || u.photoURL || '', level: lv, exp: Math.max(0, Math.min(199, Math.floor(rawExp - (lv - 1) * 200))) };
        const v = d.gifts || {};
        const gift = Object.values(v).some((g: any) => g && !g.claimed);
        setMe(fresh); setHasGift(gift); setReady(true);
        try { localStorage.setItem('komikita-home-me', JSON.stringify({ ...fresh, gift })); } catch {}
      } catch { if (alive) setReady(true); }
    }, cached ? 1200 : 250);
    return () => { alive = false; clearTimeout(t); };
  }, []);

  const level = me ? me.level : 1; // level diambil dari data level akun (bisa diset dari Dev)
  const BOX: React.CSSProperties = { background: '#26252C', border: '1px solid #3A3942', borderRadius: 20 };

  return (
    <div style={{ padding: '14px 14px 8px' }}>
      <div style={{ ...BOX, padding: '12px 15px 11px', borderRadius: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/profile" style={{ flex: '0 0 auto' }}>
          {!ready ? (
            <div style={{ width: 54, height: 54, borderRadius: '50%', background: '#3A3942' }} />
          ) : me?.photo ? (
            <img decoding="async" src={me.photo} alt="" referrerPolicy="no-referrer" style={{ width: 54, height: 54, borderRadius: '50%', objectFit: 'cover', border: '2px solid #3A3942', display: 'block' }} />
          ) : (
            <div style={{ width: 54, height: 54, borderRadius: '50%', background: '#3A3942', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 800 }}>{(me?.name || 'K').slice(0, 1).toUpperCase()}</div>
          )}
        </Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          {ready ? (
            <>
              <div style={{ ...ell, fontSize: 17, fontWeight: 800, letterSpacing: -0.5 }}>{me?.name || 'Komikita'}</div>
              <div style={{ marginTop: 6 }}><LevelPill level={level} label="Lvl." fontSize="13px" iconSize={15} style={{ padding: '3px 12px 3px 8px' }} /></div>
            </>
          ) : (
            <>
              <div style={{ width: 120, height: 18, borderRadius: 9, background: '#3A3942' }} />
              <div style={{ width: 74, height: 26, borderRadius: 99, background: '#33323A', marginTop: 8 }} />
            </>
          )}
        </div>
        <button onClick={() => { window.location.assign('/notifikasi'); }} aria-label="Notifikasi" style={{ position: 'relative', flex: '0 0 auto', width: 52, height: 52, borderRadius: '50%', background: '#3A3942', border: 0, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 01-3.4 0" /></svg>
          {hasGift && <span style={{ position: 'absolute', top: 12, right: 13, width: 9, height: 9, borderRadius: '50%', background: ACCENT }} />}
        </button>
      </div>
      <div style={{ marginTop: 11 }}>
        {ready ? <ExpBar level={level} exp={me ? me.exp : 0} max={200} /> : <div style={{ height: 10, borderRadius: 5, background: '#3A3942', margin: '9px 0' }} />}
      </div>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
        <button onClick={onSearch} style={{ ...BOX, flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', height: 54, color: MUTED, fontSize: 16, textAlign: 'left' }}>
          <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth={2} strokeLinecap="round"><circle cx={11} cy={11} r={7.5} /><line x1={21} y1={21} x2={16.5} y2={16.5} /></svg>
          <span style={ell}>Cari komik di sini</span>
        </button>
        <button onClick={() => router.push('/komikstore')} style={{ ...BOX, flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 10, padding: '0 18px', height: 54, color: '#fff', fontSize: 16, fontWeight: 800 }}>
          <svg width={26} height={26} viewBox="0 0 24 24" fill="#4ADE80"><path d="M7 7h10a5 5 0 014.9 6l-.9 4.3a2.6 2.6 0 01-4.4 1.3L15 17H9l-1.6 1.6A2.6 2.6 0 013 17.3L2.1 13A5 5 0 017 7zm1 3v1.5H6.5V13H8v1.5h1.5V13H11v-1.5H9.5V10H8zm7.5.5a1 1 0 100 2 1 1 0 000-2zm2 2a1 1 0 100 2 1 1 0 000-2z" /></svg>
          Minigame
        </button>
      </div>
    </div>
  );
}

// ─── Banner geser: video promo + 3 papan peringkat otomatis ───────────────────
// Semua datanya dihitung sendiri dari aktivitas user (tidak perlu diisi manual):
//   Top Premium  = pengguna dengan sisa hari premium terbanyak
//   Top Charisma = pengguna yang komentarnya paling banyak dapat hati (ALL / bulan ini / minggu ini)
//   Top Pembaca  = poin baca terbanyak musim ini
// Papan yang belum punya data otomatis disembunyikan.
const BANNERS = [
  { id: 'mancing', video: '/banner/komikita-fish.mp4', poster: '/banner/komikita-fish.jpg', href: '/komikstore/mancing' },
];

type BoardRow = { name: string; photo?: string; value: number; sub?: string };
type BoardTheme = {
  id: 'giveaway' | 'charisma' | 'reader'; title: string; href: string; tabs: boolean; tabLabels?: [string, string, string];
  border: string; bg: string; titleColor: string; accent: string; accentText: string; glow: string; unit: string; fmt: (n: number) => string;
};
const nf = (n: number) => Math.round(n).toLocaleString('id-ID');
const BOARDS: BoardTheme[] = [
  { id: 'giveaway', title: 'TOP PREMIUM', href: '/ranking?board=premium', tabs: false, border: '#23899F', bg: 'radial-gradient(85% 120% at 6% 0%, #17758F 0%, rgba(23,117,143,0) 62%), radial-gradient(75% 100% at 100% 100%, #082B3B 0%, rgba(8,43,59,0) 70%), linear-gradient(155deg, #0F4A5E 0%, #12657A 48%, #0A3849 100%)', titleColor: '#D5DEE3', accent: '#2DD4E8', accentText: '#06303A', glow: 'rgba(45,212,232,.25)', unit: 'hari premium', fmt: nf },
  { id: 'reader', title: 'TOP PEMBACA', href: '/ranking?board=reader', tabs: false, border: '#6E6D76', bg: 'radial-gradient(85% 120% at 6% 0%, #5E5E67 0%, rgba(94,94,103,0) 62%), radial-gradient(75% 100% at 100% 100%, #1D1D21 0%, rgba(29,29,33,0) 70%), linear-gradient(155deg, #3B3B41 0%, #55555D 48%, #28282D 100%)', titleColor: '#C4C4C9', accent: '#F5C451', accentText: '#2A2208', glow: 'rgba(255,255,255,.14)', unit: 'XP musim ini', fmt: nf },
];

// Cahaya latar di balik banner: berubah halus mengikuti slide yang aktif
const GLOW: Record<string, string> = {
  banner: 'rgba(59,155,255,.20)',
  giveaway: 'rgba(45,212,232,.36)',
  charisma: 'rgba(255,92,154,.34)',
  reader: 'rgba(190,196,210,.24)',
};

const BOARD_CACHE = 'komikita_boards_v2';
const BOARD_TTL = 10 * 60 * 1000;

async function loadBoards(): Promise<Record<string, Record<string, BoardRow[]>>> {
  const { db } = await getFirebase();
  const now = Date.now();
  const out: Record<string, Record<string, BoardRow[]>> = {};
  const season = db.ref(`leaderboard/s${currentSeason().id}`);

  // Top Premium: sisa hari premium terbanyak (kolom prem = premiumUntil, diisi tiap user buka aplikasi)
  try {
    const snap = await season.orderByChild('prem').limitToLast(5).get();
    const rows: BoardRow[] = [];
    snap.forEach((c: any) => {
      const v = c.val() || {};
      const left = Math.ceil(((Number(v.prem) || 0) - now) / 86400000);
      if (left > 0) rows.push({ name: v.name || 'User', photo: v.photo || '', value: left });
    });
    out.giveaway = { all: rows.sort((a, b) => b.value - a.value) };
  } catch {}

  // Top Pembaca: poin musim ini (hanya akun aktif 14 hari terakhir)
  try {
    const snap = await season.orderByChild('points').limitToLast(12).get();
    const rows: BoardRow[] = [];
    snap.forEach((c: any) => {
      const v = c.val() || {};
      if ((Number(v.t) || 0) >= now - 14 * 86400000 && Number(v.points) > 0) rows.push({ name: v.name || 'User', photo: v.photo || '', value: Number(v.points) });
    });
    out.reader = { all: rows.sort((a, b) => b.value - a.value).slice(0, 5) };
  } catch {}

  return out;
}

// Muat papan sekali (di-cache 10 menit supaya hemat kuota & cepat).
function useBoards() {
  const [data, setData] = useState<Record<string, Record<string, BoardRow[]>>>({});
  useEffect(() => {
    let dead = false;
    try {
      const raw = localStorage.getItem(BOARD_CACHE);
      if (raw) {
        const { d, ts } = JSON.parse(raw);
        if (d) setData(d);
        if (Date.now() - ts < BOARD_TTL) return;
      }
    } catch {}
    const t = setTimeout(() => {
      loadBoards().then((d) => {
        if (dead) return;
        setData(d);
        try { localStorage.setItem(BOARD_CACHE, JSON.stringify({ d, ts: Date.now() })); } catch {}
      }).catch(() => {});
    }, 800);
    return () => { dead = true; clearTimeout(t); };
  }, []);
  return data;
}

function Sparkles({ color }: { color: string }) {
  // [kiri%, atas%, ukuran, bintang(true)/titik(false)]
  const dots: [number, number, number, boolean][] = [[7, 12, 15, true], [60, 18, 11, true], [93, 30, 8, true], [38, 6, 4, false], [88, 88, 5, false], [5, 74, 4, false], [47, 94, 9, true], [70, 52, 4, false], [97, 66, 4, false], [26, 40, 3, false]];
  return (
    <>
      {dots.map(([l, t, z, star], i) => (
        <svg key={i} aria-hidden className="bs-twk" width={z} height={z} viewBox="0 0 24 24" style={{ position: 'absolute', left: l + '%', top: t + '%', opacity: star ? 0.7 : 0.5, pointerEvents: 'none', filter: star ? `drop-shadow(0 0 5px ${color})` : 'none', animation: `bsTwk ${2.4 + (i % 4) * 0.45}s ease-in-out ${(i * 0.37) % 2.2}s infinite` }}>
          {star ? <path d="M12 0l2.6 9.4L24 12l-9.4 2.6L12 24l-2.6-9.4L0 12l9.4-2.6z" fill="#fff" /> : <circle cx={12} cy={12} r={10} fill="#fff" />}
        </svg>
      ))}
    </>
  );
}

function BoardAvatar({ row, size, ring, rank, crown }: { row: BoardRow; size: number; ring: string; rank: number; crown?: boolean }) {
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: `0 0 ${size}px` }}>
      {crown && <svg aria-hidden width={size * 0.42} height={size * 0.3} viewBox="0 0 24 18" style={{ position: 'absolute', left: '50%', top: -size * 0.2, transform: 'translateX(-50%)', zIndex: 2 }}><path d="M1 5l5 4 6-8 6 8 5-4-2 12H3z" fill="#FFC53D" /></svg>}
      <div style={{ width: '100%', height: '100%', borderRadius: '50%', border: `${Math.max(2, size * 0.07)}px solid ${ring}`, boxShadow: rank === 1 ? `0 0 14px ${ring}66` : 'none', overflow: 'hidden', background: '#2A2931', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: size * 0.36 }}>
        {row.photo
          // eslint-disable-next-line @next/next/no-img-element
          ? <img decoding="async" src={row.photo} alt="" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : row.name.slice(0, 2).toUpperCase()}
      </div>
      <span style={{ position: 'absolute', right: -2, bottom: -2, width: size * 0.34, height: size * 0.34, minWidth: 18, minHeight: 18, borderRadius: '50%', background: rank === 1 ? '#FBBF24' : '#17161C', color: rank === 1 ? '#2A2208' : '#fff', border: `2px solid ${rank === 1 ? '#14131A' : rank === 2 ? '#C9D1DA' : '#C99A3A'}`, boxSizing: 'border-box', fontSize: Math.max(10, size * 0.2), fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{rank}</span>
    </div>
  );
}

const Heart = ({ size = 14, color = '#FF5C9A' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden><path d="M12 21s-8-5-8-11a4.6 4.6 0 018-3 4.6 4.6 0 018 3c0 6-8 11-8 11z" /></svg>
);

function BoardSlide({ theme, rowsByTab, onOpen }: { theme: BoardTheme; rowsByTab: Record<string, BoardRow[]>; onOpen: (tab: string) => void }) {
  const [tab, setTab] = useState<'all' | 'd30' | 'd7'>('all');
  const [shown, setShown] = useState<'all' | 'd30' | 'd7'>('all'); // isi yang tampil (menyusul tab setelah fade-out)
  const [fading, setFading] = useState(false);
  const swapTimer = useRef<any>(null);
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [pill, setPill] = useState({ l: 0, w: 0 });
  useEffect(() => () => { if (swapTimer.current) clearTimeout(swapTimer.current); }, []);
  useEffect(() => {
    const b = btnRefs.current[tab];
    if (b) setPill({ l: b.offsetLeft, w: b.offsetWidth });
  }, [tab, theme.tabs]);
  const pick = (k: 'all' | 'd30' | 'd7') => {
    if (k === tab) return;
    setTab(k);
    setFading(true);
    if (swapTimer.current) clearTimeout(swapTimer.current);
    swapTimer.current = setTimeout(() => { setShown(k); setFading(false); }, 170);
  };
  const labels = theme.tabLabels || ['ALL', '30D', '7D'];
  const rows = (theme.tabs ? rowsByTab[shown] : rowsByTab.all) || [];
  const [r1, r2, r3, r4, r5] = rows;
  const val = (r: BoardRow, color = '#fff') => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color, fontWeight: 800, letterSpacing: -0.3 }}>
      {theme.id === 'charisma' && <Heart />}{theme.fmt(r.value)}
    </span>
  );
  const tabBtn = (k: 'all' | 'd30' | 'd7', label: string) => (
    <button key={k} ref={(el) => { btnRefs.current[k] = el; }} onClick={(e) => { e.stopPropagation(); pick(k); }} style={{ position: 'relative', zIndex: 1, border: 0, borderRadius: 99, padding: '6px 14px', fontSize: 12.5, fontWeight: 800, background: 'transparent', color: tab === k ? theme.accentText : '#9AA6B2', transition: 'color .25s' }}>{label}</button>
  );
  const GOLD_ICON = '#F4C542';
  const TitleIcon = theme.id === 'charisma' ? <Heart size={15} color={theme.accent} /> : theme.id === 'reader'
    ? <svg width={16} height={16} viewBox="0 0 24 24" fill={GOLD_ICON} aria-hidden><path d="M7 3h10v3h3v3a4 4 0 01-4 4 5 5 0 01-3 2.9V18h3v3H8v-3h3v-2.1A5 5 0 018 13a4 4 0 01-4-4V6h3z" /></svg>
    : <svg width={17} height={17} viewBox="0 0 24 24" fill={GOLD_ICON} aria-hidden><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5L3 8z" /></svg>;

  return (
    <div role="button" onClick={() => onOpen(tab)} style={{ position: 'relative', flex: '0 0 100%', aspectRatio: '984 / 446', borderRadius: 20, overflow: 'hidden', scrollSnapAlign: 'start', cursor: 'pointer', background: theme.bg, border: `2.5px solid ${theme.border}`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,.22), inset 0 0 28px rgba(255,255,255,.05), 0 6px 22px rgba(0,0,0,.35)', boxSizing: 'border-box', padding: '3.2% 3.4%', display: 'flex', flexDirection: 'column', gap: '3%' }}>
      <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(115deg, rgba(255,255,255,.13) 0%, rgba(255,255,255,0) 34%, rgba(255,255,255,0) 70%, rgba(255,255,255,.05) 100%)' }} />
      <Sparkles color={theme.accent} />
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: theme.titleColor, fontSize: 14, fontWeight: 800, letterSpacing: 1.5, textShadow: '0 1px 3px rgba(0,0,0,.4)' }}>
          {TitleIcon}{theme.title}
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#9AA6B2" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><path d="M9 5l7 7-7 7" /></svg>
        </div>
        {theme.tabs && (
          <div style={{ position: 'relative', display: 'flex', background: 'rgba(0,0,0,.28)', borderRadius: 99, padding: 2 }}>
            <span aria-hidden style={{ position: 'absolute', top: 2, bottom: 2, left: pill.l, width: pill.w, borderRadius: 99, background: theme.accent, transition: pill.w ? 'left .3s cubic-bezier(.3,1.25,.4,1), width .3s ease' : 'none' }} />
            {tabBtn('all', labels[0])}{tabBtn('d30', labels[1])}{tabBtn('d7', labels[2])}
          </div>
        )}
      </div>

      <div key={shown} style={{ position: 'relative', flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '38% 1fr', gap: '2.5%', opacity: fading ? 0 : 1, transition: 'opacity .17s ease' }}>
        {r1 ? (
          <div className="bs-in" style={{ animationDelay: '0s', borderRadius: 17, border: '2.5px solid transparent', background: 'linear-gradient(160deg, rgba(112,88,36,.62), rgba(28,26,22,.78)) padding-box, linear-gradient(160deg, #F6D879 0%, #B98B2B 55%, #E3B94F 100%) border-box', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.12), 0 4px 14px rgba(0,0,0,.28)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, padding: '6px 4px', minWidth: 0 }}>
            <BoardAvatar row={r1} size={58} ring="#F2C14E" rank={1} crown />
            <div style={{ fontSize: 14.5, fontWeight: 800, letterSpacing: -0.2, textShadow: '0 1px 3px rgba(0,0,0,.45)', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 4 }}>{r1.name}</div>
            <div style={{ fontSize: 19, lineHeight: 1.05, textShadow: '0 0 12px rgba(242,193,78,.45)' }}>{val(r1, '#F7CB5B')}</div>
            <div style={{ fontSize: 11.5, color: '#B4BEC8', fontWeight: 600 }}>{theme.unit}</div>
          </div>
        ) : <div />}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4%', minWidth: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[r2, r3].map((r, i) => r ? (
              <div key={i} className="bs-in" style={{ animationDelay: `${0.12 + i * 0.1}s`, borderRadius: 15, border: '2.5px solid transparent', background: (i === 0 ? 'linear-gradient(160deg, rgba(255,255,255,.17), rgba(255,255,255,.05))' : 'linear-gradient(160deg, rgba(196,146,52,.30), rgba(58,38,14,.38))') + ' padding-box, ' + (i === 0 ? 'linear-gradient(160deg, #F1F4F7, #9FA8B3 55%, #D9DEE4)' : 'linear-gradient(160deg, #F0C56A, #A8762A 55%, #D9A64B)') + ' border-box', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.1)', padding: '6px 8px', minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                  <BoardAvatar row={r} size={30} ring={i === 0 ? '#C9D1DA' : '#C99A3A'} rank={i + 2} />
                  <span style={{ fontSize: 14.5 }}>{val(r)}</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: -0.2, textShadow: '0 1px 3px rgba(0,0,0,.4)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
              </div>
            ) : <div key={i} />)}
          </div>
          {[r4, r5].map((r, i) => r ? (
            <div key={i} className="bs-in" style={{ animationDelay: `${0.34 + i * 0.1}s`, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, borderTop: i === 1 ? '1px solid rgba(255,255,255,.16)' : 0, paddingTop: i === 1 ? 4 : 0, textShadow: '0 1px 2px rgba(0,0,0,.35)' }}>
              <span style={{ width: 14, color: '#9AA6B2', fontWeight: 800 }}>{i + 4}</span>
              <div style={{ width: 22, height: 22, flex: '0 0 22px', borderRadius: '50%', overflow: 'hidden', background: '#2A2931', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800 }}>
                {r.photo
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img decoding="async" src={r.photo} alt="" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : r.name.slice(0, 2).toUpperCase()}
              </div>
              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
              <span style={{ color: '#fff' }}>{theme.id === 'charisma' ? <><Heart size={11} /> </> : null}{theme.fmt(r.value)}</span>
            </div>
          ) : null)}
        </div>
      </div>
    </div>
  );
}

function Hero({ onGlow }: { onGlow?: (id: string) => void }) {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const idx = useRef(0);
  const lastTouch = useRef(0);
  const boards = useBoards();
  const [active, setActive] = useState(0);

  // Papan yang punya data saja yang jadi slide.
  const boardSlides = BOARDS.map((t) => {
    const raw = boards[t.id] || {};
    const rowsByTab: Record<string, BoardRow[]> = t.tabs
      ? { all: raw.all || [], d30: raw.d30 || [], d7: raw.d7 || [] }
      : { all: raw.all || [] };
    const has = Object.values(rowsByTab).some((r) => r.length > 0);
    return has ? { t, rowsByTab } : null;
  }).filter(Boolean) as { t: BoardTheme; rowsByTab: Record<string, BoardRow[]> }[];

  const total = BANNERS.length + boardSlides.length;
  const slideIds = [...BANNERS.map(() => 'banner'), ...boardSlides.map(({ t }) => t.id)];
  const slideKey = slideIds.join('|');
  useEffect(() => { onGlow?.(slideIds[active] || 'banner'); }, [active, slideKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const goTo = (i: number) => {
    const el = ref.current;
    const child = el?.children[i] as HTMLElement | undefined;
    if (!el || !child) return;
    el.scrollTo({ left: child.offsetLeft, behavior: 'smooth' });
  };

  // Geser otomatis tiap 5 detik. Kalau user baru menggeser sendiri, tunggu 8 detik dulu.
  useEffect(() => {
    if (total < 2) return;
    const t = setInterval(() => {
      if (Date.now() - lastTouch.current < 8000) return;
      idx.current = (idx.current + 1) % total;
      setActive(idx.current);
      goTo(idx.current);
    }, 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

  const raf = useRef(0);
  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (raf.current) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = 0;
      let best = 0, bd = Infinity;
      Array.from(el.children).forEach((c, i) => { const d = Math.abs((c as HTMLElement).offsetLeft - el.scrollLeft); if (d < bd) { bd = d; best = i; } });
      if (best !== idx.current) { idx.current = best; setActive(best); }
    });
  };

  // video banner hanya diputar saat slide-nya tampil (hemat CPU/baterai, scroll lebih halus)
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.querySelectorAll('video').forEach((v, i) => { if (i === active) v.play().catch(() => {}); else v.pause(); });
  }, [active, total]);

  const play = (href: string) => { primeGameFullscreen(); router.push(href); };

  return (
    <>
    {/* Satu kotak banner: slide berikutnya tersembunyi sampai digeser (tidak ada potongan yang mengintip) */}
    <div style={{ padding: '12px 20px 4px' }}>
      <div ref={ref} onScroll={onScroll} onTouchStart={() => { lastTouch.current = Date.now(); }} className="no-scrollbar" style={{ position: 'relative', display: 'flex', gap: 12, overflowX: 'auto', scrollSnapType: 'x mandatory', borderRadius: 20 }}>
        {BANNERS.map((b) => (
          <div key={b.id} role="button" onClick={() => play(b.href)} style={{ position: 'relative', flex: '0 0 100%', aspectRatio: '984 / 446', borderRadius: 20, overflow: 'hidden', scrollSnapAlign: 'start', cursor: 'pointer', background: '#16151A' }}>
            <video src={b.video} poster={b.poster} autoPlay muted loop playsInline preload="metadata" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />
          </div>
        ))}
        {boardSlides.map(({ t, rowsByTab }) => (
          <BoardSlide key={t.id} theme={t} rowsByTab={rowsByTab} onOpen={(tb) => router.push(t.tabs ? `${t.href}&tab=${tb}` : t.href)} />
        ))}
      </div>
    </div>
    {total > 1 && (
      <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 10 }}>
        {Array.from({ length: total }).map((_, i) => <span key={i} style={{ width: 9, height: 9, borderRadius: 99, background: i === active ? '#2F8CFF' : '#55545C', transition: 'background .25s' }} />)}
      </div>
    )}
    </>
  );
}

// ─── Judul section: judul besar + link koral ─────────────────────────────────
function SectionTitle({ title, sub, action, onAction, href, pill }: { title: string; sub?: string; action: string; onAction?: () => void; href?: string; pill?: boolean }) {
  const col = pill ? '#B9B7C4' : ACCENT;
  const inner = (
    <span style={pill
      ? { color: col, fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', gap: 4, background: CARD, border: '1px solid rgba(255,255,255,.08)', borderRadius: 99, padding: '9px 16px', whiteSpace: 'nowrap' }
      : { color: col, fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', gap: 2 }}>
      {action}
      <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="9 6 15 12 9 18" /></svg>
    </span>
  );
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '30px 14px 14px' }}>
      <div style={{ minWidth: 0, flex: 1, paddingRight: 12 }}>
        <div style={{ ...ell, fontSize: 22, fontWeight: 800, letterSpacing: -1 }}>{title}</div>
        {sub && <div style={{ ...ell, fontSize: 14, fontWeight: 800, color: MUTED, letterSpacing: -0.5, marginTop: 2 }}>{sub}</div>}
      </div>
      {href ? <Link href={href}>{inner}</Link> : <button onClick={onAction} style={{ background: 'none', border: 0 }}>{inner}</button>}
    </div>
  );
}

// ─── Lanjut baca (dari riwayat) ──────────────────────────────────────────────
function ContinueReading() {
  const { history } = useHistory();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const seen = new Set<string>();
  const list = history.filter(h => (seen.has(h.mangaLink) ? false : (seen.add(h.mangaLink), true))).slice(0, 8);
  if (!list.length) return null;

  return (
    <>
      <SectionTitle title="Lanjut baca" action="Riwayat" href="/history" />
      <div className="no-scrollbar" style={{ display: 'flex', gap: 11, overflowX: 'auto', padding: '0 14px' }}>
        {list.map((h, i) => {
          const pct = h.totalPages > 0 ? Math.min(100, Math.round((h.pageRead / h.totalPages) * 100)) : 0;
          const ch = (h.chapterNumber || h.chapterTitle || '').toString().replace(/^ch(apter)?\.?\s*/i, '');
          return (
            <Link key={i} href={`/chapter?url=${encodeURIComponent(h.chapterLink)}&thumb=${encodeURIComponent(h.mangaThumb||'')}&mangaTitle=${encodeURIComponent(h.mangaTitle||'')}`} style={{ flex: '0 0 108px', minWidth: 0 }}>
              <div style={{ position: 'relative', aspectRatio: '16 / 10', borderRadius: 14, overflow: 'hidden', background: CARD }}>
                <img decoding="async" src={h.mangaThumb} alt="" referrerPolicy="no-referrer" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
                <div aria-hidden style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '55%', background: 'linear-gradient(to top, rgba(0,0,0,.7), rgba(0,0,0,0))' }} />
                <span style={{ position: 'absolute', left: 8, bottom: 6, fontSize: 14, fontWeight: 800, letterSpacing: -0.4, color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,.6)' }}>Ch. {ch}</span>
              </div>
              <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,.12)', marginTop: 4 }}>
                <div style={{ width: `${pct}%`, height: '100%', borderRadius: 2, background: ACCENT }} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: -0.4, marginTop: 6, ...ell }}>{h.mangaTitle}</div>
            </Link>
          );
        })}
      </div>
    </>
  );
}

// ─── Kartu besar (Rekomendasi) ───────────────────────────────────────────────
const BigCard = memo(function BigCard({ item }: { item: any }) {
  const rating = item.score && item.score !== 'N/A' ? item.score : getRating(item.desc);
  return (
    <Link href={`/manga?url=${encodeURIComponent(item.link)}`} style={{ flex: '0 0 86%', maxWidth: 360, scrollSnapAlign: 'start' }}>
      <div style={{ position: 'relative', height: 215, borderRadius: 28, overflow: 'hidden', background: CARD }}>
        <img decoding="async" src={item.thumb} alt={item.title} loading="lazy" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
        <span style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(20,19,24,.8)', fontSize: 13, fontWeight: 800, padding: '4px 10px', borderRadius: 8 }}>{typeLabel(item)}</span>
      </div>
      <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: -0.6, margin: '10px 4px 0', ...clamp(1) }}>{item.title}</div>
    </Link>
  );
});

// ─── Util tampilan ───────────────────────────────────────────────────────────
const GOLD = '#F5C451';
const BADGE_BG = 'rgba(20,19,24,.82)';
const ratingOf = (m: any) => (m.score && m.score !== 'N/A' ? m.score : getRating(m.desc));
const ratingId = (m: any, zero = false) => { const r = ratingOf(m); return r ? String(r).replace('.', ',') : zero ? '0,0' : null; };
function chNum(ch?: string) { const n = String(ch || '').match(/(\d+(?:[.,]\d+)?)/); return n ? `Ch. ${n[1]}` : ''; }
function fmtViews(v: any): string | null {
  if (v == null || v === '') return null;
  const s = String(v).trim();
  if (/[a-z]/i.test(s)) return s;
  const n = parseInt(s.replace(/\D/g, ''), 10);
  if (!n) return null;
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace('.', ',') + ' jt';
  if (n >= 1e3) return Math.round(n / 1e3) + ' rb';
  return String(n);
}
function vnum(m: any): number {
  const s = String(m.views || '').toLowerCase().replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s) || 0;
  return /jt|m/.test(s) ? n * 1e6 : /rb|k/.test(s) ? n * 1e3 : n;
}
const isFresh = (t?: string) => /detik|menit|jam|baru/i.test(t || '');
const uniq = (arr: any[]) => { const seen = new Set<any>(); return arr.filter((v) => (seen.has(v.link) ? false : (seen.add(v.link), true))); };
const mangaHref = (m: any) => `/manga?url=${encodeURIComponent(m.link)}`;

const Eye = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx={12} cy={12} r={3} /></svg>
);
const TypeBadge = ({ item, size = 11 }: { item: any; size?: number }) => (
  <span style={{ background: BADGE_BG, fontSize: size, fontWeight: 800, padding: '3px 8px', borderRadius: 7 }}>{typeLabel(item)}</span>
);
const NewBadge = ({ size = 11 }: { size?: number }) => (
  <span style={{ background: ACCENT, color: '#fff', fontSize: size, fontWeight: 800, padding: '3px 8px', borderRadius: 7 }}>BARU</span>
);
const Cover = ({ src, alt = '' }: { src: string; alt?: string }) => (
  <img decoding="async" src={src} alt={alt} loading="lazy" referrerPolicy="no-referrer" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
);

// ─── Pembaruan terbaru: grid 3 kolom (badge New + rating + chapter di poster) ─
const LatestList = memo(function LatestList({ items }: { items: any[] }) {
  return (
    <div style={{ padding: '0 14px', display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '18px 10px' }}>
      {items.map((m, i) => {
        const views = fmtViews(m.views);
        const ch = chNum(m.chapter);
        const fresh = isFresh(m.time);
        return (
          <Link key={i} href={mangaHref(m)} style={{ minWidth: 0 }}>
            <div style={{ position: 'relative', paddingTop: '138%', borderRadius: 20, overflow: 'hidden', background: CARD }}>
              <Cover src={m.thumb} alt={m.title} />
              <div aria-hidden style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '38%', background: 'linear-gradient(to top, rgba(0,0,0,.72), rgba(0,0,0,0))' }} />
              {fresh && (
                <span style={{ position: 'absolute', top: 0, left: 0, background: '#2196F3', color: '#fff', fontSize: 14, fontWeight: 800, padding: '7px 14px', borderRadius: '20px 0 14px 0' }}>New</span>
              )}
              <span style={{ position: 'absolute', top: 0, right: 0, display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(20,19,24,.78)', color: '#fff', fontSize: 13, fontWeight: 800, padding: '6px 9px', borderRadius: '0 20px 0 14px' }}>
                <span style={{ color: '#FBBF24' }}>★</span>{ratingId(m, true)}
              </span>
              {ch && (
                <span style={{ position: 'absolute', left: 9, bottom: 8, fontSize: 17, fontWeight: 800, letterSpacing: -0.5, color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,.6)' }}>{ch}</span>
              )}
            </div>
            {views && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 8, fontSize: 12.5, fontWeight: 700, color: MUTED }}>
                <Eye /> <span style={ell}>{views}</span>
              </div>
            )}
            <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: -0.6, lineHeight: 1.2, marginTop: views ? 4 : 8, ...clamp(2) }}>{m.title}</div>
          </Link>
        );
      })}
    </div>
  );
});

// ─── Kartu Premium (strip biru: pill Premium + harga + panah) ────────────────
function PremiumCard() {
  return (
    <Link href="/premium" style={{ position: 'relative', overflow: 'hidden', margin: '12px 20px 0', padding: '11px 14px', borderRadius: 20, border: '1.5px solid #2B5A9E', background: 'linear-gradient(90deg, #0F2547 0%, #14325E 55%, #0F2547 100%)', display: 'flex', alignItems: 'center', gap: 12 }}>
      <span aria-hidden style={{ position: 'absolute', right: -18, top: -30, width: 130, height: 130, background: 'rgba(59,155,255,.14)', transform: 'rotate(35deg)' }} />
      <span style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6, background: 'linear-gradient(180deg, #3FA2FF, #1E7BEA)', color: '#fff', fontWeight: 800, fontSize: 16, padding: '8px 14px', borderRadius: 13, whiteSpace: 'nowrap' }}>
        <svg width={22} height={22} viewBox="0 0 24 24" fill="#FFC53D"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5L3 8z" /></svg>
        Premium
      </span>
      <span style={{ position: 'relative', flex: 1, minWidth: 0, fontSize: 15, fontWeight: 600, color: '#B9C7DD', lineHeight: 1.25 }}>
        Mulai <b style={{ color: '#fff', fontWeight: 800 }}>Rp5.000</b>, tanpa iklan
      </span>
      <svg style={{ position: 'relative', flex: '0 0 auto' }} width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#3B9BFF" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round"><path d="M9 5l7 7-7 7" /></svg>
    </Link>
  );
}

// ─── Terpopuler: kolom berisi 3 peringkat, geser ke samping ──────────────────
const Ranked = memo(function Ranked({ items }: { items: any[] }) {
  const cols: any[][] = [];
  for (let i = 0; i < items.length; i += 3) cols.push(items.slice(i, i + 3));
  return (
    <div className="no-scrollbar" style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollSnapType: 'x mandatory', padding: '0 14px' }}>
      {cols.map((col, ci) => (
        <div key={ci} style={{ flex: '0 0 88%', display: 'flex', flexDirection: 'column', gap: 14, scrollSnapAlign: 'start' }}>
          {col.map((m, ri) => {
            const n = ci * 3 + ri + 1;
            const views = fmtViews(m.views);
            return (
              <Link key={ri} href={mangaHref(m)} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ width: 40, textAlign: 'center', fontSize: 41, fontWeight: 800, letterSpacing: -2, color: n <= 3 ? ACCENT : '#6B6976' }}>{n}</span>
                <div style={{ position: 'relative', flex: '0 0 62px', height: 92, borderRadius: 10, overflow: 'hidden', background: CARD }}>
                  <Cover src={m.thumb} alt={m.title} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: -0.7, lineHeight: 1.2, ...clamp(2) }}>{m.title}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, fontSize: 13, fontWeight: 800 }}>
                    <span><span style={{ color: '#FBBF24' }}>★</span> {ratingId(m, true)}</span>
                    {views && <span style={{ color: MUTED, display: 'flex', alignItems: 'center', gap: 4 }}><Eye /> {views}</span>}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );
});

// ─── Poster (Jelajah per genre & Berdasarkan asal) ───────────────────────────
const PosterCard = memo(function PosterCard({ m, w }: { m: any; w: string }) {
  const ch = chNum(m.chapter);
  return (
    <Link href={mangaHref(m)} style={{ flex: `0 0 ${w}`, minWidth: 0 }}>
      <div style={{ position: 'relative', paddingTop: '150%', borderRadius: 22, overflow: 'hidden', background: CARD }}>
        <Cover src={m.thumb} alt={m.title} />
        <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', gap: 4 }}>
          <TypeBadge item={m} />
          {isFresh(m.time) && <NewBadge />}
        </div>
      </div>
      <div style={{ fontSize: 14, fontWeight: 800, lineHeight: 1.2, letterSpacing: -0.5, marginTop: 8, ...clamp(2) }}>{m.title}</div>
      {ch && <div style={{ fontSize: 13, fontWeight: 800, color: MUTED, marginTop: 2 }}>{ch}</div>}
    </Link>
  );
});

function GenreSection({ categories }: { categories: { category: string; items: any[] }[] }) {
  const [sel, setSel] = useState(0);
  const cat = categories[sel] || categories[0];
  if (!cat) return null;
  return (
    <>
      <SectionTitle title="Jelajah per genre" action="Lihat semua" href="/search" />
      <div className="no-scrollbar" style={{ display: 'flex', gap: 10, overflowX: 'auto', padding: '0 14px 16px' }}>
        {categories.map((c, i) => {
          const on = i === sel;
          return (
            <button key={c.category} onClick={() => setSel(i)} style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px', borderRadius: 99, fontSize: 15, fontWeight: 800, letterSpacing: -0.4, background: on ? '#F3F2F7' : 'transparent', color: on ? '#1B1A20' : '#fff', border: on ? '1px solid #F3F2F7' : '1px solid rgba(255,255,255,.14)' }}>
              {on && <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#1B1A20" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><polyline points="4 12 10 18 20 6" /></svg>}
              {c.category}
            </button>
          );
        })}
      </div>
      <div className="no-scrollbar" style={{ display: 'flex', gap: 10, overflowX: 'auto', padding: '0 14px' }}>
        {cat.items.slice(0, 9).map((m, i) => <PosterCard key={cat.category + i} m={m} w="calc((100% - 20px) / 3)" />)}
      </div>
    </>
  );
}

function OriginSection({ all }: { all: any[] }) {
  const tabs = ['Manhwa', 'Manhua', 'Manga'];
  const [tab, setTab] = useState('Manga');
  const list = all.filter(m => typeLabel(m) === tab).slice(0, 12);
  return (
    <>
      <SectionTitle title="Berdasarkan asal" action="Lihat semua" href="/search" />
      <div style={{ margin: '0 14px 16px', display: 'inline-flex', padding: 5, borderRadius: 99, background: '#25242B', border: '1px solid rgba(255,255,255,.06)' }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '10px 26px', borderRadius: 99, fontSize: 16, fontWeight: 800, letterSpacing: -0.5, background: tab === t ? '#18171C' : 'transparent', color: tab === t ? '#fff' : MUTED, border: 0 }}>{t}</button>
        ))}
      </div>
      {list.length ? (
        <div className="no-scrollbar" style={{ display: 'flex', gap: 10, overflowX: 'auto', padding: '0 14px' }}>
          {list.map((m, i) => <PosterCard key={tab + i} m={m} w="calc((100% - 30px) / 3.35)" />)}
        </div>
      ) : (
        <div style={{ padding: '10px 14px', color: MUTED, fontWeight: 700 }}>Belum ada komik {tab}.</div>
      )}
    </>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────
function SkeletonHome() {
  const sh: React.CSSProperties = { background: 'linear-gradient(90deg,#2A2931 25%,#33323B 50%,#2A2931 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite linear' };
  return (
    <div style={{ padding: '0 14px' }}>
      <div style={{ ...sh, height: 215, borderRadius: 28 }} />
      <div style={{ ...sh, width: 150, height: 26, borderRadius: 8, margin: '34px 0 14px' }} />
      <div style={{ ...sh, height: 110, borderRadius: 22 }} />
      <div style={{ ...sh, width: 190, height: 26, borderRadius: 8, margin: '34px 0 14px' }} />
      <div style={{ ...sh, height: 215, borderRadius: 28 }} />
    </div>
  );
}

// ─── Halaman utama ───────────────────────────────────────────────────────────
const HeroM = memo(Hero);
const PremiumCardM = memo(PremiumCard);
const ContinueReadingM = memo(ContinueReading);
const GenreSectionM = memo(GenreSection);
const OriginSectionM = memo(OriginSection);

export default function Home() {
  const router = useRouter();
  const [categories, setCategories] = useState<{ category: string; items: any[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [glow, setGlow] = useState('');

  // Firebase di-load setelah halaman siap (defer supaya tidak memblok render)
  useEffect(() => {
    const t = setTimeout(() => {
      getFirebase().then(({ db }) => {
        db.ref('users').get().then(() => {}).catch(() => {});
      }).catch(() => {});
    }, 3000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const CACHE_KEY = 'komiku_home_v4'; // v4: buang cache lama yang chapternya ngawur (chapter bahasa lain)
    const CACHE_TTL = 5 * 60 * 1000;
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const { data, ts } = JSON.parse(raw);
        if (Array.isArray(data) && Date.now() - ts < CACHE_TTL) {
          setCategories(data);
          setLoading(false);
          return;
        } else if (Array.isArray(data)) {
          setCategories(data);
          setLoading(false);
        }
      }
    } catch {}

    fetch('/api/manga/home')
      .then(r => r.json())
      .then(json => {
        if (json.success && Array.isArray(json.data)) {
          setCategories(json.data);
          try { localStorage.setItem(CACHE_KEY, JSON.stringify({ data: json.data, ts: Date.now() })); } catch {}
        } else if (!categories.length) {
          setError(json.message || 'Gagal memuat data');
        }
      })
      .catch(e => { if (!categories.length) setError(e.message); })
      .finally(() => setLoading(false));
  }, []);

  const goSearch = useCallback(() => router.push('/search'), [router]);
  const seeAll = useCallback((c: string) => router.push(`/search?genre=${encodeURIComponent(c)}`), [router]);

  const all = useMemo(() => uniq(categories.flatMap(c => c.items)), [categories]);
  const latest = useMemo(() => {
    const withCh = all.filter(m => m.chapter);
    return (withCh.length >= 6 ? withCh : all).slice(0, 9);
  }, [all]);
  const popular = useMemo(() => {
    const rate = (x: any) => parseFloat(ratingOf(x) ?? '0') || 0;
    return [...all].sort((a, b) => (vnum(b) - vnum(a)) || (rate(b) - rate(a))).slice(0, 12);
  }, [all]);

  return (
    <>
      <style>{`
        a { text-decoration: none; color: inherit; }
        button { font-family: inherit; cursor: pointer; }
        ::-webkit-scrollbar { display: none; }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        @keyframes bsTwk { 0%, 100% { opacity: .1; transform: scale(.55) rotate(0deg); } 50% { opacity: .95; transform: scale(1.2) rotate(20deg); } }
        @keyframes bsIn { from { opacity: 0; transform: translateY(8px) scale(.94); } to { opacity: 1; transform: none; } }
        .bs-in { animation: bsIn .42s cubic-bezier(.2,.8,.2,1) both; }
        @media (prefers-reduced-motion: reduce) { .bs-glow { transition: none !important; } }
        @media (prefers-reduced-motion: reduce) { .bs-in, .bs-twk { animation: none !important; } }
      `}</style>

      <div style={{ position: 'relative', isolation: 'isolate', background: '#1B1A20', color: '#fff', minHeight: '100vh', paddingBottom: 24 }}>
        <div aria-hidden style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 760, zIndex: -1, pointerEvents: 'none' }}>
          {Object.entries(GLOW).map(([id, c]) => (
            <div key={id} className="bs-glow" style={{ position: 'absolute', inset: 0, willChange: 'opacity', opacity: glow === id ? 1 : 0, transition: 'opacity .8s ease', background: `radial-gradient(190% 60% at 50% 34%, ${c} 0%, transparent 80%)` }} />
          ))}
        </div>
        <Header onSearch={goSearch} />
        {loading ? (
          <SkeletonHome />
        ) : error ? (
          <div style={{ padding: 20, textAlign: 'center', color: MUTED }}>{error}</div>
        ) : (
          <>
            <HeroM onGlow={setGlow} />
            <PremiumCardM />
            <ContinueReadingM />

            <SectionTitle title="Pembaruan terbaru" action="Lihat semua" onAction={() => seeAll('Update')} pill />
            <LatestList items={latest} />

            <SectionTitle title="Terpopuler sepanjang masa" sub="Paling banyak dibaca di Komikita" action="Lihat semua" onAction={() => seeAll('Popular')} />
            <Ranked items={popular} />

            <GenreSectionM categories={categories} />

            <OriginSectionM all={all} />
          </>
        )}
      </div>
    </>
  );
}
