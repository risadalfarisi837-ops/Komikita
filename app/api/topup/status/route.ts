import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { settleOrder } from '@/lib/topupSettle';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });

// Dicek dari game setiap beberapa detik setelah QRIS tampil. Menanyakan status ke Midtrans lalu menambah saldo
// kalau sudah lunas, jadi top up tetap masuk walau URL webhook belum diatur.
export async function GET(req: Request) {
  try {
    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    if (!serverKey || !process.env.FIREBASE_SERVICE_ACCOUNT) return json({ error: 'Server belum dikonfigurasi' }, 503);
    const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    let uid = '';
    try { uid = (await adminAuth().verifyIdToken(token)).uid; } catch { return json({ error: 'Sesi login tidak valid' }, 401); }

    const orderId = new URL(req.url).searchParams.get('orderId') || '';
    if (!/^TU-[a-z0-9-]+$/i.test(orderId)) return json({ error: 'Order tidak valid' }, 400);

    const db = adminDb();
    const snap = await db.ref('topups/' + orderId).get();
    if (!snap.exists() || snap.val()?.uid !== uid) return json({ error: 'Order tidak ditemukan' }, 404);
    const cur = snap.val();
    if (cur.status === 'paid' || cur.status === 'failed') return json({ status: cur.status });

    const base = process.env.MIDTRANS_IS_PRODUCTION === 'true' ? 'https://api.midtrans.com' : 'https://api.sandbox.midtrans.com';
    const res = await fetch(`${base}/v2/${encodeURIComponent(orderId)}/status`, {
      headers: { Accept: 'application/json', Authorization: 'Basic ' + Buffer.from(serverKey + ':').toString('base64') },
    });
    const n: any = await res.json().catch(() => null);
    if (!n || n.transaction_status == null) return json({ status: 'pending' });
    const r = await settleOrder(db, orderId, n);
    return json({ status: r.status });
  } catch {
    return json({ status: 'pending' });
  }
}
