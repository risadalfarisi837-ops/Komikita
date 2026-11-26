'use client';

import { useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { GACHA_DUPLICATE_REFUND, GACHA_ODDS, GACHA_PITY, GACHA_PRICE, GACHA_RODS, RARITY, RODS, formatNum } from '@/lib/fishing';
import type { Rod } from '@/lib/fishing';
import PixelRod from './RodArt';

export type ShopTab = 'toko' | 'gachagaya' | 'gacha' | 'gaya' | 'tas';

interface Props {
  px: (n: number) => number;
  font: string;
  crystal: number;
  rods: string[];
  equippedRod: string;
  tab: ShopTab;
  onTab: (t: ShopTab) => void;
  buying: string;
  pulling: boolean;
  onClose: () => void;
  onBuy: (id: string) => void;
  onEquip: (id: string) => void;
  onPull: (n: 1 | 5) => void;
  pity: number;
  starterClaimed: boolean;
  onClaimStarter: () => void;
}

const BROWN = '#5a3b1e';
const pct = (n: number) => n.toFixed(1).replace('.', ',') + '%';

// ---------- ikon piksel ----------
export function GemIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden style={{ flex: 'none' }}>
      <path d="M6 3h12l4 6-10 12L2 9z" fill="#35d08a" />
      <path d="M6 3h12l4 6H2z" fill="#7cf0b8" />
      <path d="M12 21L7.5 9h9z" fill="#1fa86a" />
      <path d="M6 3h12l4 6-10 12L2 9z" fill="none" stroke="#0f7a4a" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

// Batang joran piksel diagonal, warna mengikuti rarity
export function RodArt({ color, size }: { color: string; size: number }) {
  const px: ReactNode[] = [];
  for (let i = 0; i < 24; i++) {
    const x = 3 + i;
    const y = 27 - i;
    const handle = i < 6;
    const fill = handle ? (i % 2 ? '#4a3220' : '#5f4129') : color;
    px.push(<rect key={i} x={x} y={y} width="2" height="2" fill={fill} />);
    if (!handle) {
      px.push(<rect key={'s' + i} x={x} y={y + 2} width="2" height="1" fill="#00000040" />);
      if (i % 4 < 2) px.push(<rect key={'h' + i} x={x} y={y} width="1" height="1" fill="#ffffff80" />);
    }
    if (i === 10 || i === 15 || i === 20) px.push(<rect key={'g' + i} x={x - 1} y={y - 1} width="1.6" height="1.6" fill="#e9e9ee" />);
  }
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden shapeRendering="crispEdges" style={{ flex: 'none' }}>
      {px}
      <rect x="8" y="20" width="4" height="4" fill="#8c92a0" />
      <rect x="9" y="21" width="2" height="2" fill="#c9ced8" />
      <path d="M27 5 Q31 9 30 16" stroke="#e8f0ff" strokeWidth="0.9" fill="none" />
      <rect x="29" y="16" width="3" height="3" fill="#ff5a4d" />
    </svg>
  );
}

function Chest({ body, lid, size }: { body: string; lid: string; size: number }) {
  return (
    <svg width={size} height={size * 0.9} viewBox="0 0 32 29" aria-hidden shapeRendering="crispEdges" style={{ flex: 'none' }}>
      <rect x="3" y="12" width="26" height="15" fill={body} />
      <rect x="3" y="4" width="26" height="9" rx="2" fill={lid} />
      <rect x="3" y="12" width="26" height="2" fill="#00000033" />
      <rect x="5" y="4" width="4" height="23" fill="#f0b83a" />
      <rect x="23" y="4" width="4" height="23" fill="#f0b83a" />
      <rect x="5" y="4" width="1" height="23" fill="#ffe08a" />
      <rect x="23" y="4" width="1" height="23" fill="#ffe08a" />
      <rect x="14" y="11" width="4" height="6" fill="#f0b83a" />
      <rect x="15.4" y="12.6" width="1.2" height="2.6" fill="#3a2a1c" />
      <rect x="3" y="25" width="26" height="2" fill="#00000040" />
    </svg>
  );
}

export default function ShopScreen(p: Props) {
  const { px, font, crystal, rods, equippedRod, tab, onTab, buying, pulling } = p;
  const [odds, setOdds] = useState(false);

  const chip: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: px(3), background: '#eaf1ff', color: '#2459c9', fontWeight: 800, fontSize: px(12), borderRadius: 99, padding: `${px(2)}px ${px(8)}px`, whiteSpace: 'nowrap' };
  const Stats = ({ r }: { r: Rod }) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: px(4), justifyContent: 'center' }}>
      <span style={{ ...chip, background: '#fff1c4', color: '#a86b00' }}>⚡{r.power}</span>
      <span style={chip}>🍀+{Math.round(r.luck * 100)}%</span>
      <span style={chip}>💰+{Math.round(r.money * 100)}%</span>
      <span style={chip}>✨+{Math.round(r.xp * 100)}%</span>
    </div>
  );
  const Pill = ({ r }: { r: Rod }) => (
    <span style={{ display: 'inline-block', background: RARITY[r.rarity].color + '33', color: '#5a3b1e', border: `${px(1.5)}px solid ${RARITY[r.rarity].color}`, fontWeight: 800, fontSize: px(11), borderRadius: 99, padding: `0 ${px(9)}px` }}>{RARITY[r.rarity].label}</span>
  );
  const btn3d = (bg: string, edge: string, color: string): CSSProperties => ({
    border: 0, background: bg, boxShadow: `0 ${px(4)}px 0 ${edge}`, color, fontFamily: font, fontWeight: 800, borderRadius: px(14), cursor: 'pointer', padding: `${px(7)}px ${px(14)}px`,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: px(6),
  });
  const GREEN = btn3d('linear-gradient(180deg,#7ceab0,#4fd18c)', '#2ea36a', '#0b3b25');
  const GOLD = btn3d('linear-gradient(180deg,#ffd45a,#f5a623)', '#c47f10', '#4a2f00');
  const BLUE = btn3d('linear-gradient(180deg,#3b8cf0,#1f64cc)', '#164b9c', '#fff');

  const shopRods = RODS.filter((r) => !r.gachaOnly && r.price > 0);
  const feat = shopRods.filter((r) => !rods.includes(r.id)).sort((a, b) => a.price - b.price)[0];
  const gachaRods = GACHA_RODS;
  const monthly = RODS.find((r) => r.monthly);
  const leftMs = Math.max(0, new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).getTime() - Date.now());
  const leftD = Math.floor(leftMs / 86400000);
  const leftH = Math.floor((leftMs % 86400000) / 3600000);
  const ownedG = gachaRods.filter((r) => rods.includes(r.id)).length;
  const topG = [...gachaRods].sort((a, b) => (GACHA_ODDS[a.id] ?? 0) - (GACHA_ODDS[b.id] ?? 0));
  const rarest = topG[0];
  const legPct = gachaRods.filter((r) => r.rarity === rarest.rarity).reduce((s, r) => s + (GACHA_ODDS[r.id] ?? 0), 0);
  const topRar = RARITY[rarest.rarity];

  const rays = (a: string, b: string) => `repeating-conic-gradient(from 0deg at 50% 50%, ${a} 0 8deg, ${b} 8deg 16deg)`;

  const soon = (title: string, desc: string) => (
    <div style={{ borderRadius: px(22), border: `${px(3)}px solid #e6d4b0`, background: '#fffaf0', padding: `${px(36)}px ${px(20)}px`, textAlign: 'center', boxShadow: `0 ${px(3)}px 0 #e6d4b0` }}>
      <div style={{ fontSize: px(46) }}>🚧</div>
      <div style={{ fontSize: px(24), fontWeight: 800, marginTop: px(6) }}>{title}</div>
      <div style={{ fontSize: px(15), fontWeight: 700, color: '#8a6d4a', marginTop: px(6) }}>{desc}</div>
    </div>
  );

  const sideTab = (k: ShopTab, ico: string) => (
    <button key={k} onClick={() => onTab(k)} aria-label={k}
      style={{ width: px(68), height: px(58), borderRadius: px(16), border: 0, background: tab === k ? 'linear-gradient(180deg,#3b8cf0,#1f64cc)' : 'transparent', boxShadow: tab === k ? `0 ${px(4)}px 0 #164b9c` : 'none', fontSize: px(32), cursor: 'pointer', padding: 0 }}>{ico}</button>
  );

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 30, display: 'flex', flexDirection: 'column', background: '#fff5e1', fontFamily: font, color: BROWN }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: px(16), background: 'linear-gradient(180deg,#3d8ef2,#2069d2)', padding: `${px(10)}px ${px(18)}px`, boxShadow: `0 ${px(4)}px 0 #1559b8`, position: 'relative', zIndex: 2 }}>
        <span style={{ width: px(48), height: px(48), borderRadius: '50%', background: '#fff2d1', border: `${px(3)}px solid #fff`, boxShadow: '0 2px 0 rgba(0,0,60,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: px(26) }}>🛍️</span>
        <span style={{ color: '#fff', fontWeight: 800, fontSize: px(26), textShadow: '0 2px 0 rgba(0,0,60,0.35)' }}>Toko</span>
        <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: px(8), background: 'rgba(10,45,120,0.55)', color: '#fff', fontWeight: 800, fontSize: px(19), borderRadius: 99, padding: `${px(6)}px ${px(18)}px` }}>
          <GemIcon size={px(22)} />{formatNum(crystal)}
        </span>
        <button onClick={p.onClose} aria-label="Tutup" style={{ width: px(48), height: px(46), borderRadius: px(12), border: 0, background: '#e5484d', boxShadow: `0 ${px(4)}px 0 #a62a2f`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
          <svg width={px(26)} height={px(26)} viewBox="0 0 24 24"><path d="M5 5l14 14M19 5L5 19" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" /></svg>
        </button>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: px(14), padding: `${px(12)}px ${px(12)}px 0` }}>
        {/* sidebar */}
        <div style={{ width: px(84), flex: 'none', alignSelf: 'stretch', background: '#f5e8cf', borderRadius: `${px(28)}px ${px(28)}px 0 0`, padding: `${px(10)}px ${px(8)}px`, display: 'grid', alignContent: 'start', justifyItems: 'center', gap: px(8) }}>
          {sideTab('toko', '\u{1F3F7}\u{FE0F}')}
          {sideTab('gachagaya', '\u{1F381}')}
          {sideTab('gacha', '\u{1F3A3}')}
          {sideTab('gaya', '\u{1F455}')}
          {sideTab('tas', '\u{1F392}')}
        </div>

        <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', paddingBottom: px(18) }}>
          {tab === 'gachagaya' ? soon('Gacha Gaya', 'Gaya rambut dan aksesori punggung karakter segera hadir.') : tab === 'gaya' ? soon('Gaya', 'Ganti gaya karakter di sini setelah Gacha Gaya dibuka.') : tab === 'tas' ? soon('Tas', 'Upgrade ransel dan umpan segera hadir.') : tab === 'toko' ? (
            <div>
              {monthly && (
                <div style={{ display: 'flex', alignItems: 'stretch', borderRadius: px(22), border: `${px(3)}px solid #7b9be8`, background: '#fff9ea', overflow: 'hidden', boxShadow: `0 ${px(4)}px 0 #d6c9ad` }}>
                  <div style={{ width: px(126), flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `radial-gradient(circle at 50% 50%, #d9e0f2 0 24%, transparent 25%), ${rays('#34507e', '#28406a')}` }}>
                    <PixelRod id={monthly.id} size={px(86)} animate />
                  </div>
                  <div style={{ flex: 1, minWidth: 0, padding: `${px(10)}px ${px(14)}px`, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: px(6) }}>
                    <div style={{ color: '#c98d12', fontWeight: 800, fontSize: px(14) }}>Joran Bulanan · sisa {leftD} hari {leftH} jam</div>
                    <div style={{ color: '#2b2a52', fontWeight: 700, fontSize: px(24), lineHeight: 1.1 }}>{monthly.name}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: px(6) }}>
                      <span style={{ ...chip, background: '#fff1c4', color: '#a86b00', fontSize: px(14) }}>⚡{monthly.power}</span>
                      <span style={{ ...chip, fontSize: px(14) }}>🍀+{Math.round(monthly.luck * 100)}%</span>
                      <span style={{ ...chip, fontSize: px(14) }}>💰+{Math.round(monthly.money * 100)}%</span>
                      <span style={{ ...chip, fontSize: px(14) }}>✨+{Math.round(monthly.xp * 100)}%</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', padding: `0 ${px(16)}px` }}>
                    {equippedRod === monthly.id ? (
                      <div style={{ background: '#e1f5e6', border: `${px(2.5)}px solid #9ad8ae`, color: '#1f7a3c', fontWeight: 800, fontSize: px(17), borderRadius: px(12), padding: `${px(8)}px ${px(16)}px` }}>✓ Dipakai</div>
                    ) : rods.includes(monthly.id) ? (
                      <button onClick={() => p.onEquip(monthly.id)} style={{ ...BLUE, fontSize: px(20), padding: `${px(10)}px ${px(22)}px` }}>Pakai</button>
                    ) : (
                      <button onClick={() => p.onBuy(monthly.id)} disabled={buying === monthly.id} style={{ ...GOLD, fontSize: px(22), padding: `${px(12)}px ${px(22)}px`, opacity: buying === monthly.id ? 0.6 : 1 }}>
                        <GemIcon size={px(24)} />{formatNum(monthly.price)}
                      </button>
                    )}
                  </div>
                </div>
              )}
              <div style={{ fontSize: px(18), fontWeight: 800, margin: `${px(12)}px 0 ${px(8)}px` }}>Paket terbatas</div>
              <div style={{ width: px(260), borderRadius: px(20), border: `${px(3)}px solid #e6d4b0`, background: '#fffaf0', overflow: 'hidden', boxShadow: `0 ${px(3)}px 0 #e6d4b0` }}>
                <div style={{ background: 'linear-gradient(90deg,#1f64cc,#3b8cf0)', color: '#fff', fontWeight: 800, fontSize: px(18), padding: `${px(4)}px ${px(14)}px` }}>Paket Pemula</div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: px(12), padding: `${px(14)}px 0 ${px(2)}px` }}>
                  <span style={{ position: 'relative', width: px(60), height: px(60), borderRadius: px(14), background: '#f5ecd9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <GemIcon size={px(36)} />
                    <span style={{ position: 'absolute', right: px(-6), bottom: px(-6), background: '#7b7b8a', color: '#fff', fontWeight: 800, fontSize: px(12), borderRadius: 99, padding: `0 ${px(7)}px` }}>600</span>
                  </span>
                  <span style={{ position: 'relative', width: px(60), height: px(60), borderRadius: px(14), background: '#f5ecd9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <PixelRod id="fiber" size={px(48)} />
                    <span style={{ position: 'absolute', right: px(-6), bottom: px(-6), background: '#7b7b8a', color: '#fff', fontWeight: 800, fontSize: px(12), borderRadius: 99, padding: `0 ${px(7)}px` }}>1</span>
                  </span>
                </div>
                <div style={{ textAlign: 'center', fontWeight: 800, fontSize: px(14), color: '#8a6d4a', marginTop: px(8) }}>Crystal + Joran Fiber · sekali per akun</div>
                <div style={{ padding: px(10) }}>
                  {p.starterClaimed ? (
                    <div style={{ textAlign: 'center', background: '#e1f5e6', border: `${px(2.5)}px solid #9ad8ae`, color: '#1f7a3c', fontWeight: 800, fontSize: px(17), borderRadius: px(14), padding: `${px(8)}px 0` }}>✓ Sudah diambil</div>
                  ) : (
                    <button onClick={p.onClaimStarter} style={{ ...GREEN, width: '100%', fontSize: px(17) }}>Ambil gratis</button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', borderRadius: px(22), border: `${px(3)}px solid #e6d4b0`, overflow: 'hidden', background: '#fffaf0', boxShadow: `0 ${px(3)}px 0 #e6d4b0` }}>
                <div style={{ flex: '1 1 58%', minHeight: px(228), position: 'relative', background: `radial-gradient(circle at 50% 45%, #5a2a8a 0, #2a0f4a 75%), ${rays('#ffffff12', 'transparent')}`, backgroundBlendMode: 'screen', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: `${px(14)}px ${px(18)}px` }}>
                  <div style={{ position: 'absolute', inset: 0, background: rays('rgba(255,255,255,0.08)', 'rgba(255,255,255,0)') }} />
                  {[topG[1] ?? rarest, rarest].map((r, i) => (
                    <div key={r.id + i} style={{ position: 'relative', width: '31%', textAlign: 'center', color: '#fff' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: px(4) }}><PixelRod id={r.id} size={px(i === 1 ? 92 : 80)} animate /></div>
                      <div style={{ fontWeight: 800, fontSize: px(14), lineHeight: 1.1, textShadow: '0 2px 3px rgba(0,0,0,.7)' }}>{r.name}</div>
                      <div style={{ fontWeight: 800, fontSize: px(13), color: RARITY[r.rarity].color }}>{RARITY[r.rarity].label}</div>
                    </div>
                  ))}
                  <div style={{ position: 'absolute', left: '50%', top: px(14), transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: px(6) }}>
                    <Chest body="#9a3fc0" lid="#b455de" size={px(100)} />
                    <span style={{ background: topRar.color, color: '#2a0a14', fontWeight: 800, fontSize: px(15), borderRadius: 99, padding: `${px(3)}px ${px(16)}px`, boxShadow: '0 3px 0 rgba(0,0,0,.25)', whiteSpace: 'nowrap' }}>{topRar.label} · {pct(gachaRods.filter((r) => r.rarity === rarest.rarity).reduce((a, r) => a + (GACHA_ODDS[r.id] ?? 0), 0))}</span>
                  </div>
                </div>
                <div style={{ flex: '1 1 42%', padding: `${px(14)}px ${px(16)}px`, display: 'flex', flexDirection: 'column', gap: px(8), justifyContent: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: px(8) }}>
                    <div style={{ fontSize: px(28), fontWeight: 800 }}>Gacha Rod</div>
                    <button onClick={() => setOdds(true)} style={{ background: '#fffaf0', border: `${px(3)}px solid #e6d4b0`, boxShadow: `0 ${px(3)}px 0 #e6d4b0`, color: BROWN, fontFamily: font, fontWeight: 800, fontSize: px(14), borderRadius: 99, padding: `${px(5)}px ${px(14)}px`, cursor: 'pointer', whiteSpace: 'nowrap' }}>Lihat peluang</button>
                  </div>
                  <div style={{ fontSize: px(16), fontWeight: 700, color: '#7a5c36' }}>Joran <b style={{ color: '#7a3fd0' }}>Epic</b> dijamin dalam <b style={{ color: '#7a3fd0', fontSize: px(22) }}>{Math.max(1, GACHA_PITY - p.pity)}</b> peti</div>
                  <div style={{ height: px(14), borderRadius: 99, background: '#eadfc9', overflow: 'hidden' }}>
                    <div style={{ width: Math.min(100, (p.pity / GACHA_PITY) * 100) + '%', height: '100%', background: 'linear-gradient(90deg,#a66cf0,#7a3fd0)', borderRadius: 99 }} />
                  </div>
                  <div style={{ display: 'flex', gap: px(10) }}>
                    <button onClick={() => p.onPull(1)} disabled={pulling} style={{ ...BLUE, flex: 1, flexDirection: 'column', gap: px(2), padding: `${px(8)}px 0`, opacity: pulling ? 0.6 : 1 }}>
                      <span style={{ fontSize: px(16) }}>Buka 1×</span>
                      <span style={{ fontSize: px(22), display: 'inline-flex', alignItems: 'center', gap: px(6) }}><GemIcon size={px(22)} />{formatNum(GACHA_PRICE)}</span>
                    </button>
                    <button onClick={() => p.onPull(5)} disabled={pulling} style={{ ...GOLD, flex: 1, flexDirection: 'column', gap: px(2), padding: `${px(8)}px 0`, opacity: pulling ? 0.6 : 1 }}>
                      <span style={{ fontSize: px(16) }}>Buka 5×</span>
                      <span style={{ fontSize: px(22), display: 'inline-flex', alignItems: 'center', gap: px(6) }}><GemIcon size={px(22)} />{formatNum(GACHA_PRICE * 5)}</span>
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ fontSize: px(22), fontWeight: 800, margin: `${px(14)}px 0 ${px(4)}px` }}>Peluang joran · {ownedG}/{gachaRods.length} dimiliki</div>
              {(['mythic', 'legendary', 'epic', 'rare', 'uncommon', 'common'] as const).map((rk) => {
                const list = gachaRods.filter((r) => r.rarity === rk);
                if (!list.length) return null;
                const rc = RARITY[rk].color;
                const tot = list.reduce((s, r) => s + (GACHA_ODDS[r.id] ?? 0), 0);
                return (
                  <div key={rk}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: px(10), margin: `${px(8)}px 0 ${px(8)}px` }}>
                      <span style={{ color: rc, fontWeight: 800, fontSize: px(20), WebkitTextStroke: `${px(0.7)}px rgba(90,59,30,.6)` }}>{RARITY[rk].label}</span>
                      <span style={{ fontWeight: 800, fontSize: px(18) }}>{pct(tot)}</span>
                      <span style={{ color: '#8a6d4a', fontWeight: 700, fontSize: px(15) }}>{list.length} joran</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${px(128)}px, 1fr))`, gap: px(12) }}>
                      {list.map((r) => {
                        const owned = rods.includes(r.id);
                        const o = GACHA_ODDS[r.id] ?? 0;
                        return (
                          <div key={r.id} style={{ position: 'relative', borderRadius: px(18), border: `${px(3)}px solid ${rc}`, background: owned ? '#fffaf0' : '#f0e5cf', boxShadow: `0 ${px(3)}px 0 ${rc}66`, textAlign: 'center', padding: `${px(10)}px ${px(6)}px ${px(8)}px` }}>
                            <div style={{ opacity: owned ? 1 : 0.5, filter: owned ? 'none' : 'grayscale(.5)', display: 'flex', justifyContent: 'center' }}><PixelRod id={r.id} size={px(70)} animate={owned} /></div>
                            <div style={{ fontSize: px(14), fontWeight: 800, lineHeight: 1.1, marginTop: px(2) }}>{r.name}</div>
                            <div style={{ fontSize: px(12), fontWeight: 800, color: '#8a6d4a' }}>{pct(o)} · 1 dari {formatNum(Math.round(100 / Math.max(o, 0.01)))}</div>
                            <div style={{ marginTop: px(5) }}><Stats r={r} /></div>
                            {!owned && <span style={{ position: 'absolute', right: px(6), top: px(4), fontSize: px(16) }}>🔒</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* daftar peluang */}
      {odds && (
        <div onClick={() => setOdds(false)} style={{ position: 'absolute', inset: 0, zIndex: 5, background: 'rgba(40,20,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: px(14) }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: px(420), maxWidth: '100%', maxHeight: '100%', overflowY: 'auto', borderRadius: px(22), border: `${px(4)}px solid #e6d4b0`, background: '#fff5e1', padding: px(16), boxShadow: `0 ${px(6)}px 0 #d9c7a4` }}>
            <div style={{ fontSize: px(24), fontWeight: 800, textAlign: 'center' }}>Peluang Gacha Rod</div>
            <div style={{ fontSize: px(13), fontWeight: 700, color: '#8a6d4a', textAlign: 'center', margin: `${px(2)}px 0 ${px(10)}px` }}>Satu pembukaan = {formatNum(GACHA_PRICE)} Crystal. Legendary total {pct(legPct)}.</div>
            {[...gachaRods].sort((a, b) => (GACHA_ODDS[b.id] ?? 0) - (GACHA_ODDS[a.id] ?? 0)).map((r) => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: px(10), padding: `${px(7)}px 0`, borderTop: '1px solid #e6d4b0' }}>
                <PixelRod id={r.id} size={px(42)} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: px(16) }}>{r.name}</div>
                  <Pill r={r} />
                </div>
                <div style={{ fontWeight: 800, fontSize: px(18) }}>{pct(GACHA_ODDS[r.id] ?? 0)}</div>
              </div>
            ))}
            <button onClick={() => setOdds(false)} style={{ ...BLUE, width: '100%', marginTop: px(12), fontSize: px(17) }}>Tutup</button>
          </div>
        </div>
      )}
    </div>
  );
}
