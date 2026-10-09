// Lab 3.2 · Dashboard ยอดขายแบบ real-time จาก Firestore (Prompt 3.2B)
// ฟัง collection "sales" ด้วย onSnapshot ตามช่วงวันที่ที่เลือก ใครบันทึกยอดขายใหม่ หน้านี้จะขยับเองโดยไม่ต้องรีเฟรช
// ตัวเลขทั้งหมดคำนวณด้วยฟังก์ชันจาก src/lib/metrics.js ชุดเดียวกับแท็บ Dashboard
// คอลัมน์ขวาคือฟอร์มบันทึกยอดขาย (SaleForm.jsx, Prompt 3.2C)
// ต้องล็อกอินด้วย Google ก่อน (Prompt 3.3A) ถ้ายังไม่ล็อกอินจะไม่เริ่มฟัง Firestore เลย
import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { auth, db, googleProvider } from "./firebase.js";
import { addDays, todayBangkok } from "./time.js";
import { BRANCHES } from "./saleModel.js";
import SaleForm from "./SaleForm.jsx";
import { computeKpis, dailyRevenue, hourlyRevenue, prepareRows, revenueByBranch } from "../lib/metrics.js";
import KpiCard from "../components/KpiCard.jsx";
import useIsMobile from "../hooks/useIsMobile";
import { formatBaht, formatBahtShort, formatFullDate, formatNumber, formatShortThaiDate } from "../lib/format";
import { CHART } from "../lib/theme";

const RANGES = [
  { id: "today", label: "วันนี้", days: 1 },
  { id: "7d", label: "7 วัน", days: 7 },
  { id: "30d", label: "30 วัน", days: 30 },
];
const HIGHLIGHT_MS = 4000;
const RECENT_COUNT = 8;

const ERRORS = {
  "permission-denied": "ไม่มีสิทธิ์อ่านยอดขาย (ถูกปฏิเสธโดย Security Rules) ตรวจว่าล็อกอินแล้ว และ rules อนุญาตให้อ่าน",
  unauthenticated: "ต้องเข้าสู่ระบบก่อนจึงจะดูยอดขายได้",
  "resource-exhausted": "ใช้โควตาอ่านฟรีของวันนี้หมดแล้ว รอรีเซ็ต (ตามเวลาแปซิฟิก) หรือเลือกช่วงวันที่สั้นลง",
  "failed-precondition": "Firestore ต้องการ index สำหรับ query นี้ ดูลิงก์สร้าง index ใน console ของเบราว์เซอร์",
  unavailable: "เชื่อมต่อ Firestore ไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองใหม่",
};
const thaiError = (e) => ERRORS[e.code] ?? `เกิดข้อผิดพลาด: ${e.message}`;

const AUTH_ERRORS = {
  "auth/unauthorized-domain": "โดเมนนี้ยังไม่ได้รับอนุญาตให้ล็อกอิน เพิ่มโดเมนใน Firebase console → Authentication → Settings → Authorized domains",
  "auth/operation-not-allowed": "ยังไม่ได้เปิดล็อกอินด้วย Google ใน Firebase console → Authentication → Sign-in method",
  "auth/popup-blocked": "เบราว์เซอร์บล็อกหน้าต่างล็อกอิน อนุญาต pop-up สำหรับเว็บนี้แล้วลองใหม่",
  "auth/popup-closed-by-user": "หน้าต่างล็อกอินถูกปิดก่อนเข้าสู่ระบบเสร็จ ลองกดใหม่อีกครั้ง",
};
const authError = (e) => AUTH_ERRORS[e.code] ?? `เข้าสู่ระบบไม่สำเร็จ: ${e.code ?? e.message}`;

const time = (datetime) => datetime.slice(11, 16);

export default function LiveTab() {
  const [user, setUser] = useState(undefined); // undefined = กำลังตรวจ, null = ยังไม่ล็อกอิน
  const [loginError, setLoginError] = useState(null);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  async function signIn() {
    setSigningIn(true);
    setLoginError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      setLoginError(authError(e));
    } finally {
      setSigningIn(false);
    }
  }

  if (user === undefined) return <p className="text-roast">กำลังตรวจสอบการเข้าสู่ระบบ…</p>;

  if (!user) {
    return (
      <div className="mx-auto mt-6 max-w-md rounded-2xl border border-rule bg-white p-6 text-center sm:p-8">
        <h1 className="text-2xl font-bold">ยอดขายสด</h1>
        <p className="mt-2 text-sm text-roast">ข้อมูลยอดขายเปิดให้เฉพาะพนักงาน เข้าสู่ระบบก่อนจึงจะดูและบันทึกยอดขายได้</p>
        <button
          type="button"
          onClick={signIn}
          disabled={signingIn}
          className="mt-6 inline-flex w-full items-center justify-center gap-3 rounded-full bg-white px-4 py-2.5 font-medium ring-1 ring-rule hover:bg-paper disabled:opacity-50"
        >
          <GoogleMark />
          {signingIn ? "กำลังเปิดหน้าต่างล็อกอิน…" : "เข้าสู่ระบบด้วย Google"}
        </button>
        {loginError && <p role="alert" className="mt-4 rounded-lg bg-[#fbe3ec] px-3 py-2 text-left text-sm text-[#9b2f58]">{loginError}</p>}
      </div>
    );
  }

  // key = uid: ถ้าเปลี่ยนบัญชี Dashboard จะเริ่มใหม่ทั้งหมด (ตัวนับและ listener ไม่ปนกันระหว่างผู้ใช้)
  return <LiveDashboard key={user.uid} user={user} />;
}

function UserBadge({ user }) {
  return (
    <div className="flex items-center gap-2 rounded-full bg-white py-1 pl-1 pr-1 ring-1 ring-rule">
      {user.photoURL
        ? <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="h-8 w-8 rounded-full" />
        : <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ece8fb] font-semibold text-[#5b52b5]">{(user.displayName ?? user.email ?? "?")[0]}</span>}
      <span className="max-w-[10rem] truncate text-sm font-medium">{user.displayName ?? user.email}</span>
      <button type="button" onClick={() => signOut(auth)} className="rounded-full px-3 py-1 text-sm text-roast hover:bg-paper">
        ออกจากระบบ
      </button>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

function LiveDashboard({ user }) {
  const [range, setRange] = useState("7d");
  const [branch, setBranch] = useState("");
  // ผลของ listener เก็บคู่กับช่วงวันที่ที่ฟังอยู่ ตอนเปลี่ยนช่วงจึงไม่แสดงข้อมูลของช่วงเก่า
  const [result, setResult] = useState({ key: null, docs: null, error: null });
  const [reads, setReads] = useState(0);
  const [fresh, setFresh] = useState(() => new Set());
  const [products, setProducts] = useState(null);
  const [productsError, setProductsError] = useState(null);

  const today = todayBangkok();
  const { days } = RANGES.find((r) => r.id === range);
  const start = addDays(today, -(days - 1));
  const end = today;
  const key = `${start}_${end}`;
  const docs = result.key === key ? result.docs : null;
  const error = result.key === key ? result.error : null;

  useEffect(() => {
    let first = true;
    const timers = [];
    const q = query(collection(db, "sales"), where("date", ">=", start), where("date", "<=", end), orderBy("date"));

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const changes = snap.docChanges();
        setReads((n) => n + changes.length);
        setResult({ key, docs: snap.docs.map((d) => ({ id: d.id, ...d.data() })), error: null });

        // snapshot แรกคือข้อมูลทั้งหมดที่มีอยู่แล้ว ไฮไลต์เฉพาะเอกสารที่เข้ามาหลังจากนั้น
        if (first) {
          first = false;
          return;
        }
        const added = changes.filter((c) => c.type === "added").map((c) => c.doc.id);
        if (added.length === 0) return;
        setFresh((s) => new Set([...s, ...added]));
        timers.push(setTimeout(() => {
          setFresh((s) => {
            const next = new Set(s);
            added.forEach((id) => next.delete(id));
            return next;
          });
        }, HIGHLIGHT_MS));
      },
      (e) => setResult({ key, docs: null, error: thaiError(e) }),
    );

    // เลิกฟังเมื่อเปลี่ยนช่วงวันที่หรือออกจากหน้า ไม่งั้น listener เก่าจะค้างและอ่านเอกสารซ้ำ
    return () => {
      unsubscribe();
      timers.forEach(clearTimeout);
    };
  }, [key, start, end]);

  // เมนูเปลี่ยนไม่บ่อย จึงอ่านครั้งเดียวด้วย getDocs ไม่ต้องฟังแบบ real-time
  useEffect(() => {
    getDocs(collection(db, "products"))
      .then((snap) => setProducts(snap.docs.map((d) => d.data()).sort((a, b) => a.product_id.localeCompare(b.product_id))))
      .catch((e) => setProductsError(thaiError(e)));
  }, []);
  const productNames = useMemo(() => new Map((products ?? []).map((p) => [p.product_id, p.product_name])), [products]);

  const visible = useMemo(() => (docs && branch ? docs.filter((d) => d.branch === branch) : docs ?? []), [docs, branch]);
  const rows = useMemo(() => prepareRows(visible), [visible]);
  const allRows = useMemo(() => prepareRows(docs ?? []), [docs]);
  const kpis = computeKpis(rows);
  const recent = useMemo(
    () => [...visible].sort((a, b) => b.datetime.localeCompare(a.datetime)).slice(0, RECENT_COUNT),
    [visible],
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex justify-end">
        <UserBadge user={user} />
      </div>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl sm:text-3xl font-bold">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-leaf opacity-60" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-leaf" />
            </span>
            ยอดขายสด
          </h1>
          <p className="mt-1 text-sm text-roast">
            {days === 1 ? formatFullDate(start) : `${formatFullDate(start)} ถึง ${formatFullDate(end)}`}
            {" · "}อ่านเอกสารไปแล้ว <span className="font-semibold tabular-nums text-espresso">{formatNumber(reads)}</span> ครั้ง
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="ช่วงเวลา" className="flex rounded-full bg-white p-1 ring-1 ring-rule">
            {RANGES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRange(r.id)}
                aria-pressed={range === r.id}
                className={`rounded-full px-4 py-1.5 text-sm font-medium ${range === r.id ? "bg-espresso text-paper" : "text-espresso"}`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <select
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            aria-label="สาขา"
            className="rounded-full bg-white px-4 py-2 text-sm ring-1 ring-rule"
          >
            <option value="">ทุกสาขา</option>
            {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
      </header>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <aside className="order-first space-y-2 lg:order-none lg:col-start-2 lg:row-start-1 lg:sticky lg:top-4">
          <SaleForm products={products} uid={user.uid} />
          {productsError && <p role="alert" className="text-sm text-[#b4466f]">โหลดเมนูไม่สำเร็จ: {productsError}</p>}
        </aside>

        <div className="min-w-0 space-y-4 sm:space-y-6 lg:col-start-1 lg:row-start-1">
          {error && <p role="alert" className="rounded-2xl border border-crema bg-white p-5 text-espresso">⚠️ {error}</p>}
          {!error && !docs && <p className="text-roast">กำลังเชื่อมต่อยอดขายสด…</p>}

          {!error && docs && (
            <>
              <section
                aria-label="ตัวเลขสรุป"
                className="grid grid-cols-2 xl:grid-cols-[1.6fr_1fr_1fr_1fr] gap-px rounded-2xl bg-rule border border-rule overflow-hidden"
              >
                <KpiCard label="ยอดขายรวม" value={formatBaht(kpis.revenue)} note={`จาก ${formatNumber(rows.length)} รายการสินค้า`} lead icon="coins" tone="lavender" />
                <KpiCard label="จำนวนบิล" value={formatNumber(kpis.bills)} note="นับ order_id ไม่ซ้ำ" icon="receipt" tone="peach" />
                <KpiCard label="ยอดเฉลี่ยต่อบิล" value={formatBaht(kpis.avgPerBill)} note="ยอดขายรวม ÷ จำนวนบิล" icon="calculator" tone="mint" />
                <KpiCard label="ลูกค้าสมาชิก" value={`${formatNumber(kpis.customers)} คน`} note="ไม่นับลูกค้าทั่วไป" icon="users" tone="rose" />
              </section>

              <div className="grid gap-4 sm:gap-6 xl:grid-cols-[1.6fr_1fr]">
                {range === "today" ? <HourlyChart rows={rows} /> : <DailyChart rows={rows} />}
                <BranchChart rows={allRows} selected={branch} />
              </div>

              <RecentTable items={recent} fresh={fresh} names={productNames} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Panel({ title, note, children }) {
  return (
    <section className="min-w-0 rounded-2xl border border-rule bg-white p-4 sm:p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      {note && <p className="text-sm text-roast">{note}</p>}
      {children}
    </section>
  );
}

const tooltipBox = "rounded-lg bg-espresso px-3 py-2 text-sm text-paper shadow-lg";

function DailyChart({ rows }) {
  const isMobile = useIsMobile();
  const data = dailyRevenue(rows);
  return (
    <Panel title="ยอดขายรายวัน" note="ยอดขายรวมต่อวันในช่วงที่เลือก">
      <div className="mt-4 h-60 sm:h-72">
        {data.length === 0 ? <Empty /> : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 12, left: isMobile ? 0 : 8, bottom: 0 }}>
              <CartesianGrid stroke={CHART.grid} strokeDasharray="3 4" vertical={false} />
              <XAxis dataKey="date" tickFormatter={formatShortThaiDate} tick={{ fill: CHART.tick, fontSize: 12 }} tickLine={false} axisLine={{ stroke: CHART.grid }} minTickGap={24} />
              <YAxis tickFormatter={formatBahtShort} tick={{ fill: CHART.tick, fontSize: 12 }} tickLine={false} axisLine={false} width={isMobile ? 58 : 76} />
              <Tooltip
                cursor={{ stroke: CHART.cursor }}
                content={({ active, payload }) => active && payload?.length ? (
                  <div className={tooltipBox}>
                    <p className="text-paper/70">{formatFullDate(payload[0].payload.date)}</p>
                    <p className="tabular-nums">{formatBaht(payload[0].payload.revenue)}</p>
                  </div>
                ) : null}
              />
              <Line type="monotone" dataKey="revenue" stroke={CHART.primary} strokeWidth={2.5} dot={{ r: 2.5, fill: CHART.primary }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </Panel>
  );
}

function HourlyChart({ rows }) {
  const isMobile = useIsMobile();
  const data = hourlyRevenue(rows);
  return (
    <Panel title="ยอดขายรายชั่วโมง วันนี้" note="ชั่วโมงที่ยังมาไม่ถึงจะเป็น 0">
      <div className="mt-4 h-60 sm:h-72">
        {rows.length === 0 ? <Empty text="วันนี้ยังไม่มียอดขาย ลองบันทึกจากฟอร์ม" /> : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 12, left: isMobile ? 0 : 8, bottom: 0 }}>
              <CartesianGrid stroke={CHART.grid} strokeDasharray="3 4" vertical={false} />
              <XAxis dataKey="hour" tickFormatter={(h) => `${h}:00`} tick={{ fill: CHART.tick, fontSize: 12 }} tickLine={false} axisLine={{ stroke: CHART.grid }} interval={isMobile ? 5 : 2} />
              <YAxis tickFormatter={formatBahtShort} tick={{ fill: CHART.tick, fontSize: 12 }} tickLine={false} axisLine={false} width={isMobile ? 58 : 76} />
              <Tooltip
                cursor={{ fill: CHART.hoverFill }}
                content={({ active, payload }) => active && payload?.length ? (
                  <div className={tooltipBox}>
                    <p className="text-paper/70">{payload[0].payload.hour}:00–{payload[0].payload.hour}:59 น.</p>
                    <p className="tabular-nums">{formatBaht(payload[0].payload.revenue)}</p>
                  </div>
                ) : null}
              />
              <Bar dataKey="revenue" fill={CHART.primary} radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Panel>
  );
}

function BranchChart({ rows, selected }) {
  const data = revenueByBranch(rows);
  return (
    <Panel title="ยอดขายแยกสาขา" note={selected ? `เน้นสาขา${selected} เทียบกับสาขาอื่น` : "ทุกสาขาในช่วงที่เลือก"}>
      <div className="mt-4 h-60 sm:h-72">
        {data.length === 0 ? <Empty /> : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="branch" width={92} tick={{ fill: CHART.ink, fontSize: 13 }} tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ fill: CHART.hoverFill }}
                content={({ active, payload }) => active && payload?.length ? (
                  <div className={tooltipBox}>
                    <p className="text-paper/70">{payload[0].payload.branch}</p>
                    <p className="tabular-nums">{formatBaht(payload[0].payload.revenue)}</p>
                  </div>
                ) : null}
              />
              <Bar dataKey="revenue" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                {data.map((d) => (
                  <Cell key={d.branch} fill={!selected || d.branch === selected ? CHART.primary : CHART.muted} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Panel>
  );
}

function RecentTable({ items, fresh, names }) {
  return (
    <Panel title="รายการล่าสุด" note={`${RECENT_COUNT} รายการล่าสุดตามเวลาขาย แถวที่เพิ่งเข้ามาจะถูกไฮไลต์ 4 วินาที`}>
      {items.length === 0 ? <Empty /> : (
        <div className="mt-3 -mx-4 overflow-x-auto sm:mx-0">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="text-left text-roast">
              <tr className="border-b border-rule">
                <th className="px-4 py-2 font-medium sm:pl-0">เวลา</th>
                <th className="px-2 py-2 font-medium">สาขา</th>
                <th className="px-2 py-2 font-medium">เมนู</th>
                <th className="px-2 py-2 text-right font-medium">จำนวน</th>
                <th className="px-2 py-2 text-right font-medium">ยอด</th>
                <th className="px-4 py-2 font-medium sm:pr-0">ชำระด้วย</th>
              </tr>
            </thead>
            <tbody>
              {items.map((d) => (
                <tr
                  key={d.id}
                  className={`border-b border-rule last:border-0 transition-colors duration-700 ${fresh.has(d.id) ? "bg-[#fdf1c9]" : ""}`}
                >
                  <td className="px-4 py-2 tabular-nums sm:pl-0">
                    {formatShortThaiDate(d.date)} {time(d.datetime)}
                    {d.source === "web" && <span className="ml-2 rounded-full bg-[#ece8fb] px-2 py-0.5 text-xs text-[#5b52b5]">เว็บ</span>}
                  </td>
                  <td className="px-2 py-2">{d.branch}</td>
                  <td className="px-2 py-2">{names.get(d.product_id) ?? d.product_id}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{d.qty}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{formatBaht(d.revenue)}</td>
                  <td className="px-4 py-2 sm:pr-0">{d.payment_method}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

function Empty({ text = "ไม่มียอดขายในช่วงที่เลือก" }) {
  return <p className="flex h-full items-center justify-center text-sm text-roast">{text}</p>;
}
