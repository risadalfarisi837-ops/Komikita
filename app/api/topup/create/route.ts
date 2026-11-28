import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { findPack } from '@/lib/topupPacks';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });

// Buat transaksi untuk satu paket top up. Harga diambil dari server, bukan dari klien.
// Utama: QRIS langsung (Midtrans Core API) supaya kode QR tampil di game. Cadangan: halaman Midtrans Snap.
export async function POST(req: Request) {
  try {
    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    if (!serverKey) return json({ error: 'MIDTRANS_SERVER_KEY belum diisi di server', code: 'no_midtrans' }, 503);
    if (!process.env.FIREBASE_SERVICE_ACCOUNT) return json({ error: 'FIREBASE_SERVICE_ACCOUNT belum diisi di server', code: 'no_firebase_admin' }, 503);

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

    const prod = process.env.MIDTRANS_IS_PRODUCTION === 'true';
    const auth = 'Basic ' + Buffer.from(serverKey + ':').toString('base64');
    const headers = { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: auth };
    const label = `${(pack.amount + pack.bonus).toLocaleString('id-ID')} ${currency === 'gems' ? 'Gems' : 'Crystal'}`;
    const item_details = [{ id: pack.id, price: pack.rupiah, quantity: 1, name: label.slice(0, 50) }];

    // 1) QRIS langsung
    try {
      const coreBase = prod ? 'https://api.midtrans.com' : 'https://api.sandbox.midtrans.com';
      const qr = await fetch(`${coreBase}/v2/charge`, {
        method: 'POST', headers,
        body: JSON.stringify({ payment_type: 'qris', transaction_details: { order_id: orderId, gross_amount: pack.rupiah }, item_details, qris: { acquirer: 'gopay' } }),
      });
      const qd: any = await qr.json().catch(() => ({}));
      const qrUrl = Array.isArray(qd?.actions) ? qd.actions.find((a: any) => a?.name === 'generate-qr-code')?.url : '';
      if (qrUrl) {
        await ref.update({ method: 'qris' });
        return json({ orderId, qrUrl, qrString: qd.qr_string || '', expiresAt: qd.expiry_time || '', rupiah: pack.rupiah });
      }
    } catch { /* lanjut ke Snap */ }

    // 2) cadangan: halaman bayar Midtrans (Snap)
    const base = prod ? 'https://app.midtrans.com' : 'https://app.sandbox.midtrans.com';
    const res = await fetch(`${base}/snap/v1/transactions`, {
      method: 'POST', headers,
      body: JSON.stringify({
        transaction_details: { order_id: orderId, gross_amount: pack.rupiah }, item_details,
        callbacks: { finish: `${new URL(req.url).origin}/komikstore/mancing` },
      }),
    });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok || !data?.redirect_url) {
      await ref.update({ status: 'failed' });
      const msg = Array.isArray(data?.error_messages) ? String(data.error_messages[0]) : '';
      return json({ error: msg ? `Midtrans: ${msg}` : 'Gagal membuat pembayaran', code: 'midtrans_failed' }, 502);
    }
    return json({ orderId, redirectUrl: data.redirect_url });
  } catch {
    return json({ error: 'Terjadi kesalahan server', code: 'server' }, 500);
  }
}
