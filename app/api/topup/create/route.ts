import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { findPack } from '@/lib/topupPacks';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });

// Buat transaksi Midtrans Snap untuk satu paket top up. Harga diambil dari server, bukan dari klien.
export async function POST(req: Request) {
  try {
    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    if (!serverKey) return json({ error: 'Pembayaran belum dikonfigurasi' }, 503);

    const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    if (!token) return json({ error: 'Belum login' }, 401);
    let uid = '';
    try { uid = (await adminAuth().verifyIdToken(token)).uid; } catch { return json({ error: 'Sesi login tidak valid' }, 401); }

    const body: any = await req.json().catch(() => ({}));
    const pack = findPack(body?.currency, body?.packId);
    if (!pack) return json({ error: 'Paket tidak ditemukan' }, 400);
    const currency = body.currency as 'gems' | 'crystal';

    const orderId = `TU-${Date.now().toString(36)}-${randomBytes(4).toString('hex')}`;
    const ref = adminDb().ref('topups/' + orderId);
    await ref.set({ uid, currency, packId: pack.id, amount: pack.amount, bonus: pack.bonus, rupiah: pack.rupiah, status: 'pending', createdAt: Date.now() });

    const base = process.env.MIDTRANS_IS_PRODUCTION === 'true' ? 'https://app.midtrans.com' : 'https://app.sandbox.midtrans.com';
    const label = `${(pack.amount + pack.bonus).toLocaleString('id-ID')} ${currency === 'gems' ? 'Gems' : 'Crystal'}`;
    const res = await fetch(`${base}/snap/v1/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: 'Basic ' + Buffer.from(serverKey + ':').toString('base64') },
      body: JSON.stringify({
        transaction_details: { order_id: orderId, gross_amount: pack.rupiah },
        item_details: [{ id: pack.id, price: pack.rupiah, quantity: 1, name: label.slice(0, 50) }],
        callbacks: { finish: `${new URL(req.url).origin}/komikstore/mancing` },
      }),
    });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok || !data?.redirect_url) {
      await ref.update({ status: 'failed' });
      return json({ error: 'Gagal membuat pembayaran' }, 502);
    }
    return json({ orderId, redirectUrl: data.redirect_url });
  } catch {
    return json({ error: 'Terjadi kesalahan server' }, 500);
  }
}
