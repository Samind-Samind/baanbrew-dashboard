import { formatMonthLong, formatNumber, formatPct } from '../lib/format'
import KpiCard from '../components/KpiCard'
import Icon from '../components/Icon'

function Group({ title, icon, items, columns }) {
  return (
    <section aria-label={title} className="space-y-2">
      <h2 className="flex items-center gap-1.5 text-sm font-medium text-roast"><Icon name={icon} size={16} />{title}</h2>
      <div className={`grid grid-cols-2 ${columns} gap-px rounded-2xl bg-rule border border-rule overflow-hidden`}>
        {items.map((item) => <KpiCard key={item.label} {...item} />)}
      </div>
    </section>
  )
}

export default function CustomerKpiCards({ data, grandTotal = null }) {
  const { kpis, total } = data
  const nc = kpis.newCustomers
  const change =
    nc.changePct === null
      ? 'ยังไม่มีเดือนก่อนหน้าให้เทียบ'
      : nc.changePct === 0
        ? `เท่ากับ ${formatMonthLong(nc.prevMonth)} (${formatNumber(nc.prevCount)} คน)`
        : `${nc.changePct > 0 ? '▲' : '▼'} ${formatPct(Math.abs(nc.changePct))} เทียบ ${formatMonthLong(nc.prevMonth)} (${formatNumber(nc.prevCount)} คน)`

  const growth = [
    { label: grandTotal ? 'ลูกค้าที่เลือก' : 'ลูกค้าทั้งหมด', value: `${formatNumber(total)} คน`, note: grandTotal ? `ตรงตัวกรอง จากทั้งหมด ${formatNumber(grandTotal)} คน` : 'นับ customer_id ไม่ซ้ำ', lead: true, icon: 'users', tone: 'lavender' },
    { label: `ลูกค้าใหม่ ${nc.month ? formatMonthLong(nc.month) : ''}`, value: `${formatNumber(nc.count)} คน`, note: change, icon: 'userPlus', tone: 'mint' },
    {
      label: 'ซื้อแล้วอย่างน้อย 1 ครั้ง',
      value: formatPct(kpis.boughtPct),
      note: `ยังไม่เคยซื้อ ${formatNumber(kpis.neverCount)} คน`,
      icon: 'bag',
      tone: 'peach',
    },
  ]

  const quality = [
    { label: 'เบอร์โทรซ้ำกับคนอื่น', value: formatPct(kpis.dupPct), note: `${formatNumber(kpis.dupCount)} คน อาจเป็นบัญชีซ้ำ`, icon: 'phone', tone: 'butter' },
    { label: 'อายุต่ำกว่า 18 ปี', value: formatPct(kpis.minorPct), note: `${formatNumber(kpis.minorCount)} คน ระวังเรื่อง PDPA และโปรโมชัน`, icon: 'shield', tone: 'rose' },
    {
      label: 'สาขาบ้านไม่ตรงสาขาที่ซื้อบ่อย',
      value: formatPct(kpis.mismatchPct),
      note: `${formatNumber(kpis.mismatchCount)} คน ควรอัปเดตสาขาบ้าน`,
      icon: 'pin',
      tone: 'sky',
    },
  ]

  return (
    <div className="space-y-4">
      <Group title="การเติบโตของฐานลูกค้า" icon="trend" items={growth} columns="lg:grid-cols-[1.4fr_1fr_1fr] [&>*:first-child]:col-span-2 lg:[&>*:first-child]:col-span-1" />
      <Group title="คุณภาพข้อมูลและความเสี่ยง" icon="shield" items={quality} columns="lg:grid-cols-3 [&>*:last-child]:col-span-2 lg:[&>*:last-child]:col-span-1" />
    </div>
  )
}
