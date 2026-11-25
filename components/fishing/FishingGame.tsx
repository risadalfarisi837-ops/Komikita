'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as RPointerEvent } from 'react';
import { FishingEngine } from './engine';
import type { Catch, EngineStatus, Phase } from './engine';
import { FISH_H, FISH_W, drawFish } from './art';
import {
  BAG_MAX, DEFAULT_ROD, GACHA_DUPLICATE_REFUND, GACHA_PRICE, RARITY, RODS, RODS_BY_ID, SPECIES_BY_ID,
  fishPrice, formatNum, formatWeight, isShowoff, isXL, levelFromXp, newId, titleFor, xpFor,
} from '@/lib/fishing';
import type { BagItem, Rod } from '@/lib/fishing';

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
  onExit: () => void;
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

// Keluar dari game: layar dikembalikan tegak (portrait), keluar layar penuh, lalu rotasi bebas lagi
async function leaveLandscape() {
  const o = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void>; unlock?: () => void };
  try { await o.lock?.('portrait'); } catch { /* browser tidak mengizinkan, cukup di-unlock */ }
  try { if (document.fullscreenElement) await document.exitFullscreen(); } catch { /* abaikan */ }
  setTimeout(() => { try { o.unlock?.(); } catch { /* abaikan */ } }, 600);
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
  const [shopTab, setShopTab] = useState<'toko' | 'gacha'>('toko');
  const [buying, setBuying] = useState('');
  const [pulling, setPulling] = useState(false);
  const [gachaResult, setGachaResult] = useState<{ rod: Rod; duplicate: boolean } | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [u, setU] = useState(1);
  const [status, setStatus] = useState<EngineStatus>({ shoal: null, inShoal: false });
  const [now, setNow] = useState(() => new Date());
  const [intro, setIntro] = useState(true);
  const [fails, setFails] = useState(0);
  const [chat, setChat] = useState<{ who: string; msg: string; t: number }[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [buffOpen, setBuffOpen] = useState(true);
  const [menu2, setMenu2] = useState(false);
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
        setPopup({ item, gain, up: after > before ? after : 0, record });
      },
    });
    engineRef.current = engine;
    const fit = () => {
      const r = wrap.getBoundingClientRect();
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
    engineRef.current?.setBagFull(bag.length >= BAG_MAX);
    engineRef.current?.setProfile({ name: name || 'Tamu', title: titleFor(lv.level), level: lv.level, rodName: rod.name, rodId: rod.id });
  }, [lv.level, bag.length, rod.luck, rod.name, rod.id, name]);

  // ikan yang dipegang karakter (pamer)
  useEffect(() => {
    const sp = held ? SPECIES_BY_ID[held.s] : null;
    engineRef.current?.setHeld(held && sp ? { species: sp, weight: held.w } : null);
  }, [held]);

  useEffect(() => {
    quietLandscape().catch(() => {});
    return () => { leaveLandscape(); };
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);

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
  const pullGacha = async () => {
    if (pulling) return;
    setPulling(true);
    const res = await props.onGacha();
    if (res === 'kurang') say('Crystal kurang buat Gacha');
    else if (res === 'gagal') say('Gacha gagal, coba lagi');
    else setGachaResult(res);
    setPulling(false);
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
  // otomatis saat masuk game: hanya kunci orientasi (tanpa layar penuh), jadi tidak memunculkan
  // notifikasi hitam bawaan Android. Layar penuh tetap bisa lewat menu pengaturan.
  const quietLandscape = async () => {
    try {
      const o = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
      await o.lock?.('landscape');
    } catch { /* browser biasa menolak tanpa layar penuh; putar layar manual atau pakai menu */ }
  };
  const landscape = async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      const o = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
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
  const selItem = bag.find((b) => b.id === sel) || sorted[0];
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
  const wLabel = (): CSSProperties => ({ position: 'absolute', bottom: px(1), left: 0, right: 0, textAlign: 'center', fontFamily: '"Pixelify Sans", ui-monospace, monospace', fontSize: px(9.5), fontWeight: 700, color: '#fff', textShadow: '-1px 0 #000, 1px 0 #000, 0 -1px #000, 0 1px #000, 0 2px 2px rgba(0,0,0,0.6)' });
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
    <div ref={wrapRef} style={{ position: 'fixed', inset: 0, zIndex: 70, userSelect: 'none', overflow: 'hidden', background: '#2872b4', color: '#fff', touchAction: 'none', fontFamily: HUD }}>
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
              <div style={{ fontSize: px(15), fontWeight: 700, color: '#1f8a45', lineHeight: 1.1 }}>Ada Gerombolan Ikan!</div>
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

      {/* hasil tangkapan: layak dipamerkan */}
      {popup && (() => {
        const sp = SPECIES_BY_ID[popup.item.s];
        const rar = RARITY[sp.rarity];
        const xl = isXL(sp, popup.item.w);
        const big = isShowoff(sp, popup.item.w);
        const price = fishPrice(sp, popup.item.w, rod.money);
        const btn: CSSProperties = { borderRadius: px(14), fontFamily: HUD, fontWeight: 700, fontSize: px(14), padding: `${px(9)}px 0`, cursor: 'pointer', border: 0 };
        return (
          <div style={{ ...ov, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: px(8) }}>
            <div style={{ width: px(330), maxHeight: '100%', overflowY: 'auto', borderRadius: px(22), border: `${px(3)}px solid ${rar.color}`, background: `radial-gradient(circle at 50% 28%, ${rar.color}55, #10243a 62%)`, boxShadow: `0 0 ${px(44)}px ${rar.color}77`, padding: px(14), textAlign: 'center' }}>
              <div style={{ fontSize: px(12), fontWeight: 700, letterSpacing: 2, color: rar.color }}>{popup.up ? `LEVEL NAIK! · LEVEL ${popup.up}` : popup.record ? 'REKOR BARU!' : big ? 'TANGKAPAN BESAR!' : 'DAPAT IKAN!'}</div>
              <div style={{ display: 'flex', justifyContent: 'center', margin: `${px(6)}px 0`, position: 'relative' }}>
                <FishIcon id={sp.id} scale={3.4 * u} />
                {xl && <span style={{ position: 'absolute', top: 0, right: px(40), background: '#f59e3d', color: '#fff', fontWeight: 700, fontSize: px(13), borderRadius: px(8), padding: `${px(1)}px ${px(8)}px` }}>XL</span>}
              </div>
              <div style={{ fontSize: px(22), fontWeight: 700 }}>{sp.name}</div>
              <span style={{ display: 'inline-block', marginTop: px(3), background: rar.color, color: '#000', fontWeight: 700, fontSize: px(12), borderRadius: 99, padding: `${px(1)}px ${px(12)}px` }}>{rar.label}</span>
              <div style={{ fontSize: px(26), fontWeight: 700, marginTop: px(4) }}>{formatWeight(popup.item.w)}</div>
              <div style={{ fontSize: px(13), fontWeight: 600, color: 'rgba(255,255,255,0.65)' }}>+{popup.gain} XP</div>
              <div style={{ display: 'grid', gridTemplateColumns: big ? '1fr 1fr 1fr' : '1fr 1fr', gap: px(8), marginTop: px(10) }}>
                <button onClick={async () => { await sell([popup.item.id]); closePopup(); }} style={{ ...btn, border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.1)', color: '#fff' }}>Jual 💎{formatNum(price)}</button>
                {big && <button onClick={() => share(popup.item)} style={{ ...btn, background: 'linear-gradient(90deg,#c36bff,#f5c451)', color: '#1a1020' }}>Pamerkan</button>}
                <button onClick={closePopup} style={{ ...btn, background: '#34d27a', color: '#04210f' }}>Simpan</button>
              </div>
              <button onClick={() => { setHeld(popup.item); closePopup(); }} style={{ ...btn, width: '100%', marginTop: px(8), background: 'linear-gradient(90deg,#38bdf8,#818cf8)', color: '#06131f' }}>🙌 Pegang & pamerkan</button>
            </div>
          </div>
        );
      })()}

      {/* ransel penuh */}
      {bagOpen && (
        <div style={{ ...ov, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: px(10) }} onClick={() => setBagOpen(false)}>
          <div style={{ width: '100%', maxWidth: px(720), height: '100%', maxHeight: px(340), display: 'flex', flexDirection: 'column', background: '#141a28', borderRadius: px(20), border: '1px solid rgba(255,255,255,0.12)', padding: px(12) }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: px(10), marginBottom: px(8) }}>
              <BagIcon size={px(26)} />
              <span style={{ fontSize: px(20), fontWeight: 700 }}>Ransel {bag.length}/{BAG_MAX}</span>
              <span style={{ marginLeft: 'auto', fontSize: px(13), fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>Total 💎{formatNum(total)}</span>
              <button onClick={() => setBagOpen(false)} aria-label="Tutup" style={{ ...circleBtn, width: px(34), height: px(34), border: 0, background: 'rgba(255,255,255,0.1)' }}><Svg d="M6 6l12 12M18 6L6 18" size={px(18)} /></button>
            </div>
            <div style={{ display: 'flex', gap: px(10), flex: 1, minHeight: 0 }}>
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexWrap: 'wrap', gap: px(8), alignContent: 'flex-start', paddingTop: px(6) }}>
                {sorted.length === 0 && <div style={{ width: '100%', textAlign: 'center', padding: px(40), color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>Ransel kosong. Ayo mancing!</div>}
                {sorted.map((b) => {
                  const sp = SPECIES_BY_ID[b.s];
                  const xl = isXL(sp, b.w);
                  const on = selItem?.id === b.id;
                  return (
                    <button key={b.id} onClick={() => setSel(b.id)} style={{ ...slot(on, rarityBorder(sp.rarity, xl)), width: px(56), height: px(60), boxShadow: isShowoff(sp, b.w) ? `0 0 ${px(10)}px ${RARITY[sp.rarity].color}88` : 'none' }}>
                      {xl && <span style={xlTag()}>XL</span>}
                      <FishIcon id={sp.id} scale={0.85 * u} />
                      <span style={wLabel()}>{wl(b.w)}</span>
                    </button>
                  );
                })}
              </div>
              {selItem && (() => {
                const sp = SPECIES_BY_ID[selItem.s];
                const rar = RARITY[sp.rarity];
                const xl = isXL(sp, selItem.w);
                const btn: CSSProperties = { borderRadius: px(12), border: 0, fontFamily: HUD, fontWeight: 700, fontSize: px(14), padding: `${px(8)}px 0`, cursor: 'pointer' };
                return (
                  <div style={{ width: px(210), borderRadius: px(16), border: `${px(2)}px solid ${rar.color}`, background: `radial-gradient(circle at 50% 30%, ${rar.color}44, #10182a 70%)`, padding: px(10), textAlign: 'center', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
                      <FishIcon id={sp.id} scale={2.4 * u} />
                      {xl && <span style={{ position: 'absolute', top: 0, right: px(10), background: '#f59e3d', color: '#fff', fontWeight: 700, fontSize: px(12), borderRadius: px(8), padding: `0 ${px(7)}px` }}>XL</span>}
                    </div>
                    <div style={{ fontSize: px(17), fontWeight: 700 }}>{sp.name}</div>
                    <div style={{ fontSize: px(12), fontWeight: 700, color: rar.color }}>{rar.label}</div>
                    <div style={{ fontSize: px(22), fontWeight: 700, margin: `${px(2)}px 0 ${px(6)}px` }}>{formatWeight(selItem.w)}</div>
                    <div style={{ display: 'grid', gap: px(6), marginTop: 'auto' }}>
                      {isShowoff(sp, selItem.w) && <button onClick={() => share(selItem)} style={{ ...btn, background: 'linear-gradient(90deg,#c36bff,#f5c451)', color: '#1a1020' }}>Pamerkan</button>}
                      <button onClick={() => { setHeld(held && held.id === selItem.id ? null : selItem); setBagOpen(false); }} style={{ ...btn, background: 'linear-gradient(90deg,#38bdf8,#818cf8)', color: '#06131f' }}>{held && held.id === selItem.id ? 'Lepas ikan' : '🙌 Pegang'}</button>
                      <button onClick={() => sell([selItem.id])} style={{ ...btn, background: '#f5c451', color: '#2a1d00' }}>Jual 💎{formatNum(fishPrice(sp, selItem.w, rod.money))}</button>
                    </div>
                  </div>
                );
              })()}
            </div>
            {sorted.length > 0 && <button onClick={sellAll} style={{ marginTop: px(8), borderRadius: px(14), border: 0, background: '#34d27a', color: '#04210f', fontFamily: HUD, fontWeight: 700, fontSize: px(15), padding: `${px(9)}px 0`, cursor: 'pointer' }}>Jual semua 💎{formatNum(total)}</button>}
          </div>
        </div>
      )}

      {/* menu pengaturan */}
      {menuOpen && (
        <div style={{ ...ov, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setMenuOpen(false)}>
          <div style={{ width: px(260), background: '#141a28', borderRadius: px(18), padding: px(12), display: 'grid', gap: px(8) }} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => { setMenuOpen(false); landscape(); }} style={{ borderRadius: px(12), border: 0, background: 'rgba(255,255,255,0.1)', color: '#fff', fontFamily: HUD, fontWeight: 700, fontSize: px(15), padding: `${px(10)}px 0`, cursor: 'pointer' }}>Layar penuh landscape</button>
            <button onClick={props.onExit} style={{ borderRadius: px(12), border: 0, background: '#e11d48', color: '#fff', fontFamily: HUD, fontWeight: 700, fontSize: px(15), padding: `${px(10)}px 0`, cursor: 'pointer' }}>Keluar dari game</button>
            <button onClick={() => setMenuOpen(false)} style={{ borderRadius: px(12), border: 0, background: 'transparent', color: 'rgba(255,255,255,0.6)', fontFamily: HUD, fontWeight: 600, fontSize: px(14), padding: `${px(6)}px 0`, cursor: 'pointer' }}>Tutup</button>
          </div>
        </div>
      )}

      {/* Toko & Gacha */}
      {shopOpen && (
        <div style={{ ...ov, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: px(10) }} onClick={() => setShopOpen(false)}>
          <div style={{ width: '100%', maxWidth: px(520), maxHeight: '100%', display: 'flex', flexDirection: 'column', background: '#141a28', borderRadius: px(20), padding: px(12) }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: px(8), marginBottom: px(8) }}>
              {(['toko', 'gacha'] as const).map((t) => (
                <button key={t} onClick={() => setShopTab(t)} style={{ borderRadius: 99, border: 0, padding: `${px(7)}px ${px(18)}px`, fontFamily: HUD, fontWeight: 700, fontSize: px(14), cursor: 'pointer', background: shopTab === t ? GOLD : 'rgba(255,255,255,0.1)', color: shopTab === t ? '#000' : 'rgba(255,255,255,0.65)' }}>{t === 'toko' ? 'Toko' : 'Gacha'}</button>
              ))}
              <span style={{ marginLeft: 'auto', fontSize: px(14), fontWeight: 700 }}>💎 {formatNum(crystal)}</span>
              <button onClick={() => setShopOpen(false)} aria-label="Tutup" style={{ ...circleBtn, width: px(32), height: px(32), border: 0, background: 'rgba(255,255,255,0.1)' }}><Svg d="M6 6l12 12M18 6L6 18" size={px(16)} /></button>
            </div>
            {shopTab === 'toko' ? (
              <div style={{ overflowY: 'auto', display: 'grid', gap: px(6) }}>
                <p style={{ margin: 0, fontSize: px(12), fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>Joran lebih bagus = peluang ikan langka naik, harga jual &amp; XP juga naik.</p>
                {RODS.filter((r) => !r.gachaOnly).map((r) => {
                  const rar = RARITY[r.rarity];
                  const owned = rods.includes(r.id);
                  const equipped = equippedRod === r.id;
                  return (
                    <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: px(10), borderRadius: px(14), border: `1px solid ${rar.color}66`, background: 'rgba(255,255,255,0.05)', padding: px(8) }}>
                      <div style={{ width: px(40), height: px(40), borderRadius: px(10), background: rar.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RodIcon size={px(26)} color={rar.color} /></div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: px(15), fontWeight: 700 }}>{r.name}</div>
                        <div style={{ fontSize: px(11), fontWeight: 700, color: rar.color }}>{rar.label} · 🍀+{Math.round(r.luck * 100)}% 💰+{Math.round(r.money * 100)}% ✨+{Math.round(r.xp * 100)}%</div>
                      </div>
                      {equipped ? <span style={{ background: '#34d27a', color: '#04210f', fontWeight: 700, fontSize: px(12), borderRadius: px(10), padding: `${px(6)}px ${px(12)}px` }}>Dipakai</span>
                        : owned ? <button onClick={() => props.onEquipRod(r.id)} style={{ background: '#2f7be0', color: '#fff', border: 0, fontFamily: HUD, fontWeight: 700, fontSize: px(12), borderRadius: px(10), padding: `${px(6)}px ${px(14)}px`, cursor: 'pointer' }}>Pakai</button>
                        : r.price === 0 ? <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 700, fontSize: px(12) }}>Gratis</span>
                        : <button onClick={() => buyRod(r.id)} disabled={buying === r.id} style={{ background: GOLD, color: '#000', border: 0, fontFamily: HUD, fontWeight: 700, fontSize: px(12), borderRadius: px(10), padding: `${px(6)}px ${px(12)}px`, cursor: 'pointer', opacity: buying === r.id ? 0.5 : 1 }}>💎{formatNum(r.price)}</button>}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: px(10), padding: `${px(6)}px 0` }}>
                <p style={{ margin: 0, textAlign: 'center', fontSize: px(13), fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>Tarik Gacha buat dapat joran langka &amp; legendary. Dapat yang sudah dimiliki? Crystal-nya balik separuh.</p>
                <div style={{ display: 'flex', gap: px(8) }}>
                  {RODS.filter((r) => r.gachaOnly).map((r) => {
                    const rar = RARITY[r.rarity];
                    const owned = rods.includes(r.id);
                    return (
                      <div key={r.id} style={{ width: px(100), textAlign: 'center', borderRadius: px(12), border: `1px solid ${rar.color}66`, padding: px(6), opacity: owned ? 0.5 : 1 }}>
                        <RodIcon size={px(28)} color={rar.color} />
                        <div style={{ fontSize: px(11), fontWeight: 700 }}>{r.name}</div>
                        <div style={{ fontSize: px(10), fontWeight: 700, color: rar.color }}>{rar.label}{owned ? ' · Dimiliki' : ''}</div>
                      </div>
                    );
                  })}
                </div>
                <button onClick={pullGacha} disabled={pulling} style={{ borderRadius: px(14), border: 0, background: 'linear-gradient(90deg,#d946ef,#f5c451)', color: '#000', fontFamily: HUD, fontWeight: 700, fontSize: px(15), padding: `${px(10)}px ${px(26)}px`, cursor: 'pointer', opacity: pulling ? 0.5 : 1 }}>{pulling ? 'Menarik...' : `Tarik · 💎${formatNum(GACHA_PRICE)}`}</button>
              </div>
            )}
          </div>
        </div>
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
    </div>
  );
}
