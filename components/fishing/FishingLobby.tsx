'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useGameFrame } from '@/components/GameMode';
import { getFirebase } from '@/lib/firebase-client';
import { ISLAND_CAP, cleanCode, newIslandCode, pickQuickRoom, readIslands, sortIslands, watchIslands } from '@/lib/fishingIslands';
import type { IslandInfo, IslandTheme } from '@/lib/fishingIslands';
import { MONTHS_ID, fmt } from '@/lib/season';

// Lobi Komik Fish: tampil dulu sebelum masuk game. Ukuran dirancang di kanvas 800x360, lalu diskalakan pas ke layar.
const W = 800;
const H = 360;
const HORIZON = 266;
const TITLE = '"Fredoka", "Baloo 2", system-ui, sans-serif';
const BODY = '"Nunito", "Fredoka", system-ui, sans-serif';
const INK = '#5a3b24';
const MUTED = '#8a7458';
const EDGE = '#ecd9a6';

interface Props {
  name: string;
  onPlay: (room: string) => void;
}

// ---------- pixel art kecil (grid huruf -> canvas, diskalakan tanpa blur) ----------
function Sprite({ rows, pal, block, style }: { rows: string[]; pal: Record<string, string>; block: number; style?: CSSProperties }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const cols = Math.max(...rows.map((r) => r.length));
  useEffect(() => {
    const c = ref.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const col = pal[row[x]];
        if (!col) continue;
        ctx.fillStyle = col;
        ctx.fillRect(x, y, 1, 1);
      }
    });
  }, [rows, pal]);
  return <canvas ref={ref} width={cols} height={rows.length} style={{ width: cols * block, height: rows.length * block, imageRendering: 'pixelated', display: 'block', ...style }} />;
}

const PALM = [
  '..........lllll............',
  '......gggglgggggggg........',
  '...ggggGGGggggGGGgggg......',
  '.gggGGG...ggtgg..GGGgg.....',
  '.gGG......gtTg.....GG......',
  '..........tTg..............',
  '..........tT...............',
  '..........tT...............',
  '.........tTT...............',
  '.........tT................',
  '......sssssssssss..........',
  '....sssssssssssssss........',
  '..SSssssssssssssssSS.......',
  '.wSSSSSSSSSSSSSSSSSSw......',
  '..wwwwwwwwwwwwwwwwwww......',
];
const PALM_PAL = { g: '#3fae4c', G: '#2b8a3b', l: '#86d96c', t: '#c68a45', T: '#94622d', s: '#f4dc92', S: '#dcbb6a', w: '#9fd8ff' };

const BOAT = [
  '...hh.....hh.............',
  '..hhhh...hhhh............',
  '..hhhhhhhhhhhh...........',
  '...hhhhhhhhhhh...........',
  '..hhffffffffhh...........',
  '..hhfefffffefh...........',
  '..hhffpffffpfh...........',
  '...hfffffffffh...........',
  '....hhggggghh............',
  'kkkkkkkkkkkkkkkkkkkkkkkkkk',
  'kBBBBBBBBBBBBBBBBBBBBBBBBk',
  'kRRRRRRRRRRRRRRRRRRRRRRRRk',
  '.krrrrrrrrrrrrrrrrrrrrrrk.',
  '..kbbbbbbbbbbbbbbbbbbbbk..',
  '...kBBBBBBBBBBBBBBBBBBk...',
  '....kkkkkkkkkkkkkkkkkk....',
  'wWwWwWwWwWwWwWwWwWwWwWwWwW',
  '.WwWwWwWwWwWwWwWwWwWwWwWw.',
];
const BOAT_PAL = { h: '#3b2316', f: '#fbe3d0', e: '#2a1a14', p: '#f7a8a0', g: '#58b86a', k: '#2a1a12', b: '#b0763c', B: '#8a5a2b', r: '#e8584a', R: '#c0392f', w: '#5fb7ff', W: '#d6efff' };

const MAIN_FISH = [
  '......oooo.......',
  '....ooOOOOoo..tt.',
  '..ooOOOOOOOoottTt',
  '.oOOOkOOOOOOOtTTt',
  'oOOOOOOOOOOOOottt',
  '.ooLLLLLLLLoo.tt.',
  '...ooLLLLoo......',
  '......oooo.......',
];
const MAIN_FISH_PAL = { o: '#c8641c', O: '#f7943a', L: '#ffd2a0', k: '#3a1c0c', t: '#e87f2a', T: '#f7a45a' };

const PUFFER = [
  '..o..o..o..o....',
  '...orrrrrro.....',
  '.orrrrrrrrrro..t',
  'orrrrerrrrrrrrtt',
  'orrrrrrrrrrrrtTt',
  '.oyyyyyyyyyo..t.',
  '..o.oyyyyo.o....',
];
const PUFFER_PAL = { o: '#ffb15c', r: '#d9402a', e: '#1a1010', y: '#f6d27a', t: '#a82a1c', T: '#d9402a' };

const GREEN_FISH = [
  '...gggggg.....',
  '.ggGGGGGGgg.tt',
  'ggGeGGGGGGGgtT',
  'gGGGGGGGGGGgtT',
  '.ggyyyyyyggg.t',
  '...gggggg.....',
];
const GREEN_FISH_PAL = { g: '#8aa83a', G: '#6a8a2a', e: '#1a1a10', y: '#d9d27a', t: '#4a6a1a', T: '#6a8a2a' };

// ---------- ikon pulau ----------
function IslandIcon({ size, theme }: { size: number; theme: IslandTheme }) {
  if (theme === 'iblis') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24">
        <path d="M5 9 3 3l6 3zM19 9l2-6-6 3z" fill="#7a2a14" />
        <rect x="5" y="6" width="14" height="14" rx="5" fill="#c2492a" stroke="#6e2412" strokeWidth="1.4" />
        <rect x="8" y="11" width="2.6" height="2.6" fill="#ffd54a" />
        <rect x="13.4" y="11" width="2.6" height="2.6" fill="#ffd54a" />
        <rect x="9" y="16" width="6" height="1.8" fill="#4a1408" />
      </svg>
    );
  }
  if (theme === 'society') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24">
        <path d="M3 4l6 3h6l6-3-1 10-5 6h-6l-5-6z" fill="#f1f1f4" stroke="#6b6b78" strokeWidth="1.3" strokeLinejoin="round" />
        <path d="M6 11l4 1.5L8 14zM18 11l-4 1.5 2 1.5z" fill="#3a3a48" />
        <path d="M12 15v3" stroke="#d94a4a" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <ellipse cx="12" cy="19" rx="10" ry="3.6" fill="#38b6e8" />
      <ellipse cx="12" cy="17" rx="6.5" ry="2.6" fill="#f0cf8a" />
      <path d="M12 16.5c.2-3 .4-5 1-7" stroke="#8a5a2a" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M13 9.5c-1-2.6-3.6-3.4-6-2.6 2-.2 4 .2 6 2.6zM13 9.5c1.2-2.4 3.8-2.8 6-1.6-2.2-.2-4.2.2-6 1.6zM13 9.5c-.6-2.6.2-4.4 2.4-5.4-1.4 1.6-1.8 3.4-2.4 5.4z" fill="#33b04c" />
    </svg>
  );
}

// ---------- ombak pixel (pola berulang) ----------
function wavePattern(): string {
  const blob = (x: number, y: number, w: number, fill: string, op: number) =>
    `<g fill="${fill}" fill-opacity="${op}"><rect x="${x}" y="${y}" width="${w}" height="3"/><rect x="${x + 3}" y="${y - 3}" width="${w - 6}" height="3"/></g>`;
  const parts = [
    blob(4, 14, 30, '#ffffff', 0.9), blob(78, 14, 42, '#ffffff', 0.9), blob(150, 14, 24, '#ffffff', 0.9), blob(198, 14, 36, '#ffffff', 0.9),
    blob(40, 46, 36, '#a8d2f7', 0.85), blob(110, 46, 26, '#a8d2f7', 0.85), blob(168, 46, 44, '#a8d2f7', 0.85),
    blob(10, 76, 28, '#7ab8f0', 0.7), blob(86, 76, 40, '#7ab8f0', 0.7), blob(156, 76, 26, '#7ab8f0', 0.7), blob(204, 76, 30, '#7ab8f0', 0.7),
  ];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="100" shape-rendering="crispEdges">${parts.join('')}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

const CSS = `
@keyframes kfWave { from { background-position-x: 0; } to { background-position-x: -240px; } }
@keyframes kfBob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
.kf-btn { transition: transform .08s ease, filter .12s ease; }
.kf-btn:active:not(:disabled) { transform: translateY(2px); }
.kf-btn:disabled { cursor: default; }
.kf-list::-webkit-scrollbar { width: 0; height: 0; }
.kf-input::placeholder { color: ${MUTED}; font-weight: 600; opacity: 1; }
.kf-input:focus { outline: none; border-color: #f5c451 !important; }
@media (prefers-reduced-motion: reduce) { .kf-anim { animation: none !important; } }
`;

function Blue({ children, onClick, disabled, style, light }: { children: ReactNode; onClick?: () => void; disabled?: boolean; style?: CSSProperties; light?: boolean }) {
  const off = !!disabled || !!light;
  return (
    <button
      type="button"
      className="kf-btn"
      onClick={onClick}
      disabled={disabled}
      style={{
        border: 'none', cursor: 'pointer', color: '#fff', fontFamily: BODY, fontWeight: 800, padding: 0,
        background: off ? 'linear-gradient(180deg,#86acdf,#6f97cf)' : 'linear-gradient(180deg,#2a7cf0,#0d54c4)',
        boxShadow: off ? '0 3px 0 #557fb8, 0 5px 6px rgba(0,30,90,0.18)' : '0 3px 0 #073b92, 0 5px 6px rgba(0,30,90,0.28)',
        textShadow: '0 1px 0 rgba(0,20,80,0.3)',
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export default function FishLobby({ name, onPlay }: Props) {
  const { ready, style: frameStyle } = useGameFrame();
  const frameRef = useRef<HTMLDivElement>(null);
  const [u, setU] = useState(1);
  const [islands, setIslands] = useState<IslandInfo[]>([]);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const dbRef = useRef<any>(null);
  const msgT = useRef<ReturnType<typeof setTimeout> | null>(null);

  // font lobi (Fredoka dipakai game juga; Nunito untuk teks)
  useEffect(() => {
    if (document.getElementById('komikita-fish-fonts-lobby')) return;
    const l = document.createElement('link');
    l.id = 'komikita-fish-fonts-lobby';
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito:wght@600;700;800;900&display=swap';
    document.head.appendChild(l);
  }, []);

  // skala: kanvas 800x360 muat penuh di layar (landscape, atau diputar kalau HP masih tegak)
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const upd = () => setU(Math.max(0.2, Math.min(el.clientWidth / W, el.clientHeight / H)));
    upd();
    const ro = new ResizeObserver(upd);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ready]);

  // daftar pulau langsung dari database
  useEffect(() => {
    let off: (() => void) | undefined;
    let dead = false;
    getFirebase().then(({ auth, db }: any) => {
      if (dead) return;
      dbRef.current = db;
      const stop = auth.onAuthStateChanged((u2: any) => {
        if (off) { off(); off = undefined; }
        if (!u2 || dead) { setIslands([]); return; }
        off = watchIslands(db, (l) => setIslands(l));
      });
      const prev = off;
      off = () => { stop(); if (prev) prev(); };
    }).catch(() => {});
    return () => { dead = true; if (off) off(); };
  }, []);

  const flash = (m: string) => {
    setMsg(m);
    if (msgT.current) clearTimeout(msgT.current);
    msgT.current = setTimeout(() => setMsg(''), 2600);
  };

  const sorted = useMemo(() => sortIslands(islands), [islands]);
  const totalPlayers = useMemo(() => islands.reduce((s, i) => s + i.count, 0), [islands]);

  const fresh = async (): Promise<IslandInfo[]> => (dbRef.current ? readIslands(dbRef.current) : islands);

  const quickPlay = async () => {
    if (busy) return;
    setBusy(true);
    try { onPlay(pickQuickRoom(await fresh())); } finally { setBusy(false); }
  };

  const createIsland = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const taken = new Set((await fresh()).map((i) => i.room));
      let c = newIslandCode();
      for (let n = 0; n < 20 && taken.has(c); n++) c = newIslandCode();
      onPlay(c);
    } finally { setBusy(false); }
  };

  const joinRoom = async (room: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const info = (await fresh()).find((i) => i.room === room);
      if (!info) { flash('Pulau tidak ditemukan'); return; }
      if (info.count >= ISLAND_CAP) { flash('Pulau sudah penuh'); return; }
      onPlay(room);
    } finally { setBusy(false); }
  };

  const joinByCode = () => {
    const c = cleanCode(code);
    if (c.length < 3) { flash('Masukkan kode pulau'); return; }
    void joinRoom(c);
  };

  // banner: joran bulanan (ada di game: dijual di tab Toko tiap bulan)
  const monthEnd = useMemo(() => {
    const d = new Date();
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return `${last.getDate()} ${MONTHS_ID[last.getMonth()]}`;
  }, []);

  const canJoin = cleanCode(code).length >= 3;
  const hello = (name || '').trim() || 'Tamu';

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 70, overflow: 'hidden', background: '#3d9fea', userSelect: 'none', fontFamily: BODY }}>
      <style>{CSS}</style>
      {ready && (
        <div ref={frameRef} style={{ ...frameStyle, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', left: '50%', top: '50%', width: W, height: H, transform: `translate(-50%,-50%) scale(${u})`, transformOrigin: 'center center' }}>
            {/* langit & laut (melebar keluar kanvas supaya layar lebar tetap penuh) */}
            <div style={{ position: 'absolute', left: -3000, top: -3000, width: W + 6000, height: 3000 + HORIZON, background: 'linear-gradient(180deg,#3d9fea 0%,#3d9fea 3000px,#5cb2f0 3080px,#a9d9fb 100%)' }} />
            <div style={{ position: 'absolute', left: -3000, top: HORIZON, width: W + 6000, height: 3000, background: 'linear-gradient(180deg,#2f95ec 0px,#1f7fdc 90px,#1565c0 360px,#1565c0 100%)' }} />
            <div style={{ position: 'absolute', left: -3000, top: HORIZON - 2, width: W + 6000, height: 3, background: 'rgba(255,255,255,0.35)' }} />
            <div className="kf-anim" style={{ position: 'absolute', left: -3000, top: HORIZON + 6, width: W + 6000, height: 100, backgroundImage: wavePattern(), backgroundRepeat: 'repeat-x', animation: 'kfWave 28s linear infinite' }} />

            {/* matahari */}
            <div style={{ position: 'absolute', left: 345 - 29, top: 49 - 29, width: 58, height: 58, borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }} />
            <div style={{ position: 'absolute', left: 345 - 23, top: 49 - 23, width: 46, height: 46, borderRadius: '50%', background: 'rgba(214,236,150,0.55)' }} />
            <div style={{ position: 'absolute', left: 345 - 18, top: 49 - 18, width: 36, height: 36, borderRadius: '50%', background: '#fbe26a' }} />

            {/* pulau & perahu */}
            <Sprite rows={PALM} pal={PALM_PAL} block={5} style={{ position: 'absolute', left: 378, top: 205 }} />
            <div className="kf-anim" style={{ position: 'absolute', left: 5, top: 284, animation: 'kfBob 3.2s ease-in-out infinite' }}>
              <Sprite rows={BOAT} pal={BOAT_PAL} block={4} />
            </div>

            {/* banner musim */}
            <div style={{ position: 'absolute', left: 20, top: 18, width: 207, height: 38, boxSizing: 'border-box', borderRadius: 14, background: 'rgba(255,251,238,0.94)', border: '1.5px solid #e9d9ae', boxShadow: '0 2px 0 rgba(120,90,40,0.25)', display: 'flex', alignItems: 'center', padding: '0 8px', gap: 8 }}>
              <div style={{ position: 'relative', width: 44, height: 24, flex: '0 0 auto' }}>
                <Sprite rows={PUFFER} pal={PUFFER_PAL} block={1.6} style={{ position: 'absolute', left: 0, top: 3 }} />
                <Sprite rows={GREEN_FISH} pal={GREEN_FISH_PAL} block={1.6} style={{ position: 'absolute', left: 21, top: 9 }} />
              </div>
              <div style={{ minWidth: 0, lineHeight: 1.1 }}>
                <div style={{ fontFamily: TITLE, fontWeight: 700, fontSize: 15, color: '#b5391b' }}>Joran Bulanan!</div>
                <div style={{ fontWeight: 700, fontSize: 11.5, color: '#7a5236', whiteSpace: 'nowrap' }}>Joran bulan ini sampai {monthEnd}</div>
              </div>
            </div>

            {/* judul */}
            <svg width={W} height={0} style={{ position: 'absolute' }} aria-hidden />
            <svg viewBox="0 0 340 70" width={340} height={70} style={{ position: 'absolute', left: 48, top: 56, overflow: 'visible' }} role="img" aria-label="Komik Fish">
              <g fontFamily={TITLE} fontWeight={700} fontSize={50} textAnchor="middle" strokeLinejoin="round" style={{ paintOrder: 'stroke fill' }}>
                <text x={170} y={56} fill="#06286b" stroke="#06286b" strokeWidth={9}>Komik Fish</text>
                <text x={170} y={52} stroke="#0a3d9c" strokeWidth={9} fill="#ffffff">
                  Komik <tspan fill="#ffcf33">Fish</tspan>
                </text>
              </g>
            </svg>

            {/* sapaan */}
            <div style={{ position: 'absolute', left: 102, top: 107, width: 231, height: 27, boxSizing: 'border-box', borderRadius: 14, background: 'rgba(255,251,238,0.96)', border: '2px solid #ecd9a6', boxShadow: '0 2px 0 rgba(120,90,40,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 8px', fontWeight: 800, fontSize: 15, color: '#3b2a1c', whiteSpace: 'nowrap', overflow: 'hidden' }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Halo, <span style={{ color: '#1d56b0' }}>{hello}</span>! Siap mancing?
              </span>
            </div>

            {/* tombol utama */}
            <button
              type="button"
              className="kf-btn"
              onClick={quickPlay}
              disabled={busy}
              style={{ position: 'absolute', left: 113, top: 141, width: 210, height: 51, borderRadius: 17, border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'linear-gradient(180deg,#ffe06b,#fbbd2a)', boxShadow: '0 4px 0 #cf8d12, 0 7px 8px rgba(0,30,90,0.22)', color: '#63390f', fontFamily: TITLE, fontWeight: 700, fontSize: 32 }}
            >
              <Sprite rows={MAIN_FISH} pal={MAIN_FISH_PAL} block={2.6} />
              Main!
            </button>
            <Blue
              onClick={createIsland}
              disabled={busy}
              style={{ position: 'absolute', left: 113, top: 204, width: 210, height: 37, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 18 }}
            >
              <IslandIcon size={22} theme="pulau" />
              Buat pulau baru
            </Blue>

            {/* panel pilih pulau */}
            <div style={{ position: 'absolute', left: 424, top: 14, width: 360, height: 330, boxSizing: 'border-box', borderRadius: 26, background: '#0c2f7c', padding: 3.5, boxShadow: '0 8px 18px rgba(0,20,80,0.35)' }}>
              <div style={{ width: '100%', height: '100%', boxSizing: 'border-box', borderRadius: 23, border: '3px solid #ecd49c', background: 'linear-gradient(180deg,#fffaee,#fcf3de)', padding: '8px 12px 10px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <div style={{ fontFamily: TITLE, fontWeight: 700, fontSize: 25, color: '#4a2c1a' }}>Pilih pulau</div>
                  <div style={{ fontWeight: 700, fontSize: 12.5, color: INK }}>
                    <b style={{ fontWeight: 900 }}>{fmt(islands.length)}</b> pulau · <b style={{ fontWeight: 900 }}>{fmt(totalPlayers)}</b> lagi main
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  <input
                    className="kf-input"
                    value={code}
                    onChange={(e) => setCode(cleanCode(e.target.value))}
                    onKeyDown={(e) => { if (e.key === 'Enter') joinByCode(); }}
                    placeholder="Kode pulau"
                    maxLength={8}
                    autoCapitalize="characters"
                    autoComplete="off"
                    spellCheck={false}
                    style={{ flex: 1, minWidth: 0, height: 38, boxSizing: 'border-box', borderRadius: 14, border: `2.5px solid ${EDGE}`, background: '#fff', textAlign: 'center', fontFamily: BODY, fontWeight: 800, fontSize: 17, color: '#4a2c1a', letterSpacing: 1, padding: '0 8px', userSelect: 'text' }}
                  />
                  <Blue onClick={joinByCode} disabled={busy} light={!canJoin} style={{ width: 68, height: 38, borderRadius: 13, fontSize: 17 }}>Masuk</Blue>
                </div>

                <div style={{ marginTop: 14, fontWeight: 800, fontSize: 14, color: INK }}>Teman online</div>
                <div style={{ marginTop: 6, paddingLeft: 10, fontWeight: 600, fontSize: 14, color: MUTED }}>Belum ada teman online</div>

                <div style={{ marginTop: 14, fontWeight: 800, fontSize: 14, color: INK }}>Pulau lain</div>
                <div className="kf-list" style={{ marginTop: 6, flex: 1, minHeight: 0, overflowY: 'auto', borderRadius: 14, border: `2px solid ${EDGE}`, background: '#fffdf7' }}>
                  {sorted.length === 0 && <div style={{ padding: '14px 12px', textAlign: 'center', fontWeight: 600, fontSize: 14, color: MUTED }}>Belum ada pulau. Tekan Main! atau buat pulau baru.</div>}
                  {sorted.map((it, i) => {
                    const full = it.count >= ISLAND_CAP;
                    return (
                      <div key={it.room} style={{ display: 'flex', alignItems: 'center', gap: 8, height: 40, padding: '0 8px 0 8px', borderTop: i ? '1.5px solid #efe3c6' : 'none' }}>
                        <IslandIcon size={18} theme={it.theme} />
                        <div style={{ flex: 1, minWidth: 0, fontWeight: 700, fontSize: 17, color: '#4a2c1a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.name}</div>
                        <div style={{ fontWeight: 800, fontSize: 15, color: full ? '#c0392f' : '#4a2c1a', width: 46, textAlign: 'center' }}>{it.count}/{ISLAND_CAP}</div>
                        <Blue onClick={() => joinRoom(it.room)} disabled={busy || full} light={full} style={{ width: 62, height: 30, borderRadius: 10, fontSize: 15 }}>{full ? 'Penuh' : 'Masuk'}</Blue>
                      </div>
                    );
                  })}
                </div>

                {msg && (
                  <div style={{ position: 'absolute', left: '50%', bottom: 14, transform: 'translateX(-50%)', background: 'rgba(60,30,18,0.92)', color: '#fff', borderRadius: 99, padding: '5px 14px', fontWeight: 800, fontSize: 13, whiteSpace: 'nowrap', boxShadow: '0 2px 0 rgba(0,0,0,0.25)' }}>{msg}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
