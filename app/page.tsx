'use client';

import { useEffect, useState, memo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useHistory } from '@/lib/store';

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

// ─── Warna & util (tema Pulau: krem + rumput + biru tebal) ───────────────────
const ACCENT = '#2A7BE8';
const INK = '#3B2A18';
const MUTED = '#7C6847';
const GOLD = '#F5B82E';
const STAR = '#F5A623';

function typeLabel(item: any): string {
  const f = getFlag(item.title, item.type, item.flag);
  if (f === '🇰🇷') return 'Manhwa';
  if (f === '🇨🇳') return 'Manhua';
  if (f === '🇯🇵') return 'Manga';
  return 'Komik';
}
const clamp = (n: number): React.CSSProperties => ({ display: '-webkit-box', WebkitLineClamp: n, WebkitBoxOrient: 'vertical', overflow: 'hidden' });
const ell: React.CSSProperties = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };
// Teks di atas rumput: putih + tepi gelap
const onGrass: React.CSSProperties = { color: '#fff', textShadow: '0 2px 0 rgba(31,60,24,.85), 0 0 6px rgba(31,60,24,.45)' };

// ─── Header: pil logo + tombol cari & lonceng ────────────────────────────────
function Header({ onSearch }: { onSearch: () => void }) {
  const [hasGift, setHasGift] = useState(false);
  useEffect(() => {
    let alive = true;
    const t = setTimeout(async () => {
      try {
        const { auth, db } = await getFirebase();
        const u: any = auth.currentUser || await new Promise((res) => { const un = auth.onAuthStateChanged((x: any) => { un(); res(x); }); });
        if (!u || !alive) return;
        const v = (await db.ref(`users/${u.uid}/gifts`).get()).val() || {};
        if (alive) setHasGift(Object.values(v).some((g: any) => g && !g.claimed));
      } catch {}
    }, 1500);
    return () => { alive = false; clearTimeout(t); };
  }, []);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 14px 12px' }}>
      <div className="k-card k-pill" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 18px 5px 6px', flex: 1, minWidth: 0 }}>
        <div className="pixel" style={{ width: 36, height: 36, borderRadius: '50%', background: ACCENT, color: '#fff', border: '3px solid #fff', boxShadow: '0 2px 0 rgba(0,0,0,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700 }}>K</div>
        <div className="pixel" style={{ fontSize: 23, fontWeight: 700, color: INK, lineHeight: 1 }}>
          Komi<span style={{ color: ACCENT }}>kita</span>
        </div>
      </div>
      <button onClick={onSearch} aria-label="Cari" className="k-icon-btn">
        <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth={2.6} strokeLinecap="round"><circle cx={11} cy={11} r={7} /><line x1={21} y1={21} x2={16.5} y2={16.5} /></svg>
      </button>
      <button onClick={() => { window.location.assign('/notifikasi'); }} aria-label="Notifikasi" className="k-icon-btn" style={{ position: 'relative' }}>
        <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 01-3.4 0" /></svg>
        {hasGift && <span style={{ position: 'absolute', top: -4, right: -4, width: 14, height: 14, borderRadius: '50%', background: '#E5484D', border: '2px solid #fff' }} />}
      </button>
    </div>
  );
}

// ─── Banner geser: panel berjudul, cover kanan, tombol "Baca sekarang" ──────
function Hero({ items }: { items: any[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const slides = items.slice(0, 5);

  useEffect(() => {
    if (slides.length < 2) return;
    let i = 0;
    const t = setInterval(() => {
      const el = ref.current;
      if (!el) return;
      i = (i + 1) % slides.length;
      el.scrollTo({ left: i * (el.scrollWidth / slides.length), behavior: 'smooth' });
    }, 5000);
    return () => clearInterval(t);
  }, [slides.length]);

  return (
    <div ref={ref} className="no-scrollbar" style={{ display: 'flex', gap: 12, overflowX: 'auto', scrollSnapType: 'x mandatory', padding: '4px 14px 12px' }}>
      {slides.map((m, i) => {
        const rating = m.score && m.score !== 'N/A' ? m.score : getRating(m.desc);
        const desc = (m.desc || '').replace(/^Score:\s*[\d.]+\s*/i, '');
        return (
          <div key={i} className="k-panel" style={{ position: 'relative', flex: '0 0 94%', scrollSnapAlign: 'center' }}>
            <div className="k-panel-head" style={{ fontSize: 14, display: 'flex', justifyContent: 'center', gap: 12 }}>
              <span>{typeLabel(m)}</span>
              {rating && <span style={{ color: '#FFD966' }}>★ {rating}</span>}
            </div>
            <div style={{ position: 'relative', height: 178, padding: '12px 14px' }}>
              <div style={{ width: '58%', height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: 18, fontWeight: 900, lineHeight: 1.2, ...clamp(2) }}>{m.title}</div>
                <div style={{ fontSize: 12.5, fontWeight: 700, lineHeight: 1.35, marginTop: 4, color: MUTED, ...clamp(2) }}>{desc}</div>
                <Link href={`/manga?url=${encodeURIComponent(m.link)}`} className="k-btn" style={{ marginTop: 'auto', alignSelf: 'flex-start', fontSize: 14 }}>
                  Baca sekarang
                </Link>
              </div>
              <img src={m.thumb} alt={m.title} referrerPolicy="no-referrer" className="k-cover" style={{ position: 'absolute', right: 14, top: 12, width: '34%', height: 'calc(100% - 4px)', objectFit: 'cover', transform: 'rotate(4deg)' }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Judul section: judul di rumput + pil "Lihat semua" ──────────────────────
function SectionTitle({ title, sub, action, onAction, href }: { title: string; sub?: string; action: string; onAction?: () => void; href?: string }) {
  const inner = (
    <span className="k-card k-pill pixel" style={{ color: INK, fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 2, padding: '4px 8px 4px 14px', boxShadow: '0 3px 0 var(--card-edge)' }}>
      {action}
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><polyline points="9 6 15 12 9 18" /></svg>
    </span>
  );
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 14px 12px' }}>
      <div style={{ minWidth: 0, flex: 1, paddingRight: 12 }}>
        <div className="k-title" style={{ ...ell, fontSize: 21 }}>{title}</div>
        {sub && <div style={{ ...ell, ...onGrass, fontSize: 13, fontWeight: 800, marginTop: 2, opacity: .95 }}>{sub}</div>}
      </div>
      {href ? <Link href={href}>{inner}</Link> : <button onClick={onAction} style={{ background: 'none', border: 0, padding: 0 }}>{inner}</button>}
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
      <div className="no-scrollbar" style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '0 14px 8px' }}>
        {list.map((h, i) => {
          const pct = h.totalPages > 0 ? Math.min(100, Math.round((h.pageRead / h.totalPages) * 100)) : 0;
          const ch = (h.chapterNumber || h.chapterTitle || '').toString().replace(/^ch(apter)?\.?\s*/i, '');
          return (
            <Link key={i} href={`/chapter?url=${encodeURIComponent(h.chapterLink)}&thumb=${encodeURIComponent(h.mangaThumb||'')}&mangaTitle=${encodeURIComponent(h.mangaTitle||'')}`} className="k-card" style={{ flex: '0 0 82%', maxWidth: 330, display: 'flex', gap: 12, padding: 10 }}>
              <img src={h.mangaThumb} alt="" referrerPolicy="no-referrer" className="k-cover" style={{ width: 62, height: 84, objectFit: 'cover', borderRadius: 10, borderWidth: 2 }} />
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 15, fontWeight: 900, lineHeight: 1.2, ...clamp(2) }}>{h.mangaTitle}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 6 }}>Ch. {ch} <span style={{ color: MUTED }}>· {pct}%</span></div>
                  <div className="k-bar"><i style={{ width: `${pct}%` }} /></div>
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
  return (
    <Link href={`/manga?url=${encodeURIComponent(item.link)}`} style={{ flex: '0 0 86%', maxWidth: 360, scrollSnapAlign: 'start' }}>
      <div className="k-cover" style={{ position: 'relative', height: 215, borderRadius: 20 }}>
        <img src={item.thumb} alt={item.title} loading="lazy" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
        <span className="k-tag" style={{ position: 'absolute', top: 10, left: 10 }}>{typeLabel(item)}</span>
        <div className="k-card-flat" style={{ position: 'absolute', left: 8, right: 8, bottom: 8, padding: '6px 12px', fontSize: 14, fontWeight: 900, ...ell }}>{item.title}</div>
      </div>
    </Link>
  );
});

// ─── Util tampilan ───────────────────────────────────────────────────────────
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
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx={12} cy={12} r={3} /></svg>
);
const TypeBadge = ({ item, size = 11 }: { item: any; size?: number }) => (
  <span className="k-tag" style={{ fontSize: size }}>{typeLabel(item)}</span>
);
const NewBadge = ({ size = 11 }: { size?: number }) => (
  <span className="k-tag k-tag-new" style={{ fontSize: size }}>BARU</span>
);
const Cover = ({ src, alt = '' }: { src: string; alt?: string }) => (
  <img src={src} alt={alt} loading="lazy" referrerPolicy="no-referrer" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
);

// ─── Pembaruan terbaru: daftar vertikal ──────────────────────────────────────
const LatestList = memo(function LatestList({ items }: { items: any[] }) {
  return (
    <div style={{ padding: '0 14px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {items.map((m, i) => {
        const views = fmtViews(m.views);
        const ch = chNum(m.chapter);
        return (
          <Link key={i} href={mangaHref(m)} className="k-card" style={{ display: 'flex', gap: 12, padding: 10 }}>
            <div className="k-cover" style={{ position: 'relative', flex: '0 0 76px', height: 112, borderWidth: 2, borderRadius: 12 }}>
              <Cover src={m.thumb} alt={m.title} />
              <span style={{ position: 'absolute', top: 5, left: 5 }}><TypeBadge item={m} size={10} /></span>
            </div>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 900, lineHeight: 1.15, ...clamp(2) }}>{m.title}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5, fontSize: 13, fontWeight: 800 }}>
                  <span><span style={{ color: STAR }}>★</span> {ratingId(m, true)}</span>
                  {views && <span style={{ color: MUTED, display: 'flex', alignItems: 'center', gap: 4 }}><Eye /> {views}</span>}
                  {isFresh(m.time) && <NewBadge />}
                </div>
              </div>
              {ch && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--accent-soft)', border: '2px solid #A9CBF5', borderRadius: 12, padding: '6px 12px', marginTop: 8 }}>
                  <span className="pixel" style={{ fontSize: 14, fontWeight: 700, color: '#1655B0' }}>{ch}</span>
                  {m.time && <span style={{ fontSize: 11.5, fontWeight: 800, color: MUTED }}>{m.time}</span>}
                </div>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
});

// ─── Kartu Premium (papan "Rilis Awal") ──────────────────────────────────────
function PremiumCard() {
  return (
    <div className="k-panel" style={{ margin: '28px 14px 0' }}>
      <div className="k-panel-head" style={{ fontSize: 15 }}>Komikita Premium</div>
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 20, fontWeight: 900, lineHeight: 1.15 }}>Baca tanpa iklan</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: MUTED, marginTop: 3, lineHeight: 1.3 }}>Plus unduh massal untuk baca offline</div>
        </div>
        <Link href="/profile" className="k-btn k-btn-gold" style={{ fontSize: 14, whiteSpace: 'nowrap' }}>
          Coba sekarang
        </Link>
      </div>
    </div>
  );
}

// ─── Terpopuler: kolom berisi 3 peringkat, geser ke samping ──────────────────
const Ranked = memo(function Ranked({ items }: { items: any[] }) {
  const cols: any[][] = [];
  for (let i = 0; i < items.length; i += 3) cols.push(items.slice(i, i + 3));
  return (
    <div className="no-scrollbar" style={{ display: 'flex', gap: 10, overflowX: 'auto', scrollSnapType: 'x mandatory', padding: '0 14px 8px' }}>
      {cols.map((col, ci) => (
        <div key={ci} style={{ flex: '0 0 88%', display: 'flex', flexDirection: 'column', gap: 12, scrollSnapAlign: 'start' }}>
          {col.map((m, ri) => {
            const n = ci * 3 + ri + 1;
            const views = fmtViews(m.views);
            return (
              <Link key={ri} href={mangaHref(m)} className="k-card" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px 8px 8px' }}>
                <span className="pixel" style={{ width: 34, textAlign: 'center', fontSize: 30, fontWeight: 700, color: n <= 3 ? GOLD : '#B9A57A', textShadow: n <= 3 ? '0 2px 0 #B07F0A' : 'none' }}>{n}</span>
                <div className="k-cover" style={{ position: 'relative', flex: '0 0 56px', height: 80, borderWidth: 2, borderRadius: 10 }}>
                  <Cover src={m.thumb} alt={m.title} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 900, lineHeight: 1.2, ...clamp(2) }}>{m.title}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, fontSize: 13, fontWeight: 800 }}>
                    <span><span style={{ color: STAR }}>★</span> {ratingId(m, true)}</span>
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
      <div className="k-cover" style={{ position: 'relative', paddingTop: '150%', borderRadius: 16 }}>
        <Cover src={m.thumb} alt={m.title} />
        <div style={{ position: 'absolute', top: 6, left: 6, display: 'flex', gap: 4 }}>
          <TypeBadge item={m} />
          {isFresh(m.time) && <NewBadge />}
        </div>
      </div>
      <div style={{ ...onGrass, fontSize: 13.5, fontWeight: 900, lineHeight: 1.2, marginTop: 8, ...clamp(2) }}>{m.title}</div>
      {ch && <div className="pixel" style={{ ...onGrass, fontSize: 12.5, fontWeight: 600, marginTop: 2, opacity: .92 }}>{ch}</div>}
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
        {categories.map((c, i) => (
          <button key={c.category} onClick={() => setSel(i)} className="k-chip" data-on={i === sel}>
            {c.category}
          </button>
        ))}
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
      <div className="k-card k-pill" style={{ margin: '0 14px 16px', display: 'inline-flex', padding: 4, gap: 2 }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} className={tab === t ? 'k-btn' : 'pixel'} style={tab === t ? { fontSize: 15, padding: '6px 20px', borderWidth: 2, boxShadow: '0 3px 0 var(--accent-edge)' } : { padding: '8px 20px', fontSize: 15, fontWeight: 700, color: MUTED, background: 'none', border: 0 }}>{t}</button>
        ))}
      </div>
      {list.length ? (
        <div className="no-scrollbar" style={{ display: 'flex', gap: 10, overflowX: 'auto', padding: '0 14px' }}>
          {list.map((m, i) => <PosterCard key={tab + i} m={m} w="calc((100% - 30px) / 3.35)" />)}
        </div>
      ) : (
        <div style={{ ...onGrass, padding: '10px 14px', fontWeight: 800 }}>Belum ada komik {tab}.</div>
      )}
    </>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────
function SkeletonHome() {
  const sh: React.CSSProperties = { background: 'linear-gradient(90deg,#EADFC0 25%,#F7EED4 50%,#EADFC0 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite linear', border: '2px solid var(--card-line)' };
  return (
    <div style={{ padding: '0 14px' }}>
      <div style={{ ...sh, height: 215, borderRadius: 18 }} />
      <div style={{ ...sh, width: 150, height: 26, borderRadius: 99, margin: '30px 0 14px' }} />
      <div style={{ ...sh, height: 110, borderRadius: 22 }} />
      <div style={{ ...sh, width: 190, height: 26, borderRadius: 99, margin: '30px 0 14px' }} />
      <div style={{ ...sh, height: 215, borderRadius: 20 }} />
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
  const hero = all.slice(0, 5);
  const recommended = all.slice(5, 15);
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

      <div style={{ color: '#fff', minHeight: '100vh', paddingBottom: 24 }}>
        <Header onSearch={goSearch} />
        {loading ? (
          <SkeletonHome />
        ) : error ? (
          <div className="k-card" style={{ margin: 20, padding: 20, textAlign: 'center', fontWeight: 800 }}>{error}</div>
        ) : (
          <>
            <Hero items={hero} />
            <ContinueReading />

            <SectionTitle title="Rekomendasi" sub="Pilihan tim Komikita" action="Lihat semua" onAction={() => seeAll('Rekomendasi')} />
            <div className="no-scrollbar" style={{ display: 'flex', gap: 12, overflowX: 'auto', scrollSnapType: 'x mandatory', scrollPaddingLeft: 14, padding: '0 14px' }}>
              {recommended.map((m, i) => <BigCard key={i} item={m} />)}
            </div>

            <SectionTitle title="Pembaruan terbaru" action="Lihat semua" onAction={() => seeAll('Update')} />
            <LatestList items={latest} />

            <PremiumCard />

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
