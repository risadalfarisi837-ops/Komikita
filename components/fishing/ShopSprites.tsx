'use client';

import type { ReactElement } from 'react';

// Sprite piksel kecil untuk item Toko. '.' = transparan, huruf lain diambil dari palet.
type Pal = Record<string, string>;

export function Px({ g, pal, size }: { g: string[]; pal: Pal; size: number }) {
  const h = g.length;
  const w = Math.max(...g.map((r) => r.length));
  const rects: ReactElement[] = [];
  g.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const c = pal[row[x]];
      if (c) rects.push(<rect key={`${x}-${y}`} x={x} y={y} width="1.04" height="1.04" fill={c} />);
    }
  });
  return (
    <svg width={(size * w) / h} height={size} viewBox={`0 0 ${w} ${h}`} aria-hidden shapeRendering="crispEdges" style={{ flex: 'none', display: 'block' }}>
      {rects}
    </svg>
  );
}

const NIGHT: string[] = [
  '....KKKKKK....',
  '...KKKKKKKK...',
  '...KKSSSSKK...',
  '...KSSSSSSK...',
  '...KSsSSsSK...',
  '....SSSSSS....',
  '..CCDDDDDDCC..',
  '.CcCDWDDWDCcC.',
  '..DDDWDDWDDD..',
  '..DDDDWWDDDD..',
  '..DLDDDDDDLD..',
  '...DDDDDDDD...',
  '...DDWDDWDD...',
  '...DDD..DDD...',
  '...DDD..DDD...',
  '...DLD..DLD...',
  '...BBB..BBB...',
  '..BBBB..BBBB..',
];
const NIGHT_P: Pal = { K: '#14161f', S: '#e8b48f', s: '#c98d6b', D: '#1b2030', L: '#3a4258', C: '#35e6ff', c: '#0fa6c4', B: '#0e1018', W: '#c9d3e8' };

const FLAME: string[] = [
  '....KKKKKK....',
  '...KKKKKKKK...',
  '...KKSSSSKK...',
  '...KSSSSSSK...',
  '...KSsSSsSK...',
  '....SSSSSS....',
  '..WWWNNNNWWW..',
  '.WWWWNNNNWWWW.',
  '.WwWWNNNNWWwW.',
  '.WWWWNNNNWWWW.',
  '.WWWWNGGNWWWW.',
  '.RWRWNGGNWRWR.',
  '.OROROGGORORO.',
  '..YOYO.GG.OYO.',
  '....GGG.GGG...',
  '....GgG.GgG...',
  '....BBB.BBB...',
];
const FLAME_P: Pal = { K: '#2a1c14', S: '#f0c09a', s: '#d49a74', W: '#f4f1ea', w: '#d9d4c6', N: '#2d3550', R: '#e8402a', O: '#ff8a2a', Y: '#ffd23a', G: '#4f7a3a', g: '#3a5c2a', B: '#3a2a1c' };

const STAR: string[] = [
  '.....y.....',
  '....yYy....',
  '....yYy....',
  'yyyyyYyyyyy',
  'yYYYYwYYYYy',
  '.yYYYYYYYy.',
  '..yYYYYYy..',
  '..yYYYYYy..',
  '.yYYyyyYYy.',
  '.yYy...yYy.',
  'yy.......yy',
];
const STAR_P: Pal = { Y: '#ffd23a', y: '#c98a00', w: '#fff3a8' };

const SQUID: string[] = [
  '...PPPP...',
  '..PPPPPP..',
  '.PPPPPPPP.',
  '.PwkPPwkP.',
  '.PPPPPPPP.',
  '.pPPPPPPp.',
  '..pPPPPp..',
  '..P.P.P.P.',
  '..P.P.P.P.',
  '.P..P.P..P',
];
const SQUID_P: Pal = { P: '#ff8fb0', p: '#d9608a', w: '#ffffff', k: '#222030' };

const GLOW: string[] = [
  '...rrrr...',
  '..rRRRRr..',
  '..rRwRRr..',
  '..yyyyyy..',
  '..wwwwww..',
  '..wwwwww..',
  '....kk....',
  '...k..k...',
  '...kkkk...',
];
const GLOW_P: Pal = { r: '#8a1d1d', R: '#e03a3a', w: '#f3efe4', y: '#f5c33a', k: '#3a3f4d' };

const CRICKET: string[] = [
  'y.......y.',
  '.y.....y..',
  '..yYYYy...',
  '.yYwYYYy..',
  'yYYYYYYYy.',
  '.yyyyyyy..',
  'y.y.y.y.y.',
];
const CRICKET_P: Pal = { Y: '#ffd23a', y: '#9a6a00', w: '#fff3a8' };

const WORM: string[] = [
  '...........',
  '..rrr......',
  '.rRRRr.rr..',
  'rR..rRRRRr.',
  'rr...rrrrr.',
];
const WORM_P: Pal = { R: '#e58a8a', r: '#b45a5a' };

const SHRIMP: string[] = [
  '..OOOO....',
  '.OoOOOOo..',
  'OoKwOOOOo.',
  'OO..OOOOO.',
  '.O..OoOOo.',
  '....OO.OO.',
];
const SHRIMP_P: Pal = { O: '#ff8a4a', o: '#d9602a', K: '#222030', w: '#ffffff' };

const GEM: string[] = [
  '..PPPPPP..',
  '.PpPPPPpP.',
  'PPPPPPPPPP',
  '.PPPPPPPP.',
  '..PPPPPP..',
  '...dPPd...',
  '....dd....',
];
const GEM_P: Pal = { P: '#d23fe6', p: '#f08cff', d: '#a51ec0' };

const CRYSTAL: string[] = [
  '...pPPp...',
  '..pPPPPp..',
  '.pPPwPPPp.',
  '.PPwPPPPP.',
  '.PPPPPPPd.',
  '.PPPPPPdd.',
  '..PPPPdd..',
  '..PPPPdd..',
  '...PPdd...',
  '....dd....',
];
const CRYSTAL_P: Pal = { P: '#4db8ff', p: '#b8e6ff', w: '#ffffff', d: '#1f78c8' };

const TICKET: string[] = [
  '.yyyyyyyyy.',
  'yYYYYYYYYYy',
  'yYYYYrYYYYy',
  'yYYYrrrYYYy',
  'yYYYYrYYYYy',
  '.yyyyyyyyy.',
];
const TICKET_P: Pal = { y: '#b87a10', Y: '#ffc83a', r: '#e03a3a' };

const CHEST: string[] = [
  '..SSSSSSSSSS..',
  '.SLLLLLLLLLLS.',
  '.SLsLLLLLLsLS.',
  '.SSSSSSSSSSSS.',
  '.SbbbbPPbbbbS.',
  '.SbbbbPPbbbbS.',
  '.SbsbbbbbbsbS.',
  '.SbbbbbbbbbbS.',
  '.SSSSSSSSSSSS.',
];
const CHEST_P: Pal = { S: '#8e9ab5', L: '#6b7690', s: '#aab4cc', b: '#454d63', P: '#ff5fb0' };

export type SpriteKey = 'night' | 'flame' | 'star' | 'squid' | 'glow' | 'cricket' | 'worm' | 'shrimp' | 'gem' | 'chest' | 'crystal' | 'ticket';
const SPRITES: Record<SpriteKey, [string[], Pal]> = {
  night: [NIGHT, NIGHT_P], flame: [FLAME, FLAME_P], star: [STAR, STAR_P], squid: [SQUID, SQUID_P], glow: [GLOW, GLOW_P],
  cricket: [CRICKET, CRICKET_P], worm: [WORM, WORM_P], shrimp: [SHRIMP, SHRIMP_P], gem: [GEM, GEM_P], chest: [CHEST, CHEST_P], crystal: [CRYSTAL, CRYSTAL_P], ticket: [TICKET, TICKET_P],
};

export function Sprite({ k, size }: { k: SpriteKey; size: number }) {
  const [g, pal] = SPRITES[k];
  return <Px g={g} pal={pal} size={size} />;
}
