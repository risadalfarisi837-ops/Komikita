'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getFirebase } from '@/lib/firebase-client';
import FishingGame from '@/components/fishing/FishingGame';
import {
  DEFAULT_ROD, GACHA_DUPLICATE_REFUND, GACHA_PRICE, RODS_BY_ID, SPECIES_BY_ID, fishPrice, rollGacha, nextPity, sanitizeBag, sanitizeRods,
} from '@/lib/fishing';
import type { BagItem, Rod } from '@/lib/fishing';

export default function MancingPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [name, setName] = useState('');
  const [photo, setPhoto] = useState('');
  const [crystal, setCrystal] = useState(0);
  const [xp, setXp] = useState(0);
  const [bag, setBagState] = useState<BagItem[]>([]);
  const [err, setErr] = useState('');
  const [isDev, setIsDev] = useState(false); // role Developer -> Dev Tools mancing
  const [rods, setRodsState] = useState<string[]>([DEFAULT_ROD]);
  const [equippedRod, setEquippedState] = useState<string>(DEFAULT_ROD);
  const [pity, setPity] = useState(0);
  const [starter, setStarter] = useState(false);
  const fb = useRef<any>(null);
  const uid = useRef('');
  const bagRef = useRef<BagItem[]>([]);
  const xpRef = useRef(0);
  const rodsRef = useRef<string[]>([DEFAULT_ROD]);
  const equipRef = useRef<string>(DEFAULT_ROD);
  const pityRef = useRef(0);
  const starterRef = useRef(false);

  const setBag = (b: BagItem[]) => { bagRef.current = b; setBagState(b); };
  const setRods = (r: string[]) => { rodsRef.current = r; setRodsState(r); };
  const setEquipped = (id: string) => { equipRef.current = id; setEquippedState(id); };
  const warn = useCallback((m: string) => { setErr(m); setTimeout(() => setErr(''), 3000); }, []);

  useEffect(() => {
    let stop = false;
    let off: (() => void) | undefined;
    getFirebase().then((f: any) => {
      if (stop) return;
      fb.current = f;
      off = f.auth.onAuthStateChanged(async (u: any) => {
        if (stop) return;
        if (!u) { uid.current = ''; setName(''); setPhoto(''); setIsDev(false); setReady(true); return; }
        uid.current = u.uid;
        setName(u.displayName || '');
        setPhoto(u.photoURL || '');
        try {
          const v = (await f.db.ref('users/' + u.uid).get()).val() || {};
          if (stop) return;
          if (typeof v.displayName === 'string' && v.displayName) setName(v.displayName);
          if (typeof v.photoURL === 'string' && v.photoURL) setPhoto(v.photoURL);
          setCrystal(typeof v.koin === 'number' ? v.koin : 0);
          setIsDev(v.role === 'Developer');
          const fx = typeof v.fishing?.xp === 'number' ? v.fishing.xp : 0;
          xpRef.current = fx;
          setXp(fx);
          setBag(sanitizeBag(v.fishing?.bag));
          const owned = sanitizeRods(v.fishing?.rods);
          setRods(owned);
          const eq = v.fishing?.equippedRod;
          setEquipped(typeof eq === 'string' && owned.includes(eq) ? eq : DEFAULT_ROD);
          const py = v.fishing?.pity;
          pityRef.current = typeof py === 'number' && py >= 0 ? Math.floor(py) : 0;
          setPity(pityRef.current);
          starterRef.current = !!v.fishing?.starter;
          setStarter(starterRef.current);
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
    const bonus = RODS_BY_ID[equipRef.current]?.money ?? 0; // bonus harga jual dari joran yang dipakai
    const total = items.reduce((s, b) => s + fishPrice(SPECIES_BY_ID[b.s], b.w, bonus), 0);
    const nb = bagRef.current.filter((b) => !set.has(b.id));
    setBag(nb);
    try {
      const u = fb.current.db.ref('users/' + uid.current);
      await u.child('fishing').update({ bag: nb });
      const res = await u.child('koin').transaction((c: any) => (typeof c === 'number' ? c : 0) + total);
      const val = res?.snapshot?.val();
      if (typeof val === 'number') setCrystal(val); else setCrystal((c) => c + total);
      return total;
    } catch {
      warn('Gagal menjual, coba lagi');
      setBag(bagRef.current.concat(items));
      return 0;
    }
  }, [warn]);

  // potong Crystal pakai transaction supaya aman dari klik ganda / dua tab
  const spend = useCallback(async (cost: number): Promise<'ok' | 'kurang' | 'gagal'> => {
    if (!uid.current || !fb.current) return 'gagal';
    try {
      const res = await fb.current.db.ref('users/' + uid.current + '/koin').transaction((c: any) => (typeof c !== 'number' ? c : c >= cost ? c - cost : undefined));
      const val = res?.snapshot?.val();
      if (!res?.committed || typeof val !== 'number') return 'kurang';
      setCrystal(val);
      return 'ok';
    } catch {
      return 'gagal';
    }
  }, []);

  const onBuyRod = useCallback(async (id: string): Promise<'ok' | 'kurang' | 'gagal'> => {
    const r = RODS_BY_ID[id];
    if (!r || (r.gachaOnly && !r.monthly) || r.price <= 0 || rodsRef.current.includes(id)) return 'gagal';
    const st = await spend(r.price);
    if (st !== 'ok') return st;
    const nr = [...rodsRef.current, id];
    setRods(nr);
    try {
      await fb.current.db.ref('users/' + uid.current + '/fishing').update({ rods: nr });
    } catch {
      warn('Joran belum tersimpan, coba beli ulang');
    }
    return 'ok';
  }, [spend, warn]);

  const onEquipRod = useCallback((id: string) => {
    if (!rodsRef.current.includes(id)) return;
    setEquipped(id);
    if (!uid.current || !fb.current) return;
    fb.current.db.ref('users/' + uid.current + '/fishing').update({ equippedRod: id }).catch(() => warn('Joran belum tersimpan'));
  }, [warn]);

  const onGacha = useCallback(async (): Promise<{ rod: Rod; duplicate: boolean } | 'kurang' | 'gagal'> => {
    const st = await spend(GACHA_PRICE);
    if (st !== 'ok') return st;
    const rod = rollGacha(Math.random, pityRef.current);
    const duplicate = rodsRef.current.includes(rod.id);
    const np = nextPity(rod, pityRef.current);
    pityRef.current = np;
    setPity(np);
    const u = fb.current.db.ref('users/' + uid.current);
    try {
      if (duplicate) {
        await u.child('fishing').update({ pity: np });
        const res = await u.child('koin').transaction((c: any) => (typeof c === 'number' ? c : 0) + GACHA_DUPLICATE_REFUND);
        const val = res?.snapshot?.val();
        if (typeof val === 'number') setCrystal(val);
      } else {
        const nr = [...rodsRef.current, rod.id];
        setRods(nr);
        await u.child('fishing').update({ rods: nr, pity: np });
      }
    } catch {
      warn('Hasil gacha belum tersimpan');
    }
    return { rod, duplicate };
  }, [spend, warn]);

  // Paket Pemula: sekali per akun (flag disimpan dulu, baru hadiah diberikan)
  const onClaimStarter = useCallback(async (): Promise<boolean> => {
    if (!uid.current || !fb.current || starterRef.current) return false;
    starterRef.current = true;
    try {
      const u = fb.current.db.ref('users/' + uid.current);
      const nr = rodsRef.current.includes('fiber') ? rodsRef.current : [...rodsRef.current, 'fiber'];
      await u.child('fishing').update({ rods: nr, starter: true });
      setRods(nr);
      setStarter(true);
      const res = await u.child('koin').transaction((c: any) => (typeof c === 'number' ? c : 0) + 600);
      const val = res?.snapshot?.val();
      if (typeof val === 'number') setCrystal(val);
      return true;
    } catch {
      starterRef.current = false;
      return false;
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
        rods={rods} equippedRod={equippedRod} dev={isDev}
        onCatch={onCatch} onSell={onSell} onBuyRod={onBuyRod} onEquipRod={onEquipRod} onGacha={onGacha}
        pity={pity} starterClaimed={starter} onClaimStarter={onClaimStarter}
        onExit={() => router.push('/komikstore')}
      />
      {err && <div className="fixed left-1/2 top-24 z-[80] -translate-x-1/2 rounded-full bg-rose-600 px-4 py-2 text-sm font-bold text-white">{err}</div>}
    </>
  );
}
