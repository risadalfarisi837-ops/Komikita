'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getFirebase } from '@/lib/firebase-client';
import FishingGame from '@/components/fishing/FishingGame';
import FishingLobby from '@/components/fishing/FishingLobby';
import FishLoading from '@/components/fishing/FishLoading';
import { MAIN_ROOM, islandName } from '@/lib/fishingIslands';
import {
  DEFAULT_ROD, GACHA_DUPLICATE_REFUND, GACHA_PRICE, ROD_MAX_LV, RODS_BY_ID, SPECIES_BY_ID, clampRodLv, fishPrice, rodAt, rodUpgradeCost, rollGacha, nextPity, sanitizeBag, sanitizeRodLv, sanitizeRods,
} from '@/lib/fishing';
import type { BagItem, Rarity, Rod } from '@/lib/fishing';
import { DEFAULT_OUTFIT, sanitizeOutfit } from '@/components/fishing/outfit';
import type { Outfit } from '@/components/fishing/outfit';
import { DUP_REFUND, LIMITED_PRICE, rollLimited, sanitizeLimited } from '@/lib/limitedGacha';
import type { LimitedDrop } from '@/lib/limitedGacha';

export default function MancingPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [room, setRoom] = useState<string | null>(null); // null = masih di lobi
  const [name, setName] = useState('');
  const [photo, setPhoto] = useState('');
  const [crystal, setCrystal] = useState(0);
  const [gems, setGems] = useState(0);
  const [xp, setXp] = useState(0);
  const [outfit, setOutfit] = useState<Outfit>(DEFAULT_OUTFIT);
  const [bag, setBagState] = useState<BagItem[]>([]);
  const [err, setErr] = useState('');
  const [limited, setLimited] = useState<{ owned: string[]; pity: number }>({ owned: [], pity: 0 });
  const limitedRef = useRef<{ owned: string[]; pity: number; items: Record<string, number> }>({ owned: [], pity: 0, items: {} });
  const [isDev, setIsDev] = useState(false); // role Developer -> Dev Tools mancing
  const [rods, setRodsState] = useState<string[]>([DEFAULT_ROD]);
  const [equippedRod, setEquippedState] = useState<string>(DEFAULT_ROD);
  const [rodLv, setRodLvState] = useState<Record<string, number>>({});
  const [pity, setPity] = useState(0);
  const [starter, setStarter] = useState(false);
  // layar muat: 0 bangunin pulau, 1 nyambung, 2 baca peta, 3 nyiapin, 4 masuk (urutan sama seperti tampilan acuan)
  const [stage, setStage] = useState(0);
  const [pct, setPct] = useState(0);
  const [boot, setBoot] = useState(false);
  const [shown, setShown] = useState(false);
  const [entering, setEntering] = useState(false);
  const [enterPct, setEnterPct] = useState(55);
  const fb = useRef<any>(null);
  const uid = useRef('');
  const bagRef = useRef<BagItem[]>([]);
  const xpRef = useRef(0);
  const rodsRef = useRef<string[]>([DEFAULT_ROD]);
  const equipRef = useRef<string>(DEFAULT_ROD);
  const rodLvRef = useRef<Record<string, number>>({});
  const pityRef = useRef(0);
  const isDevRef = useRef(false);
  const starterRef = useRef(false);

  const setBag = (b: BagItem[]) => { bagRef.current = b; setBagState(b); };
  const setRods = (r: string[]) => { rodsRef.current = r; setRodsState(r); };
  const setRodLv = (m: Record<string, number>) => { rodLvRef.current = m; setRodLvState(m); };
  const setEquipped = (id: string) => { equipRef.current = id; setEquippedState(id); };
  const warn = useCallback((m: string) => { setErr(m); setTimeout(() => setErr(''), 3000); }, []);

  useEffect(() => {
    let stop = false;
    let off: (() => void) | undefined;
    getFirebase().then((f: any) => {
      if (stop) return;
      fb.current = f;
      setStage((x) => Math.max(x, 1)); setPct((x) => Math.max(x, 5));
      off = f.auth.onAuthStateChanged(async (u: any) => {
        if (stop) return;
        setStage((x) => Math.max(x, 2)); setPct((x) => Math.max(x, 10));
        if (!u) { uid.current = ''; setName(''); setPhoto(''); setIsDev(false); isDevRef.current = false; setReady(true); return; }
        uid.current = u.uid;
        setStage((x) => Math.max(x, 3)); setPct((x) => Math.max(x, 13));
        setName(u.displayName || '');
        setPhoto(u.photoURL || '');
        try {
          const v = (await f.db.ref('users/' + u.uid).get()).val() || {};
          if (stop) return;
          if (typeof v.displayName === 'string' && v.displayName) setName(v.displayName);
          if (typeof v.photoURL === 'string' && v.photoURL) setPhoto(v.photoURL);
          setCrystal(typeof v.koin === 'number' ? v.koin : 0);
          setGems(typeof v.gems === 'number' ? v.gems : 0);
          setIsDev(v.role === 'Developer'); isDevRef.current = v.role === 'Developer';
          const fx = typeof v.fishing?.xp === 'number' ? v.fishing.xp : 0;
          xpRef.current = fx;
          setXp(fx);
          setOutfit(sanitizeOutfit(v.fishing?.outfit));
          setBag(sanitizeBag(v.fishing?.bag));
          const owned = sanitizeRods(v.fishing?.rods);
          setRods(owned);
          setRodLv(sanitizeRodLv(v.fishing?.rodLv));
          const eq = v.fishing?.equippedRod;
          setEquipped(typeof eq === 'string' && owned.includes(eq) ? eq : DEFAULT_ROD);
          const py = v.fishing?.pity;
          pityRef.current = typeof py === 'number' && py >= 0 ? Math.floor(py) : 0;
          setPity(pityRef.current);
          starterRef.current = !!v.fishing?.starter;
          setStarter(starterRef.current);
          limitedRef.current = sanitizeLimited(v.fishing?.limited);
          setLimited({ owned: limitedRef.current.owned, pity: limitedRef.current.pity });
        } catch { /* tetap bisa main tanpa data tersimpan */ }
        if (!stop) setReady(true);
      });
    }).catch(() => setReady(true));
    return () => { stop = true; if (off) off(); };
  }, []);

  // layar muat tampil minimal sebentar, bar naik pelan saat "Lagi nyiapin pulau...", lalu penuh saat siap
  useEffect(() => { const t = setTimeout(() => setBoot(true), 650); return () => clearTimeout(t); }, []);
  useEffect(() => {
    if (stage !== 3 || ready) return;
    const t = setInterval(() => setPct((x) => (x < 96 ? Math.min(96, x + 9) : x)), 70);
    return () => clearInterval(t);
  }, [stage, ready]);
  useEffect(() => {
    if (!ready || !boot) return;
    const t = setTimeout(() => setShown(true), 450);
    return () => clearTimeout(t);
  }, [ready, boot]);
  // setelah pilih pulau di lobi: layar muat "Masuk ke pulau..." menutupi game yang sedang disiapkan
  useEffect(() => {
    if (!entering) return;
    const t = setInterval(() => setEnterPct((x) => Math.min(100, x + 7)), 70);
    const done = setTimeout(() => setEntering(false), 1100);
    return () => { clearInterval(t); clearTimeout(done); };
  }, [entering]);

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

  // Lemari: simpan gaya karakter ke akun
  const onSaveOutfit = useCallback((o: Outfit) => {
    const s = sanitizeOutfit(o);
    setOutfit(s);
    if (!uid.current || !fb.current) return;
    fb.current.db.ref('users/' + uid.current + '/fishing/outfit').set(s).catch(() => warn('Gaya karakter belum tersimpan'));
  }, [warn]);

  // Dev Tools: set XP langsung (level ikut berubah karena level dihitung dari XP)
  const onSetXp = useCallback((v: number) => {
    const nx = Math.max(0, Math.floor(Number(v) || 0));
    xpRef.current = nx;
    setXp(nx);
    if (!uid.current || !fb.current) return;
    fb.current.db.ref('users/' + uid.current + '/fishing').update({ xp: nx }).catch(() => warn('XP belum tersimpan'));
  }, [warn]);

  // return: Crystal yang didapat, atau -1 kalau belum login
  const onSell = useCallback(async (ids: string[]): Promise<number> => {
    if (!uid.current || !fb.current) return -1;
    const set = new Set(ids);
    const items = bagRef.current.filter((b) => set.has(b.id));
    if (!items.length) return 0;
    const eqRod = RODS_BY_ID[equipRef.current];
    const bonus = eqRod ? rodAt(eqRod, rodLvRef.current[eqRod.id]).money : 0; // bonus harga jual dari joran yang dipakai (termasuk level)
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

  // Upgrade level joran (maks ROD_MAX_LV): bayar Crystal, level disimpan di fishing/rodLv
  const onUpgradeRod = useCallback(async (id: string): Promise<'ok' | 'kurang' | 'gagal' | 'maks'> => {
    const r = RODS_BY_ID[id];
    if (!r || !rodsRef.current.includes(id)) return 'gagal';
    const lv = clampRodLv(rodLvRef.current[id]);
    if (lv >= ROD_MAX_LV) return 'maks';
    const st = await spend(rodUpgradeCost(r, lv));
    if (st !== 'ok') return st;
    const nl = lv + 1;
    setRodLv({ ...rodLvRef.current, [id]: nl });
    try {
      await fb.current.db.ref('users/' + uid.current + '/fishing/rodLv/' + id).set(nl);
    } catch {
      warn('Level joran belum tersimpan, coba upgrade ulang');
    }
    return 'ok';
  }, [spend, warn]);

  const onEquipRod = useCallback((id: string) => {
    if (!rodsRef.current.includes(id)) return;
    setEquipped(id);
    if (!uid.current || !fb.current) return;
    fb.current.db.ref('users/' + uid.current + '/fishing').update({ equippedRod: id }).catch(() => warn('Joran belum tersimpan'));
  }, [warn]);

  const onGacha = useCallback(async (opt?: { min?: Rarity | ''; free?: boolean }): Promise<{ rod: Rod; duplicate: boolean } | 'kurang' | 'gagal'> => {
    const d = isDevRef.current ? opt : undefined; // opsi gacha wangi hanya dihormati untuk role Developer
    if (!uid.current || !fb.current) return 'gagal';
    if (!d?.free) {
      const st = await spend(GACHA_PRICE);
      if (st !== 'ok') return st;
    }
    const rod = rollGacha(Math.random, pityRef.current, d?.min || '');
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

  // Gacha Baju Limited (bayar Gems). free hanya dihormati untuk role Developer.
  const onOpenLimited = useCallback(async (n: 1 | 10, free?: boolean): Promise<LimitedDrop[] | 'kurang' | 'gagal'> => {
    if (!uid.current || !fb.current) return 'gagal';
    const u = fb.current.db.ref('users/' + uid.current);
    const cost = n === 10 ? LIMITED_PRICE.ten : LIMITED_PRICE.one;
    try {
      if (!(free && isDevRef.current)) {
        const res = await u.child('gems').transaction((c: any) => (typeof c !== 'number' ? c : c >= cost ? c - cost : undefined));
        const val = res?.snapshot?.val();
        if (!res?.committed || typeof val !== 'number') return 'kurang';
        setGems(val);
      }
      const st = limitedRef.current;
      const owned = [...st.owned];
      const items = { ...st.items };
      let pity = st.pity;
      let refund = 0;
      let crystalGain = 0;
      const drops: LimitedDrop[] = [];
      for (let i = 0; i < n; i++) {
        const r = rollLimited(pity);
        pity = r.pity;
        const d: LimitedDrop = { ...r.item };
        if (d.outfit) {
          if (owned.includes(d.key)) { d.duplicate = true; d.refund = d.rarity === 'Mythic' ? DUP_REFUND.mythic : DUP_REFUND.legendary; refund += d.refund; }
          else owned.push(d.key);
        } else if (d.crystal) {
          crystalGain += d.crystal;
        } else {
          items[d.key] = (items[d.key] || 0) + d.qty;
        }
        drops.push(d);
      }
      limitedRef.current = { owned, pity, items };
      setLimited({ owned, pity });
      await u.child('fishing').update({ limited: { owned, pity, items } });
      if (refund > 0) {
        const res = await u.child('gems').transaction((c: any) => (typeof c === 'number' ? c : 0) + refund);
        const val = res?.snapshot?.val();
        if (typeof val === 'number') setGems(val);
      }
      if (crystalGain > 0) {
        const res = await u.child('koin').transaction((c: any) => (typeof c === 'number' ? c : 0) + crystalGain);
        const val = res?.snapshot?.val();
        if (typeof val === 'number') setCrystal(val);
      }
      return drops;
    } catch {
      return 'gagal';
    }
  }, []);

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

  // saldo diperbarui lagi saat kembali dari halaman pembayaran
  const refreshWallet = useCallback(async () => {
    const f = fb.current;
    if (!f || !uid.current) return;
    try {
      const v = (await f.db.ref('users/' + uid.current).get()).val() || {};
      setCrystal(typeof v.koin === 'number' ? v.koin : 0);
      setGems(typeof v.gems === 'number' ? v.gems : 0);
    } catch { /* abaikan */ }
  }, []);
  useEffect(() => {
    const h = () => { if (document.visibilityState === 'visible') refreshWallet(); };
    document.addEventListener('visibilitychange', h);
    window.addEventListener('focus', h);
    return () => { document.removeEventListener('visibilitychange', h); window.removeEventListener('focus', h); };
  }, [refreshWallet]);

  // top up: server membuat transaksi Midtrans, lalu kita arahkan ke halaman bayar
  const onTopUp = useCallback(async (currency: 'gems' | 'crystal', packId: string): Promise<string | void> => {
    try {
      const user = fb.current?.auth?.currentUser;
      if (!user) return 'Login dulu untuk top up';
      const token = await user.getIdToken();
      const res = await fetch('/api/topup/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ currency, packId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.redirectUrl) {
        if (res.status === 503) return isDevRef.current ? 'Server belum diatur: isi MIDTRANS_SERVER_KEY & FIREBASE_SERVICE_ACCOUNT di Vercel (lihat TOPUP_SETUP.txt)' : 'Top up belum aktif, coba lagi nanti';
        return data.error || 'Gagal membuat pembayaran';
      }
      window.location.href = data.redirectUrl;
    } catch { return 'Gagal membuat pembayaran'; }
  }, []);

  // balik dari halaman bayar (Midtrans menambah ?order_id=...): saldo masuk lewat webhook, jadi cek ulang beberapa kali
  useEffect(() => {
    if (typeof window === 'undefined' || !new URLSearchParams(window.location.search).get('order_id')) return;
    let n = 0;
    const timer = setInterval(() => { refreshWallet(); if (++n >= 8) clearInterval(timer); }, 3000);
    return () => clearInterval(timer);
  }, [refreshWallet]);

  const LABELS = ['Lagi bangunin pulaunya...', 'Nyambung ke pulau...', 'Baca peta pulau...', 'Lagi nyiapin pulau...', 'Masuk ke pulau...'];
  if (!ready || !shown) {
    const st = !boot ? 0 : ready ? 4 : stage;
    return <FishLoading pct={!boot ? 0 : ready ? 100 : pct} label={LABELS[st]} tips={st >= 1} />;
  }
  if (room === null) return <FishingLobby name={name} onPlay={(r) => { setRoom(r); setEnterPct(55); setEntering(true); }} />;

  return (
    <>
      <FishingGame
        name={name} photo={photo} crystal={crystal} gems={gems} onTopUp={onTopUp} onOpenLimited={onOpenLimited} limitedPity={limited.pity} limitedOwned={limited.owned} xp={xp} bag={bag}
        rods={rods} equippedRod={equippedRod} rodLv={rodLv} onUpgradeRod={onUpgradeRod} dev={isDev}
        onCatch={onCatch} onSetXp={onSetXp} outfit={outfit} onSaveOutfit={onSaveOutfit} onSell={onSell} onBuyRod={onBuyRod} onEquipRod={onEquipRod} onGacha={onGacha}
        room={room} pity={pity} starterClaimed={starter} onClaimStarter={onClaimStarter}
        onExit={() => router.push('/komikstore')}
      />
      {entering && <FishLoading pct={enterPct} label={LABELS[4]} tips sub={room === MAIN_ROOM ? 'Pulau Pemula' : islandName(room || MAIN_ROOM)} />}
      {err && <div className="fixed left-1/2 top-24 z-[80] -translate-x-1/2 rounded-full bg-rose-600 px-4 py-2 text-sm font-bold text-white">{err}</div>}
    </>
  );
}
