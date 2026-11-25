'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as RPointerEvent } from 'react';
import { ArrowLeft, Backpack, Gem, Maximize, ShoppingBag, Sparkles, X } from 'lucide-react';
import { FishingEngine } from './engine';
import type { Catch, Phase } from './engine';
import { FISH_H, FISH_W, drawFish } from './art';
import {
  BAG_MAX, DEFAULT_ROD, GACHA_DUPLICATE_REFUND, GACHA_PRICE, RARITY, RODS, RODS_BY_ID, SPECIES_BY_ID,
  fishPrice, formatNum, formatWeight, levelFromXp, newId, titleFor, xpFor,
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
  return (
    <canvas
      ref={ref}
      width={FISH_W}
      height={FISH_H}
      style={{ width: FISH_W * scale, height: FISH_H * scale, imageRendering: 'pixelated' }}
    />
  );
}

const HINT: Record<Phase, string> = {
  idle: 'Hadapkan ke air, lalu tekan Joran',
  cast: 'Melempar joran...',
  wait: 'Menunggu ikan... (gerak = batal)',
  bite: 'Ada yang menggigit! Tekan Tarik!',
  reel: 'Tahan tombol supaya zona hijau ngikutin ikan',
  catching: '',
  result: '',
};

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
  const [popup, setPopup] = useState<{ item: BagItem; gain: number; up: number } | null>(null);
  const [bagOpen, setBagOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [shopTab, setShopTab] = useState<'toko' | 'gacha'>('toko');
  const [buying, setBuying] = useState('');
  const [pulling, setPulling] = useState(false);
  const [gachaResult, setGachaResult] = useState<{ rod: Rod; duplicate: boolean } | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const toastT = useRef<ReturnType<typeof setTimeout> | null>(null);

  const say = useCallback((m: string) => {
    setToast(m);
    if (toastT.current) clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToast(''), 2200);
  }, []);

  // mesin
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const engine = new FishingEngine(canvas, {
      onPhase: (p) => setPhase(p),
      onToast: (m) => say(m),
      onBite: () => { try { navigator.vibrate?.(60); } catch { /* abaikan */ } },
      onCatch: (c: Catch) => {
        const item: BagItem = { id: newId(), s: c.species.id, w: c.weight };
        const curRod = RODS_BY_ID[propsRef.current.equippedRod] || RODS_BY_ID[DEFAULT_ROD];
        const gain = xpFor(c.species, c.weight, curRod.xp);
        const before = levelFromXp(propsRef.current.xp).level;
        const after = levelFromXp(propsRef.current.xp + gain).level;
        propsRef.current.onCatch(item, gain);
        setPopup({ item, gain, up: after > before ? after : 0 });
      },
    });
    engineRef.current = engine;
    const fit = () => {
      const r = wrap.getBoundingClientRect();
      engine.resize(Math.max(1, Math.floor(r.width)), Math.max(1, Math.floor(r.height)), Math.min(window.devicePixelRatio || 1, 3));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);
    engine.start();

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
      ro.disconnect();
      engine.destroy();
      engineRef.current = null;
    };
  }, [say]);

  // sinkron level, joran (luck), & tas penuh
  useEffect(() => {
    engineRef.current?.setLevel(levelFromXp(xp).level);
    engineRef.current?.setLuck(rod.luck);
    engineRef.current?.setBagFull(bag.length >= BAG_MAX);
  }, [xp, bag.length, rod.luck]);

  // coba masuk layar penuh + mode lanskap otomatis begitu game dibuka
  // (beberapa browser menolak kalau tidak dipicu langsung dari ketukan pengguna;
  // kalau gagal, tombol di pojok kanan atas tetap bisa dipakai manual)
  useEffect(() => {
    landscape().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // joystick
  const joyRef = useRef<HTMLDivElement>(null);
  const joyActive = useRef(false);
  const joyMove = (e: RPointerEvent<HTMLDivElement>) => {
    const el = joyRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const max = r.width / 2 - 26;
    let dx = e.clientX - (r.left + r.width / 2);
    let dy = e.clientY - (r.top + r.height / 2);
    const m = Math.hypot(dx, dy);
    if (m > max) { dx = (dx / m) * max; dy = (dy / m) * max; }
    setKnob({ x: dx, y: dy });
    engineRef.current?.setMove(dx / max, dy / max);
  };
  const joyDown = (e: RPointerEvent<HTMLDivElement>) => {
    joyActive.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    joyMove(e);
  };
  const joyUp = () => {
    joyActive.current = false;
    setKnob({ x: 0, y: 0 });
    engineRef.current?.setMove(0, 0);
  };

  const buyRod = async (id: string) => {
    setBuying(id);
    const res = await props.onBuyRod(id);
    if (res === 'ok') { say('Joran dibeli & dipakai!'); }
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

  const closePopup = () => {
    setPopup(null);
    engineRef.current?.resume();
  };

  const sell = async (ids: string[]) => {
    if (!ids.length) return;
    const got = await props.onSell(ids);
    if (got > 0) say('+' + formatNum(got) + ' Crystal');
    else if (got < 0) say('Login dulu buat jual ikan');
    return got;
  };

  const sellAll = async () => {
    const risky = bag.some((b) => { const r = SPECIES_BY_ID[b.s]?.rarity; return r === 'epic' || r === 'legendary'; });
    if (risky && !window.confirm('Ada ikan Epik/Legendary di tas. Tetap jual semua?')) return;
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

  const lv = levelFromXp(xp);
  const btnLabel = phase === 'idle' ? 'Joran' : phase === 'bite' ? 'Tarik!' : phase === 'reel' ? 'Tahan' : phase === 'result' || phase === 'catching' ? '...' : 'Tunggu...';
  const btnColor = phase === 'bite' ? 'linear-gradient(145deg,#fb7185,#e11d48)' : phase === 'reel' ? 'linear-gradient(145deg,#4ade80,#16a34a)' : phase === 'idle' ? 'linear-gradient(145deg,#f3d9a4,#c99a52)' : 'linear-gradient(145deg,#60a5fa,#2563eb)';
  const sorted = [...bag].sort((a, b) => fishPrice(SPECIES_BY_ID[b.s], b.w, rod.money) - fishPrice(SPECIES_BY_ID[a.s], a.w, rod.money));
  const total = bag.reduce((s, b) => s + fishPrice(SPECIES_BY_ID[b.s], b.w, rod.money), 0);
  const pill = 'rounded-2xl border border-white/15 bg-[#0b1a2b]/80 backdrop-blur';

  return (
    <div ref={wrapRef} className="fixed inset-0 z-[70] select-none overflow-hidden bg-[#2872b4] text-white" style={{ touchAction: 'none' }}>
      <canvas ref={canvasRef} className="absolute inset-0" />

      {/* kiri atas: kembali + profil */}
      <div className="absolute left-3 top-3 flex items-center gap-2" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <button onClick={props.onExit} aria-label="Kembali" className={pill + ' flex h-11 w-11 items-center justify-center active:scale-90'}>
          <ArrowLeft className="h-6 w-6" />
        </button>
        <div className={pill + ' flex items-center gap-2 py-1.5 pl-1.5 pr-3'}>
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="" referrerPolicy="no-referrer" className="h-9 w-9 rounded-full border-2 border-amber-300 object-cover" />
          ) : (
            <div className="h-9 w-9 rounded-full border-2 border-amber-300 bg-white/10" />
          )}
          <div className="min-w-0" style={{ maxWidth: 150 }}>
            <p className="flex items-center gap-1.5 truncate text-sm font-extrabold leading-tight">
              <span className="rounded-md bg-sky-500 px-1.5 text-xs">{lv.level}</span>
              <span className="truncate">{name || 'Tamu'}</span>
            </p>
            <p className="truncate text-[11px] font-bold text-white/60">{titleFor(lv.level)}</p>
            <div className="mt-0.5 h-1.5 w-28 overflow-hidden rounded-full bg-white/15">
              <div className="h-full rounded-full bg-emerald-400" style={{ width: Math.min(100, (lv.into / lv.need) * 100) + '%' }} />
            </div>
          </div>
        </div>
        {equippedRod !== DEFAULT_ROD && (
          <div className={pill + ' flex h-8 items-center gap-1 px-2.5 text-xs font-black'} style={{ borderColor: RARITY[rod.rarity].color + '88', color: RARITY[rod.rarity].color }}>
            🎣 {rod.name}
          </div>
        )}
      </div>

      {/* kanan atas: crystal + layar */}
      <div className="absolute right-3 top-3 flex items-center gap-2" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className={pill + ' flex h-11 items-center gap-1.5 px-3 font-black'}>
          <Sparkles className="h-5 w-5 text-sky-300" />
          {formatNum(crystal)}
        </div>
        <button onClick={() => setShopOpen(true)} aria-label="Toko & Gacha" className={pill + ' flex h-11 items-center gap-1.5 px-3 font-black active:scale-90'}>
          <ShoppingBag className="h-5 w-5 text-amber-300" /> Toko
        </button>
        <button onClick={landscape} aria-label="Layar penuh landscape" className={pill + ' flex h-11 w-11 items-center justify-center active:scale-90'}>
          <Maximize className="h-5 w-5" />
        </button>
      </div>

      {/* petunjuk */}
      {HINT[phase] && !popup && !bagOpen && (
        <div className="pointer-events-none absolute left-1/2 max-w-[92%] -translate-x-1/2 rounded-2xl border border-amber-200/30 bg-[#2a1d0e]/85 px-4 py-2 text-center text-sm font-extrabold text-amber-100"
          style={{ top: 'calc(env(safe-area-inset-top, 0px) + 72px)' }}>
          {HINT[phase]}
        </div>
      )}
      {toast && (
        <div className="pointer-events-none absolute left-1/2 top-32 z-20 -translate-x-1/2 rounded-full bg-slate-900/90 px-4 py-2 text-sm font-bold">{toast}</div>
      )}

      {/* joystick */}
      <div
        ref={joyRef}
        onPointerDown={joyDown}
        onPointerMove={(e) => joyActive.current && joyMove(e)}
        onPointerUp={joyUp}
        onPointerCancel={joyUp}
        className="absolute left-4 flex h-36 w-36 items-center justify-center rounded-full border-2 border-white/25 bg-white/10"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)', touchAction: 'none' }}
      >
        <div className="h-14 w-14 rounded-full border-2 border-white/60 bg-white/30" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
      </div>

      {/* tombol aksi */}
      <div className="absolute right-4 flex items-end gap-3" style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)' }}>
        {(phase === 'cast' || phase === 'wait') && (
          <button onClick={() => engineRef.current?.cancel()} aria-label="Batal" className="mb-2 flex h-12 w-12 items-center justify-center rounded-full border-2 border-white/40 bg-rose-500/90 active:scale-90">
            <X className="h-6 w-6" />
          </button>
        )}
        <button
          onPointerDown={(e) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); engineRef.current?.action(true); }}
          onPointerUp={() => engineRef.current?.action(false)}
          onPointerCancel={() => engineRef.current?.action(false)}
          className={'flex h-28 w-28 items-center justify-center rounded-full border-4 border-white text-xl font-black shadow-xl ' + (phase === 'bite' ? 'animate-pulse' : '')}
          style={{ background: btnColor, color: phase === 'idle' ? '#4a2c12' : '#fff', touchAction: 'none' }}
        >
          {btnLabel}
        </button>
      </div>

      {/* tas */}
      {phase !== 'reel' && phase !== 'catching' && (
        <button
          onClick={() => setBagOpen(true)}
          className={pill + ' absolute right-4 flex items-center gap-2 px-4 py-2 font-extrabold active:scale-95'}
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 148px)' }}
        >
          <Backpack className="h-5 w-5 text-amber-300" />
          Tas {bag.length}/{BAG_MAX}
        </button>
      )}

      {/* popup tangkapan */}
      {popup && (() => {
        const sp = SPECIES_BY_ID[popup.item.s];
        const rar = RARITY[sp.rarity];
        const price = fishPrice(sp, popup.item.w, rod.money);
        return (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/55 p-3">
            <div className="max-h-full w-full max-w-xs overflow-y-auto rounded-3xl border-2 bg-[#10243a] p-4 text-center" style={{ borderColor: rar.color, boxShadow: `0 0 40px ${rar.color}55` }}>
              <p className="text-xs font-black tracking-widest" style={{ color: rar.color }}>{popup.up ? 'LEVEL NAIK!' : 'DAPAT IKAN!'}</p>
              <div className="my-2 flex justify-center"><FishIcon id={sp.id} scale={3} /></div>
              <p className="text-xl font-black">{sp.name}</p>
              <span className="mt-1 inline-block rounded-full px-3 py-0.5 text-xs font-black text-black" style={{ background: rar.color }}>{rar.label}</span>
              <p className="mt-1.5 text-lg font-extrabold leading-tight">{formatWeight(popup.item.w)}</p>
              <p className="text-sm font-bold text-white/60">+{popup.gain} XP{popup.up ? ` · Level ${popup.up}!` : ''}</p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <button onClick={async () => { await sell([popup.item.id]); closePopup(); }} className="flex items-center justify-center gap-1 rounded-2xl border border-white/20 bg-white/10 py-3 font-black active:scale-95">
                  Jual <Sparkles className="h-4 w-4 text-sky-300" />{formatNum(price)}
                </button>
                <button onClick={closePopup} className="rounded-2xl bg-emerald-500 py-3 font-black text-black active:scale-95">Lanjut</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* tas */}
      {bagOpen && (
        <div className="absolute inset-0 z-10 flex items-end justify-center bg-black/55" onClick={() => setBagOpen(false)}>
          <div className="flex max-h-[85%] w-full max-w-md flex-col rounded-t-3xl bg-[#10243a] p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-lg font-black">Tas ikan {bag.length}/{BAG_MAX}</p>
              <button onClick={() => setBagOpen(false)} aria-label="Tutup" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10"><X className="h-5 w-5" /></button>
            </div>
            <div className="min-h-[120px] flex-1 space-y-2 overflow-y-auto">
              {sorted.length === 0 && <p className="py-10 text-center font-bold text-white/40">Tas kosong. Ayo mancing!</p>}
              {sorted.map((b) => {
                const sp = SPECIES_BY_ID[b.s];
                const rar = RARITY[sp.rarity];
                return (
                  <div key={b.id} className="flex items-center gap-3 rounded-2xl border bg-white/5 p-2" style={{ borderColor: rar.color + '66' }}>
                    <div className="flex h-12 w-14 shrink-0 items-center justify-center rounded-xl bg-[#1d4f7a]/60"><FishIcon id={sp.id} scale={1.2} /></div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-extrabold leading-tight">{sp.name}</p>
                      <p className="text-xs font-bold" style={{ color: rar.color }}>{rar.label} · {formatWeight(b.w)}</p>
                    </div>
                    <button onClick={() => sell([b.id])} className="flex items-center gap-1 rounded-xl bg-amber-400 px-3 py-2 text-sm font-black text-black active:scale-95">
                      <Sparkles className="h-4 w-4" />{formatNum(fishPrice(sp, b.w))}
                    </button>
                  </div>
                );
              })}
            </div>
            {sorted.length > 0 && (
              <button onClick={sellAll} className="mt-3 flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3 font-black text-black active:scale-95">
                Jual semua <Sparkles className="h-4 w-4" />{formatNum(total)}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Toko & Gacha */}
      {shopOpen && (
        <div className="absolute inset-0 z-10 flex items-end justify-center bg-black/55" onClick={() => setShopOpen(false)}>
          <div className="flex max-h-[85%] w-full max-w-md flex-col rounded-t-3xl bg-[#10243a] p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex gap-2">
                <button onClick={() => setShopTab('toko')} className={'rounded-full px-4 py-2 text-sm font-black ' + (shopTab === 'toko' ? 'bg-amber-400 text-black' : 'bg-white/10 text-white/60')}>Toko</button>
                <button onClick={() => setShopTab('gacha')} className={'rounded-full px-4 py-2 text-sm font-black ' + (shopTab === 'gacha' ? 'bg-amber-400 text-black' : 'bg-white/10 text-white/60')}>Gacha</button>
              </div>
              <button onClick={() => setShopOpen(false)} aria-label="Tutup" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10"><X className="h-5 w-5" /></button>
            </div>

            {shopTab === 'toko' ? (
              <div className="min-h-[200px] flex-1 space-y-2 overflow-y-auto">
                <p className="mb-1 text-xs font-bold text-white/50">Joran lebih bagus = peluang ikan langka naik, harga jual &amp; XP juga naik.</p>
                {RODS.filter((r) => !r.gachaOnly).map((r) => {
                  const rar = RARITY[r.rarity];
                  const owned = rods.includes(r.id);
                  const equipped = equippedRod === r.id;
                  return (
                    <div key={r.id} className="flex items-center gap-3 rounded-2xl border bg-white/5 p-3" style={{ borderColor: rar.color + '66' }}>
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl" style={{ background: rar.color + '22' }}>🎣</div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-extrabold leading-tight">{r.name}</p>
                        <p className="text-xs font-bold" style={{ color: rar.color }}>{rar.label}</p>
                        <p className="mt-0.5 text-[11px] font-bold text-white/50">🍀+{Math.round(r.luck * 100)}% · 💰+{Math.round(r.money * 100)}% · ✨+{Math.round(r.xp * 100)}%</p>
                      </div>
                      {equipped ? (
                        <span className="rounded-xl bg-emerald-500/90 px-3 py-2 text-xs font-black text-black">Dipakai</span>
                      ) : owned ? (
                        <button onClick={() => props.onEquipRod(r.id)} className="rounded-xl bg-sky-500 px-3 py-2 text-xs font-black text-white active:scale-95">Pakai</button>
                      ) : r.price === 0 ? (
                        <span className="rounded-xl bg-white/10 px-3 py-2 text-xs font-black text-white/40">Gratis</span>
                      ) : (
                        <button onClick={() => buyRod(r.id)} disabled={buying === r.id} className="flex items-center gap-1 rounded-xl bg-amber-400 px-3 py-2 text-xs font-black text-black active:scale-95 disabled:opacity-50">
                          <Sparkles className="h-3.5 w-3.5" />{formatNum(r.price)}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 py-6">
                <p className="text-center text-sm font-bold text-white/60">Tarik Gacha buat dapat joran langka &amp; legendary.<br />Dapat yang sudah dimiliki? Crystal-nya balik separuh.</p>
                <div className="grid grid-cols-3 gap-3">
                  {RODS.filter((r) => r.gachaOnly).map((r) => {
                    const rar = RARITY[r.rarity];
                    const owned = rods.includes(r.id);
                    return (
                      <div key={r.id} className="flex flex-col items-center gap-1 rounded-2xl border p-2 text-center" style={{ borderColor: rar.color + '66', opacity: owned ? 0.5 : 1 }}>
                        <span className="text-2xl">🎣</span>
                        <span className="text-[11px] font-black leading-tight">{r.name}</span>
                        <span className="text-[10px] font-bold" style={{ color: rar.color }}>{rar.label}{owned ? ' · Dimiliki' : ''}</span>
                      </div>
                    );
                  })}
                </div>
                <button onClick={pullGacha} disabled={pulling} className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-amber-400 px-6 py-3 font-black text-black active:scale-95 disabled:opacity-50">
                  <Gem className="h-5 w-5" />{pulling ? 'Menarik...' : `Tarik · ${formatNum(GACHA_PRICE)}`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* hasil gacha */}
      {gachaResult && (() => {
        const rar = RARITY[gachaResult.rod.rarity];
        return (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 p-3">
            <div className="w-full max-w-xs rounded-3xl border-2 bg-[#10243a] p-5 text-center" style={{ borderColor: rar.color, boxShadow: `0 0 50px ${rar.color}77` }}>
              <p className="text-xs font-black tracking-widest" style={{ color: rar.color }}>{gachaResult.duplicate ? 'SUDAH PUNYA' : 'JORAN BARU!'}</p>
              <div className="my-3 text-6xl">🎣</div>
              <p className="text-xl font-black">{gachaResult.rod.name}</p>
              <span className="mt-1 inline-block rounded-full px-3 py-0.5 text-xs font-black text-black" style={{ background: rar.color }}>{rar.label}</span>
              {gachaResult.duplicate ? (
                <p className="mt-3 text-sm font-bold text-white/70">Ditukar jadi +{formatNum(GACHA_DUPLICATE_REFUND)} Crystal</p>
              ) : (
                <p className="mt-3 text-sm font-bold text-white/70">🍀+{Math.round(gachaResult.rod.luck * 100)}% · 💰+{Math.round(gachaResult.rod.money * 100)}% · ✨+{Math.round(gachaResult.rod.xp * 100)}%</p>
              )}
              <button onClick={() => setGachaResult(null)} className="mt-4 w-full rounded-2xl bg-emerald-500 py-3 font-black text-black active:scale-95">Lanjut</button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
