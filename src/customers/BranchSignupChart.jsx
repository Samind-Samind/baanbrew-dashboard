import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import useIsMobile from '../hooks/useIsMobile'
import { formatMonthLong, formatMonthShort, formatNumber } from '../lib/format'
import ChartShell, { LegendItem, TooltipBox } from './ChartShell'
import { AXIS } from './chartTheme'
import { BRANCH_COLORS, CHART } from '../lib/theme'

// สีผูกกับสาขา (เรียงตามรหัสสาขา) ไม่ใช่ตามอันดับ · ผ่านการตรวจแยกสีสำหรับคนตาบอดสีแล้ว
const branchColor = (i) => BRANCH_COLORS[i] ?? CHART.tick

function BranchTooltip({ active, payload, label, branches }) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  const sorted = branches.filter((b) => row[b.id] !== null).sort((a, b) => row[b.id] - row[a.id])
  return (
    <TooltipBox>
      <p className="text-paper/70">{formatMonthLong(label)}</p>
      {sorted.map((b) => (
        <p key={b.id} className="flex items-center justify-between gap-4 tabular-nums">
          <span className="inline-flex items-center gap-2">
            <span className="inline-block size-2.5 rounded-full" style={{ backgroundColor: branchColor(b.colorIndex) }} />
            {b.name}
          </span>
          <span className="font-semibold">{formatNumber(row[b.id])} คน</span>
        </p>
      ))}
    </TooltipBox>
  )
}

export default function BranchSignupChart({ data, branches, partialMonth }) {
  const isMobile = useIsMobile()
  const tickFont = isMobile ? 11 : 12

  return (
    <ChartShell
      title="ลูกค้าใหม่แยกตามสาขาบ้าน"
      icon="store"
      tone="sky"
      subtitle="สาขาไหนดึงลูกค้าใหม่ได้มากขึ้นหรือน้อยลง"
      legend={branches.map((b) => <LegendItem key={b.id} color={branchColor(b.colorIndex)} label={b.name} />)}
      note={[
        partialMonth && `ไม่รวม${formatMonthLong(partialMonth)} เพราะข้อมูลยังไม่ครบเดือน`,
        ...branches.filter((b) => b.openedInRange).map((b) => `สาขา${b.name}เปิด${formatMonthLong(b.openedInRange)} จึงไม่มีเส้นก่อนหน้านั้น`),
      ].filter(Boolean).join(' · ')}
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
          <YAxis tickFormatter={formatNumber} tick={{ fill: AXIS.tick, fontSize: tickFont }} tickLine={false} axisLine={false} width={44} />
          <Tooltip content={<BranchTooltip branches={branches} />} cursor={{ stroke: CHART.cursor, strokeWidth: 1 }} />
          {branches.map((b) => (
            <Line
              key={b.id}
              dataKey={b.id}
              name={b.name}
              stroke={branchColor(b.colorIndex)}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: branchColor(b.colorIndex), stroke: '#fff', strokeWidth: 2 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

    </ChartShell>
  )
}

// ตารางตัวเลข สำหรับคนที่แยกสีเส้นได้ยาก
export function BranchTable({ data, branches }) {
  return (
    <details className="rounded-2xl bg-white border border-rule p-4 sm:p-6 text-sm">
      <summary className="cursor-pointer font-medium">ดูลูกค้าใหม่แยกสาขาเป็นตาราง</summary>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full tabular-nums">
          <thead className="text-roast">
            <tr>
              <th className="py-1.5 pr-3 text-left font-medium">เดือน</th>
              {branches.map((b) => <th key={b.id} className="py-1.5 px-2 text-right font-medium">{b.name}</th>)}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.month} className="border-t border-rule">
                <td className="py-1.5 pr-3 whitespace-nowrap">{formatMonthShort(row.month)}</td>
                {branches.map((b) => <td key={b.id} className="py-1.5 px-2 text-right">{row[b.id] === null ? '–' : formatNumber(row[b.id])}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}
