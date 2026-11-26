'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as RPointerEvent } from 'react';
import { FishingEngine } from './engine';
import type { Catch, EngineStatus, Phase } from './engine';
import { FISH_H, FISH_W, drawFish } from './art';
import {
  BAG_MAX, DEFAULT_ROD, GACHA_DUPLICATE_REFUND, GACHA_PRICE, RARITY, RODS, RODS_BY_ID, SPECIES, SPECIES_BY_ID,
  fishPrice, formatNum, formatWeight, isShowoff, isXL, levelFromXp, newId, rodEase, sizeRatio, sizeTier, titleFor, xpFor,
} from '@/lib/fishing';
import { SPECIES as KSPECIES, sizeRatio as kSizeRatio } from '@/lib/fishing';
import type { BagItem, Rarity, Rod, SizeTier } from '@/lib/fishing';
import DevTools, { DevFab, EMPTY_STATS } from './DevTools';
import ShopScreen, { RodArt } from './Shop';
import type { ShopTab } from './Shop';
import type { DevStats, SellMode } from './DevTools';

interface Props {
  name: string;
  photo: string;
  crystal: number;
  xp: number;
  bag: BagItem[];
  rods: string[];
  equippedRod: string;
  onCatch: (item: BagItem, xpGain: number) => void;
  onSell: (ids: string[]) => Promise<number>;
  onBuyRod: (id: string) => Promise<'ok' | 'kurang' | 'gagal'>;
  onEquipRod: (id: string) => void;
  onGacha: () => Promise<{ rod: Rod; duplicate: boolean } | 'kurang' | 'gagal'>;
  pity?: number;
  starterClaimed?: boolean;
  onClaimStarter?: () => Promise<boolean>;
  onExit: () => void;
  dev?: boolean; // role Developer: buka Dev Tools (auto fishing dll)
}

const HUD = '"Fredoka", "Baloo 2", system-ui, sans-serif';
const PANEL = 'rgba(24,22,22,0.9)';
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
function GemIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24"><path d="M6 4h12l4 6-10 11L2 10z" fill="#39e07f" stroke="#12803e" strokeWidth="1.6" strokeLinejoin="round" /><path d="M2 10h20M9 4l-2 6 5 11M15 4l2 6-5 11" stroke="#b8ffd2" strokeWidth="0.9" fill="none" opacity="0.7" /></svg>
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

const rarityBorder = (r: keyof typeof RARITY, _xl: boolean) => (r === 'common' ? 'rgba(190,196,212,0.65)' : RARITY[r].color);

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
const RARITY_EN: Record<keyof typeof RARITY, string> = { mythic: 'Mythic', common: 'COMMON', uncommon: 'UNCOMMON', rare: 'RARE', epic: 'EPIC', legendary: 'LEGENDARY' };
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

// Keluar dari game: layar dikembalikan tegak (portrait), keluar layar penuh, lalu rotasi bebas lagi
async function leaveLandscape() {
  try {
    const o = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void>; unlock?: () => void };
    try { await o.lock?.('portrait'); } catch { /* browser menolak, cukup di-unlock */ }
    try { if (document.fullscreenElement) await document.exitFullscreen(); } catch { /* abaikan */ }
    setTimeout(() => { try { o.unlock?.(); } catch { /* abaikan */ } }, 600);
  } catch { /* abaikan */ }
}

export default function FishingGame(props: Props) {
  const { name, photo, crystal, xp, bag, rods, equippedRod } = props;
  const rod = RODS_BY_ID[equippedRod] || RODS_BY_ID[DEFAULT_ROD];
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
  const [sel, setSel] = useState('');
  const [shopOpen, setShopOpen] = useState(false);
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
  const doExit = () => {
    exitOkRef.current = true;
    setConfirmExit(false);
    try { history.go(-2); } catch { /* abaikan */ }
    // kalau tidak ada halaman sebelumnya, pakai jalur keluar biasa
    setTimeout(() => { if (location.pathname.includes('mancing')) props.onExit(); }, 400);
  };
  const [shopTab, setShopTab] = useState<ShopTab>('toko');
  const [buying, setBuying] = useState('');
  const [pulling, setPulling] = useState(false);
  const [gachaResult, setGachaResult] = useState<{ rod: Rod; duplicate: boolean } | null>(null);
  const [gachaMulti, setGachaMulti] = useState<{ rod: Rod; duplicate: boolean }[] | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [u, setU] = useState(1);
  const [status, setStatus] = useState<EngineStatus>({ shoal: null, inShoal: false });
  const [now, setNow] = useState(() => new Date());
  const [intro, setIntro] = useState(true);
  const [fails, setFails] = useState(0);
  const [chat, setChat] = useState<{ who: string; msg: string; t: number }[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [buffOpen, setBuffOpen] = useState(true);
  const [bagSort, setBagSort] = useState<'baru' | 'nilai'>('baru');
  const [menu2, setMenu2] = useState(false);
  // ---- Mode Developer (auto fishing dll) ----
  const [devOpen, setDevOpen] = useState(false);
  const [auto, setAuto] = useState(false);
  const autoRef = useRef(false);
  const [sellMode, setSellMode] = useState<SellMode>('keep');
  const [speed, setSpeed] = useState(1);
  const [instant, setInstant] = useState(false);
  const [force, setForce] = useState<Rarity | ''>('');
  const [forceSize, setForceSize] = useState<SizeTier | ''>('');
  const [dstats, setDstats] = useState<DevStats>(EMPTY_STATS);
  const sellBusy = useRef(false);
  // HP masih portrait (kunci landscape tidak diizinkan browser) → game diputar 90° sendiri,
  // tanpa layar penuh & tanpa pesan sistem. Tinggal putar HP. Kalau layar sudah landscape, tidak ada rotasi.
  const [vp, setVp] = useState({ w: 0, h: 0, touch: false });
  const rot = vp.touch && vp.h > vp.w;
  const rotRef = useRef(false);
  rotRef.current = rot;
  useEffect(() => {
    const upd = () => setVp({ w: window.innerWidth, h: window.innerHeight, touch: window.matchMedia('(pointer: coarse)').matches });
    upd();
    window.addEventListener('resize', upd);
    window.addEventListener('orientationchange', upd);
    return () => { window.removeEventListener('resize', upd); window.removeEventListener('orientationchange', upd); };
  }, []);
  const toastT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const px = (n: number) => Math.round(n * u);

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
      onAuto: (on) => { autoRef.current = on; setAuto(on); if (on) { setPopup(null); setDstats((d) => (d.since ? d : { ...d, since: Date.now() })); } },
      onCatch: (c: Catch) => {
        const item: BagItem = { id: newId(), s: c.species.id, w: c.weight };
        const curRod = RODS_BY_ID[propsRef.current.equippedRod] || RODS_BY_ID[DEFAULT_ROD];
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
        setChat((l) => [...l.slice(-19), { who: propsRef.current.name || 'Tamu', msg: 'dapat ' + c.species.name + ' ' + formatWeight(c.weight) + ' 🎣', t: Date.now() }]);
        if (autoRef.current) {
          // auto fishing: tanpa popup (engine menutup hasil sendiri), cukup catat statistik & kabari yang penting
          const sp = c.species;
          const ridx = ['common', 'uncommon', 'rare', 'epic', 'legendary'].indexOf(sp.rarity);
          const rank = ridx * 100000 + Math.min(99999, c.weight);
          setDstats((d) => ({
            ...d, catches: d.catches + 1, xp: d.xp + gain, rare: d.rare + (ridx >= 2 ? 1 : 0), last: Date.now(),
            ...(sizeTier(sp, c.weight) === 'besar' ? { big: d.big + 1 } : sizeTier(sp, c.weight) === 'sedang' ? { mid: d.mid + 1 } : { small: d.small + 1 }),
            ...(rank > d.bestRank ? { best: sp.name + ' ' + formatWeight(c.weight), bestRank: rank } : {}),
          }));
          if (after > before) say('Level naik ke ' + after + '!');
          else if (ridx >= 3) say((ridx === 4 ? '🌟 ' : '✨ ') + sp.name + ' ' + formatWeight(c.weight));
        } else {
          setPopup({ item, gain, up: after > before ? after : 0, record });
        }
      },
    });
    engineRef.current = engine;
    try {
      const sz = parseFloat(localStorage.getItem('komikita-fish-zoom') || '');
      if (Number.isFinite(sz)) engine.setZoom(sz);
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

  // sinkron level, joran (luck), tas penuh, & profil
  useEffect(() => {
    engineRef.current?.setLevel(lv.level);
    engineRef.current?.setLuck(rod.luck);
    engineRef.current?.setEase(rodEase(rod.power));
    engineRef.current?.setBagFull(bag.length >= BAG_MAX);
    engineRef.current?.setProfile({ name: name || 'Tamu', title: titleFor(lv.level), level: lv.level, rodName: rod.name, rodId: rod.id });
  }, [lv.level, bag.length, rod.luck, rod.power, rod.name, rod.id, name]);

  // ikan yang dipegang karakter (pamer)
  useEffect(() => {
    const sp = held ? SPECIES_BY_ID[held.s] : null;
    engineRef.current?.setHeld(held && sp ? { species: sp, weight: held.w } : null);
  }, [held]);

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
  const pullGachaN = async (n: 1 | 5) => {
    if (pulling) return;
    setPulling(true);
    const got: { rod: Rod; duplicate: boolean }[] = [];
    for (let i = 0; i < n; i++) {
      const res = await props.onGacha();
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
  // saat komponen dilepas (tombol keluar / tombol back), layar kembali tegak
  useEffect(() => () => { leaveLandscape(); }, []);
  // tombol menu "Layar penuh landscape": fullscreen dulu (pesan sistem Android muncul sebentar)
  const landscape = async () => {
    const o = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
      await o.lock?.('landscape');
    } catch { say('Putar layar sendiri ke landscape ya'); }
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

  const btnLabel = phase === 'idle' ? 'Joran' : phase === 'bite' ? 'Tarik!' : phase === 'reel' ? 'Tahan' : phase === 'result' || phase === 'catching' ? '...' : 'Tunggu...';
  const btnBg = phase === 'bite' ? 'radial-gradient(circle at 35% 30%,#ff8a9a,#e11d48)' : phase === 'reel' ? 'radial-gradient(circle at 35% 30%,#7df0a4,#16a34a)' : 'radial-gradient(circle at 38% 28%,#c4b29b,#8d7a65)';

  const circleBtn: CSSProperties = { width: px(40), height: px(40), borderRadius: '50%', background: PANEL, border: `${px(2)}px solid ${GOLD}88`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 };
  const pillBox: CSSProperties = { background: PANEL, borderRadius: px(18), border: `${px(1.5)}px solid rgba(255,255,255,0.14)`, color: '#fff', fontFamily: HUD };
  const slot = (selected: boolean, color: string): CSSProperties => {
    const tint = !selected && color.startsWith('#') && color.length === 7 ? color + '30' : 'transparent';
    return {
      position: 'relative', width: px(37), height: px(39), borderRadius: px(6), boxSizing: 'border-box',
      background: selected ? 'linear-gradient(180deg,#2b3b5e,#121626)' : `linear-gradient(${tint},${tint}), linear-gradient(180deg,rgba(62,68,88,0.88),rgba(20,22,34,0.94))`,
      border: `${px(1.6)}px solid ${selected ? '#4a9bff' : color}`, boxShadow: '0 2px 0 rgba(0,0,0,0.35)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto', cursor: 'pointer', padding: 0,
    };
  };
  const xlTag = (): CSSProperties => ({ position: 'absolute', top: px(-5), right: px(-4), background: '#f08a24', color: '#fff', fontSize: px(8.5), fontWeight: 700, borderRadius: px(4), padding: `0 ${px(3.5)}px`, zIndex: 1, border: `${px(1)}px solid rgba(255,255,255,0.55)` });
  const wLabel = (): CSSProperties => ({ position: 'absolute', bottom: px(1), left: 0, right: 0, textAlign: 'center', fontFamily: '"Pixelify Sans", ui-monospace, monospace', fontSize: px(9.5), fontWeight: 700, color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.45)' });
  const wl = (w: number) => formatWeight(w).replace(' ', '');
  const ringBtn = (ring: string): CSSProperties => ({
    width: px(33), height: px(33), borderRadius: '50%', boxSizing: 'border-box', background: PANEL, border: `${px(2)}px solid #1b1818`,
    boxShadow: `0 0 0 ${px(2)}px ${ring}, 0 ${px(3)}px 0 ${px(2)}px ${ring}`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, flex: '0 0 auto', margin: px(2),
  });
  const dockPill = (accent: string): CSSProperties => ({
    ...pillBox, display: 'flex', alignItems: 'center', gap: px(6), height: px(32), boxSizing: 'border-box', borderRadius: px(16), border: `${px(2)}px solid #1b1818`,
    boxShadow: `0 ${px(3)}px 0 ${accent}, 0 0 ${px(8)}px ${accent}77`, marginBottom: px(3),
  });
  const chipSt = (white: boolean, hi = false): CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: px(4), height: px(20), boxSizing: 'border-box', padding: `0 ${px(9)}px`, borderRadius: 99,
    background: white ? '#fff8e8' : 'rgba(22,20,20,0.94)', color: white ? '#1d3a24' : hi ? '#7dffa5' : '#fff', border: `${px(1.5)}px solid ${white ? '#f1e2bd' : '#2c2828'}`,
    fontSize: px(13.5), fontWeight: 700, boxShadow: `0 ${px(1.5)}px 0 rgba(0,0,0,0.35)`, whiteSpace: 'nowrap',
  });
  const ov: CSSProperties = { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 30 };

  const guide = status.shoal;
  const rotate = guide ? (guide.ang * 180) / Math.PI + 90 : 0;

  return (
    <div ref={wrapRef} style={{ position: 'fixed', ...(rot ? { top: 0, left: vp.w, width: vp.h, height: vp.w, transform: 'rotate(90deg)', transformOrigin: 'top left' } : { inset: 0 }), zIndex: 70, userSelect: 'none', overflow: 'hidden', background: '#2872b4', color: '#fff', touchAction: 'none', fontFamily: HUD }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0 }} />

      {/* kiri atas: kartu pemain + pulau / chat / menu */}
      <div style={{ position: 'absolute', left: `calc(env(safe-area-inset-left, 0px) + ${px(6)}px)`, top: `calc(env(safe-area-inset-top, 0px) + ${px(6)}px)`, display: fishing ? 'none' : 'flex', alignItems: 'center', gap: px(7) }}>
        <div style={{ ...pillBox, display: 'flex', alignItems: 'center', gap: px(7), width: px(189), height: px(60), boxSizing: 'border-box', padding: `${px(5)}px ${px(8)}px ${px(5)}px ${px(7)}px`, borderRadius: px(17), border: `${px(2)}px solid #ffd36a`, boxShadow: `0 ${px(2.5)}px 0 #f0b33f`, marginRight: px(2) }}>
          <div style={{ width: px(42), height: px(42), borderRadius: px(10), overflow: 'hidden', border: `${px(3)}px solid #5ee0e0`, boxSizing: 'border-box', background: '#35405c', flex: '0 0 auto' }}>
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt="" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : null}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: px(5) }}>
              <span style={{ background: '#23a3b5', border: `${px(1.5)}px solid #7fe3ee`, boxSizing: 'border-box', borderRadius: '50%', minWidth: px(20), height: px(20), display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: px(12), fontWeight: 700, flex: '0 0 auto' }}>{lv.level}</span>
              <span style={{ fontSize: px(14), fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.1 }}>{name || 'Tamu'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: px(3), fontSize: px(11.5), fontWeight: 700, color: '#a9afbd', marginTop: px(2), lineHeight: 1.1 }}><BoatIcon size={px(12)} />{titleFor(lv.level)}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: px(6), marginTop: px(3) }}>
              <div style={{ flex: 1, height: px(5), borderRadius: px(3), background: '#3b3e47', overflow: 'hidden' }}>
                <div style={{ width: Math.min(100, (lv.into / lv.need) * 100) + '%', height: '100%', background: 'linear-gradient(90deg,#2fbf8a,#6fdc8c)' }} />
              </div>
              <span style={{ fontSize: px(11), fontWeight: 700, color: '#b7bcc8', whiteSpace: 'nowrap' }}>{lv.into}/{lv.need}</span>
            </div>
          </div>
        </div>
        <div style={{ position: 'relative' }}>
          <button onClick={() => say('Pemain online: 1 (kamu)')} aria-label="Pulau" style={{ ...ringBtn('#3fd6c8'), marginTop: px(8) }}><IslandIcon size={px(22)} /></button>
          <span style={{ position: 'absolute', top: px(-5), left: px(-3), display: 'flex', alignItems: 'center', gap: px(3), padding: `${px(1.5)}px ${px(7)}px`, borderRadius: 99, background: 'linear-gradient(180deg,#38d58b,#1fa56a)', border: `${px(1.5)}px solid #1b1818`, fontSize: px(12), fontWeight: 700, color: '#fff', lineHeight: 1.2 }}><PeopleIcon size={px(12)} />1</span>
        </div>
        <button onClick={() => setChatOpen((o) => !o)} aria-label="Chat" style={ringBtn('#ffd36a')}><ChatIcon size={px(18)} /></button>
        <button onClick={() => setMenu2((o) => !o)} aria-label="Menu" style={ringBtn('#ffd36a')}><Svg d="M4 7h16M4 12h16M4 17h16" size={px(18)} /></button>
      </div>

      {/* menu utama (tombol tiga garis) */}
      {menu2 && !fishing && (() => {
        const soon = () => say('Fitur ini segera hadir');
        const go = (path: string) => () => { window.location.assign(path); };
        const items: { k: string; icon: string; label: string; act: () => void }[] = [
          { k: 'misi', icon: '📜', label: 'Misi', act: go('/misi') },
          { k: 'koleksi', icon: '📘', label: 'Koleksi', act: soon },
          { k: 'joran', icon: '🎣', label: 'Joran', act: () => { setShopTab('toko'); setShopOpen(true); } },
          { k: 'lemari', icon: '👕', label: 'Lemari', act: soon },
          { k: 'akuarium', icon: '🐠', label: 'Akuarium', act: soon },
          { k: 'toko', icon: '🛍️', label: 'Toko', act: () => { setShopTab('toko'); setShopOpen(true); } },
          { k: 'peringkat', icon: '🏆', label: 'Peringkat', act: go('/ranking') },
          { k: 'surat', icon: '📮', label: 'Kotak Surat', act: soon },
          { k: 'skill', icon: '🌳', label: 'Skill', act: soon },
        ];
        return (
          <>
            <div onClick={() => setMenu2(false)} style={{ position: 'absolute', inset: 0, zIndex: 25 }} />
            <div style={{ position: 'absolute', zIndex: 26, right: `calc(env(safe-area-inset-right, 0px) + ${px(7)}px)`, top: `calc(env(safe-area-inset-top, 0px) + ${px(46)}px)`, width: `min(${px(600)}px, calc(100% - ${px(120)}px))`, boxSizing: 'border-box', padding: px(8), display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: px(6), background: 'rgba(30,28,28,0.84)', backdropFilter: `blur(${px(10)}px)`, WebkitBackdropFilter: `blur(${px(10)}px)`, border: `${px(1.5)}px solid rgba(255,255,255,0.14)`, borderRadius: px(20), boxShadow: '0 6px 22px rgba(0,0,0,0.4)' }}>
              {items.map((it) => (
                <button key={it.k} onClick={() => { setMenu2(false); it.act(); }} style={{ height: px(70), boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', gap: px(3), padding: `${px(8)}px ${px(2)}px 0`, borderRadius: px(14), border: `${px(1.5)}px solid rgba(255,255,255,0.12)`, background: 'linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))', color: '#fff', fontFamily: HUD, fontWeight: 700, fontSize: px(13.5), lineHeight: 1.1, cursor: 'pointer' }}>
                  <span style={{ fontSize: px(24), lineHeight: 1 }}>{it.icon}</span>
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
        const box: CSSProperties = { position: 'absolute', left: `calc(env(safe-area-inset-left, 0px) + ${px(6)}px)`, top: `calc(env(safe-area-inset-top, 0px) + ${px(74)}px)`, maxWidth: px(277), boxSizing: 'border-box', background: 'rgba(18,16,16,0.58)', borderRadius: px(12), padding: `${px(3)}px ${px(10)}px`, fontSize: px(13), fontWeight: 700, textShadow: '0 1px 2px rgba(0,0,0,0.7)' };
        const line = (m: { who: string; msg: string }, i: number) => (
          <div key={i} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}><span style={{ color: '#f6c445' }}>{m.who}:</span> {m.msg}</div>
        );
        if (chatOpen) return <div style={{ ...box, minWidth: px(200) }}>{chat.length ? chat.slice(-6).map(line) : <span style={{ color: 'rgba(255,255,255,0.6)' }}>Belum ada pesan</span>}</div>;
        if (last && Date.now() - last.t < 9000) return <div style={box}>{line(last, 0)}</div>;
        return null;
      })()}

      {/* kanan atas: mata uang, hadiah, pengaturan, lokasi */}
      <div style={{ position: 'absolute', right: `calc(env(safe-area-inset-right, 0px) + ${px(10)}px)`, top: `calc(env(safe-area-inset-top, 0px) + ${px(6)}px)`, display: fishing ? 'none' : 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: px(5) }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: px(4) }}>
          <div style={{ ...dockPill('#b08cff'), padding: `0 ${px(14)}px 0 ${px(10)}px` }}>
            <SparkIcon size={px(18)} />
            <span style={{ fontSize: px(15), fontWeight: 700, color: '#c7b2ff' }}>{formatNum(xp)}</span>
          </div>
          <div style={{ ...dockPill('#3fe08a'), padding: `0 ${px(5)}px 0 ${px(11)}px`, gap: px(7) }}>
            <GemIcon size={px(18)} />
            <span style={{ fontSize: px(15), fontWeight: 700, color: '#8ff0a6' }}>{formatNum(crystal)}</span>
            <button onClick={() => setShopOpen(true)} aria-label="Tambah" style={{ width: px(22), height: px(22), borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%,#58e89a,#1fa85a)', border: `${px(1.5)}px solid #1b1818`, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}><Svg d="M12 5v14M5 12h14" size={px(13)} w={3.4} /></button>
          </div>
          <button onClick={() => say('Belum ada hadiah hari ini 🎁')} aria-label="Hadiah" style={{ ...ringBtn('#ffb02e'), marginBottom: px(5) }}><GiftIcon size={px(20)} /></button>
          <button onClick={() => setMenuOpen(true)} aria-label="Pengaturan" style={{ ...ringBtn('#8fdcf0'), marginBottom: px(5) }}><GearIcon size={px(19)} /></button>
        </div>
        <div style={{ ...pillBox, boxSizing: 'border-box', minWidth: px(154), padding: `${px(5)}px ${px(11)}px`, textAlign: 'right', borderRadius: px(14), border: `${px(2)}px solid #1b1818`, boxShadow: `0 0 0 ${px(1.5)}px #5fc3f2, 0 ${px(3)}px ${px(6)}px rgba(60,170,255,0.45)`, marginTop: px(2) }}>
          <div style={{ fontSize: px(14), fontWeight: 700, color: '#7fd2ff', lineHeight: 1.15 }}>Pulau Tengah Laut</div>
          <div style={{ fontSize: px(12.5), fontWeight: 600, color: '#b4bac6', marginTop: px(1), whiteSpace: 'nowrap' }}>{dateStr} · <b style={{ color: '#fff' }}>{timeStr}</b> {tz}</div>
        </div>
        {guide && (
          <div style={{ display: 'flex', alignItems: 'center', gap: px(8), background: 'rgba(255,252,242,0.96)', color: '#1a3a22', borderRadius: px(14), padding: `${px(6)}px ${px(14)}px ${px(6)}px ${px(6)}px`, boxShadow: '0 2px 10px rgba(0,0,0,0.25)', marginTop: px(2) }}>
            <div style={{ width: px(34), height: px(34), borderRadius: '50%', background: '#2fb35a', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
              <svg width={px(20)} height={px(20)} viewBox="0 0 24 24" style={{ transform: `rotate(${rotate}deg)` }}><path d="M12 3l7 16-7-4-7 4z" fill="#fff" /></svg>
            </div>
            <div>
              <div style={{ fontSize: px(15), fontWeight: 700, color: guide.kind === 'raksasa' ? '#7c3aed' : guide.kind === 'hiu' ? '#c2410c' : '#1f8a45', lineHeight: 1.1 }}>{guide.kind === 'raksasa' ? '🐋 Bayangan Raksasa!' : guide.kind === 'hiu' ? '🦈 Hiu Legendary!' : 'Ada Gerombolan Ikan!'}</div>
              <div style={{ fontSize: px(12.5), fontWeight: 600 }}>{guide.dist} m · 🍀+200% · {mmss(guide.left)}</div>
            </div>
          </div>
        )}
      </div>

      {/* petunjuk */}
      {(HINT[phase] || (intro && phase === 'idle')) && !fishing && !popup && !bagOpen && (
        <div style={{ position: 'absolute', left: '50%', top: `calc(env(safe-area-inset-top, 0px) + ${px(70)}px)`, transform: 'translateX(-50%)', maxWidth: '60%', pointerEvents: 'none', background: 'rgba(32,22,10,0.85)', border: '1px solid rgba(255,214,140,0.35)', borderRadius: px(14), padding: `${px(6)}px ${px(14)}px`, fontSize: px(14), fontWeight: 600, color: '#ffe9bf', textAlign: 'center' }}>
          {HINT[phase] || 'Hadapkan ke air, lalu tekan Joran'}
        </div>
      )}
      {toast && <div style={{ position: 'absolute', left: '50%', top: px(112), transform: 'translateX(-50%)', zIndex: 20, background: 'rgba(15,23,42,0.92)', borderRadius: 99, padding: `${px(7)}px ${px(16)}px`, fontSize: px(14), fontWeight: 600, pointerEvents: 'none' }}>{toast}</div>}

      {/* joystick */}
      {!fishing && <div
        ref={joyRef}
        onPointerDown={joyDown}
        onPointerMove={(e) => joyActive.current && joyMove(e)}
        onPointerUp={joyUp}
        onPointerCancel={joyUp}
        style={{ position: 'absolute', left: `calc(env(safe-area-inset-left, 0px) + ${px(9)}px)`, bottom: `calc(env(safe-area-inset-bottom, 0px) + ${px(27)}px)`, width: px(105), height: px(105), borderRadius: '50%', background: 'rgba(196,160,110,0.5)', border: `${px(2)}px solid rgba(255,235,200,0.4)`, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', touchAction: 'none' }}
      >
        <div style={{ width: px(45), height: px(45), borderRadius: '50%', background: 'rgba(240,220,185,0.6)', border: `${px(2)}px solid rgba(255,240,215,0.75)`, boxSizing: 'border-box', transform: `translate(${knob.x}px, ${knob.y}px)` }} />
      </div>}

      {/* buff + hotbar ransel */}
      {!fishing && (() => {
        const chips = [
          { k: 'pow', icon: <CloverIcon size={px(12)} color="#1f7a35" />, t: String(rod.power), white: true, hi: false },
          { k: 'luck', icon: <CloverIcon size={px(13)} />, t: '+' + luckPct + '%', white: false, hi: status.inShoal },
          { k: 'money', icon: <CoinIcon size={px(13)} />, t: '+' + Math.round(rod.money * 100) + '%', white: false, hi: false },
          { k: 'xp', icon: <XpIcon size={px(12)} />, t: '+' + Math.round(rod.xp * 100) + '%', white: false, hi: false },
        ];
        return (
          <div style={{ position: 'absolute', left: '50%', bottom: `calc(env(safe-area-inset-bottom, 0px) + ${px(12)}px)`, transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: px(5) }}>
            <div style={{ display: 'flex', gap: px(5), alignItems: 'center' }}>
              {chips.slice(0, buffOpen ? chips.length : 1).map((c) => (
                <span key={c.k} style={chipSt(c.white, c.hi)}>{c.icon}{c.t}</span>
              ))}
              <button onClick={() => setBuffOpen((o) => !o)} aria-label="Buff" style={{ width: px(22), height: px(22), borderRadius: '50%', background: '#1f6fe0', border: `${px(2)}px solid #6aa8ff`, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}><Svg d={buffOpen ? 'M14 6l-6 6 6 6' : 'M10 6l6 6-6 6'} size={px(12)} w={3.6} /></button>
            </div>
            <div style={{ display: 'flex', gap: px(3), alignItems: 'flex-end' }}>
              <button style={slot(true, '#4a9bff')} onClick={() => setShopOpen(true)} aria-label="Joran"><RodIcon size={px(26)} color={RARITY[rod.rarity].color} /></button>
              {recent.map((b) => {
                const sp = SPECIES_BY_ID[b.s];
                const xl = isXL(sp, b.w);
                return (
                  <button key={b.id} style={slot(false, rarityBorder(sp.rarity, xl))} onClick={() => { setSel(b.id); setBagOpen(true); }} aria-label={sp.name}>
                    {xl && <span style={xlTag()}>XL</span>}
                    <FishIcon id={sp.id} scale={0.62 * u} />
                    <span style={wLabel()}>{wl(b.w)}</span>
                  </button>
                );
              })}
              {held && (
                <button style={{ ...slot(false, '#34d27a'), width: px(40) }} onClick={() => setHeld(null)} aria-label="Lepas ikan">
                  <span style={{ fontSize: px(18) }}>🙌</span>
                  <span style={wLabel()}>Lepas</span>
                </button>
              )}
              <button style={slot(false, '#4a9bff')} onClick={() => { setSel(''); setBagOpen(true); }} aria-label="Ransel">
                <BagIcon size={px(26)} />
                <span style={{ ...wLabel(), color: bag.length >= BAG_MAX ? '#ff8a8a' : '#fff' }}>{bag.length}/{BAG_MAX}</span>
              </button>
            </div>
          </div>
        );
      })()}

      {/* penghitung ikan lepas (x0) */}
      {!fishing && (
        <div style={{ position: 'absolute', right: `calc(env(safe-area-inset-right, 0px) + ${px(88)}px)`, bottom: `calc(env(safe-area-inset-bottom, 0px) + ${px(112)}px)`, display: 'flex', alignItems: 'center', gap: px(5), height: px(26), boxSizing: 'border-box', padding: `0 ${px(12)}px 0 ${px(8)}px`, borderRadius: 99, background: '#fbf1dc', border: `${px(2)}px solid #d9c196`, boxShadow: '0 2px 0 rgba(120,90,40,0.45)', color: '#c2392b', fontWeight: 700, fontSize: px(16) }}>
          <CrossRodIcon size={px(20)} />×{fails}
        </div>
      )}

      {/* tombol aksi */}
      <div style={{ position: 'absolute', right: `calc(env(safe-area-inset-right, 0px) + ${px(14)}px)`, bottom: `calc(env(safe-area-inset-bottom, 0px) + ${px(32)}px)`, display: 'flex', alignItems: 'flex-end', gap: px(10) }}>
        {(phase === 'cast' || phase === 'wait') && (
          <button onClick={() => engineRef.current?.cancel()} aria-label="Batal" style={{ ...pillBox, width: px(46), height: px(46), borderRadius: '50%', marginBottom: px(8), display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, background: 'rgba(225,29,72,0.9)' }}><Svg d="M6 6l12 12M18 6L6 18" size={px(22)} /></button>
        )}
        <button
          onPointerDown={(e) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); engineRef.current?.action(true); }}
          onPointerUp={() => engineRef.current?.action(false)}
          onPointerCancel={() => engineRef.current?.action(false)}
          className={phase === 'bite' ? 'komikita-pulse' : undefined}
          style={{ width: px(80), height: px(80), borderRadius: '50%', border: `${px(4)}px solid #fff`, boxSizing: 'border-box', background: btnBg, color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: px(1), boxShadow: '0 3px 0 rgba(80,60,40,0.55), 0 5px 14px rgba(0,0,0,0.35)', touchAction: 'none', cursor: 'pointer', padding: 0, fontFamily: HUD }}
        >
          {phase === 'idle' ? <FishRodIcon size={px(32)} /> : <RodIcon size={px(30)} color="#fff" />}
          <span style={{ fontSize: px(15), fontWeight: 700, textShadow: '0 2px 3px rgba(60,40,20,0.7)' }}>{btnLabel}</span>
        </button>
      </div>
      <style>{`@keyframes kpulse{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}.komikita-pulse{animation:kpulse .5s infinite}`}</style>

      {/* hasil tangkapan: kartu lengkap (ketuk di mana saja untuk menutup) */}
      {popup && (() => {
        const sp = SPECIES_BY_ID[popup.item.s];
        const rar = RARITY[sp.rarity];
        const xl = isXL(sp, popup.item.w);
        const big = isShowoff(sp, popup.item.w);
        const price = fishPrice(sp, popup.item.w, rod.money);
        const ratio = kSizeRatio(sp, popup.item.w);
        const q = qualityOf(ratio);
        const stars = 1 + Math.min(6, Math.floor(ratio * 6.999));
        const len = formatLength(fishLengthCm(sp.shape, popup.item.w));
        const odds = oddsOf(sp.id);
        const mult = 1 + Math.max(0, rod.xp);
        const pct = Math.min(100, Math.round((lv.into / Math.max(1, lv.need)) * 100));
        const special = popup.up ? `LEVEL NAIK! · LEVEL ${popup.up}` : popup.record ? 'REKOR BARU!' : big ? 'TANGKAPAN BESAR!' : '';
        const INK = '#4a2c17';
        const k = (n: number) => Math.round(n * u * 0.68);
        const box = (hi: boolean): CSSProperties => ({ flex: 1, borderRadius: k(12), padding: `${k(5)}px ${k(2)}px ${k(4)}px`, background: hi ? '#ffe3cc' : '#fff', border: `${k(2)}px solid ${hi ? '#f7c9a3' : '#f1e6d2'}`, boxShadow: `0 ${k(3)}px 0 ${hi ? '#efb487' : '#e3d6bd'}`, textAlign: 'center' });
        return (
          <div style={{ ...ov, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: k(8), background: 'rgba(8,14,28,0.72)', backdropFilter: 'blur(3px)' }} onClick={closePopup}>
            <style>{`@keyframes kcardin{0%{transform:translateY(${k(16)}px) scale(.88);opacity:0}100%{transform:none;opacity:1}}@keyframes kspin{to{transform:rotate(360deg)}}@keyframes ktw{0%,100%{opacity:.15;transform:scale(.6)}50%{opacity:1;transform:scale(1.15)}}`}</style>
            <div style={{ position: 'relative', width: k(300), maxHeight: '92%', animation: 'kcardin .28s ease-out' }}>
              {/* pita rarity */}
              <div style={{ position: 'absolute', top: k(-6), left: '50%', transform: 'translateX(-50%)', zIndex: 3, minWidth: k(150), textAlign: 'center', background: 'linear-gradient(180deg,#eef1f7,#c9d0de)', border: `${k(2)}px solid #aab3c6`, borderRadius: k(10), padding: `${k(2)}px ${k(18)}px`, boxShadow: `0 ${k(3)}px 0 #8d97ad`, fontWeight: 700, fontSize: k(17), letterSpacing: k(2), color: '#1d2230' }}>
                {RARITY_EN[sp.rarity]}
                <span style={{ position: 'absolute', left: 0, right: 0, bottom: k(-4), height: k(3), borderRadius: 99, background: rar.color }} />
              </div>
              <div style={{ borderRadius: k(24), border: `${k(4)}px solid #c4cbd8`, background: '#fff7e6', boxShadow: `0 ${k(6)}px 0 #9aa3b6, 0 0 ${k(40)}px ${rar.color}88`, padding: `${k(24)}px ${k(12)}px ${k(10)}px`, textAlign: 'center', color: INK, overflow: 'hidden', position: 'relative' }}>
                {special && <div style={{ fontSize: k(12), fontWeight: 700, letterSpacing: k(1.5), color: '#c0561b', marginBottom: k(2) }}>{special}</div>}
                {/* ikan + sinar + kilau */}
                <div style={{ position: 'relative', height: k(84), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ position: 'absolute', width: k(190), height: k(190), left: '50%', top: '50%', marginLeft: k(-95), marginTop: k(-95), borderRadius: '50%', background: `repeating-conic-gradient(${rar.color}55 0deg 9deg, transparent 9deg 24deg)`, WebkitMaskImage: 'radial-gradient(circle, #000 18%, transparent 68%)', maskImage: 'radial-gradient(circle, #000 18%, transparent 68%)', animation: 'kspin 24s linear infinite' }} />
                  {SPARKS.map((s2, i) => (
                    <svg key={i} viewBox="0 0 20 20" width={k(s2.s)} height={k(s2.s)} style={{ position: 'absolute', left: `${s2.x}%`, top: `${s2.y}%`, animation: `ktw 1.8s ease-in-out ${s2.d}s infinite` }}><path d="M10 0l2.2 7.8L20 10l-7.8 2.2L10 20l-2.2-7.8L0 10l7.8-2.2z" fill="#fff" /></svg>
                  ))}
                  <div style={{ position: 'relative' }}>
                    <FishIcon id={sp.id} scale={2.6 * u * 0.68} />
                    {xl && <span style={{ position: 'absolute', top: k(-4), right: k(-14), background: '#f59e3d', color: '#fff', fontWeight: 700, fontSize: k(12), borderRadius: k(7), padding: `${k(1)}px ${k(6)}px`, border: `${k(1.5)}px solid #fff` }}>XL</span>}
                  </div>
                </div>
                {/* bintang */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: k(3), margin: `${k(2)}px 0 ${k(1)}px` }}>
                  {Array.from({ length: 7 }, (_, i) => (
                    <svg key={i} viewBox="0 0 24 24" width={k(16)} height={k(16)}><path d="M12 2l3 6.6 7.2.8-5.4 4.9 1.5 7.1L12 17.7 5.7 21.4l1.5-7.1L1.8 9.4 9 8.6z" fill={i < stars ? '#f5b82e' : '#e8dcc4'} stroke={i < stars ? '#d98e0f' : 'none'} strokeWidth="1" /></svg>
                  ))}
                </div>
                <div style={{ fontSize: k(27), fontWeight: 700, lineHeight: 1.1, color: INK }}>{sp.name}</div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: k(4), marginTop: k(4), background: q.bg, color: q.fg, fontWeight: 700, fontSize: k(15), borderRadius: 99, padding: `${k(2)}px ${k(14)}px`, boxShadow: '0 2px 0 rgba(0,0,0,0.18)' }}>{q.star && '⭐'}{q.label}</span>
                {/* statistik */}
                <div style={{ display: 'flex', gap: k(7), marginTop: k(9) }}>
                  <div style={box(true)}>
                    <div style={{ fontSize: k(23), fontWeight: 700, color: '#b5441f', lineHeight: 1.05 }}>{formatWeight(popup.item.w)}</div>
                    <div style={{ fontSize: k(12), fontWeight: 700, letterSpacing: k(1), color: '#a07a62' }}>BERAT</div>
                  </div>
                  <div style={box(false)}>
                    <div style={{ fontSize: k(23), fontWeight: 700, lineHeight: 1.05 }}>{len}</div>
                    <div style={{ fontSize: k(12), fontWeight: 700, letterSpacing: k(1), color: '#a49a88' }}>PANJANG</div>
                  </div>
                  <div style={box(false)}>
                    <div style={{ fontSize: k(23), fontWeight: 700, lineHeight: 1.05, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: k(3) }}>
                      <svg viewBox="0 0 20 20" width={k(16)} height={k(16)}><path d="M10 1l2.4 6.6L19 10l-6.6 2.4L10 19l-2.4-6.6L1 10l6.6-2.4z" fill="none" stroke="#4aa8ff" strokeWidth="1.8" strokeLinejoin="round" /></svg>
                      {formatNum(price)}
                    </div>
                    <div style={{ fontSize: k(12), fontWeight: 700, letterSpacing: k(1), color: '#a49a88' }}>NILAI</div>
                  </div>
                </div>
                <div style={{ marginTop: k(7), fontSize: k(14), fontWeight: 700, color: '#9d9484' }}>{odds ? `Peluang 1 dari ${formatNum(odds)}` : 'Ikan event spesial'}</div>
                <div style={{ borderTop: `${k(2)}px dashed #ecdcb8`, margin: `${k(7)}px 0` }} />
                {/* level & XP */}
                <div style={{ display: 'flex', alignItems: 'center', gap: k(7) }}>
                  <span style={{ background: 'linear-gradient(180deg,#3b8cff,#1f64d6)', color: '#fff', fontWeight: 700, fontSize: k(15), borderRadius: 99, padding: `${k(2)}px ${k(12)}px`, boxShadow: '0 2px 0 #123f8f', whiteSpace: 'nowrap' }}>Lv {lv.level}</span>
                  <span style={{ fontSize: k(16), fontWeight: 700, color: '#2d7be0', whiteSpace: 'nowrap' }}>+{popup.gain} XP</span>
                  {mult > 1 && <span style={{ fontSize: k(13), fontWeight: 700, color: '#8a6a1f', background: '#fff0c4', borderRadius: 99, padding: `${k(1)}px ${k(8)}px`, whiteSpace: 'nowrap' }}>⭐ ×{mult.toFixed(1).replace('.', ',')}</span>}
                  <span style={{ marginLeft: 'auto', fontSize: k(13), fontWeight: 700, color: '#8f8676', whiteSpace: 'nowrap' }}>{formatNum(lv.into)}/{formatNum(lv.need)} XP</span>
                </div>
                <div style={{ marginTop: k(5), height: k(10), borderRadius: 99, background: '#e9dfca', overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', borderRadius: 99, background: 'linear-gradient(180deg,#8be08f,#43b94f)', transition: 'width .6s ease-out' }} />
                </div>
              </div>
            </div>
            <div style={{ marginTop: k(12), fontSize: k(15), fontWeight: 600, color: 'rgba(255,255,255,0.75)', pointerEvents: 'none' }}>Ketuk di mana saja untuk menutup</div>
          </div>
        );
      })()}

      {/* ransel penuh */}
      {bagOpen && (() => {
        const NAVY = '#3d4b6e';
        const stroke = `-1px 0 ${NAVY}, 1px 0 ${NAVY}, 0 -1px ${NAVY}, 0 1px ${NAVY}`;
        const wb = (extra: CSSProperties = {}): CSSProperties => ({ border: 0, borderRadius: px(12), background: '#fff', color: '#4a3a24', fontFamily: HUD, fontWeight: 700, fontSize: px(13), padding: `${px(6)}px ${px(14)}px`, cursor: 'pointer', boxShadow: '0 2px 0 rgba(0,0,0,0.18)', ...extra });
        const bc = (r: keyof typeof RARITY) => (r === 'common' ? '#c6d0e0' : r === 'uncommon' ? '#5fd66f' : r === 'rare' ? '#4aa3ff' : r === 'epic' ? '#b48cff' : '#f5c451');
        const cell = (b: BagItem, h: number, nameSz: number, wSz: number, onClick: () => void, on: boolean) => {
          const sp = SPECIES_BY_ID[b.s];
          return (
            <button key={b.id} onClick={onClick} style={{ position: 'relative', height: px(h), borderRadius: px(12), background: 'linear-gradient(180deg,#8e9cc4,#7685b0)', border: `${px(3)}px solid ${on ? '#ffb02e' : bc(sp.rarity)}`, boxSizing: 'border-box', padding: 0, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden', boxShadow: '0 2px 0 rgba(30,40,70,0.25)' }}>
              <span style={{ fontSize: px(nameSz), fontWeight: 700, color: '#fff', marginTop: px(3), textShadow: stroke, lineHeight: 1.05, maxWidth: '94%', textAlign: 'center', fontFamily: HUD }}>{sp.name.split(' ').slice(0, 2).join(' ')}</span>
              <FishIcon id={sp.id} scale={(h / 66) * 0.78 * u} />
              <span style={{ fontSize: px(wSz), fontWeight: 700, color: '#fff', marginBottom: px(3), textShadow: stroke, fontFamily: HUD }}>{wl(b.w)}</span>
              {isShowoff(sp, b.w) && <span style={{ position: 'absolute', right: px(3), bottom: px(h * 0.3), color: '#ffcf3a', fontSize: px(14), textShadow: `0 1px 0 ${NAVY}` }}>★</span>}
            </button>
          );
        };
        const cells: (BagItem | null)[] = Array.from({ length: BAG_MAX }, (_, i) => shownBag[i] || null);
        const dsel = bag.find((x) => x.id === sel);
        const small = bag.filter((x) => !isShowoff(SPECIES_BY_ID[x.s], x.w));
        return (
          <div style={{ ...ov, display: 'flex', flexDirection: 'column', background: '#fff5e1', fontFamily: HUD }} onClick={() => { if (sel) setSel(''); else setBagOpen(false); }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: px(10), background: 'linear-gradient(180deg,#2f9fb5,#237f95)', padding: `${px(7)}px ${px(12)}px`, boxShadow: '0 3px 0 #1c6578' }} onClick={(e) => e.stopPropagation()}>
              <BagIcon size={px(24)} />
              <span style={{ color: '#fff', fontWeight: 700, fontSize: px(18) }}>Tas</span>
              <span style={{ background: '#e8f1f8', color: '#2a4a5a', fontWeight: 700, fontSize: px(15), borderRadius: 99, padding: `${px(1)}px ${px(14)}px` }}>{bag.length}/{BAG_MAX}</span>
              <span style={{ marginLeft: 'auto' }} />
              <button onClick={async () => { if (!small.length) { say('Tidak ada ikan biasa'); return; } if (window.confirm('Buang (jual) ' + small.length + ' ikan biasa? Ikan XL/Epik/Legendary aman.')) await sell(small.map((x) => x.id)); }} style={wb()}>🗑️ Buang</button>
              <button onClick={() => setBagSort(bagSort === 'baru' ? 'nilai' : 'baru')} style={wb()}>⇅ {bagSort === 'baru' ? 'Terbaru' : 'Termahal'}</button>
              <button onClick={() => setBagOpen(false)} aria-label="Tutup" style={{ width: px(36), height: px(34), borderRadius: px(9), border: 0, background: '#e5484d', boxShadow: '0 3px 0 #a62a2f', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}><Svg d="M6 6l12 12M18 6L6 18" size={px(18)} /></button>
            </div>
            <div style={{ padding: `${px(5)}px ${px(12)}px`, fontSize: px(13), fontWeight: 700, color: '#8a6d4a', borderBottom: `${px(2)}px dashed #e3cfa4` }} onClick={(e) => e.stopPropagation()}>Nilai isi tas <b style={{ color: '#1d78c8' }}>💎{formatNum(total)}</b> · jual di Lapak Bang Jaka 🐟</div>
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: `${px(8)}px ${px(12)}px`, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(' + px(70) + 'px, 1fr))', gap: px(7), alignContent: 'start' }} onClick={(e) => e.stopPropagation()}>
              {cells.map((b, i) => b ? cell(b, 72, 9.5, 11, () => setSel(b.id), dsel?.id === b.id) : <div key={'e' + i} style={{ height: px(72), borderRadius: px(12), background: '#aeb4c2', border: `${px(3)}px solid #bfc4d0`, boxSizing: 'border-box' }} />)}
            </div>
            <div style={{ borderTop: `${px(2)}px dashed #e3cfa4`, padding: `${px(5)}px ${px(12)}px ${px(8)}px` }} onClick={(e) => e.stopPropagation()}>
              <div style={{ fontSize: px(16), fontWeight: 700, color: '#6b4a24', marginBottom: px(3) }}>Hotbar</div>
              <div style={{ display: 'flex', gap: px(7), justifyContent: 'center' }}>
                <button onClick={() => { setBagOpen(false); setShopOpen(true); }} style={{ position: 'relative', width: px(66), height: px(66), borderRadius: px(12), background: 'linear-gradient(180deg,#8e9cc4,#7685b0)', border: `${px(3)}px solid #ffb02e`, boxSizing: 'border-box', padding: 0, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: px(1) }}>
                  <RodIcon size={px(28)} color={RARITY[rod.rarity].color} />
                  <span style={{ fontSize: px(11), fontWeight: 700, color: '#fff', textShadow: stroke }}>Joran</span>
                </button>
                {recent.map((b) => cell(b, 66, 9, 11, () => setSel(b.id), dsel?.id === b.id)).map((el) => <div key={el.key} style={{ width: px(66) }}>{el}</div>)}
              </div>
            </div>
            {dsel && (() => {
              const sp = SPECIES_BY_ID[dsel.s];
              const rar = RARITY[sp.rarity];
              const btn: CSSProperties = { borderRadius: px(10), border: 0, fontFamily: HUD, fontWeight: 700, fontSize: px(14), padding: `${px(8)}px 0`, cursor: 'pointer' };
              return (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(20,24,40,0.45)' }} onClick={(e) => { e.stopPropagation(); setSel(''); }}>
                  <div style={{ width: px(230), borderRadius: px(16), border: `${px(3)}px solid ${rar.color}`, background: '#fff9ec', padding: px(10), textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'flex', justifyContent: 'center', background: '#8e9cc4', borderRadius: px(12) }}><FishIcon id={sp.id} scale={2 * u} /></div>
                    <div style={{ fontSize: px(16), fontWeight: 700, color: '#3b2f1a', marginTop: px(5) }}>{sp.name}</div>
                    <div style={{ fontSize: px(12), fontWeight: 700, color: '#8a6d0f' }}>{rar.label} · {formatWeight(dsel.w)}</div>
                    <div style={{ display: 'grid', gap: px(6), marginTop: px(8) }}>
                      {isShowoff(sp, dsel.w) && <button onClick={() => share(dsel)} style={{ ...btn, background: 'linear-gradient(90deg,#c36bff,#f5c451)', color: '#1a1020' }}>Pamerkan</button>}
                      <button onClick={() => { setHeld(held && held.id === dsel.id ? null : dsel); setSel(''); setBagOpen(false); }} style={{ ...btn, background: '#38a3d8', color: '#fff' }}>{held && held.id === dsel.id ? 'Lepas ikan' : '🙌 Pegang'}</button>
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
        <div style={{ ...ov, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }} onClick={() => setConfirmExit(false)}>
          <div style={{ width: px(300), maxWidth: '90%', background: '#141a28', borderRadius: px(20), padding: px(18), textAlign: 'center', color: '#fff', boxShadow: '0 12px 40px rgba(0,0,0,0.5)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontFamily: HUD, fontWeight: 800, fontSize: px(24) }}>Yakin keluar?</div>
            <div style={{ marginTop: px(6), fontSize: px(14), fontWeight: 600, color: 'rgba(255,255,255,0.65)' }}>Kamu akan meninggalkan pulau mancing.</div>
            <div style={{ display: 'flex', gap: px(10), marginTop: px(16) }}>
              <button onClick={() => setConfirmExit(false)} style={{ flex: 1, borderRadius: px(12), border: 0, background: 'rgba(255,255,255,0.12)', color: '#fff', fontFamily: HUD, fontWeight: 700, fontSize: px(16), padding: `${px(11)}px 0`, cursor: 'pointer' }}>Tetap main</button>
              <button onClick={doExit} style={{ flex: 1, borderRadius: px(12), border: 0, background: '#e11d48', color: '#fff', fontFamily: HUD, fontWeight: 700, fontSize: px(16), padding: `${px(11)}px 0`, cursor: 'pointer' }}>Ya, keluar</button>
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

      {/* Toko & Gacha */}
      {shopOpen && (
        <ShopScreen
          px={(n: number) => px(n * 0.64)} font={HUD} crystal={crystal} rods={rods} equippedRod={equippedRod}
          tab={shopTab} onTab={setShopTab} buying={buying} pulling={pulling}
          onClose={() => setShopOpen(false)} onBuy={buyRod} onEquip={props.onEquipRod} onPull={pullGachaN}
          pity={props.pity ?? 0} starterClaimed={!!props.starterClaimed} onClaimStarter={claimStarter}
        />
      )}

      {/* hasil gacha */}
      {gachaResult && (() => {
        const rar = RARITY[gachaResult.rod.rarity];
        return (
          <div style={{ ...ov, zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: px(10) }}>
            <div style={{ width: px(280), borderRadius: px(22), border: `${px(3)}px solid ${rar.color}`, background: '#10243a', boxShadow: `0 0 ${px(50)}px ${rar.color}77`, padding: px(16), textAlign: 'center' }}>
              <div style={{ fontSize: px(12), fontWeight: 700, letterSpacing: 2, color: rar.color }}>{gachaResult.duplicate ? 'SUDAH PUNYA' : 'JORAN BARU!'}</div>
              <div style={{ margin: `${px(8)}px 0` }}><RodIcon size={px(64)} color={rar.color} /></div>
              <div style={{ fontSize: px(21), fontWeight: 700 }}>{gachaResult.rod.name}</div>
              <span style={{ display: 'inline-block', marginTop: px(3), background: rar.color, color: '#000', fontWeight: 700, fontSize: px(12), borderRadius: 99, padding: `${px(1)}px ${px(12)}px` }}>{rar.label}</span>
              <p style={{ margin: `${px(10)}px 0 0`, fontSize: px(13), fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>{gachaResult.duplicate ? `Ditukar jadi +${formatNum(GACHA_DUPLICATE_REFUND)} Crystal` : `🍀+${Math.round(gachaResult.rod.luck * 100)}% 💰+${Math.round(gachaResult.rod.money * 100)}% ✨+${Math.round(gachaResult.rod.xp * 100)}%`}</p>
              <button onClick={() => setGachaResult(null)} style={{ marginTop: px(12), width: '100%', borderRadius: px(14), border: 0, background: '#34d27a', color: '#04210f', fontFamily: HUD, fontWeight: 700, fontSize: px(15), padding: `${px(9)}px 0`, cursor: 'pointer' }}>Lanjut</button>
            </div>
          </div>
        );
      })()}

      {/* hasil buka beruntun */}
      {gachaMulti && (
        <div style={{ ...ov, zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: px(10) }}>
          <div style={{ width: px(560), maxWidth: '100%', maxHeight: '100%', overflowY: 'auto', borderRadius: px(22), border: `${px(4)}px solid #e6d4b0`, background: '#fff5e1', padding: px(16), textAlign: 'center', fontFamily: HUD, color: '#5a3b1e' }}>
            <div style={{ fontSize: px(24), fontWeight: 800 }}>Hasil Buka {gachaMulti.length}×</div>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${px(96)}px, 1fr))`, gap: px(10), margin: `${px(12)}px 0` }}>
              {gachaMulti.map((g, i) => {
                const rar = RARITY[g.rod.rarity];
                return (
                  <div key={i} style={{ borderRadius: px(14), border: `${px(3)}px solid ${rar.color}`, background: '#fffaf0', padding: `${px(8)}px ${px(4)}px` }}>
                    <div style={{ display: 'flex', justifyContent: 'center' }}><RodArt color={rar.color} size={px(52)} /></div>
                    <div style={{ fontSize: px(12), fontWeight: 800, lineHeight: 1.1 }}>{g.rod.name.replace('Joran ', '')}</div>
                    <div style={{ fontSize: px(11), fontWeight: 800, color: g.duplicate ? '#8a6d4a' : '#1f7a3c' }}>{g.duplicate ? `+${formatNum(GACHA_DUPLICATE_REFUND)} Crystal` : 'BARU!'}</div>
                  </div>
                );
              })}
            </div>
            <button onClick={() => setGachaMulti(null)} style={{ width: '100%', borderRadius: px(14), border: 0, background: 'linear-gradient(180deg,#3b8cf0,#1f64cc)', boxShadow: '0 4px 0 #164b9c', color: '#fff', fontFamily: HUD, fontWeight: 800, fontSize: px(17), padding: `${px(9)}px 0`, cursor: 'pointer' }}>Lanjut</button>
          </div>
        </div>
      )}
    </div>
  );
}
