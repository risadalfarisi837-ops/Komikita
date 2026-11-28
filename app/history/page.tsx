'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useHistory, useFavorites, HistoryItem, FavoriteItem } from '@/lib/store';
import { Clock, Heart, Download, Search, ArrowUpDown, List, LayoutGrid, Check } from 'lucide-react';

function formatDate(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const same = (a: Date, b: Date) =>
    a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
  if (same(d, today)) return 'Hari Ini';
  if (same(d, yesterday)) return 'Kemarin';
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

type Tab = 'favorite' | 'history' | 'download';

// ─── Tab (segmented pill) ─────────────────────────────────────────────────────
function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const tabs: { key: Tab; label: string }[] = [
    { key: 'favorite', label: 'Favorit' },
    { key: 'history',  label: 'Riwayat' },
    { key: 'download', label: 'Unduhan' },
  ];
  return (
    <div className="flex w-full p-1.5 rounded-full border border-white/5" style={{ background: '#2A2931' }}>
      {tabs.map((t) => {
        const isActive = active === t.key;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className="flex-1 py-3 text-[17px] font-extrabold rounded-full transition-all"
            style={{ color: isActive ? '#fff' : '#8F8D9B', background: isActive ? '#1B1A20' : 'transparent' }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Search Bar ───────────────────────────────────────────────────────────────
function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      autoFocus
      type="text"
      placeholder="Search..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-[#2A2931] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-white/25 transition-colors"
    />
  );
}

// ─── Info chapter terbaru tiap favorit (di-cache di localStorage) ─────────────
type Meta = { latestNum: number | null; latestLabel: string; latestAt: number; fetchedAt: number };
const META_KEY = 'komiku-fav-meta';
const META_TTL = 6 * 3600 * 1000;
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const uuidOf = (l: string) => (l || '').match(UUID_RE)?.[0].toLowerCase() || l;
const numOf = (v: string) => { const m = String(v || '').match(/\d+(\.\d+)?/); return m ? parseFloat(m[0]) : null; };

function formatShortDate(ts: number) {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

const ratingFromDesc = (d?: string) => { const m = (d || '').match(/Score:\s*([\d.]+)/i); const n = m ? parseFloat(m[1]) : 0; return n > 0 ? n.toFixed(1) : null; };
type FavView = { item: FavoriteItem; added: number; latestLabel: string; latestAt: number; unread: number; reading: boolean; lastReadAt: number; pct: number; rating: string | null };
type Sort = 'added' | 'recent' | 'title' | 'new';
const SORT_LABEL: Record<Sort, string> = { added: 'Baru ditambahkan', recent: 'Terakhir dibaca', title: 'Judul A–Z', new: 'Chapter baru terbanyak' };
const SORT_ORDER: Sort[] = ['added', 'recent', 'title', 'new'];

function Badge({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span className="absolute top-2 right-2 z-10 text-white text-[15px] font-extrabold leading-none px-2.5 py-1.5 rounded-full" style={{ background: 'var(--accent)' }}>
      {n > 99 ? '99+' : n}
    </span>
  );
}

// ─── History Card ─────────────────────────────────────────────────────────────
function HistoryCard({
  item,
}: {
  item: HistoryItem;
}) {
  const inner = (
    <div className="bg-[#2A2931] rounded-2xl p-4 border border-white/5 flex gap-4 items-center active:scale-[0.98] transition-all" style={{marginBottom:12}}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <div style={{width:64,height:88,minWidth:64,maxWidth:64,flexShrink:0,borderRadius:12,overflow:"hidden",background:"#252830"}}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.mangaThumb} alt="" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}} loading="lazy" referrerPolicy="no-referrer" onError={(e) => { (e.target as HTMLImageElement).style.display="none"; }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-base text-white font-bold leading-tight line-clamp-2">{item.mangaTitle}</p>
        <p className="text-sm text-gray-300 font-semibold mt-1.5">{item.chapterTitle || item.chapterNumber}</p>
      </div>
    </div>
  );

  return <Link href={`/chapter?url=${encodeURIComponent(item.chapterLink)}&thumb=${encodeURIComponent(item.mangaThumb||'')}&mangaTitle=${encodeURIComponent(item.mangaTitle||'')}`}>{inner}</Link>;
}

// ─── Favorite Card (grid / list) ──────────────────────────────────────────────
function FavoriteCard({ v, mode }: { v: FavView; mode: 'grid' | 'list' }) {
  const href = `/manga?url=${encodeURIComponent(v.item.link)}`;
  const sub = v.latestLabel ? `${v.latestLabel}${v.latestAt ? ` · ${formatShortDate(v.latestAt)}` : ''}` : '';

  if (mode === 'list') {
    return (
      <Link href={href} className="flex gap-4 items-center bg-[#2A2931] rounded-2xl p-3 border border-white/5">
        <div className="relative shrink-0 rounded-xl overflow-hidden bg-[#252830]" style={{ width: 64, height: 88 }}>
          <Badge n={v.unread} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={v.item.thumb} alt="" className="w-full h-full object-cover block" loading="lazy" referrerPolicy="no-referrer" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base text-white font-bold leading-tight line-clamp-2">{v.item.title}</p>
          {sub && <p className="text-sm text-gray-400 font-semibold mt-1.5">{sub}</p>}
        </div>
      </Link>
    );
  }

  return (
    <Link href={href} className="flex flex-col min-w-0">
      <div className="relative w-full aspect-[2/3] rounded-xl overflow-hidden bg-[#252830]">
        <Badge n={v.unread} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={v.item.thumb} alt={v.item.title} className="w-full h-full object-cover block" loading="lazy" referrerPolicy="no-referrer" />
      </div>
      <p className="text-white text-[17px] font-extrabold leading-tight line-clamp-2 mt-2.5 px-0.5" style={{ overflowWrap: 'break-word' }}>{v.item.title}</p>
      {v.latestLabel && <p className="text-[#8F8D9B] text-[15px] font-bold mt-1 px-0.5">{v.latestLabel}</p>}
      {v.latestAt > 0 && <p className="text-[#8F8D9B] text-[15px] font-bold px-0.5">· {formatShortDate(v.latestAt)}</p>}
    </Link>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ tab }: { tab: Tab }) {
  const cfg = {
    favorite: { icon: <Heart className="w-8 h-8 text-gray-600" />, title: 'Belum ada favorit', desc: 'Tandai manga favoritmu agar muncul di sini' },
    history:  { icon: <Clock className="w-8 h-8 text-gray-600" />,  title: 'Belum ada riwayat', desc: 'Mulai baca manga dan riwayatnya akan muncul di sini' },
    download: { icon: <Download className="w-8 h-8 text-gray-600" />, title: 'Belum ada unduhan', desc: 'Download manga untuk dibaca secara offline' },
  }[tab];
  return (
    <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[#1A1A1F] flex items-center justify-center mb-4 border border-white/5">
        {cfg.icon}
      </div>
      <p className="text-white font-bold">{cfg.title}</p>
      <p className="text-gray-500 text-sm mt-1">{cfg.desc}</p>
      <Link href="/" className="mt-6 px-6 py-3 bg-[#2A2931] text-white font-bold text-sm rounded-full">Jelajahi Manga</Link>
    </div>
  );
}

const SORT_SHORT: Record<Sort, string> = { added: 'Baru Ditambah', recent: 'Terakhir Dibaca', title: 'Judul A–Z', new: 'Chapter Baru' };
const SECTION: Record<'all' | 'reading' | 'unread', string> = { all: 'SEMUA KOMIK', reading: 'SEDANG DIBACA', unread: 'BELUM DIBACA' };
const clamp2: React.CSSProperties = { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' };

// ─── Kartu poster Koleksi (badge New + rating + chapter terbaru + garis progres) ──
function PosterFav({ v }: { v: FavView }) {
  const href = `/manga?url=${encodeURIComponent(v.item.link)}`;
  return (
    <Link href={href} style={{ minWidth: 0, display: 'block' }}>
      <div style={{ position: 'relative', paddingTop: '138%', borderRadius: 20, overflow: 'hidden', background: '#26252C' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img decoding="async" loading="lazy" src={v.item.thumb} alt={v.item.title} referrerPolicy="no-referrer" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        <div aria-hidden style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '38%', background: 'linear-gradient(to top, rgba(0,0,0,.72), rgba(0,0,0,0))' }} />
        {v.unread > 0 && (
          <span style={{ position: 'absolute', top: 0, left: 0, background: '#2196F3', color: '#fff', fontSize: 14, fontWeight: 800, padding: '7px 14px', borderRadius: '20px 0 14px 0' }}>New</span>
        )}
        {v.rating && (
          <span style={{ position: 'absolute', top: 0, right: 0, display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(20,19,24,.78)', color: '#fff', fontSize: 13, fontWeight: 800, padding: '6px 9px', borderRadius: '0 20px 0 14px' }}>
            <span style={{ color: '#FBBF24' }}>★</span>{v.rating.replace('.', ',')}
          </span>
        )}
        {v.latestLabel && (
          <span style={{ position: 'absolute', left: 9, bottom: 9, fontSize: 17, fontWeight: 800, letterSpacing: -0.5, color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,.6)' }}>{v.latestLabel}</span>
        )}
        {v.reading && v.pct > 0 && (
          <div aria-hidden style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 4, background: 'rgba(255,255,255,.18)' }}>
            <div style={{ width: v.pct + '%', height: '100%', background: '#E5252A' }} />
          </div>
        )}
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: -0.3, lineHeight: 1.25, marginTop: 9, overflowWrap: 'break-word', ...clamp2 }}>{v.item.title}</div>
    </Link>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function HistoryPage() {
  const { history } = useHistory();
  const { favorites } = useFavorites();

  const [activeTab, setActiveTab] = useState<Tab>('favorite');
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [filter, setFilter] = useState<'all' | 'reading' | 'unread'>('all');
  const [sort, setSort] = useState<Sort>('added');
  const [mode, setMode] = useState<'grid' | 'list'>('grid');
  const [meta, setMeta] = useState<Record<string, Meta>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try { setMeta(JSON.parse(localStorage.getItem(META_KEY) || '{}')); } catch { /* abaikan */ }
  }, []);

  // Ambil chapter terbaru tiap favorit (3 request paralel, di-cache 6 jam)
  const favKey = favorites.map(f => f.link).join('|');
  useEffect(() => {
    if (!mounted || favorites.length === 0) return;
    let cancelled = false;
    const stale = favorites.filter(f => !meta[f.link] || Date.now() - meta[f.link].fetchedAt > META_TTL);
    if (stale.length === 0) return;
    const queue = [...stale];
    const next: Record<string, Meta> = {};
    const worker = async () => {
      while (queue.length && !cancelled) {
        const f = queue.shift()!;
        let m: Meta = { latestNum: null, latestLabel: '', latestAt: 0, fetchedAt: Date.now() };
        try {
          const res = await fetch(`/api/manga/detail?url=${encodeURIComponent(f.link)}`);
          const json = await res.json();
          const c = json?.success ? json.data?.chapters?.[0] : null;
          if (c) {
            const n = numOf(c.num);
            m = { latestNum: n, latestLabel: n != null ? `Ch. ${c.num}` : (c.title || ''), latestAt: c.at ? Date.parse(c.at) : 0, fetchedAt: Date.now() };
          }
        } catch { /* simpan kosong, coba lagi setelah TTL */ }
        next[f.link] = m;
      }
    };
    Promise.all([worker(), worker(), worker()]).then(() => {
      if (cancelled) return;
      setMeta(prev => {
        const merged = { ...prev, ...next };
        try { localStorage.setItem(META_KEY, JSON.stringify(merged)); } catch { /* abaikan */ }
        return merged;
      });
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, favKey]);

  const favViews: FavView[] = useMemo(() => favorites.map((item, i) => {
    const id = uuidOf(item.link);
    const reads = history.filter(h => (h.mangaLink && uuidOf(h.mangaLink) === id) || h.mangaTitle === item.title);
    const readNum = reads.reduce<number | null>((mx, h) => {
      const n = numOf(h.chapterNumber);
      return n == null ? mx : mx == null ? n : Math.max(mx, n);
    }, null);
    const m = meta[item.link];
    const unread = m?.latestNum != null && readNum != null ? Math.max(0, Math.floor(m.latestNum) - Math.floor(readNum)) : 0;
    return {
      item, added: i,
      latestLabel: m?.latestLabel || '', latestAt: m?.latestAt || 0,
      unread, reading: reads.length > 0,
      lastReadAt: reads.reduce((mx, h) => Math.max(mx, h.readAt), 0),
      pct: reads[0] && reads[0].totalPages > 0 ? Math.min(100, Math.round((reads[0].pageRead / reads[0].totalPages) * 100)) : 0,
      rating: ratingFromDesc(item.desc),
    };
  }), [favorites, history, meta]);

  if (!mounted) return <div className="min-h-screen bg-[#1B1A20]" />;

  const handleTabChange = (t: Tab) => {
    setActiveTab(t);
    setSearch('');
    setShowSearch(false);
  };

  const q = search.toLowerCase();

  const filteredHistory = history.filter(h =>
    h.mangaTitle.toLowerCase().includes(q) ||
    (h.chapterTitle || '').toLowerCase().includes(q)
  );

  const grouped = (() => {
    const map = new Map<string, HistoryItem[]>();
    for (const item of filteredHistory) {
      const label = formatDate(item.readAt);
      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(item);
    }
    return Array.from(map.entries());
  })();

  const readingCount = favViews.filter(v => v.reading).length;
  const newCount = favViews.filter(v => v.unread > 0).length;

  const shownFavs = favViews
    .filter(v => v.item.title.toLowerCase().includes(q))
    .filter(v => filter === 'all' ? true : filter === 'reading' ? v.reading : !v.reading)
    .sort((a, b) => {
      if (sort === 'added') return b.added - a.added;
      if (sort === 'recent') return b.lastReadAt - a.lastReadAt || b.added - a.added;
      if (sort === 'title') return a.item.title.localeCompare(b.item.title);
      return b.unread - a.unread || b.added - a.added;
    });

  const cycleSort = () => setSort(SORT_ORDER[(SORT_ORDER.indexOf(sort) + 1) % SORT_ORDER.length]);

  const chips: { key: 'all' | 'reading' | 'unread'; label: string; n: number }[] = [
    { key: 'all', label: 'Semua', n: favViews.length },
    { key: 'reading', label: 'Sedang dibaca', n: readingCount },
    { key: 'unread', label: 'Belum dibaca', n: favViews.length - readingCount },
  ];

  const totalNew = favViews.reduce((s, v) => s + v.unread, 0);

  return (
    <div style={{ background: '#1B1A20', color: '#fff', minHeight: '100vh', padding: '20px 18px 140px' }}>
      <style>{`a{text-decoration:none;color:inherit} button{font-family:inherit;cursor:pointer}`}</style>

      {/* judul + urutkan */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: -1 }}>Koleksi</h1>
          <div style={{ marginTop: 3, fontSize: 13, fontWeight: 500, color: '#8F8D9B' }}>{favViews.length} komik · {totalNew} chapter baru</div>
        </div>
        {favorites.length > 0 && (
          <button onClick={cycleSort} aria-label="Urutkan" style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 7, background: 'none', border: 0, color: '#B9B7C4', fontSize: 13, fontWeight: 500, padding: '8px 0 0' }}>
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#B9B7C4" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M8 20V5M4 9l4-4 4 4M16 4v15M12 15l4 4 4-4" /></svg>
            <span>Urutkan: <b style={{ color: '#fff', fontWeight: 800 }}>{SORT_SHORT[sort]}</b></span>
          </button>
        )}
      </div>

      {favorites.length === 0 ? (
        <EmptyState tab="favorite" />
      ) : (
        <>
          {/* filter */}
          <div className="no-scrollbar" style={{ display: 'flex', gap: 9, overflowX: 'auto', marginTop: 16 }}>
            {chips.map(c => {
              const on = filter === c.key;
              return (
                <button key={c.key} onClick={() => setFilter(c.key)} style={{ flex: '0 0 auto', border: 0, borderRadius: 99, height: 36, padding: '0 19px', fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', background: on ? '#2F6BFF' : '#26252C', color: on ? '#fff' : '#A19FAD', transition: 'background .2s' }}>
                  {c.label} {c.n}
                </button>
              );
            })}
          </div>

          {/* judul bagian */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '26px 0 16px' }}>
            <span style={{ width: 4, height: 18, borderRadius: 2, background: '#E5252A' }} />
            <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: 1.6 }}>{SECTION[filter]}</span>
          </div>

          {shownFavs.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#8F8D9B', fontSize: 14, padding: '60px 0' }}>Tidak ada hasil</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '20px 9px' }}>
              {shownFavs.map(v => <PosterFav key={v.item.link} v={v} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
