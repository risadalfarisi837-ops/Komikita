// Menetapkan ID urut (1, 2, 3, ...) untuk akun yang login, sekali per akun, lewat
// counter bersama di meta/userIdCounter. Dipanggil saat akun login; aman dipanggil
// berkali-kali (kalau sudah punya shortId, langsung dikembalikan tanpa menulis lagi).
export async function ensureShortId(db: any, uid: string): Promise<number | null> {
  try {
    const ref = db.ref(`users/${uid}/shortId`);
    const existing = (await ref.get()).val();
    if (existing) return Number(existing);
    const counterRef = db.ref('meta/userIdCounter');
    const tx = await counterRef.transaction((cur: number) => (Number(cur) || 0) + 1);
    if (!tx.committed) return null;
    const n = Number(tx.snapshot.val());
    await ref.set(n);
    return n;
  } catch {
    return null;
  }
}
