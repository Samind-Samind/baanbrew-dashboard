// ตัวกรองที่ใช้ร่วมกันทั้งแท็บ Dashboard และแท็บลูกค้า
import Icon from './Icon'

const control =
  'h-10 rounded-lg border border-rule bg-white px-3 text-sm text-espresso tabular-nums focus:outline-none focus:ring-2 focus:ring-crema'

export function FilterBar({ children, summary, onReset, canReset }) {
  return (
    <section aria-label="ตัวกรองข้อมูล" className="rounded-2xl bg-white border border-rule p-4 sm:p-5">
      <p className="mb-3 flex items-center gap-1.5 text-sm font-medium text-espresso">
        <Icon name="sliders" size={16} className="text-[#5b52b5]" />
        ตัวกรอง
      </p>
      <div className="flex flex-wrap items-end gap-3 sm:gap-4">{children}</div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-roast">
        <p aria-live="polite">{summary}</p>
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            disabled={!canReset}
            className="rounded-full px-3 py-1 font-medium text-espresso ring-1 ring-rule hover:bg-paper disabled:opacity-40 disabled:hover:bg-transparent"
          >
            ล้างตัวกรอง
          </button>
        )}
      </div>
    </section>
  )
}

export function SelectFilter({ label, value, onChange, options, allLabel, disabled = false }) {
  return (
    <label className="flex min-w-[9rem] flex-col gap-1 text-xs font-medium text-roast">
      {label}
      <select className={`${control} disabled:bg-paper disabled:text-roast`} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
        {allLabel && <option value="">{allLabel}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  )
}

// ช่วงวันที่ (YYYY-MM-DD) พร้อมปุ่มลัด เช่น 30 วันล่าสุด
export function DateRangeFilter({ from, to, min, max, onChange, presets = [] }) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-xs font-medium text-roast">
        ตั้งแต่วันที่
        <input
          type="date"
          className={control}
          value={from}
          min={min}
          max={to || max}
          onChange={(e) => e.target.value && onChange({ from: e.target.value, to })}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-roast">
        ถึงวันที่
        <input
          type="date"
          className={control}
          value={to}
          min={from || min}
          max={max}
          onChange={(e) => e.target.value && onChange({ from, to: e.target.value })}
        />
      </label>
      {presets.length > 0 && (
        <div role="group" aria-label="ช่วงเวลาลัด" className="flex flex-wrap gap-1.5">
          {presets.map((p) => {
            const active = p.from === from && p.to === to
            return (
              <button
                key={p.label}
                type="button"
                aria-pressed={active}
                onClick={() => onChange({ from: p.from, to: p.to })}
                className={`h-10 rounded-full px-3 text-sm font-medium ${
                  active ? 'bg-espresso text-paper' : 'bg-white text-espresso ring-1 ring-rule hover:bg-paper'
                }`}
              >
                {p.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ช่วงเดือน (YYYY-MM) เลือกจากรายการเดือนที่มีข้อมูล
export function MonthRangeFilter({ from, to, months, format, onChange, label = 'เดือน' }) {
  const opts = (list) => list.map((m) => <option key={m} value={m}>{format(m)}</option>)
  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-xs font-medium text-roast">
        {label}ตั้งแต่
        <select className={control} value={from} onChange={(e) => onChange({ from: e.target.value, to })}>
          {opts(months.filter((m) => m <= to))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-roast">
        ถึง
        <select className={control} value={to} onChange={(e) => onChange({ from, to: e.target.value })}>
          {opts(months.filter((m) => m >= from))}
        </select>
      </label>
    </div>
  )
}
