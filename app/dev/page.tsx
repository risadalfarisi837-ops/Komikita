'use client';

// Dev Tools (khusus role Developer). Dibuka dari Pengaturan > Dev Tools.
// Tiga tab saja: Info (status + aksi), API (tester), Data (localStorage & Firebase baca-saja).
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getFirebase } from '@/lib/firebase-client';

const BG = '#1B1A20';
const CARD = '#25242B';
const LINE = '#34333C';
const MUTED = '#8F8D9B';
const ACCENT = '#FF6B6B';
const OK = '#4ade80';
const BAD = '#f87171';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

type Tab = 'info' | 'api' | 'data';
const TABS: [Tab, string][] = [['info', 'Info'], ['api', 'API'], ['data', 'Data']];
const PRESETS = ['/api/manga/home', '/api/manga/browse', '/api/manga/search?q=solo', '/api/manga/detail?url=', '/api/manga/chapter?url='];

const field: CSSProperties = { width: '100%', boxSizing: 'border-box', background: BG, color: '#fff', border: `1px solid ${LINE}`, borderRadius: 10, padding: '11px 12px', fontSize: 14, fontFamily: MONO, outline: 'none' };
const pre: CSSProperties = { background: BG, border: `1px solid ${LINE}`, borderRadius: 10, padding: 10, fontSize: 12, lineHeight: 1.5, fontFamily: MONO, color: '#D6D4E0', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 360, overflow: 'auto', margin: '10px 0 0' };

function Btn({ children, onClick, kind = 'ghost', disabled }: { children: ReactNode; onClick?: () => void; kind?: 'ghost' | 'primary' | 'danger'; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ border: 0, borderRadius: 10, padding: '10px 14px', fontSize: 13.5, fontWeight: 700, color: kind === 'danger' ? BAD : '#fff', background: kind === 'primary' ? ACCENT : kind === 'danger' ? '#4A2A2E' : '#33323B', opacity: disabled ? 0.5 : 1, cursor: 'pointer' }}>
      {children}
    </button>
  );
}
const Card = ({ children }: { children: ReactNode }) => <section style={{ background: CARD, borderRadius: 16, padding: 14, marginBottom: 12 }}>{children}</section>;
const Row = ({ k, v }: { k: string; v: string }) => (
  <div style={{ display: 'flex', gap: 12, padding: '6px 0', fontSize: 13 }}>
    <div style={{ width: 80, color: MUTED, flex: '0 0 auto' }}>{k}</div>
    <div style={{ fontFamily: MONO, fontSize: 12.5, wordBreak: 'break-all' }}>{v}</div>
  </div>
);
const Seg = <T extends string>({ items, value, onPick }: { items: [T, string][]; value: T; onPick: (v: T) => void }) => (
  <div style={{ display: 'flex', background: BG, borderRadius: 10, padding: 3, marginBottom: 12 }}>
    {items.map(([k, l]) => (
      <button key={k} onClick={() => onPick(k)} style={{ flex: 1, border: 0, borderRadius: 8, padding: '8px 0', fontSize: 13, fontWeight: 700, color: value === k ? '#fff' : MUTED, background: value === k ? '#33323B' : 'transparent', cursor: 'pointer' }}>{l}</button>
    ))}
  </div>
);

async function copy(text: string, say: (m: string) => void) {
  try { await navigator.clipboard.writeText(text); say('Disalin'); } catch { say('Gagal menyalin'); }
}
const kb = (n: number) => `${(n / 1024).toFixed(1)} KB`;
const pretty = (raw: string) => { try { return JSON.stringify(JSON.parse(raw), null, 2); } catch { return raw; } };
const cut = (s: string, n: number) => (s.length > n ? s.slice(0, n) + '\n… (dipotong, salin untuk lihat semua)' : s);

export default function DevPage() {
  const router = useRouter();
  const [state, setState] = useState<'loading' | 'denied' | 'ok'>('loading');
  const [uid, setUid] = useState('');
  const [role, setRole] = useState('');
  const [tab, setTab] = useState<Tab>('info');
  const [toast, setToast] = useState('');
  const say = useCallback((m: string) => { setToast(m); setTimeout(() => setToast(''), 2000); }, []);

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

  const shell = (children: ReactNode, bar?: ReactNode) => (
    <div style={{ minHeight: '100vh', background: BG, color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: BG, borderBottom: `1px solid ${LINE}`, padding: '0 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 'calc(12px + env(safe-area-inset-top, 0px)) 0 10px' }}>
          <button onClick={() => (window.history.length > 1 ? router.back() : router.push('/settings'))} aria-label="Kembali" style={{ background: 'none', border: 0, color: '#fff', display: 'flex', padding: 4, cursor: 'pointer' }}><ArrowLeft size={22} /></button>
          <div style={{ fontWeight: 800, fontSize: 18 }}>Dev Tools</div>
        </div>
        {bar}
      </div>
      <div style={{ padding: '14px 14px 48px', maxWidth: 640, margin: '0 auto' }}>{children}</div>
      {toast && <div style={{ position: 'fixed', left: 16, right: 16, bottom: 'calc(24px + env(safe-area-inset-bottom, 0px))', textAlign: 'center', zIndex: 90, pointerEvents: 'none' }}><span style={{ background: '#000d', padding: '9px 16px', borderRadius: 99, fontSize: 13, fontWeight: 700 }}>{toast}</span></div>}
    </div>
  );

  if (state === 'loading') return shell(<div style={{ color: MUTED }}>Memuat...</div>);
  if (state === 'denied') return shell(<Card>Halaman ini khusus akun Developer. Login dengan akun Developer dulu.</Card>);

  const bar = (
    <div style={{ display: 'flex' }}>
      {TABS.map(([k, l]) => (
        <button key={k} onClick={() => setTab(k)} style={{ flex: 1, background: 'none', border: 0, borderBottom: `2px solid ${tab === k ? ACCENT : 'transparent'}`, color: tab === k ? '#fff' : MUTED, fontWeight: 700, fontSize: 14, padding: '9px 0', cursor: 'pointer' }}>{l}</button>
      ))}
    </div>
  );

  return shell(
    <>
      {tab === 'info' && <InfoTab uid={uid} role={role} say={say} />}
      {tab === 'api' && <ApiTab say={say} />}
      {tab === 'data' && <DataTab uid={uid} say={say} />}
    </>,
    bar,
  );
}

// ── Info ────────────────────────────────────────────────────────────────────
function InfoTab({ uid, role, say }: { uid: string; role: string; say: (m: string) => void }) {
  const [sw, setSw] = useState('...');
  const [vp, setVp] = useState('');
  const [online, setOnline] = useState(true);
  const [health, setHealth] = useState<{ p: string; code: number; ms: number }[] | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const upd = () => { setVp(`${innerWidth}×${innerHeight}`); setOnline(navigator.onLine); };
    upd();
    window.addEventListener('resize', upd); window.addEventListener('online', upd); window.addEventListener('offline', upd);
    navigator.serviceWorker?.getRegistrations().then((r) => setSw(r.length ? `${r.length} aktif` : 'tidak ada')).catch(() => setSw('n/a'));
    return () => { window.removeEventListener('resize', upd); window.removeEventListener('online', upd); window.removeEventListener('offline', upd); };
  }, []);

  const runHealth = async () => {
    if (checking) return;
    setChecking(true); setHealth([]);
    const out: { p: string; code: number; ms: number }[] = [];
    for (const p of ['/api/manga/home', '/api/manga/browse', '/api/manga/search?q=solo']) {
      const t0 = performance.now();
      let code = 0;
      try { const r = await fetch(p, { cache: 'no-store' }); code = r.status; await r.text(); } catch { /* 0 = gagal */ }
      out.push({ p: p.replace('/api/manga/', ''), code, ms: Math.round(performance.now() - t0) });
      setHealth([...out]);
    }
    setChecking(false);
  };

  const clearHome = () => {
    const ks: string[] = [];
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i) as string; if (/^komiku_home/.test(k)) ks.push(k); }
    ks.forEach((k) => localStorage.removeItem(k));
    say(ks.length ? 'Cache beranda dihapus' : 'Tidak ada cache beranda');
  };
  const resetAll = async () => {
    if (!window.confirm('Hapus service worker + cache lalu muat ulang? Login & data akun tidak terhapus.')) return;
    try {
      const regs = (await navigator.serviceWorker?.getRegistrations()) || [];
      await Promise.all(regs.map((r) => r.unregister()));
      const keys = (await window.caches?.keys()) || [];
      await Promise.all(keys.map((k) => window.caches.delete(k)));
    } catch { /* lanjut */ }
    location.reload();
  };

  return (
    <>
      <Card>
        <Row k="UID" v={uid} />
        <Row k="Role" v={role} />
        <Row k="Layar" v={vp} />
        <Row k="Koneksi" v={online ? 'online' : 'offline'} />
        <Row k="SW" v={sw} />
        <div style={{ marginTop: 8 }}><Btn onClick={() => copy(uid, say)}>Salin UID</Btn></div>
      </Card>

      <Card>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <Btn kind="primary" onClick={runHealth} disabled={checking}>{checking ? 'Mengecek...' : 'Cek API'}</Btn>
          <Btn onClick={clearHome}>Hapus cache beranda</Btn>
          <Btn kind="danger" onClick={resetAll}>Reset cache</Btn>
        </div>
        {health?.map((h) => (
          <div key={h.p} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 0', fontSize: 12.5, fontFamily: MONO }}>
            <span>{h.p}</span>
            <span style={{ color: h.code >= 200 && h.code < 300 ? OK : BAD }}>{h.code || 'ERR'} · {h.ms} ms</span>
          </div>
        ))}
      </Card>
    </>
  );
}

// ── API ─────────────────────────────────────────────────────────────────────
function ApiTab({ say }: { say: (m: string) => void }) {
  const [path, setPath] = useState(PRESETS[0]);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ status: number; ms: number; size: number; body: string } | null>(null);

  const send = async () => {
    if (busy) return;
    // nilai url= otomatis di-encode, jadi link MangaDex bisa langsung ditempel
    const m = path.trim().match(/^(.*[?&]url=)(.*)$/);
    let p = path.trim();
    if (m) { let v = m[2]; try { v = decodeURIComponent(v); } catch { /* biarkan */ } p = m[1] + encodeURIComponent(v); }
    setBusy(true); setRes(null);
    const t0 = performance.now();
    try {
      const r = await fetch(p, { cache: 'no-store' });
      const text = await r.text();
      setRes({ status: r.status, ms: Math.round(performance.now() - t0), size: text.length, body: pretty(text) });
    } catch (e: any) {
      setRes({ status: 0, ms: Math.round(performance.now() - t0), size: 0, body: 'Error: ' + (e?.message || e) });
    }
    setBusy(false);
  };

  return (
    <Card>
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 10 }}>
        {PRESETS.map((p) => (
          <button key={p} onClick={() => setPath(p)} style={{ border: `1px solid ${path === p ? ACCENT : LINE}`, background: 'transparent', color: path === p ? ACCENT : MUTED, borderRadius: 99, padding: '5px 11px', fontSize: 12, fontFamily: MONO, cursor: 'pointer', whiteSpace: 'nowrap' }}>{p.replace('/api/manga/', '')}</button>
        ))}
      </div>
      <input style={field} value={path} onChange={(e) => setPath(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') send(); }} autoCapitalize="off" autoCorrect="off" spellCheck={false} />
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <Btn kind="primary" onClick={send} disabled={busy}>{busy ? 'Mengirim...' : 'Kirim'}</Btn>
        {res && <Btn onClick={() => copy(res.body, say)}>Salin hasil</Btn>}
      </div>
      {res && (
        <>
          <div style={{ marginTop: 12, fontSize: 13, fontWeight: 700, color: res.status >= 200 && res.status < 300 ? OK : BAD }}>{res.status || 'ERR'} · {res.ms} ms · {kb(res.size)}</div>
          <pre style={pre}>{cut(res.body, 20000)}</pre>
        </>
      )}
    </Card>
  );
}

// ── Data: localStorage + Firebase ───────────────────────────────────────────
function DataTab({ uid, say }: { uid: string; say: (m: string) => void }) {
  const [mode, setMode] = useState<'local' | 'fb'>('local');
  return (
    <>
      <Seg items={[['local', 'localStorage'], ['fb', 'Firebase']]} value={mode} onPick={setMode} />
      {mode === 'local' ? <StorageView say={say} /> : <FirebaseView uid={uid} say={say} />}
    </>
  );
}

function StorageView({ say }: { say: (m: string) => void }) {
  const [items, setItems] = useState<{ k: string; size: number }[]>([]);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState('');
  const load = useCallback(() => {
    try {
      const arr: { k: string; size: number }[] = [];
      for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i) as string; arr.push({ k, size: (localStorage.getItem(k) || '').length }); }
      setItems(arr.sort((a, b) => b.size - a.size));
    } catch { setItems([]); }
  }, []);
  useEffect(load, [load]);

  const shown = useMemo(() => items.filter((i) => i.k.toLowerCase().includes(q.toLowerCase())), [items, q]);
  const del = (k: string) => { localStorage.removeItem(k); setOpen(''); load(); say('Dihapus'); };

  return (
    <Card>
      <input style={field} value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Cari di ${items.length} kunci...`} autoCapitalize="off" spellCheck={false} />
      <div style={{ marginTop: 8 }}>
        {shown.map((i) => (
          <div key={i.k} style={{ borderTop: `1px solid ${LINE}`, padding: '9px 0' }}>
            <button onClick={() => setOpen(open === i.k ? '' : i.k)} style={{ display: 'flex', width: '100%', gap: 8, background: 'none', border: 0, color: '#fff', padding: 0, cursor: 'pointer', textAlign: 'left' }}>
              <span style={{ flex: 1, fontFamily: MONO, fontSize: 12.5, wordBreak: 'break-all' }}>{i.k}</span>
              <span style={{ fontSize: 11.5, color: MUTED }}>{kb(i.size)}</span>
            </button>
            {open === i.k && (
              <>
                <pre style={pre}>{cut(pretty(localStorage.getItem(i.k) || ''), 8000)}</pre>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <Btn onClick={() => copy(localStorage.getItem(i.k) || '', say)}>Salin</Btn>
                  <Btn kind="danger" onClick={() => del(i.k)}>Hapus</Btn>
                </div>
              </>
            )}
          </div>
        ))}
        {!shown.length && <div style={{ fontSize: 13, color: MUTED, padding: '8px 0' }}>Tidak ada data.</div>}
      </div>
    </Card>
  );
}

function FirebaseView({ uid, say }: { uid: string; say: (m: string) => void }) {
  const [path, setPath] = useState('users/' + uid);
  const [out, setOut] = useState('');
  const [busy, setBusy] = useState(false);
  const read = async () => {
    const p = path.trim().replace(/^\/+|\/+$/g, '');
    if (!p || busy) return;
    setBusy(true); setOut('');
    try {
      const { db } = await getFirebase();
      const snap = await db.ref(p).limitToFirst(50).get(); // dibatasi 50 anak pertama
      setOut(snap.exists() ? JSON.stringify(snap.val(), null, 2) : '(kosong / tidak ada)');
    } catch (e: any) { setOut('Error: ' + (e?.message || e)); }
    setBusy(false);
  };
  return (
    <Card>
      <div style={{ fontSize: 12.5, color: MUTED, marginBottom: 8 }}>Hanya baca, maksimal 50 data pertama.</div>
      <input style={field} value={path} onChange={(e) => setPath(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') read(); }} placeholder="path/di/database" autoCapitalize="off" autoCorrect="off" spellCheck={false} />
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <Btn kind="primary" onClick={read} disabled={busy}>{busy ? 'Membaca...' : 'Baca'}</Btn>
        {out && <Btn onClick={() => copy(out, say)}>Salin</Btn>}
      </div>
      {out && <pre style={pre}>{cut(out, 30000)}</pre>}
    </Card>
  );
}
