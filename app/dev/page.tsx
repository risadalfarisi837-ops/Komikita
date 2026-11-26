'use client';

// Halaman Dev Tools (khusus role Developer): info sesi, API tester, inspector localStorage,
// pembaca Firebase (read-only), dan alat cache. Dibuka dari Pengaturan > Developer.
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getFirebase } from '@/lib/firebase-client';

const BG = '#1B1A20';
const CARD = '#2A2931';
const MUTED = '#8F8D9B';
const ACCENT = '#FF6B6B';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

type Tab = 'info' | 'api' | 'storage' | 'firebase';
const TABS: [Tab, string][] = [['info', 'Info'], ['api', 'API'], ['storage', 'Storage'], ['firebase', 'Firebase']];

const API_PRESETS = [
  '/api/manga/home',
  '/api/manga/search?q=solo',
  '/api/manga/browse',
  '/api/manga/browse?orderby=update',
  '/api/manga/detail?url=',
  '/api/manga/chapter?url=',
];

const btn = (on = false): React.CSSProperties => ({
  border: 0, borderRadius: 10, padding: '8px 14px', fontWeight: 700, fontSize: 13, cursor: 'pointer',
  background: on ? ACCENT : '#3A3944', color: '#fff',
});
const box: React.CSSProperties = { background: CARD, borderRadius: 14, padding: 14, marginBottom: 12 };
const input: React.CSSProperties = { width: '100%', boxSizing: 'border-box', background: '#1F1E25', color: '#fff', border: '1px solid #3A3944', borderRadius: 10, padding: '9px 11px', fontSize: 14, fontFamily: MONO };
const pre: React.CSSProperties = { background: '#15141A', borderRadius: 10, padding: 10, fontSize: 12, fontFamily: MONO, color: '#D6D4E0', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 360, overflow: 'auto', margin: '8px 0 0' };

export default function DevPage() {
  const router = useRouter();
  const [state, setState] = useState<'loading' | 'denied' | 'ok'>('loading');
  const [uid, setUid] = useState('');
  const [role, setRole] = useState('');
  const [tab, setTab] = useState<Tab>('info');
  const [toast, setToast] = useState('');
  const say = useCallback((m: string) => { setToast(m); setTimeout(() => setToast(''), 2200); }, []);

  useEffect(() => {
    let dead = false;
    let off: (() => void) | undefined;
    getFirebase().then(({ auth, db }) => {
      if (dead) return;
      off = auth.onAuthStateChanged(async (u: any) => {
        if (dead) return;
        if (!u) { setState('denied'); return; }
        try {
          const r = (await db.ref(`users/${u.uid}/role`).get()).val();
          if (dead) return;
          setUid(u.uid); setRole(r || 'Member');
          setState(r === 'Developer' ? 'ok' : 'denied');
        } catch { if (!dead) setState('denied'); }
      });
    }).catch(() => { if (!dead) setState('denied'); });
    return () => { dead = true; off?.(); };
  }, []);

  const shell = (children: React.ReactNode) => (
    <div style={{ minHeight: '100vh', background: BG, color: '#fff', padding: '0 14px 40px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 'calc(14px + env(safe-area-inset-top, 0px)) 0 12px' }}>
        <button onClick={() => (window.history.length > 1 ? router.back() : router.push('/settings'))} aria-label="Kembali" style={{ ...btn(), padding: 8, display: 'flex' }}><ArrowLeft size={20} /></button>
        <div style={{ fontWeight: 800, fontSize: 20 }}>Dev Tools</div>
      </div>
      {children}
      {toast && <div style={{ position: 'fixed', left: 16, right: 16, bottom: 'calc(24px + env(safe-area-inset-bottom, 0px))', textAlign: 'center', zIndex: 90 }}><span style={{ background: '#000c', padding: '9px 16px', borderRadius: 99, fontSize: 13, fontWeight: 700 }}>{toast}</span></div>}
    </div>
  );

  if (state === 'loading') return shell(<div style={{ color: MUTED }}>Memuat...</div>);
  if (state === 'denied') return shell(<div style={box}>Halaman ini khusus akun Developer. Login dengan akun Developer dulu.</div>);

  return shell(
    <>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, overflowX: 'auto' }}>
        {TABS.map(([k, l]) => <button key={k} style={btn(tab === k)} onClick={() => setTab(k)}>{l}</button>)}
      </div>
      {tab === 'info' && <InfoTab uid={uid} role={role} say={say} />}
      {tab === 'api' && <ApiTab say={say} />}
      {tab === 'storage' && <StorageTab say={say} />}
      {tab === 'firebase' && <FirebaseTab uid={uid} />}
    </>,
  );
}

async function copy(text: string, say: (m: string) => void) {
  try { await navigator.clipboard.writeText(text); say('Disalin'); } catch { say('Gagal menyalin'); }
}

// ── Info & alat cache ────────────────────────────────────────────────────────
function InfoTab({ uid, role, say }: { uid: string; role: string; say: (m: string) => void }) {
  const [vp, setVp] = useState('');
  const [online, setOnline] = useState(true);
  const [sw, setSw] = useState('...');
  useEffect(() => {
    const upd = () => { setVp(`${window.innerWidth}×${window.innerHeight} @${window.devicePixelRatio}x`); setOnline(navigator.onLine); };
    upd();
    window.addEventListener('resize', upd); window.addEventListener('online', upd); window.addEventListener('offline', upd);
    navigator.serviceWorker?.getRegistrations().then((r) => setSw(r.length ? `${r.length} aktif` : 'tidak ada')).catch(() => setSw('n/a'));
    return () => { window.removeEventListener('resize', upd); window.removeEventListener('online', upd); window.removeEventListener('offline', upd); };
  }, []);

  const resetCaches = async () => {
    if (!window.confirm('Hapus service worker + Cache Storage lalu muat ulang? Login & data akun tidak terhapus.')) return;
    try {
      const regs = (await navigator.serviceWorker?.getRegistrations()) || [];
      await Promise.all(regs.map((r) => r.unregister()));
      const keys = (await window.caches?.keys()) || [];
      await Promise.all(keys.map((k) => window.caches.delete(k)));
    } catch { /* lanjut muat ulang */ }
    window.location.reload();
  };

  const rows: [string, string][] = [
    ['UID', uid], ['Role', role], ['Mode', process.env.NODE_ENV], ['Layar', vp], ['Koneksi', online ? 'online' : 'offline'],
    ['Service worker', sw], ['User agent', typeof navigator !== 'undefined' ? navigator.userAgent : ''],
  ];
  return (
    <>
      <div style={box}>
        {rows.map(([k, v]) => (
          <div key={k} style={{ display: 'flex', gap: 10, padding: '5px 0', fontSize: 13 }}>
            <div style={{ width: 96, color: MUTED, flex: '0 0 auto' }}>{k}</div>
            <div style={{ fontFamily: MONO, wordBreak: 'break-all' }}>{v}</div>
          </div>
        ))}
        <button style={{ ...btn(), marginTop: 8 }} onClick={() => copy(uid, say)}>Salin UID</button>
      </div>
      <div style={box}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Alat cache</div>
        <div style={{ fontSize: 12.5, color: MUTED, marginBottom: 10 }}>Berguna kalau habis deploy tapi tampilan masih versi lama.</div>
        <button style={btn(true)} onClick={resetCaches}>Reset SW & Cache Storage</button>
      </div>
    </>
  );
}

// ── API tester ───────────────────────────────────────────────────────────────
function ApiTab({ say }: { say: (m: string) => void }) {
  const [path, setPath] = useState(API_PRESETS[0]);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ status: number; ms: number; size: number; body: string } | null>(null);

  const send = async () => {
    if (busy) return;
    setBusy(true); setRes(null);
    const t0 = performance.now();
    try {
      const r = await fetch(path, { cache: 'no-store' });
      const text = await r.text();
      let body = text;
      try { body = JSON.stringify(JSON.parse(text), null, 2); } catch { /* bukan JSON */ }
      setRes({ status: r.status, ms: Math.round(performance.now() - t0), size: text.length, body });
    } catch (e: any) {
      setRes({ status: 0, ms: Math.round(performance.now() - t0), size: 0, body: 'Error: ' + (e?.message || e) });
    }
    setBusy(false);
  };

  return (
    <div style={box}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
        {API_PRESETS.map((p) => <button key={p} style={{ ...btn(path === p), fontSize: 11.5, padding: '5px 9px' }} onClick={() => setPath(p)}>{p.replace('/api/manga/', '')}</button>)}
      </div>
      <input style={input} value={path} onChange={(e) => setPath(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') send(); }} placeholder="/api/..." />
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button style={btn(true)} onClick={send}>{busy ? 'Mengirim...' : 'Kirim GET'}</button>
        {res && <button style={btn()} onClick={() => copy(res.body, say)}>Salin hasil</button>}
      </div>
      {res && (
        <>
          <div style={{ marginTop: 10, fontSize: 13, fontWeight: 700, color: res.status >= 200 && res.status < 300 ? '#4ade80' : '#f87171' }}>
            {res.status || 'ERR'} · {res.ms} ms · {(res.size / 1024).toFixed(1)} KB
          </div>
          <pre style={pre}>{res.body.length > 20000 ? res.body.slice(0, 20000) + '\n… (dipotong, salin untuk lihat semua)' : res.body}</pre>
        </>
      )}
    </div>
  );
}

// ── Inspector localStorage ──────────────────────────────────────────────────
function StorageTab({ say }: { say: (m: string) => void }) {
  const [items, setItems] = useState<{ k: string; size: number }[]>([]);
  const [open, setOpen] = useState('');
  const load = useCallback(() => {
    try {
      const arr: { k: string; size: number }[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i) as string;
        arr.push({ k, size: (localStorage.getItem(k) || '').length });
      }
      setItems(arr.sort((a, b) => b.size - a.size));
    } catch { setItems([]); }
  }, []);
  useEffect(load, [load]);

  const val = (k: string) => {
    const raw = localStorage.getItem(k) || '';
    try { return JSON.stringify(JSON.parse(raw), null, 2); } catch { return raw; }
  };
  const del = (k: string) => { localStorage.removeItem(k); if (open === k) setOpen(''); load(); say('Dihapus: ' + k); };
  const clearApp = () => {
    if (!window.confirm('Hapus semua kunci komiku-* / komikita-* / komiku_* di perangkat ini? (favorit & riwayat lokal ikut hilang)')) return;
    items.filter((i) => /^(komiku|komikita)[-_]/.test(i.k)).forEach((i) => localStorage.removeItem(i.k));
    load(); say('Data lokal app dihapus');
  };
  const total = items.reduce((s, i) => s + i.size, 0);

  return (
    <div style={box}>
      <div style={{ fontSize: 13, color: MUTED, marginBottom: 10 }}>{items.length} kunci · {(total / 1024).toFixed(1)} KB</div>
      {items.map((i) => (
        <div key={i.k} style={{ borderTop: '1px solid #3A3944', padding: '8px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => setOpen(open === i.k ? '' : i.k)} style={{ flex: 1, textAlign: 'left', background: 'none', border: 0, color: '#fff', fontFamily: MONO, fontSize: 12.5, cursor: 'pointer', wordBreak: 'break-all' }}>{i.k}</button>
            <span style={{ fontSize: 11.5, color: MUTED }}>{(i.size / 1024).toFixed(1)} KB</span>
            <button style={{ ...btn(), padding: '4px 9px', fontSize: 12 }} onClick={() => del(i.k)}>Hapus</button>
          </div>
          {open === i.k && <pre style={pre}>{val(i.k).slice(0, 8000)}</pre>}
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button style={btn()} onClick={load}>Muat ulang</button>
        <button style={btn(true)} onClick={clearApp}>Hapus data lokal app</button>
      </div>
    </div>
  );
}

// ── Pembaca Firebase (read-only) ────────────────────────────────────────────
function FirebaseTab({ uid }: { uid: string }) {
  const [path, setPath] = useState('users/' + uid);
  const [out, setOut] = useState('');
  const [busy, setBusy] = useState(false);
  const read = async () => {
    const p = path.trim().replace(/^\/+|\/+$/g, '');
    if (!p || busy) return;
    setBusy(true); setOut('');
    try {
      const { db } = await getFirebase();
      const snap = await db.ref(p).get();
      setOut(snap.exists() ? JSON.stringify(snap.val(), null, 2) : '(kosong / tidak ada)');
    } catch (e: any) { setOut('Error: ' + (e?.message || e)); }
    setBusy(false);
  };
  return (
    <div style={box}>
      <div style={{ fontSize: 12.5, color: MUTED, marginBottom: 8 }}>Hanya baca. Contoh: users/&lt;uid&gt;, leaderboard, premiumOrders</div>
      <input style={input} value={path} onChange={(e) => setPath(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') read(); }} placeholder="path/di/database" />
      <button style={{ ...btn(true), marginTop: 10 }} onClick={read}>{busy ? 'Membaca...' : 'Baca'}</button>
      {out && <pre style={pre}>{out.length > 30000 ? out.slice(0, 30000) + '\n… (dipotong)' : out}</pre>}
    </div>
  );
}
