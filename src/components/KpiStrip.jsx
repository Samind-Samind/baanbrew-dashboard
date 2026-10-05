import { formatBaht, formatNumber } from '../lib/format'
import KpiCard from './KpiCard'

export default function KpiStrip({ data }) {
  const items = [
    { label: 'ยอดขายรวม', value: formatBaht(data.totalSales), note: `จาก ${formatNumber(data.rowCount)} รายการสินค้า`, lead: true, icon: 'coins', tone: 'lavender' },
    { label: 'จำนวนบิล', value: formatNumber(data.orderCount), note: 'นับ order_id ไม่ซ้ำ', icon: 'receipt', tone: 'peach' },
    { label: 'ยอดเฉลี่ยต่อบิล', value: formatBaht(data.averageOrderValue), note: 'ยอดขายรวม ÷ จำนวนบิล', icon: 'calculator', tone: 'mint' },
    { label: 'ลูกค้าสมาชิก', value: `${formatNumber(data.uniqueMembers)} คน`, note: 'ไม่นับลูกค้าทั่วไป', icon: 'users', tone: 'rose' },
  ]

  return (
    <section
      aria-label="ตัวเลขสรุป"
      className="grid grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr] gap-px rounded-2xl bg-rule border border-rule overflow-hidden"
    >
      {items.map((item) => <KpiCard key={item.label} {...item} />)}
    </section>
  )
}
