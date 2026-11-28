// Menandai order top up lunas dan menambah saldo SEKALI saja. Dipakai webhook Midtrans dan cek status dari game.
import { WALLET_FIELD } from '@/lib/topupPacks';

export type SettleStatus = 'paid' | 'failed' | 'pending';

export async function settleOrder(db: any, orderId: string, n: any): Promise<{ status: SettleStatus; http?: number; error?: string }> {
  const ref = db.ref('topups/' + orderId);
  const snap = await ref.get();
  if (!snap.exists()) return { status: 'pending' };
  const order = snap.val();
  if (order.status === 'paid') return { status: 'paid' };
  if (order.status === 'failed') return { status: 'failed' };

  // nominal harus sama dengan yang kita simpan
  if (n?.gross_amount != null && Number(n.gross_amount) !== Number(order.rupiah)) return { status: 'pending', http: 400, error: 'amount mismatch' };

  const status = String(n?.transaction_status || '');
  const paid = status === 'settlement' || (status === 'capture' && n.fraud_status === 'accept');
  if (['deny', 'cancel', 'expire', 'failure'].includes(status)) {
    await ref.update({ status: 'failed' });
    return { status: 'failed' };
  }
  if (!paid) return { status: 'pending' };

  // tandai lunas sekali saja (transaksi atomik), baru tambah saldo
  const flip = await ref.transaction((cur: any) => {
    if (cur === null) return cur;
    if (cur.status !== 'pending') return; // sudah diproses, batalkan
    return { ...cur, status: 'paid', paidAt: Date.now() };
  });
  if (!flip.committed || flip.snapshot.val()?.status !== 'paid') return { status: 'paid' }; // sudah diproses di tempat lain

  const field = WALLET_FIELD[order.currency as 'gems' | 'crystal'];
  const total = Number(order.amount) + Number(order.bonus);
  if (!field || !Number.isFinite(total) || total <= 0) return { status: 'pending', http: 400, error: 'bad order' };
  try {
    await db.ref(`users/${order.uid}/${field}`).transaction((c: any) => (typeof c === 'number' ? c : 0) + total);
  } catch {
    await ref.update({ status: 'pending' }); // gagal tambah saldo: kembalikan supaya bisa dicoba lagi
    return { status: 'pending', http: 500, error: 'credit failed' };
  }
  return { status: 'paid' };
}
