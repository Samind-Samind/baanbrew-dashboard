import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import useIsMobile from '../hooks/useIsMobile'
import { formatMonthLong, formatMonthShort, formatNumber } from '../lib/format'
import ChartShell, { LegendItem, TooltipBox } from './ChartShell'
import { AXIS } from './chartTheme'
import { CHART } from '../lib/theme'


const COLOR = CHART.primary

function NewTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const { month, value, cumulative, partial } = payload[0].payload
  return (
    <TooltipBox>
      <p className="text-paper/70">{formatMonthLong(month)}{partial && ' · ข้อมูลไม่ครบเดือน'}</p>
      <p className="font-semibold tabular-nums">สมัครใหม่ {formatNumber(value)} คน</p>
      <p className="tabular-nums text-paper/70">สะสมถึงเดือนนี้ {formatNumber(cumulative)} คน</p>
    </TooltipBox>
  )
}

export default function NewCustomersChart({ data, partialMonth, lastDate }) {
  const isMobile = useIsMobile()
  const tickFont = isMobile ? 11 : 12
  const dot = { r: 3, fill: COLOR, strokeWidth: 0 }
  const activeDot = { r: 5, fill: CHART.cursor, stroke: '#fff', strokeWidth: 2 }

  return (
    <ChartShell
      title="ลูกค้าใหม่รายเดือน"
      icon="userPlus"
      tone="lavender"
      subtitle="นับจากวันที่สมัคร (joined_date) · ชี้ที่จุดเพื่อดูยอดสะสม"
      legend={partialMonth && (
        <>
          <LegendItem color={COLOR} label="เดือนที่ข้อมูลครบ" />
          <LegendItem color={COLOR} dashed label="ข้อมูลยังไม่ครบเดือน" />
        </>
      )}
      note={partialMonth && `${formatMonthLong(partialMonth)} มีข้อมูลถึงวันที่ ${Number(lastDate.slice(8))} เท่านั้น ยอดจึงต่ำกว่าเดือนอื่น`}
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
            tickFormatter={formatNumber}
            tick={{ fill: AXIS.tick, fontSize: tickFont }}
            tickLine={false}
            axisLine={false}
            width={44}
          />
          <Tooltip content={<NewTooltip />} cursor={{ stroke: CHART.cursor, strokeWidth: 1 }} />
          <Line dataKey="partialCount" stroke={COLOR} strokeWidth={2} strokeDasharray="5 5" dot={dot} activeDot={activeDot} isAnimationActive={false} />
          <Line dataKey="count" stroke={COLOR} strokeWidth={2.5} dot={dot} activeDot={activeDot} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </ChartShell>
  )
}
