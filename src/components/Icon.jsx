// ไอคอนเส้น (stroke) แบบเขียนเอง ไม่ต้องติดตั้งไลบรารีเพิ่ม · ใช้ตกแต่งการ์ดและหัวกราฟ
import { TONES } from '../lib/theme'

const PATHS = {
  coins: (
    <>
      <ellipse cx="9" cy="7" rx="6" ry="3" />
      <path d="M3 7v5c0 1.7 2.7 3 6 3s6-1.3 6-3V7" />
      <path d="M15 11.2c3.4.1 6 1.4 6 3v3.3c0 1.7-2.7 3-6 3-2 0-3.8-.5-4.9-1.3" />
    </>
  ),
  receipt: (
    <>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
      <path d="M9 8h6M9 12h6M9 16h3" />
    </>
  ),
  calculator: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2.5" />
      <path d="M8.5 7.5h7M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 16h.01M12 16h.01M15.5 16h.01" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.5-3.5 3.2-5.5 6.5-5.5s6 2 6.5 5.5" />
      <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c2 .7 3.2 2.5 3.5 5.2" />
    </>
  ),
  userPlus: (
    <>
      <circle cx="9.5" cy="8" r="3.5" />
      <path d="M3 20c.5-3.5 3.2-5.5 6.5-5.5s6 2 6.5 5.5" />
      <path d="M19 8v6M16 11h6" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 21c.6-4 3.6-6.5 7.5-6.5s6.9 2.5 7.5 6.5" />
    </>
  ),
  bag: (
    <>
      <path d="M5 8h14l-1.2 12.2H6.2z" />
      <path d="M9 10V6.5a3 3 0 0 1 6 0V10" />
    </>
  ),
  phone: (
    <>
      <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
      <path d="M11 18h2" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" />
      <path d="M12 8.5v3.5M12 15.5h.01" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </>
  ),
  trend: (
    <>
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M15 7h6v6" />
    </>
  ),
  repeat: (
    <>
      <path d="M17 2l3 3-3 3" />
      <path d="M4 11V9a4 4 0 0 1 4-4h12" />
      <path d="M7 22l-3-3 3-3" />
      <path d="M20 13v2a4 4 0 0 1-4 4H4" />
    </>
  ),
  store: (
    <>
      <path d="M4 9l1.5-5h13L20 9" />
      <path d="M4 9a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0" />
      <path d="M5 11.5V20h14v-8.5M10 20v-5h4v5" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  coffee: (
    <>
      <path d="M4 9h13v4.5a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6z" />
      <path d="M17 11h1.5a2.5 2.5 0 0 1 0 5H17" />
      <path d="M8 3.5c0 1.5 1 1.5 1 3M12 3.5c0 1.5 1 1.5 1 3" />
    </>
  ),
  sliders: (
    <>
      <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12" />
      <circle cx="16" cy="6" r="2" />
      <circle cx="10" cy="12" r="2" />
      <circle cx="18" cy="18" r="2" />
    </>
  ),
}

export default function Icon({ name, size = 20, className = '', strokeWidth = 1.8 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      {PATHS[name]}
    </svg>
  )
}

// ไอคอนในวงกลมพื้นสีพาสเทล
export function IconChip({ name, tone = 'lavender', size = 'md' }) {
  const t = TONES[tone] ?? TONES.lavender
  const box = size === 'sm' ? 'size-8' : 'size-10 sm:size-11'
  return (
    <span className={`inline-flex ${box} items-center justify-center rounded-full`} style={{ backgroundColor: t.bg, color: t.fg }}>
      <Icon name={name} size={size === 'sm' ? 16 : 20} />
    </span>
  )
}
