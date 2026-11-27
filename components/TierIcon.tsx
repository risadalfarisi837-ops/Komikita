// Ikon kecil per tier level (SVG ringan, tanpa gambar)
function Ingot({ top, front, hi, spark }: { top: string; front: string; hi: string; spark?: boolean }) {
  return (
    <>
      <path d="M3.5 15.5l2.6-6.2h11.8l2.6 6.2z" fill={top} />
      <path d="M3.5 15.5h17v3.2h-17z" fill={front} />
      <path d="M6.8 10.7h6" stroke={hi} strokeWidth="1" strokeLinecap="round" />
      {spark && <path d="M18 3.2l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" fill="#fff" />}
    </>
  );
}

export default function TierIcon({ k, size = 14 }: { k: string; size?: number }) {
  let g: React.ReactNode = null;
  switch (k) {
    case 'stone': g = (<><path d="M6.5 17.5L4.8 11l4-5.2 6.2.9 3.6 5-2.4 5z" fill="#2a2c32" stroke="#6a6f7c" strokeWidth="1.1" strokeLinejoin="round" /><path d="M8.8 5.8l2.6 5.2 6.2 1.1M11.4 11l-1.2 6.2" stroke="#4a4e59" strokeWidth=".9" fill="none" /></>); break;
    case 'bronze': g = <Ingot top="#e0904f" front="#9a5426" hi="#ffc58f" />; break;
    case 'silver': g = <Ingot top="#f1f4f8" front="#98a3b2" hi="#ffffff" />; break;
    case 'gold': g = <Ingot top="#ffd45a" front="#c8901a" hi="#fff3c4" spark />; break;
    case 'emerald': g = (<><path d="M12 2.8l5.2 4v10.4l-5.2 4-5.2-4V6.8z" fill="#22b865" stroke="#9af0c0" strokeWidth="1" strokeLinejoin="round" /><path d="M9.2 7.5l2.8-2.2 2.8 2.2v9l-2.8 2.2-2.8-2.2z" fill="#6ee7a4" opacity=".6" /></>); break;
    case 'diamond': g = (<><path d="M6.2 4.2h11.6L22 10l-10 11L2 10z" fill="#4cc3f0" stroke="#d6f3ff" strokeWidth="1" strokeLinejoin="round" /><path d="M2 10h20M9.2 4.2L7.4 10 12 21M14.8 4.2L16.6 10 12 21" stroke="#d6f3ff" strokeWidth=".8" fill="none" opacity=".85" /></>); break;
    case 'master': g = (<><circle cx="12" cy="12" r="7.2" fill="none" stroke="#9bd13c" strokeWidth="3.2" /><circle cx="12" cy="12" r="3" fill="#0c0f06" /><circle cx="10.8" cy="10.8" r="1" fill="#e6ff9a" opacity=".8" /></>); break;
    case 'mythic': g = (<><circle cx="12" cy="12" r="9.5" fill="#a68cff" opacity=".18" /><path d="M12 2.5c.9 5.2 3.9 8.4 9.5 9.5-5.6 1.1-8.6 4.3-9.5 9.5-.9-5.2-3.9-8.4-9.5-9.5 5.6-1.1 8.6-4.3 9.5-9.5z" fill="#fff" /></>); break;
    case 'ascendant': g = <path d="M4.5 12.8L12 6l7.5 6.8M4.5 18L12 11.2 19.5 18" fill="none" stroke="#ff6b7d" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />; break;
    case 'celestial': g = (<><ellipse cx="12" cy="5.4" rx="5" ry="1.7" fill="none" stroke="#ffe08a" strokeWidth="1.2" /><circle cx="12" cy="13.5" r="5" fill="#f5b83a" /><path d="M12 5.8v1.6M12 19.6v1.6M4.3 13.5h1.6M18.1 13.5h1.6M6.5 8l1.1 1.1M17.5 8l-1.1 1.1M6.5 19l1.1-1.1M17.5 19l-1.1-1.1" stroke="#ffd36b" strokeWidth="1.2" strokeLinecap="round" /><circle cx="10.7" cy="12.2" r="1.4" fill="#fff3c4" opacity=".8" /></>); break;
    case 'eternal': g = (<><path d="M7.5 3.5h9c0 4-3 5.2-4.5 8.5 1.5 3.3 4.5 4.5 4.5 8.5h-9c0-4 3-5.2 4.5-8.5C10.5 8.7 7.5 7.5 7.5 3.5z" fill="#2b2f55" stroke="#e8c46a" strokeWidth="1.2" strokeLinejoin="round" /><path d="M9.2 19.4c.8-2 4.8-2 5.6 0z" fill="#f0c860" /><path d="M12 12.3v3" stroke="#f0c860" strokeWidth=".9" /></>); break;
    case 'divine': g = (<><path d="M12 3.5l7 3.8v8.4l-7 3.8-7-3.8V7.3z" fill="#55d6e0" stroke="#d9fbff" strokeWidth="1" strokeLinejoin="round" /><path d="M12 3.5l7 3.8-7 3.8-7-3.8z" fill="#aef3f7" opacity=".7" /><path d="M12 11.1l7-3.8M12 11.1L5 7.3M12 11.1v8.4" stroke="#d9fbff" strokeWidth=".9" fill="none" /><path d="M19.5 2.4l.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6z" fill="#fff" /></>); break;
    case 'transcendent': g = (<><path d="M12 2.8l7.2 4.2v10L12 21.2 4.8 17V7z" fill="#e052b8" stroke="#ffc2ee" strokeWidth="1" strokeLinejoin="round" /><path d="M12 6.6l4 2.3v6.2l-4 2.3-4-2.3V8.9z" fill="#ff9be0" opacity=".7" /><path d="M12 2.8v3.8M12 17.4v3.8M4.8 7l3.2 1.9M16 15.1L19.2 17M19.2 7L16 8.9M8 15.1L4.8 17" stroke="#ffc2ee" strokeWidth=".7" /></>); break;
    case 'cosmic': g = (<><circle cx="12" cy="12" r="5.2" fill="#6a5cff" /><path d="M8 10.2c2-1.4 5-1.4 7.6 0" stroke="#a89dff" strokeWidth=".9" fill="none" /><ellipse cx="12" cy="12.5" rx="10" ry="3.4" transform="rotate(-22 12 12.5)" fill="none" stroke="#b9afff" strokeWidth="1.3" /></>); break;
    case 'infinity': g = <path d="M12 12c-1.6-2.6-3.2-3.8-5-3.8a3.8 3.8 0 000 7.6c1.8 0 3.4-1.2 5-3.8zm0 0c1.6 2.6 3.2 3.8 5 3.8a3.8 3.8 0 000-7.6c-1.8 0-3.4 1.2-5 3.8z" fill="none" stroke="#f0c860" strokeWidth="2" strokeLinejoin="round" />; break;
    case 'admin': g = <path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" fill="#f6d869" stroke="#b8902a" strokeWidth="1" strokeLinejoin="round" />; break;
    default: g = <circle cx="12" cy="12" r="6" fill="#888" />;
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden style={{ flex: `0 0 ${size}px`, display: 'block' }}>{g}</svg>;
}
