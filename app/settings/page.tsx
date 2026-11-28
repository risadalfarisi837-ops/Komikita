'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useFavorites, useHistory } from '@/lib/store';
import type { FavoriteItem, HistoryItem } from '@/lib/store';
import { useSettings } from '@/lib/settings';
import { formatShortId } from '@/lib/utils';
import { ensureShortId } from '@/lib/shortid';
import { getFirebase, loginWithGoogle } from '@/lib/firebase-client';
import { LevelPill } from '@/components/LevelPill';
import VerifiedBadge from '@/components/VerifiedBadge';
import DevBadge from '@/components/DevBadge';
import pkg from '@/package.json';
import { BG, CARD, LINE, MUTED, HEAD, RED, FONT, UnitCtx, Row, Section, Pill } from './ui';

const HOME_CACHE_KEY = 'komiku_home_v2';
const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

function Dialog({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(0,0,0,.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}
        style={{ background: CARD, borderRadius: 24, padding: '20px 18px 16px', width: '100%', maxWidth: 360, border: '1px solid rgba(255,255,255,.06)' }}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{title}</div>
        {children}
      </div>
    </div>
  );
}

const dialogText: CSSProperties = { fontSize: 14, fontWeight: 500, color: MUTED, lineHeight: 1.5 };
const dialogBtn: CSSProperties = { flex: 1, border: 0, borderRadius: 999, padding: '13px 0', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' };

// ─── Halaman ──────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const favorites = useFavorites((s) => s.favorites);
  const settings = useSettings();

  const [mounted, setMounted] = useState(false);
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<{ uid: string; name: string; photo: string; email: string; level: number; shortId?: number } | null>(null);
  const [role, setRole] = useState('Member');
  const [cacheKb, setCacheKb] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [unit, setUnit] = useState(0.5); // px layar per 1 px video referensi (video 720 lebar)

  useEffect(() => {
    const fit = () => setUnit(Math.min(window.innerWidth, 448) / 720);
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  const say = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const readCache = useCallback(() => {
    try {
      const raw = localStorage.getItem(HOME_CACHE_KEY);
      setCacheKb(raw ? Math.max(1, Math.round(raw.length / 1024)) : 0);
    } catch { setCacheKb(0); }
  }, []);

  useEffect(() => {
    setMounted(true);
    readCache();
    let dead = false;
    let unsub: (() => void) | null = null;
    getFirebase().then(async ({ auth, db }) => {
      try { await auth.getRedirectResult(); } catch { /* abaikan error redirect */ }
      if (dead) return;
      unsub = auth.onAuthStateChanged(async (fu: any) => {
        if (dead) return;
        setReady(true);
        if (!fu) { setUser(null); setRole('Member'); return; }
        setUser({ uid: fu.uid, name: fu.displayName || 'User', photo: fu.photoURL || '', email: fu.email || '', level: 1 });
        try {
          const snap = await db.ref(`users/${fu.uid}`).get();
          if (dead) return;
          const d = snap.exists() ? snap.val() : {};
          setRole(d.role || 'Member');
          setUser((prev) => prev && ({ ...prev, name: d.displayName || prev.name, email: prev.email || d.email || '', level: Number(d.level) || 1, shortId: d.shortId }));
          ensureShortId(db, fu.uid).then((id) => { if (id) setUser((prev) => prev && ({ ...prev, shortId: id })); });
        } catch { /* biarkan role default */ }
      });
    }).catch(() => setReady(true));
    return () => { dead = true; if (unsub) unsub(); if (toastTimer.current) clearTimeout(toastTimer.current); };
  }, [readCache]);

  const isPremium = role === 'Komikita Premium';
  const isDev = role === 'Developer';

  const goBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) router.back();
    else router.push('/profile');
  };

  const handleLogin = async () => {
    if (loggingIn) return;
    setLoggingIn(true);
    try { await loginWithGoogle(); }
    catch (e: any) { if (!e?.code?.includes('redirect')) say('Login gagal: ' + (e?.message || e?.code || 'coba lagi')); }
    finally { setLoggingIn(false); }
  };

  const handleLogout = async () => {
    setLogoutOpen(false);
    try {
      const { auth } = await getFirebase();
      await auth.signOut();
      say('Kamu sudah keluar.');
    } catch (e: any) { say('Gagal keluar: ' + (e?.message || 'coba lagi')); }
  };

  const copyUid = async () => {
    if (!user) return;
    try { await navigator.clipboard.writeText(formatShortId(user.shortId, user.uid)); say('ID akun disalin.'); }
    catch { say('Tidak bisa menyalin ID.'); }
  };

  // ── Data: ekspor / impor ────────────────────────────────────────────────────
  const exportData = () => {
    try {
      const payload = {
        app: 'komiku',
        version: 1,
        exportedAt: new Date().toISOString(),
        favorites: useFavorites.getState().favorites,
        history: useHistory.getState().history,
      };
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `komiku-cadangan-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      say(`Cadangan disimpan: ${payload.favorites.length} favorit, ${payload.history.length} riwayat.`);
    } catch { say('Gagal membuat cadangan.'); }
  };

  const importData = async (file: File) => {
    try {
      if (file.size > MAX_IMPORT_BYTES) throw new Error('besar');
      const data = JSON.parse(await file.text());
      if (data?.app !== 'komiku' || !Array.isArray(data.favorites) || !Array.isArray(data.history)) throw new Error('format');

      const favIn: FavoriteItem[] = data.favorites
        .filter((f: any) => f && typeof f.link === 'string' && typeof f.title === 'string')
        .map((f: any) => ({ title: f.title, link: f.link, thumb: typeof f.thumb === 'string' ? f.thumb : '', ...(typeof f.desc === 'string' ? { desc: f.desc } : {}) }));
      const histIn: HistoryItem[] = data.history
        .filter((h: any) => h && typeof h.chapterLink === 'string' && typeof h.mangaTitle === 'string')
        .map((h: any) => ({
          mangaTitle: h.mangaTitle,
          mangaLink: typeof h.mangaLink === 'string' ? h.mangaLink : '',
          mangaThumb: typeof h.mangaThumb === 'string' ? h.mangaThumb : '',
          chapterTitle: typeof h.chapterTitle === 'string' ? h.chapterTitle : '',
          chapterLink: h.chapterLink,
          chapterNumber: typeof h.chapterNumber === 'string' ? h.chapterNumber : String(h.chapterNumber ?? ''),
          pageRead: Number(h.pageRead) || 0,
          totalPages: Number(h.totalPages) || 0,
          readAt: Number(h.readAt) || Date.now(),
        }));

      const favNow = useFavorites.getState().favorites;
      const favKnown = new Set(favNow.map(f => f.link));
      const favNew = favIn.filter((f, i) => !favKnown.has(f.link) && favIn.findIndex(x => x.link === f.link) === i);
      useFavorites.setState({ favorites: [...favNow, ...favNew] });

      const histNow = useHistory.getState().history;
      const byLink = new Map<string, HistoryItem>(histNow.map((h): [string, HistoryItem] => [h.chapterLink, h]));
      let histAdded = 0;
      for (const h of histIn) {
        const cur = byLink.get(h.chapterLink);
        if (!cur) { byLink.set(h.chapterLink, h); histAdded++; }
        else if (h.readAt > cur.readAt) byLink.set(h.chapterLink, h);
      }
      const merged = Array.from(byLink.values()).sort((a, b) => b.readAt - a.readAt).slice(0, 200);
      useHistory.setState({ history: merged });

      say(`Diimpor: ${favNew.length} favorit baru, ${histAdded} riwayat baru.`);
    } catch (e: any) {
      say(e?.message === 'besar' ? 'File terlalu besar.' : 'File bukan cadangan Komikita yang valid.');
    }
  };

  const clearCache = async () => {
    try {
      localStorage.removeItem(HOME_CACHE_KEY);
      if (typeof caches !== 'undefined') {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
      readCache();
      say('Cache dihapus. Data beranda dimuat ulang saat dibuka.');
    } catch { say('Gagal menghapus cache.'); }
  };

  const share = async () => {
    const url = window.location.origin;
    const text = 'Baca komik manga, manhwa, manhua gratis dan lengkap di Komikita.';
    try {
      if (navigator.share) { await navigator.share({ title: 'Komikita', text, url }); return; }
      await navigator.clipboard.writeText(url);
      say('Tautan Komikita disalin.');
    } catch (e: any) { if (e?.name !== 'AbortError') say('Tidak bisa membagikan.'); }
  };

  const favCount = mounted ? favorites.length : 0;
  const p = (n: number) => Math.round(n * unit * 100) / 100;
  const headFont = `${p(20)}px`;

  const avatar = user?.photo
    ? <img src={user.photo} alt="" style={{ width: p(84), height: p(84), borderRadius: '50%', objectFit: 'cover', flexShrink: 0, display: 'block' }} />
    : <span style={{ width: p(84), height: p(84), borderRadius: '50%', background: '#2A2B30', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: p(34), fontWeight: 700, color: HEAD, flexShrink: 0 }}>{user ? user.name.charAt(0).toUpperCase() : '?'}</span>;

  return (
    <UnitCtx.Provider value={unit}>
      <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: BG, color: '#fff', overflowY: 'auto', WebkitOverflowScrolling: 'touch', fontFamily: FONT }}>
        <div style={{ maxWidth: 448, margin: '0 auto' }}>

          {/* Header: panah kiri + judul di tengah + garis tipis di bawah */}
          <div style={{ position: 'sticky', top: 0, zIndex: 2, background: BG, paddingTop: 'env(safe-area-inset-top, 0px)' }}>
            <div style={{ position: 'relative', height: p(98), borderBottom: `1px solid ${LINE}` }}>
              <button onClick={goBack} aria-label="Kembali" style={{ position: 'absolute', left: 0, top: 0, width: p(98), height: p(98), paddingBottom: p(13), boxSizing: 'border-box', background: 'none', border: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
                <ArrowLeft size={p(40)} strokeWidth={2} />
              </button>
              <h1 style={{ margin: 0, height: p(98), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: p(34.5), fontWeight: 800, lineHeight: 1.2, paddingTop: p(4), boxSizing: 'border-box' }}>Pengaturan</h1>
            </div>
          </div>

          <div style={{ padding: `0 ${p(28)}px calc(${p(52)}px + env(safe-area-inset-bottom, 0px))` }}>

            {/* Profil singkat */}
            <div onClick={user ? undefined : handleLogin} style={{ display: 'flex', alignItems: 'flex-start', gap: p(28), marginTop: p(17), paddingBottom: p(4), cursor: user ? 'default' : 'pointer' }}>
              {avatar}
              <div style={{ flex: 1, minWidth: 0, paddingTop: p(4) }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: p(11), height: p(30) }}>
                  <span style={{ minWidth: 0, fontSize: p(24.6), fontWeight: 800, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user ? user.name : (ready ? 'Belum masuk' : 'Memuat...')}
                  </span>
                  {user && (
                    <button onClick={copyUid} aria-label="Salin ID akun" style={{ flexShrink: 0, background: 'none', border: 0, padding: 0, fontFamily: 'inherit', fontSize: p(18.2), fontWeight: 500, lineHeight: 1.2, color: MUTED, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
                      {formatShortId(user.shortId, user.uid)}
                    </button>
                  )}
                </div>
                {user && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: p(13), height: p(38), marginTop: p(6) }}>
                    {isPremium && !isDev && <VerifiedBadge size={p(34)} />}
                    {isDev && <DevBadge size={p(38)} />}
                    <LevelPill level={user.level} label="Lvl." fontSize={headFont} iconSize={p(26)} style={{ height: p(38), padding: `0 ${p(14)}px 0 ${p(18)}px`, gap: p(8), lineHeight: 1 }} />
                  </div>
                )}
                <div style={{ marginTop: user ? p(15) : p(25), fontFamily: "Roboto, system-ui, 'Segoe UI', sans-serif", fontSize: p(22.8), fontWeight: 400, lineHeight: `${p(28)}px`, color: MUTED, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user ? user.email : (loggingIn ? 'Membuka Google...' : 'Masuk dengan Google')}
                </div>
              </div>
            </div>

            {user && !isPremium && (
              <Section title="Akun">
                <Row title="Jadi Premium" chevron onClick={() => say('Fitur Premium segera hadir.')} />
              </Section>
            )}

            <Section title="Kualitas">
              <Row title="Mode baca bawaan" value="Webtoon" />
              <Row title="Gambar kualitas rendah" toggle={{ on: mounted && settings.lowQuality, onChange: (v) => settings.setSetting('lowQuality', v) }} />
              <Row title="Unduh hanya lewat Wi-Fi" toggle={{ on: mounted && settings.wifiOnly, onChange: (v) => settings.setSetting('wifiOnly', v) }} />
            </Section>

            <Section title="Tampilan">
              <Row title="Tema" value="Komikita · Gelap" />
              <Row title="Bahasa" value="Indonesia" />
            </Section>

            <Section title="Notifikasi">
              <Row title="Judul yang diikuti" value={String(favCount)} chevron href="/history" />
              <Row title="Chapter baru" toggle={{ on: mounted && settings.notifChapter, onChange: (v) => settings.setSetting('notifChapter', v) }} />
              <Row title="Balasan untuk komentarku" toggle={{ on: mounted && settings.notifReply, onChange: (v) => settings.setSetting('notifReply', v) }} />
              <Row title="Berita dan info musim" toggle={{ on: mounted && settings.notifNews, onChange: (v) => settings.setSetting('notifNews', v) }} />
            </Section>

            <Section title="Data">
              <Row title="Cadangkan dan ekspor" chevron onClick={exportData} />
              <Row title="Impor cadangan" chevron onClick={() => fileRef.current?.click()} />
              <Row title="Hapus cache" value={mounted ? `${cacheKb} KB` : ''} onClick={clearCache} />
            </Section>
            <input ref={fileRef} type="file" accept="application/json,.json" hidden
              onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) importData(f); }} />

            {isDev && (
              <Section title="Developer">
                <Row title="Panel Developer" chevron onClick={() => router.push('/profile?dev=1')} />
              </Section>
            )}

            <Section title="Tentang">
              <Row title="Versi Komikita" value={pkg.version} />
              <Row title="Tentang Komikita" chevron onClick={() => setAboutOpen(true)} />
            </Section>

            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', columnGap: p(57), rowGap: p(14.5), marginTop: p(14.5) }}>
              <Pill onClick={share}>Bagikan Komikita</Pill>
              <Pill onClick={() => window.open('https://github.com/risadalfarisi837-ops/Komiku/issues/new', '_blank')}>Laporkan Bug</Pill>
            </div>

            {user && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: p(14.5) }}>
                <button onClick={() => setLogoutOpen(true)} style={{ minWidth: p(210), height: p(68.5), padding: `0 ${p(28)}px`, borderRadius: 999, border: 0, background: RED, color: '#fff', fontFamily: 'inherit', fontSize: p(24), fontWeight: 700, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>Keluar</button>
              </div>
            )}
          </div>
        </div>

        <Dialog open={logoutOpen} onClose={() => setLogoutOpen(false)} title="Keluar dari akun?">
          <div style={dialogText}>Favorit dan riwayat bacamu di perangkat ini tetap tersimpan.</div>
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button onClick={() => setLogoutOpen(false)} style={{ ...dialogBtn, background: BG, color: '#fff' }}>Batal</button>
            <button onClick={handleLogout} style={{ ...dialogBtn, background: RED, color: '#fff' }}>Keluar</button>
          </div>
        </Dialog>

        <Dialog open={aboutOpen} onClose={() => setAboutOpen(false)} title="Tentang Komikita">
          <div style={dialogText}>
            Komikita adalah aplikasi web untuk membaca komik manga, manhwa, dan manhua gratis dalam bahasa Indonesia. Data dan gambar komik berasal dari MangaDex.
          </div>
          <button onClick={() => setAboutOpen(false)} style={{ ...dialogBtn, width: '100%', marginTop: 16, background: BG, color: '#fff' }}>Tutup</button>
        </Dialog>

        {toast && (
          <div role="status" style={{ position: 'fixed', left: 16, right: 16, bottom: 'calc(24px + env(safe-area-inset-bottom, 0px))', zIndex: 90, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
            <div style={{ background: '#3A3B3F', color: '#fff', padding: '12px 18px', borderRadius: 999, fontSize: 14, fontWeight: 700, maxWidth: 400, textAlign: 'center', boxShadow: '0 8px 24px rgba(0,0,0,.4)' }}>{toast}</div>
          </div>
        )}
      </div>
    </UnitCtx.Provider>
  );
}
