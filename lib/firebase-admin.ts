// Firebase Admin (server saja). Dipakai route /api/topup/*. Jangan di-import dari komponen klien.
import { cert, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';

const DEFAULT_DB_URL = 'https://komikita-11c46-default-rtdb.asia-southeast1.firebasedatabase.app';

function app() {
  if (getApps().length) return getApp();
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT belum diisi');
  return initializeApp({
    credential: cert(JSON.parse(raw)),
    databaseURL: process.env.FIREBASE_DATABASE_URL || DEFAULT_DB_URL,
  });
}

export const adminAuth = () => getAuth(app());
export const adminDb = () => getDatabase(app());
