'use client';

import { useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';

interface Props {
  px: (n: number) => number;
  font: string;
  gems: number;
  onOpen?: (n: 1 | 10) => void;
}

const BROWN = '#5a3b1e';
const MYTHIC = '#c2185b';
const LEGEND = '#a8741a';
const EPIC = '#8e44ad';

function Permata({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden style={{ flex: 'none' }}>
      <path d="M6 3h12l4.5 6L12 21.5 1.5 9z" fill="#d23fe6" />
      <path d="M6 3h12l4.5 6h-21z" fill="#f08cff" />
      <path d="M12 21.5L7.5 9h9z" fill="#a51ec0" />
      <path d="M6 3h12l4.5 6L12 21.5 1.5 9z" fill="none" stroke="#7a1090" strokeWidth="1.1" strokeLinejoin="round" />
    </svg>
  );
}

// ikon bonus kecil: permata / clover / XP
const Bonus = ({ px, kind, v }: { px: (n: number) => number; kind: 'gem' | 'luck' | 'xp'; v: string }) => {
  const bg = kind === 'gem' ? '#ffe3ef' : kind === 'luck' ? '#e1f6df' : '#e3ecff';
  const fg = kind === 'gem' ? '#b3124f' : kind === 'luck' ? '#1f7a30' : '#2459c9';
  const ic = kind === 'gem' ? '◆' : kind === 'luck' ? '☘' : 'XP';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: px(3), background: bg, color: fg, fontWeight: 800, fontSize: px(12), borderRadius: 99, padding: `${px(1)}px ${px(7)}px`, whiteSpace: 'nowrap' }}>
      <span style={{ fontSize: px(10) }}>{ic}</span>{v}
    </span>
  );
};

const OUTFITS = [
  { name: 'Setelan Pemburu Malam', rarity: 'Mythic', pct: '0,1%', color: MYTHIC, bonus: [['gem', '+1.000%'], ['luck', '+50%'], ['xp', '+50%']] as const, emoji: '🥷' },
  { name: 'Jubah Kilat Bara', rarity: 'Legendary', pct: '2,4%', color: LEGEND, bonus: [['gem', '+500%'], ['luck', '+30%'], ['xp', '+30%']] as const, emoji: '🧥' },
];

const OTHERS = [
  { name: 'Debu Bintang', rarity: 'Epic', pct: '12%', color: EPIC, qty: '×5', emoji: '⭐' },
  { name: 'Cumi', rarity: 'Rare', pct: '35%', color: '#1f64cc', qty: '×10', emoji: '🦑' },
  { name: 'Wibugem', rarity: 'Common', pct: '50,5%', color: '#7a6a58', qty: '×10', emoji: '💎' },
];

export default function ShopBajuLimited({ px, font, gems, onOpen }: Props) {
  const [odds, setOdds] = useState(false);

  const btn = (bg: string, edge: string, color: string): CSSProperties => ({
    border: 0, background: bg, boxShadow: `0 ${px(4)}px 0 ${edge}`, color, fontFamily: font, fontWeight: 800, borderRadius: px(12),
    cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: px(2), padding: `${px(8)}px ${px(10)}px`,
  });
  const price = (n: number): ReactNode => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: px(5), fontSize: px(22) }}><Permata size={px(24)} />{n.toLocaleString('id-ID')}</span>
  );

  const card = (o: (typeof OUTFITS)[number]) => (
    <div key={o.name} style={{ flex: 1, minWidth: 0, borderRadius: px(14), border: `${px(2)}px solid ${o.color}`, background: 'rgba(8,16,48,.7)', padding: `${px(6)}px ${px(10)}px`, display: 'flex', alignItems: 'center', gap: px(8) }}>
      <span style={{ fontSize: px(34), flex: 'none' }}>{o.emoji}</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ color: '#fff', fontWeight: 800, fontSize: px(15), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.name}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: px(4), alignItems: 'center' }}>
          <span style={{ color: o.color === MYTHIC ? '#ff7fb5' : '#ffd04a', fontWeight: 800, fontSize: px(12) }}>{o.rarity}</span>
          {o.bonus.map(([k, v]) => <Bonus key={k} px={px} kind={k} v={v} />)}
        </div>
      </div>
    </div>
  );

  const row = (key: string, left: ReactNode, name: string, sub: ReactNode, right: ReactNode) => (
    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: px(12), padding: `${px(8)}px ${px(14)}px`, borderTop: '1px solid #ecdfc4' }}>
      <span style={{ width: px(44), textAlign: 'center', fontSize: px(30), flex: 'none' }}>{left}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: px(17) }}>{name}</div>
        <div style={{ fontWeight: 700, fontSize: px(13), color: '#8a6d4a' }}>{sub}</div>
      </div>
      <div style={{ display: 'flex', gap: px(6) }}>{right}</div>
    </div>
  );

  const panel: CSSProperties = { borderRadius: px(16), border: `${px(2)}px solid #e6d4b0`, background: '#fffdf7', overflow: 'hidden', marginBottom: px(10) };

  return (
    <div>
      {/* banner */}
      <div style={{ position: 'relative', borderRadius: px(20), overflow: 'hidden', border: `${px(3)}px solid #3a2a6e`, background: 'linear-gradient(180deg,#0d1b4a 0%,#2b1458 55%,#4a1650 100%)', padding: px(12), color: '#fff' }}>
        <button onClick={() => setOdds(true)} style={{ position: 'absolute', top: px(10), right: px(10), border: 0, background: '#fffaf0', color: BROWN, fontFamily: font, fontWeight: 800, fontSize: px(13), borderRadius: px(10), padding: `${px(4)}px ${px(10)}px`, cursor: 'pointer' }}>Lihat peluang</button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: px(24), fontWeight: 800, textShadow: '0 2px 0 rgba(0,0,0,.4)' }}>Baju Secret Hunter</div>
          <span style={{ display: 'inline-block', background: '#c2185b', borderRadius: 99, fontWeight: 800, fontSize: px(12), padding: `${px(1)}px ${px(12)}px` }}>Berakhir 7 hari 22 jam lagi</span>
        </div>
        <div style={{ display: 'flex', gap: px(10), margin: `${px(14)}px 0 ${px(10)}px` }}>{OUTFITS.map(card)}</div>
        <div style={{ display: 'flex', alignItems: 'stretch', gap: px(10) }}>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: px(5) }}>
            <div style={{ fontWeight: 700, fontSize: px(15) }}>Mythic dijamin dalam <b style={{ color: '#ff9ac6' }}>1.000</b> peti</div>
            <div style={{ height: px(8), borderRadius: 99, background: 'rgba(255,255,255,.18)', overflow: 'hidden' }}>
              <div style={{ width: '0%', height: '100%', background: 'linear-gradient(90deg,#a259ff,#ff6fb1)' }} />
            </div>
          </div>
          <button onClick={() => onOpen?.(1)} disabled={gems < 320} style={{ ...btn('linear-gradient(180deg,#3b8cf0,#1f64cc)', '#164b9c', '#fff'), opacity: gems < 320 ? 0.6 : 1 }}>
            <span style={{ fontSize: px(14) }}>Buka 1×</span>{price(320)}
          </button>
          <button onClick={() => onOpen?.(10)} disabled={gems < 2880} style={{ ...btn('linear-gradient(180deg,#ffd45a,#f5a623)', '#c47f10', '#4a2f00'), position: 'relative', opacity: gems < 2880 ? 0.6 : 1 }}>
            <span style={{ position: 'absolute', top: px(-9), background: '#35c46a', color: '#fff', fontSize: px(11), borderRadius: 99, padding: `0 ${px(8)}px` }}>Hemat 10%</span>
            <span style={{ fontSize: px(14) }}>Buka 10×</span>{price(2880)}
          </button>
        </div>
      </div>

      {/* daftar isi */}
      <div style={{ fontSize: px(14), fontWeight: 800, color: '#6a5a48', margin: `${px(10)}px 0 ${px(4)}px` }}>Baju limited · 2,5%</div>
      <div style={panel}>
        {OUTFITS.map((o) => row(o.name, o.emoji, o.name, <span><b style={{ color: o.color }}>{o.rarity}</b> · {o.pct}</span>, o.bonus.map(([k, v]) => <Bonus key={k} px={px} kind={k} v={v} />)))}
      </div>
      <div style={{ fontSize: px(14), fontWeight: 800, color: '#6a5a48', margin: `${px(10)}px 0 ${px(4)}px` }}>Selain baju · 97,5%</div>
      <div style={panel}>
        {OTHERS.map((o) => row(o.name, o.emoji, o.name, <span><b style={{ color: o.color }}>{o.rarity}</b> · {o.pct}</span>, <b style={{ fontSize: px(17) }}>{o.qty}</b>))}
      </div>

      {/* peluang */}
      {odds && (
        <div onClick={() => setOdds(false)} style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(40,20,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: px(14) }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: px(430), maxWidth: '100%', maxHeight: '100%', overflowY: 'auto', borderRadius: px(22), border: `${px(4)}px solid #1a74e4`, background: '#fff5e1', padding: px(14), boxShadow: `0 ${px(6)}px 0 #0b3f8f`, color: BROWN, fontFamily: font }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fffdf7', borderRadius: px(10), fontSize: px(15), fontWeight: 700 }}>
              <tbody>
                {[
                  ['Mythic', '0,1%', 'Setelan Pemburu Malam', MYTHIC],
                  ['Legendary', '2,4%', 'Jubah Kilat Bara', LEGEND],
                  ['Epic', '12%', '5× Debu Bintang', EPIC],
                  ['Rare', '35%', '10× Cumi · 10× Umpan Glow · 10× Jangkrik Emas', '#1f64cc'],
                  ['Common', '50,5%', '10 Wibugem · 20× Cacing · 10× Udang', '#7a6a58'],
                ].map(([r, p, it, c]) => (
                  <tr key={r} style={{ borderTop: '1px solid #ecdfc4' }}>
                    <td style={{ padding: px(8), color: c, fontWeight: 800 }}>{r}</td>
                    <td style={{ padding: px(8), fontWeight: 800 }}>{p}</td>
                    <td style={{ padding: px(8) }}>{it}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
