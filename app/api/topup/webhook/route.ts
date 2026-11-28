import { NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'crypto';
import { adminDb } from '@/lib/firebase-admin';
import { settleOrder } from '@/lib/topupSettle';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Notifikasi pembayaran dari Midtrans. Saldo ditambah sekali saja per order (lihat lib/topupSettle.ts).
export async function POST(req: Request) {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey) return NextResponse.json({ error: 'not configured' }, { status: 503 });

  const n: any = await req.json().catch(() => null);
  if (!n || typeof n.order_id !== 'string') return NextResponse.json({ error: 'bad request' }, { status: 400 });

  // cek tanda tangan Midtrans
  const expect = createHash('sha512').update(String(n.order_id) + String(n.status_code) + String(n.gross_amount) + serverKey).digest('hex');
  const got = String(n.signature_key || '');
  if (got.length !== expect.length || !timingSafeEqual(Buffer.from(got), Buffer.from(expect))) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 403 });
  }

  try {
    const r = await settleOrder(adminDb(), n.order_id, n);
    if (r.http && r.error) return NextResponse.json({ error: r.error }, { status: r.http });
    return NextResponse.json({ ok: true, status: r.status });
  } catch {
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
