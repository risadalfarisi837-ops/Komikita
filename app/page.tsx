'use client';

import { useEffect, useState, memo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useHistory } from '@/lib/store';
import { primeGameFullscreen } from '@/components/GameMode';

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
function loadFirebaseCDN(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window._fbReady) return Promise.resolve();
  return new Promise((resolve) => {
    const urls = [
      'https://www.gstatic.com/firebasejs/10.14.0/firebase-app-compat.js',
      'https://www.gstatic.com/firebasejs/10.14.0/firebase-auth-compat.js',
      'https://www.gstatic.com/firebasejs/10.14.0/firebase-database-compat.js',
    ];
    let done = 0;
    urls.forEach(src => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => { done++; if (done === urls.length) { window._fbReady = true; resolve(); } };
      document.head.appendChild(s);
    });
  });
}
let _fbInit2 = false;
async function getFirebase() {
  await loadFirebaseCDN();
  if (!_fbInit2) {
    if (!window.firebase.apps.length) window.firebase.initializeApp(FIREBASE_CONFIG);
    _fbInit2 = true;
  }
  return { auth: window.firebase.auth(), db: window.firebase.database() };
}

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
  useEffect(() => {
    let alive = true;
    const t = setTimeout(async () => {
      try {
        const { auth, db } = await getFirebase();
        const u: any = auth.currentUser || await new Promise((res) => { const un = auth.onAuthStateChanged((x: any) => { un(); res(x); }); });
        if (!u || !alive) return;
        const d = (await db.ref(`users/${u.uid}`).get()).val() || {};
        if (!alive) return;
        const exp = Math.max(0, Math.floor(Number(d.exp) || 0));
        setMe({ name: d.displayName || u.displayName || 'User', photo: d.photoURL || u.photoURL || '', level: Number(d.level) || Math.floor(exp / 200) + 1, exp });
        const v = d.gifts || {};
        setHasGift(Object.values(v).some((g: any) => g && !g.claimed));
      } catch {}
    }, 1500);
    return () => { alive = false; clearTimeout(t); };
  }, []);

  const EXP_PER_LEVEL = 200;
  const cur = me ? me.exp % EXP_PER_LEVEL : 0;
  const pct = Math.min(100, (cur / EXP_PER_LEVEL) * 100);
  const BOX: React.CSSProperties = { background: '#26252C', border: '1px solid #3A3942', borderRadius: 20 };

  return (
    <div style={{ padding: '14px 14px 8px' }}>
      <div style={{ ...BOX, padding: '14px 16px', borderRadius: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <Link href="/profile" style={{ flex: '0 0 auto' }}>
          {me?.photo ? (
            <img src={me.photo} alt="" referrerPolicy="no-referrer" style={{ width: 62, height: 62, borderRadius: '50%', objectFit: 'cover', border: '2px solid #3A3942', display: 'block' }} />
          ) : (
            <div style={{ width: 62, height: 62, borderRadius: '50%', background: '#3A3942', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 800 }}>{(me?.name || 'K').slice(0, 1).toUpperCase()}</div>
          )}
        </Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...ell, fontSize: 19, fontWeight: 800, letterSpacing: -0.5 }}>{me?.name || 'Komikita'}</div>
          <span style={{ display: 'inline-block', marginTop: 6, fontSize: 13, fontWeight: 800, color: '#F5C451', background: 'rgba(245,196,81,.16)', border: '1px solid rgba(245,196,81,.3)', padding: '3px 10px', borderRadius: 99 }}>
            Lvl. {me?.level ?? 1}
          </span>
        </div>
        <button onClick={() => { window.location.assign('/notifikasi'); }} aria-label="Notifikasi" style={{ position: 'relative', flex: '0 0 auto', width: 52, height: 52, borderRadius: '50%', background: '#3A3942', border: 0, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 01-3.4 0" /></svg>
          {hasGift && <span style={{ position: 'absolute', top: 12, right: 13, width: 9, height: 9, borderRadius: '50%', background: ACCENT }} />}
        </button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: MUTED }}>EXP</span>
        <div style={{ flex: 1, height: 7, borderRadius: 99, background: '#3A3942', overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', borderRadius: 99, background: 'linear-gradient(90deg,#C99A2E,#F5C451)', transition: 'width .6s' }} />
        </div>
        <span style={{ fontSize: 13, fontWeight: 800, color: '#D6D4DE' }}>{cur.toLocaleString('id-ID')} / {EXP_PER_LEVEL.toLocaleString('id-ID')}</span>
      </div>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
        <button onClick={onSearch} style={{ ...BOX, flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', height: 54, color: MUTED, fontSize: 16, textAlign: 'left' }}>
          <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth={2} strokeLinecap="round"><circle cx={11} cy={11} r={7.5} /><line x1={21} y1={21} x2={16.5} y2={16.5} /></svg>
          <span style={ell}>Cari komik di sini</span>
        </button>
        <button onClick={() => { primeGameFullscreen(); router.push('/komikstore/mancing'); }} style={{ ...BOX, flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 10, padding: '0 18px', height: 54, color: '#fff', fontSize: 16, fontWeight: 800 }}>
          <svg width={26} height={26} viewBox="0 0 24 24" fill="#4ADE80"><path d="M7 7h10a5 5 0 014.9 6l-.9 4.3a2.6 2.6 0 01-4.4 1.3L15 17H9l-1.6 1.6A2.6 2.6 0 013 17.3L2.1 13A5 5 0 017 7zm1 3v1.5H6.5V13H8v1.5h1.5V13H11v-1.5H9.5V10H8zm7.5.5a1 1 0 100 2 1 1 0 000-2zm2 2a1 1 0 100 2 1 1 0 000-2z" /></svg>
          Minigame
        </button>
      </div>
    </div>
  );
}

// ─── Banner geser: video promo + 3 papan peringkat (Giveaway, Charisma, Clan) ─
// Video = banner statis. Tiga papan peringkat membaca data dari Firebase `banners/<id>`
// dan tampil otomatis kalau datanya ada (live, berubah sendiri saat data berubah).
// Format data (maks 5 baris, urut dari peringkat 1):
//   banners/giveaway/{all|d30|d7}/0..4 = { name, photo, value }      value = jumlah hari premium
//   banners/charisma/{all|d30|d7}/0..4 = { name, photo, value }      value = jumlah hati
//   banners/clan/0..4                  = { name, photo, value, sub } value = level, sub = jumlah anggota
const BANNERS = [
  { id: 'mancing', video: '/banner/mancing.mp4', poster: '/banner/mancing.jpg', href: '/komikstore/mancing' },
];

type BoardRow = { name: string; photo?: string; value: number; sub?: string };
type BoardTheme = {
  id: 'giveaway' | 'charisma' | 'clan'; title: string; href: string; tabs: boolean;
  border: string; bg: string; accent: string; accentText: string; glow: string; unit: string; fmt: (n: number) => string;
};
const nf = (n: number) => Math.round(n).toLocaleString('id-ID');
const BOARDS: BoardTheme[] = [
  { id: 'giveaway', title: 'TOP GIVEAWAY', href: '/premium', tabs: true, border: '#1F6F86', bg: 'linear-gradient(160deg, #0E3446 0%, #115063 55%, #0B2C3C 100%)', accent: '#2DD4E8', accentText: '#06303A', glow: 'rgba(45,212,232,.25)', unit: 'hari premium', fmt: nf },
  { id: 'charisma', title: 'TOP CHARISMA', href: '/ranking', tabs: true, border: '#8E2F66', bg: 'linear-gradient(160deg, #4A1636 0%, #6B1F4C 55%, #3F1230 100%)', accent: '#FF5C9A', accentText: '#3A0B22', glow: 'rgba(255,92,154,.25)', unit: '', fmt: nf },
  { id: 'clan', title: 'TOP CLAN', href: '/ranking', tabs: false, border: '#55545C', bg: 'linear-gradient(160deg, #2E2E34 0%, #4A4A52 55%, #28282D 100%)', accent: '#F5C451', accentText: '#2A2208', glow: 'rgba(255,255,255,.14)', unit: '', fmt: (n) => 'Lv ' + nf(n) },
];

function toRows(v: any): BoardRow[] {
  if (!v) return [];
  const arr: any[] = Array.isArray(v) ? v : Object.values(v);
  return arr.filter(Boolean).slice(0, 5).map((r: any) => ({ name: String(r.name || 'User'), photo: r.photo || '', value: Number(r.value) || 0, sub: r.sub ? String(r.sub) : '' }));
}

// Muat data semua papan, dan dengarkan perubahannya (live).
function useBoards() {
  const [data, setData] = useState<Record<string, any>>({});
  useEffect(() => {
    let off: (() => void) | null = null;
    let dead = false;
    getFirebase().then(({ db }) => {
      if (dead) return;
      const ref = db.ref('banners');
      const cb = (snap: any) => { if (!dead) setData(snap.val() || {}); };
      ref.on('value', cb, () => {});
      off = () => ref.off('value', cb);
    }).catch(() => {});
    return () => { dead = true; if (off) off(); };
  }, []);
  return data;
}

function Sparkles({ color }: { color: string }) {
  const dots: [number, number, number][] = [[12, 8, 10], [38, 4, 6], [66, 10, 8], [92, 22, 5], [84, 86, 6], [8, 70, 5]];
  return (
    <>
      {dots.map(([l, t, z], i) => (
        <svg key={i} aria-hidden width={z} height={z} viewBox="0 0 24 24" style={{ position: 'absolute', left: l + '%', top: t + '%', opacity: 0.55, pointerEvents: 'none' }}><path d="M12 0l2.6 9.4L24 12l-9.4 2.6L12 24l-2.6-9.4L0 12l9.4-2.6z" fill={color} /></svg>
      ))}
    </>
  );
}

function BoardAvatar({ row, size, ring, rank, crown }: { row: BoardRow; size: number; ring: string; rank: number; crown?: boolean }) {
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: `0 0 ${size}px` }}>
      {crown && <svg aria-hidden width={size * 0.42} height={size * 0.3} viewBox="0 0 24 18" style={{ position: 'absolute', left: '50%', top: -size * 0.2, transform: 'translateX(-50%)', zIndex: 2 }}><path d="M1 5l5 4 6-8 6 8 5-4-2 12H3z" fill="#FFC53D" /></svg>}
      <div style={{ width: '100%', height: '100%', borderRadius: '50%', border: `${Math.max(2, size * 0.05)}px solid ${ring}`, overflow: 'hidden', background: '#2A2931', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: size * 0.36 }}>
        {row.photo
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={row.photo} alt="" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : row.name.slice(0, 2).toUpperCase()}
      </div>
      <span style={{ position: 'absolute', right: -2, bottom: -2, width: size * 0.34, height: size * 0.34, minWidth: 18, minHeight: 18, borderRadius: '50%', background: '#FBBF24', color: '#2A2208', border: '2px solid #14131A', fontSize: Math.max(10, size * 0.2), fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{rank}</span>
    </div>
  );
}

const Heart = ({ size = 14, color = '#FF5C9A' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden><path d="M12 21s-8-5-8-11a4.6 4.6 0 018-3 4.6 4.6 0 018 3c0 6-8 11-8 11z" /></svg>
);

function BoardSlide({ theme, rowsByTab, onOpen }: { theme: BoardTheme; rowsByTab: Record<string, BoardRow[]>; onOpen: () => void }) {
  const [tab, setTab] = useState<'all' | 'd30' | 'd7'>('all');
  const rows = (theme.tabs ? rowsByTab[tab] : rowsByTab.all) || [];
  const [r1, r2, r3, r4, r5] = rows;
  const val = (r: BoardRow) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: theme.id === 'clan' ? '#fff' : theme.accent, fontWeight: 800 }}>
      {theme.id === 'charisma' && <Heart />}{theme.fmt(r.value)}
    </span>
  );
  const TabBtn = ({ k, label }: { k: 'all' | 'd30' | 'd7'; label: string }) => (
    <button onClick={(e) => { e.stopPropagation(); setTab(k); }} style={{ border: 0, borderRadius: 99, padding: '5px 11px', fontSize: 11, fontWeight: 800, background: tab === k ? theme.accent : 'transparent', color: tab === k ? theme.accentText : '#9AA6B2' }}>{label}</button>
  );
  const TitleIcon = theme.id === 'charisma' ? <Heart size={15} color={theme.accent} /> : theme.id === 'clan'
    ? <svg width={15} height={15} viewBox="0 0 24 24" fill={theme.accent} aria-hidden><path d="M7 3h10v3h3v3a4 4 0 01-4 4 5 5 0 01-3 2.9V18h3v3H8v-3h3v-2.1A5 5 0 018 13a4 4 0 01-4-4V6h3z" /></svg>
    : <svg width={16} height={16} viewBox="0 0 24 24" fill={theme.accent} aria-hidden><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5L3 8z" /></svg>;

  return (
    <div role="button" onClick={onOpen} style={{ position: 'relative', flex: '0 0 100%', aspectRatio: '984 / 446', borderRadius: 20, overflow: 'hidden', scrollSnapAlign: 'center', cursor: 'pointer', background: theme.bg, border: `2px solid ${theme.border}`, boxSizing: 'border-box', padding: '3.2% 3.4%', display: 'flex', flexDirection: 'column', gap: '3%' }}>
      <Sparkles color={theme.glow.replace(/[\d.]+\)$/, '1)')} />
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: theme.accent, fontSize: 13, fontWeight: 800, letterSpacing: 1.2 }}>
          {TitleIcon}{theme.title}
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#9AA6B2" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><path d="M9 5l7 7-7 7" /></svg>
        </div>
        {theme.tabs && (
          <div style={{ display: 'flex', background: 'rgba(0,0,0,.28)', borderRadius: 99, padding: 2 }}>
            <TabBtn k="all" label="ALL" /><TabBtn k="d30" label="30D" /><TabBtn k="d7" label="7D" />
          </div>
        )}
      </div>

      <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '38% 1fr', gap: '2.5%' }}>
        {r1 ? (
          <div style={{ borderRadius: 16, border: '2px solid #B98B2B', background: 'rgba(0,0,0,.28)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, padding: '6px 4px', minWidth: 0 }}>
            <BoardAvatar row={r1} size={58} ring={theme.accent} rank={1} crown />
            <div style={{ fontSize: 14, fontWeight: 800, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 4 }}>{r1.name}</div>
            <div style={{ fontSize: 20, lineHeight: 1 }}>{val(r1)}</div>
            <div style={{ fontSize: 11, color: '#9AA6B2', fontWeight: 600 }}>{theme.id === 'clan' ? (r1.sub || '') : theme.unit}</div>
          </div>
        ) : <div />}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4%', minWidth: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[r2, r3].map((r, i) => r ? (
              <div key={i} style={{ borderRadius: 14, border: `2px solid ${i === 0 ? '#C9D1DA' : '#B98B2B'}`, background: 'rgba(0,0,0,.24)', padding: '6px 8px', minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                  <BoardAvatar row={r} size={30} ring={i === 0 ? '#C9D1DA' : '#B98B2B'} rank={i + 2} />
                  <span style={{ fontSize: 14 }}>{val(r)}</span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 800, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
              </div>
            ) : <div key={i} />)}
          </div>
          {[r4, r5].map((r, i) => r ? (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, borderTop: i === 1 ? '1px solid rgba(255,255,255,.12)' : 0, paddingTop: i === 1 ? 4 : 0 }}>
              <span style={{ width: 14, color: '#9AA6B2', fontWeight: 800 }}>{i + 4}</span>
              <div style={{ width: 22, height: 22, flex: '0 0 22px', borderRadius: '50%', overflow: 'hidden', background: '#2A2931', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800 }}>
                {r.photo
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={r.photo} alt="" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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

function Hero() {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const idx = useRef(0);
  const boards = useBoards();
  const [active, setActive] = useState(0);

  // Papan yang punya data saja yang jadi slide.
  const boardSlides = BOARDS.map((t) => {
    const raw = boards[t.id];
    const rowsByTab: Record<string, BoardRow[]> = t.tabs
      ? { all: toRows(raw?.all), d30: toRows(raw?.d30), d7: toRows(raw?.d7) }
      : { all: toRows(raw) };
    const has = Object.values(rowsByTab).some((r) => r.length > 0);
    return has ? { t, rowsByTab } : null;
  }).filter(Boolean) as { t: BoardTheme; rowsByTab: Record<string, BoardRow[]> }[];

  const total = BANNERS.length + boardSlides.length;

  const goTo = (i: number) => {
    const el = ref.current;
    const child = el?.children[i] as HTMLElement | undefined;
    if (!el || !child) return;
    el.scrollTo({ left: child.offsetLeft - 20, behavior: 'smooth' });
  };

  // Geser otomatis tiap 5 detik. Kalau user baru menggeser sendiri, tunggu dulu.
  const lastTouch = useRef(0);
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

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    let best = 0, bd = Infinity;
    Array.from(el.children).forEach((c, i) => { const d = Math.abs((c as HTMLElement).offsetLeft - 20 - el.scrollLeft); if (d < bd) { bd = d; best = i; } });
    if (best !== idx.current) { idx.current = best; setActive(best); }
  };

  const play = (href: string) => { primeGameFullscreen(); router.push(href); };

  return (
    <>
    <div ref={ref} onScroll={onScroll} onTouchStart={() => { lastTouch.current = Date.now(); }} className="no-scrollbar" style={{ display: 'flex', gap: 10, overflowX: 'auto', scrollSnapType: 'x mandatory', scrollPaddingInline: 20, padding: '12px 20px 4px' }}>
      {BANNERS.map((b) => (
        <div key={b.id} role="button" onClick={() => play(b.href)} style={{ position: 'relative', flex: '0 0 100%', aspectRatio: '984 / 446', borderRadius: 20, overflow: 'hidden', scrollSnapAlign: 'center', cursor: 'pointer', background: '#16151A' }}>
          <video src={b.video} poster={b.poster} autoPlay muted loop playsInline preload="metadata" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />
        </div>
      ))}
      {boardSlides.map(({ t, rowsByTab }) => (
        <BoardSlide key={t.id} theme={t} rowsByTab={rowsByTab} onOpen={() => router.push(t.href)} />
      ))}
    </div>
    {total > 1 && (
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12 }}>
        {Array.from({ length: total }).map((_, i) => <span key={i} style={{ width: i === active ? 20 : 7, height: 7, borderRadius: 99, background: i === active ? '#3B9BFF' : '#4A4953', transition: 'width .25s' }} />)}
      </div>
    )}
    </>
  );
}

// ─── Judul section: judul besar + link koral ─────────────────────────────────
function SectionTitle({ title, sub, action, onAction, href }: { title: string; sub?: string; action: string; onAction?: () => void; href?: string }) {
  const inner = (
    <span style={{ color: ACCENT, fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', gap: 2 }}>
      {action}
      <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="9 6 15 12 9 18" /></svg>
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
      <div className="no-scrollbar" style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '0 14px' }}>
        {list.map((h, i) => {
          const pct = h.totalPages > 0 ? Math.min(100, Math.round((h.pageRead / h.totalPages) * 100)) : 0;
          const ch = (h.chapterNumber || h.chapterTitle || '').toString().replace(/^ch(apter)?\.?\s*/i, '');
          return (
            <Link key={i} href={`/chapter?url=${encodeURIComponent(h.chapterLink)}&thumb=${encodeURIComponent(h.mangaThumb||'')}&mangaTitle=${encodeURIComponent(h.mangaTitle||'')}`} style={{ flex: '0 0 82%', maxWidth: 330, display: 'flex', gap: 14, background: CARD, borderRadius: 22, padding: 12 }}>
              <img src={h.mangaThumb} alt="" referrerPolicy="no-referrer" style={{ width: 62, height: 84, borderRadius: 10, objectFit: 'cover', background: '#222' }} />
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.2, letterSpacing: -0.7, ...clamp(2) }}>{h.mangaTitle}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 6 }}>Ch. {ch} <span style={{ color: MUTED }}>· {pct}%</span></div>
                  <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,.08)' }}>
                    <div style={{ width: `${pct}%`, height: '100%', borderRadius: 3, background: ACCENT }} />
                  </div>
                </div>
              </div>
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
        <img src={item.thumb} alt={item.title} loading="lazy" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
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
const uniq = (arr: any[]) => arr.filter((v, i, a) => a.findIndex(t => t.link === v.link) === i);
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
  <img src={src} alt={alt} loading="lazy" referrerPolicy="no-referrer" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
);

// ─── Pembaruan terbaru: daftar vertikal ──────────────────────────────────────
const LatestList = memo(function LatestList({ items }: { items: any[] }) {
  return (
    <div style={{ padding: '0 14px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      {items.map((m, i) => {
        const views = fmtViews(m.views);
        const ch = chNum(m.chapter);
        return (
          <Link key={i} href={mangaHref(m)} style={{ display: 'flex', gap: 14 }}>
            <div style={{ position: 'relative', flex: '0 0 76px', height: 112, borderRadius: 14, overflow: 'hidden', background: CARD }}>
              <Cover src={m.thumb} alt={m.title} />
              <span style={{ position: 'absolute', top: 6, left: 6 }}><TypeBadge item={m} size={10} /></span>
            </div>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: -0.8, lineHeight: 1.15, ...clamp(2) }}>{m.title}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5, fontSize: 13, fontWeight: 800 }}>
                  <span><span style={{ color: '#FBBF24' }}>★</span> {ratingId(m, true)}</span>
                  {views && <span style={{ color: MUTED, display: 'flex', alignItems: 'center', gap: 4 }}><Eye /> {views}</span>}
                  {isFresh(m.time) && <NewBadge />}
                </div>
              </div>
              {ch && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: CARD, borderRadius: 14, padding: '10px 14px', marginTop: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 800 }}>{ch}</span>
                  {m.time && <span style={{ fontSize: 11.5, fontWeight: 700, color: MUTED }}>{m.time}</span>}
                </div>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
});

// ─── Kartu Premium (strip biru: pill Premium + harga + panah) ────────────────
function PremiumCard() {
  return (
    <Link href="/premium" style={{ position: 'relative', overflow: 'hidden', margin: '14px 20px 0', padding: '14px 16px', borderRadius: 22, border: '1.5px solid #2B5A9E', background: 'linear-gradient(90deg, #0F2547 0%, #14325E 55%, #0F2547 100%)', display: 'flex', alignItems: 'center', gap: 12 }}>
      <span aria-hidden style={{ position: 'absolute', right: -18, top: -30, width: 130, height: 130, background: 'rgba(59,155,255,.14)', transform: 'rotate(35deg)' }} />
      <span style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6, background: 'linear-gradient(180deg, #3FA2FF, #1E7BEA)', color: '#fff', fontWeight: 800, fontSize: 17, padding: '10px 16px', borderRadius: 14, whiteSpace: 'nowrap' }}>
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
export default function Home() {
  const router = useRouter();
  const [categories, setCategories] = useState<{ category: string; items: any[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    const CACHE_KEY = 'komiku_home_v3'; // v2: data sekarang punya chapter/waktu/views
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

  const all = uniq(categories.flatMap(c => c.items));
  const rate = (x: any) => parseFloat(ratingOf(x) ?? '0') || 0;
  const withCh = all.filter(m => m.chapter);
  const latest = (withCh.length >= 4 ? withCh : all).slice(0, 4);
  const popular = [...all].sort((a, b) => (vnum(b) - vnum(a)) || (rate(b) - rate(a))).slice(0, 12);

  return (
    <>
      <style>{`
        a { text-decoration: none; color: inherit; }
        button { font-family: inherit; cursor: pointer; }
        ::-webkit-scrollbar { display: none; }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
      `}</style>

      <div style={{ background: '#1B1A20', color: '#fff', minHeight: '100vh', paddingBottom: 24 }}>
        <Header onSearch={goSearch} />
        {loading ? (
          <SkeletonHome />
        ) : error ? (
          <div style={{ padding: 20, textAlign: 'center', color: MUTED }}>{error}</div>
        ) : (
          <>
            <Hero />
            <PremiumCard />
            <ContinueReading />

            <SectionTitle title="Pembaruan terbaru" action="Lihat semua" onAction={() => seeAll('Update')} />
            <LatestList items={latest} />

            <SectionTitle title="Terpopuler sepanjang masa" sub="Paling banyak dibaca di Komikita" action="Lihat semua" onAction={() => seeAll('Popular')} />
            <Ranked items={popular} />

            <GenreSection categories={categories} />

            <OriginSection all={all} />
          </>
        )}
      </div>
    </>
  );
}
