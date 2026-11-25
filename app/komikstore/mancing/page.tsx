'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getFirebase } from '@/lib/firebase-client';
import FishingGame from '@/components/fishing/FishingGame';
import { SPECIES_BY_ID, fishPrice, sanitizeBag } from '@/lib/fishing';
import type { BagItem } from '@/lib/fishing';

export default function MancingPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [name, setName] = useState('');
  const [photo, setPhoto] = useState('');
  const [crystal, setCrystal] = useState(0);
  const [xp, setXp] = useState(0);
  const [bag, setBagState] = useState<BagItem[]>([]);
  const [err, setErr] = useState('');
  const fb = useRef<any>(null);
  const uid = useRef('');
  const bagRef = useRef<BagItem[]>([]);
  const xpRef = useRef(0);

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
          setCrystal(typeof v.koin === 'number' ? v.koin : 0);
          const fx = typeof v.fishing?.xp === 'number' ? v.fishing.xp : 0;
          xpRef.current = fx;
          setXp(fx);
          setBag(sanitizeBag(v.fishing?.bag));
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
    const total = items.reduce((s, b) => s + fishPrice(SPECIES_BY_ID[b.s], b.w), 0);
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

  if (!ready) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#0b1a2b] font-bold text-white/70">Memuat pulau...</div>
    );
  }

  return (
    <>
      <FishingGame name={name} photo={photo} crystal={crystal} xp={xp} bag={bag} onCatch={onCatch} onSell={onSell} onExit={() => router.push('/komikstore')} />
      {err && <div className="fixed left-1/2 top-24 z-[80] -translate-x-1/2 rounded-full bg-rose-600 px-4 py-2 text-sm font-bold text-white">{err}</div>}
    </>
  );
}
