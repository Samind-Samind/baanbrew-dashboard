import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import useIsMobile from '../hooks/useIsMobile'
import { formatBaht, formatBahtShort } from '../lib/format'

function BranchTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const { branch, sales } = payload[0].payload
  return (
    <div className="rounded-lg bg-espresso text-paper px-3 py-2 text-sm shadow-lg">
      <p className="text-paper/70">{branch}</p>
      <p className="font-semibold tabular-nums">{formatBaht(sales)}</p>
    </div>
  )
}

export default function BranchSalesChart({ data }) {
  // แท่งแนวนอน สาขาที่ขายดีที่สุดอยู่บนสุด
  const isMobile = useIsMobile()
  const height = Math.max(isMobile ? 180 : 220, data.length * (isMobile ? 44 : 52))

  return (
    <section className="rounded-2xl bg-white border border-rule p-4 sm:p-6">
      <h2 className="text-lg font-semibold">ยอดขายแยกสาขา</h2>
      <p className="text-sm text-roast">เรียงจากมากไปน้อย</p>
      <div className="mt-4" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: isMobile ? 64 : 96, left: isMobile ? 0 : 8, bottom: 0 }}>
            <CartesianGrid stroke="#dcddd6" strokeDasharray="3 4" horizontal={false} />
            {/* มือถือซ่อนแกนตัวเลข เพราะมีตัวเลขที่ปลายแท่งอยู่แล้ว */}
            <XAxis
              type="number"
              hide={isMobile}
              tickFormatter={formatBahtShort}
              tick={{ fill: '#6e6a64', fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type="category"
              dataKey="branch"
              tick={{ fill: '#2a1f1a', fontSize: isMobile ? 12 : 14 }}
              tickLine={false}
              axisLine={false}
              width={isMobile ? 76 : 110}
            />
            <Tooltip content={<BranchTooltip />} cursor={{ fill: '#f3f4f0' }} />
            <Bar dataKey="sales" radius={[0, 6, 6, 0]} barSize={isMobile ? 22 : 28}>
              {data.map((entry, i) => (
                <Cell key={entry.branch} fill={i === 0 ? '#2f6b4f' : '#2a1f1a'} fillOpacity={i === 0 ? 1 : 0.78} />
              ))}
              <LabelList
                dataKey="sales"
                position="right"
                formatter={formatBahtShort}
                style={{ fill: '#2a1f1a', fontSize: isMobile ? 11 : 13, fontVariantNumeric: 'tabular-nums' }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
