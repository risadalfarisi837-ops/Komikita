'use client';

// Panel Dev untuk game Mancing. Hanya dirender kalau role user = Developer (lihat FishingGame -> props.dev).
import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import type { FishingEngine } from './engine';
import { RARITY, formatNum } from '@/lib/fishing';
import type { Rarity } from '@/lib/fishing';

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
}

export const EMPTY_STATS: DevStats = { catches: 0, rare: 0, xp: 0, sold: 0, since: 0, last: 0, best: '-', bestRank: -1 };

const HUD = '"Fredoka", "Baloo 2", system-ui, sans-serif';
const RARITIES: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

interface Props {
  px: (n: number) => number;
  overlay: CSSProperties;
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
  stats: DevStats;
  resetStats: () => void;
  onClose: () => void;
}

export default function DevTools(p: Props) {
  const { px } = p;
  const [info, setInfo] = useState<ReturnType<FishingEngine['devInfo']> | null>(null);
  useEffect(() => {
    const t = setInterval(() => { if (p.engine) setInfo(p.engine.devInfo()); }, 500);
    if (p.engine) setInfo(p.engine.devInfo());
    return () => clearInterval(t);
  }, [p.engine]);

  const mins = p.stats.since && p.stats.last > p.stats.since ? (p.stats.last - p.stats.since) / 60000 : 0;
  const perMin = mins > 0.05 ? (p.stats.catches / mins).toFixed(1) : '-';

  const chip = (on: boolean, color = '#2f7be0'): CSSProperties => ({
    borderRadius: px(10), border: `${px(1.5)}px solid ${on ? color : 'rgba(255,255,255,0.16)'}`,
    background: on ? color : 'rgba(255,255,255,0.06)', color: '#fff', fontFamily: HUD, fontWeight: 700,
    fontSize: px(13), padding: `${px(6)}px ${px(10)}px`, cursor: 'pointer',
  });
  const head: CSSProperties = { fontFamily: HUD, fontWeight: 700, fontSize: px(13), color: '#9fb3d1', margin: `${px(12)}px 0 ${px(6)}px`, letterSpacing: 0.4 };
  const row: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: px(6) };
  const cell = (k: string, v: string) => (
    <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: px(10), padding: `${px(6)}px ${px(10)}px`, minWidth: px(84), flex: '1 1 auto' }}>
      <div style={{ fontSize: px(11), color: '#9fb3d1', fontWeight: 600 }}>{k}</div>
      <div style={{ fontSize: px(15), color: '#fff', fontWeight: 700 }}>{v}</div>
    </div>
  );

  return (
    <div style={{ ...p.overlay, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={p.onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: px(330), maxWidth: '92%', maxHeight: '92%', overflowY: 'auto', boxSizing: 'border-box', background: '#141a28', borderRadius: px(18), padding: px(14), color: '#fff', fontFamily: HUD, border: `${px(2)}px solid #818cf8` }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 700, fontSize: px(17) }}>🛠️ Dev Tools · Mancing</div>
          <button onClick={p.onClose} aria-label="Tutup" style={{ ...chip(false), padding: `${px(3)}px ${px(10)}px` }}>✕</button>
        </div>

        <button
          onClick={() => p.onAuto(!p.auto)}
          style={{ width: '100%', marginTop: px(10), borderRadius: px(14), border: 0, color: '#fff', fontFamily: HUD, fontWeight: 700, fontSize: px(17), padding: `${px(12)}px 0`, cursor: 'pointer', background: p.auto ? 'linear-gradient(180deg,#f43f5e,#be123c)' : 'linear-gradient(180deg,#22c55e,#15803d)' }}
        >
          {p.auto ? '⏹ Stop Auto Fishing' : '▶ Mulai Auto Fishing'}
        </button>
        <div style={{ fontSize: px(11.5), color: '#9fb3d1', marginTop: px(5), lineHeight: 1.35 }}>
          Hadapkan karakter ke air dulu. Pintasan keyboard: <b>P</b>. Layar dijaga tetap nyala selama auto jalan, dan game berhenti kalau tab ditutup / pindah.
        </div>

        <div style={head}>AUTO-JUAL SAAT TAS HAMPIR PENUH</div>
        <div style={row}>
          <button style={chip(p.sellMode === 'off')} onClick={() => p.setSellMode('off')}>Mati</button>
          <button style={chip(p.sellMode === 'keep')} onClick={() => p.setSellMode('keep')}>Sisakan ikan pamer</button>
          <button style={chip(p.sellMode === 'all')} onClick={() => p.setSellMode('all')}>Jual semua</button>
        </div>
        <div style={{ fontSize: px(11.5), color: '#9fb3d1', marginTop: px(4) }}>
          &quot;Ikan pamer&quot; = XL, Epik, Legendary. Kalau tas penuh isinya ikan pamer semua, auto berhenti sendiri.
        </div>

        <div style={head}>KECEPATAN GAME</div>
        <div style={row}>
          {[0.5, 1, 2, 3, 5].map((n) => (
            <button key={n} style={chip(p.speed === n, '#a855f7')} onClick={() => p.setSpeed(n)}>{n}×</button>
          ))}
        </div>

        <div style={head}>UJI & DEBUG</div>
        <div style={row}>
          <button style={chip(p.instant, '#0ea5e9')} onClick={() => p.setInstant(!p.instant)}>⚡ Gigitan instan {p.instant ? 'ON' : 'OFF'}</button>
          <button style={chip(false)} onClick={() => p.engine?.devShoal('ikan')}>🐟 Panggil gerombolan</button>
          <button style={chip(false)} onClick={() => p.engine?.devShoal('hiu')}>🦈 Panggil hiu</button>
        </div>
        <div style={{ ...head, marginTop: px(10) }}>PAKSA RARITY IKAN BERIKUTNYA</div>
        <div style={row}>
          <button style={chip(p.force === '')} onClick={() => p.setForce('')}>Normal</button>
          {RARITIES.map((r) => (
            <button key={r} style={chip(p.force === r, RARITY[r].color)} onClick={() => p.setForce(r)}>
              <span style={{ color: p.force === r ? '#111' : RARITY[r].color }}>{RARITY[r].label}</span>
            </button>
          ))}
        </div>

        <div style={head}>STATISTIK SESI AUTO</div>
        <div style={row}>
          {cell('Tangkapan', formatNum(p.stats.catches))}
          {cell('Per menit', perMin)}
          {cell('Langka+', formatNum(p.stats.rare))}
          {cell('XP', formatNum(p.stats.xp))}
          {cell('Crystal terjual', formatNum(p.stats.sold))}
          {cell('Terbaik', p.stats.best)}
        </div>
        <button style={{ ...chip(false), marginTop: px(8) }} onClick={p.resetStats}>Reset statistik</button>

        {info && (
          <>
            <div style={head}>DEBUG ENGINE</div>
            <div style={row}>
              {cell('FPS', String(info.fps))}
              {cell('Fase', info.phase)}
              {cell('Level', String(info.level))}
              {cell('Luck', '+' + Math.round(info.luck * 100) + '%')}
              {cell('Tile', info.tileX + ',' + info.tileY)}
              {cell('Gerombolan', info.shoal ? 'ada' : '-')}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
