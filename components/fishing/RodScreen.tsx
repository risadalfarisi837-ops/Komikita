'use client';

import { useEffect, useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { RARITY, RODS, ROD_MAX_LV, clampRodLv, formatNum, rodAt, rodUpgradeCost } from '@/lib/fishing';
import type { Rarity, Rod } from '@/lib/fishing';
import { GemIcon } from './Shop';
import RodArt from './RodArt';
import { ROD_SKINS } from './art';

interface Props {
  px: (n: number) => number;
  font: string;
  crystal: number;
  rods: string[];
  rodLv: Record<string, number>;
  equippedRod: string;
  buying: string;
  upgrading: string;
  onClose: () => void;
  onBuy: (id: string) => void;
  onEquip: (id: string) => void;
  onUpgrade: (id: string) => void;
}

const BROWN = '#5a3b1e';
const RARITY_ORDER: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];

// ---------- ikon statistik (piksel kecil, sama gayanya dengan HUD) ----------
const CloverI = ({ s }: { s: number }) => (
  <svg width={s} height={s} viewBox="0 0 16 16" style={{ flex: 'none' }}><g fill="#2fae4f" stroke="rgba(0,0,0,0.3)" strokeWidth="0.8"><rect x="1" y="5" width="6" height="6" rx="2" /><rect x="9" y="5" width="6" height="6" rx="2" /><rect x="5" y="1" width="6" height="6" rx="2" /><rect x="5" y="9" width="6" height="6" rx="2" /></g></svg>
);
const CoinI = ({ s }: { s: number }) => (
  <svg width={s} height={s} viewBox="0 0 16 16" style={{ flex: 'none' }}><circle cx="8" cy="8" r="6.5" fill="#f5c451" stroke="#9a6a10" strokeWidth="1.4" /><path d="M8 4.5v7M6 6.6c0-1 4-1 4 0s-4 1.2-4 2.6 4 1.1 4 0" stroke="#9a6a10" strokeWidth="1.2" fill="none" strokeLinecap="round" /></svg>
);
const XpI = ({ s }: { s: number }) => (
  <svg width={s * 1.3} height={s} viewBox="0 0 26 20" style={{ flex: 'none' }}><rect x="1" y="2" width="24" height="16" rx="3" fill="#3b7fe0" stroke="#9cc4ff" strokeWidth="1.4" /><text x="13" y="14.2" textAnchor="middle" fontSize="10" fontWeight="800" fill="#fff" fontFamily="system-ui, sans-serif">XP</text></svg>
);
const BoltI = ({ s }: { s: number }) => (
  <svg width={s} height={s} viewBox="0 0 16 16" style={{ flex: 'none' }}><path d="M9.5 1L3 9h4l-1 6 7-8.5H9z" fill="#f5a623" stroke="#a86b00" strokeWidth="1" strokeLinejoin="round" /></svg>
);

// Julukan efek khas tiap joran (sama dengan yang terlihat di tangan karakter)
const FX_LABEL: Record<string, string> = {
  default: 'Serat kayu',
  fiber: 'Garis fiber',
  karbon: 'Anyaman karbon',
  perak: 'Kilau berjalan',
  emas: 'Permata & kilau emas',
  kristal: 'Kristal berkedip',
  bulan: 'Bulan & bintang',
  naga: 'Kepala naga & api',
  sisik: 'Sisik naga & api',
  tentakel: 'Tentakel bercahaya',
};
const RARITY_GLOW: Record<Rarity, number> = { common: 0, uncommon: 0, rare: 1, epic: 2, legendary: 3, mythic: 4, divine: 4, secret: 4 };

const rays = (a: string, b: string) => `repeating-conic-gradient(from 0deg at 50% 50%, ${a} 0 8deg, ${b} 8deg 16deg)`;

export default function RodScreen(p: Props) {
  const { px, font, crystal, rods, rodLv, equippedRod, buying, upgrading } = p;
  const list = RODS.filter((r) => !r.gachaOnly || rods.includes(r.id));
  const rowRef = useRef<HTMLDivElement>(null);

  // buka langsung di joran yang sedang dipakai
  useEffect(() => {
    const box = rowRef.current;
    const el = box?.querySelector<HTMLElement>('[data-eq="1"]');
    if (box && el) box.scrollLeft = Math.max(0, el.offsetLeft - (box.clientWidth - el.offsetWidth) / 2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const btn3d = (bg: string, edge: string, color: string): CSSProperties => ({
    border: 0, background: bg, boxShadow: `0 ${px(4)}px 0 ${edge}`, color, fontFamily: font, fontWeight: 800, borderRadius: px(14), cursor: 'pointer',
    padding: `${px(9)}px ${px(8)}px`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: px(5), fontSize: px(17), whiteSpace: 'nowrap',
  });
  const BLUE = btn3d('linear-gradient(180deg,#3b8cf0,#1f64cc)', '#164b9c', '#fff');
  const TEAL = btn3d('linear-gradient(180deg,#3fb7c6,#2a9aa8)', '#1d7480', '#fff');
  const GREEN = btn3d('linear-gradient(180deg,#7ceab0,#4fd18c)', '#2ea36a', '#0b3b25');

  const StatRow = ({ icon, value, label, frac, c1, c2 }: { icon: ReactNode; value: string; label: string; frac: number; c1: string; c2: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: px(8), minHeight: px(26) }} aria-label={label}>
      <span style={{ width: px(30), display: 'flex', justifyContent: 'center', flex: 'none' }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0, height: px(11), borderRadius: 99, background: '#f5e5c4', overflow: 'hidden' }}>
        <div style={{ width: Math.min(100, Math.max(0, frac * 100)) + '%', height: '100%', borderRadius: 99, background: `linear-gradient(180deg,${c1},${c2})`, minWidth: frac > 0 ? px(8) : 0 }} />
      </div>
      <span style={{ width: px(58), textAlign: 'right', fontWeight: 800, fontSize: px(18), color: value === '0' || value === '+0%' ? '#a89270' : '#7a5c36' }}>{value}</span>
    </div>
  );

  // Skala bar = nilai tertinggi di semua joran (Lv maks), supaya beda antar joran kelihatan
  const top = RODS.reduce((m, r) => { const x = rodAt(r, ROD_MAX_LV); return { luck: Math.max(m.luck, x.luck), money: Math.max(m.money, x.money), xp: Math.max(m.xp, x.xp) }; }, { luck: 0.01, money: 0.01, xp: 0.01 });
  const maxPower = Math.max(...RODS.map((r) => r.power));

  const card = (r: Rod) => {
    const owned = rods.includes(r.id);
    const equipped = equippedRod === r.id;
    const lv = clampRodLv(rodLv[r.id]);
    const e = rodAt(r, owned ? lv : 1);
    const rar = RARITY[r.rarity];
    const sk = ROD_SKINS[r.id] || ROD_SKINS.default;
    const glowLv = RARITY_GLOW[r.rarity];
    const aura = sk.glow || rar.color;
    const stars = RARITY_ORDER.indexOf(r.rarity) + 1;
    const maxed = lv >= ROD_MAX_LV;
    const cost = rodUpgradeCost(r, lv);
    const canPay = crystal >= cost;
    const pct = (n: number) => '+' + Math.round(n * 100) + '%';
    return (
      <div key={r.id} data-eq={equipped ? '1' : '0'} style={{ flex: `0 0 ${px(290)}px`, boxSizing: 'border-box', scrollSnapAlign: 'center', display: 'flex', flexDirection: 'column', gap: px(8), borderRadius: px(22), border: `${px(3)}px solid ${equipped ? '#4fd18c' : glowLv ? rar.color : '#e6d4b0'}`, background: owned ? `linear-gradient(180deg, ${glowLv ? rar.color + '30' : '#fff8e6'} 0, #fffdf7 38%)` : '#f3ead7', boxShadow: `0 ${px(4)}px 0 ${equipped ? '#2ea36a66' : glowLv ? rar.color + '99' : '#e6d4b0'}${glowLv && owned ? `, 0 0 ${px(8 + glowLv * 5)}px ${aura}66` : ''}`, padding: px(12), animation: glowLv >= 3 && owned ? 'rodPulse 2.4s ease-in-out infinite' : undefined }}>
        <div style={{ display: 'flex', gap: px(10), alignItems: 'flex-start', minHeight: px(100) }}>
          <div style={{ width: px(92), height: px(92), flex: 'none', position: 'relative', borderRadius: px(18), border: `${px(3)}px solid ${glowLv ? rar.color : '#f3e3bd'}`, background: `radial-gradient(circle at 50% 55%, ${aura}66, transparent 70%), ${rays(rar.color + '55', rar.color + '22')}, #bfe6ee`, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: owned ? 1 : 0.55, filter: owned ? 'none' : 'grayscale(.6)', overflow: 'hidden' }}>
            <RodArt id={r.id} size={px(84)} animate />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: px(21), fontWeight: 800, lineHeight: 1.1 }}>{r.name}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: px(6), marginTop: px(5), flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: px(3), background: '#fff1c4', border: `${px(2)}px solid #f2cf6a`, color: '#a86b00', fontWeight: 800, fontSize: px(15), borderRadius: 99, padding: `0 ${px(9)}px` }}><BoltI s={px(14)} />{r.power}</span>
              <span style={{ background: rar.color + '55', border: `${px(1.5)}px solid ${rar.color}`, color: BROWN, fontWeight: 800, fontSize: px(12), borderRadius: 99, padding: `0 ${px(8)}px` }}>{rar.label}</span>
            </div>
            <div style={{ marginTop: px(3), fontSize: px(17), letterSpacing: px(1), color: '#f2a516', lineHeight: 1 }} aria-label={`${stars} bintang`}>{'★'.repeat(stars)}</div>
            <div style={{ marginTop: px(4), fontSize: px(13), fontWeight: 800, color: BROWN, opacity: 0.75, display: 'flex', alignItems: 'center', gap: px(4) }}><span style={{ width: px(8), height: px(8), borderRadius: '50%', background: aura, boxShadow: `0 0 ${px(5)}px ${aura}`, flex: 'none' }} />{FX_LABEL[r.id] || 'Biasa'}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gap: px(2), opacity: owned ? 1 : 0.7 }}>
          <StatRow icon={<CloverI s={px(20)} />} label="Hoki" value={pct(e.luck)} frac={e.luck / top.luck} c1="#7be08f" c2="#2fae4f" />
          <StatRow icon={<CoinI s={px(20)} />} label="Harga jual" value={pct(e.money)} frac={e.money / top.money} c1="#ffd869" c2="#e29a12" />
          <StatRow icon={<XpI s={px(16)} />} label="XP" value={pct(e.xp)} frac={e.xp / top.xp} c1="#6fb2ff" c2="#2a6fe0" />
          <StatRow icon={<BoltI s={px(20)} />} label="Kekuatan tarik" value={String(r.power)} frac={r.power / maxPower} c1="#ffb84d" c2="#e8710a" />
        </div>

        <div style={{ marginTop: 'auto', display: 'flex', gap: px(8), alignItems: 'stretch' }}>
          {owned ? (
            <>
              {maxed ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: px(14), background: '#fff1c4', border: `${px(2.5)}px solid #f2cf6a`, color: '#a86b00', fontWeight: 800, fontSize: px(16) }}>Lv {lv} · Maks</div>
              ) : (
                <button onClick={() => p.onUpgrade(r.id)} disabled={upgrading === r.id} aria-label={`Upgrade ${r.name}`} style={{ ...BLUE, flex: 1.25, opacity: upgrading === r.id ? 0.6 : canPay ? 1 : 0.55 }}>
                  <span>↑ Lv {lv}</span><span>·</span><GemIcon size={px(18)} /><span>{formatNum(cost)}</span>
                </button>
              )}
              {equipped ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: px(14), background: '#e1f5e6', border: `${px(2.5)}px solid #9ad8ae`, color: '#1f7a3c', fontWeight: 800, fontSize: px(16) }}>✓ Dipakai</div>
              ) : (
                <button onClick={() => p.onEquip(r.id)} style={{ ...TEAL, flex: 1 }}>Pakai</button>
              )}
            </>
          ) : r.price > 0 ? (
            <button onClick={() => p.onBuy(r.id)} disabled={buying === r.id} style={{ ...GREEN, flex: 1, opacity: buying === r.id ? 0.6 : crystal >= r.price ? 1 : 0.55 }}>
              <GemIcon size={px(20)} />{formatNum(r.price)}
            </button>
          ) : (
            <div style={{ flex: 1, textAlign: 'center', color: '#9a8a6a', fontWeight: 800, fontSize: px(15), padding: `${px(9)}px 0` }}>Belum dimiliki</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 30, display: 'flex', flexDirection: 'column', background: '#fff5e1', fontFamily: font, color: BROWN }}>
      <style>{`@keyframes rodPulse{0%,100%{filter:brightness(1)}50%{filter:brightness(1.08) saturate(1.15)}}`}</style>
      <div style={{ display: 'flex', alignItems: 'center', gap: px(16), background: 'linear-gradient(180deg,#3d8ef2,#2069d2)', padding: `${px(10)}px ${px(18)}px`, boxShadow: `0 ${px(4)}px 0 #1559b8`, position: 'relative', zIndex: 2 }}>
        <span style={{ width: px(48), height: px(48), borderRadius: '50%', background: '#fff2d1', border: `${px(3)}px solid #fff`, boxShadow: '0 2px 0 rgba(0,0,60,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: px(26) }}>🎣</span>
        <span style={{ color: '#fff', fontWeight: 800, fontSize: px(26), textShadow: '0 2px 0 rgba(0,0,60,0.35)' }}>Joran</span>
        <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: px(8), background: 'rgba(10,45,120,0.55)', color: '#fff', fontWeight: 800, fontSize: px(19), borderRadius: 99, padding: `${px(6)}px ${px(18)}px` }}>
          <GemIcon size={px(22)} />{formatNum(crystal)}
        </span>
        <button onClick={p.onClose} aria-label="Tutup" style={{ width: px(48), height: px(46), borderRadius: px(12), border: 0, background: '#e5484d', boxShadow: `0 ${px(4)}px 0 #a62a2f`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
          <svg width={px(26)} height={px(26)} viewBox="0 0 24 24"><path d="M5 5l14 14M19 5L5 19" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" /></svg>
        </button>
      </div>

      <div ref={rowRef} style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', gap: px(14), alignItems: 'stretch', overflowX: 'auto', overflowY: 'hidden', scrollSnapType: 'x proximity', WebkitOverflowScrolling: 'touch', padding: `${px(14)}px ${px(14)}px ${px(18)}px` }}>
        {list.map(card)}
      </div>
    </div>
  );
}
