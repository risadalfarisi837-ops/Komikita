'use client';

import { useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { GACHA_ODDS, GACHA_PITY, GACHA_PRICE, GACHA_RODS, RARITY, RODS, formatNum } from '@/lib/fishing';
import PixelRod from './RodArt';
import ShopBajuLimited from './ShopBajuLimited';
import { Sprite } from './ShopSprites';
import ShopTopUp from './ShopTopUp';
import ShopPay from './ShopPay';
import { PROMO_PACKS, packLocked } from '@/lib/promoPacks';
import type { PromoPackId } from '@/lib/promoPacks';
import type { LimitedDrop } from '@/lib/limitedGacha';
import type { QrOrder, TopUpPoll } from '@/lib/topupPacks';
import type { TopUpCurrency } from './ShopTopUp';

export type ShopTab = 'toko' | 'bajulimited' | 'gacha' | 'gachagaya' | 'gacharumah' | 'gaya' | 'pet' | 'aksesoris' | 'setaksesoris' | 'pass' | 'tas';

interface Props {
  px: (n: number) => number;
  font: string;
  crystal: number;
  gems?: number;
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
  onAddGems?: () => void;
  /** Buka langsung jendela top up (dari tombol + di HUD). */
  initialTopup?: 'crystal' | 'gems' | null;
  onPack?: (id: 'monthly' | 'monsun' | 'kenalan' | 'buah' | 'perdana' | 'lanjut' | 'bekal') => void;
  /** Opsional: waktu berakhir Paket Lanjut (ms). Kosong = akhir bulan. */
  lanjutEndsAt?: number;
  /** Dipanggil saat paket top up dibeli (Gems atau Crystal). */
  onTopUp?: (currency: TopUpCurrency, packId: string, amount: number, bonus: number, rupiah: number) => string | QrOrder | void | Promise<string | QrOrder | void>;
  onTopUpPoll?: (orderId: string) => Promise<TopUpPoll>;
  onTopUpPaid?: () => void;
  freeBaitClaimed?: boolean;
  onClaimBait?: () => void;
  promoBought?: Record<string, number>;
  onPromoPaid?: () => void;
  onOpenLimited?: (n: 1 | 10) => Promise<LimitedDrop[] | 'kurang' | 'gagal'>;
  /** Dev: buka peti Baju Limited tanpa potong Gems. */
  limitedFree?: boolean;
  /** Baju Limited: peti sejak Mythic terakhir, baju yang dimiliki ('night' | 'flame'), waktu banner berakhir (ms). */
  limitedPity?: number;
  limitedOwned?: string[];
  limitedEndsAt?: number;
}

const BROWN = '#5a3b1e';
const pct = (n: number) => n.toFixed(1).replace('.', ',') + '%';
const rupiah = (n: number) => 'Rp' + Math.round(n).toLocaleString('id-ID');

// harga paket uang asli (tampilan; pembayaran dihubungkan lewat onPack)
export const PRICE_MONTHLY = 99000;
export const PRICE_MONSUN = 129000;
export const PRICE_KENALAN = 5000;
export const PRICE_BUAH = 15000;
export const PRICE_PERDANA = 29000;
export const PRICE_LANJUT = 99000;
export const PRICE_BEKAL = 49000; // harga tidak terlihat di video, sesuaikan

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

// Crystal biru (mata uang utama) & Permata ungu (mata uang premium), sesuai referensi
export function CrystalIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden style={{ flex: 'none' }}>
      <path d="M12 1.5l7 6.2v8.6L12 22.5 5 16.3V7.7z" fill="#2f9bff" />
      <path d="M12 1.5l7 6.2-7 3.2-7-3.2z" fill="#8fd2ff" />
      <path d="M12 10.9l7-3.2v8.6l-7 6.2z" fill="#1c6fe0" />
      <path d="M8 7.2l4-3.4" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" opacity=".8" />
    </svg>
  );
}
export function PermataIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden style={{ flex: 'none' }}>
      <path d="M6 3h12l4.5 6L12 21.5 1.5 9z" fill="#d23fe6" />
      <path d="M6 3h12l4.5 6h-21z" fill="#f08cff" />
      <path d="M12 21.5L7.5 9h9z" fill="#a51ec0" />
      <path d="M6 3h12l4.5 6L12 21.5 1.5 9z" fill="none" stroke="#7a1090" strokeWidth="1.1" strokeLinejoin="round" />
    </svg>
  );
}
function StarIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden shapeRendering="crispEdges" style={{ flex: 'none' }}>
      <path d="M12 2l3 6.5 7 .8-5.2 4.7 1.5 7L12 17.3 5.7 21l1.5-7L2 9.3l7-.8z" fill="#ffd23a" stroke="#c98a00" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M12 5l1.8 4.2L18 9.7" stroke="#fff6c0" strokeWidth="1.2" fill="none" />
      <path d="M20 2v4M18 4h4" stroke="#fff" strokeWidth="1.4" />
    </svg>
  );
}
function FeatherIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden style={{ flex: 'none' }}>
      <path d="M20 3C11 4 5 10 4 20c8-1 15-7 16-17z" fill="#7fd4ff" stroke="#2a7fd0" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M20 3C14 8 9 13 4 20" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M18 3l3 0M21 6l0-3" stroke="#fff" strokeWidth="1.2" />
    </svg>
  );
}
function BaitIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden shapeRendering="crispEdges" style={{ flex: 'none' }}>
      <rect x="9" y="6" width="9" height="9" fill="#f2b233" />
      <rect x="11" y="8" width="5" height="3" fill="#ffd76a" />
      <rect x="4" y="9" width="5" height="5" fill="#4a3220" />
      <rect x="4" y="15" width="3" height="4" fill="#4a3220" />
      <rect x="10" y="15" width="3" height="4" fill="#4a3220" />
      <rect x="15" y="15" width="3" height="4" fill="#4a3220" />
      <rect x="9" y="3" width="2" height="3" fill="#4a3220" />
      <rect x="15" y="3" width="2" height="3" fill="#4a3220" />
    </svg>
  );
}
function FruitIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden shapeRendering="crispEdges" style={{ flex: 'none' }}>
      <rect x="4" y="7" width="16" height="11" rx="3" fill="#e5322d" />
      <rect x="7" y="18" width="10" height="3" fill="#b8211d" />
      <rect x="6" y="9" width="3" height="3" fill="#ff7b72" />
      <rect x="8" y="3" width="8" height="4" fill="#2f9a43" />
      <rect x="11" y="2" width="2" height="3" fill="#1f6f2f" />
    </svg>
  );
}
function BoltIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden style={{ flex: 'none' }}>
      <path d="M14 2L5 13.5h6L9 22l10-12.5h-6z" fill="#ffc21a" stroke="#c98a00" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}
function CloverIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden style={{ flex: 'none' }}>
      <circle cx="8.5" cy="8.5" r="4.6" fill="#38c24f" /><circle cx="15.5" cy="8.5" r="4.6" fill="#38c24f" />
      <circle cx="8.5" cy="15" r="4.6" fill="#2fae45" /><circle cx="15.5" cy="15" r="4.6" fill="#2fae45" />
      <path d="M12 12l5 9" stroke="#1d7a30" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function SparkleIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden style={{ flex: 'none' }}>
      <path d="M11 3l2.6 6.4L20 12l-6.4 2.6L11 21l-2.6-6.4L2 12l6.4-2.6z" fill="#e66bff" />
      <path d="M11 6.5l1.4 3.8 3.8 1.4-3.8 1.4L11 17l-1.4-3.9L5.800 11.700l3.800-1.400z" fill="#fff" opacity=".7" />
      <path d="M19 2v5M16.5 4.5h5" stroke="#f6c3ff" strokeWidth="1.4" />
    </svg>
  );
}
function FishUpIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden style={{ flex: 'none' }}>
      <path d="M3 16c3-5 9-6 13-3l4-2.5v8L16 16c-4 3-10 3-13 0z" fill="#58b7ff" stroke="#2478d0" strokeWidth="1.1" strokeLinejoin="round" />
      <circle cx="7.500" cy="14.200" r="1" fill="#10305e" />
      <path d="M17 3l3 4h-2v4h-2V7h-2z" fill="#ffc21a" stroke="#c98a00" strokeWidth=".8" strokeLinejoin="round" />
    </svg>
  );
}
function GiftIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden shapeRendering="crispEdges" style={{ flex: 'none' }}>
      <rect x="2" y="8" width="20" height="5" fill="#ff5a4d" /><rect x="3.500" y="13" width="17" height="9" fill="#e8372f" />
      <rect x="10.500" y="8" width="3" height="14" fill="#ffd23a" />
      <rect x="6" y="3" width="5" height="5" fill="#ffd23a" /><rect x="13" y="3" width="5" height="5" fill="#ffd23a" />
      <rect x="2" y="12" width="20" height="1.500" fill="#00000030" />
    </svg>
  );
}
function ShirtIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden shapeRendering="crispEdges" style={{ flex: 'none' }}>
      <path d="M8 3h8l1 2 5 2-2 5-3-1v11H7V11l-3 1-2-5 5-2z" fill="#18a6c9" stroke="#0b6a85" strokeWidth="1.200" strokeLinejoin="round" />
      <path d="M9.500 3c1 2 4 2 5 0" fill="#0b6a85" />
    </svg>
  );
}
function BagIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden shapeRendering="crispEdges" style={{ flex: 'none' }}>
      <rect x="4" y="7" width="16" height="15" rx="3" fill="#d9532e" /><rect x="7" y="2" width="10" height="6" rx="3" fill="none" stroke="#8a3217" strokeWidth="2" />
      <rect x="8" y="13" width="8" height="5" fill="#f08a52" />
    </svg>
  );
}

function XpIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden style={{ flex: 'none' }}>
      <ellipse cx="14" cy="13" rx="7" ry="5" fill="#ff9a4a" stroke="#c4601a" strokeWidth="1.1" />
      <path d="M20 13l3-3v6z" fill="#ff9a4a" stroke="#c4601a" strokeWidth="1" strokeLinejoin="round" />
      <circle cx="11.500" cy="12" r="1" fill="#3a2010" />
      <path d="M1 12h6M4.500 9.500L7.200 12 4.500 14.500" stroke="#3b8cf0" strokeWidth="1.800" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function StallIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden shapeRendering="crispEdges" style={{ flex: 'none' }}>
      <rect x="3" y="4" width="18" height="6" fill="#ffffff" stroke="#8a3217" strokeWidth="1" />
      <rect x="3" y="4" width="3" height="6" fill="#e5322d" /><rect x="9" y="4" width="3" height="6" fill="#e5322d" /><rect x="15" y="4" width="3" height="6" fill="#e5322d" />
      <rect x="4" y="10" width="2" height="10" fill="#8a5a2b" /><rect x="18" y="10" width="2" height="10" fill="#8a5a2b" />
      <rect x="4" y="14" width="16" height="6" fill="#c98a4a" stroke="#8a5a2b" strokeWidth="1" />
      <rect x="6" y="11.500" width="3" height="2.500" fill="#7a3fb0" /><rect x="10.500" y="11.500" width="3" height="2.500" fill="#ffd23a" /><rect x="15" y="11.500" width="3" height="2.500" fill="#e66bff" />
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

function PawIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden shapeRendering="crispEdges" style={{ flex: 'none' }}>
      <ellipse cx="12" cy="16" rx="5.5" ry="4.5" fill="#e8873a" />
      <circle cx="5.5" cy="10" r="2.2" fill="#e8873a" /><circle cx="9.5" cy="6" r="2.2" fill="#e8873a" />
      <circle cx="14.5" cy="6" r="2.2" fill="#e8873a" /><circle cx="18.5" cy="10" r="2.2" fill="#e8873a" />
    </svg>
  );
}
function BowIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden shapeRendering="crispEdges" style={{ flex: 'none' }}>
      <path d="M12 12L3 6v12z" fill="#e0489b" /><path d="M12 12l9-6v12z" fill="#e0489b" />
      <rect x="10" y="9.500" width="4" height="5" rx="1" fill="#b02a78" />
    </svg>
  );
}
function CrownIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden shapeRendering="crispEdges" style={{ flex: 'none' }}>
      <path d="M3 18V7l5 5 4-7 4 7 5-5v11z" fill="#ffc21a" stroke="#c98a00" strokeWidth="1.200" strokeLinejoin="round" />
    </svg>
  );
}
function PassIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden shapeRendering="crispEdges" style={{ flex: 'none' }}>
      <path d="M2 7h20v3.500a2 2 0 000 3V17H2v-3.500a2 2 0 000-3z" fill="#f2a53a" stroke="#b86e0e" strokeWidth="1.200" strokeLinejoin="round" />
      <rect x="9" y="9" width="6" height="6" fill="#ffe08a" />
    </svg>
  );
}

const SIDE: { k: ShopTab; label: string; icon: (s: number) => ReactNode }[] = [
  { k: 'toko', label: 'Promo', icon: (s) => <GiftIcon size={s} /> },
  { k: 'bajulimited', label: 'Baju Limited', icon: (s) => <Chest body="#5a6272" lid="#7b8396" size={s} /> },
  { k: 'gacha', label: 'Gacha Rod', icon: (s) => <Chest body="#7a3fb0" lid="#9a5fd0" size={s} /> },
  { k: 'gachagaya', label: 'Gacha Gaya', icon: (s) => <Chest body="#d9609a" lid="#f08abf" size={s} /> },
  { k: 'gacharumah', label: 'Gacha Rumah', icon: (s) => <Chest body="#2f8a6a" lid="#47b088" size={s} /> },
  { k: 'gaya', label: 'Etalase', icon: (s) => <ShirtIcon size={s} /> },
  { k: 'pet', label: 'Pet', icon: (s) => <PawIcon size={s} /> },
  { k: 'aksesoris', label: 'Aksesoris', icon: (s) => <BowIcon size={s} /> },
  { k: 'setaksesoris', label: 'Set Aksesoris', icon: (s) => <CrownIcon size={s} /> },
  { k: 'pass', label: 'Pass', icon: (s) => <PassIcon size={s} /> },
  { k: 'tas', label: 'Tas', icon: (s) => <BagIcon size={s} /> },
];

export default function ShopScreen(p: Props) {
  const { px, font, crystal, rods, equippedRod, tab, onTab, buying, pulling } = p;
  const gems = p.gems ?? 0;
  const oddsRef = useRef<HTMLDivElement>(null);
  const [topup, setTopup] = useState<TopUpCurrency | null>((p.initialTopup as TopUpCurrency | null | undefined) ?? null);
  const [payPack, setPayPack] = useState<PromoPackId | null>(null);
  const sideRef = useRef<HTMLDivElement>(null);

  const chip: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: px(3), background: '#eaf1ff', color: '#2459c9', fontWeight: 800, fontSize: px(12), borderRadius: 99, padding: `${px(2)}px ${px(8)}px`, whiteSpace: 'nowrap' };
  const btn3d = (bg: string, edge: string, color: string): CSSProperties => ({
    border: 0, background: bg, boxShadow: `0 ${px(4)}px 0 ${edge}`, color, fontFamily: font, fontWeight: 800, borderRadius: px(14), cursor: 'pointer', padding: `${px(7)}px ${px(14)}px`,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: px(6),
  });
  const GOLD = btn3d('linear-gradient(180deg,#ffd45a,#f5a623)', '#c47f10', '#4a2f00');
  const BLUE = btn3d('linear-gradient(180deg,#3b8cf0,#1f64cc)', '#164b9c', '#fff');
  const SKY = btn3d('linear-gradient(180deg,#63d3ff,#2aa6f2)', '#1a78b8', '#fff');

  const gachaRods = GACHA_RODS;
  const monthly = RODS.find((r) => r.monthly);
  const leftMs = Math.max(0, new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).getTime() - Date.now());
  const leftD = Math.floor(leftMs / 86400000);
  const leftH = Math.floor((leftMs % 86400000) / 3600000);
  const lanjutMs = p.lanjutEndsAt ? Math.max(0, p.lanjutEndsAt - Date.now()) : leftMs;
  const lanjutD = Math.floor(lanjutMs / 86400000);
  const lanjutH = Math.floor((lanjutMs % 86400000) / 3600000);
  const topG = [...gachaRods].sort((a, b) => (GACHA_ODDS[a.id] ?? 0) - (GACHA_ODDS[b.id] ?? 0));
  const rarest = topG[0];
  const topRar = RARITY[rarest.rarity];
  const rays = (a: string, b: string) => `repeating-conic-gradient(from 0deg at 50% 50%, ${a} 0 8deg, ${b} 8deg 16deg)`;

  const soon = (title: string, desc: string) => (
    <div style={{ borderRadius: px(22), border: `${px(3)}px solid #e6d4b0`, background: '#fffaf0', padding: `${px(36)}px ${px(20)}px`, textAlign: 'center', boxShadow: `0 ${px(3)}px 0 #e6d4b0` }}>
      <div style={{ fontSize: px(46) }}>🚧</div>
      <div style={{ fontSize: px(24), fontWeight: 800, marginTop: px(6) }}>{title}</div>
      <div style={{ fontSize: px(15), fontWeight: 700, color: '#8a6d4a', marginTop: px(6) }}>{desc}</div>
    </div>
  );

  // ---------- potongan UI promo ----------
  const Slot = ({ children, n }: { children: ReactNode; n?: number }) => (
    <span style={{ position: 'relative', width: px(46), height: px(46), borderRadius: px(12), background: 'linear-gradient(180deg,#fffaf0,#f1e4c8)', border: `${px(2)}px solid #e2d2ae`, boxShadow: `0 ${px(1.5)}px 0 #d8c59c`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
      {children}
      {n != null && <span style={{ position: 'absolute', right: px(-5), bottom: px(-6), minWidth: px(22), textAlign: 'center', background: '#3b3b44', color: '#fff', fontWeight: 800, fontSize: px(13), lineHeight: 1, borderRadius: 99, padding: `${px(3)}px ${px(5)}px`, boxSizing: 'border-box', border: `${px(1.5)}px solid #fffaf0` }}>{n.toLocaleString('id-ID')}</span>}
    </span>
  );
  const PackCard = ({ title, items, note, action }: { title: string; items: ReactNode; note: string; action: ReactNode }) => (
    <div style={{ borderRadius: px(20), border: `${px(3)}px solid #eadfc7`, background: 'linear-gradient(180deg,#ffffff,#fdf6e6)', boxShadow: `0 ${px(3)}px 0 #e3d4b3`, overflow: 'hidden', paddingBottom: px(10) }}>
      <div style={{ width: '86%', background: 'linear-gradient(90deg,#1362cf,#1d7bea)', clipPath: 'polygon(0 0,100% 0,95% 100%,0 100%)', color: '#fff', fontWeight: 800, fontSize: px(17), padding: `${px(4)}px ${px(12)}px`, textShadow: '0 1.5px 0 rgba(0,0,60,.35)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: px(10), padding: `${px(14)}px 0 ${px(4)}px`, minHeight: px(48) }}>{items}</div>
      <div style={{ textAlign: 'center', fontWeight: 800, fontSize: px(15), color: '#a8691f', margin: `${px(8)}px 0 ${px(6)}px` }}>{note}</div>
      <div style={{ padding: `0 ${px(10)}px` }}>{action}</div>
    </div>
  );
  const priceBtn = (label: string, onClick?: () => void) => (
    <button onClick={onClick} style={{ ...GOLD, width: '100%', borderRadius: px(10), fontSize: px(19), padding: `${px(6)}px 0`, boxShadow: `0 ${px(3)}px 0 #b97a12` }}>{label}</button>
  );
  const doneBtn = (label: string) => (
    <div style={{ textAlign: 'center', background: '#e1f6df', border: `${px(2.5)}px solid #86dc86`, color: '#1f7a30', fontWeight: 800, fontSize: px(19), borderRadius: px(10), padding: `${px(5)}px 0` }}>{label}</div>
  );

  const buyAction = (id: PromoPackId) => {
    const pk = PROMO_PACKS[id];
    if (packLocked(pk, p.promoBought?.[id])) return doneBtn(pk.limit === 'minggu' ? '✓ Minggu depan' : pk.limit === 'bulan' ? '✓ Bulan depan' : '✓ Sudah dibeli');
    return priceBtn(rupiah(pk.rupiah), () => setPayPack(id));
  };

  const monsunName = monthly ? monthly.name.replace(/^Joran\s+/, '') : 'Badai Monsun';

  const promo = (
    <div>
      {monthly && (
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: px(14), borderRadius: px(18), border: `${px(3)}px solid #f2b73a`, background: 'repeating-linear-gradient(72deg, rgba(120,160,255,.28) 0 1.5px, transparent 1.5px 16px), linear-gradient(180deg,#14337a,#0b1f52)', boxShadow: `0 ${px(4)}px 0 #c9993a`, padding: `${px(8)}px ${px(14)}px ${px(8)}px ${px(10)}px`, minHeight: px(88), boxSizing: 'border-box' }}>
          <span style={{ width: px(76), height: px(76), flex: 'none', borderRadius: px(10), border: `${px(2)}px solid #8aa6e8`, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `radial-gradient(circle at 50% 50%, #23366a 0 20%, transparent 21%), ${rays('#3a5a98', '#223a6e')}` }}>
            <PixelRod id={monthly.id} size={px(70)} animate />
          </span>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: px(3) }}>
            <div style={{ color: '#ffd04a', fontWeight: 800, fontSize: px(14), whiteSpace: 'nowrap' }}>Rod Bulanan · sisa {leftD} hari {leftH} jam</div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: px(24), lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{monthly.name.replace(/^Joran/, 'Rod')}</div>
            <div style={{ display: 'flex', gap: px(6), flexWrap: 'wrap' }}>
              {([[<BoltIcon key="b" size={px(18)} />, String(monthly.power)], [<CloverIcon key="c" size={px(20)} />, '+' + Math.round(monthly.luck * 100) + '%'], [<SparkleIcon key="s" size={px(20)} />, '+' + Math.round(monthly.xp * 100) + '%'], [<FishUpIcon key="f" size={px(20)} />, '+' + Math.round(monthly.money * 100) + '%']] as [ReactNode, string][]).map(([ic, t], i) => (
                <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: px(4), background: 'rgba(8,20,60,.62)', color: '#fff', fontWeight: 800, fontSize: px(22), lineHeight: 1, borderRadius: 99, padding: `${px(2)}px ${px(10)}px ${px(2)}px ${px(6)}px` }}>{ic}{t}</span>
              ))}
            </div>
          </div>
          <div style={{ flex: 'none', paddingRight: px(2) }}>
            {rods.includes(monthly.id) ? (
              <div style={{ background: '#e1f5e6', border: `${px(2.5)}px solid #9ad8ae`, color: '#1f7a3c', fontWeight: 800, fontSize: px(22), borderRadius: px(14), padding: `${px(12)}px ${px(26)}px` }}>✓ Punyamu</div>
            ) : (
              <button onClick={() => setPayPack('monthly')} disabled={buying === monthly.id} style={{ ...SKY, fontSize: px(24), padding: `${px(12)}px ${px(28)}px`, borderRadius: px(12), boxShadow: `0 ${px(4)}px 0 #1a78b8`, opacity: buying === monthly.id ? 0.6 : 1 }}>{rupiah(PRICE_MONTHLY)}</button>
            )}
          </div>
        </div>
      )}
      <div style={{ fontSize: px(17), fontWeight: 800, color: '#6a5a48', margin: `${px(10)}px 0 ${px(6)}px` }}>Paket terbatas</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: px(10), alignItems: 'start' }}>
        <PackCard title="Umpan Gratis" note="Sekali sehari"
          items={<Slot n={10}><Sprite k="worm" size={px(24)} /></Slot>}
          action={p.freeBaitClaimed === false ? priceBtn('Ambil gratis', p.onClaimBait) : doneBtn('✓ Besok lagi')} />
        <PackCard title="Paket Perdana" note="Sekali per akun"
          items={<><Slot n={3000}><PermataIcon size={px(32)} /></Slot>{monthly ? <Slot><PixelRod id={monthly.id} size={px(40)} /></Slot> : null}</>}
          action={buyAction('perdana')} />
        <PackCard title="Paket Lanjut" note={`Sisa ${lanjutD} hari ${lanjutH} jam`}
          items={<><Slot n={6000}><PermataIcon size={px(32)} /></Slot><Slot><Sprite k="ticket" size={px(22)} /></Slot><Slot n={10}><FeatherIcon size={px(32)} /></Slot></>}
          action={buyAction('lanjut')} />
        <PackCard title="Paket Musim Buah" note="Sekali per akun"
          items={<><Slot><FruitIcon size={px(32)} /></Slot><Slot n={10}><FeatherIcon size={px(32)} /></Slot></>}
          action={buyAction('buah')} />
        <PackCard title="Bekal Mingguan" note="Sekali per minggu"
          items={<><Slot n={6000}><PermataIcon size={px(32)} /></Slot><Slot n={300}><StarIcon size={px(32)} /></Slot></>}
          action={buyAction('bekal')} />
      </div>
    </div>
  );

  // ---------- Gacha Rod (tampilan mengikuti referensi) ----------
  const RAR_ORDER = ['mythic', 'legendary', 'epic', 'rare', 'uncommon', 'common'];
  const RAR_EN: Record<string, string> = { mythic: 'Mythic', legendary: 'Legendary', epic: 'Epic', rare: 'Rare', uncommon: 'Uncommon', common: 'Common' };
  const RAR_TXT: Record<string, string> = { mythic: '#c2185b', legendary: '#9a6200', epic: '#7a3fd0', rare: '#1f64cc', uncommon: '#2f8a4a', common: '#7a6a58' };
  const tableRods = [...gachaRods].sort((x, y) => RAR_ORDER.indexOf(x.rarity) - RAR_ORDER.indexOf(y.rarity) || (GACHA_ODDS[x.id] ?? 0) - (GACHA_ODDS[y.id] ?? 0));
  const topPct = gachaRods.filter((r) => r.rarity === rarest.rarity).reduce((a, r) => a + (GACHA_ODDS[r.id] ?? 0), 0);
  const cols = `minmax(0, 1fr) repeat(4, ${px(78)}px)`;
  const sparkles: [number, number, number][] = [[8, 12, 14], [22, 58, 10], [38, 6, 12], [64, 14, 10], [90, 40, 14], [74, 74, 10], [10, 84, 12]];
  const statCell = (ic: ReactNode, t: string) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: px(4), fontWeight: 800, fontSize: px(21), color: BROWN, whiteSpace: 'nowrap' }}>{ic}{t}</span>
  );
  const gachaTab = (
    <div>
      <div style={{ display: 'flex', borderRadius: px(22), border: `${px(3)}px solid #eadfc7`, overflow: 'hidden', background: '#fffdf8', boxShadow: `0 ${px(3)}px 0 #e3d4b3` }}>
        <div style={{ flex: '1 1 50%', minHeight: px(228), position: 'relative', background: 'radial-gradient(circle at 50% 50%, #2a62c0 0, #0d2b66 58%, #081a46 100%)', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: `${px(14)}px ${px(16)}px` }}>
          <div style={{ position: 'absolute', inset: 0, background: rays('rgba(255,255,255,0.07)', 'rgba(255,255,255,0)') }} />
          {sparkles.map(([x, y, z], i) => (
            <span key={i} aria-hidden style={{ position: 'absolute', left: x + '%', top: y + '%', fontSize: px(z), color: '#fff', opacity: 0.85, lineHeight: 1 }}>✦</span>
          ))}
          {[topG[1] ?? rarest, rarest].map((r, i) => (
            <div key={r.id + i} style={{ position: 'relative', width: '31%', textAlign: 'center', color: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: px(4) }}><PixelRod id={r.id} size={px(92)} animate /></div>
              <div style={{ fontWeight: 800, fontSize: px(16), lineHeight: 1.1, textShadow: '0 2px 3px rgba(0,0,0,.7)' }}>{r.name.replace(/^Joran/, 'Rod')}</div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: px(3), fontWeight: 800, fontSize: px(17), color: '#ffd04a', marginTop: px(2) }}><BoltIcon size={px(16)} />{r.power}</div>
            </div>
          ))}
          <div style={{ position: 'absolute', left: '50%', top: px(14), transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: px(8) }}>
            <Chest body="#7a3fb0" lid="#9a5fd0" size={px(104)} />
            <span style={{ background: rarest.rarity === 'mythic' ? '#c2185b' : topRar.color, color: '#fff', fontWeight: 800, fontSize: px(16), borderRadius: 99, padding: `${px(4)}px ${px(16)}px`, boxShadow: '0 3px 0 rgba(0,0,0,.25)', whiteSpace: 'nowrap' }}>{RAR_EN[rarest.rarity]} · {pct(topPct)}</span>
          </div>
        </div>
        <div style={{ flex: '1 1 50%', padding: `${px(14)}px ${px(18)}px`, display: 'flex', flexDirection: 'column', gap: px(8), justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: px(8) }}>
            <div style={{ fontSize: px(28), fontWeight: 800, lineHeight: 1.1 }}>Gacha Rod Legenda</div>
            <button onClick={() => oddsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })} style={{ background: '#fff6df', border: `${px(3)}px solid #e6d4b0`, boxShadow: `0 ${px(3)}px 0 #e6d4b0`, color: BROWN, fontFamily: font, fontWeight: 800, fontSize: px(15), borderRadius: px(14), padding: `${px(6)}px ${px(14)}px`, cursor: 'pointer', whiteSpace: 'nowrap' }}>Lihat peluang</button>
          </div>
          <div>
            <div style={{ fontSize: px(17), fontWeight: 700, color: '#7a5c36' }}>{RAR_EN.epic} dijamin dalam <b style={{ color: '#c2185b', fontSize: px(26) }}>{Math.max(1, GACHA_PITY - p.pity)}</b> peti</div>
            <div style={{ height: px(14), borderRadius: 99, background: '#e6e1da', overflow: 'hidden', marginTop: px(8) }}>
              <div style={{ width: Math.min(100, (p.pity / GACHA_PITY) * 100) + '%', height: '100%', background: 'linear-gradient(90deg,#a66cf0,#7a3fd0)', borderRadius: 99 }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: px(12) }}>
            <button onClick={() => p.onPull(1)} disabled={pulling} style={{ ...BLUE, flex: 1, flexDirection: 'column', gap: px(2), padding: `${px(9)}px 0`, opacity: pulling ? 0.6 : 1 }}>
              <span style={{ fontSize: px(17) }}>Buka 1×</span>
              <span style={{ fontSize: px(26), display: 'inline-flex', alignItems: 'center', gap: px(6) }}><CrystalIcon size={px(26)} />{formatNum(GACHA_PRICE)}</span>
            </button>
            <button onClick={() => p.onPull(5)} disabled={pulling} style={{ ...GOLD, flex: 1, flexDirection: 'column', gap: px(2), padding: `${px(9)}px 0`, opacity: pulling ? 0.6 : 1 }}>
              <span style={{ fontSize: px(17) }}>Buka 5×</span>
              <span style={{ fontSize: px(26), display: 'inline-flex', alignItems: 'center', gap: px(6) }}><CrystalIcon size={px(26)} />{formatNum(GACHA_PRICE * 5)}</span>
            </button>
          </div>
        </div>
      </div>

      <div ref={oddsRef} style={{ fontSize: px(22), fontWeight: 800, color: '#6a5a48', margin: `${px(16)}px 0 ${px(8)}px`, scrollMarginTop: px(8) }}>Peluang rod · 100%</div>
      <div style={{ borderRadius: px(20), border: `${px(3)}px solid #eadfc7`, background: '#fffdf8', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: cols, alignItems: 'center', padding: `${px(10)}px ${px(14)}px`, borderBottom: '1.5px solid #eadfc7', color: '#8a6d4a', fontWeight: 800, fontSize: px(19) }}>
          <span style={{ paddingLeft: px(66) }}>Rod</span>
          {[<BoltIcon key="p" size={px(26)} />, <XpIcon key="x" size={px(26)} />, <CloverIcon key="l" size={px(26)} />, <FishUpIcon key="m" size={px(26)} />].map((ic, i) => (
            <span key={i} style={{ display: 'flex', justifyContent: 'center' }}>{ic}</span>
          ))}
        </div>
        {tableRods.map((r, i) => {
          const owned = rods.includes(r.id);
          return (
            <div key={r.id} style={{ display: 'grid', gridTemplateColumns: cols, alignItems: 'center', padding: `${px(8)}px ${px(14)}px`, borderTop: i ? '1.5px solid #f0e6d0' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: px(10), minWidth: 0 }}>
                <span style={{ width: px(56), display: 'flex', justifyContent: 'center', flex: 'none' }}><PixelRod id={r.id} size={px(54)} animate={owned} /></span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: px(22), lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name.replace(/^Joran/, 'Rod')}{owned && <span style={{ color: '#1f9a4a', marginLeft: px(6), fontSize: px(18) }}>✓</span>}</div>
                  <div style={{ fontWeight: 800, fontSize: px(18), color: '#8a6d4a' }}><span style={{ color: RAR_TXT[r.rarity] ?? BROWN }}>{RAR_EN[r.rarity] ?? r.rarity}</span> · {pct(GACHA_ODDS[r.id] ?? 0)}</div>
                </div>
              </div>
              {statCell(<BoltIcon size={px(22)} />, String(r.power))}
              {statCell(null, '+' + Math.round(r.xp * 100) + '%')}
              {statCell(null, '+' + Math.round(r.luck * 100) + '%')}
              {statCell(null, '+' + Math.round(r.money * 100) + '%')}
            </div>
          );
        })}
      </div>
    </div>
  );

  const tabBody = tab === 'toko' ? promo
    : tab === 'gacha' ? gachaTab
    : tab === 'bajulimited' ? <ShopBajuLimited px={px} font={font} gems={gems} banner="/banner/baju-secret-hunter.jpg" onOpen={p.onOpenLimited} free={p.limitedFree} pity={p.limitedPity} owned={p.limitedOwned} endsAt={p.limitedEndsAt} />
    : tab === 'gachagaya' ? soon('Gacha Gaya', 'Gaya rambut dan aksesori punggung karakter segera hadir.')
    : tab === 'gacharumah' ? soon('Gacha Rumah', 'Isi rumah dan dekorasi segera hadir.')
    : tab === 'gaya' ? soon('Etalase', 'Ganti gaya karakter di sini setelah Gacha Gaya dibuka.')
    : tab === 'pet' ? soon('Pet', 'Toko pet segera hadir.')
    : tab === 'aksesoris' ? soon('Aksesoris', 'Aksesoris segera hadir.')
    : tab === 'setaksesoris' ? soon('Set Aksesoris', 'Set aksesoris segera hadir.')
    : tab === 'pass' ? soon('Pass', 'Pass segera hadir.')
    : soon('Tas', 'Upgrade ransel dan umpan segera hadir.');

  const BTN_SHADOW = `0 ${px(4)}px 0 #164b9c`;
  const chipHdr: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: px(8), background: 'rgba(8,40,110,0.55)', color: '#fff', fontWeight: 800, fontSize: px(22), lineHeight: 1, borderRadius: 99, padding: `${px(6)}px ${px(16)}px ${px(6)}px ${px(10)}px`, boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,.08)' };

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 30, background: 'rgba(0,12,40,.5)', fontFamily: font, color: BROWN }}>
      <style>{`.kk-scroll{scrollbar-width:thin;scrollbar-color:#a89a84 transparent}.kk-scroll::-webkit-scrollbar{width:6px}.kk-scroll::-webkit-scrollbar-thumb{background:#a89a84;border-radius:99px}.kk-scroll::-webkit-scrollbar-track{background:transparent}`}</style>
      <div style={{ position: 'absolute', inset: px(4), display: 'flex', flexDirection: 'column', background: '#fff5e1', borderRadius: px(26), border: `${px(4)}px solid #1a74e4`, boxShadow: '0 0 0 2px #0b3f8f', overflow: 'hidden' }}>
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: px(12), background: 'linear-gradient(180deg,#1479ec,#0b62cc)', padding: `${px(8)}px ${px(14)}px`, boxShadow: '0 3px 0 #0a4fa8', position: 'relative', zIndex: 2, flex: 'none' }}>
          <span style={{ width: px(44), height: px(44), borderRadius: '50%', background: '#fff2d1', border: `${px(2.5)}px solid #fff`, boxShadow: '0 2px 0 rgba(0,0,60,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}><StallIcon size={px(30)} /></span>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: px(26) }}>Toko</span>
          <span style={{ marginLeft: 'auto', ...chipHdr }}><CrystalIcon size={px(34)} />{formatNum(crystal)}
            <button onClick={() => setTopup('crystal')} aria-label="Top up Crystal" style={{ width: px(26), height: px(26), borderRadius: '50%', border: 0, background: 'radial-gradient(circle at 35% 30%,#58e89a,#1fa85a)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
              <svg width={px(14)} height={px(14)} viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="#fff" strokeWidth="4" strokeLinecap="round" /></svg>
            </button>
          </span>
          <span style={chipHdr}>
            <PermataIcon size={px(30)} />{formatNum(gems)}
            <button onClick={() => (p.onAddGems ? p.onAddGems() : setTopup('gems'))} aria-label="Top up Gems" style={{ width: px(26), height: px(26), borderRadius: '50%', border: 0, background: 'radial-gradient(circle at 35% 30%,#58e89a,#1fa85a)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
              <svg width={px(14)} height={px(14)} viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="#fff" strokeWidth="4" strokeLinecap="round" /></svg>
            </button>
          </span>
          <button onClick={p.onClose} aria-label="Tutup" style={{ width: px(52), height: px(46), borderRadius: px(12), border: 0, background: 'linear-gradient(180deg,#ee5a4a,#d0392b)', boxShadow: `0 ${px(3)}px 0 #a02a20`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
            <svg width={px(26)} height={px(26)} viewBox="0 0 24 24"><path d="M5 5l14 14M19 5L5 19" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" /></svg>
          </button>
        </div>

        <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: px(12), padding: `${px(10)}px ${px(10)}px 0 ${px(14)}px` }}>
          {/* sidebar */}
          <div style={{ width: px(186), flex: 'none', alignSelf: 'stretch', background: '#f5e6c8', borderRadius: `${px(24)}px ${px(24)}px 0 0`, padding: `${px(10)}px ${px(8)}px ${px(8)}px`, display: 'flex', flexDirection: 'column', gap: px(6), minHeight: 0, boxSizing: 'border-box' }}>
            <div ref={sideRef} className="kk-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: px(8), paddingRight: px(4) }}>
              {SIDE.map((s) => {
                const on = tab === s.k;
                return (
                  <button key={s.k} onClick={() => onTab(s.k)} style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: px(10), width: '100%', height: px(56), padding: `0 ${px(8)}px`, borderRadius: px(14), border: 0, background: on ? 'linear-gradient(180deg,#1f86f2,#0f63d0)' : 'transparent', boxShadow: on ? BTN_SHADOW : 'none', color: on ? '#fff' : BROWN, fontFamily: font, fontWeight: 800, fontSize: px(18), cursor: 'pointer', textAlign: 'left', whiteSpace: 'nowrap' }}>
                    <span style={{ width: px(32), height: px(32), display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{s.icon(px(30))}</span>
                    {s.label}
                  </button>
                );
              })}
            </div>
            <button onClick={() => sideRef.current?.scrollBy({ top: px(120), behavior: 'smooth' })} aria-label="Gulir ke bawah" style={{ flex: 'none', height: px(34), borderRadius: px(12), border: 0, background: '#fffaf0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
              <svg width={px(20)} height={px(20)} viewBox="0 0 24 24"><path d="M5 9l7 7 7-7" stroke="#1f64cc" strokeWidth="3.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>

          <div className="kk-scroll" style={{ flex: 1, minWidth: 0, overflowY: 'auto', paddingBottom: px(18), paddingRight: px(8) }}>
            {tabBody}
          </div>
        </div>
      </div>

      {payPack && <ShopPay px={px} font={font} packId={payPack} onClose={() => setPayPack(null)} onPaid={p.onPromoPaid} />}
      {topup && <ShopTopUp px={px} font={font} initial={topup} gems={gems} crystal={crystal} gemIcon={(z) => <PermataIcon size={z} />} crystalIcon={(z) => <CrystalIcon size={z} />} onClose={() => setTopup(null)} onBuy={p.onTopUp} onPoll={p.onTopUpPoll} onPaid={p.onTopUpPaid} />}
    </div>
  );
}
