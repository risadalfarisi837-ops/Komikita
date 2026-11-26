// Daftar pulau (room) untuk lobi mancing.
// Data diambil dari path yang sama dengan lib/fishingNet.ts: fishingRoom/<room>/players/<uid>
// (pemain dianggap online kalau `t`-nya masih segar, aturan yang sama dengan fishingNet).

export const ISLAND_CAP = 20;
export const MAIN_ROOM = 'utama';

export type IslandTheme = 'pulau' | 'iblis' | 'society';

export interface IslandInfo {
  room: string;
  name: string;
  count: number;
  theme: IslandTheme;
}

const CODE_CHARS = 'abcdefghjkmnpqrstuvwxyz23456789';
const FRESH_MS = 20000; // sama dengan fishingNet

// Kode pulau: huruf kecil + angka, maksimal 6 karakter.
export function cleanCode(raw: string): string {
  return (raw || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 6);
}

export function newIslandCode(): string {
  let s = '';
  for (let i = 0; i < 5; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return s;
}

// Tema pulau ditentukan dari kode (konsisten untuk semua pemain): kebanyakan Pulau biasa.
export function themeOf(room: string): IslandTheme {
  if (room === MAIN_ROOM) return 'pulau';
  let h = 0;
  for (let i = 0; i < room.length; i++) h = (h * 31 + room.charCodeAt(i)) >>> 0;
  const m = h % 6;
  return m === 0 ? 'iblis' : m === 1 ? 'society' : 'pulau';
}

export function islandName(room: string): string {
  if (room === MAIN_ROOM) return 'Pulau Tengah Laut';
  const t = themeOf(room);
  return (t === 'iblis' ? 'Iblis ' : t === 'society' ? 'Society ' : 'Pulau ') + room.toUpperCase();
}

// Urutkan: belum penuh dulu, lalu paling ramai, lalu pulau utama.
export function sortIslands(list: IslandInfo[]): IslandInfo[] {
  return [...list].sort((a, b) => {
    const fa = a.count >= ISLAND_CAP ? 1 : 0;
    const fb = b.count >= ISLAND_CAP ? 1 : 0;
    if (fa !== fb) return fa - fb;
    if (a.count !== b.count) return b.count - a.count;
    if (a.room === MAIN_ROOM) return -1;
    if (b.room === MAIN_ROOM) return 1;
    return a.room < b.room ? -1 : 1;
  });
}

// "Main!": pulau paling ramai yang belum penuh; kalau semua penuh, pulau utama tetap dipakai.
export function pickQuickRoom(list: IslandInfo[]): string {
  const open = sortIslands(list).find((i) => i.count < ISLAND_CAP);
  return open ? open.room : MAIN_ROOM;
}

function toIslands(root: any, offset: number): IslandInfo[] {
  const now = Date.now() + offset;
  const out: IslandInfo[] = [];
  const seen = new Set<string>();
  for (const room of Object.keys(root || {})) {
    const players = root[room] && root[room].players;
    let count = 0;
    if (players && typeof players === 'object') {
      for (const id of Object.keys(players)) {
        const v = players[id];
        if (!v || typeof v.x !== 'number' || typeof v.y !== 'number') continue;
        if (now - (Number(v.t) || 0) > FRESH_MS) continue;
        count++;
      }
    }
    if (count === 0 && room !== MAIN_ROOM) continue; // pulau kosong tidak ditampilkan
    seen.add(room);
    out.push({ room, name: islandName(room), count, theme: themeOf(room) });
  }
  if (!seen.has(MAIN_ROOM)) out.push({ room: MAIN_ROOM, name: islandName(MAIN_ROOM), count: 0, theme: 'pulau' });
  return out;
}

async function serverOffset(db: any): Promise<number> {
  try {
    const s = await db.ref('.info/serverTimeOffset').once('value');
    return Number(s.val()) || 0;
  } catch {
    return 0;
  }
}

export async function readIslands(db: any): Promise<IslandInfo[]> {
  try {
    const [snap, offset] = await Promise.all([db.ref('fishingRoom').once('value'), serverOffset(db)]);
    return toIslands(snap.val(), offset);
  } catch {
    return toIslands({}, 0);
  }
}

// Pantau realtime. Mengembalikan fungsi untuk berhenti memantau.
export function watchIslands(db: any, cb: (list: IslandInfo[]) => void): () => void {
  const ref = db.ref('fishingRoom');
  let raw: any = {};
  let offset = 0;
  let alive = true;
  const emit = () => { if (alive) cb(toIslands(raw, offset)); };
  const onVal = (s: any) => { raw = s.val() || {}; emit(); };
  const onErr = () => { raw = {}; emit(); };
  ref.on('value', onVal, onErr);
  serverOffset(db).then((o) => { offset = o; emit(); });
  const tick = setInterval(emit, 5000); // buang pemain yang sudah lama diam
  return () => {
    alive = false;
    clearInterval(tick);
    ref.off('value', onVal);
  };
}
