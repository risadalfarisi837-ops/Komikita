'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { getFirebase } from '@/lib/firebase-client';
import { WALLPAPER_CATALOG, RARITIES, wpBg, type Rarity } from '@/lib/wallpapers';

function Gem({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <polygon points="6,2 18,2 22,9 12,22 2,9" fill="#3b9cff" />
      <polygon points="6,2 12,9 2,9" fill="#8fd0ff" />
      <polygon points="18,2 22,9 12,9" fill="#5db4ff" />
      <polygon points="2,9 12,9 12,22" fill="#2f7fe0" />
      <polygon points="22,9 12,9 12,22" fill="#1f63c4" />
      <polygon points="6,2 18,2 12,9" fill="#b9e3ff" />
    </svg>
  );
}

// Warna & bonus EXP per rarity (hanya wallpaper yang dipakai yang memberi bonus)
const SEC: Record<Rarity, { bonus: number; border: string; bg: string }> = {
  Legendary: { bonus: 20, border: '#fbbf24', bg: '#2a2312' },
  Epic:      { bonus: 15, border: '#a855f7', bg: '#211a37' },
  Rare:      { bonus: 10, border: '#2f9bff', bg: '#172033' },
  Normal:    { bonus: 5,  border: '#ffffff', bg: '#161b28' },
};
const ORDER = [...RARITIES].reverse();

function Head({ title, pill, border, bg, pillBg }: { title: string; pill: string; border: string; bg: string; pillBg?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl px-4 py-2.5" style={{ border: '1.5px solid ' + border, background: bg }}>
      <span className="h-8 w-1.5 shrink-0 rounded-full" style={{ background: border }} />
      <h2 className="text-[17px] font-extrabold">{title}</h2>
      <span className="ml-auto whitespace-nowrap rounded-xl px-3 py-1 text-[12.5px] font-extrabold" style={{ border: '1.5px solid ' + (pillBg ? 'rgba(255,255,255,.55)' : border), background: pillBg || 'transparent' }}>{pill}</span>
    </div>
  );
}

export default function GachaWallpaperPage() {
  const [fb, setFb] = useState<any>(null);
  const [uid, setUid] = useState('');
  const [ready, setReady] = useState(false);
  const [d, setD] = useState<any>({});
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [showTop, setShowTop] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  const load = async (f: any, id: string) => {
    try {
      const v = (await f.db.ref('users/' + id).get()).val() || {};
      setD(v);
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
        await load(f, u.uid);
        if (!stop) setReady(true);
      });
    }).catch(() => setReady(true));
    return () => { stop = true; if (off) off(); };
  }, []);

  const say = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2200); };
  const koin: number = d.koin || 0;
  const owned: Record<string, number> = d.ownedWallpapers || {};
  const active: string = WALLPAPER_CATALOG[d.activeWallpaper || ''] ? d.activeWallpaper : '';

  const equip = async (key: string) => {
    if (!fb || !uid || busy) return;
    setBusy(true);
    try {
      await fb.db.ref('users/' + uid).update({ activeWallpaper: key });
      setD((p: any) => ({ ...p, activeWallpaper: key }));
    } catch { say('Gagal, coba lagi'); }
    setBusy(false);
  };

  const keys = Object.keys(WALLPAPER_CATALOG);
  const sections = ORDER.map((r) => {
    const all = keys.filter((k) => WALLPAPER_CATALOG[k].rarity === r);
    const mine = all.filter((k) => owned[k] && k !== active);
    return { r, total: all.length, mine };
  }).filter((s) => s.mine.length > 0);

  return (
    <div ref={scroller} onScroll={(e) => setShowTop(e.currentTarget.scrollTop > 400)} className="fixed inset-0 overflow-y-auto text-white" style={{ background: '#131418' }}>
      <div className="max-w-md mx-auto px-4 pt-4 pb-28">
        {ready && !uid && <p className="pt-6 text-white/60">Login dulu buat lihat koleksi wallpaper.</p>}

        {uid && (
          <>
            {active && (
              <section>
                <Head title="Sedang Dipakai" pill={'+' + SEC[WALLPAPER_CATALOG[active].rarity].bonus + '% EXP aktif'} border="rgba(255,255,255,.85)" bg="#1c1824" pillBg="#6b6b73" />
                <div className="relative mt-2 aspect-[996/526] overflow-hidden rounded-2xl" style={{ background: wpBg(active) }}>
                  <div className="absolute inset-0 bg-black/15" />
                  <p className="absolute left-3.5 top-3 text-[17px] font-extrabold drop-shadow">{WALLPAPER_CATALOG[active].nama}</p>
                  <button onClick={() => equip('')} disabled={busy} className="absolute bottom-3.5 right-3.5 rounded-full bg-black/45 px-5 py-2.5 text-[16px] font-extrabold active:scale-95 transition-transform">Lepas</button>
                </div>
              </section>
            )}

            {sections.map(({ r, total, mine }) => (
              <section key={r} className="mt-6">
                <Head title={r} pill={'+' + SEC[r].bonus + '% EXP · ' + mine.length + '/' + total + ' items'} border={SEC[r].border} bg={SEC[r].bg} />
                <div className="mt-2 grid grid-cols-2 gap-3">
                  {mine.map((k) => (
                    <div key={k} className="relative aspect-[482/273] overflow-hidden rounded-2xl" style={{ background: wpBg(k) }}>
                      <div className="absolute inset-0 bg-black/45" />
                      <p className="absolute left-3.5 top-3 text-[16px] font-extrabold drop-shadow">{WALLPAPER_CATALOG[k].nama}</p>
                      <button onClick={() => equip(k)} disabled={busy} className="absolute bottom-3 right-3 rounded-full bg-black/45 px-4 py-2 text-[15px] font-extrabold text-[#2f9bff] active:scale-95 transition-transform">Pakai</button>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </>
        )}
      </div>

      {uid && (
        <div className="pointer-events-none fixed inset-x-0 bottom-5 z-40">
          <div className="relative mx-auto flex max-w-md items-center justify-end px-4">
            {showTop && (
              <button onClick={() => scroller.current?.scrollTo({ top: 0, behavior: 'smooth' })}
                className="pointer-events-auto absolute left-1/2 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full bg-[#1f95ff] shadow-lg shadow-black/40 active:scale-90 transition-transform">
                <ArrowUp className="h-7 w-7" />
              </button>
            )}
            <div className="pointer-events-auto flex items-center gap-2.5 rounded-xl bg-[#1c2233] px-4 py-2 shadow-lg shadow-black/40">
              <Gem size={22} /><span className="text-[17px] font-extrabold">{koin.toLocaleString('id-ID')}</span>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] rounded-full bg-slate-900/90 px-4 py-2 text-sm font-bold">{toast}</div>}
    </div>
  );
}
