'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Search, Check, Coins, ShoppingBag, Eye, EyeOff, Lock } from 'lucide-react';
import { getFirebase } from '@/lib/firebase-client';
import { WALLPAPER_CATALOG, RARITY_STYLE, RARITY_INFO, RARITIES, RATES, COST_1, COST_10, TOKEN_DUP, TOKEN_PRICE, rollMany, wpBg, type Rarity } from '@/lib/wallpapers';
import WallpaperBg from '@/components/WallpaperBg';

const rank = (k: string) => RARITIES.indexOf(WALLPAPER_CATALOG[k].rarity);
// Urut dari rarity terbaik, untuk panel info
const INFO_ORDER = [...RARITIES].reverse().map((r) => ({ r, keys: Object.keys(WALLPAPER_CATALOG).filter((k) => WALLPAPER_CATALOG[k].rarity === r) }));

function Pill({ r }: { r: Rarity }) {
  return <span className="rounded-full bg-black/70 border border-white/15 px-3 py-1 text-xs font-black" style={{ color: RARITY_STYLE[r].color }}>{r}</span>;
}

function Gem({ size = 24, dim = false }: { size?: number; dim?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ opacity: dim ? 0.8 : 1, flexShrink: 0 }}>
      <polygon points="6,2 18,2 22,9 12,22 2,9" fill="#3b9cff" />
      <polygon points="6,2 12,9 2,9" fill="#8fd0ff" />
      <polygon points="18,2 22,9 12,9" fill="#5db4ff" />
      <polygon points="2,9 12,9 12,22" fill="#2f7fe0" />
      <polygon points="22,9 12,9 12,22" fill="#1f63c4" />
      <polygon points="6,2 18,2 12,9" fill="#b9e3ff" />
    </svg>
  );
}

// Bonus EXP sesuai tampilan (hanya wallpaper yang sedang dipakai yang memberi bonus)
const EXP_BONUS: { name: string; pct: number; color: string; bg: string; border: string }[] = [
  { name: 'Mythic', pct: 25, color: '#f5d0fe', bg: '#3b0f3a', border: '#ec4899' },
  { name: 'Legendary', pct: 20, color: '#fde68a', bg: '#3d3208', border: '#f5b301' },
  { name: 'Epic', pct: 15, color: '#e9d5ff', bg: '#2a1a5e', border: '#7c3aed' },
  { name: 'Rare', pct: 10, color: '#cfe6ff', bg: '#0f2a52', border: '#2f81f7' },
  { name: 'Normal', pct: 5, color: '#ffffff', bg: '#0b0d14', border: '#ffffff' },
];
const bonusPill = (b: (typeof EXP_BONUS)[number]) => (
  <span className="rounded-xl border-2 px-3.5 py-1 text-[19px] font-extrabold" style={{ color: b.color, background: b.bg, borderColor: b.border }}>{b.name}</span>
);

const KFX = `
@keyframes kgFade{from{opacity:0}to{opacity:1}}
@keyframes kgBlink{0%,100%{opacity:.35}50%{opacity:1}}
@keyframes kgFlash{from{opacity:0}to{opacity:1}}
`;

const FX_MS: Record<Rarity, number> = { Normal: 1600, Rare: 1600, Epic: 2000, Legendary: 2400 };

export default function GachaWallpaperPage() {
  const router = useRouter();
  const [fb, setFb] = useState<any>(null);
  const [uid, setUid] = useState('');
  const [ready, setReady] = useState(false);
  const [d, setD] = useState<any>({});
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [result, setResult] = useState<{ key: string; isNew: boolean; dup?: number }[] | null>(null);
  const [fx, setFx] = useState<Rarity | null>(null);
  const [info, setInfo] = useState(false);
  const [shop, setShop] = useState(false);
  const [gain, setGain] = useState(0);
  const [showLocked, setShowLocked] = useState(false);

  const load = async (f: any, id: string, photo = '') => {
    try {
      const v = (await f.db.ref('users/' + id).get()).val() || {};
      setD({ ...v, photoURL: v.photoURL || photo });
    } catch {}
  };

  useEffect(() => {
    let stop = false;
    let off: (() => void) | undefined;
    getFirebase().then((f: any) => {
      if (stop) return;
      setFb(f);
      off = f.auth.onAuthStateChanged(async (u: any) => {
        if (stop) return;
        if (!u) { setUid(''); setReady(true); return; }
        setUid(u.uid);
        await load(f, u.uid, u.photoURL || '');
        if (!stop) setReady(true);
      });
    }).catch(() => setReady(true));
    return () => { stop = true; if (off) off(); };
  }, []);

  const say = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2200); };
  const ref = () => fb.db.ref('users/' + uid);
  const koin: number = d.koin || 0;
  const token: number = d.token || 0;
  const owned: Record<string, number> = d.ownedWallpapers || {};
  const active: string = d.activeWallpaper || '';

  const summon = async (n: 1 | 10) => {
    if (!fb || !uid || busy || fx) return;
    const cost = n === 1 ? COST_1 : COST_10;
    if (koin < cost) { say('WibuGem kurang'); return; }
    setBusy(true);
    try {
      // potong saldo pakai transaction supaya nggak bisa dobel dari 2 tab
      const res = await ref().child('koin').transaction((cur: any) => (typeof cur !== 'number' ? cur : cur >= cost ? cur - cost : undefined));
      if (!res.committed) { say('WibuGem kurang'); setBusy(false); return; }
      const picks = rollMany(n);
      const counts: Record<string, number> = {};
      picks.forEach((k) => { counts[k] = (counts[k] || 0) + 1; });
      // satu wallpaper cuma boleh dimiliki sekali; kelebihannya jadi token
      const wasOwned: Record<string, boolean> = {};
      await Promise.all(Object.keys(counts).map((k) =>
        ref().child('ownedWallpapers/' + k).transaction((cur: any) => {
          if (typeof cur === 'number' && cur > 0) { wasOwned[k] = true; return cur; }
          wasOwned[k] = false; return 1;
        })
      ));
      const left: Record<string, number> = {};
      Object.keys(counts).forEach((k) => { left[k] = counts[k]; });
      let tokens = 0;
      const items: { key: string; isNew: boolean; dup?: number }[] = picks.map((k) => {
        const give = TOKEN_DUP[WALLPAPER_CATALOG[k].rarity];
        const first = left[k] === counts[k];
        left[k]--;
        if (first && !wasOwned[k]) return { key: k, isNew: true };
        tokens += give;
        return { key: k, isNew: false, dup: give };
      });
      let newToken = token;
      if (tokens > 0) {
        const tr = await ref().child('token').transaction((cur: any) => (typeof cur === 'number' ? cur : 0) + tokens);
        newToken = tr.snapshot.val();
      }
      setGain(tokens);
      setD((p: any) => {
        const nextOwned = { ...(p.ownedWallpapers || {}) };
        Object.keys(counts).forEach((k) => { nextOwned[k] = nextOwned[k] > 0 ? nextOwned[k] : 1; });
        return { ...p, koin: res.snapshot.val(), ...(tokens > 0 ? { token: newToken } : {}), ownedWallpapers: nextOwned };
      });
      const sorted = items.sort((a, b) => rank(b.key) - rank(a.key));
      const best = WALLPAPER_CATALOG[sorted[0].key].rarity;
      setFx(best);
      setTimeout(() => { setFx(null); setResult(sorted); }, FX_MS[best]);
    } catch { say('Gagal, coba lagi'); }
    setBusy(false);
  };

  const equip = async (key: string) => {
    if (!fb || !uid || busy) return;
    setBusy(true);
    try {
      await ref().update({ activeWallpaper: key });
      setD((p: any) => ({ ...p, activeWallpaper: key }));
    } catch { say('Gagal, coba lagi'); }
    setBusy(false);
  };

  const buy = async (key: string) => {
    if (!fb || !uid || busy) return;
    const w = WALLPAPER_CATALOG[key];
    const price = TOKEN_PRICE[w.rarity];
    if (owned[key]) { say('Sudah kamu miliki'); return; }
    if (token < price) { say('Token kurang'); return; }
    setBusy(true);
    try {
      const res = await ref().child('token').transaction((cur: any) => (typeof cur !== 'number' ? cur : cur >= price ? cur - price : undefined));
      if (!res.committed) { say('Token kurang'); setBusy(false); return; }
      await ref().child('ownedWallpapers/' + key).transaction((cur: any) => (typeof cur === 'number' && cur > 0 ? cur : 1));
      setD((p: any) => ({ ...p, token: res.snapshot.val(), ownedWallpapers: { ...(p.ownedWallpapers || {}), [key]: 1 } }));
      say(w.nama + ' didapat!');
    } catch { say('Gagal, coba lagi'); }
    setBusy(false);
  };

  // duplikat lama (dari sebelum aturan baru) ditukar jadi token
  const oldDup = Object.keys(owned)
    .filter((k) => WALLPAPER_CATALOG[k] && owned[k] > 1)
    .reduce((a, k) => a + (owned[k] - 1) * TOKEN_DUP[WALLPAPER_CATALOG[k].rarity], 0);
  const convertOld = async () => {
    if (!fb || !uid || busy || !oldDup) return;
    setBusy(true);
    try {
      let add = 0;
      for (const k of Object.keys(owned)) {
        if (!WALLPAPER_CATALOG[k]) continue;
        let extra = 0;
        await ref().child('ownedWallpapers/' + k).transaction((cur: any) => {
          if (typeof cur === 'number' && cur > 1) { extra = cur - 1; return 1; }
          extra = 0; return cur;
        });
        add += extra * TOKEN_DUP[WALLPAPER_CATALOG[k].rarity];
      }
      if (add > 0) await ref().child('token').transaction((cur: any) => (typeof cur === 'number' ? cur : 0) + add);
      await load(fb, uid, d.photoURL);
      say('+' + add + ' Token');
    } catch { say('Gagal, coba lagi'); }
    setBusy(false);
  };

  const list = useMemo(
    () => Object.keys(WALLPAPER_CATALOG)
      .filter((k) => (owned[k] || showLocked) && WALLPAPER_CATALOG[k].nama.toLowerCase().includes(q.trim().toLowerCase()))
      .sort((a, b) => (owned[b] ? 1 : 0) - (owned[a] ? 1 : 0) || rank(b) - rank(a)),
    [owned, q, showLocked]
  );
  const total = Object.keys(owned).filter((k) => WALLPAPER_CATALOG[k]).length;
  const card = 'rounded-2xl border border-white/10 bg-[#171c2b]';
  const last = result && result[0];
  const fxc = fx ? RARITY_STYLE[fx].color : '#ffffff';
  const fxDur = fx ? FX_MS[fx] / 1000 : 1.6;

  return (
    <div className="fixed inset-0 overflow-y-auto text-white" style={{ background: '#131418' }}>
      <style>{KFX}</style>
      <div className="max-w-md mx-auto pb-32">
        <div className="flex items-center gap-5 px-5 pt-8 pb-5">
          <button onClick={() => router.back()} className="active:scale-90 transition-transform"><ArrowLeft className="w-7 h-7" /></button>
          <h1 className="text-[28px] font-extrabold">Wibuku Gacha</h1>
        </div>

        {ready && !uid && <p className="px-5 pt-6 text-white/60">Login dulu buat summon wallpaper.</p>}

        {uid && (
          <>
            <img src="/gacha/banner.jpg" alt="" className="mx-4 block w-[calc(100%-2rem)] rounded-[28px] object-cover" style={{ aspectRatio: '996 / 560' }} />

            <div className="mx-4 mt-9 grid grid-cols-2 gap-4">
              <button onClick={() => summon(1)} disabled={busy}
                className="rounded-[20px] p-[3px] active:scale-95 transition-transform disabled:opacity-60"
                style={{ background: 'linear-gradient(180deg,#4ea9ff,#2f86e8)', filter: koin < COST_1 ? 'brightness(.55)' : 'none' }}>
                <div className="rounded-[17px] px-3 pt-3 pb-3 text-center" style={{ background: 'linear-gradient(180deg,#8fd0ff,#5fb3fb 55%,#4a9fee)', boxShadow: 'inset 0 0 0 2px rgba(255,255,255,.35)' }}>
                  <div className="text-[27px] font-extrabold leading-tight" style={{ color: '#12305a' }}>Summon 1x</div>
                  <div className="mt-1.5 flex items-center justify-center gap-2 rounded-full py-1.5 text-[20px] font-extrabold text-white" style={{ background: 'rgba(38,52,72,.85)', border: '2px solid rgba(255,255,255,.35)' }}><Gem size={20} />{COST_1}</div>
                </div>
              </button>
              <button onClick={() => summon(10)} disabled={busy}
                className="rounded-[20px] p-[3px] active:scale-95 transition-transform disabled:opacity-60"
                style={{ background: 'linear-gradient(180deg,#f2b94d,#c98a1f)', filter: koin < COST_10 ? 'brightness(.5) saturate(.85)' : 'none' }}>
                <div className="rounded-[17px] px-3 pt-3 pb-3 text-center" style={{ background: 'linear-gradient(180deg,#ffd886,#f0b448 55%,#dd9a2c)', boxShadow: 'inset 0 0 0 2px rgba(255,255,255,.35)' }}>
                  <div className="text-[27px] font-extrabold leading-tight" style={{ color: '#4a2f0a' }}>Summon 10x</div>
                  <div className="mt-1.5 flex items-center justify-center gap-2 rounded-full py-1.5 text-[20px] font-extrabold text-white" style={{ background: 'rgba(52,44,34,.85)', border: '2px solid rgba(255,255,255,.35)' }}><Gem size={20} />{COST_10}</div>
                </div>
              </button>
            </div>

            <button onClick={() => setInfo(true)} className={card + ' mx-4 mt-8 flex w-[calc(100%-2rem)] items-center gap-4 px-5 py-4 text-left active:scale-[.98] transition-transform'}>
              <Gem size={34} />
              <span className="text-[17px] font-extrabold">Cara mendapatkan WibuGem</span>
              <span className="ml-auto flex items-center gap-1.5 text-[16px] font-medium text-[#3b9cff]">Lihat info <ArrowRight className="w-5 h-5" /></span>
            </button>

            <div className="mx-4 mt-7 rounded-2xl border bg-[#171c2b] p-5" style={{ borderColor: '#3a3a42' }}>
              <h2 className="text-[22px] font-extrabold">Bonus EXP Wallpaper</h2>
              <p className="mt-1 text-[16px] text-white/70">Hanya wallpaper yang sedang dipakai yang memberi bonus.</p>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between rounded-2xl border border-white/20 bg-[#0b0d17] px-6 py-3.5">
                  {bonusPill(EXP_BONUS[0])}<span className="text-[21px] font-extrabold">+{EXP_BONUS[0].pct}%</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {EXP_BONUS.slice(1).map((b) => (
                    <div key={b.name} className="flex items-center justify-between rounded-2xl border border-white/20 bg-[#0b0d17] px-4 py-3.5">
                      {bonusPill(b)}<span className="text-[21px] font-extrabold">+{b.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between px-5 pt-9 pb-4">
              <h2 className="text-[28px] font-extrabold">Koleksi</h2>
              <button onClick={() => setShowLocked((v) => !v)} className="flex items-center gap-3 rounded-2xl bg-[#1c2336] px-5 py-3.5 text-[17px] font-extrabold active:scale-95 transition-transform">
                {showLocked ? <EyeOff className="w-7 h-7" /> : <Eye className="w-7 h-7" />}Tampilkan terkunci
              </button>
            </div>

            {active && WALLPAPER_CATALOG[active] && (
              <div className="px-4 pb-3">
                <p className="pb-2 text-xs font-bold text-white/50">Preview di komentar</p>
                <WallpaperBg wpKey={active} className="flex gap-3 p-3 rounded-2xl border border-white/5 bg-[#1B1A20]/60">
                  <div className="w-10 h-10 shrink-0 rounded-full overflow-hidden bg-white/10">{d.photoURL ? <img src={d.photoURL} alt="" className="w-full h-full object-cover" /> : null}</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold truncate">{d.displayName || 'Kamu'}</p>
                    <p className="text-[13px] text-gray-200">Wallpaper {WALLPAPER_CATALOG[active].nama} aktif!</p>
                  </div>
                  <button onClick={() => equip('')} disabled={busy} className="self-start rounded-full bg-black/50 px-3 py-1 text-xs font-extrabold active:scale-95">Lepas</button>
                </WallpaperBg>
              </div>
            )}

            <div className={card + ' mx-4 flex items-center gap-3 px-5 py-4'}>
              <Search className="w-5 h-5 text-white/50" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari koleksi wallpaper" className="flex-1 bg-transparent text-[18px] outline-none placeholder:text-white/60" />
            </div>

            {list.length === 0 && <p className="px-5 pt-8 text-center text-white/40 font-bold">{total === 0 ? 'Belum ada wallpaper. Summon dulu!' : 'Tidak ditemukan.'}</p>}

            <div className="grid grid-cols-2 gap-3 px-4 pt-4">
              {list.map((k) => {
                const w = WALLPAPER_CATALOG[k];
                const have = !!owned[k];
                const on = active === k;
                return (
                  <button key={k} onClick={() => have && !on && equip(k)} disabled={busy || !have}
                    className={card + ' p-2.5 text-left active:scale-95 transition-transform'}
                    style={on ? { border: '2px solid #fcd34d' } : undefined}>
                    <div className="relative h-28 rounded-xl overflow-hidden" style={{ background: wpBg(k), filter: have ? 'none' : 'grayscale(1) brightness(.45)' }}>
                      <span className="absolute left-2 top-2"><Pill r={w.rarity} /></span>
                      {on && <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-amber-300 px-3 py-1 text-xs font-black text-black">★ Aktif</span>}
                      {!have && <span className="absolute inset-0 flex items-center justify-center"><Lock className="w-7 h-7 text-white/80" /></span>}
                      {have && !on && <span className="absolute bottom-2 right-2 rounded-full bg-emerald-600/80 p-1"><Check className="w-3.5 h-3.5" /></span>}
                    </div>
                    <p className="mt-2 text-center font-black truncate">{w.nama}{owned[k] > 1 ? ' x' + owned[k] : ''}</p>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {uid && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40">
          <div className="mx-auto flex max-w-md justify-end px-4">
            <div className="pointer-events-auto flex items-center gap-4 rounded-2xl bg-[#1c2233] px-6 py-3 shadow-lg shadow-black/40">
              <Gem size={34} /><span className="text-[26px] font-extrabold">{koin.toLocaleString('id-ID')}</span>
            </div>
          </div>
        </div>
      )}

      {fx && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center overflow-hidden" style={{ background: 'radial-gradient(circle at 50% 45%,rgba(10,15,30,.75),#05070f 75%)', animation: 'kgFade .25s ease-out' }}>
          <div className="w-36 h-36 rounded-full" style={{ background: 'radial-gradient(circle at 35% 30%,#fff,' + fxc + ' 45%,transparent 72%)', animation: 'kgBlink 1s ease-in-out infinite' }} />
          <p className="absolute bottom-[22%] text-lg font-black tracking-widest text-white/80" style={{ animation: 'kgBlink 1s ease-in-out infinite' }}>SUMMONING...</p>
          <div className="absolute inset-0 bg-white" style={{ opacity: 0, animation: 'kgFlash .35s ease-in ' + (fxDur - 0.35) + 's forwards' }} />
        </div>
      )}

      {result && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70" onClick={() => setResult(null)}>
          <div className="w-full max-w-md rounded-t-3xl bg-[#1a2238] p-5" onClick={(e) => e.stopPropagation()}>
            <p className="text-center text-xl font-black">Hasil Summon</p>
            <div className={'mt-4 grid gap-2 ' + (result.length > 1 ? 'grid-cols-5' : 'grid-cols-1 w-40 mx-auto')}>
              {result.map((it, i) => {
                const w = WALLPAPER_CATALOG[it.key];
                const st = RARITY_STYLE[w.rarity];
                return (
                  <div key={i} className="relative rounded-xl overflow-hidden aspect-[3/4]"
                    style={{ background: wpBg(it.key), border: '2px solid ' + st.border, animation: 'kgFade .3s ease-out both' }}>
                    {it.isNew && <span className="absolute left-0 top-0 bg-rose-500 px-1.5 text-[9px] font-black">BARU</span>}
                    {it.dup ? <span className="absolute left-0 top-0 bg-amber-400 px-1.5 text-[9px] font-black text-black">+{it.dup} Token</span> : null}
                    <span className="absolute bottom-0 inset-x-0 bg-black/60 text-center text-[9px] font-black truncate px-0.5" style={{ color: st.color }}>{w.nama}</span>
                  </div>
                );
              })}
            </div>
            {gain > 0 && <p className="mt-4 text-center text-sm font-black text-amber-300">Duplikat jadi +{gain} Token</p>}
            <button onClick={() => setResult(null)} className="mt-5 w-full rounded-2xl bg-violet-500 py-3 font-black">Oke</button>
          </div>
        </div>
      )}

      {shop && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70" onClick={() => setShop(false)}>
          <div className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-t-3xl bg-[#1a2238] p-5" onClick={(e) => e.stopPropagation()}>
            <p className="text-center text-xl font-black">Toko Token</p>
            <div className="mt-2 flex items-center justify-center gap-2">
              <Coins className="w-5 h-5 text-amber-300" />
              <span className="text-2xl font-black text-amber-300">{token.toLocaleString('id-ID')}</span>
            </div>
            <p className="mt-2 text-center text-xs font-bold text-white/50">
              Dapat wallpaper yang sudah dimiliki? Otomatis jadi token: {RARITIES.map((r) => r + ' +' + TOKEN_DUP[r]).join(' · ')}.
            </p>
            {oldDup > 0 && (
              <button onClick={convertOld} disabled={busy} className="mt-3 w-full rounded-2xl border border-amber-300/40 bg-[#2a2112] py-2.5 text-sm font-black text-amber-200 active:scale-95 disabled:opacity-60">
                Tukar duplikat lama jadi +{oldDup} Token
              </button>
            )}
            <div className="mt-4 space-y-4">
              {INFO_ORDER.map(({ r, keys }) => (
                <div key={r}>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="font-black" style={{ color: RARITY_STYLE[r].color }}>{r}</span>
                    <span className="ml-auto flex items-center gap-1 text-sm font-black text-amber-300"><Coins className="w-4 h-4" />{TOKEN_PRICE[r]}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {keys.map((k) => {
                      const have = !!owned[k];
                      return (
                        <button key={k} onClick={() => !have && buy(k)} disabled={busy || have} className="text-left active:scale-95 transition-transform">
                          <div className="relative h-20 overflow-hidden rounded-xl" style={{ background: wpBg(k), border: '1.5px solid ' + RARITY_STYLE[r].border, opacity: have ? 0.45 : 1 }}>
                            {have ? <span className="absolute bottom-1 right-1 rounded-full bg-emerald-600/90 p-0.5"><Check className="w-3 h-3" /></span> : null}
                          </div>
                          <p className="mt-1 truncate text-center text-[11px] font-black text-white/80">{WALLPAPER_CATALOG[k].nama}</p>
                          <p className="text-center text-[11px] font-black" style={{ color: have ? '#34d399' : token >= TOKEN_PRICE[r] ? '#fcd34d' : 'rgba(255,255,255,.35)' }}>{have ? 'Dimiliki' : TOKEN_PRICE[r] + ' Token'}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setShop(false)} className="mt-5 w-full rounded-2xl bg-violet-500 py-3 font-black">Tutup</button>
          </div>
        </div>
      )}

      {info && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70" onClick={() => setInfo(false)}>
          <div className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-t-3xl bg-[#1a2238] p-5" onClick={(e) => e.stopPropagation()}>
            <p className="text-center text-xl font-black">Info Rarity</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button onClick={() => { setInfo(false); setShop(true); }} className="flex items-center justify-center gap-2 rounded-2xl border border-amber-300/30 bg-[#2a2112] py-2.5 text-sm font-black text-amber-200 active:scale-95"><ShoppingBag className="w-4 h-4" />Toko Token ({token.toLocaleString('id-ID')})</button>
              <button onClick={() => router.push('/komikstore/avatar-border')} className="rounded-2xl border border-white/10 bg-[#111a2e] py-2.5 text-sm font-black active:scale-95">Gacha Border</button>
            </div>
            <p className="mt-1 text-center text-xs font-bold text-white/50">Makin tinggi rarity, makin langka dan makin bagus tampilannya.</p>
            <div className="mt-4 space-y-3">
              {INFO_ORDER.map(({ r, keys }) => {
                const st = RARITY_STYLE[r];
                const inf = RARITY_INFO[r];
                const avg = Math.max(1, Math.round(100 / RATES[r]));
                const have = keys.filter((k) => owned[k]).length;
                return (
                  <div key={r} className="rounded-2xl border bg-[#111a2e] p-3" style={{ borderColor: st.border, boxShadow: st.glow }}>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-black" style={{ color: st.color }}>{r}</span>
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-black text-black" style={{ background: st.color }}>{inf.label}</span>
                      <span className="ml-auto text-sm font-black text-amber-300" aria-label={inf.stars + ' dari 4 bintang'}>
                        {'★'.repeat(inf.stars)}<span className="text-white/20">{'★'.repeat(4 - inf.stars)}</span>
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full" style={{ width: Math.max(RATES[r], 3) + '%', background: st.color }} />
                      </div>
                      <span className="text-sm font-black" style={{ color: st.color }}>{RATES[r]}%</span>
                    </div>
                    <p className="mt-2 text-[13px] font-bold text-white/70">{inf.desc}</p>
                    <p className="mt-1 text-xs font-bold text-white/45">
                      Rata-rata ±{avg}x summon (±{(avg * COST_1).toLocaleString('id-ID')} WibuGem) · {keys.length} wallpaper · koleksimu {have}/{keys.length}
                    </p>
                    <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                      {keys.map((k) => (
                        <div key={k} className="w-14 shrink-0">
                          <div className="relative h-16 overflow-hidden rounded-lg" style={{ background: wpBg(k), border: '1px solid ' + st.border, opacity: owned[k] ? 1 : 0.5 }}>
                            {owned[k] ? <span className="absolute bottom-0.5 right-0.5 rounded-full bg-emerald-600/90 p-0.5"><Check className="w-2.5 h-2.5" /></span> : null}
                          </div>
                          <p className="mt-0.5 truncate text-center text-[9px] font-black text-white/70">{WALLPAPER_CATALOG[k].nama}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-center text-xs font-bold text-white/45">Summon 10x dijamin ada minimal 1 Rare. Perkiraan WibuGem dihitung dari peluang; hasil sebenarnya bisa lebih cepat atau lebih lama. Wallpaper yang sudah kamu punya tidak bertambah lagi: duplikatnya otomatis jadi token untuk ditukar di Toko Token.</p>
            <button onClick={() => setInfo(false)} className="mt-4 w-full rounded-2xl bg-violet-500 py-3 font-black">Oke</button>
          </div>
        </div>
      )}

      {toast && <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] rounded-full bg-slate-900/90 px-4 py-2 text-sm font-bold">{toast}</div>}
    </div>
  );
}
