import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import useIsMobile from '../hooks/useIsMobile'
import { formatBaht, formatBahtShort, formatFullDate, formatShortThaiDate } from '../lib/format'
import { CHART } from '../lib/theme'
import { IconChip } from './Icon'

const DAILY_COLOR = CHART.primary
const AVG_COLOR = CHART.accent

function DailyTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const { date, sales, avg7 } = payload[0].payload
  return (
    <div className="rounded-lg bg-espresso text-paper px-3 py-2 text-sm shadow-lg">
      <p className="text-paper/70">{formatFullDate(date)}</p>
      <p className="tabular-nums">ยอดขายวันนี้ {formatBaht(sales)}</p>
      <p className="font-semibold tabular-nums text-[#ffb59f]">
        เฉลี่ย 7 วัน {avg7 === null ? 'ข้อมูลยังไม่ครบ 7 วัน' : formatBaht(avg7)}
      </p>
    </div>
  )
}

function LegendItem({ color, opacity = 1, thick, label }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={`inline-block w-6 rounded-full ${thick ? 'h-1' : 'h-0.5'}`}
        style={{ backgroundColor: color, opacity }}
      />
      {label}
    </span>
  )
}

export default function DailySalesChart({ data }) {
  const isMobile = useIsMobile()
  const tickFont = isMobile ? 11 : 12

  return (
    <section className="rounded-2xl bg-white border border-rule p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-start gap-3">
          <IconChip name="trend" tone="lavender" size="sm" />
          <div>
            <h2 className="text-lg font-semibold">ยอดขายรายวัน</h2>
            <p className="text-sm text-roast">เส้นสีปะการังคือค่าเฉลี่ยย้อนหลัง 7 วัน ช่วยให้เห็นแนวโน้มชัดขึ้น</p>
          </div>
        </div>
        <div className="flex gap-4 text-xs sm:text-sm text-roast">
          <LegendItem color={DAILY_COLOR} opacity={0.35} label="ยอดขายรายวัน" />
          <LegendItem color={AVG_COLOR} thick label="เฉลี่ย 7 วัน" />
        </div>
      </div>

      <div className="mt-4 h-60 sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: isMobile ? 4 : 12, left: isMobile ? 0 : 8, bottom: 0 }}>
            <CartesianGrid stroke={CHART.grid} strokeDasharray="3 4" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={formatShortThaiDate}
              tick={{ fill: CHART.tick, fontSize: tickFont }}
              tickLine={false}
              axisLine={{ stroke: CHART.grid }}
              minTickGap={isMobile ? 20 : 32}
            />
            <YAxis
              tickFormatter={formatBahtShort}
              tick={{ fill: CHART.tick, fontSize: tickFont }}
              tickLine={false}
              axisLine={false}
              width={isMobile ? 58 : 80}
            />
            <Tooltip content={<DailyTooltip />} cursor={{ stroke: CHART.cursor, strokeWidth: 1 }} />
            {/* เส้นรายวัน: บางและจาง เป็นพื้นหลัง */}
            <Line
              type="linear"
              dataKey="sales"
              name="ยอดขายรายวัน"
              stroke={DAILY_COLOR}
              strokeOpacity={0.35}
              strokeWidth={1.25}
              dot={false}
              activeDot={{ r: 3, fill: DAILY_COLOR, strokeWidth: 0 }}
              isAnimationActive={false}
            />
            {/* เส้นค่าเฉลี่ย 7 วัน: หนาและเข้ม วาดทีหลังจึงอยู่ด้านบน */}
            <Line
              type="monotone"
              dataKey="avg7"
              name="เฉลี่ย 7 วัน"
              stroke={AVG_COLOR}
              strokeWidth={3}
              dot={false}
              connectNulls={false}
              activeDot={{ r: 5, fill: CHART.cursor, stroke: '#fff', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
