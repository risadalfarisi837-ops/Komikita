'use client';

import { useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Sprite } from './ShopSprites';
import type { SpriteKey } from './ShopSprites';

interface Props {
  px: (n: number) => number;
  font: string;
  gems: number;
  onOpen?: (n: 1 | 10) => void;
  /** Opsional: URL gambar banner asli (ilustrasi malam). Kalau kosong dipakai adegan SVG bawaan. */
  banner?: string;
}

const BROWN = '#5a3b1e';
const C = { mythic: '#e0529c', legend: '#c9961f', epic: '#8e44ad', rare: '#1f64cc', common: '#7a6a58' };

function Permata({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden style={{ flex: 'none' }}>
      <path d="M6 3h12l4.500 6L12 21.500 1.500 9z" fill="#d23fe6" />
      <path d="M6 3h12l4.500 6h-21z" fill="#f08cff" />
      <path d="M12 21.500L7.500 9h9z" fill="#a51ec0" />
      <path d="M6 3h12l4.500 6L12 21.500 1.500 9z" fill="none" stroke="#7a1090" strokeWidth="1.100" strokeLinejoin="round" />
    </svg>
  );
}

type BonusKind = 'gem' | 'luck' | 'xp';
function BonusIcon({ kind, s }: { kind: BonusKind; s: number }) {
  if (kind === 'gem')
    return (
      <svg width={s} height={s} viewBox="0 0 16 16" aria-hidden style={{ flex: 'none' }}>
        <path d="M3 2h10l3 4-8 9L0 6z" fill="#ff4d86" stroke="#a8123f" strokeWidth="1" strokeLinejoin="round" />
        <path d="M5 4h6l1.500 2H3.500z" fill="#ffb3cc" />
      </svg>
    );
  if (kind === 'luck')
    return (
      <svg width={s} height={s} viewBox="0 0 16 16" aria-hidden style={{ flex: 'none' }}>
        {[[5, 5], [11, 5], [5, 11], [11, 11]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="3.300" fill="#3fbf55" stroke="#1d7a30" strokeWidth="1" />)}
        <rect x="7.200" y="7.200" width="1.600" height="1.600" fill="#1d7a30" />
      </svg>
    );
  return (
    <svg width={s} height={s} viewBox="0 0 16 16" aria-hidden style={{ flex: 'none' }}>
      <rect x="0.500" y="1.500" width="15" height="13" rx="3" fill="#3b7bff" stroke="#1b3f9a" strokeWidth="1" />
      <text x="8" y="11.500" textAnchor="middle" fontSize="8.500" fontWeight="900" fill="#fff" fontFamily="sans-serif">XP</text>
    </svg>
  );
}

function Chip({ px, kind, v, dark }: { px: (n: number) => number; kind: BonusKind; v: string; dark?: boolean }) {
  const light = { gem: '#ffe1ec', luck: '#dcf5df', xp: '#dde8ff' }[kind];
  const lightFg = { gem: '#b3124f', luck: '#1f7a30', xp: '#2459c9' }[kind];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: px(4), background: dark ? 'rgba(46,14,56,.78)' : light, color: dark ? '#fff' : lightFg, fontWeight: 800, fontSize: px(13), borderRadius: 99, padding: `${px(2)}px ${px(8)}px ${px(2)}px ${px(4)}px`, whiteSpace: 'nowrap' }}>
      <BonusIcon kind={kind} s={px(16)} />{v}
    </span>
  );
}

type Bonus = readonly [BonusKind, string];
const OUTFITS: { name: string; rarity: string; pct: string; color: string; sprite: SpriteKey; bonus: Bonus[] }[] = [
  { name: 'Setelan Pemburu Malam', rarity: 'Mythic', pct: '0,1%', color: C.mythic, sprite: 'night', bonus: [['gem', '+1.000%'], ['luck', '+50%'], ['xp', '+50%']] },
  { name: 'Jubah Kilat Bara', rarity: 'Legendary', pct: '2,4%', color: C.legend, sprite: 'flame', bonus: [['gem', '+500%'], ['luck', '+30%'], ['xp', '+30%']] },
];

const OTHERS: { name: string; rarity: string; pct: string; color: string; sprite: SpriteKey; qty: string; crystal?: boolean }[] = [
  { name: 'Debu Bintang', rarity: 'Epic', pct: '12%', color: C.epic, sprite: 'star', qty: '×5' },
  { name: 'Cumi', rarity: 'Rare', pct: '11,67%', color: C.rare, sprite: 'squid', qty: '×10' },
  { name: 'Umpan Glow', rarity: 'Rare', pct: '11,67%', color: C.rare, sprite: 'glow', qty: '×10' },
  { name: 'Jangkrik Emas', rarity: 'Rare', pct: '11,67%', color: C.rare, sprite: 'cricket', qty: '×10' },
  { name: 'Wibugem', rarity: 'Common', pct: '16,83%', color: C.common, sprite: 'crystal', qty: '10', crystal: true },
  { name: 'Cacing', rarity: 'Common', pct: '16,83%', color: C.common, sprite: 'worm', qty: '×20' },
  { name: 'Udang', rarity: 'Common', pct: '16,83%', color: C.common, sprite: 'shrimp', qty: '×10' },
];

/** Adegan malam bawaan: laut, bulan, ikan pink menyala, dermaga. */
function NightScene() {
  return (
    <svg viewBox="0 0 1190 300" preserveAspectRatio="xMidYMid slice" aria-hidden style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
      <defs>
        <linearGradient id="sk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#070c28" /><stop offset="1" stopColor="#2a1a5a" /></linearGradient>
        <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#10285a" /><stop offset="1" stopColor="#050a22" /></linearGradient>
        <radialGradient id="gl" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor="#ff5fb0" stopOpacity=".55" /><stop offset="1" stopColor="#ff5fb0" stopOpacity="0" /></radialGradient>
      </defs>
      <rect width="1190" height="300" fill="url(#sk)" />
      <path d="M1000 70a34 34 0 1 0 28 54a28 28 0 1 1-28-54z" fill="#ffe9a8" />
      <path d="M0 150l110-34 120 22 130-40 150 36 140-26 170 30 120-22 250 34v60H0z" fill="#0e2a3a" />
      <path d="M0 170l140-20 160 16 190-22 200 20 180-14 320 18v90H0z" fill="#0b1f34" />
      <rect y="170" width="1190" height="130" fill="url(#sea)" />
      {[[430, 200], [560, 238], [380, 262]].map(([x, y], i) => (
        <g key={i}>
          <ellipse cx={x + 60} cy={y} rx="120" ry="34" fill="url(#gl)" />
          <path d={`M${x} ${y}q50-34 120-6l26-14-8 20 8 18-26-12q-62 22-120-6z`} fill="#ff6fb8" stroke="#ffb3de" strokeWidth="2" />
        </g>
      ))}
      <path d="M780 130q40-60 90-40-30 10-36 46z" fill="#ff6fb8" stroke="#ffb3de" strokeWidth="2" />
      <path d="M740 232q50-14 120 0M700 250q80-12 200 0M760 268q60-8 130 0" stroke="#ff9ad0" strokeWidth="3" fill="none" opacity=".7" />
      <rect x="1040" y="230" width="150" height="14" fill="#4a3220" />
      <rect x="1060" y="244" width="10" height="56" fill="#3a2616" /><rect x="1130" y="244" width="10" height="56" fill="#3a2616" />
      <rect x="640" y="248" width="56" height="52" rx="6" fill="#201a22" />
    </svg>
  );
}

export default function ShopBajuLimited({ px, font, gems, onOpen, banner }: Props) {
  const [odds, setOdds] = useState(false);

  const btn = (bg: string, edge: string, color: string): CSSProperties => ({
    border: 0, background: bg, boxShadow: `0 ${px(4)}px 0 ${edge}`, color, fontFamily: font, fontWeight: 800, borderRadius: px(12),
    cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: px(2), padding: `${px(8)}px ${px(16)}px`,
  });
  const price = (n: number): ReactNode => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: px(6), fontSize: px(24) }}><Permata size={px(24)} />{n.toLocaleString('id-ID')}</span>
  );

  const infoCard = (o: (typeof OUTFITS)[number], right: boolean) => (
    <div style={{ position: 'absolute', bottom: px(10), [right ? 'right' : 'left']: px(10), width: px(300), borderRadius: px(10), border: `${px(2)}px solid ${right ? '#b88a3a' : '#4fc3d0'}`, background: 'rgba(6,10,36,.82)', padding: `${px(6)}px ${px(10)}px`, textAlign: right ? 'right' : 'left', color: '#fff' }}>
      <div style={{ fontWeight: 800, fontSize: px(17) }}>{o.name}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: px(4), alignItems: 'center', justifyContent: right ? 'flex-end' : 'flex-start', marginTop: px(2) }}>
        <span style={{ color: o.color === C.mythic ? '#ff7fc0' : '#ffd04a', fontWeight: 800, fontSize: px(13) }}>{o.rarity}</span>
        {o.bonus.map(([k, v]) => <Chip key={k} px={px} kind={k} v={v} dark />)}
      </div>
    </div>
  );

  const label = (t: string) => <div style={{ fontSize: px(15), fontWeight: 800, color: '#6a5a48', margin: `${px(10)}px 0 ${px(4)}px` }}>{t}</div>;
  const panel: CSSProperties = { borderRadius: px(16), border: `${px(2)}px solid #e6d4b0`, background: '#fffdf7', overflow: 'hidden', marginBottom: px(8) };
  const row = (i: number, k: SpriteKey, name: string, rarity: string, color: string, pct: string, right: ReactNode) => (
    <div key={name} style={{ display: 'flex', alignItems: 'center', gap: px(14), padding: `${px(9)}px ${px(16)}px`, borderTop: i ? '1px solid #ecdfc4' : 'none' }}>
      <span style={{ width: px(52), display: 'flex', justifyContent: 'center', flex: 'none' }}><Sprite k={k} size={px(44)} /></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: px(18), color: BROWN }}>{name}</div>
        <div style={{ fontWeight: 800, fontSize: px(13), color: '#8a7a68' }}><span style={{ color }}>{rarity}</span> · {pct}</div>
      </div>
      <div style={{ display: 'flex', gap: px(6), alignItems: 'center' }}>{right}</div>
    </div>
  );

  return (
    <div>
      <div style={{ position: 'relative', borderRadius: px(20), overflow: 'hidden', border: `${px(3)}px solid #2a2158`, background: '#0b1030', color: '#fff', fontFamily: font }}>
        <div style={{ position: 'relative', height: px(290) }}>
          {banner ? <img src={banner} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} /> : (
            <>
              <NightScene />
              <div style={{ position: 'absolute', left: px(20), bottom: px(40), filter: 'drop-shadow(0 0 14px rgba(53,230,255,.55))' }}><Sprite k="night" size={px(250)} /></div>
              <div style={{ position: 'absolute', right: px(26), bottom: px(40), filter: 'drop-shadow(0 0 14px rgba(255,138,42,.45))' }}><Sprite k="flame" size={px(215)} /></div>
            </>
          )}
          <div style={{ position: 'absolute', top: px(8), left: 0, right: 0, textAlign: 'center' }}>
            <div style={{ fontSize: px(28), fontWeight: 800, textShadow: '0 2px 6px rgba(0,0,0,.7)' }}>Baju Secret Hunter</div>
            <span style={{ display: 'inline-block', background: '#e0245e', borderRadius: 99, fontWeight: 800, fontSize: px(13), padding: `${px(1)}px ${px(14)}px` }}>Berakhir 7 hari 22 jam lagi</span>
          </div>
          <button onClick={() => setOdds(true)} style={{ position: 'absolute', top: px(10), right: px(10), background: 'rgba(10,14,40,.55)', border: '1.5px solid rgba(255,255,255,.6)', color: '#fff', fontFamily: font, fontWeight: 800, fontSize: px(14), borderRadius: px(14), padding: `${px(6)}px ${px(14)}px`, cursor: 'pointer' }}>Lihat peluang</button>
          {infoCard(OUTFITS[0], false)}
          {infoCard(OUTFITS[1], true)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: px(12), padding: `${px(12)}px ${px(14)}px`, background: 'linear-gradient(90deg,#0f1238,#2a1250 60%,#4a1648)' }}>
          <Sprite k="chest" size={px(50)} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: px(17), marginBottom: px(6) }}>Mythic dijamin dalam <b style={{ color: '#ff8fc8', fontSize: px(20) }}>1.000</b> peti</div>
            <div style={{ height: px(9), borderRadius: 99, background: 'rgba(255,255,255,.2)', overflow: 'hidden' }}><div style={{ width: '0%', height: '100%', background: 'linear-gradient(90deg,#a259ff,#ff6fb1)' }} /></div>
          </div>
          <button onClick={() => onOpen?.(1)} disabled={gems < 320} style={{ ...btn('linear-gradient(180deg,#2f86f0,#1458b8)', '#0d3f8a', '#fff'), opacity: gems < 320 ? 0.6 : 1 }}>
            <span style={{ fontSize: px(16) }}>Buka 1×</span>{price(320)}
          </button>
          <button onClick={() => onOpen?.(10)} disabled={gems < 2880} style={{ ...btn('linear-gradient(180deg,#ffd45a,#f5a623)', '#b9740c', '#6a1a0a'), position: 'relative', opacity: gems < 2880 ? 0.6 : 1 }}>
            <span style={{ position: 'absolute', top: px(-12), background: '#2f9a4a', color: '#fff', fontSize: px(13), borderRadius: 99, padding: `${px(1)}px ${px(12)}px`, boxShadow: '0 2px 0 #1d6a30' }}>Hemat 10%</span>
            <span style={{ fontSize: px(16) }}>Buka 10×</span>{price(2880)}
          </button>
        </div>
      </div>

      {label('Baju limited · 2,5%')}
      <div style={panel}>
        {OUTFITS.map((o, i) => row(i, o.sprite, o.name, o.rarity, o.color, o.pct, o.bonus.map(([k, v]) => <Chip key={k} px={px} kind={k} v={v} />)))}
      </div>
      {label('Selain baju · 97,5%')}
      <div style={panel}>
        {OTHERS.map((o, i) => row(i, o.sprite, o.name, o.rarity, o.color, o.pct, <span style={{ display: 'inline-flex', alignItems: 'center', gap: px(5) }}>{o.crystal && <Sprite k="crystal" size={px(22)} />}<b style={{ fontSize: px(19), color: BROWN }}>{o.qty}</b></span>))}
      </div>

      {odds && (
        <div onClick={() => setOdds(false)} style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(40,20,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: px(14) }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: px(440), maxWidth: '100%', maxHeight: '100%', overflowY: 'auto', borderRadius: px(22), border: `${px(4)}px solid #1a74e4`, background: '#fff5e1', padding: px(14), boxShadow: `0 ${px(6)}px 0 #0b3f8f`, color: BROWN, fontFamily: font }}>
            <div style={{ background: '#fffdf7', borderRadius: px(10), border: '1px solid #ecdfc4' }}>
              {([
                ['Mythic', '0,1%', C.mythic, [OUTFITS[0]], []],
                ['Legendary', '2,4%', C.legend, [OUTFITS[1]], []],
                ['Epic', '12%', C.epic, [], ['5× Debu Bintang']],
                ['Rare', '35%', C.rare, [], ['10× Cumi', '10× Umpan Glow', '10× Jangkrik Emas']],
                ['Common', '50,5%', C.common, [], ['10 Wibugem', '20× Cacing', '10× Udang']],
              ] as [string, string, string, typeof OUTFITS, string[]][]).map(([r, p, c, outs, txt], i) => (
                <div key={r} style={{ display: 'flex', gap: px(10), padding: `${px(8)}px ${px(10)}px`, borderTop: i ? '1px solid #ecdfc4' : 'none', alignItems: 'flex-start' }}>
                  <span style={{ width: px(90), color: c, fontWeight: 800, fontSize: px(15) }}>{r}</span>
                  <span style={{ width: px(56), fontWeight: 800, fontSize: px(15) }}>{p}</span>
                  <div style={{ flex: 1, fontWeight: 700, fontSize: px(15), display: 'flex', flexDirection: 'column', gap: px(3) }}>
                    {outs.map((o) => (
                      <div key={o.name} style={{ border: `${px(2)}px solid ${c}`, borderRadius: px(8), padding: `${px(3)}px ${px(8)}px` }}>
                        <div style={{ fontWeight: 800 }}>{o.name}</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: px(3) }}>{o.bonus.map(([k, v]) => <Chip key={k} px={px} kind={k} v={v} />)}</div>
                      </div>
                    ))}
                    {txt.map((t) => <div key={t}>{t}</div>)}
                  </div>
                </div>
              ))}
            </div>
            <ul style={{ listStyle: 'none', margin: `${px(10)}px 0`, padding: 0, fontSize: px(14), fontWeight: 700, display: 'flex', flexDirection: 'column', gap: px(6) }}>
              <li>⭐ Mythic dijamin paling lambat di peti ke-1.000</li>
              <li>👕 Baju untuk cowok dan cewek, dua-duanya didapat</li>
              <li>💜 Baju dobel: Mythic +800, Legendary +320</li>
            </ul>
            <button onClick={() => setOdds(false)} style={{ ...btn('linear-gradient(180deg,#3b8cf0,#1f64cc)', '#164b9c', '#fff'), width: '100%', fontSize: px(18) }}>Tutup</button>
          </div>
        </div>
      )}
    </div>
  );
}
