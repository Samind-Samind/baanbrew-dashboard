import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import useIsMobile from '../hooks/useIsMobile'
import { formatBaht, formatBahtShort } from '../lib/format'
import { CHART } from '../lib/theme'
import { IconChip } from './Icon'

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

export default function BranchSalesChart({ data, selected = '' }) {
  // แท่งแนวนอน สาขาที่ขายดีที่สุดอยู่บนสุด
  const isMobile = useIsMobile()
  const height = Math.max(isMobile ? 180 : 220, data.length * (isMobile ? 44 : 52))

  return (
    <section className="rounded-2xl bg-white border border-rule p-4 sm:p-6">
      <div className="flex items-start gap-3">
      <IconChip name="store" tone="sky" size="sm" />
      <div>
      <h2 className="text-lg font-semibold">ยอดขายแยกสาขา</h2>
      <p className="text-sm text-roast">
        เรียงจากมากไปน้อย{selected && ` · เน้นสาขา${selected} ส่วนสาขาอื่นแสดงไว้เทียบ (ใช้ช่วงวันที่เดียวกัน)`}
      </p>
      </div>
      </div>
      <div className="mt-4" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: isMobile ? 64 : 96, left: isMobile ? 0 : 8, bottom: 0 }}>
            <CartesianGrid stroke={CHART.grid} strokeDasharray="3 4" horizontal={false} />
            {/* มือถือซ่อนแกนตัวเลข เพราะมีตัวเลขที่ปลายแท่งอยู่แล้ว */}
            <XAxis
              type="number"
              hide={isMobile}
              tickFormatter={formatBahtShort}
              tick={{ fill: CHART.tick, fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type="category"
              dataKey="branch"
              tick={{ fill: CHART.ink, fontSize: isMobile ? 12 : 14 }}
              tickLine={false}
              axisLine={false}
              width={isMobile ? 76 : 110}
            />
            <Tooltip content={<BranchTooltip />} cursor={{ fill: CHART.hoverFill }} />
            <Bar dataKey="sales" radius={[0, 6, 6, 0]} barSize={isMobile ? 22 : 28}>
              {data.map((entry, i) => (
                selected ? (
                  <Cell
                    key={entry.branch}
                    fill={entry.branch === selected ? CHART.primary : CHART.muted}
                  />
                ) : (
                  <Cell key={entry.branch} fill={i === 0 ? CHART.primary : CHART.primarySoft} />
                )
              ))}
              <LabelList
                dataKey="sales"
                position="right"
                formatter={formatBahtShort}
                style={{ fill: CHART.ink, fontSize: isMobile ? 11 : 13, fontVariantNumeric: 'tabular-nums' }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
