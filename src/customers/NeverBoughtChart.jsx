import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import useIsMobile from '../hooks/useIsMobile'
import { formatMonthLong, formatMonthShort, formatNumber, formatPct } from '../lib/format'
import ChartShell, { LegendItem, TooltipBox } from './ChartShell'
import { AXIS } from './chartTheme'
import { CHART } from '../lib/theme'


const COLOR = CHART.rose

function CohortTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const { month, value, never, count, partial } = payload[0].payload
  return (
    <TooltipBox>
      <p className="text-paper/70">สมัคร{formatMonthLong(month)}{partial && ' · ข้อมูลไม่ครบเดือน'}</p>
      <p className="font-semibold tabular-nums">ยังไม่เคยซื้อ {value === null ? '–' : formatPct(value)}</p>
      <p className="tabular-nums text-paper/70">{formatNumber(never)} จาก {formatNumber(count)} คน</p>
    </TooltipBox>
  )
}

export default function NeverBoughtChart({ data, partialMonth }) {
  const isMobile = useIsMobile()
  const tickFont = isMobile ? 11 : 12
  const dot = { r: 3, fill: COLOR, strokeWidth: 0 }
  const activeDot = { r: 5, fill: CHART.cursor, stroke: '#fff', strokeWidth: 2 }

  return (
    <ChartShell
      title="% ลูกค้าที่ยังไม่เคยซื้อ แยกตามเดือนที่สมัคร"
      icon="clock"
      tone="rose"
      subtitle="ลูกค้าแต่ละรุ่นสมัครแล้วกลับมาซื้อจริงแค่ไหน"
      legend={partialMonth && (
        <>
          <LegendItem color={COLOR} label="เดือนที่ข้อมูลครบ" />
          <LegendItem color={COLOR} dashed label="ข้อมูลยังไม่ครบเดือน" />
        </>
      )}
      note="รุ่นที่เพิ่งสมัครจะมี % สูงเป็นธรรมดา เพราะยังมีเวลาซื้อน้อย ให้ดูว่าเส้นลดลงเมื่อเวลาผ่านไปหรือไม่ ไม่ใช่เทียบเดือนล่าสุดกับเดือนเก่าตรง ๆ"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: isMobile ? 4 : 12, left: isMobile ? -8 : 0, bottom: 0 }}>
          <CartesianGrid stroke={AXIS.grid} strokeDasharray="3 4" vertical={false} />
          <XAxis
            dataKey="month"
            tickFormatter={formatMonthShort}
            tick={{ fill: AXIS.tick, fontSize: tickFont }}
            tickLine={false}
            axisLine={{ stroke: AXIS.grid }}
            minTickGap={isMobile ? 16 : 24}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tickFormatter={(v) => `${v}%`}
            tick={{ fill: AXIS.tick, fontSize: tickFont }}
            tickLine={false}
            axisLine={false}
            width={44}
          />
          <Tooltip content={<CohortTooltip />} cursor={{ stroke: CHART.cursor, strokeWidth: 1 }} />
          <Line dataKey="partialRate" stroke={COLOR} strokeWidth={2} strokeDasharray="5 5" dot={dot} activeDot={activeDot} isAnimationActive={false} />
          <Line dataKey="rate" stroke={COLOR} strokeWidth={2.5} dot={dot} activeDot={activeDot} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </ChartShell>
  )
}
