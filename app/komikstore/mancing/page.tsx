'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getFirebase } from '@/lib/firebase-client';
import FishingGame from '@/components/fishing/FishingGame';
import { DEFAULT_ROD, GACHA_DUPLICATE_REFUND, GACHA_PRICE, RODS_BY_ID, SPECIES_BY_ID, fishPrice, rollGacha, sanitizeBag, sanitizeRods } from '@/lib/fishing';
import type { BagItem, Rod } from '@/lib/fishing';

export default function MancingPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [name, setName] = useState('');
  const [photo, setPhoto] = useState('');
  const [crystal, setCrystal] = useState(0);
  const [xp, setXp] = useState(0);
  const [bag, setBagState] = useState<BagItem[]>([]);
  const [rods, setRods] = useState<string[]>([DEFAULT_ROD]);
  const [equippedRod, setEquippedRod] = useState(DEFAULT_ROD);
  const [err, setErr] = useState('');
  const fb = useRef<any>(null);
  const uid = useRef('');
  const bagRef = useRef<BagItem[]>([]);
  const xpRef = useRef(0);
  const crystalRef = useRef(0);
  const rodsRef = useRef<string[]>([DEFAULT_ROD]);

  const setBag = (b: BagItem[]) => { bagRef.current = b; setBagState(b); };
  const warn = useCallback((m: string) => { setErr(m); setTimeout(() => setErr(''), 3000); }, []);

  useEffect(() => {
    let stop = false;
    let off: (() => void) | undefined;
    getFirebase().then((f: any) => {
      if (stop) return;
      fb.current = f;
      off = f.auth.onAuthStateChanged(async (u: any) => {
        if (stop) return;
        if (!u) { uid.current = ''; setName(''); setPhoto(''); setReady(true); return; }
        uid.current = u.uid;
        setName(u.displayName || '');
        setPhoto(u.photoURL || '');
        try {
          const v = (await f.db.ref('users/' + u.uid).get()).val() || {};
          if (stop) return;
          if (typeof v.displayName === 'string' && v.displayName) setName(v.displayName);
          if (typeof v.photoURL === 'string' && v.photoURL) setPhoto(v.photoURL);
          crystalRef.current = typeof v.koin === 'number' ? v.koin : 0;
          setCrystal(crystalRef.current);
          const fx = typeof v.fishing?.xp === 'number' ? v.fishing.xp : 0;
          xpRef.current = fx;
          setXp(fx);
          setBag(sanitizeBag(v.fishing?.bag));
          const r = sanitizeRods(v.fishing?.rods);
          rodsRef.current = r;
          setRods(r);
          const eq = typeof v.fishing?.equipped === 'string' && r.includes(v.fishing.equipped) ? v.fishing.equipped : DEFAULT_ROD;
          setEquippedRod(eq);
        } catch { /* tetap bisa main tanpa data tersimpan */ }
        if (!stop) setReady(true);
      });
    }).catch(() => setReady(true));
    return () => { stop = true; if (off) off(); };
  }, []);

  const onCatch = useCallback((item: BagItem, gain: number) => {
    const nb = [...bagRef.current, item];
    const nx = xpRef.current + gain;
    xpRef.current = nx;
    setBag(nb);
    setXp(nx);
    if (!uid.current || !fb.current) return;
    const ref = fb.current.db.ref('users/' + uid.current + '/fishing');
    ref.update({ bag: nb, xp: nx }).catch(() => warn('Hasil tangkapan belum tersimpan'));
    ref.child('caught/' + item.s).transaction((c: any) => (typeof c === 'number' ? c : 0) + 1).catch(() => {});
  }, [warn]);

  // return: Crystal yang didapat, atau -1 kalau belum login
  const onSell = useCallback(async (ids: string[]): Promise<number> => {
    if (!uid.current || !fb.current) return -1;
    const set = new Set(ids);
    const items = bagRef.current.filter((b) => set.has(b.id));
    if (!items.length) return 0;
    const curRod = RODS_BY_ID[equippedRod] || RODS_BY_ID[DEFAULT_ROD];
    const total = items.reduce((s, b) => s + fishPrice(SPECIES_BY_ID[b.s], b.w, curRod.money), 0);
    const nb = bagRef.current.filter((b) => !set.has(b.id));
    setBag(nb);
    try {
      const u = fb.current.db.ref('users/' + uid.current);
      await u.child('fishing').update({ bag: nb });
      const res = await u.child('koin').transaction((c: any) => (typeof c === 'number' ? c : 0) + total);
      const val = res?.snapshot?.val();
      if (typeof val === 'number') { crystalRef.current = val; setCrystal(val); } else { crystalRef.current += total; setCrystal((c) => c + total); }
      return total;
    } catch {
      warn('Gagal menjual, coba lagi');
      setBag(bagRef.current.concat(items));
      return 0;
    }
  }, [warn]);

  // 'ok' | 'kurang' (Crystal tidak cukup) | 'gagal' (error jaringan/Firebase)
  const buyRod = useCallback(async (id: string): Promise<'ok' | 'kurang' | 'gagal'> => {
    if (!uid.current || !fb.current) return 'gagal';
    const def = RODS_BY_ID[id];
    if (!def || def.gachaOnly) return 'gagal';
    if (rodsRef.current.includes(id)) return 'ok';
    if (crystalRef.current < def.price) return 'kurang';
    try {
      const u = fb.current.db.ref('users/' + uid.current);
      const res = await u.child('koin').transaction((c: any) => {
        const cur = typeof c === 'number' ? c : 0;
        return cur >= def.price ? cur - def.price : c;
      });
      const val = res?.snapshot?.val();
      if (!res?.committed || typeof val !== 'number') return 'kurang';
      crystalRef.current = val;
      setCrystal(val);
      const nr = Array.from(new Set([...rodsRef.current, id]));
      rodsRef.current = nr;
      setRods(nr);
      setEquippedRod(id);
      await u.child('fishing').update({ rods: nr, equipped: id });
      return 'ok';
    } catch {
      return 'gagal';
    }
  }, []);

  const equipRod = useCallback((id: string) => {
    if (!rodsRef.current.includes(id)) return;
    setEquippedRod(id);
    if (uid.current && fb.current) {
      fb.current.db.ref('users/' + uid.current + '/fishing/equipped').set(id).catch(() => {});
    }
  }, []);

  const gacha = useCallback(async (): Promise<{ rod: Rod; duplicate: boolean } | 'kurang' | 'gagal'> => {
    if (!uid.current || !fb.current) return 'gagal';
    if (crystalRef.current < GACHA_PRICE) return 'kurang';
    try {
      const u = fb.current.db.ref('users/' + uid.current);
      const res = await u.child('koin').transaction((c: any) => {
        const cur = typeof c === 'number' ? c : 0;
        return cur >= GACHA_PRICE ? cur - GACHA_PRICE : c;
      });
      if (!res?.committed) return 'kurang';
      let val = typeof res.snapshot.val() === 'number' ? res.snapshot.val() : crystalRef.current;
      const got = rollGacha();
      const duplicate = rodsRef.current.includes(got.id);
      if (duplicate) {
        const r2 = await u.child('koin').transaction((c: any) => (typeof c === 'number' ? c : 0) + GACHA_DUPLICATE_REFUND);
        if (typeof r2?.snapshot?.val() === 'number') val = r2.snapshot.val();
      } else {
        const nr = Array.from(new Set([...rodsRef.current, got.id]));
        rodsRef.current = nr;
        setRods(nr);
        await u.child('fishing/rods').set(nr);
      }
      crystalRef.current = val;
      setCrystal(val);
      return { rod: got, duplicate };
    } catch {
      return 'gagal';
    }
  }, []);

  if (!ready) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#0b1a2b] font-bold text-white/70">Memuat pulau...</div>
    );
  }

  return (
    <>
      <FishingGame
        name={name} photo={photo} crystal={crystal} xp={xp} bag={bag}
        rods={rods} equippedRod={equippedRod}
        onCatch={onCatch} onSell={onSell}
        onBuyRod={buyRod} onEquipRod={equipRod} onGacha={gacha}
        onExit={() => router.push('/komikstore')}
      />
      {err && <div className="fixed left-1/2 top-24 z-[80] -translate-x-1/2 rounded-full bg-rose-600 px-4 py-2 text-sm font-bold text-white">{err}</div>}
    </>
  );
}
