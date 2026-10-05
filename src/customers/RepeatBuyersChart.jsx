import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import useIsMobile from '../hooks/useIsMobile'
import { formatMonthLong, formatMonthShort, formatNumber, formatPct } from '../lib/format'
import ChartShell, { TooltipBox } from './ChartShell'
import { AXIS } from './chartTheme'
import { CHART } from '../lib/theme'


// ลูกค้าเก่า = ฐานแท่ง (สีเข้ม) เพราะเป็นตัวเลขหลักที่อยากให้อ่าน · ซื้อครั้งแรก = ส่วนบน
const RETURNING = CHART.primary
const FIRST_TIME = CHART.secondary

function Swatch({ color, faded, label }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="inline-block size-3 rounded-sm" style={{ backgroundColor: color, opacity: faded ? 0.4 : 1 }} />
      {label}
    </span>
  )
}

function RepeatTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const { month, returning, firstTime, total, returningPct, partial } = payload[0].payload
  return (
    <TooltipBox>
      <p className="text-paper/70">{formatMonthLong(month)}{partial && ' · ข้อมูลไม่ครบเดือน'}</p>
      <p className="tabular-nums">สมาชิกที่ซื้อ {formatNumber(total)} คน</p>
      <p className="font-semibold tabular-nums">
        ลูกค้าเก่ากลับมาซื้อ {formatNumber(returning)} คน{returningPct !== null && ` (${formatPct(returningPct)})`}
      </p>
      <p className="tabular-nums text-crema">ซื้อครั้งแรก {formatNumber(firstTime)} คน</p>
    </TooltipBox>
  )
}

export default function RepeatBuyersChart({ data, salesEnd }) {
  const isMobile = useIsMobile()
  const tickFont = isMobile ? 11 : 12
  const partial = data.find((d) => d.partial)
  // เดือนล่าสุดที่ครบเดือน ใช้เป็นตัวเลขสรุปบนหัวกราฟ
  const latest = [...data].reverse().find((d) => !d.partial && d.total > 0)

  return (
    <ChartShell
      title="ลูกค้าเก่ากลับมาซื้อ รายเดือน"
      icon="repeat"
      tone="peach"
      subtitle={
        latest
          ? `${formatMonthLong(latest.month)}: สมาชิกที่ซื้อ ${formatNumber(latest.total)} คน เป็นลูกค้าเก่า ${formatPct(latest.returningPct)}`
          : 'นับสมาชิกที่ซื้อในแต่ละเดือน (ไม่นับลูกค้าทั่วไป)'
      }
      legend={
        <>
          <Swatch color={RETURNING} label="ลูกค้าเก่ากลับมาซื้อ" />
          <Swatch color={FIRST_TIME} label="ซื้อครั้งแรก" />
          {partial && <Swatch color={RETURNING} faded label="ข้อมูลไม่ครบเดือน" />}
        </>
      }
      note={[
        'ลูกค้าเก่า = สมาชิกที่เคยซื้อในเดือนก่อน ๆ แล้วกลับมาซื้ออีกในเดือนนั้น · นับจาก sales.csv คนละ 1 ครั้งต่อเดือน',
        partial && `${formatMonthLong(partial.month)} มียอดขายถึงวันที่ ${Number(salesEnd.slice(8))} เท่านั้น`,
      ].filter(Boolean).join(' · ')}
      height="h-64 sm:h-80"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: isMobile ? 4 : 12, left: isMobile ? -8 : 0, bottom: 0 }} barCategoryGap="18%">
          <CartesianGrid stroke={AXIS.grid} strokeDasharray="3 4" vertical={false} />
          <XAxis
            dataKey="month"
            tickFormatter={formatMonthShort}
            tick={{ fill: AXIS.tick, fontSize: tickFont }}
            tickLine={false}
            axisLine={{ stroke: AXIS.grid }}
            minTickGap={isMobile ? 16 : 24}
          />
          <YAxis tickFormatter={formatNumber} tick={{ fill: AXIS.tick, fontSize: tickFont }} tickLine={false} axisLine={false} width={44} />
          <Tooltip content={<RepeatTooltip />} cursor={{ fill: CHART.hoverFill }} />
          {/* ขอบสีขาวคั่นระหว่างสองส่วนของแท่ง ให้แยกสีออกจากกันชัดขึ้น */}
          <Bar dataKey="returning" name="ลูกค้าเก่ากลับมาซื้อ" stackId="buyers" fill={RETURNING} stroke="#fff" strokeWidth={1}>
            {data.map((d) => <Cell key={d.month} fillOpacity={d.partial ? 0.4 : 1} />)}
          </Bar>
          <Bar dataKey="firstTime" name="ซื้อครั้งแรก" stackId="buyers" fill={FIRST_TIME} stroke="#fff" strokeWidth={1} radius={[4, 4, 0, 0]}>
            {data.map((d) => <Cell key={d.month} fillOpacity={d.partial ? 0.4 : 1} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartShell>
  )
}
