import { redirect } from 'next/navigation';

// Gacha ini sudah dihapus, arahkan ke Wallpaper
export default function Page() {
  redirect('/komikstore/gacha-wallpaper');
}
