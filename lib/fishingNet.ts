export interface NetPose {
  x: number;
  y: number;
  facing?: number;
  moving?: boolean;
  step?: number;
  [key: string]: any;
}

export interface RemotePlayer {
  id: string;
  name?: string;
  x?: number;
  y?: number;
  facing?: number;
  moving?: boolean;
  step?: number;
  [key: string]: any;
}

// ---------- mabar: satu ruangan untuk semua pemain (Firebase Realtime Database) ----------
export interface NetChat { uid: string; who: string; msg: string; t: number; mine: boolean }
export interface NetOptions {
  db: any;
  uid: string;
  room?: string;
  getSelf: () => { name: string; level: number; rodId: string; outfit?: string };
  getPose: () => NetPose | null;
  onPlayers: (list: RemotePlayer[]) => void;
  onChat: (m: NetChat) => void;
  onOffset: (ms: number) => void;
}

export function startFishingNet(o: NetOptions): { stop: () => void; send: (msg: string) => void } {
  const base = o.db.ref('fishingRoom/' + (o.room || 'utama'));
  const me = base.child('players/' + o.uid);
  const SV = (window as any).firebase.database.ServerValue.TIMESTAMP;
  let offset = 0;
  let raw: Record<string, any> = {};
  let lastKey = '';
  let lastSent = 0;
  let lastChat = 0;
  const joined = Date.now();
  let alive = true;

  me.onDisconnect().remove();

  const offRef = o.db.ref('.info/serverTimeOffset');
  const onOff = (s: any) => { offset = Number(s.val()) || 0; o.onOffset(offset); };
  offRef.on('value', onOff);

  const emit = () => {
    const now = Date.now() + offset;
    const list: RemotePlayer[] = [];
    for (const id of Object.keys(raw)) {
      if (id === o.uid) continue;
      const v = raw[id];
      if (!v || typeof v.x !== 'number' || typeof v.y !== 'number') continue;
      if (now - (Number(v.t) || 0) > 30000) continue;
      list.push({ id, name: String(v.name || 'Tamu').slice(0, 20), level: Number(v.level) || 1, ...v });
    }
    o.onPlayers(list);
  };
  const playersRef = base.child('players');
  const onPlayers = (s: any) => { raw = s.val() || {}; emit(); };
  playersRef.on('value', onPlayers);
  const reEmit = setInterval(emit, 5000);

  const chatQ = base.child('chat').limitToLast(20);
  const onChat = (s: any) => {
    const v = s.val();
    if (!v || typeof v.msg !== 'string') return;
    const t = Number(v.t) || Date.now();
    if (t < joined + offset - 20000) return; // lewati pesan lama
    o.onChat({ uid: String(v.uid || ''), who: String(v.name || 'Tamu').slice(0, 20), msg: v.msg.slice(0, 80), t, mine: v.uid === o.uid });
  };
  chatQ.on('child_added', onChat);

  const pub = setInterval(() => {
    if (!alive) return;
    const pose = o.getPose();
    if (!pose) return;
    const key = [Math.round(pose.x), Math.round(pose.y), pose.dir, pose.moving ? 1 : 0, pose.casting ? 1 : 0, pose.held ? pose.held.s : '', Math.round(pose.bx || 0), Math.round(pose.by || 0)].join('|');
    const now = Date.now();
    if (key === lastKey && now - lastSent < 2500) return;
    lastKey = key;
    lastSent = now;
    const self = o.getSelf();
    const data: any = { x: Math.round(pose.x * 10) / 10, y: Math.round(pose.y * 10) / 10, dir: pose.dir || 'down', moving: !!pose.moving, casting: !!pose.casting, bx: Math.round(pose.bx || 0), by: Math.round(pose.by || 0), name: self.name, level: self.level, rodId: self.rodId, t: SV };
    if (pose.held) data.held = pose.held;
    if (self.outfit) data.o = self.outfit; // gaya karakter dari Lemari
    me.set(data).catch(() => {});
  }, 150);

  return {
    send(msg: string) {
      const text = msg.trim().slice(0, 80);
      const now = Date.now();
      if (!text || now - lastChat < 1000) return;
      lastChat = now;
      base.child('chat').push({ uid: o.uid, name: o.getSelf().name, msg: text, t: SV }).catch(() => {});
    },
    stop() {
      alive = false;
      clearInterval(pub);
      clearInterval(reEmit);
      offRef.off('value', onOff);
      playersRef.off('value', onPlayers);
      chatQ.off('child_added', onChat);
      me.onDisconnect().cancel();
      me.remove().catch(() => {});
    },
  };
}
