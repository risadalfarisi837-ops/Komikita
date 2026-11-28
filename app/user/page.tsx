'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { PawPrint, Camera, BookOpen } from 'lucide-react';
import { LevelPill } from '@/components/LevelPill';
import { findLencana, TRACK_COLOR } from '@/lib/lencana';
import { numericId, formatShortId } from '@/lib/utils';
import { RANKS } from '@/lib/season';
import { getFirebase } from '@/lib/leaderboard';
import { useFavorites, useHistory } from '@/lib/store';
import { WALLPAPER_CATALOG, RARITY_STYLE, wpBg } from '@/lib/wallpapers';
import { BORDER_CATALOG } from '@/components/BorderSheet';
import VerifiedBadge from '@/components/VerifiedBadge';
import DevBadge from '@/components/DevBadge';
import PremiumName from '@/components/PremiumName';
import { isPremiumRole } from '@/lib/premium';

const MUTED = '#8e9bb8';
const BLUE = '#1D9BF0';

const TIERS = [
  { name: 'Stone', min: 0, max: 49, color: '#9ca3af', icon: '🌑' },
  { name: 'Bronze', min: 50, max: 149, color: '#cd7f32', icon: '🥉' },
  { name: 'Silver', min: 150, max: 499, color: '#bdc3c7', icon: '🥈' },
  { name: 'Gold', min: 500, max: 2499, color: '#f1c40f', icon: '🥇' },
  { name: 'Emerald', min: 2500, max: 4999, color: '#2ecc71', icon: '🔮' },
  { name: 'Diamond', min: 5000, max: 9999, color: '#3498db', icon: '💎' },
  { name: 'Master', min: 10000, max: 19999, color: '#9b59b6', icon: '👑' },
  { name: 'Mythic', min: 20000, max: Infinity, color: '#ef4444', icon: '🌟' },
];
const tierOf = (lv: number) => TIERS.find((t) => lv >= t.min && lv <= t.max) || TIERS[0];

const FIELDS = ['displayName', 'photoURL', 'level', 'role', 'joinedAt', 'menitMenonton', 'exp', 'activeBorder', 'activeWallpaper', 'premiumUntil', 'lencana', 'shortId'];

function timeAgo(ts: number) {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return 'Baru saja';
  if (m < 60) return m + ' menit lalu';
  const h = Math.floor(m / 60);
  if (h < 24) return h + ' jam lalu';
  const d = Math.floor(h / 24);
  if (d < 30) return d + ' hari lalu';
  return Math.floor(d / 30) + ' bulan lalu';
}

interface UserComment { id: string; teks: string; waktu: number; chapterTitle?: string; kind: string }

function Shield({ color, size = 20 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="rgba(255,255,255,.55)" strokeWidth={1.4} strokeLinejoin="round">
      <path d="M12 2.5l8 3v6c0 5-3.4 8.6-8 10-4.6-1.4-8-5-8-10v-6l8-3z" />
    </svg>
  );
}

function Avatar({ src, size, borderKey }: { src?: string; size: number; borderKey?: string }) {
  const b: any = borderKey ? (BORDER_CATALOG as any)[borderKey] : null;
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: '0 0 ' + size + 'px' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src || 'https://placehold.co/' + size + '/1a1d24/fff?text=?'}
        alt=""
        referrerPolicy="no-referrer"
        style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', background: '#1a1d24' }}
      />
      {b && b.url && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', width: '130%', height: '130%', transform: 'translate(-50%,-50%)', backgroundImage: "url('" + b.url + "')", backgroundSize: 'contain', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', pointerEvents: 'none', zIndex: 10 }} />
      )}
    </div>
  );
}

function UserContent() {
  const sp = useSearchParams();
  const uid = sp.get('uid') || '';
  const [prof, setProf] = useState<any>(null);
  const [comments, setComments] = useState<UserComment[]>([]);
  const [myUid, setMyUid] = useState<string>('');
  const [state, setState] = useState<'loading' | 'ok' | 'error' | 'empty'>('loading');
  const [tab, setTab] = useState<'semua' | 'komentar' | 'riwayat'>('semua');
  const [hearts, setHearts] = useState(0);
  const { favorites } = useFavorites();
  const { history } = useHistory();

  useEffect(() => {
    if (!uid) { setState('empty'); return; }
    let alive = true;
    (async () => {
      try {
        const { auth, db } = await getFirebase();
        auth.onAuthStateChanged((u: any) => { if (alive) setMyUid(u ? u.uid : ''); });

        const res = await Promise.all(
          FIELDS.map((f) =>
            db.ref('users/' + uid + '/' + f).get().then((s: any) => [f, s.val()]).catch(() => [f, undefined])
          )
        );
        const p: any = {};
        let anyOk = false;
        res.forEach((r: any) => { if (r[1] !== undefined && r[1] !== null) { p[r[0]] = r[1]; anyOk = true; } });
        if (!alive) return;
        if (!anyOk) { setState('error'); return; }
        setProf(p);
        setState('ok');
        try { const hs = await db.ref('charisma/all/' + uid).get(); if (alive) setHearts(Number(hs.val()) || 0); } catch { /* abaikan */ }

        const list: UserComment[] = [];
        for (const node of ['chapterComments', 'mangaComments']) {
          try {
            const snap = await db.ref(node).get();
            snap.forEach((room: any) => {
              room.forEach((c: any) => {
                const v = c.val();
                if (v && v.uid === uid && v.teks) list.push({ id: node + c.key, teks: v.teks, waktu: v.waktu || 0, chapterTitle: v.chapterTitle || v.mangaTitle || '', kind: node });
              });
            });
          } catch { /* node tidak bisa dibaca, lewati */ }
        }
        list.sort((a, b) => b.waktu - a.waktu);
        if (alive) setComments(list);
      } catch {
        if (alive) setState('error');
      }
    })();
    return () => { alive = false; };
  }, [uid]);

  const back = () => { if (window.history.length > 1) window.history.back(); else window.location.assign('/'); };
  const isMe = !!myUid && myUid === uid;

  const Wrap = ({ children }: { children: any }) => (
    <div style={{ position: 'fixed', inset: 0, overflowY: 'auto', background: '#121212', color: '#fff', zIndex: 300 }}>{children}</div>
  );
  const BackBtn = () => (
    <button onClick={back} aria-label="Kembali" style={{ position: 'absolute', left: 10, top: 'max(12px, env(safe-area-inset-top))', background: 'rgba(0,0,0,.3)', border: 0, borderRadius: 99, width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5 }}>
      <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M11 5l-7 7 7 7" /></svg>
    </button>
  );

  if (state === 'loading') return <Wrap><BackBtn /><div style={{ padding: '140px 24px', textAlign: 'center', color: MUTED, fontWeight: 700 }}>Memuat profil…</div></Wrap>;
  if (state === 'empty') return <Wrap><BackBtn /><div style={{ padding: '140px 24px', textAlign: 'center', color: MUTED, fontWeight: 700 }}>Profil tidak ditemukan.</div></Wrap>;
  if (state === 'error' || !prof) return (
    <Wrap><BackBtn />
      <div style={{ padding: '140px 24px', textAlign: 'center', color: MUTED, fontWeight: 700, lineHeight: 1.5 }}>
        Profil belum bisa dimuat.<br /><span style={{ fontSize: 13, fontWeight: 600 }}>Pastikan kamu sudah login, dan Rules Firebase mengizinkan membaca data profil.</span>
      </div>
    </Wrap>
  );

  const level = Number(prof.level) || 1;
  const wp: any = prof.activeWallpaper ? (WALLPAPER_CATALOG as any)[prof.activeWallpaper] : null;
  const bannerBg = wp ? wpBg(prof.activeWallpaper, true) : 'linear-gradient(160deg,#3a2f1f,#1b1a22 60%,#0f0f14)';
  const pu = Number(prof.premiumUntil) || 0;
  const verified = isPremiumRole(prof.role) && (!pu || pu > Date.now());
  const dev = prof.role === 'Developer';
  const joined = Number(prof.joinedAt) || 0;
  const months = joined ? Math.max(0, Math.floor((Date.now() - joined) / (30.44 * 86400000))) : null;
  const minutes = Number(prof.menitMenonton) || 0;
  const expTotal = Number.isFinite(Number(prof.exp)) && prof.exp != null ? Number(prof.exp) : (level - 1) * 200;
  const shortUid = formatShortId((prof as any)?.shortId, uid);
  const name = prof.displayName || 'User';
  const lk = findLencana(prof.lencana);
  const lkBg = (lk && ((RANKS as any[]).find((r) => r.name === lk.name)?.bg || TRACK_COLOR[lk.track])) || '#334155';
  const YELLOW = '#F5C842';
  const dateTxt = (ts: number) => (ts ? new Date(ts).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '');

  type FeedItem = { k: 'c'; id: string; waktu: number; c: UserComment } | { k: 'h'; id: string; waktu: number; h: any };
  const feed: FeedItem[] = [
    ...(tab !== 'riwayat' ? comments.map((c): FeedItem => ({ k: 'c', id: c.id, waktu: c.waktu, c })) : []),
    ...(tab !== 'komentar' && isMe ? history.slice(0, 60).map((h: any): FeedItem => ({ k: 'h', id: 'h' + h.chapterLink, waktu: h.readAt || 0, h })) : []),
  ].sort((x, y) => y.waktu - x.waktu);

  const stat = (val: any, label: string, first = false) => (
    <div style={{ textAlign: 'center', flex: 1, borderLeft: first ? 0 : '1px solid rgba(255,255,255,.22)', padding: '2px 0' }}>
      <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: -0.3, lineHeight: 1.15, textShadow: '0 1px 4px rgba(0,0,0,.5)' }}>{val}</div>
      <div style={{ fontSize: 13, fontWeight: 500, color: '#DAD6CF', marginTop: 4, textShadow: '0 1px 3px rgba(0,0,0,.5)' }}>{label}</div>
    </div>
  );

  const private_ = (txt: string) => (
    <div style={{ textAlign: 'center', color: MUTED, fontWeight: 700, fontSize: 15, padding: '48px 30px' }}>{txt}</div>
  );

  const pillBase: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 45, padding: '0 22px', borderRadius: 99, fontSize: 14.5, fontWeight: 800, letterSpacing: -0.2, whiteSpace: 'nowrap' };

  return (
    <Wrap>
      <div style={{ position: 'relative', background: bannerBg }}>
        <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,.38) 0%, rgba(0,0,0,.22) 38%, rgba(10,10,14,.78) 100%)' }} />
        <div style={{ position: 'relative', paddingBottom: 16 }}>
          {/* Bilah atas */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'max(16px, env(safe-area-inset-top)) 16px 0' }}>
            <button onClick={back} aria-label="Kembali" style={{ background: 'none', border: 0, padding: 4, display: 'flex' }}>
              <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M11 5l-7 7 7 7" /></svg>
            </button>
            {isMe ? <Link href="/settings" style={{ color: '#fff', fontSize: 15, fontWeight: 800, letterSpacing: -0.2, textShadow: '0 1px 4px rgba(0,0,0,.5)' }}>Setting</Link> : <span />}
          </div>

          {/* Avatar + tombol kamera + hati */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 10 }}>
            <div style={{ position: 'relative', borderRadius: '50%', boxShadow: '0 4px 18px rgba(0,0,0,.4)' }}>
              <Avatar src={prof.photoURL} size={124} borderKey={prof.activeBorder} />
              {isMe && (
                <Link href="/profile/edit" aria-label="Ganti foto" style={{ position: 'absolute', top: 2, right: -16, width: 41, height: 41, borderRadius: '50%', background: '#1E90FF', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 12, boxShadow: '0 2px 8px rgba(0,0,0,.4)' }}>
                  <Camera size={21} color="#fff" fill="#fff" strokeWidth={1.5} />
                </Link>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: -17, position: 'relative', zIndex: 13 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 34, minWidth: 59, justifyContent: 'center', padding: '0 14px', borderRadius: 99, background: 'rgba(22,18,28,.92)', border: '1px solid rgba(255,255,255,.08)', fontSize: 16, fontWeight: 800 }}>
              <svg width={18} height={18} viewBox="0 0 24 24" fill="#FF4F93" aria-hidden><path d="M12 21s-8-5-8-11a4.6 4.6 0 018-3 4.6 4.6 0 018 3c0 6-8 11-8 11z" /></svg>
              {hearts}
            </span>
          </div>

          {/* Nama + ID */}
          <div style={{ textAlign: 'center', padding: '14px 16px 0' }}>
            <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              <PremiumName premium={verified} dev={dev} style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5, wordBreak: 'break-word', textShadow: '0 2px 6px rgba(0,0,0,.45)' }}>{name}</PremiumName>
              <span style={{ fontSize: 15.5, fontWeight: 600, color: '#CFC8BE', textShadow: '0 1px 4px rgba(0,0,0,.5)' }}>{shortUid}</span>
              {verified && <span style={{ alignSelf: 'center' }}><VerifiedBadge size={20} /></span>}
              {dev && <span style={{ alignSelf: 'center' }}><DevBadge size={24} /></span>}
            </div>
            <div style={{ marginTop: 14, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {lk && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 29, padding: '0 14px 0 5px', borderRadius: 99, background: lkBg, fontSize: 15, fontWeight: 800, letterSpacing: -0.3 }}>
                  <Shield color={lkBg} size={20} />{lk.name}
                </span>
              )}
              <LevelPill level={level} label="Lvl." fontSize="15px" iconSize={17} style={{ height: 29, padding: '0 14px 0 9px' }} />
              {prof.role && prof.role !== 'Member' && (
                <span style={{ display: 'inline-flex', alignItems: 'center', height: 29, padding: '0 13px', borderRadius: 99, background: dev ? 'linear-gradient(90deg,#22d3ee,#818cf8,#e879f9)' : 'rgba(255,255,255,.14)', color: dev ? '#0b0b14' : '#fff', fontSize: 13, fontWeight: 800 }}>{dev ? 'DEVELOPER' : prof.role}</span>
              )}
            </div>
          </div>

          {/* Statistik */}
          <div style={{ display: 'flex', padding: '26px 8px 0' }}>
            {stat(expTotal, 'exp', true)}
            {stat(comments.length, 'komentar')}
            {stat(months === null ? '–' : months, 'bulan')}
            {stat(minutes, 'menit')}
          </div>

          {/* Tombol */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, padding: '22px 14px 0' }}>
            {isMe ? (
              <Link href="/ranking/lencana" style={{ ...pillBase, color: '#fff', background: 'rgba(255,255,255,.13)', border: '2px solid rgba(255,255,255,.3)', backdropFilter: 'blur(6px)' }}>{lk ? lk.name : 'Pilih lencana'}</Link>
            ) : lk ? (
              <span style={{ ...pillBase, color: '#fff', background: 'rgba(255,255,255,.13)', border: '2px solid rgba(255,255,255,.3)' }}>{lk.name}</span>
            ) : null}
            {isMe && (
              <Link href="/komikstore/pet" style={{ ...pillBase, color: YELLOW, background: 'rgba(110,86,20,.28)', border: '2px solid #8C6D1F', backdropFilter: 'blur(6px)' }}>
                <PawPrint size={20} color={YELLOW} fill={YELLOW} /> Kelola Pet
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Tab */}
      <div style={{ display: 'flex', background: '#14151A' }}>
        {([['semua', 'Semua'], ['komentar', 'Komentar'], ['riwayat', 'Riwayat']] as const).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} style={{ flex: 1, background: 'none', border: 0, padding: '15px 0 0', color: tab === k ? '#fff' : '#8E8E98', fontSize: 17.5, fontWeight: 800, letterSpacing: -0.3 }}>
            <span style={{ display: 'inline-block', padding: '0 2px 10px', borderBottom: '3.5px solid ' + (tab === k ? YELLOW : 'transparent'), borderRadius: 2 }}>{label}</span>
          </button>
        ))}
      </div>

      {/* Isi */}
      <div style={{ padding: '6px 16px 70px', background: '#17181C', minHeight: 300 }}>
        {tab === 'riwayat' && !isMe && private_('Riwayat baca bersifat pribadi.')}
        {!(tab === 'riwayat' && !isMe) && feed.length === 0 && private_(tab === 'riwayat' ? 'Belum ada riwayat.' : tab === 'komentar' ? 'Belum ada komentar.' : 'Belum ada aktivitas.')}
        {!(tab === 'riwayat' && !isMe) && feed.map((it) => {
          const head = (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Avatar src={prof.photoURL} size={41} />
              <div style={{ minWidth: 0 }}>
                <PremiumName premium={verified} dev={dev} style={{ fontSize: 13.5, fontWeight: 800, letterSpacing: -0.3 }}>{name}</PremiumName>
                {lk && (
                  <div style={{ marginTop: 3 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: 19, padding: '0 9px 0 3px', borderRadius: 99, background: lkBg, fontSize: 11, fontWeight: 800 }}><Shield color={lkBg} size={14} />{lk.name}</span>
                  </div>
                )}
              </div>
              <span style={{ marginLeft: 'auto', color: MUTED, fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap' }}>• {dateTxt(it.waktu)}</span>
            </div>
          );
          if (it.k === 'c') {
            const c = it.c;
            return (
              <div key={it.id} style={{ padding: '18px 0 14px' }}>
                {head}
                {c.chapterTitle ? <div style={{ marginTop: 12, color: '#C9CEDC', fontSize: 14, fontWeight: 700 }}>{c.chapterTitle}</div> : null}
                <div style={{ marginTop: c.chapterTitle ? 4 : 12, fontSize: 16, fontWeight: 400, lineHeight: 1.4, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{c.teks}</div>
              </div>
            );
          }
          const h = it.h;
          const pct = h.totalPages ? Math.min(100, Math.round((h.pageRead / h.totalPages) * 100)) : 0;
          return (
            <div key={it.id} style={{ padding: '18px 0 14px' }}>
              {head}
              <Link href={'/chapter?url=' + encodeURIComponent(h.chapterLink) + '&thumb=' + encodeURIComponent(h.mangaThumb || '') + '&mangaTitle=' + encodeURIComponent(h.mangaTitle || '')} style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 14 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={h.mangaThumb} alt="" referrerPolicy="no-referrer" style={{ width: 48, height: 48, borderRadius: 11, objectFit: 'cover', background: '#1a1d24', flex: '0 0 48px' }} />
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 16, fontWeight: 400, letterSpacing: -0.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.mangaTitle}</span>
                  <span style={{ display: 'block', fontSize: 12.5, fontWeight: 500, color: MUTED, marginTop: 2 }}>Chapter {h.chapterNumber}</span>
                </span>
              </Link>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
                <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#B9B9C0', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 20px' }}><BookOpen size={12} color="#17181C" /></span>
                <span style={{ flex: 1, height: 2, borderRadius: 2, background: '#3A3A41', position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: Math.max(pct, 2) + '%', background: '#E5251B', borderRadius: 2 }} />
                </span>
                <span style={{ color: MUTED, fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap' }}>{h.pageRead || 0} / {h.totalPages || 0} hal</span>
              </div>
            </div>
          );
        })}
      </div>
    </Wrap>
  );
}

export default function UserPage() {
  return (
    <Suspense fallback={null}>
      <UserContent />
    </Suspense>
  );
}
