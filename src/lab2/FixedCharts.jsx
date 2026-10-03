// Lab 2.2 · กราฟที่ซ่อมแล้ว (เทียบกับ BadCharts.jsx ทางซ้าย)
// ทุก component รับ props { rows, products } · ใช้สีหลักสีเดียว · ตัวเลขเงินทุกตัวมี ฿ และจุลภาค
// ข้อความสรุปเหนือกราฟคำนวณจากข้อมูลจริงทุกครั้ง ไม่มีตัวเลขตายตัว
import { useMemo } from "react";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, LabelList,
} from "recharts";
import {
  revenueByProduct, monthlyRevenue, daysInMonth, branchPerformance, weeklyRevenue, thaiMonth,
} from "./lab2Metrics.js";
import { formatBahtShort as baht, formatNumber as num, formatShortThaiDate } from "../lib/format.js";

const PRIMARY = "#2f6b4f"; // --color-leaf สีหลักของ Dashboard
const MUTED = "#a9c4b6"; // สีเดียวกันแบบจาง ใช้กับเดือนที่ข้อมูล "ไม่ครบ" เท่านั้น
const INK = "#2a1f1a"; // --color-espresso
const AXIS = { fontSize: 11, fill: "#6e6a64" }; // --color-roast
const GRID = "#dcddd6"; // --color-rule
const LABEL = { fontSize: 11, fill: INK, fontVariantNumeric: "tabular-nums" };
const pct = (x) => `${(x * 100).toLocaleString("th-TH", { maximumFractionDigits: 1 })}%`;
const times = (x) => x.toLocaleString("th-TH", { maximumFractionDigits: 1 });

/** กรอบร่วม: ข้อความสรุป 1 บรรทัด + พื้นที่กราฟ */
function Frame({ summary, children }) {
  return (
    <div className="flex h-full flex-col">
      <p className="mb-1 truncate text-sm font-medium text-stone-800" title={summary}>{summary}</p>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
      </div>
    </div>
  );
}

const tooltipBase = { cursor: { fill: "rgba(47,107,79,0.08)" } };

/** กราฟ 1: 10 เมนูที่ทำเงินสูงสุด · แท่งแนวนอน เรียงมากไปน้อย */
const TOP_N = 10;
export function FixedChart1({ rows, products }) {
  const all = useMemo(() => revenueByProduct(rows, products), [rows, products]);
  const top = all.slice(0, TOP_N);
  const topShare = top.reduce((s, d) => s + d.share, 0);
  const summary = top.length
    ? `${top[0].name} ทำเงินสูงสุด ${baht(top[0].revenue)} (${pct(top[0].share)}) · ${top.length} เมนูแรกจาก ${num(all.length)} เมนู รวม ${pct(topShare)} ของยอดขาย`
    : "ไม่มีข้อมูล";
  return (
    <Frame summary={summary}>
      <BarChart data={top} layout="vertical" margin={{ top: 0, right: 80, left: 0, bottom: 0 }}>
        <XAxis type="number" hide domain={[0, "dataMax"]} />
        <YAxis type="category" dataKey="name" width={120} tick={AXIS} tickLine={false} axisLine={false} interval={0} />
        <Tooltip {...tooltipBase} formatter={(v, _k, { payload }) => [`${baht(v)} (${pct(payload.share)})`, "ยอดขาย"]} />
        <Bar dataKey="revenue" fill={PRIMARY} radius={[0, 3, 3, 0]} isAnimationActive={false}>
          <LabelList dataKey="revenue" position="right" formatter={baht} style={LABEL} />
        </Bar>
      </BarChart>
    </Frame>
  );
}

/** กราฟ 2: ยอดขายรวมแยกสาขา · แกนเริ่มที่ 0 เรียงมากไปน้อย */
export function FixedChart2({ rows }) {
  const data = useMemo(() => branchPerformance(rows).sort((a, b) => b.revenue - a.revenue), [rows]);
  const hi = data[0], lo = data[data.length - 1];
  const summary = data.length > 1
    ? `${hi.branch} ขายได้มากสุด ${baht(hi.revenue)} = ${times(hi.revenue / lo.revenue)} เท่าของ${lo.branch} (${baht(lo.revenue)})`
    : "ข้อมูลไม่พอเทียบสาขา";
  return (
    <Frame summary={summary}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 90, left: 0, bottom: 0 }}>
        <XAxis type="number" hide domain={[0, "dataMax"]} />
        <YAxis type="category" dataKey="branch" width={80} tick={AXIS} tickLine={false} axisLine={false} />
        <Tooltip {...tooltipBase} formatter={(v) => [baht(v), "ยอดขายรวม"]} />
        <Bar dataKey="revenue" fill={PRIMARY} radius={[0, 3, 3, 0]} isAnimationActive={false}>
          <LabelList dataKey="revenue" position="right" formatter={baht} style={LABEL} />
        </Bar>
      </BarChart>
    </Frame>
  );
}

/** กราฟ 3: ยอดขายรายสัปดาห์ (เฉพาะสัปดาห์ที่ครบ 7 วัน) · เส้นเดียว ไม่มีจุด */
const COMPARE_WEEKS = 12;
export function FixedChart3({ rows }) {
  const data = useMemo(() => weeklyRevenue(rows), [rows]);
  const avg = (arr) => arr.reduce((s, d) => s + d.revenue, 0) / (arr.length || 1);
  const n = Math.min(COMPARE_WEEKS, Math.floor(data.length / 2));
  const first = avg(data.slice(0, n)), last = avg(data.slice(-n));
  const change = first ? (last - first) / first : 0;
  const summary = n
    ? `${n} สัปดาห์ล่าสุดเฉลี่ย ${baht(last)}/สัปดาห์ ${change >= 0 ? "โตขึ้น" : "ลดลง"} ${pct(Math.abs(change))} จาก ${n} สัปดาห์แรก`
    : "ข้อมูลไม่พอดูแนวโน้ม";
  return (
    <Frame summary={summary}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={GRID} strokeDasharray="3 4" />
        <XAxis dataKey="week" tickFormatter={formatShortThaiDate} tick={AXIS} minTickGap={40} tickLine={false} />
        <YAxis tickFormatter={baht} tick={AXIS} width={76} domain={[0, "auto"]} tickLine={false} axisLine={false} />
        <Tooltip
          labelFormatter={(w) => `สัปดาห์เริ่ม ${formatShortThaiDate(w)}`}
          formatter={(v) => [baht(v), "ยอดขายรายสัปดาห์"]}
        />
        <Line dataKey="revenue" stroke={PRIMARY} strokeWidth={2} dot={false} isAnimationActive={false} />
      </LineChart>
    </Frame>
  );
}

/** กราฟ 4: ยอดขายเฉลี่ยต่อวันรายเดือน · เดือนที่ข้อมูลไม่ครบใช้สีจางและบอกจำนวนวัน */
export function FixedChart4({ rows }) {
  const data = useMemo(
    () => monthlyRevenue(rows).map((m) => {
      const full = daysInMonth(m.month);
      return { ...m, full, partial: m.days < full };
    }),
    [rows]
  );
  const last = data[data.length - 1], prev = data[data.length - 2];
  let summary = "ข้อมูลไม่พอเทียบรายเดือน";
  if (last && prev) {
    const diff = (last.perDay - prev.perDay) / prev.perDay;
    const head = last.partial ? `${thaiMonth(last.month)} มีข้อมูลแค่ ${last.days}/${last.full} วัน · ` : `${thaiMonth(last.month)} `;
    summary = `${head}เฉลี่ยวันละ ${baht(last.perDay)} ${diff >= 0 ? "สูงกว่า" : "ต่ำกว่า"} ${thaiMonth(prev.month)} ${pct(Math.abs(diff))}`;
  }
  return (
    <Frame summary={summary}>
      <BarChart data={data} margin={{ top: 18, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={GRID} strokeDasharray="3 4" />
        <XAxis dataKey="month" tickFormatter={thaiMonth} tick={AXIS} interval="preserveStartEnd" minTickGap={8} tickLine={false} />
        <YAxis tickFormatter={baht} tick={AXIS} width={68} tickLine={false} axisLine={false} />
        <Tooltip
          {...tooltipBase}
          labelFormatter={(m) => thaiMonth(m)}
          formatter={(v, _k, { payload }) => [
            `${baht(v)} ต่อวัน (ข้อมูล ${payload.days}/${payload.full} วัน · รวม ${baht(payload.revenue)})`,
            "ยอดเฉลี่ย",
          ]}
        />
        <Bar dataKey="perDay" radius={[3, 3, 0, 0]} isAnimationActive={false}>
          {data.map((d) => <Cell key={d.month} fill={d.partial ? MUTED : PRIMARY} />)}
          <LabelList
            dataKey="perDay"
            content={({ x, y, width, index }) => data[index]?.partial ? (
              <text x={x + width / 2} y={y - 5} textAnchor="middle" fontSize={10} fill="#6e6a64">
                {data[index].days}/{data[index].full} วัน
              </text>
            ) : null}
          />
        </Bar>
      </BarChart>
    </Frame>
  );
}

/** กราฟ 5: ยอดเฉลี่ยต่อวันที่เปิดขาย แยกสาขา (ยุติธรรมกับสาขาที่เปิดทีหลัง) */
export function FixedChart5({ rows }) {
  const data = useMemo(() => branchPerformance(rows).sort((a, b) => b.perDay - a.perDay), [rows]);
  const hi = data[0], lo = data[data.length - 1];
  const newest = data.reduce((m, d) => (!m || d.days < m.days ? d : m), null);
  const summary = data.length > 1
    ? `วัดต่อวันที่เปิดขาย: ${hi.branch} สูงสุด ${baht(hi.perDay)}/วัน · ${lo.branch} ต่ำสุด ${baht(lo.perDay)}/วัน · ${newest.branch} เพิ่งเปิด ${num(newest.days)} วัน`
    : "ข้อมูลไม่พอเทียบสาขา";
  return (
    <Frame summary={summary}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 140, left: 0, bottom: 0 }}>
        <XAxis type="number" hide domain={[0, "dataMax"]} />
        <YAxis type="category" dataKey="branch" width={80} tick={AXIS} tickLine={false} axisLine={false} />
        <Tooltip
          {...tooltipBase}
          formatter={(v, _k, { payload }) => [`${baht(v)} ต่อวัน (รวม ${baht(payload.revenue)} ใน ${num(payload.days)} วัน)`, "ยอดเฉลี่ย"]}
        />
        <Bar dataKey="perDay" fill={PRIMARY} radius={[0, 3, 3, 0]} isAnimationActive={false}>
          <LabelList
            dataKey="perDay"
            content={({ x, y, width, height, index }) => (
              <text x={x + width + 6} y={y + height / 2 + 4} {...LABEL}>
                {baht(data[index].perDay)}/วัน · {num(data[index].days)} วัน
              </text>
            )}
          />
        </Bar>
      </BarChart>
    </Frame>
  );
}
