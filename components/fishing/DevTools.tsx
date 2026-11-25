'use client';

// Dev Tools untuk game Mancing (hanya dirender kalau role user = Developer, lihat FishingGame -> props.dev).
// Dua bagian: <DevFab> (lingkaran yang bisa digeser) dan <DevTools> (panel melayang yang bisa digeser, dilipat, dan tidak menggelapkan game).
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as RPointerEvent, ReactNode } from 'react';
import type { FishingEngine } from './engine';
import { RARITY, formatNum } from '@/lib/fishing';
import type { Rarity, SizeTier } from '@/lib/fishing';

export type SellMode = 'off' | 'keep' | 'all';

export interface DevStats {
  catches: number; // jumlah tangkapan selama auto
  rare: number;    // Langka ke atas
  xp: number;
  sold: number;    // Crystal dari auto-jual
  since: number;   // waktu auto pertama dinyalakan (ms), 0 = belum
  last: number;    // waktu tangkapan terakhir (ms)
  best: string;    // tangkapan terbaik (rarity tertinggi, lalu berat)
  bestRank: number;
  small: number;   // tangkapan kelas kecil
  mid: number;     // tangkapan kelas sedang
  big: number;     // tangkapan kelas besar
}

export const EMPTY_STATS: DevStats = { catches: 0, rare: 0, xp: 0, sold: 0, since: 0, last: 0, best: '-', bestRank: -1, small: 0, mid: 0, big: 0 };

const HUD = '"Fredoka", "Baloo 2", system-ui, sans-serif';
const RARITIES: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
const GRAD = 'linear-gradient(90deg,#22d3ee,#818cf8,#e879f9)';
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

// ---------- geser (drag) ----------
// Posisi disimpan sebagai pecahan (0..1) dari area game, jadi tetap pas di layar berbeda.
// Kalau game diputar 90° (HP portrait), gerak jari dipetakan balik ke sumbu game.
interface Pos { x: number; y: number }
function useDrag(key: string, def: Pos, lim: { x: [number, number]; y: [number, number] }, rot: boolean, getWrap: () => HTMLElement | null, onTap?: () => void) {
  const [pos, setPos] = useState<Pos>(def);
  const st = useRef<{ sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(null);
  useEffect(() => {
    try {
      const v = JSON.parse(localStorage.getItem(key) || 'null');
      if (v && typeof v.x === 'number' && typeof v.y === 'number') setPos({ x: clamp(v.x, lim.x[0], lim.x[1]), y: clamp(v.y, lim.y[0], lim.y[1]) });
    } catch { /* pakai posisi bawaan */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const bind = {
    onPointerDown: (e: RPointerEvent<HTMLElement>) => {
      e.stopPropagation();
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* abaikan */ }
      st.current = { sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y, moved: false };
    },
    onPointerMove: (e: RPointerEvent<HTMLElement>) => {
      const s = st.current;
      if (!s) return;
      let dx = e.clientX - s.sx;
      let dy = e.clientY - s.sy;
      if (rot) { const t = dx; dx = dy; dy = -t; }
      if (!s.moved && Math.hypot(dx, dy) < 6) return;
      s.moved = true;
      const w = getWrap();
      const W = w?.offsetWidth || 1;
      const H = w?.offsetHeight || 1;
      setPos({ x: clamp(s.ox + dx / W, lim.x[0], lim.x[1]), y: clamp(s.oy + dy / H, lim.y[0], lim.y[1]) });
    },
    onPointerUp: () => {
      const s = st.current;
      st.current = null;
      if (!s) return;
      if (!s.moved) { onTap?.(); return; }
      setPos((p) => { try { localStorage.setItem(key, JSON.stringify(p)); } catch { /* abaikan */ } return p; });
    },
    onPointerCancel: () => { st.current = null; },
  };
  return { pos, bind };
}

// ---------- lingkaran Dev (bisa digeser, ketuk untuk buka/tutup panel) ----------
export function DevFab(p: { px: (n: number) => number; rot: boolean; getWrap: () => HTMLElement | null; auto: boolean; count: number; open: boolean; onTap: () => void }) {
  const { px } = p;
  const { pos, bind } = useDrag('komikita-dev-fab', { x: 0.93, y: 0.58 }, { x: [0.04, 0.96], y: [0.08, 0.92] }, p.rot, p.getWrap, p.onTap);
  const ring = p.auto ? '#22c55e' : p.open ? '#e879f9' : '#818cf8';
  return (
    <button
      {...bind}
      aria-label="Dev Mancing"
      style={{
        position: 'absolute', zIndex: 24, left: `${pos.x * 100}%`, top: `${pos.y * 100}%`, transform: 'translate(-50%,-50%)',
        width: px(48), height: px(48), borderRadius: '50%', boxSizing: 'border-box', padding: 0, cursor: 'grab', touchAction: 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: px(22), color: '#fff',
        background: 'radial-gradient(circle at 35% 28%,#2a3558,#10162a)', border: `${px(3)}px solid ${ring}`,
        boxShadow: `0 0 ${px(14)}px ${ring}aa, 0 ${px(3)}px ${px(6)}px rgba(0,0,0,.5)`,
      }}
    >
      🛠️
      {p.auto && (
        <span style={{ position: 'absolute', right: px(-5), top: px(-5), minWidth: px(19), height: px(19), padding: `0 ${px(4)}px`, boxSizing: 'border-box', borderRadius: 99, background: '#22c55e', border: `${px(1.5)}px solid #0b1020`, color: '#04210f', fontFamily: HUD, fontWeight: 700, fontSize: px(11), lineHeight: `${px(16)}px`, textAlign: 'center' }}>
          {p.count > 99 ? '99+' : p.count}
        </span>
      )}
    </button>
  );
}

// ---------- panel ----------
interface Props {
  px: (n: number) => number;
  rot: boolean;
  getWrap: () => HTMLElement | null;
  engine: FishingEngine | null;
  auto: boolean;
  onAuto: (on: boolean) => void;
  sellMode: SellMode;
  setSellMode: (m: SellMode) => void;
  speed: number;
  setSpeed: (n: number) => void;
  instant: boolean;
  setInstant: (b: boolean) => void;
  force: Rarity | '';
  setForce: (r: Rarity | '') => void;
  forceSize: SizeTier | '';
  setForceSize: (t: SizeTier | '') => void;
  stats: DevStats;
  resetStats: () => void;
  onClose: () => void;
}

type Tab = 'auto' | 'uji' | 'stat';

export default function DevTools(p: Props) {
  const { px } = p;
  const [tab, setTab] = useState<Tab>('auto');
  const [min, setMin] = useState(false);
  const [info, setInfo] = useState<ReturnType<FishingEngine['devInfo']> | null>(null);
  const { pos, bind } = useDrag('komikita-dev-panel', { x: 0.27, y: 0.05 }, { x: [0, 0.72], y: [0, 0.8] }, p.rot, p.getWrap);

  useEffect(() => {
    const t = setInterval(() => { if (p.engine) setInfo(p.engine.devInfo()); }, 500);
    if (p.engine) setInfo(p.engine.devInfo());
    return () => clearInterval(t);
  }, [p.engine]);

  const mins = p.stats.since && p.stats.last > p.stats.since ? (p.stats.last - p.stats.since) / 60000 : 0;
  const perMin = mins > 0.05 ? (p.stats.catches / mins).toFixed(1) : '-';

  // ----- potongan UI kecil -----
  const seg = <T extends string | number>(items: { v: T; label: ReactNode; color?: string }[], cur: T, set: (v: T) => void) => (
    <div style={{ display: 'flex', background: 'rgba(255,255,255,0.07)', borderRadius: px(11), padding: px(3), gap: px(3) }}>
      {items.map((it) => {
        const on = it.v === cur;
        return (
          <button key={String(it.v)} onClick={() => set(it.v)} style={{ flex: 1, border: 0, borderRadius: px(8), padding: `${px(6)}px ${px(4)}px`, cursor: 'pointer', fontFamily: HUD, fontWeight: 700, fontSize: px(12), whiteSpace: 'nowrap', background: on ? (it.color || '#5b6cf0') : 'transparent', color: on ? (it.color ? '#111' : '#fff') : '#b4bdd6' }}>
            {it.label}
          </button>
        );
      })}
    </div>
  );
  const H = (t: string) => <div style={{ fontSize: px(11), fontWeight: 700, color: '#8a96b8', letterSpacing: 0.5, margin: `${px(11)}px 0 ${px(5)}px`, textTransform: 'uppercase' }}>{t}</div>;
  const toggle = (on: boolean, set: (b: boolean) => void, title: string, sub: string) => (
    <button onClick={() => set(!on)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: px(10), border: 0, background: 'rgba(255,255,255,0.06)', borderRadius: px(12), padding: `${px(8)}px ${px(10)}px`, cursor: 'pointer', textAlign: 'left', color: '#fff', fontFamily: HUD }}>
      <span style={{ flex: 1 }}>
        <span style={{ display: 'block', fontWeight: 700, fontSize: px(13) }}>{title}</span>
        <span style={{ display: 'block', fontWeight: 500, fontSize: px(11), color: '#8a96b8', marginTop: px(1) }}>{sub}</span>
      </span>
      <span style={{ width: px(38), height: px(22), borderRadius: 99, background: on ? '#22c55e' : '#3a4056', position: 'relative', flex: '0 0 auto', transition: 'background .15s' }}>
        <span style={{ position: 'absolute', top: px(3), left: on ? px(19) : px(3), width: px(16), height: px(16), borderRadius: '50%', background: '#fff', transition: 'left .15s' }} />
      </span>
    </button>
  );
  const card = (icon: string, k: string, v: string, wide = false) => (
    <div style={{ flex: wide ? '1 1 100%' : '1 1 30%', minWidth: 0, background: 'rgba(255,255,255,0.06)', borderRadius: px(11), padding: `${px(7)}px ${px(9)}px`, boxSizing: 'border-box' }}>
      <div style={{ fontSize: px(10.5), fontWeight: 600, color: '#8a96b8' }}>{icon} {k}</div>
      <div style={{ fontSize: px(15), fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v}</div>
    </div>
  );
  const small = (on: boolean): CSSProperties => ({ border: 0, borderRadius: px(10), padding: `${px(7)}px ${px(10)}px`, cursor: 'pointer', fontFamily: HUD, fontWeight: 700, fontSize: px(12), color: '#fff', background: on ? '#5b6cf0' : 'rgba(255,255,255,0.09)' });

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      style={{
        position: 'absolute', zIndex: 31, left: `${pos.x * 100}%`, top: `${pos.y * 100}%`, width: px(300), maxWidth: '94%',
        maxHeight: `${(1 - pos.y) * 100}%`, display: 'flex', flexDirection: 'column', boxSizing: 'border-box', color: '#fff', fontFamily: HUD,
        background: 'rgba(14,18,32,0.94)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
        border: `${px(1.5)}px solid rgba(129,140,248,0.5)`, borderRadius: px(16), boxShadow: '0 10px 30px rgba(0,0,0,.55)', overflow: 'hidden',
      }}
    >
      {/* header (tahan & geser untuk memindah panel) */}
      <div {...bind} style={{ display: 'flex', alignItems: 'center', gap: px(8), padding: `${px(8)}px ${px(10)}px`, cursor: 'grab', touchAction: 'none', background: 'linear-gradient(180deg,rgba(129,140,248,0.22),rgba(129,140,248,0.04))', flex: '0 0 auto' }}>
        <span style={{ fontSize: px(15), color: '#8a96b8', lineHeight: 1 }}>⠿</span>
        <span style={{ fontWeight: 700, fontSize: px(14), flex: 1, background: GRAD, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>DEV · MANCING</span>
        <span style={{ width: px(9), height: px(9), borderRadius: '50%', background: p.auto ? '#22c55e' : '#55607f', boxShadow: p.auto ? '0 0 8px #22c55e' : 'none' }} />
        <button onPointerDown={(e) => e.stopPropagation()} onClick={() => setMin((m) => !m)} aria-label={min ? 'Buka' : 'Lipat'} style={{ ...small(false), padding: `${px(2)}px ${px(9)}px`, fontSize: px(14) }}>{min ? '▸' : '▾'}</button>
        <button onPointerDown={(e) => e.stopPropagation()} onClick={p.onClose} aria-label="Tutup" style={{ ...small(false), padding: `${px(2)}px ${px(9)}px`, fontSize: px(14) }}>✕</button>
      </div>

      {!min && (
        <div style={{ overflowY: 'auto', padding: `${px(8)}px ${px(10)}px ${px(12)}px`, WebkitOverflowScrolling: 'touch' }}>
          {seg<Tab>([{ v: 'auto', label: '🎣 Auto' }, { v: 'uji', label: '🧪 Uji' }, { v: 'stat', label: '📊 Statistik' }], tab, setTab)}

          {tab === 'auto' && (
            <>
              <button
                onClick={() => p.onAuto(!p.auto)}
                style={{ width: '100%', marginTop: px(10), border: 0, borderRadius: px(14), color: '#fff', fontFamily: HUD, fontWeight: 700, fontSize: px(16), padding: `${px(11)}px 0`, cursor: 'pointer', background: p.auto ? 'linear-gradient(180deg,#f43f5e,#be123c)' : 'linear-gradient(180deg,#22c55e,#15803d)', boxShadow: '0 4px 12px rgba(0,0,0,.35)' }}
              >
                {p.auto ? '⏹  Stop Auto Fishing' : '▶  Mulai Auto Fishing'}
              </button>
              <div style={{ display: 'flex', gap: px(6), marginTop: px(8) }}>
                {card('🐟', 'Ikan', formatNum(p.stats.catches))}
                {card('⏱️', 'Per menit', perMin)}
                {card('💎', 'Crystal', formatNum(p.stats.sold))}
              </div>
              <div style={{ fontSize: px(11), color: '#8a96b8', marginTop: px(6), lineHeight: 1.35 }}>
                Hadapkan karakter ke air dulu. Pintasan: tombol <b>P</b>. Layar tetap nyala selama auto jalan.
              </div>
              {H('Auto-jual saat tas hampir penuh')}
              {seg<SellMode>([{ v: 'off', label: 'Mati' }, { v: 'keep', label: 'Sisakan pamer' }, { v: 'all', label: 'Semua' }], p.sellMode, p.setSellMode)}
              <div style={{ fontSize: px(10.5), color: '#8a96b8', marginTop: px(4) }}>Pamer = XL, Epik, Legendary. Tas penuh isi ikan pamer semua → auto berhenti.</div>
              {H('Kecepatan game')}
              {seg<number>([0.5, 1, 2, 3, 5].map((n) => ({ v: n, label: n + '×' })), p.speed, p.setSpeed)}
            </>
          )}

          {tab === 'uji' && (
            <>
              <div style={{ marginTop: px(10) }}>{toggle(p.instant, p.setInstant, '⚡ Gigitan instan', 'Ikan langsung menggigit setelah lempar')}</div>
              {H('Rarity ikan (Hoki = acak sesuai luck)')}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: px(5) }}>
                <button style={small(p.force === '')} onClick={() => p.setForce('')}>🍀 Hoki</button>
                {RARITIES.map((r) => (
                  <button key={r} onClick={() => p.setForce(r)} style={{ ...small(false), background: p.force === r ? RARITY[r].color : 'rgba(255,255,255,0.09)', color: p.force === r ? '#111' : RARITY[r].color }}>
                    {RARITY[r].label}
                  </button>
                ))}
              </div>
              {H('Ukuran ikan (Hoki = acak sesuai luck)')}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: px(5) }}>
                <button style={small(p.forceSize === '')} onClick={() => p.setForceSize('')}>🍀 Hoki</button>
                {([['kecil', 'Kecil'], ['sedang', 'Sedang'], ['besar', 'Besar']] as const).map(([v, l]) => (
                  <button key={v} onClick={() => p.setForceSize(v)} style={small(p.forceSize === v)}>{l}</button>
                ))}
              </div>
              <div style={{ fontSize: px(10.5), color: '#8a96b8', marginTop: px(5), lineHeight: 1.35 }}>Berlaku juga saat auto fishing. Rarity dan ukuran bisa dipilih terpisah.</div>
              {H('Panggil event')}
              <div style={{ display: 'flex', gap: px(6) }}>
                <button style={{ ...small(false), flex: 1 }} onClick={() => p.engine?.devShoal('ikan')}>🐟 Gerombolan</button>
                <button style={{ ...small(false), flex: 1 }} onClick={() => p.engine?.devShoal('hiu')}>🦈 Hiu</button>
                <button style={{ ...small(false), flex: 1 }} onClick={() => p.engine?.devShoal('raksasa')}>🐋 Raksasa</button>
              </div>
            </>
          )}

          {tab === 'stat' && (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: px(6), marginTop: px(10) }}>
                {card('🐟', 'Tangkapan', formatNum(p.stats.catches))}
                {card('⏱️', 'Per menit', perMin)}
                {card('⭐', 'Langka+', formatNum(p.stats.rare))}
                {card('✨', 'XP', formatNum(p.stats.xp))}
                {card('💎', 'Crystal', formatNum(p.stats.sold))}
                {card('📏', 'Kecil · Sedang · Besar', p.stats.small + ' · ' + p.stats.mid + ' · ' + p.stats.big, true)}
                {card('🏆', 'Terbaik', p.stats.best, true)}
              </div>
              <button style={{ ...small(false), marginTop: px(8) }} onClick={p.resetStats}>↺ Reset statistik</button>
              {info && (
                <>
                  {H('Debug engine')}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: px(6) }}>
                    {card('📈', 'FPS', String(info.fps))}
                    {card('🎯', 'Fase', info.phase)}
                    {card('🍀', 'Luck', '+' + Math.round(info.luck * 100) + '%')}
                    {card('🧭', 'Tile', info.tileX + ',' + info.tileY)}
                    {card('🔰', 'Level', String(info.level))}
                    {card('🌊', 'Event', info.shoal ? 'ada' : '-')}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
