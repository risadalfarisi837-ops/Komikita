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

const rarityBorder = (r: keyof typeof RARITY, xl: boolean) => (r === 'common' ? (xl ? '#f59e3d' : 'rgba(255,255,255,0.22)') : RARITY[r].color);

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

export default function FishingGame(props: Props) {
  const { name, photo, crystal, xp, bag, rods, equippedRod } = props;
  const rod = RODS_BY_ID[equippedRod] || RODS_BY_ID[DEFAULT_ROD];
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<FishingEngine | null>(null);
  const propsRef = useRef(props);
  propsRef.current = props;

  const [phase, setPhase] = useState<Phase>('idle');
  const [toast, setToast] = useState('');
  const [popup, setPopup] = useState<{ item: BagItem; gain: number; up: number; record: boolean } | null>(null);
  const [bagOpen, setBagOpen] = useState(false);
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
  const toastT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const px = (n: number) => Math.round(n * u);

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
      onToast: (m) => say(m),
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
    engineRef.current?.setProfile({ name: name || 'Tamu', title: titleFor(lv.level), level: lv.level, rodName: rod.name });
  }, [lv.level, bag.length, rod.luck, rod.name, name]);

  useEffect(() => { landscape().catch(() => {}); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

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
  const dateStr = new Intl.DateTimeFormat('id-ID', { weekday: 'short', day: 'numeric', month: 'short' }).format(now).replace(',', '');
  const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace('.', ':');
  const luckPct = Math.round((rod.luck + (status.inShoal ? 2 : 0)) * 100);
  const mmss = (s: number) => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');

  const btnLabel = phase === 'idle' ? 'Joran' : phase === 'bite' ? 'Tarik!' : phase === 'reel' ? 'Tahan' : phase === 'result' || phase === 'catching' ? '...' : 'Tunggu...';
  const btnBg = phase === 'bite' ? 'radial-gradient(circle at 35% 30%,#ff8a9a,#e11d48)' : phase === 'reel' ? 'radial-gradient(circle at 35% 30%,#7df0a4,#16a34a)' : 'radial-gradient(circle at 35% 30%,#d9c3a8,#a58f78)';

  const circleBtn: CSSProperties = { width: px(40), height: px(40), borderRadius: '50%', background: PANEL, border: `${px(2)}px solid ${GOLD}88`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 };
  const pillBox: CSSProperties = { background: PANEL, borderRadius: px(18), border: `${px(1.5)}px solid rgba(255,255,255,0.14)`, color: '#fff', fontFamily: HUD };
  const slot = (selected: boolean, color: string): CSSProperties => ({
    position: 'relative', width: px(42), height: px(46), borderRadius: px(9), background: 'rgba(20,24,34,0.82)',
    border: `${px(2)}px solid ${selected ? '#3d8bff' : color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto', cursor: 'pointer', padding: 0,
  });
  const xlTag = (): CSSProperties => ({ position: 'absolute', top: px(-6), right: px(-4), background: '#f59e3d', color: '#fff', fontSize: px(9), fontWeight: 700, borderRadius: px(5), padding: `0 ${px(4)}px`, zIndex: 1 });
  const wLabel = (): CSSProperties => ({ position: 'absolute', bottom: px(1), left: 0, right: 0, textAlign: 'center', fontSize: px(10), fontWeight: 700, textShadow: '0 1px 2px #000' });
  const ov: CSSProperties = { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 30 };

  const guide = status.shoal;
  const rotate = guide ? (guide.ang * 180) / Math.PI + 90 : 0;

  return (
    <div ref={wrapRef} style={{ position: 'fixed', inset: 0, zIndex: 70, userSelect: 'none', overflow: 'hidden', background: '#2872b4', color: '#fff', touchAction: 'none', fontFamily: HUD }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0 }} />

      {/* kartu pemain */}
      <div style={{ position: 'absolute', left: px(8), top: px(8), display: 'flex', alignItems: 'center', gap: px(8), paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div style={{ ...pillBox, display: 'flex', alignItems: 'center', gap: px(8), padding: px(6), paddingRight: px(14), borderColor: `${GOLD}77`, minWidth: px(190) }}>
          <div style={{ width: px(50), height: px(50), borderRadius: px(12), overflow: 'hidden', border: `${px(2.5)}px solid #5ee0e0`, background: '#35405c', flex: '0 0 auto' }}>
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt="" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : null}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: px(6) }}>
              <span style={{ background: '#2f7be0', borderRadius: '50%', minWidth: px(22), height: px(22), display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: px(13), fontWeight: 700 }}>{lv.level}</span>
              <span style={{ fontSize: px(17), fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: px(150) }}>{name || 'Tamu'}</span>
            </div>
            <div style={{ fontSize: px(12), fontWeight: 600, color: 'rgba(255,255,255,0.72)', marginTop: px(1) }}>⛵ {titleFor(lv.level)}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: px(8), marginTop: px(2) }}>
              <div style={{ flex: 1, height: px(6), borderRadius: px(4), background: 'rgba(255,255,255,0.18)', overflow: 'hidden' }}>
                <div style={{ width: Math.min(100, (lv.into / lv.need) * 100) + '%', height: '100%', background: '#4ade80' }} />
              </div>
              <span style={{ fontSize: px(11), fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>{lv.into}/{lv.need}</span>
            </div>
          </div>
        </div>
        <button onClick={() => setShopOpen(true)} aria-label="Toko & Gacha" style={circleBtn}><Svg d="M4 7h16M4 12h16M4 17h16" size={px(20)} /></button>
      </div>

      {/* kanan atas */}
      <div style={{ position: 'absolute', right: px(8), top: px(8), display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: px(6), paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: px(8) }}>
          <div style={{ ...pillBox, display: 'flex', alignItems: 'center', gap: px(7), height: px(36), padding: `0 ${px(5)}px 0 ${px(12)}px`, borderRadius: px(18) }}>
            <svg width={px(18)} height={px(18)} viewBox="0 0 24 24"><path d="M6 4h12l4 6-10 11L2 10z" fill="#39e07f" stroke="#12803e" strokeWidth="1.6" strokeLinejoin="round" /></svg>
            <span style={{ fontSize: px(17), fontWeight: 700 }}>{formatNum(crystal)}</span>
            <button onClick={() => setShopOpen(true)} aria-label="Tambah" style={{ width: px(26), height: px(26), borderRadius: '50%', background: '#2ecf74', border: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}><Svg d="M12 5v14M5 12h14" size={px(16)} w={3.2} /></button>
          </div>
          <button onClick={() => setMenuOpen(true)} aria-label="Pengaturan" style={circleBtn}>
            <svg width={px(20)} height={px(20)} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="3.2" /><path d="M12 2.8v3M12 18.2v3M2.8 12h3M18.2 12h3M5.5 5.5l2.1 2.1M16.4 16.4l2.1 2.1M18.5 5.5l-2.1 2.1M7.6 16.4l-2.1 2.1" /></svg>
          </button>
        </div>
        <div style={{ ...pillBox, padding: `${px(7)}px ${px(16)}px`, textAlign: 'right', borderRadius: px(14) }}>
          <div style={{ fontSize: px(16), fontWeight: 700, color: '#5ee0e0', lineHeight: 1.1 }}>Pulau Tengah Laut</div>
          <div style={{ fontSize: px(14), fontWeight: 600, marginTop: px(2) }}>{dateStr} · <b>{timeStr}</b> {tz}</div>
        </div>
        {guide && (
          <div style={{ display: 'flex', alignItems: 'center', gap: px(8), background: 'rgba(255,252,242,0.96)', color: '#1a3a22', borderRadius: px(14), padding: `${px(6)}px ${px(14)}px ${px(6)}px ${px(6)}px`, boxShadow: '0 2px 10px rgba(0,0,0,0.25)' }}>
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
      {(HINT[phase] || (intro && phase === 'idle')) && !popup && !bagOpen && (
        <div style={{ position: 'absolute', left: '50%', top: `calc(env(safe-area-inset-top, 0px) + ${px(70)}px)`, transform: 'translateX(-50%)', maxWidth: '60%', pointerEvents: 'none', background: 'rgba(32,22,10,0.85)', border: '1px solid rgba(255,214,140,0.35)', borderRadius: px(14), padding: `${px(6)}px ${px(14)}px`, fontSize: px(14), fontWeight: 600, color: '#ffe9bf', textAlign: 'center' }}>
          {HINT[phase] || 'Hadapkan ke air, lalu tekan Joran'}
        </div>
      )}
      {toast && <div style={{ position: 'absolute', left: '50%', top: px(112), transform: 'translateX(-50%)', zIndex: 20, background: 'rgba(15,23,42,0.92)', borderRadius: 99, padding: `${px(7)}px ${px(16)}px`, fontSize: px(14), fontWeight: 600, pointerEvents: 'none' }}>{toast}</div>}

      {/* joystick */}
      <div
        ref={joyRef}
        onPointerDown={joyDown}
        onPointerMove={(e) => joyActive.current && joyMove(e)}
        onPointerUp={joyUp}
        onPointerCancel={joyUp}
        style={{ position: 'absolute', left: px(14), bottom: `calc(env(safe-area-inset-bottom, 0px) + ${px(16)}px)`, width: px(112), height: px(112), borderRadius: '50%', background: 'rgba(196,160,110,0.45)', border: `${px(2)}px solid rgba(255,235,200,0.45)`, display: 'flex', alignItems: 'center', justifyContent: 'center', touchAction: 'none' }}
      >
        <div style={{ width: px(46), height: px(46), borderRadius: '50%', background: 'rgba(245,225,190,0.55)', border: `${px(2)}px solid rgba(255,240,215,0.7)`, transform: `translate(${knob.x}px, ${knob.y}px)` }} />
      </div>

      {/* buff + hotbar ransel */}
      {phase !== 'reel' && phase !== 'catching' && (
        <div style={{ position: 'absolute', left: '50%', bottom: `calc(env(safe-area-inset-bottom, 0px) + ${px(8)}px)`, transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: px(6) }}>
          <div style={{ display: 'flex', gap: px(5), alignItems: 'center' }}>
            {[
              { t: '🍀 ' + rod.power, bg: '#fff', fg: '#1d3a24' },
              { t: '🍀 +' + luckPct + '%', bg: PANEL, fg: status.inShoal ? '#7dffa5' : '#fff' },
              { t: '💰 +' + Math.round(rod.money * 100) + '%', bg: PANEL, fg: '#fff' },
              { t: '✨ +' + Math.round(rod.xp * 100) + '%', bg: PANEL, fg: '#fff' },
            ].map((c, i) => (
              <span key={i} style={{ background: c.bg, color: c.fg, borderRadius: 99, padding: `${px(3)}px ${px(10)}px`, fontSize: px(13), fontWeight: 700, border: '1px solid rgba(255,255,255,0.14)' }}>{c.t}</span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: px(4), alignItems: 'flex-end', padding: px(4), borderRadius: px(14), background: 'rgba(10,14,22,0.35)' }}>
            <button style={slot(true, '#3d8bff')} onClick={() => setShopOpen(true)} aria-label="Joran"><RodIcon size={px(28)} color={RARITY[rod.rarity].color} /></button>
            {recent.map((b) => {
              const sp = SPECIES_BY_ID[b.s];
              const xl = isXL(sp, b.w);
              return (
                <button key={b.id} style={slot(false, rarityBorder(sp.rarity, xl))} onClick={() => { setSel(b.id); setBagOpen(true); }} aria-label={sp.name}>
                  {xl && <span style={xlTag()}>XL</span>}
                  <FishIcon id={sp.id} scale={0.62 * u} />
                  <span style={wLabel()}>{formatWeight(b.w)}</span>
                </button>
              );
            })}
            <button style={{ ...slot(false, '#3d8bff'), width: px(48) }} onClick={() => { setSel(''); setBagOpen(true); }} aria-label="Ransel">
              <BagIcon size={px(28)} />
              <span style={{ ...wLabel(), color: bag.length >= BAG_MAX ? '#ff8a8a' : '#fff' }}>{bag.length}/{BAG_MAX}</span>
            </button>
          </div>
        </div>
      )}

      {/* tombol aksi */}
      <div style={{ position: 'absolute', right: px(16), bottom: `calc(env(safe-area-inset-bottom, 0px) + ${px(16)}px)`, display: 'flex', alignItems: 'flex-end', gap: px(10) }}>
        {(phase === 'cast' || phase === 'wait') && (
          <button onClick={() => engineRef.current?.cancel()} aria-label="Batal" style={{ ...pillBox, width: px(46), height: px(46), borderRadius: '50%', marginBottom: px(8), display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, background: 'rgba(225,29,72,0.9)' }}><Svg d="M6 6l12 12M18 6L6 18" size={px(22)} /></button>
        )}
        <button
          onPointerDown={(e) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); engineRef.current?.action(true); }}
          onPointerUp={() => engineRef.current?.action(false)}
          onPointerCancel={() => engineRef.current?.action(false)}
          className={phase === 'bite' ? 'komikita-pulse' : undefined}
          style={{ width: px(100), height: px(100), borderRadius: '50%', border: `${px(4)}px solid #fff`, background: btnBg, color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: px(1), boxShadow: '0 4px 14px rgba(0,0,0,0.35)', touchAction: 'none', cursor: 'pointer', padding: 0, fontFamily: HUD }}
        >
          <RodIcon size={px(34)} color="#fff" />
          <span style={{ fontSize: px(19), fontWeight: 700, textShadow: '0 2px 3px rgba(60,40,20,0.7)' }}>{btnLabel}</span>
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
                      <span style={wLabel()}>{formatWeight(b.w)}</span>
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
