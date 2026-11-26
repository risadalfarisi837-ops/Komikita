'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Gem, Ticket, X } from 'lucide-react';
import { getFirebase } from '@/lib/firebase-client';
import { BORDER_CATALOG } from '@/components/BorderSheet';
import { EFFECT_CATALOG } from '@/lib/effects';
import { COST_1, COST_10 } from '@/lib/wallpapers';
import { fmtC } from '@/lib/season';
import ProfileEffect from '@/components/ProfileEffect';
import GachaTabs from '@/components/GachaTabs';

type Tier = 'Basic' | 'Standard' | 'Premium';
type Item = { key: string; nama: string; tier: Tier; url?: string };
type Res = { key: string; isNew: boolean; dup?: number };

const TIERS: Tier[] = ['Basic', 'Standard', 'Premium'];
const RATE: Record<Tier, number> = { Basic: 65, Standard: 27, Premium: 8 };
const TOKEN_DUP: Record<Tier, number> = { Basic: 10, Standard: 30, Premium: 80 };
const CLR: Record<Tier, string> = { Basic: '#cbd5e1', Standard: '#7dd3fc', Premium: '#fcd34d' };
const tierOf = (h: number): Tier => (h >= 3000 ? 'Premium' : h >= 1000 ? 'Standard' : 'Basic');
const AV = 0.86;

function Visual({ kind, it, photo, size }: { kind: 'border' | 'effect'; it: Item; photo: string; size: number }) {
  if (kind === 'border') {
    return (
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <div className="absolute rounded-full overflow-hidden bg-white/10" style={{ inset: ((1 - AV) / 2) * 100 + '%' }}>
          {photo ? <img src={photo} alt="" className="w-full h-full object-cover" /> : null}
        </div>
        {it.url ? <img src={it.url} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-contain pointer-events-none" /> : null}
      </div>
    );
  }
  return (
    <div className="relative overflow-hidden rounded-2xl" style={{ width: size, height: size }}>
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full overflow-hidden bg-white/10" style={{ width: size * 0.42, height: size * 0.42 }}>
        {photo ? <img src={photo} alt="" className="w-full h-full object-cover" /> : null}
      </div>
      <ProfileEffect effectKey={it.key} />
    </div>
  );
}

function Card({ kind, it, photo, dim, big }: { kind: 'border' | 'effect'; it: Item; photo: string; dim?: boolean; big?: boolean }) {
  return (
    <div className="relative rounded-2xl flex flex-col items-center py-3"
      style={{ background: 'radial-gradient(circle at 50% 35%,#1a2440,#0a0f1e)', border: '1.5px solid ' + CLR[it.tier] + '55', opacity: dim ? 0.35 : 1 }}>
      <span className="absolute left-2 top-2 rounded-full bg-black/70 border border-white/15 px-2.5 py-0.5 text-[10px] font-black" style={{ color: CLR[it.tier] }}>{it.tier}</span>
      <div className="mt-3"><Visual kind={kind} it={it} photo={photo} size={big ? 150 : 100} /></div>
      <p className="mt-1 px-2 text-center text-sm font-black truncate w-full">{it.nama}</p>
    </div>
  );
}

export default function ItemGacha({ kind }: { kind: 'border' | 'effect' }) {
  const isB = kind === 'border';
  const F = isB
    ? { owned: 'ownedBorders', active: 'activeBorder', title: 'Gacha Border', banner: 'Border Avatar', sub: 'Pasang di sekeliling foto profilmu', off: 'Lepas border' }
    : { owned: 'ownedEffects', active: 'activeEffect', title: 'Gacha Efek', banner: 'Efek Profil', sub: 'Partikel animasi di profilmu', off: 'Lepas efek' };

  const router = useRouter();
  const [fb, setFb] = useState<any>(null);
  const [uid, setUid] = useState('');
  const [ready, setReady] = useState(false);
  const [d, setD] = useState<any>({});
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Res[] | null>(null);
  const [tab, setTab] = useState<'summon' | 'koleksi'>('summon');
  const [toast, setToast] = useState('');

  useEffect(() => {
    let stop = false;
    let off: (() => void) | undefined;
    let ref: any = null;
    getFirebase().then((f: any) => {
      if (stop) return;
      setFb(f);
      off = f.auth.onAuthStateChanged((u: any) => {
        if (ref) { ref.off(); ref = null; }
        if (stop) return;
        setReady(true);
        if (!u) { setUid(''); setD({}); return; }
        setUid(u.uid);
        ref = f.db.ref('users/' + u.uid);
        ref.on('value', (s: any) => { const v = s.val() || {}; setD({ ...v, photoURL: v.photoURL || u.photoURL || '' }); });
      });
    }).catch(() => setReady(true));
    return () => { stop = true; if (off) off(); if (ref) ref.off(); };
  }, []);

  const items: Item[] = useMemo(() => {
    const cat = (isB ? BORDER_CATALOG : EFFECT_CATALOG) as Record<string, any>;
    return Object.entries(cat).map(([key, v]) => ({ key, nama: v.nama, url: v.url, tier: (v.tier as Tier) || tierOf(v.harga || 0) }));
  }, [isB]);
  const byKey = useMemo(() => Object.fromEntries(items.map((i) => [i.key, i])) as Record<string, Item>, [items]);

  const say = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2200); };
  const koin = Number(d.koin) || 0;
  const token = Number(d.token) || 0;
  const owned: Record<string, any> = d[F.owned] || {};
  const active: string = d[F.active] || '';
  const ref = () => fb.db.ref('users/' + uid);

  const rollOne = (minRank = 0): string => {
    let r = Math.random() * 100, pick: Tier = 'Basic';
    for (const t of TIERS) { r -= RATE[t]; if (r < 0) { pick = t; break; } }
    if (TIERS.indexOf(pick) < minRank) pick = TIERS[minRank];
    const pool = items.filter((i) => i.tier === pick);
    const list = pool.length ? pool : items;
    return list[Math.floor(Math.random() * list.length)].key;
  };
  const rollMany = (n: number) => {
    const out = Array.from({ length: n }, () => rollOne());
    if (n >= 10 && !out.some((k) => TIERS.indexOf(byKey[k].tier) >= 1)) out[out.length - 1] = rollOne(1);
    return out;
  };

  const summon = async (n: 1 | 10) => {
    if (!uid) { say('Login dulu'); return; }
    if (!fb || busy) return;
    const cost = n === 1 ? COST_1 : COST_10;
    if (koin < cost) { say('Crystal kurang'); return; }
    setBusy(true);
    try {
      const paid = await ref().child('koin').transaction((cur: any) => (typeof cur !== 'number' ? cur : cur >= cost ? cur - cost : undefined));
      if (!paid.committed) { say('Crystal kurang'); return; }
      const picks = rollMany(n);
      const counts: Record<string, number> = {};
      picks.forEach((k) => { counts[k] = (counts[k] || 0) + 1; });
      const was: Record<string, boolean> = {};
      await Promise.all(Object.keys(counts).map((k) =>
        ref().child(F.owned + '/' + k).transaction((cur: any) => {
          if (cur) { was[k] = true; return cur; }
          was[k] = false; return true;
        })
      ));
      const left = { ...counts };
      let tokens = 0;
      const out: Res[] = picks.map((k) => {
        const first = left[k] === counts[k];
        left[k]--;
        if (first && !was[k]) return { key: k, isNew: true };
        const give = TOKEN_DUP[byKey[k].tier];
        tokens += give;
        return { key: k, isNew: false, dup: give };
      });
      if (tokens > 0) await ref().child('token').transaction((cur: any) => (Number(cur) || 0) + tokens);
      setRes(out);
    } catch (e: any) { say('Gagal: ' + (e?.message || 'coba lagi')); }
    finally { setBusy(false); }
  };

  const equip = async (k: string) => {
    try { await ref().update({ [F.active]: active === k ? '' : k }); say(active === k ? 'Dilepas' : 'Dipakai di Profil'); }
    catch (e: any) { say('Gagal: ' + (e?.message || 'coba lagi')); }
  };

  const have = items.filter((i) => owned[i.key]).length;
  const photo: string = d.photoURL || '';
  const demo = items[items.length - 1];

  return (
    <div className="fixed inset-0 overflow-y-auto text-white" style={{ background: 'radial-gradient(ellipse at top,#131b33 0%,#0a0f1e 60%,#070a14 100%)' }}>
      <div className="max-w-md mx-auto pb-16">
        <div className="flex items-center gap-4 px-5 pt-8 pb-4">
          <button onClick={() => router.back()} aria-label="Kembali" className="active:scale-90 transition-transform"><ArrowLeft className="w-7 h-7" /></button>
          <h1 className="text-2xl font-black">{F.title}</h1>
        </div>
        <GachaTabs />

        {ready && !uid && <p className="px-5 pt-6 text-white/60">Login dulu buat summon.</p>}

        {uid && (
          <>
            <div className="mx-4 flex rounded-3xl border border-white/10 bg-white/5 py-3">
              <div className="flex-1 text-center"><p className="text-2xl font-extrabold flex items-center justify-center gap-2" style={{ color: '#f1c40f' }}><Gem className="w-5 h-5" />{fmtC(koin)}</p><p className="text-sm font-bold text-white/50">Crystal</p></div>
              <div className="w-px bg-white/10" />
              <div className="flex-1 text-center"><p className="text-2xl font-extrabold flex items-center justify-center gap-2" style={{ color: '#7dd3fc' }}><Ticket className="w-5 h-5" />{fmtC(token)}</p><p className="text-sm font-bold text-white/50">Token</p></div>
            </div>

            <div className="mx-4 mt-4 flex rounded-full bg-white/5 p-1">
              {(['summon', 'koleksi'] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)} className="flex-1 py-2.5 rounded-full text-base font-extrabold" style={{ background: tab === t ? '#FF6B6B' : 'transparent' }}>
                  {t === 'summon' ? 'Summon' : `Koleksi ${have}/${items.length}`}
                </button>
              ))}
            </div>

            {tab === 'summon' ? (
              <div className="px-4 pt-5">
                <div className="rounded-3xl border border-amber-400/70 bg-[#111a2e] p-4 text-center" style={{ boxShadow: '0 0 24px rgba(251,191,36,.25)' }}>
                  <p className="text-xs font-extrabold tracking-widest" style={{ color: '#fde68a' }}>BANNER UTAMA</p>
                  <p className="text-2xl font-extrabold mt-1">{F.banner}</p>
                  <div className="flex justify-center mt-2">{demo && <Visual kind={kind} it={demo} photo={photo} size={130} />}</div>
                  <p className="text-sm font-bold text-white/60 mt-1">{F.sub}</p>
                </div>
                <div className="flex gap-3 mt-4">
                  <button disabled={busy} onClick={() => summon(1)} className="flex-1 rounded-2xl py-3 font-extrabold active:scale-95 transition-transform disabled:opacity-50" style={{ background: '#FF6B6B' }}>
                    Summon ×1<span className="block text-sm font-bold text-white/80 flex items-center justify-center gap-1"><Gem className="w-3.5 h-3.5" />{COST_1}</span>
                  </button>
                  <button disabled={busy} onClick={() => summon(10)} className="flex-1 rounded-2xl py-3 font-extrabold active:scale-95 transition-transform disabled:opacity-50" style={{ background: 'linear-gradient(90deg,#f59e0b,#fbbf24)', color: '#451a03' }}>
                    Summon ×10<span className="block text-sm font-bold flex items-center justify-center gap-1"><Gem className="w-3.5 h-3.5" />{COST_10}</span>
                  </button>
                </div>
                <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="font-extrabold mb-2">Peluang</p>
                  {TIERS.map((t) => (
                    <div key={t} className="flex justify-between text-base font-bold py-0.5"><span style={{ color: CLR[t] }}>{t}</span><span className="text-white/60">{RATE[t]}%</span></div>
                  ))}
                  <p className="mt-2 text-sm font-bold text-white/45">Summon ×10 dijamin minimal 1 Standard. Yang sudah dimiliki otomatis jadi token.</p>
                </div>
              </div>
            ) : (
              <div className="px-4 pt-5">
                {active && (
                  <button onClick={() => equip(active)} className="mb-3 rounded-full bg-white/10 px-4 py-1.5 text-xs font-extrabold active:scale-95 transition-transform">{F.off}</button>
                )}
                <div className="grid grid-cols-2 gap-3">
                  {items.map((it) => (
                    <button key={it.key} disabled={!owned[it.key]} onClick={() => equip(it.key)} className="text-left">
                      <Card kind={kind} it={it} photo={photo} dim={!owned[it.key]} />
                      <p className="mt-1 text-center text-sm font-extrabold" style={{ color: active === it.key ? '#34D399' : owned[it.key] ? '#fff' : 'rgba(255,255,255,.35)' }}>
                        {active === it.key ? '✓ Dipakai' : owned[it.key] ? 'Pakai' : 'Belum punya'}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {res && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-5" style={{ background: 'rgba(5,8,18,.94)' }}>
          <button onClick={() => setRes(null)} aria-label="Tutup" className="absolute top-6 right-6 p-2"><X className="w-7 h-7" /></button>
          <p className="text-2xl font-extrabold mb-4">Hasil Summon</p>
          <div className={'grid gap-3 w-full max-w-md ' + (res.length === 1 ? 'grid-cols-1 px-12' : 'grid-cols-2')} style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            {res.map((r, i) => (
              <div key={i}>
                <Card kind={kind} it={byKey[r.key]} photo={photo} big={res.length === 1} />
                <p className="mt-1 text-center text-xs font-extrabold" style={{ color: r.isNew ? '#34D399' : '#7dd3fc' }}>{r.isNew ? 'BARU!' : '+' + r.dup + ' Token'}</p>
              </div>
            ))}
          </div>
          <button onClick={() => { setRes(null); setTab('koleksi'); }} className="mt-5 px-8 py-3 rounded-full font-extrabold" style={{ background: '#FF6B6B' }}>Lihat koleksi</button>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-10 inset-x-0 z-[60] flex justify-center pointer-events-none">
          <span className="px-5 py-3 rounded-full bg-black/85 text-white text-base font-bold">{toast}</span>
        </div>
      )}
    </div>
  );
}
