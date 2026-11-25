'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as RPointerEvent } from 'react';
import { ArrowLeft, Backpack, Maximize, Sparkles, X } from 'lucide-react';
import { FishingEngine } from './engine';
import type { Catch, Phase } from './engine';
import { FISH_H, FISH_W, drawFish } from './art';
import {
  BAG_MAX, RARITY, SPECIES_BY_ID, fishPrice, formatNum, formatWeight, levelFromXp, newId, titleFor, xpFor,
} from '@/lib/fishing';
import type { BagItem } from '@/lib/fishing';

interface Props {
  name: string;
  photo: string;
  crystal: number;
  xp: number;
  bag: BagItem[];
  onCatch: (item: BagItem, xpGain: number) => void;
  onSell: (ids: string[]) => Promise<number>;
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
  const { name, photo, crystal, xp, bag } = props;
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<FishingEngine | null>(null);
  const propsRef = useRef(props);
  propsRef.current = props;

  const [phase, setPhase] = useState<Phase>('idle');
  const [toast, setToast] = useState('');
  const [popup, setPopup] = useState<{ item: BagItem; gain: number; up: number } | null>(null);
  const [bagOpen, setBagOpen] = useState(false);
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
        const gain = xpFor(c.species, c.weight);
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

  // sinkron level & tas penuh
  useEffect(() => {
    engineRef.current?.setLevel(levelFromXp(xp).level);
    engineRef.current?.setBagFull(bag.length >= BAG_MAX);
  }, [xp, bag.length]);

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
  const sorted = [...bag].sort((a, b) => fishPrice(SPECIES_BY_ID[b.s], b.w) - fishPrice(SPECIES_BY_ID[a.s], a.w));
  const total = bag.reduce((s, b) => s + fishPrice(SPECIES_BY_ID[b.s], b.w), 0);
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
      </div>

      {/* kanan atas: crystal + layar */}
      <div className="absolute right-3 top-3 flex items-center gap-2" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className={pill + ' flex h-11 items-center gap-1.5 px-3 font-black'}>
          <Sparkles className="h-5 w-5 text-sky-300" />
          {formatNum(crystal)}
        </div>
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
        const price = fishPrice(sp, popup.item.w);
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
    </div>
  );
}
