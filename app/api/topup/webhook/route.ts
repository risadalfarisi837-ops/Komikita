import { NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'crypto';
import { adminDb } from '@/lib/firebase-admin';
import { WALLET_FIELD } from '@/lib/topupPacks';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ok = (extra: Record<string, unknown> = {}) => NextResponse.json({ ok: true, ...extra });

// Notifikasi pembayaran dari Midtrans. Saldo ditambah di sini, SEKALI saja per order.
export async function POST(req: Request) {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey) return NextResponse.json({ error: 'not configured' }, { status: 503 });

  const n: any = await req.json().catch(() => null);
  if (!n || typeof n.order_id !== 'string') return NextResponse.json({ error: 'bad request' }, { status: 400 });

  // 1) cek tanda tangan Midtrans
  const expect = createHash('sha512').update(String(n.order_id) + String(n.status_code) + String(n.gross_amount) + serverKey).digest('hex');
  const got = String(n.signature_key || '');
  if (got.length !== expect.length || !timingSafeEqual(Buffer.from(got), Buffer.from(expect))) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 403 });
  }

  try {
    const db = adminDb();
    const ref = db.ref('topups/' + n.order_id);
    const snap = await ref.get();
    if (!snap.exists()) return ok({ ignored: true }); // mis. tombol "test notification" Midtrans
    const order = snap.val();

    // 2) nominal harus sama dengan yang kita simpan
    if (Number(n.gross_amount) !== Number(order.rupiah)) return NextResponse.json({ error: 'amount mismatch' }, { status: 400 });

    const status = String(n.transaction_status);
    const paid = status === 'settlement' || (status === 'capture' && n.fraud_status === 'accept');
    if (['deny', 'cancel', 'expire', 'failure'].includes(status)) {
      if (order.status === 'pending') await ref.update({ status: 'failed' });
      return ok();
    }
    if (!paid) return ok(); // masih pending

    // 3) tandai lunas sekali saja (transaksi atomik), baru tambah saldo
    const flip = await ref.transaction((cur: any) => {
      if (cur === null) return cur; // data belum ada di cache, server akan ulangi dengan data asli
      if (cur.status !== 'pending') return; // sudah diproses, batalkan
      return { ...cur, status: 'paid', paidAt: Date.now() };
    });
    if (!flip.committed || flip.snapshot.val()?.status !== 'paid') return ok({ already: true });

    const field = WALLET_FIELD[order.currency as 'gems' | 'crystal'];
    const total = Number(order.amount) + Number(order.bonus);
    if (!field || !Number.isFinite(total) || total <= 0) return NextResponse.json({ error: 'bad order' }, { status: 400 });
    try {
      await db.ref(`users/${order.uid}/${field}`).transaction((c: any) => (typeof c === 'number' ? c : 0) + total);
    } catch {
      await ref.update({ status: 'pending' }); // gagal tambah saldo: kembalikan supaya Midtrans mengirim ulang
      return NextResponse.json({ error: 'credit failed' }, { status: 500 });
    }
    return ok();
  } catch {
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
