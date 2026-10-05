// การ์ดตัวเลขสรุป ใช้ร่วมกันทั้งแท็บ Dashboard และแท็บลูกค้า
import { IconChip } from './Icon'

export default function KpiCard({ label, value, note, lead, icon, tone }) {
  return (
    <div
      className={`@container min-w-0 p-4 sm:p-6 ${
        lead ? 'bg-[linear-gradient(135deg,#ebe6fc_0%,#f7e8f3_55%,#fde8dc_100%)]' : 'bg-white'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs sm:text-sm text-roast">{label}</p>
        {icon && <IconChip name={icon} tone={tone} size={lead ? 'md' : 'sm'} />}
      </div>
      <p
        className={`mt-1 font-semibold tabular-nums leading-tight text-espresso [overflow-wrap:anywhere] ${
          lead ? 'text-[clamp(1.125rem,12cqi,3rem)]' : 'text-[clamp(1.125rem,11cqi,1.875rem)]'
        }`}
      >
        {value}
      </p>
      <p className={`mt-1.5 sm:mt-2 text-[11px] sm:text-xs leading-snug ${lead ? 'text-[#5b52b5]' : 'text-roast'}`}>{note}</p>
    </div>
  )
}
