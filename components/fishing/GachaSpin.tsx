'use client';

// Animasi buka Gacha joran: peti bergetar -> tutup terbuka + sinar -> (putaran slot untuk 1x) -> ledakan cahaya -> kartu hasil.
// Mendukung buka 1x dan 5x. Ketuk layar sebelum hasil muncul untuk melewati animasi.
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { GACHA_DUPLICATE_REFUND, GACHA_RODS, RARITY, RODS, formatNum, rodEase } from '@/lib/fishing';
import type { Rarity, Rod } from '@/lib/fishing';
import RodArt from './RodArt';

type Stage = 'shake' | 'open' | 'spin' | 'burst' | 'reveal';
export interface GachaItem { rod: Rod; duplicate: boolean }

const ORDER: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
const PARTICLES: Record<string, number> = { common: 0, uncommon: 0, rare: 7, epic: 13, legendary: 22, mythic: 32 };
const CHEST = { body: '#9a3fc0', lid: '#b455de', band: '#f0b83a', bandL: '#ffe08a' };

function ChestArt({ size, open, glow }: { size: number; open: boolean; glow: string }) {
  return (
    <svg width={size} height={size * 0.9} viewBox="0 0 32 29" aria-hidden shapeRendering="crispEdges" style={{ flex: 'none', overflow: 'visible' }}>
      <rect x="3" y="12" width="26" height="15" fill={CHEST.body} />
      {open && <rect x="4" y="12" width="24" height="3" fill={glow} />}
      <rect x="3" y="12" width="26" height="2" fill="#00000033" />
      <rect x="5" y="12" width="4" height="15" fill={CHEST.band} />
      <rect x="23" y="12" width="4" height="15" fill={CHEST.band} />
      <rect x="5" y="12" width="1" height="15" fill={CHEST.bandL} />
      <rect x="23" y="12" width="1" height="15" fill={CHEST.bandL} />
      <rect x="14" y="11" width="4" height="6" fill={CHEST.band} />
      <rect x="15.4" y="12.6" width="1.2" height="2.6" fill="#3a2a1c" />
      <rect x="3" y="25" width="26" height="2" fill="#00000040" />
      <g style={{ transformBox: 'fill-box', transformOrigin: '50% 100%', animation: open ? 'gsLid .55s cubic-bezier(.2,1.7,.4,1) forwards' : 'none' }}>
        <rect x="3" y="4" width="26" height="9" rx="2" fill={CHEST.lid} />
        <rect x="3" y="4" width="26" height="2" rx="1" fill="#ffffff30" />
        <rect x="5" y="4" width="4" height="9" fill={CHEST.band} />
        <rect x="23" y="4" width="4" height="9" fill={CHEST.band} />
        <rect x="5" y="4" width="1" height="9" fill={CHEST.bandL} />
        <rect x="23" y="4" width="1" height="9" fill={CHEST.bandL} />
        <rect x="3" y="11" width="26" height="2" fill="#00000033" />
      </g>
    </svg>
  );
}

export default function GachaSpin({ items, px, font, onClose }: {
  items: GachaItem[]; px: (n: number) => number; font: string; onClose: () => void;
}) {
  const single = items.length === 1;
  const best = useMemo(() => items.reduce((b, it) => (ORDER.indexOf(it.rod.rarity) > ORDER.indexOf(b.rod.rarity) ? it : b), items[0]), [items]);
  const rod = best.rod;
  const finalCol = RARITY[rod.rarity].color;
  const isTop = rod.rarity === 'legendary' || rod.rarity === 'mythic';

  const [stage, setStage] = useState<Stage>('shake');
  const [shown, setShown] = useState<string>(GACHA_RODS[0].id);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const ids: number[] = [];
    const T = (fn: () => void, ms: number) => ids.push(window.setTimeout(fn, ms));
    T(() => setStage('open'), 1050);
    if (single) {
      // putaran slot: acak, makin lama makin pelan, berhenti tepat di joran hasil
      const pool = GACHA_RODS.map((r) => r.id);
      const seq: string[] = [];
      let last = '';
      for (let i = 0; i < 16; i++) {
        let pick = pool[Math.floor(Math.random() * pool.length)];
        while (pick === last) pick = pool[Math.floor(Math.random() * pool.length)];
        seq.push(pick);
        last = pick;
      }
      seq.push(rod.id);
      let at = 1750;
      T(() => setStage('spin'), at);
      seq.forEach((id, i) => {
        at += 55 + Math.pow(i / (seq.length - 1), 2.4) * 300;
        T(() => setShown(id), at);
      });
      T(() => setStage('burst'), at + 420);
      T(() => setStage('reveal'), at + 420 + 650);
    } else {
      T(() => setStage('burst'), 1800);
      T(() => setStage('reveal'), 1800 + 650);
    }
    timers.current = ids;
    return () => ids.forEach((t) => clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const skip = () => {
    if (stage === 'reveal' || stage === 'burst') return;
    timers.current.forEach((t) => clearTimeout(t));
    setShown(rod.id);
    setStage('reveal');
  };

  const cur = RODS.find((r) => r.id === shown) || rod;
  const col = stage === 'shake' || stage === 'open' ? '#b455de' : stage === 'spin' ? RARITY[cur.rarity].color : finalCol;
  const cy = '46%';

  const rays = (c: string, size: number, dur: number): CSSProperties => ({
    position: 'absolute', left: '50%', top: cy, width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2, borderRadius: '50%',
    background: `repeating-conic-gradient(from 0deg, ${c}40 0deg 7deg, transparent 7deg 22deg)`,
    WebkitMaskImage: 'radial-gradient(circle, #000 0%, transparent 62%)', maskImage: 'radial-gradient(circle, #000 0%, transparent 62%)',
    animation: `gsRays ${dur}s linear infinite`, pointerEvents: 'none',
  });

  const orb = (size: number, c: string, shake: boolean): CSSProperties => ({
    position: 'relative', width: size, height: size, borderRadius: '50%', border: `${px(4)}px solid ${c}`,
    background: `radial-gradient(circle at 50% 40%, ${c}44, #0b1222 72%)`, boxShadow: `0 0 ${px(42)}px ${c}aa, inset 0 0 ${px(22)}px ${c}55`,
    display: 'flex', alignItems: 'center', justifyContent: 'center', animation: shake ? 'gsShake .18s linear infinite' : 'gsBreath 2.2s ease-in-out infinite',
  });

  const stat = (t: string): ReactNode => (
    <span style={{ background: 'rgba(255,255,255,0.09)', borderRadius: 99, padding: `${px(3)}px ${px(9)}px`, fontSize: px(12), fontWeight: 700 }}>{t}</span>
  );

  const n = PARTICLES[rod.rarity] || 0;
  const sparks = Array.from({ length: n }, (_, i) => {
    const a = (i * 137.5) % 360;
    const r = 34 + ((i * 53) % 40);
    const x = 50 + Math.cos((a * Math.PI) / 180) * r;
    const y = 46 + Math.sin((a * Math.PI) / 180) * r * 0.9;
    return { x, y, d: (i * 0.37) % 2.6, s: px(3 + (i % 3) * 2), w: i % 3 === 0 };
  });

  const topBorder = 'linear-gradient(180deg,#14233f,#0b1426) padding-box, linear-gradient(90deg,#fcd34d,#f472b6,#7dd3fc,#fcd34d) border-box';
  const refundTotal = items.filter((i) => i.duplicate).length * GACHA_DUPLICATE_REFUND;
  const chestSize = px(150);

  return (
    <div onClick={stage === 'reveal' ? undefined : skip} style={{ position: 'absolute', inset: 0, zIndex: 40, overflow: 'hidden', background: 'radial-gradient(circle at 50% 46%, #1b2a4d 0%, #0a1020 72%)', fontFamily: font }}>
      <style>{`
        @keyframes gsRays{to{transform:rotate(360deg)}}
        @keyframes gsBreath{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}
        @keyframes gsShake{0%{transform:translate(0,0)}25%{transform:translate(${px(2)}px,${px(-1)}px)}50%{transform:translate(${px(-2)}px,${px(1)}px)}75%{transform:translate(${px(1)}px,${px(2)}px)}100%{transform:translate(0,0)}}
        @keyframes gsRing{0%{transform:scale(1);opacity:.95}100%{transform:scale(46);opacity:0}}
        @keyframes gsFlash{0%{opacity:0}30%{opacity:.9}100%{opacity:0}}
        @keyframes gsPop{0%{transform:scale(.6) translateY(${px(30)}px);opacity:0}100%{transform:none;opacity:1}}
        @keyframes gsFloat{0%{transform:translateY(0) scale(.5);opacity:0}25%{opacity:1}100%{transform:translateY(${px(-70)}px) scale(1);opacity:0}}
        @keyframes gsBorder{to{background-position:200% 0}}
        @keyframes gsChestShake{0%{transform:translate(0,0) rotate(0)}10%{transform:translate(${px(-1)}px,0) rotate(-1.5deg)}20%{transform:translate(${px(1)}px,0) rotate(1.5deg)}30%{transform:translate(${px(-2)}px,0) rotate(-2.5deg)}40%{transform:translate(${px(2)}px,0) rotate(2.5deg)}50%{transform:translate(${px(-3)}px,0) rotate(-4deg)}60%{transform:translate(${px(3)}px,0) rotate(4deg)}70%{transform:translate(${px(-4)}px,${px(-3)}px) rotate(-5deg)}80%{transform:translate(${px(4)}px,${px(-3)}px) rotate(5deg)}90%{transform:translate(${px(-5)}px,${px(-5)}px) rotate(-6deg)}100%{transform:translate(0,${px(-4)}px) rotate(0) scale(1.06)}}
        @keyframes gsLeak{0%{opacity:0}100%{opacity:1}}
        @keyframes gsLid{0%{transform:translateY(0) rotate(0)}100%{transform:translateY(-6px) rotate(-16deg)}}
        @keyframes gsBeam{0%{transform:scaleY(0);opacity:0}40%{opacity:1}100%{transform:scaleY(1);opacity:.9}}
        @keyframes gsCardIn{0%{transform:translateY(${px(40)}px) scale(.5) rotateY(90deg);opacity:0}70%{transform:translateY(0) scale(1.08) rotateY(0);opacity:1}100%{transform:none;opacity:1}}
        @keyframes gsShine{0%{transform:translateX(-120%)}100%{transform:translateX(220%)}}
        @keyframes gsFadeOut{to{opacity:0;transform:scale(.7)}}
      `}</style>

      <div style={rays(col, px(980), stage === 'spin' ? 6 : 14)} />

      {(stage === 'shake' || stage === 'open') && (
        <div style={{ position: 'absolute', left: '50%', top: cy, transform: 'translate(-50%,-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: px(16) }}>
          <div style={{ position: 'relative', width: chestSize, height: chestSize * 0.9 }}>
            {stage === 'open' && (
              <div style={{ position: 'absolute', left: '50%', bottom: '58%', width: px(150), height: px(340), marginLeft: -px(75), transformOrigin: '50% 100%', clipPath: 'polygon(36% 100%, 64% 100%, 100% 0, 0 0)', background: `linear-gradient(0deg, #fff 0%, ${finalCol} 38%, ${finalCol}00 100%)`, animation: 'gsBeam .5s ease-out forwards', pointerEvents: 'none' }} />
            )}
            <div style={{ position: 'relative', animation: stage === 'shake' ? 'gsChestShake 1.05s ease-in forwards' : 'none', filter: stage === 'shake' ? undefined : `drop-shadow(0 0 ${px(16)}px ${finalCol})` }}>
              {stage === 'shake' && <div style={{ position: 'absolute', left: '8%', right: '8%', top: '36%', height: px(6), borderRadius: 99, background: finalCol, boxShadow: `0 0 ${px(18)}px ${finalCol}`, opacity: 0, animation: 'gsLeak 1s ease-in forwards', pointerEvents: 'none' }} />}
              <ChestArt size={chestSize} open={stage === 'open'} glow={finalCol} />
            </div>
          </div>
          <div style={{ fontSize: px(14), fontWeight: 700, letterSpacing: 2, color: 'rgba(255,255,255,0.7)' }}>{stage === 'shake' ? 'MEMBUKA PETI…' : ''}</div>
        </div>
      )}

      {stage === 'spin' && (
        <div style={{ position: 'absolute', left: '50%', top: cy, transform: 'translate(-50%,-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: px(14), animation: 'gsPop .3s ease-out' }}>
          <div style={orb(px(176), col, true)}><RodArt id={shown} size={px(150)} animate /></div>
          <div style={{ fontSize: px(15), fontWeight: 700, letterSpacing: 2, color: col, minHeight: px(22), transition: 'color .15s' }}>{RARITY[cur.rarity].label.toUpperCase()}</div>
        </div>
      )}
      {stage === 'burst' && single && (
        <div style={{ position: 'absolute', left: '50%', top: cy, transform: 'translate(-50%,-50%)' }}>
          <div style={orb(px(176), finalCol, true)}><RodArt id={rod.id} size={px(150)} animate /></div>
        </div>
      )}
      {(stage === 'shake' || stage === 'open' || stage === 'spin') && (
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: px(34), textAlign: 'center', fontSize: px(13), fontWeight: 600, color: 'rgba(255,255,255,0.55)' }}>ketuk untuk lewati</div>
      )}

      {stage === 'burst' && (
        <>
          <div style={{ position: 'absolute', left: '50%', top: cy, width: px(40), height: px(40), marginLeft: -px(20), marginTop: -px(20), borderRadius: '50%', background: finalCol, animation: 'gsRing .65s ease-out forwards' }} />
          <div style={{ position: 'absolute', inset: 0, background: '#fff', animation: 'gsFlash .65s ease-out forwards', pointerEvents: 'none' }} />
        </>
      )}

      {stage === 'reveal' && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: px(10), overflowY: 'auto' }}>
          {sparks.map((s, i) => (
            <span key={i} style={{ position: 'absolute', left: s.x + '%', top: s.y + '%', width: s.s, height: s.s, borderRadius: s.w ? '50%' : 1, background: s.w ? '#fff' : finalCol, boxShadow: `0 0 ${px(8)}px ${finalCol}`, animation: `gsFloat ${2.2 + (i % 4) * 0.4}s ease-out ${s.d}s infinite`, pointerEvents: 'none' }} />
          ))}

          {single ? (
            <div style={{ position: 'relative', width: px(290), animation: 'gsPop .45s cubic-bezier(.2,1.4,.4,1)' }}>
              <div style={{ position: 'absolute', left: '50%', top: px(86), width: px(250), height: px(250), marginLeft: -px(125), marginTop: -px(125), borderRadius: '50%', background: `radial-gradient(circle, ${finalCol}55 0%, transparent 66%)`, animation: 'gsBreath 2.4s ease-in-out infinite', pointerEvents: 'none' }} />
              <div style={{
                position: 'relative', borderRadius: px(22), padding: px(16), textAlign: 'center', color: '#fff',
                border: `${px(3)}px solid ${isTop ? 'transparent' : finalCol}`,
                background: isTop ? topBorder : 'linear-gradient(180deg,#14233f,#0b1426)',
                backgroundSize: isTop ? '100% 100%, 200% 100%' : undefined,
                animationName: isTop ? 'gsBorder' : undefined, animationDuration: '3s', animationTimingFunction: 'linear', animationIterationCount: 'infinite',
                boxShadow: `0 0 ${px(56)}px ${finalCol}88, inset 0 0 ${px(34)}px ${finalCol}22`,
              }}>
                <div style={{ fontSize: px(12), fontWeight: 700, letterSpacing: 3, color: finalCol }}>{best.duplicate ? 'SUDAH PUNYA' : '✦ JORAN BARU! ✦'}</div>
                <div style={{ display: 'flex', justifyContent: 'center', margin: `${px(10)}px 0` }}>
                  <div style={orb(px(150), finalCol, false)}><RodArt id={rod.id} size={px(130)} animate /></div>
                </div>
                <div style={{ fontSize: px(22), fontWeight: 700, letterSpacing: -0.3 }}>{rod.name}</div>
                <span style={{ display: 'inline-block', marginTop: px(4), background: finalCol, color: '#000', fontWeight: 700, fontSize: px(12), borderRadius: 99, padding: `${px(2)}px ${px(14)}px` }}>{RARITY[rod.rarity].label}</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: px(5), marginTop: px(12) }}>
                  {stat(`🍀 +${Math.round(rod.luck * 100)}%`)}{stat(`💰 +${Math.round(rod.money * 100)}%`)}{stat(`✨ +${Math.round(rod.xp * 100)}%`)}{stat(`🎯 +${Math.round(rodEase(rod.power) * 100)}%`)}
                </div>
                {best.duplicate && <p style={{ margin: `${px(10)}px 0 0`, fontSize: px(13), fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>{`Ditukar jadi +${formatNum(GACHA_DUPLICATE_REFUND)} Crystal`}</p>}
                <button onClick={onClose} style={{ marginTop: px(14), width: '100%', borderRadius: px(14), border: 0, background: '#34d27a', color: '#04210f', fontFamily: font, fontWeight: 700, fontSize: px(15), padding: `${px(10)}px 0`, cursor: 'pointer' }}>Lanjut</button>
              </div>
            </div>
          ) : (
            <div style={{ position: 'relative', width: px(640), maxWidth: '100%', textAlign: 'center', color: '#fff' }}>
              <div style={{ fontSize: px(22), fontWeight: 800, marginBottom: px(10), textShadow: '0 2px 4px rgba(0,0,0,.6)' }}>Hasil Buka {items.length}×</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: px(10) }}>
                {items.map((g, i) => {
                  const rc = RARITY[g.rod.rarity].color;
                  const top = g.rod.rarity === 'legendary' || g.rod.rarity === 'mythic';
                  const isBest = g === best;
                  return (
                    <div key={i} style={{ position: 'relative', width: px(112), overflow: 'hidden', borderRadius: px(16), padding: `${px(8)}px ${px(4)}px`, border: `${px(3)}px solid ${top ? 'transparent' : rc}`, background: top ? topBorder : 'linear-gradient(180deg,#14233f,#0b1426)', backgroundSize: top ? '100% 100%, 200% 100%' : undefined, animation: `gsCardIn .55s cubic-bezier(.2,1.2,.4,1) ${0.15 + i * 0.28}s both${top ? ', gsBorder 3s linear infinite' : ''}`, boxShadow: `0 0 ${px(isBest ? 34 : 18)}px ${rc}${isBest ? 'aa' : '66'}` }}>
                      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(100deg, transparent 35%, rgba(255,255,255,.28) 50%, transparent 65%)', animation: `gsShine 1.1s ease-out ${0.6 + i * 0.28}s both` }} />
                      <div style={{ display: 'flex', justifyContent: 'center' }}><RodArt id={g.rod.id} size={px(76)} animate /></div>
                      <div style={{ fontSize: px(12), fontWeight: 800, lineHeight: 1.1, minHeight: px(26) }}>{g.rod.name.replace('Joran ', '')}</div>
                      <div style={{ fontSize: px(11), fontWeight: 800, color: rc }}>{RARITY[g.rod.rarity].label}</div>
                      <div style={{ fontSize: px(11), fontWeight: 800, color: g.duplicate ? 'rgba(255,255,255,.65)' : '#6df0a0' }}>{g.duplicate ? `+${formatNum(GACHA_DUPLICATE_REFUND)} Crystal` : 'BARU!'}</div>
                    </div>
                  );
                })}
              </div>
              {refundTotal > 0 && <div style={{ marginTop: px(10), fontSize: px(13), fontWeight: 700, color: 'rgba(255,255,255,.75)' }}>{`Joran ganda ditukar +${formatNum(refundTotal)} Crystal`}</div>}
              <button onClick={onClose} style={{ marginTop: px(14), width: '100%', borderRadius: px(14), border: 0, background: '#34d27a', color: '#04210f', fontFamily: font, fontWeight: 700, fontSize: px(16), padding: `${px(10)}px 0`, cursor: 'pointer' }}>Lanjut</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
