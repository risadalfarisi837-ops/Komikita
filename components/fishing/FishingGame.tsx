'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as RPointerEvent, ReactNode } from 'react';
import { FishingEngine } from './engine';
import type { Catch, EngineStatus, Phase } from './engine';
import { FISH_H, FISH_W, drawFish } from './art';
import {
  BAG_MAX, DEFAULT_ROD, GACHA_PRICE, RARITY, RODS, RODS_BY_ID, SPECIES, SPECIES_BY_ID,
  fishPrice, formatNum, formatWeight, isShowoff, isXL, levelFromXp, newId, rodAt, rodEase, sizeRatio, sizeTier, xpFor,
} from '@/lib/fishing';
import { SPECIES as KSPECIES, sizeRatio as kSizeRatio } from '@/lib/fishing';
import type { BagItem, Rarity, Rod, SizeTier } from '@/lib/fishing';
import DevTools, { DevFab, EMPTY_STATS } from './DevTools';
import ProfileModal from './ProfileModal';
import { DEFAULT_OUTFIT, encodeOutfit, titleOf, roleLabel } from './outfit';
import type { Outfit } from './outfit';
import { startFishingNet } from '@/lib/fishingNet';
import PremiumName from '@/components/PremiumName';
import DevBadge from '@/components/DevBadge';
import AdminBadge from '@/components/AdminBadge';
import VerifiedBadge from '@/components/VerifiedBadge';
import { cleanNameRole } from '@/lib/premium';
import { MAIN_ROOM, islandName } from '@/lib/fishingIslands';
import { getFirebase } from '@/lib/firebase-client';
import ShopScreen, { CrystalIcon } from './Shop';
import SellFish from './SellFish';
import LimitedSpin from './LimitedSpin';
import type { LimitedDrop, LimitedRarity } from '@/lib/limitedGacha';
import type { QrOrder, TopUpPoll } from '@/lib/topupPacks';
import PixelRod from './RodArt';
import GachaSpin from './GachaSpin';
import RodScreen from './RodScreen';
import type { ShopTab } from './Shop';
import type { DevStats, SellMode } from './DevTools';
import { GAME_BACK_EVENT, cancelLeavingGame, isTouchDevice, markLeavingGame } from '@/components/GameMode';

interface Props {
  name: string;
  photo: string;
  crystal: number;
  xp: number;
  bag: BagItem[];
  rods: string[];
  equippedRod: string;
  rodLv?: Record<string, number>;
  onUpgradeRod?: (id: string) => Promise<'ok' | 'kurang' | 'gagal' | 'maks'>;
  onCatch: (item: BagItem, xpGain: number) => void;
  onSetXp?: (xp: number) => void; // Dev Tools: set XP/level langsung
  outfit?: Outfit; // gaya karakter (Lemari)
  onSaveOutfit?: (o: Outfit) => void;
  onSell: (ids: string[]) => Promise<number>;
  onBuyRod: (id: string) => Promise<'ok' | 'kurang' | 'gagal'>;
  onEquipRod: (id: string) => void;
  onGacha: (dev?: { min?: Rarity | ''; free?: boolean; rod?: string }) => Promise<{ rod: Rod; duplicate: boolean } | 'kurang' | 'gagal'>;
  pity?: number;
  starterClaimed?: boolean;
  gems?: number;
  onTopUp?: (currency: 'gems' | 'crystal', packId: string) => string | QrOrder | void | Promise<string | QrOrder | void>;
  onTopUpPoll?: (orderId: string) => Promise<TopUpPoll>;
  onTopUpPaid?: () => void;
  onOpenLimited?: (n: 1 | 10, free?: boolean, min?: LimitedRarity | '') => Promise<LimitedDrop[] | 'kurang' | 'gagal'>;
  onDevGive?: (kind: 'crystal' | 'gems' | 'rod', v: number | string) => Promise<boolean>;
  onDevPity?: (kind: 'rod' | 'limited', n: number) => Promise<void>;
  limitedPity?: number;
  limitedOwned?: string[];
  onClaimStarter?: () => Promise<boolean>;
  freeBaitClaimed?: boolean;
  onClaimBait?: () => Promise<boolean>;
  promoBought?: Record<string, number>;
  onPromoPaid?: () => void;
  onExit: () => void;
  room?: string; // kode pulau dari lobi (kosong = pulau utama)
  dev?: boolean; // role Developer: buka Dev Tools (auto fishing dll)
  role?: string; // 'dev' | 'admin' | 'premium' | '' -> warna nama + lencana
}

// Nama berwarna sesuai role + lencana (dipakai di kartu pemain & chat)
function RoleName({ role, children, nameStyle }: { role?: string; children: ReactNode; nameStyle?: CSSProperties }) {
  return (
    <>
      <PremiumName premium={role === 'premium'} dev={role === 'dev'} admin={role === 'admin'} style={nameStyle}>{children}</PremiumName>
      {role === 'dev' ? <DevBadge size={14} /> : role === 'admin' ? <AdminBadge size={14} /> : role === 'premium' ? <VerifiedBadge size={13} /> : null}
    </>
  );
}

const HUD = '"Fredoka", "Baloo 2", system-ui, sans-serif';
const PANEL = 'rgba(24,22,22,0.9)';
// tema HUD krem (kartu putih-krem membulat, teks cokelat)
const CREAM_BG = 'linear-gradient(180deg,#fffdf4,#fbf0d6)';
const CREAM_EDGE = '#e6d0a0';
const CREAM_INK = '#5a3b1e';
const GOLD = '#f5c451';

// ---------- ikon kecil ----------
function FishIcon({ id, scale }: { id: string; scale: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    const sp = SPECIES_BY_ID[id];
    if (!c || !sp) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.imageSmoothingEnabled = false;
    drawFish(ctx, sp, c.width / 2, c.height / 2, 1);
  }, [id]);
  return <canvas ref={ref} width={FISH_W} height={FISH_H} style={{ width: FISH_W * scale, height: FISH_H * scale, imageRendering: 'pixelated' }} />;
}

function RodIcon({ size, color = '#c9a06a' }: { size: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <path d="M4 28L24 6" stroke={color} strokeWidth="2.6" strokeLinecap="round" />
      <path d="M24 6c3 1 5 4 4 8" stroke="#e8e8e8" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="28" cy="15" r="1.6" fill="#ff5a4d" />
      <rect x="7" y="21" width="5" height="5" rx="1.5" fill="#3b4f73" transform="rotate(-45 9.5 23.5)" />
    </svg>
  );
}

function BagIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <path d="M11 9V7a5 5 0 0110 0v2" stroke="#7a4a1e" strokeWidth="2.4" />
      <rect x="5" y="9" width="22" height="18" rx="4" fill="#e8963a" stroke="#8a4a14" strokeWidth="2" />
      <rect x="5" y="15" width="22" height="3" fill="#c97a22" />
      <rect x="13" y="14" width="6" height="6" rx="1.5" fill="#ffd36a" stroke="#8a4a14" strokeWidth="1.4" />
    </svg>
  );
}


// ---------- ikon HUD ----------
function CloverIcon({ size, color = '#3fbf5a' }: { size: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16"><g fill={color} stroke="rgba(0,0,0,0.35)" strokeWidth="0.8"><rect x="1" y="5" width="6" height="6" rx="2" /><rect x="9" y="5" width="6" height="6" rx="2" /><rect x="5" y="1" width="6" height="6" rx="2" /><rect x="5" y="9" width="6" height="6" rx="2" /></g></svg>
  );
}
function CoinIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16"><circle cx="8" cy="8" r="6.5" fill="#f5c451" stroke="#9a6a10" strokeWidth="1.4" /><path d="M8 4.5v7M6 6.6c0-1 4-1 4 0s-4 1.2-4 2.6 4 1.1 4 0" stroke="#9a6a10" strokeWidth="1.2" fill="none" strokeLinecap="round" /></svg>
  );
}
function XpIcon({ size }: { size: number }) {
  return (
    <svg width={size * 1.3} height={size} viewBox="0 0 26 20"><rect x="1" y="2" width="24" height="16" rx="3" fill="#3b7fe0" stroke="#9cc4ff" strokeWidth="1.4" /><text x="13" y="14.2" textAnchor="middle" fontSize="10" fontWeight="800" fill="#fff" fontFamily="system-ui, sans-serif">XP</text></svg>
  );
}
function SparkIcon({ size, fill = '#fff', glow = '#79b7ff' }: { size: number; fill?: string; glow?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24"><path d="M12 1.5C12.9 8.2 15.8 11.1 22.5 12 15.8 12.9 12.9 15.8 12 22.5 11.1 15.8 8.2 12.9 1.5 12 8.2 11.1 11.1 8.2 12 1.5Z" fill={fill} stroke={glow} strokeWidth="1.4" strokeLinejoin="round" /></svg>
  );
}
function PeopleIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#cfe9ff"><circle cx="8.5" cy="8" r="3.6" /><circle cx="16.5" cy="9" r="3" opacity="0.85" /><path d="M2 20c0-3.6 3-6 6.5-6s6.5 2.4 6.5 6z" /><path d="M15.5 14.2c3.2 0 6.5 1.8 6.5 5.8h-5.2" opacity="0.85" /></svg>
  );
}
function ChatIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24"><path d="M4 4h16a2.5 2.5 0 012.5 2.5v9A2.5 2.5 0 0120 18h-7l-5 4v-4H4a2.5 2.5 0 01-2.5-2.5v-9A2.5 2.5 0 014 4z" fill="#fff" /><g fill="#2a2626"><circle cx="8" cy="11" r="1.5" /><circle cx="12" cy="11" r="1.5" /><circle cx="16" cy="11" r="1.5" /></g></svg>
  );
}
function IslandIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24"><ellipse cx="12" cy="19" rx="10" ry="3.6" fill="#38b6e8" /><ellipse cx="12" cy="17" rx="6.5" ry="2.6" fill="#f0cf8a" /><path d="M12 16.5c.2-3 .4-5 1-7" stroke="#8a5a2a" strokeWidth="1.8" strokeLinecap="round" fill="none" /><path d="M13 9.5c-1-2.6-3.6-3.4-6-2.6 2-.2 4 .2 6 2.6zM13 9.5c1.2-2.4 3.8-2.8 6-1.6-2.2-.2-4.2.2-6 1.6zM13 9.5c-.6-2.6.2-4.4 2.4-5.4-1.4 1.6-1.8 3.4-2.4 5.4z" fill="#33b04c" /></svg>
  );
}
function GiftIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24"><rect x="3.5" y="10" width="17" height="11" rx="1.5" fill="#f59e0b" stroke="#8a4a14" strokeWidth="1.2" /><rect x="2.5" y="7" width="19" height="4.2" rx="1.2" fill="#ef4444" stroke="#8a1c14" strokeWidth="1.2" /><rect x="10.6" y="7" width="2.8" height="14" fill="#ffd36a" /><path d="M12 7C9.5 7 8 5.8 8.4 4.4 9.2 2.6 11.6 4.2 12 7zM12 7c2.5 0 4-1.2 3.6-2.6C14.8 2.6 12.4 4.2 12 7z" fill="#ef4444" stroke="#8a1c14" strokeWidth="1" /></svg>
  );
}
function GearIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="3.2" /><path d="M12 2.8v3M12 18.2v3M2.8 12h3M18.2 12h3M5.5 5.5l2.1 2.1M16.4 16.4l2.1 2.1M18.5 5.5l-2.1 2.1M7.6 16.4l-2.1 2.1" /></svg>
  );
}
// ikon garis cokelat untuk tombol krem (tata letak HUD mengikuti referensi)
const INKI = (size: number, kids: ReactNode) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#5a3b1e" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">{kids}</svg>
);
const ChatInk = ({ size }: { size: number }) => INKI(size, <><path d="M4 5h16a2 2 0 012 2v8a2 2 0 01-2 2h-7l-5 4v-4H4a2 2 0 01-2-2V7a2 2 0 012-2z" /><path d="M8 11h.01M12 11h.01M16 11h.01" strokeWidth="3" /></>);
const MicInk = ({ size }: { size: number }) => INKI(size, <><rect x="9" y="2.5" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0014 0M12 18v3.5M8.5 21.5h7" /></>);
const HeadsetInk = ({ size }: { size: number }) => INKI(size, <><path d="M4 15v-3a8 8 0 0116 0v3" /><rect x="2.5" y="14" width="4.5" height="6.5" rx="2" /><rect x="17" y="14" width="4.5" height="6.5" rx="2" /></>);
const SmileInk = ({ size }: { size: number }) => INKI(size, <><circle cx="12" cy="12" r="9.5" /><path d="M8 14.5c1.2 1.8 2.6 2.6 4 2.6s2.8-.8 4-2.6M9 9.5h.01M15 9.5h.01" strokeWidth="2.8" /></>);
const GearInk = ({ size }: { size: number }) => INKI(size, <><circle cx="12" cy="12" r="3.2" /><path d="M12 2.8v3M12 18.2v3M2.8 12h3M18.2 12h3M5.5 5.5l2.1 2.1M16.4 16.4l2.1 2.1M18.5 5.5l-2.1 2.1M7.6 16.4l-2.1 2.1" /></>);
const GridInk = ({ size }: { size: number }) => INKI(size, <path d="M5 5h.01M12 5h.01M19 5h.01M5 12h.01M12 12h.01M19 12h.01M5 19h.01M12 19h.01M19 19h.01" strokeWidth="3.6" />);
const StoreInk = ({ size }: { size: number }) => INKI(size, <><path d="M3.5 9l1.5-5h14l1.5 5M3.5 9c0 1.7 1.3 2.8 2.8 2.8S9 10.7 9 9c0 1.7 1.3 2.8 3 2.8s3-1.1 3-2.8c0 1.7 1.3 2.8 2.8 2.8S20.5 10.7 20.5 9M5 12v8h14v-8M10 20v-4h4v4" /></>);
const PeopleBlue = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#2b7fc2"><circle cx="8.5" cy="8" r="3.6" /><circle cx="16.5" cy="9" r="3" opacity="0.85" /><path d="M2 20c0-3.6 3-6 6.5-6s6.5 2.4 6.5 6z" /><path d="M15.5 14.2c3.2 0 6.5 1.8 6.5 5.8h-5.2" opacity="0.85" /></svg>
);
function BoatIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16"><path d="M8 1.5v9L3 10.5z" fill="#ff6a5c" /><path d="M9 3.5v7h4.5z" fill="#ffd2c9" /><path d="M2 12h12l-1.6 2.4H3.6z" fill="#c9e7ff" /></svg>
  );
}
function CrossRodIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" strokeLinecap="round"><path d="M3 25L12 16" stroke="#9aa0a6" strokeWidth="2.4" /><path d="M5 5L23 23M23 5L5 23" stroke="#e5483a" strokeWidth="3.2" /></svg>
  );
}
function FishRodIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" strokeLinecap="round">
      <path d="M27 4C17 3 12 10 14 19" stroke="#2f7f8f" strokeWidth="3" />
      <path d="M27 4L29 9" stroke="#d9b98a" strokeWidth="3" />
      <path d="M14 19L12 22" stroke="#e8e8e8" strokeWidth="1.2" />
      <ellipse cx="9" cy="24" rx="6.2" ry="3.8" fill="#2f8fe0" stroke="#1d5fa8" strokeWidth="1" />
      <path d="M14.5 24l4-3.2v6.4z" fill="#2f8fe0" stroke="#1d5fa8" strokeWidth="1" strokeLinejoin="round" />
      <circle cx="6.6" cy="23" r="1" fill="#fff" />
      <path d="M8 27.6l3 1.6-.4-3z" fill="#f59e3d" />
    </svg>
  );
}

// ikon menu gaya piksel (16 kolom), digambar sebagai kotak-kotak SVG supaya tajam
const PIX: Record<string, { pal: Record<string, string>; rows: string[] }> = {
  rumahku: { pal: { O: '#6b3f2a', R: '#e0553d', W: '#f7ecd0', B: '#6fb4ea', D: '#9a5f2e' }, rows: [
    '......OOOO......', '....OORRRROO....', '...ORRRRRRRRO...', '..ORRRRRRRRRRO..', '.ORRRRRRRRRRRRO.', 'OOOOOOOOOOOOOOOO',
    '..OWWWWWWWWWWO..', '..OWBBWWWWBBWO..', '..OWBBWWWWBBWO..', '..OWWWWDDWWWWO..', '..OWWWWDDWWWWO..', '..OWWWWDDWWWWO..', '..OOOOOOOOOOOO..'] },
  misi: { pal: { O: '#7a5326', S: '#d9ac5f', P: '#f6e3b0', L: '#a98253' }, rows: [
    '..OOOOOOOOOOOO..', '.OSSSSSSSSSSSSO.', '.OOOOOOOOOOOOOO.', '..OPPPPPPPPPPO..', '..OPLLLLLLLLPO..', '..OPPPPPPPPPPO..', '..OPLLLLLLPPPO..',
    '..OPPPPPPPPPPO..', '..OPLLLLLLLLPO..', '..OPPPPPPPPPPO..', '..OPLLLLPPPPPO..', '..OPPPPPPPPPPO..', '.OOOOOOOOOOOOOO.', '.OSSSSSSSSSSSSO.', '..OOOOOOOOOOOO..'] },
  hadiah: { pal: { O: '#6b2a1a', R: '#d93a3a', Y: '#f5a63a' }, rows: [
    '....OOO..OOO....', '...ORRRORORRRO..', '....OORRRROO....', '..OOOOOOOOOOOO..', '..OYYYYRRYYYYO..', '..OYYYYRRYYYYO..', '..OOOOOOOOOOOO..',
    '...OYYYRRYYYO...', '...OYYYRRYYYO...', '...OYYYRRYYYO...', '...OYYYRRYYYO...', '...OYYYRRYYYO...', '...OOOOOOOOOO...'] },
  buku: { pal: { O: '#14305e', B: '#2f86f0', L: '#8cc8ff', D: '#1b55b8', W: '#f7f1de' }, rows: [
    '..OOOOOOOOOOOO..', '.ODBBBBBBBBBBBO.', '.ODBBBBBBBBBBBO.', '.ODBBLLLLLLBBBO.', '.ODBBLLLLLLBBBO.', '.ODBBBBBBBBBBBO.',
    '.ODBBBBBBBBBBBO.', '.ODBBBBBBBBBBBO.', '.ODBBBBBBBBBBBO.', '.OOOOOOOOOOOOOO.', '..OWWWWWWWWWWO..', '..OOOOOOOOOOOO..'] },
  peringkat: { pal: { O: '#8a5a10', G: '#f6c32b', H: '#fff0a0', N: '#c8801e' }, rows: [
    '...OOOOOOOOOO...', 'OOOGGGGGGGGGGOOO', 'OGOGGHHGGGGGGOGO', 'OGOGGHHGGGGGGOGO', '.OOGGHGGGGGGGOO.', '...OGGGGGGGGO...',
    '....OGGGGGGO....', '.....OOGGOO.....', '......OGGO......', '......OGGO......', '.....OOOOOO.....', '....ONNNNNNO....', '....OOOOOOOO....'] },
  lemari: { pal: { O: '#3a6f94', C: '#8fd4f0' }, rows: [
    '....OOO..OOO....', '..OOCCCOOCCCOO..', '.OCCCCCCCCCCCCO.', 'OCCCCCCCCCCCCCCO', 'OCCCCCCCCCCCCCCO', '.OOCCCCCCCCCCOO.',
    '...OCCCCCCCCO...', '...OCCCCCCCCO...', '...OCCCCCCCCO...', '...OCCCCCCCCO...', '...OCCCCCCCCO...', '...OOOOOOOOOO...'] },
  skill: { pal: { O: '#1f5a24', G: '#4fb04a', H: '#8be07a', T: '#9a6a3a' }, rows: [
    '....OOOOOOOO....', '..OOGGGGGGGGOO..', '.OGGGGHHGGGGGGO.', '.OGGGHHGGGGGGGO.', 'OGGGGGGGGGGGGGGO', 'OGGGGGGGGGGGGGGO',
    '.OGGGGGGGGGGGGO.', '..OOGGGGGGGGOO..', '....OOOTTOOO....', '.....OTTTTO.....', '......OTTO......', '......OTTO......', '.....OTTTTO.....', '....OOOOOOOO....'] },
  surat: { pal: { O: '#5b8fc4', W: '#f4f9ff' }, rows: [
    '.OOOOOOOOOOOOOO.', '.OOWWWWWWWWWWOO.', '.OWOWWWWWWWWOWO.', '.OWWOWWWWWWOWWO.', '.OWWWOWWWWOWWWO.', '.OWWWWOOOOWWWWO.',
    '.OWWOWWWWWWOWWO.', '.OWOWWWWWWWWOWO.', '.OOWWWWWWWWWWOO.', '.OOOOOOOOOOOOOO.'] },
};
function PixIcon({ k, size }: { k: string; size: number }) {
  const d = PIX[k];
  if (!d) return null;
  const rects: ReactNode[] = [];
  d.rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const c = row[x];
      if (c === '.') { x++; continue; }
      let e = x;
      while (e < row.length && row[e] === c) e++;
      rects.push(<rect key={y + '-' + x} x={x} y={y} width={e - x} height={1} fill={d.pal[c]} />);
      x = e;
    }
  });
  const h = d.rows.length;
  return <svg width={size} height={(size * h) / 16} viewBox={`0 0 16 ${h}`} shapeRendering="crispEdges" style={{ display: 'block' }}>{rects}</svg>;
}

const Svg = ({ d, size = 22, stroke = '#fff', w = 2.4 }: { d: string; size?: number; stroke?: string; w?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);

const HINT: Record<Phase, string> = {
  idle: '',
  cast: 'Melempar joran...',
  wait: 'Menunggu ikan... (gerak = batal)',
  bite: 'Ada yang menggigit! Tekan Tarik!',
  reel: 'Tahan tombol supaya zona hijau ngikutin ikan',
  catching: '',
  result: '',
};

const rarityBorder = (r: keyof typeof RARITY, _xl: boolean) => (r === 'common' ? '#b3bcc2' : RARITY[r].color);

// ---------- kartu pamer (gambar untuk dibagikan) ----------
async function makeShareCard(item: BagItem, player: string, level: number): Promise<Blob | null> {
  const sp = SPECIES_BY_ID[item.s];
  if (!sp) return null;
  const rar = RARITY[sp.rarity];
  const W = 1080;
  const H = 1350;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  if (!g) return null;
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#0b1f3a'); bg.addColorStop(1, '#10324f');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  const glow = g.createRadialGradient(W / 2, 560, 40, W / 2, 560, 560);
  glow.addColorStop(0, rar.color + 'aa'); glow.addColorStop(1, rar.color + '00');
  g.fillStyle = glow; g.fillRect(0, 0, W, H);
  g.strokeStyle = rar.color; g.lineWidth = 10; g.strokeRect(36, 36, W - 72, H - 72);
  g.textAlign = 'center';
  g.fillStyle = rar.color; g.font = '700 54px system-ui, sans-serif';
  g.fillText((isXL(sp, item.w) ? 'XL · ' : '') + rar.label.toUpperCase(), W / 2, 150);
  g.imageSmoothingEnabled = false;
  drawFish(g, sp, W / 2, 570, 17);
  g.fillStyle = '#fff'; g.font = '800 92px system-ui, sans-serif';
  g.fillText(sp.name, W / 2, 940);
  g.fillStyle = rar.color; g.font = '800 120px system-ui, sans-serif';
  g.fillText(formatWeight(item.w), W / 2, 1070);
  g.fillStyle = 'rgba(255,255,255,0.75)'; g.font = '600 44px system-ui, sans-serif';
  g.fillText(player + ' · Lv' + level, W / 2, 1170);
  g.fillStyle = 'rgba(255,255,255,0.5)'; g.font = '600 36px system-ui, sans-serif';
  g.fillText('Komikita · Mancing', W / 2, 1240);
  return new Promise((res) => c.toBlob((b) => res(b), 'image/png'));
}

// >>> kartu-tangkapan (helper)
const RARITY_EN: Record<keyof typeof RARITY, string> = { mythic: 'Mythic', common: 'COMMON', uncommon: 'UNCOMMON', rare: 'RARE', epic: 'EPIC', legendary: 'LEGENDARY', divine: 'DIVINE', secret: 'SECRET' };
const LEN_FACTOR: Record<string, number> = { long: 5, oval: 4, round: 2.8, flat: 6, big: 4.2, shark: 6 };
// panjang perkiraan (cm) dari berat & bentuk ikan
function fishLengthCm(shape: string, kg: number): number {
  return Math.max(2, Math.round((LEN_FACTOR[shape] || 4) * Math.cbrt(Math.max(0.001, kg) * 1000)));
}
function formatLength(cm: number): string {
  return cm >= 100 ? (cm / 100).toFixed(1).replace('.', ',') + ' m' : cm + ' cm';
}
// kualitas tangkapan dari posisi berat dalam rentang spesiesnya
function qualityOf(ratio: number): { label: string; bg: string; fg: string; star: boolean } {
  if (ratio >= 0.9) return { label: 'Sempurna', bg: 'linear-gradient(180deg,#ffd45a,#f5a623)', fg: '#4a2c05', star: true };
  if (ratio >= 0.7) return { label: 'Besar', bg: 'linear-gradient(180deg,#9be7a8,#4fc772)', fg: '#0b3a1a', star: false };
  if (ratio >= 0.4) return { label: 'Sedang', bg: 'linear-gradient(180deg,#bfe0ff,#7fb8f0)', fg: '#0f2f55', star: false };
  if (ratio >= 0.15) return { label: 'Kecil', bg: 'linear-gradient(180deg,#e4e7ee,#c3c9d6)', fg: '#37404f', star: false };
  return { label: 'Mungil', bg: 'linear-gradient(180deg,#e4e7ee,#c3c9d6)', fg: '#37404f', star: false };
}
// "Peluang 1 dari N" untuk spesies ini (berdasar bobot rarity, tanpa ikan event)
function oddsOf(spId: string): number {
  const sp = SPECIES_BY_ID[spId];
  if (!sp || sp.eventOnly) return 0;
  const total = Object.values(RARITY).reduce((a, r) => a + r.weight, 0);
  const sameRarity = KSPECIES.filter((x) => x.rarity === sp.rarity && !x.eventOnly).length || 1;
  const p = RARITY[sp.rarity].weight / total / sameRarity;
  return Math.max(2, Math.round(1 / p));
}
const SPARKS: { x: number; y: number; s: number; d: number }[] = [
  { x: 8, y: 22, s: 11, d: 0 }, { x: 88, y: 12, s: 9, d: 0.6 }, { x: 18, y: 66, s: 8, d: 1.1 },
  { x: 82, y: 58, s: 12, d: 0.3 }, { x: 50, y: 4, s: 7, d: 0.9 },
];
// <<< kartu-tangkapan

export default function FishingGame(props: Props) {
  const { name, photo, crystal, xp, bag, rods, equippedRod } = props;
  const rod = rodAt(RODS_BY_ID[equippedRod] || RODS_BY_ID[DEFAULT_ROD], props.rodLv?.[equippedRod]);
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<FishingEngine | null>(null);
  const propsRef = useRef(props);
  propsRef.current = props;

  const [phase, setPhase] = useState<Phase>('idle');
  // selama lempar/tunggu/tarik/gulung, semua tampilan tambahan disembunyikan; tinggal tombol aksi
  const fishing = phase === 'cast' || phase === 'wait' || phase === 'bite' || phase === 'reel' || phase === 'catching';
  const [toast, setToast] = useState('');
  const [popup, setPopup] = useState<{ item: BagItem; gain: number; up: number; record: boolean } | null>(null);
  const [bagOpen, setBagOpen] = useState(false);
  const [held, setHeld] = useState<BagItem | null>(null);
  const [rodOut, setRodOutState] = useState(true); // joran di tangan (hotbar): bisa dipakai / disimpan
  const holdFish = (b: BagItem | null) => { setHeld(b); if (b) setRodOutState(false); };
  const releaseFish = () => { setHeld(null); setRodOutState(true); }; // lepas ikan → joran kembali ke tangan
  const toggleHold = (b: BagItem) => { if (held && held.id === b.id) releaseFish(); else holdFish(b); };
  const toggleRod = () => { if (rodOut) setRodOutState(false); else { setRodOutState(true); setHeld(null); } };
  const [sel, setSel] = useState('');
  const [shopOpen, setShopOpen] = useState(false);
  const [sellOpen, setSellOpen] = useState(false);
  const [nearShop, setNearShop] = useState(false);
  const [rodOpen, setRodOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [upgrading, setUpgrading] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const exitOkRef = useRef(false);
  // tombol back HP / browser: tampilkan "Yakin keluar?" dulu (history ditahan satu langkah)
  useEffect(() => {
    history.pushState({ fishGuard: true }, '');
    const onPop = () => {
      if (exitOkRef.current) return;
      history.pushState({ fishGuard: true }, '');
      setMenuOpen(false);
      setConfirmExit(true);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  // tombol back saat layar penuh: GameMode mengirim event ini (back pertama hanya menutup layar penuh)
  useEffect(() => {
    const onBack = () => { setMenuOpen(false); setConfirmExit(true); };
    window.addEventListener(GAME_BACK_EVENT, onBack);
    return () => window.removeEventListener(GAME_BACK_EVENT, onBack);
  }, []);
  const cancelExit = () => { cancelLeavingGame(); setConfirmExit(false); };
  const doExit = () => {
    if (exitingRef.current) return;
    exitingRef.current = true;
    markLeavingGame();
    exitOkRef.current = true;
    engineRef.current?.cancel();
    setConfirmExit(false);
    setExiting(true); // tampilan dibekukan + layar hitam, jadi putaran layar tidak terlihat glitch
    // beri waktu satu frame supaya layar hitam tampil dulu, lalu pindah halaman
    setTimeout(() => {
      try { history.go(-2); } catch { /* abaikan */ }
      // kalau tidak ada halaman sebelumnya, pakai jalur keluar biasa
      setTimeout(() => { if (location.pathname.includes('mancing')) props.onExit(); }, 600);
    }, 60);
  };
  const [shopTab, setShopTab] = useState<ShopTab>('toko');
  const [buying, setBuying] = useState('');
  const [pulling, setPulling] = useState(false);
  const [gachaResult, setGachaResult] = useState<{ rod: Rod; duplicate: boolean } | null>(null);
  const [gachaMulti, setGachaMulti] = useState<{ rod: Rod; duplicate: boolean }[] | null>(null);
  const [limitedDrops, setLimitedDrops] = useState<LimitedDrop[] | null>(null); // hasil buka Gacha Baju Limited
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [u, setU] = useState(1);
  const [status, setStatus] = useState<EngineStatus>({ shoal: null, inShoal: false });
  const [now, setNow] = useState(() => new Date());
  const [intro, setIntro] = useState(false); // tanpa petunjuk/notif saat baru masuk game
  const [fails, setFails] = useState(0);
  const [chat, setChat] = useState<{ who: string; msg: string; t: number; rl?: string }[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [buffOpen, setBuffOpen] = useState(true);
  const [bagSort, setBagSort] = useState<'baru' | 'nilai'>('baru');
  const [menu2, setMenu2] = useState(false);
  // ---- Mode Developer (auto fishing dll) ----
  const [auto, setAuto] = useState(false);
  const autoRef = useRef(false);
  const [sellMode, setSellMode] = useState<SellMode>('keep');
  const [speed, setSpeed] = useState(1);
  const [instant, setInstant] = useState(false);
  const [force, setForce] = useState<Rarity | ''>('');
  const [forceSize, setForceSize] = useState<SizeTier | ''>('');
  const [gachaMin, setGachaMin] = useState<Rarity | ''>(''); // Dev: gacha wangi
  const [gachaFree, setGachaFree] = useState(false);          // Dev: gacha gratis
  const [gachaRod, setGachaRod] = useState('');               // Dev: joran target gacha
  const [limitedMin, setLimitedMin] = useState<LimitedRarity | ''>(''); // Dev: rarity minimal Baju Limited
  const [devOpen, setDevOpen] = useState(false);
  const [dstats, setDstats] = useState<DevStats>(EMPTY_STATS);
  const sellBusy = useRef(false);
  // HP masih portrait (kunci landscape tidak diizinkan browser) → game diputar 90° sendiri,
  // tanpa layar penuh & tanpa pesan sistem. Tinggal putar HP. Kalau layar sudah landscape, tidak ada rotasi.
  const [vp, setVp] = useState({ w: 0, h: 0, touch: false });
  const [exiting, setExiting] = useState(false);
  const exitingRef = useRef(false);
  const rot = vp.touch && vp.h > vp.w; // hanya HP/tablet yang diputar; di komputer tidak
  const rotRef = useRef(false);
  rotRef.current = rot;
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | null = null;
    const apply = () => { if (!exitingRef.current) setVp({ w: window.innerWidth, h: window.innerHeight, touch: isTouchDevice() }); };
    // saat layar berputar, browser mengirim beberapa resize dengan ukuran setengah jadi → tunggu stabil dulu
    const upd = () => { if (t) clearTimeout(t); t = setTimeout(apply, 140); };
    apply();
    window.addEventListener('resize', upd);
    window.addEventListener('orientationchange', upd);
    return () => { if (t) clearTimeout(t); window.removeEventListener('resize', upd); window.removeEventListener('orientationchange', upd); };
  }, []);
  const toastT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const px = (n: number) => Math.round(n * u);
  // HUD (kartu profil, tombol, hotbar, tombol aksi) dikecilkan supaya tidak memenuhi layar
  const HUD_SCALE = 0.78;
  const hx = (n: number) => Math.round(n * u * HUD_SCALE);

  // petunjuk awal cukup tampil sebentar supaya tidak menutupi layar
  useEffect(() => {
    const t = setTimeout(() => setIntro(false), 5000);
    return () => clearTimeout(t);
  }, []);

  const say = useCallback((m: string) => {
    setToast(m);
    if (toastT.current) clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToast(''), 2200);
  }, []);

  // font game
  useEffect(() => {
    if (document.getElementById('komikita-fish-fonts')) return;
    const l = document.createElement('link');
    l.id = 'komikita-fish-fonts';
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Pixelify+Sans:wght@500;700&display=swap';
    document.head.appendChild(l);
  }, []);

  // mesin
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const engine = new FishingEngine(canvas, {
      onPhase: (p) => { setPhase(p); if (p !== 'idle') setIntro(false); },
      onToast: (m) => { if (/kabur|lepas/i.test(m)) setFails((f) => f + 1); say(m); },
      onBite: () => { try { navigator.vibrate?.(60); } catch { /* abaikan */ } },
      onNearShop: (n) => setNearShop(n),
      onRodOut: () => { setRodOutState(true); setHeld(null); },
      onAuto: (on) => { autoRef.current = on; setAuto(on); if (on) { setPopup(null); setDstats((d) => (d.since ? d : { ...d, since: Date.now() })); } },
      onCatch: (c: Catch) => {
        const item: BagItem = { id: newId(), s: c.species.id, w: c.weight };
        const curRod = rodAt(RODS_BY_ID[propsRef.current.equippedRod] || RODS_BY_ID[DEFAULT_ROD], propsRef.current.rodLv?.[propsRef.current.equippedRod]);
        const gain = xpFor(c.species, c.weight, curRod.xp);
        const before = levelFromXp(propsRef.current.xp).level;
        const after = levelFromXp(propsRef.current.xp + gain).level;
        let record = false;
        try {
          const best = JSON.parse(localStorage.getItem('komikita-fish-best') || '{}');
          if (!best[c.species.id] || c.weight > best[c.species.id]) { record = !!best[c.species.id]; best[c.species.id] = c.weight; localStorage.setItem('komikita-fish-best', JSON.stringify(best)); }
        } catch { /* abaikan */ }
        propsRef.current.onCatch(item, gain);
        setFails(0);
        setChat((l) => [...l.slice(-19), { who: propsRef.current.name || 'Tamu', rl: cleanNameRole(propsRef.current.role), msg: 'dapat ' + c.species.name + ' ' + formatWeight(c.weight) + ' 🎣', t: Date.now() }]);
        if (autoRef.current) {
          // auto fishing: tanpa popup (engine menutup hasil sendiri), cukup catat statistik & kabari yang penting
          const sp = c.species;
          const ridx = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'divine', 'secret'].indexOf(sp.rarity);
          const rank = ridx * 100000 + Math.min(99999, c.weight);
          setDstats((d) => ({
            ...d, catches: d.catches + 1, xp: d.xp + gain, rare: d.rare + (ridx >= 2 ? 1 : 0), last: Date.now(),
            ...(sizeTier(sp, c.weight) === 'besar' ? { big: d.big + 1 } : sizeTier(sp, c.weight) === 'sedang' ? { mid: d.mid + 1 } : { small: d.small + 1 }),
            ...(rank > d.bestRank ? { best: sp.name + ' ' + formatWeight(c.weight), bestRank: rank } : {}),
          }));
          if (after > before) say('Level naik ke ' + after + '!');
          else if (ridx >= 3) say((ridx === 6 ? '🔮 SECRET! ' : ridx === 5 ? '🌠 DIVINE! ' : ridx === 4 ? '🌟 ' : '✨ ') + sp.name + ' ' + formatWeight(c.weight));
        } else {
          setPopup({ item, gain, up: after > before ? after : 0, record });
        }
      },
    });
    engineRef.current = engine;
    try {
      const sz = parseFloat(localStorage.getItem('komikita-fish-zoom') || '');
      engine.setZoom(Number.isFinite(sz) ? sz : 0.55);
    } catch { /* abaikan */ }
    const saveZoom = () => { try { localStorage.setItem('komikita-fish-zoom', String(engine.getZoom())); } catch { /* abaikan */ } };
    const applyZoom = (z: number) => engine.setZoom(z);

    // cubit dua jari di area kosong layar = zoom; roda mouse juga bisa
    const pts = new Map<number, { x: number; y: number }>();
    let pinch0 = 0;
    let zoom0 = 1;
    const pinchDist = () => {
      const [a, b] = Array.from(pts.values());
      return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
    };
    const pdown = (e: PointerEvent) => {
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      try { canvas.setPointerCapture(e.pointerId); } catch { /* abaikan */ }
      if (pts.size === 2) { pinch0 = pinchDist() || 1; zoom0 = engine.getZoom(); }
    };
    const pmove = (e: PointerEvent) => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2 && pinch0 > 0) applyZoom(zoom0 * (pinchDist() / pinch0));
    };
    const pup = (e: PointerEvent) => {
      if (!pts.delete(e.pointerId)) return;
      if (pts.size < 2) { if (pinch0 > 0) saveZoom(); pinch0 = 0; }
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      applyZoom(engine.getZoom() * (e.deltaY < 0 ? 1.1 : 1 / 1.1));
      saveZoom();
    };
    canvas.addEventListener('pointerdown', pdown);
    canvas.addEventListener('pointermove', pmove);
    canvas.addEventListener('pointerup', pup);
    canvas.addEventListener('pointercancel', pup);
    canvas.addEventListener('wheel', wheel, { passive: false });

    const fit = () => {
      const r = { width: wrap.offsetWidth, height: wrap.offsetHeight };
      setU(Math.max(0.8, Math.min(1.7, r.height / 360)));
      engine.resize(Math.max(1, Math.floor(r.width)), Math.max(1, Math.floor(r.height)), Math.min(window.devicePixelRatio || 1, 3));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);
    engine.start();
    const poll = setInterval(() => { setStatus(engine.status()); setNow(new Date()); }, 250);

    const kd = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); engine.action(true); return; }
      if (e.code === 'Escape') { engine.cancel(); return; }
      if (e.code === 'KeyP' && propsRef.current.dev) { engine.setAuto(!engine.auto); return; }
      if (e.key === '+' || e.key === '=') { applyZoom(engine.getZoom() * 1.2); saveZoom(); return; }
      if (e.key === '-' || e.key === '_') { applyZoom(engine.getZoom() / 1.2); saveZoom(); return; }
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      engine.key(e.code, true);
    };
    const ku = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') { engine.action(false); return; }
      engine.key(e.code, false);
    };
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    return () => {
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
      clearInterval(poll);
      canvas.removeEventListener('pointerdown', pdown);
      canvas.removeEventListener('pointermove', pmove);
      canvas.removeEventListener('pointerup', pup);
      canvas.removeEventListener('pointercancel', pup);
      canvas.removeEventListener('wheel', wheel);
      ro.disconnect();
      engine.destroy();
      engineRef.current = null;
    };
  }, [say]);

  const lv = levelFromXp(xp);
  const outfit = props.outfit ?? DEFAULT_OUTFIT;
  const [online, setOnline] = useState(1);
  const [chatText, setChatText] = useState('');
  const netRef = useRef<{ send: (m: string) => void } | null>(null);
  // mabar: satu ruangan untuk semua pemain
  useEffect(() => {
    let net: { stop: () => void; send: (m: string) => void } | null = null;
    let off: (() => void) | null = null;
    let dead = false;
    getFirebase().then(({ auth, db }: any) => {
      if (dead) return;
      off = auth.onAuthStateChanged((u: any) => {
        if (net) { net.stop(); net = null; netRef.current = null; }
        if (!u || dead) { setOnline(1); return; }
        net = startFishingNet({
          db, uid: u.uid, room: propsRef.current.room,
          getSelf: () => ({ role: cleanNameRole(propsRef.current.role), name: propsRef.current.name || u.displayName || 'Tamu', level: levelFromXp(propsRef.current.xp).level, rodId: propsRef.current.equippedRod, outfit: encodeOutfit(propsRef.current.outfit ?? DEFAULT_OUTFIT) }),
          getPose: () => (engineRef.current ? engineRef.current.netPose() : null),
          onPlayers: (l) => { engineRef.current?.setRemotes(l); setOnline(l.length + 1); },
          onChat: (m) => { setChat((c) => [...c.slice(-19), { who: m.who, rl: m.rl, msg: m.msg, t: Date.now() }]); engineRef.current?.setBubble(m.mine ? 'me' : m.uid, m.msg); },
          onOffset: (ms) => engineRef.current?.setClockOffset(ms),
        });
        netRef.current = net;
      });
    }).catch(() => {});
    return () => { dead = true; if (off) off(); if (net) net.stop(); netRef.current = null; };
  }, []);

  // sinkron level, joran (luck), tas penuh, & profil
  useEffect(() => {
    engineRef.current?.setLevel(lv.level);
    engineRef.current?.setLuck(rod.luck);
    engineRef.current?.setEase(rodEase(rod.power));
    engineRef.current?.setRodPower(rod.power);
    engineRef.current?.setBagFull(bag.length >= BAG_MAX);
    engineRef.current?.setProfile({ name: name || 'Tamu', title: titleOf(lv.level, outfit.ttl), level: lv.level, rodName: rod.name, rodId: rod.id, outfit, role: cleanNameRole(props.role) });
  }, [lv.level, bag.length, rod.luck, rod.power, rod.name, rod.id, name, outfit, props.role]);

  // ikan yang dipegang karakter (pamer)
  useEffect(() => {
    const sp = held ? SPECIES_BY_ID[held.s] : null;
    engineRef.current?.setHeld(held && sp ? { species: sp, weight: held.w } : null);
  }, [held]);
  useEffect(() => { engineRef.current?.setRodOut(rodOut); }, [rodOut]);

  // ---- Mode Developer: sinkron pengaturan ke engine, jaga layar tetap nyala, auto-jual ----
  const dev = !!props.dev;
  useEffect(() => {
    const e = engineRef.current;
    if (!e) return;
    e.setTimeScale(dev ? speed : 1);
    e.setInstantBite(dev && instant);
    e.setForceRarity(dev && force ? force : null);
    e.setForceSize(dev && forceSize ? forceSize : null);
    if (!dev) e.setAuto(false);
  }, [dev, speed, instant, force, forceSize]);

  useEffect(() => {
    if (!auto) return;
    let lock: { release: () => Promise<void> } | null = null;
    const wl = (navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }).wakeLock;
    wl?.request('screen').then((l) => { lock = l; }).catch(() => { /* tidak didukung / ditolak */ });
    return () => { lock?.release().catch(() => {}); };
  }, [auto]);

  useEffect(() => {
    if (!dev || !auto || sellMode === 'off' || sellBusy.current) return;
    if (bag.length < Math.max(5, BAG_MAX - 3)) return;
    const ids = bag.filter((b) => { const sp = SPECIES_BY_ID[b.s]; return sellMode === 'all' || !sp || !isShowoff(sp, b.w); }).map((b) => b.id);
    if (!ids.length) { engineRef.current?.setAuto(false); say('Tas penuh isi ikan pamer, auto berhenti'); return; }
    sellBusy.current = true;
    propsRef.current.onSell(ids)
      .then((got) => { if (got > 0) { setDstats((d) => ({ ...d, sold: d.sold + got })); say('Auto-jual +' + formatNum(got) + ' Crystal'); } })
      .catch(() => { /* onSell sudah menampilkan pesan gagal */ })
      .finally(() => { sellBusy.current = false; });
  }, [dev, auto, sellMode, bag, say]);

  // joystick
  const joyRef = useRef<HTMLDivElement>(null);
  const joyActive = useRef(false);
  const joyMove = (e: RPointerEvent<HTMLDivElement>) => {
    const el = joyRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const max = r.width / 2 - r.width * 0.2;
    let dx = e.clientX - (r.left + r.width / 2);
    let dy = e.clientY - (r.top + r.height / 2);
    if (rotRef.current) { const t = dx; dx = dy; dy = -t; }
    const m = Math.hypot(dx, dy);
    if (m > max) { dx = (dx / m) * max; dy = (dy / m) * max; }
    setKnob({ x: dx, y: dy });
    engineRef.current?.setMove(dx / max, dy / max);
  };
  const joyDown = (e: RPointerEvent<HTMLDivElement>) => { joyActive.current = true; e.currentTarget.setPointerCapture(e.pointerId); joyMove(e); };
  const joyUp = () => { joyActive.current = false; setKnob({ x: 0, y: 0 }); engineRef.current?.setMove(0, 0); };

  useEffect(() => { if (fishing) joyUp(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [fishing]);

  const buyRod = async (id: string) => {
    setBuying(id);
    const res = await props.onBuyRod(id);
    if (res === 'ok') say('Joran dibeli & dipakai!');
    else if (res === 'kurang') say('Crystal kurang buat joran ini');
    else say('Gagal membeli, coba lagi');
    setBuying('');
  };
  const upgradeRod = async (id: string) => {
    if (upgrading || !props.onUpgradeRod) return;
    setUpgrading(id);
    const res = await props.onUpgradeRod(id);
    if (res === 'ok') say('Joran naik level!');
    else if (res === 'kurang') say('Crystal kurang buat upgrade');
    else if (res === 'maks') say('Level joran sudah maksimal');
    else say('Gagal upgrade, coba lagi');
    setUpgrading('');
  };
  const pullGachaN = async (n: 1 | 5) => {
    if (pulling) return;
    setPulling(true);
    const got: { rod: Rod; duplicate: boolean }[] = [];
    for (let i = 0; i < n; i++) {
      const res = await props.onGacha(props.dev ? { min: gachaMin, free: gachaFree, rod: gachaRod } : undefined);
      if (res === 'kurang') { say(got.length ? `Crystal habis, baru ${got.length}× terbuka` : 'Crystal kurang buat Gacha'); break; }
      if (res === 'gagal') { say('Gacha gagal, coba lagi'); break; }
      got.push(res);
    }
    if (got.length === 1) setGachaResult(got[0]);
    else if (got.length > 1) setGachaMulti(got);
    setPulling(false);
  };
  const claimStarter = async () => {
    const ok = await props.onClaimStarter?.();
    say(ok ? 'Paket Pemula diambil: 600 Crystal + Joran Fiber!' : 'Gagal mengambil paket, coba lagi');
  };
  const claimBait = async () => {
    const ok = await props.onClaimBait?.();
    say(ok ? 'Umpan Gratis diambil: 10 Cacing!' : 'Gagal mengambil umpan, coba lagi');
  };
  const closePopup = () => { setPopup(null); engineRef.current?.resume(); };
  const sell = async (ids: string[]) => {
    if (!ids.length) return;
    const got = await props.onSell(ids);
    if (got > 0 && held && ids.includes(held.id)) setHeld(null);
    if (got > 0) say('+' + formatNum(got) + ' Crystal');
    else if (got < 0) say('Login dulu buat jual ikan');
    return got;
  };
  const sellAll = async () => {
    const risky = bag.some((b) => { const s = SPECIES_BY_ID[b.s]; return s && isShowoff(s, b.w); });
    if (risky && !window.confirm('Ada ikan XL/Epik/Legendary di ransel. Tetap jual semua?')) return;
    await sell(bag.map((b) => b.id));
    setBagOpen(false);
  };
  // tombol menu "Layar penuh landscape": fullscreen dulu (pesan sistem Android muncul sebentar)
  const landscape = async () => {
    const o = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
      await o.lock?.('landscape');
    } catch { /* tanpa pemberitahuan: tampilan sudah diputar otomatis */ }
  };

  const share = async (item: BagItem) => {
    const blob = await makeShareCard(item, name || 'Tamu', lv.level);
    if (!blob) { say('Gagal membuat gambar'); return; }
    const sp = SPECIES_BY_ID[item.s];
    const file = new File([blob], 'tangkapan-' + sp.id + '.png', { type: 'image/png' });
    const text = `Aku dapat ${sp.name} ${formatWeight(item.w)}${isXL(sp, item.w) ? ' (XL)' : ''} di Komikita Mancing!`;
    try {
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav.canShare && nav.canShare({ files: [file] })) { await navigator.share({ files: [file], text }); return; }
    } catch { return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    say('Gambar disimpan, tinggal kamu pamerin!');
  };

  // ---------- turunan ----------
  const recent = useMemo(() => [...bag].reverse().slice(0, 8), [bag]);
  const sorted = useMemo(() => [...bag].sort((a, b) => fishPrice(SPECIES_BY_ID[b.s], b.w, rod.money) - fishPrice(SPECIES_BY_ID[a.s], a.w, rod.money)), [bag, rod.money]);
  const total = bag.reduce((s, b) => s + fishPrice(SPECIES_BY_ID[b.s], b.w, rod.money), 0);
  const shownBag = bagSort === 'baru' ? [...bag].reverse() : sorted;
  const selItem = bag.find((b) => b.id === sel) || shownBag[0];
  const off = now.getTimezoneOffset();
  const tz = off === -420 ? 'WIB' : off === -480 ? 'WITA' : off === -540 ? 'WIT' : 'GMT' + (off <= 0 ? '+' : '-') + Math.abs(off / 60);
  const dateStr = new Intl.DateTimeFormat('id-ID', { weekday: 'short', day: 'numeric', month: 'short' }).format(now);
  const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace('.', ':');
  const luckPct = Math.round((rod.luck + (status.inShoal ? 2 : 0)) * 100);
  const mmss = (s: number) => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');

  const btnLabel = phase === 'idle' ? 'Mancing' : phase === 'cast' || phase === 'wait' ? 'Angkat' : phase === 'bite' ? 'Strike!' : phase === 'reel' ? 'Tarik' : '...';
  const btnBg = phase === 'bite' ? 'radial-gradient(circle at 40% 30%,#ff9d8a,#ee6b57)' : phase === 'reel' ? 'radial-gradient(circle at 40% 28%,#33a850,#1b7a36)' : phase === 'cast' || phase === 'wait' ? 'radial-gradient(circle at 40% 28%,#a7b1c0,#707c8f)' : 'radial-gradient(circle at 40% 28%,#3f73ba,#274f8d)';
  const btnSz = phase === 'reel' ? 108 : 92;

  const circleBtn: CSSProperties = { width: hx(40), height: hx(40), borderRadius: '50%', background: PANEL, border: `${hx(2)}px solid ${GOLD}88`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 };
  const pillBox: CSSProperties = { background: CREAM_BG, borderRadius: hx(18), border: `${hx(2)}px solid ${CREAM_EDGE}`, boxShadow: `0 ${hx(3)}px 0 #d9c08a`, color: CREAM_INK, fontFamily: HUD };
  // slot hotbar: kotak membulat biru-abu gelap, bingkai tebal (putih = terpilih, warna = kelangkaan)
  const slot = (selected: boolean, color: string): CSSProperties => ({
    position: 'relative', width: hx(56), height: hx(56), borderRadius: hx(15), boxSizing: 'border-box',
    background: 'linear-gradient(180deg,rgba(66,100,110,0.94),rgba(40,66,76,0.96))',
    border: `${hx(3.2)}px solid ${selected ? '#eef2f4' : color}`,
    boxShadow: selected ? `0 0 0 ${hx(2)}px rgba(104,124,132,0.95), 0 ${hx(3)}px 0 rgba(0,0,0,0.3)` : `0 ${hx(3)}px 0 rgba(0,0,0,0.3)`,
    display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto', cursor: 'pointer', padding: 0,
  });
  const xlTag = (): CSSProperties => ({ position: 'absolute', top: hx(-5), right: hx(-4), background: '#f08a24', color: '#fff', fontSize: hx(8.5), fontWeight: 700, borderRadius: hx(4), padding: `0 ${hx(3.5)}px`, zIndex: 1, border: `${hx(1)}px solid rgba(255,255,255,0.55)` });
  const wLabel = (): CSSProperties => ({ position: 'absolute', bottom: hx(2), left: 0, right: 0, textAlign: 'center', fontFamily: '"Pixelify Sans", ui-monospace, monospace', fontSize: hx(12), fontWeight: 700, lineHeight: 1, color: '#fff', textShadow: '-1px 0 #1d2d33, 1px 0 #1d2d33, 0 -1px #1d2d33, 0 1px #1d2d33, 0 2px 0 #1d2d33' });
  const wl = (w: number) => formatWeight(w).replace(' ', '');
  const ringBtn = (ring: string): CSSProperties => ({
    width: hx(33), height: hx(33), borderRadius: '50%', boxSizing: 'border-box', background: CREAM_BG, border: `${hx(2)}px solid ${CREAM_EDGE}`,
    boxShadow: `0 ${hx(3)}px 0 ${ring}`, color: CREAM_INK, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, flex: '0 0 auto', margin: hx(2),
  });
  const sqBtn: CSSProperties = {
    width: hx(40), height: hx(40), borderRadius: hx(12), boxSizing: 'border-box', background: CREAM_BG, border: `${hx(2)}px solid ${CREAM_EDGE}`,
    boxShadow: `0 ${hx(3)}px 0 #d9c08a`, color: CREAM_INK, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, flex: '0 0 auto',
  };
  const soon = () => say('Fitur ini segera hadir');
  const dockPill = (accent: string): CSSProperties => ({
    ...pillBox, display: 'flex', alignItems: 'center', gap: hx(6), height: hx(32), boxSizing: 'border-box', borderRadius: hx(16), border: `${hx(2)}px solid ${CREAM_EDGE}`,
    boxShadow: `0 ${hx(3)}px 0 ${accent}`, marginBottom: hx(3),
  });
  const chipSt = (white: boolean, hi = false): CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: hx(4), height: hx(26), boxSizing: 'border-box', padding: `0 ${hx(11)}px`, borderRadius: 99,
    background: white ? '#fff8e8' : 'rgba(22,20,20,0.94)', color: white ? '#1d3a24' : hi ? '#7dffa5' : '#fff', border: `${hx(1.5)}px solid ${white ? '#f1e2bd' : '#2c2828'}`,
    fontSize: hx(15), fontWeight: 800, boxShadow: `0 ${hx(2)}px 0 rgba(0,0,0,0.3)`, whiteSpace: 'nowrap',
  });
  const ov: CSSProperties = { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 30 };

  const guide = status.shoal;
  const rotate = guide ? (guide.ang * 180) / Math.PI + 90 : 0;

  return (
    <div ref={wrapRef} style={{ position: 'fixed', ...(rot ? { top: 0, left: vp.w, width: vp.h, height: vp.w, transform: 'rotate(90deg)', transformOrigin: 'top left' } : { inset: 0 }), zIndex: 70, userSelect: 'none', overflow: 'hidden', background: '#2872b4', color: '#fff', touchAction: 'none', fontFamily: HUD, opacity: vp.w > 0 ? 1 : 0, transition: 'opacity .25s ease' }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0 }} />
      {exiting && <div style={{ position: 'absolute', inset: 0, background: '#0b1a2b', zIndex: 200 }} />}

      {/* kiri atas: kartu pemain + pulau, lalu deretan tombol (chat, mic, headset, emoji) */}
      <div style={{ position: 'absolute', left: `calc(env(safe-area-inset-left, 0px) + ${hx(6)}px)`, top: `calc(env(safe-area-inset-top, 0px) + ${hx(6)}px)`, display: fishing ? 'none' : 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: hx(8) }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: hx(8) }}>
          <div role="button" aria-label="Buka profil" onClick={() => setProfileOpen(true)} style={{ ...pillBox, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: hx(8), width: hx(215), height: hx(72), boxSizing: 'border-box', padding: `${hx(8)}px ${hx(10)}px ${hx(8)}px ${hx(7)}px`, borderRadius: hx(36) }}>
            <div style={{ width: hx(44), height: hx(44), borderRadius: '50%', overflow: 'hidden', border: `${hx(2.5)}px solid ${CREAM_EDGE}`, boxSizing: 'border-box', background: '#35405c', flex: '0 0 auto' }}>
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo} alt="" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : null}
            </div>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: hx(14.5), fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', lineHeight: 1.25, paddingTop: hx(1), display: 'flex', alignItems: 'center', gap: hx(4) }}><RoleName role={props.role} nameStyle={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{name || 'Tamu'}</RoleName></div>
              {roleLabel(props.role) ? (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: hx(3), marginTop: hx(2), padding: `0 ${hx(8)}px`, borderRadius: 99, background: props.role === 'dev' ? 'linear-gradient(90deg,#22d3ee,#818cf8,#e879f9)' : props.role === 'admin' ? 'linear-gradient(90deg,#ff6b6b,#ffd0d0,#e5383b)' : 'linear-gradient(90deg,#f5c84b,#fff3b0,#ff9a3c)', border: `${hx(1.5)}px solid rgba(255,255,255,.85)`, fontSize: hx(11.5), fontWeight: 800, color: props.role === 'premium' ? '#3b2a05' : props.role === 'admin' ? '#fff' : '#0b0b14', lineHeight: 1.35, whiteSpace: 'nowrap', maxWidth: '100%' }}>{roleLabel(props.role)}</div>
              ) : (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: hx(3), marginTop: hx(2), padding: `0 ${hx(7)}px`, borderRadius: 99, background: '#e6f6df', border: `${hx(1.5)}px solid #5fbf6a`, fontSize: hx(11.5), fontWeight: 800, color: '#1f7a35', lineHeight: 1.35, whiteSpace: 'nowrap', maxWidth: '100%' }}><BoatIcon size={hx(12)} />{titleOf(lv.level, outfit.ttl)}</div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: hx(5), marginTop: hx(2) }}>
                <span style={{ fontSize: hx(11.5), fontWeight: 800, color: '#2b7fc2' }}>Lv{lv.level}</span>
                <div style={{ flex: 1, height: hx(5), borderRadius: hx(3), background: '#eadfc4', overflow: 'hidden' }}>
                  <div style={{ width: Math.min(100, (lv.into / lv.need) * 100) + '%', height: '100%', background: 'linear-gradient(90deg,#2fbf8a,#6fdc8c)' }} />
                </div>
                <span style={{ fontSize: hx(11), fontWeight: 700, color: '#9a7a4e', whiteSpace: 'nowrap' }}>{lv.into}/{lv.need}</span>
              </div>
            </div>
          </div>
          <button onClick={() => say('Pemain online: ' + online)} aria-label="Pulau" style={{ ...pillBox, display: 'flex', alignItems: 'center', gap: hx(6), height: hx(42), boxSizing: 'border-box', padding: `0 ${hx(6)}px 0 ${hx(10)}px`, borderRadius: hx(21), cursor: 'pointer', fontSize: hx(15), fontWeight: 800 }}>
            <IslandIcon size={hx(24)} />Pulau
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: hx(4), background: '#f1e6c8', borderRadius: 99, padding: `${hx(3)}px ${hx(9)}px`, color: '#2b7fc2', fontSize: hx(15) }}><PeopleBlue size={hx(15)} />{online}</span>
          </button>
        </div>
        <div style={{ display: 'flex', gap: hx(8) }}>
          <button onClick={() => setChatOpen((o) => !o)} aria-label="Chat" style={sqBtn}><ChatInk size={hx(22)} /></button>
          <button onClick={soon} aria-label="Mikrofon" style={sqBtn}><MicInk size={hx(22)} /></button>
          <button onClick={soon} aria-label="Suara" style={sqBtn}><HeadsetInk size={hx(22)} /></button>
          <button onClick={soon} aria-label="Emoji" style={sqBtn}><SmileInk size={hx(22)} /></button>
        </div>
      </div>

      {/* menu utama (tombol tiga garis) */}
      {menu2 && !fishing && (() => {
        const soon = () => say('Fitur ini segera hadir');
        const go = (path: string) => () => { window.location.assign(path); };
        const items: { k: string; icon: string; label: string; act: () => void }[] = [
          { k: 'rumahku', icon: 'rumahku', label: 'Rumahku', act: soon },
          { k: 'misi', icon: 'misi', label: 'Misi', act: go('/misi') },
          { k: 'hadiah', icon: 'hadiah', label: 'Hadiah', act: () => say('Belum ada hadiah hari ini 🎁') },
          { k: 'buku', icon: 'buku', label: 'Buku', act: soon },
          { k: 'peringkat', icon: 'peringkat', label: 'Peringkat', act: go('/ranking') },
          { k: 'lemari', icon: 'lemari', label: 'Lemari', act: soon },
          { k: 'skill', icon: 'skill', label: 'Skill', act: soon },
          { k: 'surat', icon: 'surat', label: 'Surat', act: soon },
        ];
        return (
          <>
            <div onClick={() => setMenu2(false)} style={{ position: 'absolute', inset: 0, zIndex: 25 }} />
            <div style={{ position: 'absolute', zIndex: 26, right: `calc(env(safe-area-inset-right, 0px) + ${hx(68)}px)`, top: `calc(env(safe-area-inset-top, 0px) + ${hx(56)}px)`, width: `min(${hx(376)}px, calc(100% - ${hx(140)}px))`, boxSizing: 'border-box', padding: hx(8), display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: hx(6), background: CREAM_BG, border: `${hx(3)}px solid ${CREAM_EDGE}`, borderRadius: hx(20), boxShadow: `0 ${hx(4)}px 0 #d9c08a, 0 8px 22px rgba(0,0,0,0.35)` }}>
              {items.map((it) => (
                <button key={it.k} onClick={() => { setMenu2(false); it.act(); }} style={{ height: hx(78), boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', gap: hx(4), padding: `${hx(9)}px ${hx(2)}px 0`, borderRadius: hx(14), border: `${hx(2)}px solid ${CREAM_EDGE}`, background: '#fff8e8', boxShadow: '0 2px 0 #d9c08a', color: CREAM_INK, fontFamily: HUD, fontWeight: 800, fontSize: hx(14.5), lineHeight: 1.1, cursor: 'pointer' }}>
                  <span style={{ height: hx(34), display: 'flex', alignItems: 'center', justifyContent: 'center' }}><PixIcon k={it.icon} size={hx(34)} /></span>
                  <span>{it.label}</span>
                </button>
              ))}
            </div>
          </>
        );
      })()}

      {/* chat */}
      {!fishing && (() => {
        const last = chat[chat.length - 1];
        const box: CSSProperties = { position: 'absolute', left: `calc(env(safe-area-inset-left, 0px) + ${hx(6)}px)`, top: `calc(env(safe-area-inset-top, 0px) + ${hx(134)}px)`, maxWidth: hx(277), boxSizing: 'border-box', background: 'transparent', padding: 0, fontSize: hx(13), fontWeight: 700, textShadow: '0 1px 2px rgba(0,0,0,0.7)' };
        const line = (m: { who: string; msg: string; rl?: string }, i: number) => (
          <div key={i} style={{ display: 'block', width: 'fit-content', maxWidth: '100%', boxSizing: 'border-box', background: 'rgba(24,30,22,0.46)', borderRadius: hx(13), padding: `${hx(3)}px ${hx(10)}px`, marginBottom: hx(3), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#fff' }}><span style={{ color: '#ffe9a8' }}><RoleName role={m.rl}>{m.who}</RoleName></span> : {m.msg}</div>
        );
        if (chatOpen) return (
          <div style={{ ...box, minWidth: hx(220), maxWidth: hx(300), pointerEvents: 'auto' }}>
            {chat.length ? chat.slice(-6).map(line) : <span style={{ color: 'rgba(255,255,255,0.6)' }}>Belum ada pesan</span>}
            <form onSubmit={(e) => { e.preventDefault(); if (!netRef.current) { say('Login dulu buat chat'); return; } netRef.current.send(chatText); setChatText(''); }} style={{ display: 'flex', gap: hx(4), marginTop: hx(4) }}>
              <input value={chatText} onChange={(e) => setChatText(e.target.value)} maxLength={80} placeholder="Ketik pesan..." onKeyDown={(e) => { e.stopPropagation(); e.nativeEvent.stopPropagation(); }} onKeyUp={(e) => { e.stopPropagation(); e.nativeEvent.stopPropagation(); }} style={{ flex: 1, minWidth: 0, borderRadius: hx(8), border: 0, padding: `${hx(3)}px ${hx(8)}px`, fontSize: hx(13), fontFamily: 'inherit', background: 'rgba(255,255,255,0.92)', color: '#222', outline: 'none' }} />
              <button type="submit" style={{ border: 0, borderRadius: hx(8), background: '#f6c445', color: '#3b2a00', fontWeight: 700, fontSize: hx(13), padding: `0 ${hx(10)}px`, cursor: 'pointer' }}>Kirim</button>
            </form>
            <div style={{ display: 'flex', gap: hx(6), marginTop: hx(5) }}>
              <span style={{ background: CREAM_BG, color: CREAM_INK, borderRadius: 99, padding: `${hx(4)}px ${hx(18)}px`, fontWeight: 800, fontSize: hx(13), boxShadow: '0 2px 0 #d9c08a' }}>Pulau</span>
              <button onClick={() => say('Chat Global segera hadir')} style={{ background: 'rgba(24,30,22,0.5)', color: '#fff', border: 0, borderRadius: 99, padding: `${hx(4)}px ${hx(18)}px`, fontWeight: 800, fontSize: hx(13), fontFamily: HUD, cursor: 'pointer' }}>Global</button>
            </div>
          </div>
        );
        if (last && Date.now() - last.t < 9000) return <div style={box}>{line(last, 0)}</div>;
        return null;
      })()}

      {/* kanan atas: mata uang + pengaturan; di bawahnya kartu lokasi dan kolom tombol (menu, toko, hadiah) */}
      <div style={{ position: 'absolute', right: `calc(env(safe-area-inset-right, 0px) + ${hx(10)}px)`, top: `calc(env(safe-area-inset-top, 0px) + ${hx(6)}px)`, display: fishing ? 'none' : 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: hx(8) }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: hx(6) }}>
          <div style={{ ...dockPill('#b08cff'), padding: `0 ${hx(14)}px 0 ${hx(10)}px`, marginBottom: 0, height: hx(40), borderRadius: hx(20) }}>
            <SparkIcon size={hx(20)} />
            <span style={{ fontSize: hx(16), fontWeight: 800, color: '#7a3fd0' }}>{formatNum(xp)}</span>
          </div>
          <div style={{ ...dockPill('#6bb6ff'), padding: `0 ${hx(5)}px 0 ${hx(11)}px`, gap: hx(7), marginBottom: 0, height: hx(40), borderRadius: hx(20) }}>
            <CrystalIcon size={hx(22)} />
            <span style={{ fontSize: hx(16), fontWeight: 800, color: '#1c6fe0' }}>{formatNum(crystal)}</span>
            <button onClick={() => setShopOpen(true)} aria-label="Tambah" style={{ width: hx(26), height: hx(26), borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%,#58e89a,#1fa85a)', border: `${hx(2)}px solid #fff`, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}><Svg d="M12 5v14M5 12h14" size={hx(14)} w={3.4} /></button>
          </div>
          <button onClick={() => setMenuOpen(true)} aria-label="Pengaturan" style={sqBtn}><GearInk size={hx(22)} /></button>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: hx(8) }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: hx(8) }}>
            <div style={{ ...pillBox, display: 'flex', alignItems: 'center', gap: hx(9), boxSizing: 'border-box', minWidth: hx(168), padding: `${hx(6)}px ${hx(14)}px ${hx(6)}px ${hx(8)}px`, borderRadius: hx(18) }}>
              <IslandIcon size={hx(28)} />
              <div>
                <div style={{ fontSize: hx(14.5), fontWeight: 800, lineHeight: 1.15, whiteSpace: 'nowrap' }}>{islandName(props.room || MAIN_ROOM)}</div>
                <div style={{ fontSize: hx(12.5), fontWeight: 600, color: '#9a7a4e', marginTop: hx(1), whiteSpace: 'nowrap' }}>{dateStr} · <b style={{ color: CREAM_INK }}>{timeStr}</b> {tz}</div>
              </div>
            </div>
            {guide && (
              <div style={{ display: 'flex', alignItems: 'center', gap: hx(8), background: 'rgba(255,252,242,0.96)', color: '#1a3a22', borderRadius: hx(14), padding: `${hx(6)}px ${hx(14)}px ${hx(6)}px ${hx(6)}px`, boxShadow: '0 2px 10px rgba(0,0,0,0.25)' }}>
                <div style={{ width: hx(34), height: hx(34), borderRadius: '50%', background: '#2fb35a', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
                  <svg width={hx(20)} height={hx(20)} viewBox="0 0 24 24" style={{ transform: `rotate(${rotate}deg)` }}><path d="M12 3l7 16-7-4-7 4z" fill="#fff" /></svg>
                </div>
                <div>
                  <div style={{ fontSize: hx(15), fontWeight: 700, color: guide.kind === 'raksasa' ? '#7c3aed' : guide.kind === 'hiu' ? '#c2410c' : '#1f8a45', lineHeight: 1.1 }}>{guide.kind === 'raksasa' ? '🐋 Bayangan Raksasa!' : guide.kind === 'hiu' ? '🦈 Hiu Legendary!' : 'Ada Gerombolan Ikan!'}</div>
                  <div style={{ fontSize: hx(12.5), fontWeight: 600 }}>{guide.dist} m · 🍀+200% · {mmss(guide.left)}</div>
                </div>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: hx(8) }}>
            <button onClick={() => setMenu2((o) => !o)} aria-label="Menu" style={sqBtn}><GridInk size={hx(22)} /></button>
            <button onClick={() => { setShopTab('toko'); setShopOpen(true); }} aria-label="Toko" style={sqBtn}><StoreInk size={hx(22)} /></button>
            <button onClick={() => say('Belum ada hadiah hari ini 🎁')} aria-label="Hadiah" style={sqBtn}><GiftIcon size={hx(22)} /></button>
          </div>
        </div>
      </div>

      {/* petunjuk */}
      {(HINT[phase] || (intro && phase === 'idle')) && !fishing && !popup && !bagOpen && (
        <div style={{ position: 'absolute', left: '50%', top: `calc(env(safe-area-inset-top, 0px) + ${hx(70)}px)`, transform: 'translateX(-50%)', maxWidth: '60%', pointerEvents: 'none', background: 'rgba(32,22,10,0.85)', border: '1px solid rgba(255,214,140,0.35)', borderRadius: hx(14), padding: `${hx(6)}px ${hx(14)}px`, fontSize: hx(14), fontWeight: 600, color: '#ffe9bf', textAlign: 'center' }}>
          {HINT[phase] || 'Hadapkan ke air, tahan Lempar. Lepas saat bar tinggi = lemparan jauh (penuh = mulai lagi)'}
        </div>
      )}
      {toast && <div style={{ position: 'absolute', left: '50%', top: hx(112), transform: 'translateX(-50%)', zIndex: 20, background: 'rgba(15,23,42,0.92)', borderRadius: 99, padding: `${hx(7)}px ${hx(16)}px`, fontSize: hx(14), fontWeight: 600, pointerEvents: 'none' }}>{toast}</div>}

      {/* joystick */}
      {!fishing && <div
        ref={joyRef}
        onPointerDown={joyDown}
        onPointerMove={(e) => joyActive.current && joyMove(e)}
        onPointerUp={joyUp}
        onPointerCancel={joyUp}
        style={{ position: 'absolute', left: `calc(env(safe-area-inset-left, 0px) + ${hx(9)}px)`, bottom: `calc(env(safe-area-inset-bottom, 0px) + ${hx(27)}px)`, width: hx(105), height: hx(105), borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: `${hx(2.5)}px solid rgba(255,255,255,0.6)`, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', touchAction: 'none' }}
      >
        <div style={{ width: hx(45), height: hx(45), borderRadius: '50%', background: 'rgba(255,255,255,0.9)', border: `${hx(2)}px solid #fff`, boxShadow: '0 2px 6px rgba(0,0,0,0.25)', boxSizing: 'border-box', transform: `translate(${knob.x}px, ${knob.y}px)` }} />
      </div>}

      {/* buff + hotbar ransel */}
      {!fishing && (() => {
        const chips = [
          { k: 'pow', icon: <CloverIcon size={hx(15)} color="#1f7a35" />, t: String(rod.power), white: true, hi: false, tint: '', edge: '' },
          { k: 'luck', icon: <CloverIcon size={hx(13)} />, t: '+' + luckPct + '%', white: false, hi: status.inShoal, tint: '#2f7d46', edge: '#58b676' },
          { k: 'money', icon: <CoinIcon size={hx(13)} />, t: '+' + Math.round(rod.money * 100) + '%', white: false, hi: false, tint: '#9a6a12', edge: '#d3a23a' },
          { k: 'xp', icon: <XpIcon size={hx(12)} />, t: '+' + Math.round(rod.xp * 100) + '%', white: false, hi: false, tint: '#2a5fae', edge: '#6a98e6' },
        ];
        return (
          <div style={{ position: 'absolute', left: '50%', bottom: `calc(env(safe-area-inset-bottom, 0px) + ${hx(12)}px)`, transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: hx(5) }}>
            <div style={{ display: 'flex', gap: hx(5), alignItems: 'center' }}>
              {chips.slice(0, buffOpen ? chips.length : 1).map((c) => (
                <span key={c.k} style={{ ...chipSt(c.white, c.hi), ...(c.tint ? { background: c.tint, border: `${hx(2)}px solid ${c.edge}`, color: '#fff' } : {}) }}>{c.icon}{c.t}</span>
              ))}
              <button onClick={() => setBuffOpen((o) => !o)} aria-label="Buff" style={{ width: hx(22), height: hx(22), borderRadius: '50%', background: '#1f6fe0', border: `${hx(2)}px solid #6aa8ff`, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}><Svg d={buffOpen ? 'M14 6l-6 6 6 6' : 'M10 6l6 6-6 6'} size={hx(12)} w={3.6} /></button>
            </div>
            <div style={{ display: 'flex', gap: hx(7), alignItems: 'flex-end' }}>
              <button style={slot(rodOut, '#4a9bff')} onClick={toggleRod} aria-label="Joran"><PixelRod id={rod.id} size={hx(46)} /></button>
              {recent.map((b) => {
                const sp = SPECIES_BY_ID[b.s];
                const xl = isXL(sp, b.w);
                return (
                  <button key={b.id} style={slot(!!held && held.id === b.id, rarityBorder(sp.rarity, xl))} onClick={() => toggleHold(b)} aria-label={sp.name}>
                    {xl && <span style={xlTag()}>XL</span>}
                    <FishIcon id={sp.id} scale={0.86 * u * HUD_SCALE} />
                    <span style={wLabel()}>{wl(b.w)}</span>
                  </button>
                );
              })}
              {held && !recent.some((r) => r.id === held.id) && (
                <button style={slot(true, '#34d27a')} onClick={releaseFish} aria-label="Lepas ikan">
                  <span style={{ fontSize: hx(24) }}>🙌</span>
                  <span style={wLabel()}>Lepas</span>
                </button>
              )}
              <button onClick={() => { setSel(''); setBagOpen(true); }} aria-label="Ransel" style={{ ...slot(false, CREAM_EDGE), background: CREAM_BG, borderColor: CREAM_EDGE, boxShadow: `0 ${hx(3)}px 0 #d9c08a`, marginLeft: hx(4) }}>
                <BagIcon size={hx(30)} />
                <span style={{ ...wLabel(), textShadow: 'none', color: bag.length >= BAG_MAX ? '#d6312f' : CREAM_INK, fontSize: hx(11.5) }}>{bag.length}/{BAG_MAX}</span>
              </button>
            </div>
          </div>
        );
      })()}

      {/* penghitung ikan lepas (x0) */}
      {!fishing && (
        <div style={{ position: 'absolute', right: `calc(env(safe-area-inset-right, 0px) + ${hx(88)}px)`, bottom: `calc(env(safe-area-inset-bottom, 0px) + ${hx(112)}px)`, display: 'flex', alignItems: 'center', gap: hx(5), height: hx(26), boxSizing: 'border-box', padding: `0 ${hx(12)}px 0 ${hx(8)}px`, borderRadius: 99, background: '#fbf1dc', border: `${hx(2)}px solid #d9c196`, boxShadow: '0 2px 0 rgba(120,90,40,0.45)', color: '#c2392b', fontWeight: 700, fontSize: hx(16) }}>
          <CrossRodIcon size={hx(20)} />×{fails}
        </div>
      )}

      {/* Belanja: muncul saat dekat Toko Mancing (satu-satunya toko fungsional) */}
      {nearShop && !fishing && !sellOpen && !shopOpen && !bagOpen && (
        <button
          onClick={() => setSellOpen(true)}
          aria-label="Belanja"
          style={{ position: 'absolute', zIndex: 20, right: `calc(env(safe-area-inset-right, 0px) + ${hx(14)}px)`, bottom: `calc(env(safe-area-inset-bottom, 0px) + ${hx(32 + btnSz + 14)}px)`, display: 'flex', alignItems: 'center', gap: hx(6), padding: `${hx(8)}px ${hx(18)}px`, borderRadius: 99, border: `${hx(3.5)}px solid #fff`, background: 'linear-gradient(180deg,#ffb23c,#f08a24)', color: '#fff', fontFamily: HUD, fontWeight: 800, fontSize: hx(17), textShadow: '0 2px 3px rgba(120,60,0,0.55)', boxShadow: '0 4px 0 rgba(150,80,10,0.65), 0 6px 16px rgba(0,0,0,0.35)', cursor: 'pointer' }}
        >
          <StoreInk size={hx(22)} />Belanja
        </button>
      )}

      {/* tombol aksi */}
      <div style={{ position: 'absolute', right: `calc(env(safe-area-inset-right, 0px) + ${hx(14)}px)`, bottom: `calc(env(safe-area-inset-bottom, 0px) + ${hx(32)}px)`, display: 'flex', alignItems: 'flex-end', gap: hx(10) }}>
        <button
          onPointerDown={(e) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); engineRef.current?.action(true); }}
          onPointerUp={() => engineRef.current?.action(false)}
          onPointerCancel={() => engineRef.current?.action(false)}
          className={phase === 'bite' ? 'komikita-pulse' : undefined}
          style={{ width: hx(btnSz), height: hx(btnSz), borderRadius: '50%', border: `${hx(4.5)}px solid #fff`, boxSizing: 'border-box', background: btnBg, color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: hx(1), boxShadow: '0 4px 0 rgba(20,60,140,0.6), 0 6px 16px rgba(0,0,0,0.35)', touchAction: 'none', cursor: 'pointer', padding: 0, fontFamily: HUD }}
        >
          {phase === 'idle' ? <FishRodIcon size={hx(32)} /> : phase === 'reel' ? null : <RodIcon size={hx(28)} color="#fff" />}
          <span style={{ fontSize: phase === 'reel' ? hx(22) : hx(17), fontWeight: 800, textShadow: '0 2px 3px rgba(20,40,100,0.6)' }}>{btnLabel}</span>
          {phase === 'reel' && <span style={{ fontSize: hx(10), fontWeight: 600, opacity: 0.92, marginTop: hx(-2) }}>tahan biar naik</span>}
        </button>
        {/* joran terpasang: ketuk untuk ganti */}
        <button onClick={() => setRodOpen(true)} aria-label="Joran" style={{ position: 'absolute', right: hx(74), top: hx(-34), width: hx(56), height: hx(56), borderRadius: '50%', padding: 0, cursor: 'pointer', background: CREAM_BG, border: `${hx(3)}px solid ${CREAM_EDGE}`, boxShadow: '0 3px 0 #d9c08a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <PixelRod id={rod.id} size={hx(44)} />
          <span style={{ position: 'absolute', left: hx(-8), top: hx(-12), display: 'inline-flex', alignItems: 'center', gap: hx(2), background: '#1f64cc', color: '#fff', border: `${hx(2)}px solid #8fc0ff`, borderRadius: 99, padding: `0 ${hx(8)}px`, fontSize: hx(14), fontWeight: 800, fontFamily: HUD }}>⚡{rod.power}</span>
        </button>
      </div>
      <style>{`@keyframes kpulse{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}.komikita-pulse{animation:kpulse .5s infinite}`}</style>

      {/* hasil tangkapan: kartu gaya referensi (ketuk di mana saja untuk menutup) */}
      {popup && (() => {
        const sp = SPECIES_BY_ID[popup.item.s];
        const rar = RARITY[sp.rarity];
        const price = fishPrice(sp, popup.item.w, rod.money);
        const len = formatLength(fishLengthCm(sp.shape, popup.item.w));
        const odds = oddsOf(sp.id);
        const pct = Math.min(100, Math.round((lv.into / Math.max(1, lv.need)) * 100));
        const rarName = sp.rarity.charAt(0).toUpperCase() + sp.rarity.slice(1);
        const INK = '#2f241a';
        const k = (n: number) => Math.round(n * u * 0.68);
        const chip = (bg: string, fg: string): CSSProperties => ({ display: 'inline-flex', alignItems: 'center', gap: k(4), background: bg, color: fg, fontWeight: 700, fontSize: k(13), borderRadius: 99, padding: `${k(3)}px ${k(11)}px`, border: `${k(1.5)}px solid rgba(0,0,0,0.06)` });
        const special = popup.up ? `Level naik! Lv ${popup.up}` : '';
        const cream = '#fdf5e4';
        const edge = `${k(4)}px solid #f4efe3`;
        return (
          <div style={{ ...ov, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(24,34,24,0.38)', backdropFilter: 'blur(2px)', overflow: 'hidden' }} onClick={closePopup}>
            <style>{`@keyframes kcardin{0%{transform:translateY(${k(16)}px) scale(.9);opacity:0}100%{transform:none;opacity:1}}@keyframes kfall{0%{transform:translateY(-12vh) rotate(0);opacity:1}100%{transform:translateY(112vh) rotate(540deg);opacity:.9}}@keyframes kray{to{transform:rotate(360deg)}}`}</style>
            <div style={{ position: 'absolute', width: '170vmax', height: '170vmax', left: '50%', top: '50%', marginLeft: '-85vmax', marginTop: '-85vmax', background: 'repeating-conic-gradient(rgba(255,255,255,0.16) 0deg 10deg, transparent 10deg 24deg)', animation: 'kray 40s linear infinite', pointerEvents: 'none' }} />
            {Array.from({ length: 26 }, (_, i) => (
              <span key={i} style={{ position: 'absolute', top: 0, left: `${(i * 37) % 100}%`, width: k(5), height: k(9), background: ['#ff6b9a', '#ffd23f', '#4ecdc4', '#7aa7ff', '#b28dff'][i % 5], animation: `kfall ${3.2 + (i % 5) * 0.7}s linear ${(i % 7) * 0.35}s infinite`, pointerEvents: 'none' }} />
            ))}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: k(10), animation: 'kcardin .28s ease-out' }}>
              <div style={{ position: 'relative', width: k(300) }}>
                <div style={{ position: 'absolute', top: k(-13), left: '50%', transform: 'translateX(-50%)', zIndex: 2, background: 'linear-gradient(180deg,#e9edf3,#c6cedb)', border: `${k(2)}px solid #f7f9fc`, borderRadius: 99, padding: `${k(2)}px ${k(18)}px`, fontWeight: 700, fontSize: k(14), color: '#3a4558', whiteSpace: 'nowrap', boxShadow: `0 ${k(2)}px 0 #9aa5b8` }}>{rarName}{odds ? ` · 1 in ${formatNum(odds)}` : ''}</div>
                <div style={{ borderRadius: k(22), border: edge, background: cream, boxShadow: `0 ${k(5)}px ${k(18)}px rgba(0,0,0,0.35), 0 0 ${k(30)}px ${rar.color}66`, padding: `${k(22)}px ${k(14)}px ${k(10)}px`, textAlign: 'center', color: INK }}>
                  {special && <div style={{ fontSize: k(12), fontWeight: 800, letterSpacing: k(1), color: '#c0561b', marginBottom: k(2) }}>{special}</div>}
                  <div style={{ position: 'relative', width: k(104), height: k(72), margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'radial-gradient(circle,#e4dfd3 0%,#efe9db 68%,transparent 70%)' }} />
                    <div style={{ position: 'relative' }}><FishIcon id={sp.id} scale={2.2 * u * 0.68} /></div>
                  </div>
                  <div style={{ fontSize: k(24), fontWeight: 800, lineHeight: 1.15, marginTop: k(6) }}>{sp.name}</div>
                  <div style={{ marginTop: k(2) }}>
                    <span style={{ fontSize: k(26), fontWeight: 800, color: '#c8322a' }}>{formatWeight(popup.item.w)}</span>{' '}
                    <span style={{ fontSize: k(13), fontWeight: 600, color: '#8b8374' }}>({len})</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: k(6), marginTop: k(7), flexWrap: 'wrap' }}>
                    <span style={chip('#e3efdb', '#3f6b34')}>● Pulau</span>
                    {popup.record && <span style={chip('#d9f2d6', '#2f7a35')}>Rekor baru</span>}
                    <span style={chip('#dcebfb', '#2a64b0')}>
                      <svg viewBox="0 0 20 20" width={k(13)} height={k(13)}><path d="M10 1l2.4 6.6L19 10l-6.6 2.4L10 19l-2.4-6.6L1 10l6.6-2.4z" fill="#4aa8ff" stroke="#2a78d0" strokeWidth="1.2" strokeLinejoin="round" /></svg>
                      Nilai {formatNum(price)}
                    </span>
                  </div>
                  <div style={{ marginTop: k(7), fontSize: k(11), color: '#a39b8b' }}>Ketuk untuk menutup</div>
                </div>
                <div style={{ margin: `${k(10)}px auto 0`, width: '92%', borderRadius: k(14), border: `${k(3)}px solid #f4efe3`, background: cream, padding: `${k(6)}px ${k(10)}px ${k(8)}px`, boxShadow: `0 ${k(3)}px ${k(10)}px rgba(0,0,0,0.3)` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: k(6) }}>
                    <span style={{ background: 'linear-gradient(180deg,#3b8cff,#1f64d6)', color: '#fff', fontWeight: 800, fontSize: k(12), borderRadius: 99, padding: `${k(1)}px ${k(9)}px`, whiteSpace: 'nowrap' }}>Lv {lv.level}</span>
                    <span style={{ background: '#dcebfb', color: '#2a64b0', fontWeight: 800, fontSize: k(12), borderRadius: 99, padding: `${k(1)}px ${k(8)}px`, whiteSpace: 'nowrap' }}>XP +{popup.gain}</span>
                    <span style={{ marginLeft: 'auto', fontSize: k(12), fontWeight: 700, color: '#6b6354', whiteSpace: 'nowrap' }}>{formatNum(lv.into)}/{formatNum(lv.need)}</span>
                  </div>
                  <div style={{ marginTop: k(5), height: k(9), borderRadius: 99, background: '#e7dcc4', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', borderRadius: 99, background: 'linear-gradient(180deg,#8be08f,#43b94f)', transition: 'width .6s ease-out' }} />
                  </div>
                </div>
              </div>
              <button onClick={(e) => { e.stopPropagation(); share(popup.item); }} style={{ marginTop: k(40), background: cream, color: INK, border: `${k(3)}px solid #f4efe3`, borderRadius: k(14), padding: `${k(6)}px ${k(12)}px`, fontWeight: 800, fontSize: k(14), boxShadow: `0 ${k(3)}px 0 #d9c08a`, cursor: 'pointer', fontFamily: 'inherit' }}>Share</button>
            </div>
          </div>
        );
      })()}

      {/* ransel penuh */}
      {bagOpen && (() => {
        const INK = '#2b3447';
        const stroke = `-1px 0 ${INK}, 1px 0 ${INK}, 0 -1px ${INK}, 0 1px ${INK}, 1px 1px 0 ${INK}, -1px -1px 0 ${INK}, 1px -1px 0 ${INK}, -1px 1px 0 ${INK}`;
        const SLOT_BG = '#68758f';
        const SLOT_EDGE = '#c3c7d1';
        const bc = (r: keyof typeof RARITY) => (r === 'common' ? SLOT_EDGE : r === 'uncommon' ? '#4fc261' : r === 'rare' ? '#4aa3ff' : r === 'epic' ? '#b48cff' : r === 'divine' ? '#7df9ff' : r === 'secret' ? '#e879f9' : '#f5c451');
        const nc = (r: keyof typeof RARITY) => (r === 'common' ? '#fff' : r === 'uncommon' ? '#a4f0a4' : r === 'rare' ? '#9ad0ff' : r === 'epic' ? '#d6bfff' : r === 'divine' ? '#b8fbff' : r === 'secret' ? '#f5c6ff' : '#ffd96a');
        const cb = (extra: CSSProperties = {}): CSSProperties => ({ border: `${px(2)}px solid ${CREAM_EDGE}`, borderRadius: px(13), background: CREAM_BG, color: '#6b4a2a', fontFamily: HUD, fontWeight: 700, fontSize: px(13), height: px(34), padding: `0 ${px(14)}px`, cursor: 'pointer', boxShadow: '0 3px 0 #d9c08a', display: 'inline-flex', alignItems: 'center', gap: px(4), boxSizing: 'border-box', whiteSpace: 'nowrap', ...extra });
        const cell = (b: BagItem, onClick: () => void, selected = false) => {
          const sp = SPECIES_BY_ID[b.s];
          const parts = sp.name.split(' ');
          const nameEl = sp.name.endsWith(' Emas') && parts.length > 1
            ? <>{parts.slice(0, -1).join(' ')}<br /><span style={{ color: '#ffd96a' }}>Emas</span></>
            : sp.name;
          return (
            <div key={b.id} style={{ position: 'relative', width: '100%', paddingTop: '100%' }}>
            <button onClick={onClick} style={{ position: 'absolute', inset: 0, borderRadius: px(14), background: SLOT_BG, border: `${px(3)}px solid ${selected ? '#fff' : bc(sp.rarity)}`, isolation: 'isolate', boxSizing: 'border-box', padding: 0, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden', boxShadow: sp.rarity === 'legendary' ? '0 0 0 2px rgba(245,196,81,0.35)' : sp.rarity === 'divine' ? '0 0 0 2px rgba(125,249,255,0.55)' : sp.rarity === 'secret' ? '0 0 0 2px rgba(232,121,249,0.6)' : 'none' }}>
              <span style={{ fontSize: px(9.5), fontWeight: 700, color: nc(sp.rarity), marginTop: px(2), textShadow: stroke, lineHeight: 1.02, maxWidth: '96%', textAlign: 'center', fontFamily: HUD, zIndex: 1 }}>{nameEl}</span>
              <span style={{ position: 'absolute', left: 0, right: 0, top: '50%', transform: 'translateY(-38%)', display: 'flex', justifyContent: 'center' }}><FishIcon id={sp.id} scale={0.95 * u} /></span>
              <span style={{ fontSize: px(13), fontWeight: 700, color: '#fff', marginBottom: px(1), textShadow: stroke, fontFamily: HUD, lineHeight: 1.1, zIndex: 1 }}>{wl(b.w)}</span>
            </button>
            </div>
          );
        };
        const emptySlot = (key: string, next: boolean) => <div key={key} style={{ position: 'relative', width: '100%', paddingTop: '100%' }}><div style={{ position: 'absolute', inset: 0, borderRadius: px(14), background: SLOT_BG, border: `${px(3)}px solid ${SLOT_EDGE}`, boxSizing: 'border-box', ...(next ? { outline: `${px(2.5)}px dashed #1478e8`, outlineOffset: px(1.5) } : {}) }} /></div>;
        const cells: (BagItem | null)[] = Array.from({ length: BAG_MAX }, (_, i) => shownBag[i] || null);
        const dsel = bag.find((x) => x.id === sel);
        const small = bag.filter((x) => !isShowoff(SPECIES_BY_ID[x.s], x.w));
        const hotCells: (BagItem | null)[] = Array.from({ length: 8 }, (_, i) => recent[i] || null);
        return (
          <div style={{ ...ov, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: HUD }} onClick={() => { if (sel) setSel(''); else setBagOpen(false); }}>
            <style>{`.kk-bag{scrollbar-width:thin;scrollbar-color:#1478e8 transparent}.kk-bag::-webkit-scrollbar{width:${px(7)}px}.kk-bag::-webkit-scrollbar-track{background:transparent}.kk-bag::-webkit-scrollbar-thumb{background:#1478e8;border-radius:99px}`}</style>
            <div style={{ width: `min(96%, ${px(740)}px)`, maxHeight: '96%', display: 'flex', flexDirection: 'column', background: '#fdf5e4', borderRadius: px(20), border: `${px(3)}px solid #173d86`, boxShadow: '0 10px 30px rgba(0,0,0,0.5)', overflow: 'hidden', boxSizing: 'border-box' }} onClick={(e) => e.stopPropagation()}>
              {/* header biru */}
              <div style={{ display: 'flex', alignItems: 'center', gap: px(9), background: 'linear-gradient(180deg,#1580ee,#0c66d0)', padding: `${px(7)}px ${px(12)}px`, borderBottom: `${px(3)}px solid #0b4fa8`, flex: '0 0 auto' }}>
                <span style={{ width: px(32), height: px(32), borderRadius: '50%', background: '#fff2d2', border: `${px(2.5)}px solid ${CREAM_EDGE}`, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}><BagIcon size={px(20)} /></span>
                <span style={{ color: '#fff', fontWeight: 600, fontSize: px(16), textShadow: '0 1px 0 rgba(0,0,0,0.25)' }}>Tas</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: px(8), background: CREAM_BG, color: '#8a7a64', fontWeight: 700, fontSize: px(15), borderRadius: 99, padding: `${px(3)}px ${px(8)}px ${px(3)}px ${px(15)}px`, boxShadow: '0 2px 0 #d9c08a' }}>
                  {bag.length}/{BAG_MAX}
                  <button onClick={() => say('Tambah slot tas segera hadir')} aria-label="Tambah slot" style={{ width: px(22), height: px(22), borderRadius: '50%', border: 0, background: '#1478e8', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}><Svg d="M12 5v14M5 12h14" size={px(13)} w={3.4} /></button>
                </span>
                <span style={{ marginLeft: 'auto' }} />
                <button onClick={() => { const n = bagSort === 'baru' ? 'nilai' : 'baru'; setBagSort(n); say(n === 'nilai' ? 'Urut: termahal' : 'Urut: terbaru'); }} style={cb()}>Urutkan</button>
                <button onClick={async () => { if (!small.length) { say('Tidak ada ikan biasa'); return; } if (window.confirm('Buang (jual) ' + small.length + ' ikan biasa? Ikan XL/Epik/Legendary aman.')) await sell(small.map((x) => x.id)); }} style={cb()}>
                  <svg width={px(14)} height={px(15)} viewBox="0 0 24 24" fill="none" stroke="#6b4a2a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" /></svg>Buang cepat
                </button>
                <button onClick={() => say('Nilai isi tas 💎' + formatNum(total) + ' · jual di Toko Mancing')} aria-label="Bantuan" style={cb({ width: px(34), padding: 0, justifyContent: 'center', fontSize: px(16), color: '#1478e8' })}>?</button>
                <button onClick={() => setBagOpen(false)} aria-label="Tutup" style={{ width: px(40), height: px(36), borderRadius: px(11), border: 0, background: 'linear-gradient(180deg,#e5533f,#cc3d2c)', boxShadow: '0 3px 0 #a62a1f', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, flex: '0 0 auto' }}><Svg d="M6 6l12 12M18 6L6 18" size={px(20)} w={3} /></button>
              </div>
              {/* grid tas */}
              <div style={{ position: 'relative', flex: '1 1 auto', minHeight: 0, padding: `${px(10)}px ${px(10)}px 0 ${px(14)}px`, display: 'flex' }}>
                <div id="kk-bag-grid" className="kk-bag" style={{ flex: 1, minHeight: 0, maxHeight: px(190), overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: px(6), alignContent: 'start', padding: `${px(3)}px ${px(8)}px ${px(40)}px ${px(2)}px` }}>
                  {cells.map((b, i) => b ? cell(b, () => setSel(b.id)) : emptySlot('e' + i, i === shownBag.length))}
                </div>
                <div style={{ position: 'absolute', left: px(14), right: px(20), bottom: 0, height: px(48), background: 'linear-gradient(180deg,rgba(253,245,228,0),#fdf5e4 85%)', pointerEvents: 'none' }} />
                <button onClick={() => { const el = document.getElementById('kk-bag-grid'); if (!el) return; if (el.scrollTop + el.clientHeight >= el.scrollHeight - 4) el.scrollTo({ top: 0, behavior: 'smooth' }); else el.scrollBy({ top: el.clientHeight * 0.7, behavior: 'smooth' }); }} style={{ position: 'absolute', left: '50%', bottom: px(2), transform: 'translateX(-50%)', border: 0, borderRadius: 99, background: 'linear-gradient(180deg,#1580ee,#0c66d0)', boxShadow: '0 3px 0 #0b4fa8', color: '#fff', fontFamily: HUD, fontWeight: 700, fontSize: px(14), padding: `${px(5)}px ${px(18)}px`, cursor: 'pointer' }}>▼ Lainnya</button>
              </div>
              {/* hotbar */}
              <div style={{ padding: `${px(4)}px ${px(14)}px ${px(10)}px`, flex: '0 0 auto' }}>
                <div style={{ fontSize: px(14), fontWeight: 700, color: '#8a6a4a', paddingBottom: px(3), borderBottom: `${px(2)}px dashed #e3d3ad`, marginBottom: px(7) }}>Hotbar</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: px(6) }}>
                  <div style={{ position: 'relative', width: '100%', paddingTop: '100%' }}><button onClick={toggleRod} aria-label="Joran" style={{ position: 'absolute', inset: 0, borderRadius: px(14), background: SLOT_BG, border: `${px(3.5)}px solid ${rodOut ? '#fff' : '#ffc531'}`, isolation: 'isolate', boxShadow: '0 0 0 2px rgba(255,197,49,0.28)', boxSizing: 'border-box', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <PixelRod id={rod.id} size={px(46)} />
                  </button></div>
                  {hotCells.map((b, i) => b ? cell(b, () => toggleHold(b), !!held && held.id === b.id) : emptySlot('h' + i, false))}
                </div>
              </div>
            </div>
            {dsel && (() => {
              const sp = SPECIES_BY_ID[dsel.s];
              const rar = RARITY[sp.rarity];
              const btn: CSSProperties = { borderRadius: px(10), border: 0, fontFamily: HUD, fontWeight: 700, fontSize: px(14), padding: `${px(8)}px 0`, cursor: 'pointer' };
              return (
                <div style={{ position: 'absolute', inset: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(20,24,40,0.45)' }} onClick={(e) => { e.stopPropagation(); setSel(''); }}>
                  <div style={{ width: px(230), borderRadius: px(16), border: `${px(3)}px solid ${rar.color}`, background: '#fff9ec', padding: px(10), textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'flex', justifyContent: 'center', background: SLOT_BG, borderRadius: px(12) }}><FishIcon id={sp.id} scale={2 * u} /></div>
                    <div style={{ fontSize: px(16), fontWeight: 700, color: '#3b2f1a', marginTop: px(5) }}>{sp.name}</div>
                    <div style={{ fontSize: px(12), fontWeight: 700, color: '#8a6d0f' }}>{rar.label} · {formatWeight(dsel.w)}</div>
                    <div style={{ display: 'grid', gap: px(6), marginTop: px(8) }}>
                      {isShowoff(sp, dsel.w) && <button onClick={() => share(dsel)} style={{ ...btn, background: 'linear-gradient(90deg,#c36bff,#f5c451)', color: '#1a1020' }}>Pamerkan</button>}
                      <button onClick={() => { toggleHold(dsel); setSel(''); setBagOpen(false); }} style={{ ...btn, background: '#38a3d8', color: '#fff' }}>{held && held.id === dsel.id ? 'Lepas ikan' : '🙌 Pegang'}</button>
                      <button onClick={() => { sell([dsel.id]); setSel(''); }} style={{ ...btn, background: '#f5a623', color: '#2a1d00' }}>Jual 💎{formatNum(fishPrice(sp, dsel.w, rod.money))}</button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        );
      })()}

      {/* menu pengaturan */}
      {confirmExit && (
        <div style={{ ...ov, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }} onClick={cancelExit}>
          <div style={{ width: px(300), maxWidth: '90%', background: '#141a28', borderRadius: px(20), padding: px(18), textAlign: 'center', color: '#fff', boxShadow: '0 12px 40px rgba(0,0,0,0.5)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontFamily: HUD, fontWeight: 800, fontSize: px(24) }}>Yakin keluar?</div>
            <div style={{ marginTop: px(6), fontSize: px(14), fontWeight: 600, color: 'rgba(255,255,255,0.65)' }}>Kamu akan meninggalkan pulau mancing.</div>
            <div style={{ display: 'flex', gap: px(10), marginTop: px(16) }}>
              <button onClick={cancelExit} style={{ flex: 1, borderRadius: px(12), border: 0, background: 'rgba(255,255,255,0.12)', color: '#fff', fontFamily: HUD, fontWeight: 700, fontSize: px(16), padding: `${px(11)}px 0`, cursor: 'pointer' }}>Tetap main</button>
              <button onPointerDown={markLeavingGame} onClick={doExit} style={{ flex: 1, borderRadius: px(12), border: 0, background: '#e11d48', color: '#fff', fontFamily: HUD, fontWeight: 700, fontSize: px(16), padding: `${px(11)}px 0`, cursor: 'pointer' }}>Ya, keluar</button>
            </div>
          </div>
        </div>
      )}

      {menuOpen && (
        <div style={{ ...ov, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setMenuOpen(false)}>
          <div style={{ width: px(260), background: '#141a28', borderRadius: px(18), padding: px(12), display: 'grid', gap: px(8) }} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => { setMenuOpen(false); landscape(); }} style={{ borderRadius: px(12), border: 0, background: 'rgba(255,255,255,0.1)', color: '#fff', fontFamily: HUD, fontWeight: 700, fontSize: px(15), padding: `${px(10)}px 0`, cursor: 'pointer' }}>Layar penuh landscape</button>
            <button onClick={() => { setMenuOpen(false); setConfirmExit(true); }} style={{ borderRadius: px(12), border: 0, background: '#e11d48', color: '#fff', fontFamily: HUD, fontWeight: 700, fontSize: px(15), padding: `${px(10)}px 0`, cursor: 'pointer' }}>Keluar dari game</button>
            <button onClick={() => setMenuOpen(false)} style={{ borderRadius: px(12), border: 0, background: 'transparent', color: 'rgba(255,255,255,0.6)', fontFamily: HUD, fontWeight: 600, fontSize: px(14), padding: `${px(6)}px 0`, cursor: 'pointer' }}>Tutup</button>
          </div>
        </div>
      )}

      {/* Profil: statistik, Lemari (ganti baju), Title */}
      {profileOpen && (
        <ProfileModal
          px={(n: number) => px(n * 0.64)} font={HUD} name={name || 'Tamu'} photo={photo} xp={xp} crystal={crystal} bag={bag} rods={rods}
          outfit={outfit} limitedOwned={props.limitedOwned} dev={!!props.dev} role={cleanNameRole(props.role)} onSave={(o) => props.onSaveOutfit?.(o)} onClose={() => setProfileOpen(false)}
        />
      )}

      {/* Joran (semua joran, level, pakai) */}
      {rodOpen && (
        <RodScreen
          px={(n: number) => px(n * 0.64)} font={HUD} crystal={crystal} rods={rods} rodLv={props.rodLv ?? {}} equippedRod={equippedRod}
          buying={buying} upgrading={upgrading}
          onClose={() => setRodOpen(false)} onBuy={buyRod} onEquip={props.onEquipRod} onUpgrade={upgradeRod}
        />
      )}

      {/* Jual Ikan (dibuka dari tombol Belanja di Toko Mancing) */}
      {sellOpen && (
        <SellFish
          px={px} font={HUD} bag={bag} money={rod.money} crystal={crystal}
          onSell={(ids) => sell(ids)}
          onClose={() => setSellOpen(false)}
          onOpenShop={() => { setSellOpen(false); setShopTab('toko'); setShopOpen(true); }}
          renderFish={(id, sc) => <FishIcon id={id} scale={sc * u * 0.9} />}
        />
      )}

      {/* Toko & Gacha */}
      {shopOpen && (
        <ShopScreen
          px={(n: number) => px(n * 0.64)} font={HUD} crystal={crystal} gems={props.gems ?? 0} onTopUp={props.onTopUp} onTopUpPoll={props.onTopUpPoll} onTopUpPaid={props.onTopUpPaid} onOpenLimited={props.onOpenLimited ? async (n) => { const r = await props.onOpenLimited!(n, !!props.dev && gachaFree, props.dev ? limitedMin : ''); if (Array.isArray(r)) setLimitedDrops(r); return r; } : undefined} limitedFree={!!props.dev && gachaFree} limitedPity={props.limitedPity} limitedOwned={props.limitedOwned} freeBaitClaimed={props.freeBaitClaimed} onClaimBait={claimBait} promoBought={props.promoBought} onPromoPaid={props.onPromoPaid} rods={rods} equippedRod={equippedRod}
          tab={shopTab} onTab={setShopTab} buying={buying} pulling={pulling}
          onClose={() => setShopOpen(false)} onBuy={buyRod} onEquip={props.onEquipRod} onPull={pullGachaN}
          pity={props.pity ?? 0} starterClaimed={!!props.starterClaimed} onClaimStarter={claimStarter}
        />
      )}

      {/* Dev Tools (hanya role Developer) */}
      {dev && (
        <>
          <DevFab px={px} rot={rot} getWrap={() => wrapRef.current} auto={auto} count={dstats.catches} open={devOpen} onTap={() => setDevOpen((o) => !o)} />
          {devOpen && (
            <DevTools
              px={px} rot={rot} getWrap={() => wrapRef.current} engine={engineRef.current}
              auto={auto} onAuto={(on) => engineRef.current?.setAuto(on)}
              sellMode={sellMode} setSellMode={setSellMode} speed={speed} setSpeed={setSpeed} instant={instant} setInstant={setInstant}
              force={force} setForce={setForce} forceSize={forceSize} setForceSize={setForceSize}
              gachaMin={gachaMin} setGachaMin={setGachaMin} gachaFree={gachaFree} setGachaFree={setGachaFree}
              gachaRod={gachaRod} setGachaRod={setGachaRod} limitedMin={limitedMin} setLimitedMin={setLimitedMin}
              rodPity={props.pity ?? 0} limitedPity={props.limitedPity ?? 0} rods={rods} crystal={crystal} gems={props.gems ?? 0}
              onGive={(k, v) => props.onDevGive?.(k, v) ?? Promise.resolve(false)} onPity={(k, n) => props.onDevPity?.(k, n) ?? Promise.resolve()}
              stats={dstats} resetStats={() => setDstats(EMPTY_STATS)} xp={xp} onSetXp={(v) => props.onSetXp?.(v)} onClose={() => setDevOpen(false)}
            />
          )}
        </>
      )}

      {/* animasi buka gacha + hasil */}
      {(gachaResult || gachaMulti) && (
        <GachaSpin
          key={gachaResult ? 'one-' + gachaResult.rod.id : 'multi-' + (gachaMulti?.map((g) => g.rod.id).join('') ?? '')}
          items={gachaResult ? [gachaResult] : gachaMulti!}
          px={px} font={HUD}
          onClose={() => { setGachaResult(null); setGachaMulti(null); }}
        />
      )}
      {limitedDrops && (
        <LimitedSpin
          key={'lim-' + limitedDrops.map((d) => d.key).join('')}
          items={limitedDrops} px={px} font={HUD}
          onClose={() => setLimitedDrops(null)}
        />
      )}
    </div>
  );
}
