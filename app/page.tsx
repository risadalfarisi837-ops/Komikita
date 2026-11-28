'use client';

// Dev Tools (khusus role Developer). Dibuka dari Pengaturan > Dev Tools.
// Tab: Info (status, health check, alat cache) · API (tester + riwayat) · Storage (local/session)
//      · Firebase (baca saja) · Log (console + error halaman ini).
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getFirebase } from '@/lib/firebase-client';

const BG = '#1B1A20';
const CARD = '#25242B';
const FIELD = '#1B1A20';
const LINE = '#34333C';
const MUTED = '#8F8D9B';
const ACCENT = '#FF6B6B';
const OK = '#4ade80';
const BAD = '#f87171';
const WARN = '#fbbf24';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

type Tab = 'info' | 'api' | 'storage' | 'firebase' | 'log';
const TABS: [Tab, string][] = [['info', 'Info'], ['api', 'API'], ['storage', 'Storage'], ['firebase', 'Firebase'], ['log', 'Log']];

const API_PRESETS = [
  '/api/manga/home',
  '/api/manga/browse?path=/daftar-manga/?orderby=update',
  '/api/manga/browse?path=/daftar-manga/?orderby=popular',
  '/api/manga/search?q=solo',
  '/api/manga/detail?url=',
  '/api/manga/chapter?url=',
];
const HEALTH = ['/api/manga/home', '/api/manga/browse', '/api/manga/search?q=solo'];
const HIST_KEY = 'komikita_dev_api_hist';

// ── UI kecil ────────────────────────────────────────────────────────────────
const field: CSSProperties = { width: '100%', boxSizing: 'border-box', background: FIELD, color: '#fff', border: `1px solid ${LINE}`, borderRadius: 10, padding: '10px 12px', fontSize: 13.5, fontFamily: MONO, outline: 'none' };
const pre: CSSProperties = { background: FIELD, border: `1px solid ${LINE}`, borderRadius: 10, padding: 10, fontSize: 12, lineHeight: 1.5, fontFamily: MONO, color: '#D6D4E0', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 380, overflow: 'auto', margin: '10px 0 0' };

function Btn({ children, onClick, kind = 'ghost', disabled, small }: { children: ReactNode; onClick?: () => void; kind?: 'ghost' | 'primary' | 'danger'; disabled?: boolean; small?: boolean }) {
  const bg = kind === 'primary' ? ACCENT : kind === 'danger' ? '#4A2A2E' : '#33323B';
  return (
    <button onClick={onClick} disabled={disabled} style={{ border: 0, borderRadius: 10, padding: small ? '5px 10px' : '9px 14px', fontSize: small ? 12 : 13, fontWeight: 700, color: kind === 'danger' ? BAD : '#fff', background: bg, opacity: disabled ? 0.5 : 1, cursor: disabled ? 'default' : 'pointer', whiteSpace: 'nowrap' }}>
      {children}
    </button>
  );
}

function Card({ title, right, children }: { title?: string; right?: ReactNode; children: ReactNode }) {
  return (
    <section style={{ background: CARD, borderRadius: 16, padding: 14, marginBottom: 12 }}>
      {(title || right) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
          <h2 style={{ margin: 0, fontSize: 11.5, letterSpacing: 0.9, textTransform: 'uppercase', color: MUTED, fontWeight: 700 }}>{title}</h2>
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

const Chips = ({ items, active, onPick }: { items: string[]; active?: string; onPick: (v: string) => void }) => (
  <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2, marginBottom: 10 }}>
    {items.map((p) => (
      <button key={p} onClick={() => onPick(p)} style={{ border: `1px solid ${active === p ? ACCENT : LINE}`, background: 'transparent', color: active === p ? ACCENT : MUTED, borderRadius: 99, padding: '4px 10px', fontSize: 11.5, fontFamily: MONO, cursor: 'pointer', whiteSpace: 'nowrap' }}>{p}</button>
    ))}
  </div>
);

async function copy(text: string, say: (m: string) => void) {
  try { await navigator.clipboard.writeText(text); say('Disalin'); } catch { say('Gagal menyalin'); }
}
const kb = (n: number) => `${(n / 1024).toFixed(1)} KB`;
const pretty = (raw: string) => { try { return JSON.stringify(JSON.parse(raw), null, 2); } catch { return raw; } };
const cut = (s: string, n: number) => (s.length > n ? s.slice(0, n) + '\n… (dipotong, salin untuk lihat semua)' : s);

// ── Tangkap console + error halaman ─────────────────────────────────────────
type Log = { t: number; lv: 'log' | 'info' | 'warn' | 'error'; msg: string };
function useLogs() {
  const [logs, setLogs] = useState<Log[]>([]);
  useEffect(() => {
    const add = (lv: Log['lv'], args: unknown[]) => {
      const msg = args.map((a) => {
        if (typeof a === 'string') return a;
        if (a instanceof Error) return a.stack || a.message;
        try { return JSON.stringify(a); } catch { return String(a); }
      }).join(' ');
      setTimeout(() => setLogs((p) => [...p.slice(-299), { t: Date.now(), lv, msg }]), 0); // ditunda: aman dipanggil saat render
    };
    const c = console as any;
    const orig: Record<string, (...a: unknown[]) => void> = { log: c.log, info: c.info, warn: c.warn, error: c.error };
    (['log', 'info', 'warn', 'error'] as const).forEach((lv) => { c[lv] = (...a: unknown[]) => { orig[lv].apply(console, a); add(lv, a); }; });
    const onErr = (e: ErrorEvent) => add('error', [e.message]);
    const onRej = (e: PromiseRejectionEvent) => add('error', ['Unhandled: ', e.reason]);
    window.addEventListener('error', onErr);
    window.addEventListener('unhandledrejection', onRej);
    return () => {
      (['log', 'info', 'warn', 'error'] as const).forEach((lv) => { c[lv] = orig[lv]; });
      window.removeEventListener('error', onErr);
      window.removeEventListener('unhandledrejection', onRej);
    };
  }, []);
  return { logs, clear: () => setLogs([]) };
}

// ── Halaman ─────────────────────────────────────────────────────────────────
export default function DevPage() {
  const router = useRouter();
  const [state, setState] = useState<'loading' | 'denied' | 'ok'>('loading');
  const [uid, setUid] = useState('');
  const [role, setRole] = useState('');
  const [tab, setTab] = useState<Tab>('info');
  const [toast, setToast] = useState('');
  const { logs, clear } = useLogs();
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

  const errCount = logs.filter((l) => l.lv === 'error').length;

  const shell = (children: ReactNode, bar?: ReactNode) => (
    <div style={{ minHeight: '100vh', background: BG, color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: BG, borderBottom: `1px solid ${LINE}`, padding: '0 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 'calc(12px + env(safe-area-inset-top, 0px)) 0 10px' }}>
          <button onClick={() => (window.history.length > 1 ? router.back() : router.push('/settings'))} aria-label="Kembali" style={{ background: 'none', border: 0, color: '#fff', display: 'flex', padding: 4, cursor: 'pointer' }}><ArrowLeft size={22} /></button>
          <div style={{ fontWeight: 800, fontSize: 18, flex: 1 }}>Dev Tools</div>
          {role && <span style={{ fontSize: 11, fontWeight: 700, color: ACCENT, border: `1px solid ${ACCENT}`, borderRadius: 99, padding: '2px 9px' }}>{role}</span>}
        </div>
        {bar}
      </div>
      <div style={{ padding: '14px 14px 48px', maxWidth: 720, margin: '0 auto' }}>{children}</div>
      {toast && <div style={{ position: 'fixed', left: 16, right: 16, bottom: 'calc(24px + env(safe-area-inset-bottom, 0px))', textAlign: 'center', zIndex: 90, pointerEvents: 'none' }}><span style={{ background: '#000d', padding: '9px 16px', borderRadius: 99, fontSize: 13, fontWeight: 700 }}>{toast}</span></div>}
    </div>
  );

  if (state === 'loading') return shell(<div style={{ color: MUTED }}>Memuat...</div>);
  if (state === 'denied') return shell(<Card>Halaman ini khusus akun Developer. Login dengan akun Developer dulu.</Card>);

  const bar = (
    <div style={{ display: 'flex', gap: 4, overflowX: 'auto' }}>
      {TABS.map(([k, l]) => (
        <button key={k} onClick={() => setTab(k)} style={{ background: 'none', border: 0, borderBottom: `2px solid ${tab === k ? ACCENT : 'transparent'}`, color: tab === k ? '#fff' : MUTED, fontWeight: 700, fontSize: 14, padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
          {l}{k === 'log' && errCount > 0 && <span style={{ marginLeft: 6, background: BAD, color: '#000', borderRadius: 99, fontSize: 10.5, padding: '1px 6px' }}>{errCount}</span>}
        </button>
      ))}
    </div>
  );

  return shell(
    <>
      {tab === 'info' && <InfoTab uid={uid} role={role} say={say} />}
      {tab === 'api' && <ApiTab say={say} />}
      {tab === 'storage' && <StorageTab say={say} />}
      {tab === 'firebase' && <FirebaseTab uid={uid} say={say} />}
      {tab === 'log' && <LogTab logs={logs} clear={clear} say={say} />}
    </>,
    bar,
  );
}

// ── Info ────────────────────────────────────────────────────────────────────
function InfoTab({ uid, role, say }: { uid: string; role: string; say: (m: string) => void }) {
  const [env, setEnv] = useState<[string, string][]>([]);
  const [health, setHealth] = useState<{ p: string; code: number; ms: number }[] | null>(null);
  const [checking, setChecking] = useState(false);

  const refresh = useCallback(async () => {
    let sw = 'n/a', quota = 'n/a';
    try { const r = await navigator.serviceWorker?.getRegistrations(); sw = r?.length ? `${r.length} aktif` : 'tidak ada'; } catch { /* abaikan */ }
    try { const e = await navigator.storage?.estimate?.(); if (e?.usage != null) quota = `${(e.usage / 1048576).toFixed(1)} MB dari ${((e.quota || 0) / 1048576).toFixed(0)} MB`; } catch { /* abaikan */ }
    setEnv([
      ['UID', uid], ['Role', role], ['Mode', process.env.NODE_ENV], ['Origin', location.origin],
      ['Layar', `${innerWidth}×${innerHeight} @${devicePixelRatio}x`], ['Koneksi', navigator.onLine ? 'online' : 'offline'],
      ['Service worker', sw], ['Penyimpanan', quota], ['Bahasa', navigator.language],
      ['Zona waktu', Intl.DateTimeFormat().resolvedOptions().timeZone], ['User agent', navigator.userAgent],
    ]);
  }, [uid, role]);

  useEffect(() => {
    refresh();
    window.addEventListener('resize', refresh); window.addEventListener('online', refresh); window.addEventListener('offline', refresh);
    return () => { window.removeEventListener('resize', refresh); window.removeEventListener('online', refresh); window.removeEventListener('offline', refresh); };
  }, [refresh]);

  const runHealth = async () => {
    if (checking) return;
    setChecking(true); setHealth([]);
    const out: { p: string; code: number; ms: number }[] = [];
    for (const p of HEALTH) {
      const t0 = performance.now();
      let code = 0;
      try { const r = await fetch(p, { cache: 'no-store' }); code = r.status; await r.text(); } catch { /* code 0 = gagal */ }
      out.push({ p, code, ms: Math.round(performance.now() - t0) });
      setHealth([...out]);
    }
    setChecking(false);
  };

  const resetCaches = async () => {
    if (!window.confirm('Hapus service worker + Cache Storage lalu muat ulang? Login & data akun tidak terhapus.')) return;
    try {
      const regs = (await navigator.serviceWorker?.getRegistrations()) || [];
      await Promise.all(regs.map((r) => r.unregister()));
      const keys = (await window.caches?.keys()) || [];
      await Promise.all(keys.map((k) => window.caches.delete(k)));
    } catch { /* lanjut muat ulang */ }
    location.reload();
  };
  const clearHome = () => {
    const ks: string[] = [];
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i) as string; if (/^komiku_home/.test(k)) ks.push(k); }
    ks.forEach((k) => localStorage.removeItem(k));
    say(ks.length ? `Cache beranda dihapus (${ks.length})` : 'Tidak ada cache beranda');
  };

  return (
    <>
      <Card title="Sesi & perangkat" right={<Btn small onClick={() => copy(uid, say)}>Salin UID</Btn>}>
        {env.map(([k, v]) => (
          <div key={k} style={{ display: 'flex', gap: 10, padding: '5px 0', fontSize: 13 }}>
            <div style={{ width: 98, color: MUTED, flex: '0 0 auto' }}>{k}</div>
            <div style={{ fontFamily: MONO, wordBreak: 'break-all', fontSize: 12.5 }}>{v}</div>
          </div>
        ))}
      </Card>

      <Card title="Health check API" right={<Btn small kind="primary" onClick={runHealth} disabled={checking}>{checking ? 'Mengecek...' : 'Cek'}</Btn>}>
        {!health && <div style={{ fontSize: 12.5, color: MUTED }}>Ping endpoint utama dan ukur waktu responsnya.</div>}
        {health?.map((h) => (
          <div key={h.p} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '5px 0', fontSize: 12.5, fontFamily: MONO }}>
            <span style={{ wordBreak: 'break-all' }}>{h.p}</span>
            <span style={{ color: h.code >= 200 && h.code < 300 ? (h.ms > 4000 ? WARN : OK) : BAD, whiteSpace: 'nowrap' }}>{h.code || 'ERR'} · {h.ms} ms</span>
          </div>
        ))}
      </Card>

      <Card title="Alat">
        <div style={{ fontSize: 12.5, color: MUTED, marginBottom: 10 }}>Dipakai kalau habis deploy tapi tampilan masih versi lama.</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <Btn onClick={clearHome}>Hapus cache beranda</Btn>
          <Btn onClick={() => location.reload()}>Muat ulang</Btn>
          <Btn kind="danger" onClick={resetCaches}>Reset SW & Cache Storage</Btn>
        </div>
      </Card>
    </>
  );
}

// ── API tester ──────────────────────────────────────────────────────────────
function ApiTab({ say }: { say: (m: string) => void }) {
  const [path, setPath] = useState(API_PRESETS[0]);
  const [busy, setBusy] = useState(false);
  const [showHeaders, setShowHeaders] = useState(false);
  const [hist, setHist] = useState<string[]>([]);
  const [res, setRes] = useState<{ status: number; ms: number; size: number; body: string; headers: string } | null>(null);

  useEffect(() => { try { setHist(JSON.parse(localStorage.getItem(HIST_KEY) || '[]')); } catch { /* kosong */ } }, []);

  // nilai url= otomatis di-encode, jadi link MangaDex bisa langsung ditempel
  const normalize = (p: string) => {
    const m = p.trim().match(/^(.*[?&]url=)(.*)$/);
    if (!m) return p.trim();
    let v = m[2]; try { v = decodeURIComponent(v); } catch { /* biarkan */ }
    return m[1] + encodeURIComponent(v);
  };

  const send = async () => {
    if (busy) return;
    const p = normalize(path);
    setBusy(true); setRes(null);
    const t0 = performance.now();
    try {
      const r = await fetch(p, { cache: 'no-store' });
      const text = await r.text();
      const hs: string[] = []; r.headers.forEach((v, k) => hs.push(`${k}: ${v}`));
      setRes({ status: r.status, ms: Math.round(performance.now() - t0), size: text.length, body: pretty(text), headers: hs.join('\n') });
    } catch (e: any) {
      setRes({ status: 0, ms: Math.round(performance.now() - t0), size: 0, body: 'Error: ' + (e?.message || e), headers: '' });
    }
    const next = [p, ...hist.filter((h) => h !== p)].slice(0, 8);
    setHist(next);
    try { localStorage.setItem(HIST_KEY, JSON.stringify(next)); } catch { /* abaikan */ }
    setBusy(false);
  };

  const good = res && res.status >= 200 && res.status < 300;
  return (
    <>
      <Card title="Request GET">
        <Chips items={API_PRESETS.map((p) => p.replace('/api/manga/', ''))} onPick={(v) => setPath('/api/manga/' + v)} active={path.replace('/api/manga/', '')} />
        <input style={field} value={path} onChange={(e) => setPath(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') send(); }} placeholder="/api/..." autoCapitalize="off" autoCorrect="off" spellCheck={false} />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
          <Btn kind="primary" onClick={send} disabled={busy}>{busy ? 'Mengirim...' : 'Kirim'}</Btn>
          <Btn onClick={() => copy(`curl '${location.origin}${normalize(path)}'`, say)}>Salin curl</Btn>
          {res && <Btn onClick={() => copy(res.body, say)}>Salin hasil</Btn>}
        </div>
        {hist.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 11.5, color: MUTED, marginBottom: 6 }}>Riwayat</div>
            <Chips items={hist} onPick={setPath} />
          </div>
        )}
      </Card>

      {res && (
        <Card title="Hasil" right={res.headers ? <Btn small onClick={() => setShowHeaders((s) => !s)}>{showHeaders ? 'Body' : 'Header'}</Btn> : undefined}>
          <div style={{ fontSize: 13, fontWeight: 700, color: good ? OK : BAD }}>{res.status || 'ERR'} · {res.ms} ms · {kb(res.size)}</div>
          <pre style={pre}>{cut(showHeaders ? res.headers : res.body, 20000)}</pre>
        </Card>
      )}
    </>
  );
}

// ── Storage ─────────────────────────────────────────────────────────────────
function StorageTab({ say }: { say: (m: string) => void }) {
  const [kind, setKind] = useState<'local' | 'session'>('local');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState('');
  const [items, setItems] = useState<{ k: string; size: number }[]>([]);
  const store = () => (kind === 'local' ? localStorage : sessionStorage);

  const load = useCallback(() => {
    try {
      const s = kind === 'local' ? localStorage : sessionStorage;
      const arr: { k: string; size: number }[] = [];
      for (let i = 0; i < s.length; i++) { const k = s.key(i) as string; arr.push({ k, size: (s.getItem(k) || '').length }); }
      setItems(arr.sort((a, b) => b.size - a.size));
    } catch { setItems([]); }
  }, [kind]);
  useEffect(() => { setOpen(''); load(); }, [load]);

  const shown = useMemo(() => items.filter((i) => i.k.toLowerCase().includes(q.toLowerCase())), [items, q]);
  const total = items.reduce((s, i) => s + i.size, 0);
  const del = (k: string) => { store().removeItem(k); if (open === k) setOpen(''); load(); say('Dihapus: ' + k); };
  const clearApp = () => {
    if (!window.confirm('Hapus semua kunci komiku* / komikita* di perangkat ini? (favorit & riwayat lokal ikut hilang)')) return;
    items.filter((i) => /^(komiku|komikita)[-_]/.test(i.k)).forEach((i) => store().removeItem(i.k));
    load(); say('Data lokal app dihapus');
  };

  return (
    <Card title={`${items.length} kunci · ${kb(total)}`} right={
      <div style={{ display: 'flex', gap: 6 }}>
        {(['local', 'session'] as const).map((k) => <Btn key={k} small kind={kind === k ? 'primary' : 'ghost'} onClick={() => setKind(k)}>{k}</Btn>)}
      </div>
    }>
      <input style={field} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari kunci..." autoCapitalize="off" spellCheck={false} />
      <div style={{ marginTop: 8 }}>
        {shown.map((i) => (
          <div key={i.k} style={{ borderTop: `1px solid ${LINE}`, padding: '8px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => setOpen(open === i.k ? '' : i.k)} style={{ flex: 1, textAlign: 'left', background: 'none', border: 0, color: '#fff', fontFamily: MONO, fontSize: 12.5, cursor: 'pointer', wordBreak: 'break-all', padding: 0 }}>{i.k}</button>
              <span style={{ fontSize: 11.5, color: MUTED }}>{kb(i.size)}</span>
            </div>
            {open === i.k && (
              <>
                <pre style={pre}>{cut(pretty(store().getItem(i.k) || ''), 8000)}</pre>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <Btn small onClick={() => copy(store().getItem(i.k) || '', say)}>Salin</Btn>
                  <Btn small kind="danger" onClick={() => del(i.k)}>Hapus</Btn>
                </div>
              </>
            )}
          </div>
        ))}
        {!shown.length && <div style={{ fontSize: 12.5, color: MUTED, padding: '8px 0' }}>Tidak ada data.</div>}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <Btn onClick={load}>Muat ulang</Btn>
        <Btn kind="danger" onClick={clearApp}>Hapus data app</Btn>
      </div>
    </Card>
  );
}

// ── Firebase (baca saja) ────────────────────────────────────────────────────
function FirebaseTab({ uid, say }: { uid: string; say: (m: string) => void }) {
  const [path, setPath] = useState('users/' + uid);
  const [limit, setLimit] = useState(20);
  const [out, setOut] = useState('');
  const [busy, setBusy] = useState(false);

  const read = async (p0 = path) => {
    const p = p0.trim().replace(/^\/+|\/+$/g, '');
    if (!p || busy) return;
    setBusy(true); setOut('');
    try {
      const { db } = await getFirebase();
      const ref = db.ref(p);
      const snap = await (limit ? ref.limitToFirst(limit) : ref).get();
      setOut(snap.exists() ? JSON.stringify(snap.val(), null, 2) : '(kosong / tidak ada)');
    } catch (e: any) { setOut('Error: ' + (e?.message || e)); }
    setBusy(false);
  };

  return (
    <Card title="Realtime Database · baca saja">
      <Chips items={['users/' + uid, 'users', 'leaderboard', 'premiumOrders']} active={path} onPick={(v) => { setPath(v); read(v); }} />
      <input style={field} value={path} onChange={(e) => setPath(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') read(); }} placeholder="path/di/database" autoCapitalize="off" autoCorrect="off" spellCheck={false} />
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
        <Btn kind="primary" onClick={() => read()} disabled={busy}>{busy ? 'Membaca...' : 'Baca'}</Btn>
        <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} style={{ ...field, width: 'auto', padding: '8px 10px', fontFamily: 'inherit' }}>
          <option value={20}>20 anak pertama</option>
          <option value={100}>100 anak pertama</option>
          <option value={0}>Semua</option>
        </select>
        {out && <Btn onClick={() => copy(out, say)}>Salin</Btn>}
      </div>
      {out && <pre style={pre}>{cut(out, 30000)}</pre>}
    </Card>
  );
}

// ── Log ─────────────────────────────────────────────────────────────────────
function LogTab({ logs, clear, say }: { logs: Log[]; clear: () => void; say: (m: string) => void }) {
  const [f, setF] = useState<'all' | 'warn' | 'error'>('all');
  const shown = logs.filter((l) => f === 'all' || (f === 'warn' ? l.lv === 'warn' || l.lv === 'error' : l.lv === 'error')).slice().reverse();
  const color = (lv: Log['lv']) => (lv === 'error' ? BAD : lv === 'warn' ? WARN : '#D6D4E0');
  const time = (t: number) => new Date(t).toLocaleTimeString('id-ID', { hour12: false });

  return (
    <Card title={`Console halaman ini · ${logs.length}`} right={
      <div style={{ display: 'flex', gap: 6 }}>
        <Btn small onClick={() => copy(shown.map((l) => `[${time(l.t)}] ${l.lv}: ${l.msg}`).join('\n'), say)}>Salin</Btn>
        <Btn small kind="danger" onClick={clear}>Bersihkan</Btn>
      </div>
    }>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {(['all', 'warn', 'error'] as const).map((k) => <Btn key={k} small kind={f === k ? 'primary' : 'ghost'} onClick={() => setF(k)}>{k === 'all' ? 'Semua' : k === 'warn' ? 'Warn+' : 'Error'}</Btn>)}
      </div>
      {!shown.length && <div style={{ fontSize: 12.5, color: MUTED }}>Belum ada log. Log yang tercatat hanya yang muncul selama halaman ini terbuka.</div>}
      {shown.map((l, i) => (
        <div key={i} style={{ borderTop: `1px solid ${LINE}`, padding: '6px 0', fontFamily: MONO, fontSize: 12, color: color(l.lv), wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>
          <span style={{ color: MUTED }}>{time(l.t)} </span>{cut(l.msg, 1500)}
        </div>
      ))}
    </Card>
  );
}
