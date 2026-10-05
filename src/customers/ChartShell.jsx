// กรอบมาตรฐานของกราฟในหน้าลูกค้า: ไอคอน หัวข้อ คำอธิบาย legend และหมายเหตุใต้กราฟ
import { IconChip } from '../components/Icon'

export function LegendItem({ color, dashed, label }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg width="24" height="4" aria-hidden="true">
        <line x1="1" y1="2" x2="23" y2="2" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeDasharray={dashed ? '4 4' : undefined} />
      </svg>
      {label}
    </span>
  )
}

export default function ChartShell({ title, subtitle, legend, note, children, icon, tone, height = 'h-60 sm:h-72' }) {
  return (
    <section className="rounded-2xl bg-white border border-rule p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-start gap-3">
          {icon && <IconChip name={icon} tone={tone} size="sm" />}
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            {subtitle && <p className="text-sm text-roast">{subtitle}</p>}
          </div>
        </div>
        {legend && <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs sm:text-sm text-roast">{legend}</div>}
      </div>
      <div className={`mt-4 ${height}`}>{children}</div>
      {note && <p className="mt-3 text-xs sm:text-sm text-roast">{note}</p>}
    </section>
  )
}

export function TooltipBox({ children }) {
  return <div className="rounded-lg bg-espresso text-paper px-3 py-2 text-sm shadow-lg space-y-0.5">{children}</div>
}
