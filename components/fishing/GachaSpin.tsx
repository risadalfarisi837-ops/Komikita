'use client';

// Animasi tarik Gacha joran: putaran slot -> ledakan cahaya -> kartu hasil. Ketuk layar untuk melewati putaran.
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { GACHA_DUPLICATE_REFUND, RARITY, RODS, formatNum, rodEase } from '@/lib/fishing';
import type { Rod } from '@/lib/fishing';
import RodArt from './RodArt';

type Stage = 'spin' | 'burst' | 'reveal';
const PARTICLES: Record<string, number> = { common: 0, uncommon: 0, rare: 7, epic: 13, legendary: 22 };

export default function GachaSpin({ rod, duplicate, px, font, onClose }: {
  rod: Rod; duplicate: boolean; px: (n: number) => number; font: string; onClose: () => void;
}) {
  const [stage, setStage] = useState<Stage>('spin');
  const [shown, setShown] = useState<string>(RODS[0].id);
  const timers = useRef<number[]>([]);
  const finalCol = RARITY[rod.rarity].color;

  useEffect(() => {
    // urutan putaran: acak, makin lama makin pelan, berhenti tepat di joran hasil
    const pool = RODS.map((r) => r.id);
    const seq: string[] = [];
    let last = '';
    for (let i = 0; i < 18; i++) {
      let pick = pool[Math.floor(Math.random() * pool.length)];
      while (pick === last) pick = pool[Math.floor(Math.random() * pool.length)];
      seq.push(pick);
      last = pick;
    }
    seq.push(rod.id);
    const ids: number[] = [];
    let at = 0;
    seq.forEach((id, i) => {
      at += 55 + Math.pow(i / (seq.length - 1), 2.4) * 300;
      ids.push(window.setTimeout(() => setShown(id), at));
    });
    ids.push(window.setTimeout(() => setStage('burst'), at + 420));
    ids.push(window.setTimeout(() => setStage('reveal'), at + 420 + 650));
    timers.current = ids;
    return () => ids.forEach((t) => clearTimeout(t));
  }, [rod.id]);

  const skip = () => {
    if (stage === 'reveal') return;
    timers.current.forEach((t) => clearTimeout(t));
    setShown(rod.id);
    setStage('reveal');
  };

  const cur = RODS.find((r) => r.id === shown) || rod;
  const col = stage === 'spin' ? RARITY[cur.rarity].color : finalCol;
  const isLegend = rod.rarity === 'legendary';
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

  const stat = (t: string): JSX.Element => (
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

  return (
    <div onClick={stage === 'spin' ? skip : undefined} style={{ position: 'absolute', inset: 0, zIndex: 40, overflow: 'hidden', background: 'radial-gradient(circle at 50% 46%, #1b2a4d 0%, #0a1020 72%)', fontFamily: font }}>
      <style>{`
        @keyframes gsRays{to{transform:rotate(360deg)}}
        @keyframes gsBreath{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}
        @keyframes gsShake{0%{transform:translate(0,0)}25%{transform:translate(${px(2)}px,${px(-1)}px)}50%{transform:translate(${px(-2)}px,${px(1)}px)}75%{transform:translate(${px(1)}px,${px(2)}px)}100%{transform:translate(0,0)}}
        @keyframes gsRing{0%{transform:scale(1);opacity:.95}100%{transform:scale(46);opacity:0}}
        @keyframes gsFlash{0%{opacity:0}30%{opacity:.9}100%{opacity:0}}
        @keyframes gsPop{0%{transform:scale(.6) translateY(${px(30)}px);opacity:0}100%{transform:none;opacity:1}}
        @keyframes gsFloat{0%{transform:translateY(0) scale(.5);opacity:0}25%{opacity:1}100%{transform:translateY(${px(-70)}px) scale(1);opacity:0}}
        @keyframes gsBorder{to{background-position:200% 0}}
      `}</style>

      <div style={rays(col, px(980), stage === 'spin' ? 6 : 14)} />

      {stage !== 'reveal' && (
        <div style={{ position: 'absolute', left: '50%', top: cy, transform: 'translate(-50%,-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: px(14) }}>
          <div style={orb(px(176), col, stage === 'spin')}><RodArt id={stage === 'spin' ? shown : rod.id} size={px(150)} animate /></div>
          <div style={{ fontSize: px(15), fontWeight: 700, letterSpacing: 2, color: col, minHeight: px(22), transition: 'color .15s' }}>
            {stage === 'spin' ? RARITY[cur.rarity].label.toUpperCase() : ''}
          </div>
        </div>
      )}
      {stage === 'spin' && <div style={{ position: 'absolute', left: 0, right: 0, bottom: px(34), textAlign: 'center', fontSize: px(13), fontWeight: 600, color: 'rgba(255,255,255,0.55)' }}>Menarik joran… <span style={{ opacity: 0.7 }}>(ketuk untuk lewati)</span></div>}

      {stage === 'burst' && (
        <>
          <div style={{ position: 'absolute', left: '50%', top: cy, width: px(40), height: px(40), marginLeft: -px(20), marginTop: -px(20), borderRadius: '50%', background: finalCol, animation: 'gsRing .65s ease-out forwards' }} />
          <div style={{ position: 'absolute', inset: 0, background: '#fff', animation: 'gsFlash .65s ease-out forwards', pointerEvents: 'none' }} />
        </>
      )}

      {stage === 'reveal' && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: px(10) }}>
          {sparks.map((s, i) => (
            <span key={i} style={{ position: 'absolute', left: s.x + '%', top: s.y + '%', width: s.s, height: s.s, borderRadius: s.w ? '50%' : 1, background: s.w ? '#fff' : finalCol, boxShadow: `0 0 ${px(8)}px ${finalCol}`, animation: `gsFloat ${2.2 + (i % 4) * 0.4}s ease-out ${s.d}s infinite`, pointerEvents: 'none' }} />
          ))}
          <div style={{ position: 'relative', width: px(290), animation: 'gsPop .45s cubic-bezier(.2,1.4,.4,1)' }}>
            <div style={{ position: 'absolute', left: '50%', top: px(86), width: px(250), height: px(250), marginLeft: -px(125), marginTop: -px(125), borderRadius: '50%', background: `radial-gradient(circle, ${finalCol}55 0%, transparent 66%)`, animation: 'gsBreath 2.4s ease-in-out infinite', pointerEvents: 'none' }} />
            <div style={{
              position: 'relative', borderRadius: px(22), padding: px(16), textAlign: 'center', color: '#fff',
              border: `${px(3)}px solid ${isLegend ? 'transparent' : finalCol}`,
              background: isLegend
                ? 'linear-gradient(180deg,#14233f,#0b1426) padding-box, linear-gradient(90deg,#fcd34d,#f472b6,#7dd3fc,#fcd34d) border-box'
                : 'linear-gradient(180deg,#14233f,#0b1426)',
              backgroundSize: isLegend ? '100% 100%, 200% 100%' : undefined,
              animationName: isLegend ? 'gsBorder' : undefined, animationDuration: '3s', animationTimingFunction: 'linear', animationIterationCount: 'infinite',
              boxShadow: `0 0 ${px(56)}px ${finalCol}88, inset 0 0 ${px(34)}px ${finalCol}22`,
            }}>
              <div style={{ fontSize: px(12), fontWeight: 700, letterSpacing: 3, color: finalCol }}>{duplicate ? 'SUDAH PUNYA' : '✦ JORAN BARU! ✦'}</div>
              <div style={{ display: 'flex', justifyContent: 'center', margin: `${px(10)}px 0` }}>
                <div style={orb(px(150), finalCol, false)}><RodArt id={rod.id} size={px(130)} animate /></div>
              </div>
              <div style={{ fontSize: px(22), fontWeight: 700, letterSpacing: -0.3 }}>{rod.name}</div>
              <span style={{ display: 'inline-block', marginTop: px(4), background: finalCol, color: '#000', fontWeight: 700, fontSize: px(12), borderRadius: 99, padding: `${px(2)}px ${px(14)}px` }}>{RARITY[rod.rarity].label}</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: px(5), marginTop: px(12) }}>
                {stat(`🍀 +${Math.round(rod.luck * 100)}%`)}{stat(`💰 +${Math.round(rod.money * 100)}%`)}{stat(`✨ +${Math.round(rod.xp * 100)}%`)}{stat(`🎯 +${Math.round(rodEase(rod.power) * 100)}%`)}
              </div>
              {duplicate && <p style={{ margin: `${px(10)}px 0 0`, fontSize: px(13), fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>{`Ditukar jadi +${formatNum(GACHA_DUPLICATE_REFUND)} Crystal`}</p>}
              <button onClick={onClose} style={{ marginTop: px(14), width: '100%', borderRadius: px(14), border: 0, background: '#34d27a', color: '#04210f', fontFamily: font, fontWeight: 700, fontSize: px(15), padding: `${px(10)}px 0`, cursor: 'pointer' }}>Lanjut</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
