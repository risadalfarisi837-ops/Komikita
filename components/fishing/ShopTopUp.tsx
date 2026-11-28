'use client';

import { useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';

import { TOPUP_PACKS as PACKS } from '@/lib/topupPacks';
import type { TopUpCurrency } from '@/lib/topupPacks';
export type { TopUpCurrency };

interface Props {
  px: (n: number) => number;
  font: string;
  initial?: TopUpCurrency;
  gems: number;
  crystal: number;
  gemIcon: (size: number) => ReactNode;
  crystalIcon: (size: number) => ReactNode;
  onClose: () => void;
  /** Dipanggil saat tombol harga ditekan. Hubungkan ke pembayaran. */
  onBuy?: (currency: TopUpCurrency, packId: string, amount: number, bonus: number, rupiah: number) => void;
}

const THEME = {
  gems: { name: 'Gems', main: '#c43ae0', grad: 'linear-gradient(180deg,#e060f5,#b02ad0)', edge: '#7a1a96', card: '#e9b6f2', bg: 'linear-gradient(180deg,#ffffff,#fbeefd)', use: 'Dipakai untuk Baju Limited, Gacha Rumah, Pet, dan Etalase' },
  crystal: { name: 'Crystal', main: '#2a8ee8', grad: 'linear-gradient(180deg,#5cc6ff,#1f86e8)', edge: '#15609f', card: '#a9d8f5', bg: 'linear-gradient(180deg,#ffffff,#eef8ff)', use: 'Dipakai untuk Gacha Rod, Gacha Gaya, dan Etalase' },
} as const;

const idn = (n: number) => n.toLocaleString('id-ID');
const rupiah = (n: number) => 'Rp' + idn(n);
const BROWN = '#5a3b1e';

export default function ShopTopUp({ px, font, initial = 'gems', gems, crystal, gemIcon, crystalIcon, onClose, onBuy }: Props) {
  const [cur, setCur] = useState<TopUpCurrency>(initial);
  const [msg, setMsg] = useState('');
  const t = THEME[cur];
  const icon = (c: TopUpCurrency, s: number) => (c === 'gems' ? gemIcon(s) : crystalIcon(s));

  const tabBtn = (c: TopUpCurrency): CSSProperties => {
    const on = cur === c;
    const th = THEME[c];
    return {
      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: px(10), border: 0, cursor: 'pointer', fontFamily: font, fontWeight: 800, fontSize: px(20),
      borderRadius: px(16), padding: `${px(10)}px ${px(14)}px`, background: on ? th.grad : '#f5e6c8', color: on ? '#fff' : BROWN,
      boxShadow: on ? `0 ${px(4)}px 0 ${th.edge}` : 'inset 0 0 0 2px #e6d4b0', textShadow: on ? '0 1.5px 0 rgba(0,0,0,.25)' : 'none',
    };
  };

  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 70, background: 'rgba(0,12,40,.62)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: px(10), fontFamily: font, color: BROWN }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: px(980), maxHeight: '100%', display: 'flex', flexDirection: 'column', background: '#fff5e1', borderRadius: px(24), border: `${px(4)}px solid #1a74e4`, boxShadow: '0 0 0 2px #0b3f8f', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: px(12), background: 'linear-gradient(180deg,#1479ec,#0b62cc)', padding: `${px(8)}px ${px(14)}px`, boxShadow: '0 3px 0 #0a4fa8', flex: 'none' }}>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: px(26) }}>Top Up</span>
          <button onClick={onClose} aria-label="Tutup" style={{ marginLeft: 'auto', width: px(52), height: px(46), borderRadius: px(12), border: 0, background: 'linear-gradient(180deg,#ee5a4a,#d0392b)', boxShadow: `0 ${px(3)}px 0 #a02a20`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
            <svg width={px(26)} height={px(26)} viewBox="0 0 24 24"><path d="M5 5l14 14M19 5L5 19" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" /></svg>
          </button>
        </div>

        <div className="kk-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: px(14) }}>
          <div style={{ display: 'flex', gap: px(12) }}>
            {(['gems', 'crystal'] as TopUpCurrency[]).map((c) => (
              <button key={c} onClick={() => { setCur(c); setMsg(''); }} style={tabBtn(c)}>
                {icon(c, px(30))}
                <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.05 }}>
                  <span>{THEME[c].name}</span>
                  <span style={{ fontSize: px(13), opacity: 0.9 }}>Saldo {idn(c === 'gems' ? gems : crystal)}</span>
                </span>
              </button>
            ))}
          </div>
          <div style={{ margin: `${px(10)}px 0 ${px(8)}px`, fontWeight: 700, fontSize: px(14), color: '#8a6d4a' }}>{t.use}</div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: px(12) }}>
            {PACKS[cur].map((pk, i) => (
              <div key={pk.id} style={{ position: 'relative', borderRadius: px(18), border: `${px(3)}px solid ${t.card}`, background: t.bg, boxShadow: `0 ${px(3)}px 0 ${t.card}`, padding: `${px(14)}px ${px(10)}px ${px(10)}px`, textAlign: 'center' }}>
                {pk.tag && <span style={{ position: 'absolute', top: px(-1), left: px(-1), background: t.grad, color: '#fff', fontWeight: 800, fontSize: px(12), padding: `${px(2)}px ${px(10)}px`, borderRadius: `${px(16)}px 0 ${px(10)}px 0`, textShadow: '0 1px 0 rgba(0,0,0,.3)' }}>{pk.tag}</span>}
                <div style={{ height: px(64), display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: px(8) }}>{icon(cur, px(40 + i * 5))}</div>
                <div style={{ fontWeight: 800, fontSize: px(26), lineHeight: 1.1, color: t.main }}>{idn(pk.amount)}</div>
                <div style={{ display: 'inline-block', marginTop: px(4), background: '#dff5e3', color: '#1f7a30', border: '1.5px solid #8bd89b', fontWeight: 800, fontSize: px(13), borderRadius: 99, padding: `${px(1)}px ${px(10)}px` }}>
                  +{idn(pk.bonus)} bonus · {Math.round((pk.bonus / pk.amount) * 100)}%
                </div>
                <div style={{ fontWeight: 700, fontSize: px(13), color: '#8a7a68', margin: `${px(4)}px 0 ${px(8)}px` }}>Total {idn(pk.amount + pk.bonus)}</div>
                <button
                  onClick={() => { onBuy ? onBuy(cur, pk.id, pk.amount, pk.bonus, pk.rupiah) : setMsg('Pembayaran Rupiah belum tersedia'); }}
                  style={{ width: '100%', border: 0, cursor: 'pointer', fontFamily: font, fontWeight: 800, fontSize: px(19), color: '#4a2f00', padding: `${px(7)}px 0`, borderRadius: px(10), background: 'linear-gradient(180deg,#ffd45a,#f5a623)', boxShadow: `0 ${px(3)}px 0 #b97a12` }}
                >
                  {rupiah(pk.rupiah)}
                </button>
              </div>
            ))}
          </div>
          {msg && <div style={{ marginTop: px(12), textAlign: 'center', fontWeight: 800, fontSize: px(15), color: '#b3402a' }}>{msg}</div>}
        </div>
      </div>
    </div>
  );
}
