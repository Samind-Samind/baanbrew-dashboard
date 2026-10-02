import { formatBaht, formatNumber } from '../lib/format'

export default function KpiStrip({ data }) {
  const items = [
    { label: 'ยอดขายรวม', value: formatBaht(data.totalSales), note: `จาก ${formatNumber(data.rowCount)} รายการสินค้า`, lead: true },
    { label: 'จำนวนบิล', value: formatNumber(data.orderCount), note: 'นับ order_id ไม่ซ้ำ' },
    { label: 'ยอดเฉลี่ยต่อบิล', value: formatBaht(data.averageOrderValue), note: 'ยอดขายรวม ÷ จำนวนบิล' },
    { label: 'ลูกค้าสมาชิก', value: `${formatNumber(data.uniqueMembers)} คน`, note: 'ไม่นับลูกค้าทั่วไป' },
  ]

  return (
    <section
      aria-label="ตัวเลขสรุป"
      className="grid grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr] gap-px rounded-2xl bg-rule border border-rule overflow-hidden"
    >
      {items.map((item) => (
        <div
          key={item.label}
          className={`@container min-w-0 p-4 sm:p-6 ${item.lead ? 'bg-espresso text-paper' : 'bg-white'}`}
        >
          <p className={`text-xs sm:text-sm ${item.lead ? 'text-paper/70' : 'text-roast'}`}>{item.label}</p>
          <p className={`mt-2 font-semibold tabular-nums leading-tight [overflow-wrap:anywhere] ${
            item.lead ? 'text-[clamp(1.125rem,12cqi,3rem)]' : 'text-[clamp(1.125rem,11cqi,1.875rem)]'
          }`}>
            {item.value}
          </p>
          <p className={`mt-1.5 sm:mt-2 text-[11px] sm:text-xs leading-snug ${item.lead ? 'text-crema' : 'text-roast'}`}>{item.note}</p>
        </div>
      ))}
    </section>
  )
}
