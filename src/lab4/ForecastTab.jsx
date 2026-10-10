// Lab 4.4–4.5 · พยากรณ์และวันผิดปกติ
// คำนวณในเบราว์เซอร์จาก analytics/daily (ยอดรายวันแยกสาขา ~2,700 แถว) จึงเปลี่ยนสาขาได้ทันทีโดยไม่อ่าน Firestore เพิ่ม
import { useMemo, useState } from "react";
import {
  ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine,
} from "recharts";
import { AnalyticsShell, Card, Pending, Insight, MAIN, GREEN, MUTED, INK, thaiDay } from "./ui.jsx";
import { useAnalytics } from "./useAnalytics.js";
import { toSeries } from "../lib/analytics/daily.js";
import { seasonalForecast, backtest, mape } from "../lib/analytics/forecast.js";
import { scoreAnomalies } from "../lib/analytics/anomaly.js";
import { fmtBaht, fmtShortBaht } from "../lib/metrics.js";
import { addDays } from "../lab3/time.js";

const BRANCHES = ["สยาม", "สีลม", "อารีย์", "บางนา", "มหาวิทยาลัย"];
const HORIZON = 28;
const shortDay = (iso) => new Date(iso + "T00:00:00").toLocaleDateString("th-TH", { day: "numeric", month: "short" });
const tryRun = (f) => { try { return { value: f() }; } catch (e) { return { error: e.message }; } };

/** วันจันทร์ของสัปดาห์ที่วันนั้นอยู่ (สัปดาห์ = จันทร์–อาทิตย์) */
const mondayOf = (ymd) => addDays(ymd, -((new Date(ymd + "T00:00:00Z").getUTCDay() + 6) % 7));

/** Lab 4.4B · รวมผลย้อนทดสอบรายวันเป็นรายสัปดาห์ สัปดาห์ที่ตกขอบช่วงทดสอบรวมเฉพาะวันที่มี (ยอดจริงกับคาดการณ์จึงเทียบวันเดียวกัน) */
function weeklyBacktest(test) {
  const weeks = new Map();
  for (const t of test) {
    const k = mondayOf(t.date);
    const w = weeks.get(k) ?? { week: k, days: 0, actual: 0, seasonal: 0, flat: 0 };
    w.days += 1; w.actual += t.actual; w.seasonal += t.seasonal; w.flat += t.flat;
    weeks.set(k, w);
  }
  const rows = [...weeks.values()];
  return {
    rows,
    mapeSeasonal: mape(rows.map((w) => w.actual), rows.map((w) => w.seasonal)),
    mapeFlat: mape(rows.map((w) => w.actual), rows.map((w) => w.flat)),
  };
}

function ForecastCard({ daily, abc }) {
  const [branch, setBranch] = useState(null);
  const [view, setView] = useState("daily"); // "daily" | "weekly"
  const result = useMemo(() => tryRun(() => {
    const series = toSeries(daily, branch);
    const bt = backtest(series, HORIZON);
    const fc = seasonalForecast(series, HORIZON);
    const recent = series.slice(-56);
    const last = recent[recent.length - 1];
    const chart = [
      ...recent.map((s) => ({ date: s.date, actual: s.revenue })),
      ...fc.map((f) => ({ date: f.date, forecast: f.forecast, band: [f.forecast * (1 - bt.band), f.forecast * (1 + bt.band)] })),
    ];
    chart[recent.length - 1] = { ...chart[recent.length - 1], forecast: last.revenue }; // ต่อเส้นให้ไม่ขาด
    const next7 = fc.slice(0, 7).reduce((s, f) => s + f.forecast, 0);
    return { bt, weekly: weeklyBacktest(bt.test), chart, next7, lastDate: last.date, firstForecast: fc[0].date };
  }), [daily, branch]);

  const r = result.value;
  const weekly = view === "weekly";
  return (
    <>
    <Card title="พยากรณ์ยอดขาย 28 วัน" sub="ค่าเฉลี่ยวันเดียวกันของสัปดาห์ 8 สัปดาห์ล่าสุด · แถบ = ช่วงที่คาดว่าครอบคลุมราว 80% ของวัน"
          right={<div className="flex flex-wrap gap-1">
            {[null, ...BRANCHES].map((b) => (
              <button key={b ?? "all"} onClick={() => setBranch(b)}
                      className={`rounded-lg px-2.5 py-1 text-sm ${branch === b ? "bg-stone-900 text-white" : "text-stone-600 ring-1 ring-stone-200"}`}>{b ?? "รวม"}</button>
            ))}
          </div>}>
      {result.error ? <Pending lab="Lab 4.4" error={result.error} /> : (
        <>
          <div className="mb-3 inline-flex rounded-lg p-0.5 ring-1 ring-stone-200" role="group" aria-label="มุมมอง">
            {[["daily", "รายวัน"], ["weekly", "รายสัปดาห์"]].map(([id, label]) => (
              <button key={id} onClick={() => setView(id)} aria-pressed={view === id}
                      className={`rounded-md px-3 py-1 text-sm ${view === id ? "bg-stone-900 text-white" : "text-stone-600"}`}>{label}</button>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="คาดการณ์ 7 วันข้างหน้า" value={fmtBaht(r.next7)} />
            {weekly ? (
              <>
                <Stat label="ย้อนทดสอบ: คลาดเคลื่อนเฉลี่ยต่อสัปดาห์" value={`${r.weekly.mapeSeasonal.toFixed(1)}%`}
                      note={`วิธีดูวันในสัปดาห์ · รายวัน ${r.bt.mapeSeasonal.toFixed(1)}%`} />
                <Stat label="ถ้าใช้ค่าเฉลี่ย 28 วันเส้นตรง (รายสัปดาห์)" value={`${r.weekly.mapeFlat.toFixed(1)}%`}
                      note={`ตัวเปรียบเทียบ · รายวัน ${r.bt.mapeFlat.toFixed(1)}%`} muted />
              </>
            ) : (
              <>
                <Stat label="ย้อนทดสอบ 28 วัน: คลาดเคลื่อนเฉลี่ยต่อวัน" value={`${r.bt.mapeSeasonal.toFixed(1)}%`} note="วิธีดูวันในสัปดาห์" />
                <Stat label="ถ้าใช้ค่าเฉลี่ย 28 วันเส้นตรง" value={`${r.bt.mapeFlat.toFixed(1)}%`} note="ตัวเปรียบเทียบ" muted />
              </>
            )}
          </div>
          {weekly ? <WeeklyTable weekly={r.weekly} /> : (
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={r.chart} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#eee" />
                <XAxis dataKey="date" tickFormatter={shortDay} minTickGap={36} tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={fmtShortBaht} width={56} domain={[0, "auto"]} tick={{ fontSize: 12 }} />
                <Tooltip labelFormatter={thaiDay} formatter={(v, n) => [Array.isArray(v) ? `${fmtBaht(v[0])} – ${fmtBaht(v[1])}` : fmtBaht(v), n]} />
                <Legend wrapperStyle={{ fontSize: 13 }} />
                <ReferenceLine x={r.lastDate} stroke={MUTED} strokeDasharray="3 3" label={{ value: "ข้อมูลถึง", position: "insideTopLeft", fontSize: 11, fill: INK }} />
                <Area name="ช่วงคาดการณ์" dataKey="band" stroke="none" fill={GREEN[1]} isAnimationActive={false} />
                <Line name="ยอดจริง" dataKey="actual" stroke={INK} strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line name="คาดการณ์" dataKey="forecast" stroke={MAIN} strokeWidth={2} strokeDasharray="6 4" dot={false} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          )}
          {weekly ? (
            <Insight>
              {branch ?? "ภาพรวม"}: รวมเป็นรายสัปดาห์แล้วคลาดเคลื่อนเหลือ {r.weekly.mapeSeasonal.toFixed(1)}% (รายวัน {r.bt.mapeSeasonal.toFixed(1)}%)
              เพราะวันที่ขายเกินกับขายขาดหักล้างกันภายในสัปดาห์ · จึงเหมาะกับสั่งของและจัดกะรายสัปดาห์มากกว่าตัดสินยอดรายวัน
            </Insight>
          ) : (
          <Insight>
            {r.bt.mapeFlat > r.bt.mapeSeasonal * 1.5
              ? `${branch ?? "ภาพรวม"}: การดูวันในสัปดาห์ช่วยลดความคลาดเคลื่อนจาก ${r.bt.mapeFlat.toFixed(0)}% เหลือ ${r.bt.mapeSeasonal.toFixed(0)}% เพราะยอดวันธรรมดากับเสาร์-อาทิตย์ต่างกันมาก`
              : `${branch ?? "ภาพรวม"}: สองวิธีแม่นพอ ๆ กัน (${r.bt.mapeSeasonal.toFixed(0)}% กับ ${r.bt.mapeFlat.toFixed(0)}%) ${branch ? "" : "เพราะสาขาออฟฟิศกับห้างขายดีคนละวัน พอรวมกันรูปแบบรายสัปดาห์จึงหักล้างกัน"}`}
            {" "}ใช้วางแผนสต็อกและกะพนักงานรายสัปดาห์ได้ แต่ไม่ควรใช้ตัดสินยอดรายวันของสาขาเดียว
          </Insight>
          )}
          <details className="mt-3 text-sm text-stone-600">
            <summary className="cursor-pointer font-medium text-stone-700">แถบช่วงคาดการณ์คำนวณจากอะไร</summary>
            <p className="mt-2 leading-relaxed">
              ตอนย้อนทดสอบ เราซ่อน 28 วันสุดท้ายแล้วดูว่าพยากรณ์พลาดจากยอดจริงวันละกี่ % จากนั้นหาส่วนเบี่ยงเบนมาตรฐาน (SD) ของ % ที่พลาด
              แล้วคูณ 1.28 ได้ ±{(r.bt.band * 100).toFixed(0)}% สำหรับ{branch ?? "ภาพรวม"} · ถ้าความคลาดเคลื่อนกระจายแบบระฆังคว่ำ ช่วง ±1.28 SD
              จะครอบคลุมราว 80% ของวัน แปลว่าประมาณ 1 ใน 5 วันยอดจริงจะหลุดแถบได้เป็นปกติ ไม่ต้องตกใจ
            </p>
          </details>
        </>
      )}
    </Card>
    {!result.error && <PrepCard abc={abc} next7={r.next7} branch={branch} from={r.firstForecast} />}
    </>
  );
}

function WeeklyTable({ weekly }) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[520px] text-sm tabular-nums">
        <thead className="text-left text-stone-500">
          <tr><th className="py-1 font-medium">สัปดาห์ (จันทร์–อาทิตย์)</th><th className="text-right font-medium">ยอดจริง</th>
            <th className="text-right font-medium">คาดการณ์ (วันในสัปดาห์)</th><th className="text-right font-medium">คลาด</th>
            <th className="text-right font-medium">เส้นตรง</th><th className="text-right font-medium">คลาด</th></tr>
        </thead>
        <tbody>
          {weekly.rows.map((w) => {
            const err = (f) => (w.actual ? `${((Math.abs(w.actual - f) / w.actual) * 100).toFixed(1)}%` : "–");
            return (
              <tr key={w.week} className="border-t border-stone-100">
                <td className="py-1.5">{thaiDay(w.week)} – {thaiDay(addDays(w.week, 6))}
                  {w.days < 7 && <span className="ml-1 text-stone-400">(ช่วงทดสอบมี {w.days} วัน)</span>}</td>
                <td className="text-right">{fmtBaht(w.actual)}</td>
                <td className="text-right">{fmtBaht(w.seasonal)}</td>
                <td className="text-right text-stone-500">{err(w.seasonal)}</td>
                <td className="text-right text-stone-500">{fmtBaht(w.flat)}</td>
                <td className="text-right text-stone-500">{err(w.flat)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Lab 4.4B · ควรเตรียมของเท่าไร = ยอดคาดการณ์ 7 วัน × สัดส่วนยอดขายของเมนูกลุ่ม A */
function PrepCard({ abc, next7, branch, from }) {
  if (!abc || abc.error) return <Card title="ควรเตรียมของเท่าไร (7 วันข้างหน้า)"><Pending lab="Lab 4.2" error={abc?.error ?? "ยังไม่มีผล ABC"} /></Card>;
  const items = abc.items.filter((i) => i.cls === "A").map((i) => {
    const baht = next7 * i.share;
    const avgPrice = i.qty ? i.revenue / i.qty : null; // ราคาเฉลี่ยต่อแก้วจากประวัติ
    return { ...i, baht, cups: avgPrice ? baht / avgPrice : null };
  });
  const hasQty = items.every((i) => i.cups !== null);
  const shareA = items.reduce((s, i) => s + i.share, 0);
  return (
    <Card title="ควรเตรียมของเท่าไร (7 วันข้างหน้า)"
          sub={`${branch ?? "รวมทุกสาขา"} · เริ่ม ${thaiDay(from)} · ยอดคาดการณ์ ${fmtBaht(next7)} × สัดส่วนยอดขายของเมนูกลุ่ม A ${items.length} เมนู`}>
      <div className="max-h-96 overflow-auto">
        <table className="w-full min-w-[440px] text-sm tabular-nums">
          <thead className="sticky top-0 bg-white text-left text-stone-500">
            <tr><th className="py-1 font-medium">#</th><th className="font-medium">เมนู</th><th className="text-right font-medium">สัดส่วนยอด</th>
              <th className="text-right font-medium">ยอดที่คาด</th>{hasQty && <th className="text-right font-medium">ประมาณ (แก้ว)</th>}</tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.product_id} className="border-t border-stone-100">
                <td className="py-1.5 text-stone-400">{i.rank}</td>
                <td>{i.name} <span className="text-stone-400">{i.category}</span></td>
                <td className="text-right text-stone-500">{(i.share * 100).toFixed(1)}%</td>
                <td className="text-right">{fmtBaht(i.baht)}</td>
                {hasQty && <td className="text-right font-medium">{Math.ceil(i.cups).toLocaleString()}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Insight>
        กลุ่ม A รวม {(shareA * 100).toFixed(1)}% ของยอดขาย ≈ {fmtBaht(next7 * shareA)} ใน 7 วัน
        {hasQty ? " · จำนวนแก้ว = ยอดที่คาด ÷ ราคาเฉลี่ยต่อแก้วในอดีต ปัดขึ้น" : " · รัน npm run analytics ใหม่เพื่อดูจำนวนแก้ว"}
        {branch && " · ใช้สัดส่วนเมนูของทั้งร้าน สาขานี้อาจขายเมนูต่างจากภาพรวม"} · เผื่อสต็อกตามแถบช่วงคาดการณ์ด้านบน
      </Insight>
    </Card>
  );
}

function Stat({ label, value, note, muted }) {
  return (
    <div className="rounded-lg bg-stone-50 p-3">
      <div className="text-xs text-stone-500">{label}</div>
      <div className={`text-2xl font-semibold tabular-nums ${muted ? "text-stone-500" : ""}`}>{value}</div>
      {note && <div className="text-xs text-stone-400">{note}</div>}
    </div>
  );
}

/** Lab 4.5B · กราฟยอดจริงเทียบค่าปกติของสาขานั้น ±28 วันรอบวันที่เลือก */
const ZOOM_DAYS = 28;
const LOW = "#b91c1c";  // ต่ำกว่าปกติ
const HIGH = "#d97706"; // สูงกว่าปกติ
function ZoomChart({ daily, all, focus, onClose }) {
  const data = useMemo(() => {
    const expectedOf = new Map(all.filter((a) => a.branch === focus.branch).map((a) => [a.date, a.expected]));
    const from = addDays(focus.date, -ZOOM_DAYS), to = addDays(focus.date, ZOOM_DAYS);
    return toSeries(daily, focus.branch)
      .filter((s) => s.date >= from && s.date <= to)
      .map((s) => ({ date: s.date, actual: s.revenue, expected: expectedOf.get(s.date) ?? null }));
  }, [daily, all, focus]);
  const color = focus.change < 0 ? LOW : HIGH;
  return (
    <div className="mb-4 rounded-lg p-3 ring-1 ring-stone-200">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="font-medium">{focus.branch} · {thaiDay(focus.date)}</div>
          <div className="text-sm text-stone-500">
            ยอดจริง {fmtBaht(focus.actual)} เทียบค่าปกติ {fmtBaht(focus.expected)} ·{" "}
            <span style={{ color }}>{focus.change < 0 ? "▼ ต่ำกว่า" : "▲ สูงกว่า"}ปกติ {Math.round(Math.abs(focus.change) * 100)}%</span>
            {" "}· แสดง ±{ZOOM_DAYS} วัน
          </div>
        </div>
        <button onClick={onClose} aria-label="ปิดกราฟ"
                className="rounded-lg px-3 py-1.5 text-sm text-stone-600 ring-1 ring-stone-300 hover:bg-stone-100">ปิด ✕</button>
      </div>
      <div className="mt-2 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#eee" />
            <XAxis dataKey="date" tickFormatter={shortDay} minTickGap={36} tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={fmtShortBaht} width={56} domain={[0, "auto"]} tick={{ fontSize: 12 }} />
            <Tooltip labelFormatter={thaiDay} formatter={(v, n) => [fmtBaht(v), n]} />
            <Legend wrapperStyle={{ fontSize: 13 }} />
            <ReferenceLine x={focus.date} stroke={color} strokeDasharray="3 3" />
            <Line name="ยอดจริง" dataKey="actual" stroke={INK} strokeWidth={2} isAnimationActive={false}
                  dot={(p) => p.payload.date === focus.date
                    ? <circle key={p.key} cx={p.cx} cy={p.cy} r={6} fill={color} stroke="#fff" strokeWidth={2} />
                    : <g key={p.key} />} />
            <Line name="ค่าปกติ" dataKey="expected" stroke={MUTED} strokeWidth={2} strokeDasharray="6 4" dot={false}
                  connectNulls isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function AnomalyCard({ daily, holidays }) {
  const [focus, setFocus] = useState(null);
  const result = useMemo(() => tryRun(() => scoreAnomalies(daily, holidays)), [daily, holidays]);
  if (result.error) return <Card title="วันที่ยอดขายผิดปกติ"><Pending lab="Lab 4.5" error={result.error} /></Card>;
  const all = result.value;
  const top = all.filter((a) => !a.holiday).slice(0, 15);
  const holidayHits = all.filter((a) => a.holiday).slice(0, 5);
  return (
    <Card title="วันที่ยอดขายผิดปกติ 15 อันดับ"
          sub="เทียบกับค่ากลางของวันเดียวกันของสัปดาห์ใน 8 สัปดาห์ก่อน · ไม่นับวันหยุดราชการ">
      {focus && <ZoomChart daily={daily} all={all} focus={focus} onClose={() => setFocus(null)} />}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-sm tabular-nums">
          <thead className="text-left text-stone-500">
            <tr><th className="py-1 font-medium">#</th><th className="font-medium">วันที่</th><th className="font-medium">สาขา</th>
              <th className="text-right font-medium">ยอดจริง</th><th className="text-right font-medium">ปกติ</th><th className="pl-4 font-medium">ต่างจากปกติ</th></tr>
          </thead>
          <tbody>
            {top.map((a, i) => {
              const sel = focus && focus.date === a.date && focus.branch === a.branch;
              return (
                <tr key={a.date + a.branch} onClick={() => setFocus(sel ? null : a)}
                    className={`cursor-pointer border-t border-stone-100 hover:bg-stone-50 ${sel ? "bg-emerald-50" : ""}`}>
                  <td className="py-1.5 text-stone-400">{i + 1}</td>
                  <td>{thaiDay(a.date)} <span className="text-stone-400">{new Date(a.date + "T00:00:00").toLocaleDateString("th-TH", { weekday: "short" })}</span></td>
                  <td>{a.branch}</td>
                  <td className="text-right">{fmtBaht(a.actual)}</td>
                  <td className="text-right text-stone-500">{fmtBaht(a.expected)}</td>
                  <td className="pl-4">
                    {a.change < 0
                      ? <span className="font-medium text-red-700">▼ ต่ำกว่าปกติ {Math.round(-a.change * 100)}%</span>
                      : <span className="font-medium text-amber-700">▲ สูงกว่าปกติ {Math.round(a.change * 100)}%</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Insight>
        อันดับต้น ๆ คือวันที่ควรโทรถามผู้จัดการสาขาว่าเกิดอะไรขึ้น · ระบบบอกได้ว่า “ผิดปกติ” แต่บอกไม่ได้ว่า “เพราะอะไร”
        {holidayHits.length > 0 && <> · วันหยุดที่ยอดเปลี่ยนมากแต่ไม่นับ เช่น {holidayHits.slice(0, 3).map((h) => `${h.holiday} (${h.branch})`).join(", ")}</>}
      </Insight>
    </Card>
  );
}

export default function ForecastTab({ source }) {
  const state = useAnalytics(source);
  return (
    <AnalyticsShell source={source} state={state} title="พยากรณ์และวันผิดปกติ">
      {(d) => d.daily.error ? <Pending lab="pipeline" error={d.daily.error} /> : (
        <div className="space-y-6">
          {d.meta.alerts?.length > 0 && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
              🚨 ยอดวันล่าสุดผิดปกติ: {d.meta.alerts.map((a) => `${a.branch} ${fmtBaht(a.actual)} (ปกติ ${fmtBaht(a.expected)})`).join(", ")}
            </p>
          )}
          <ForecastCard daily={d.daily.rows} abc={d.abc} />
          <AnomalyCard daily={d.daily.rows} holidays={d.meta.holidays ?? {}} />
        </div>
      )}
    </AnalyticsShell>
  );
}
