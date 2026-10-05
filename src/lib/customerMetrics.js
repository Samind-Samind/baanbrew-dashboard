// คำนวณตัวเลขสำหรับหน้า Dashboard ลูกค้า จาก public/customers.csv

export const REQUIRED_CUSTOMER_COLUMNS = [
  'customer_id',
  'home_branch_id',
  'joined_date',
  'flag_dup_phone',
  'flag_minor',
  'flag_never_bought',
  'flag_home_ne_top_branch',
]

export const findMissingCustomerColumns = (fields) =>
  REQUIRED_CUSTOMER_COLUMNS.filter((c) => !fields.includes(c))

// flag ในไฟล์เป็นข้อความ "True" / "False" จึงแปลงเอง ไม่พึ่ง dynamicTyping
const toBool = (v) => {
  const s = String(v ?? '').trim().toLowerCase()
  return s === 'true' || s === '1' || s === 'y' || s === 'yes'
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const isValidDate = (s) => DATE_RE.test(s) && !Number.isNaN(new Date(`${s}T00:00:00Z`).getTime())

// แปลงแถวดิบเป็น object ที่ใช้คำนวณ และข้ามแถวที่ไม่มีรหัสลูกค้าหรือวันที่สมัครไม่ถูกต้อง
export function prepareCustomers(rows) {
  const seen = new Set()
  const customers = []
  let skipped = 0
  for (const r of rows) {
    const id = String(r.customer_id ?? '').trim()
    const joined = String(r.joined_date ?? '').trim()
    if (!id || seen.has(id) || !isValidDate(joined)) {
      skipped += 1
      continue
    }
    seen.add(id)
    customers.push({
      id,
      branch: String(r.home_branch_id ?? '').trim() || 'ไม่ระบุ',
      gender: String(r.gender ?? '').trim() || 'ไม่ระบุ',
      joined,
      month: joined.slice(0, 7),
      dupPhone: toBool(r.flag_dup_phone),
      minor: toBool(r.flag_minor),
      neverBought: toBool(r.flag_never_bought),
      homeMismatch: toBool(r.flag_home_ne_top_branch),
    })
  }
  return { customers, skipped }
}

// รายชื่อเดือน YYYY-MM ตั้งแต่ from ถึง to (รวมทั้งสองฝั่ง) ใช้เติมเดือนที่ไม่มีคนสมัครเป็น 0
function monthRange(from, to) {
  const out = []
  let [y, m] = from.split('-').map(Number)
  const [ty, tm] = to.split('-').map(Number)
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${String(m).padStart(2, '0')}`)
    m += 1
    if (m > 12) { m = 1; y += 1 }
  }
  return out
}

export const lastDayOfMonth = (month) => {
  const [y, m] = month.split('-').map(Number)
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10)
}

const pct = (part, whole) => (whole > 0 ? (part / whole) * 100 : 0)

// ขอบเขตของตัวกรองแท็บลูกค้า: รายชื่อเดือนที่มีคนสมัคร สาขา เพศ และวันสุดท้ายของข้อมูล
export function getCustomerFilterBounds(customers) {
  const dates = customers.map((c) => c.joined).sort()
  const genderOrder = ['หญิง', 'ชาย', 'ไม่ระบุ']
  const rank = (g) => (genderOrder.includes(g) ? genderOrder.indexOf(g) : 99)
  return {
    months: monthRange(dates[0].slice(0, 7), dates[dates.length - 1].slice(0, 7)),
    dataEnd: dates[dates.length - 1],
    branches: [...new Set(customers.map((c) => c.branch))].sort(),
    genders: [...new Set(customers.map((c) => c.gender))].sort((a, b) => rank(a) - rank(b)),
  }
}

// filters = { fromMonth, toMonth, branch, gender } · ค่าว่าง = ไม่กรอง
export const filterCustomers = (customers, { fromMonth, toMonth, branch, gender } = {}) =>
  customers.filter(
    (c) =>
      (!fromMonth || c.month >= fromMonth) &&
      (!toMonth || c.month <= toMonth) &&
      (!branch || c.branch === branch) &&
      (!gender || c.gender === gender),
  )

// branchOpened: { B03: '2025-11-01', ... } ใช้ซ่อนเส้นของสาขาในเดือนก่อนเปิด (ไม่ใช่ 0 คน แต่ยังไม่มีสาขา)
// options.fromMonth / toMonth: แกนเดือนของกราฟ (ค่าเริ่มต้นคือเดือนแรก–สุดท้ายที่มีคนสมัคร)
// options.dataEnd: วันสุดท้ายของข้อมูลทั้งไฟล์ ใช้ตัดสินว่าเดือนสุดท้ายข้อมูลไม่ครบหรือไม่
//   (ต้องใช้ของทั้งไฟล์ ไม่ใช่ของแถวที่กรองแล้ว ไม่อย่างนั้นเดือนที่ครบจะถูกมองว่าไม่ครบ)
// options.branchOrder: รายชื่อสาขาทั้งหมด เพื่อให้สีของแต่ละสาขาคงที่แม้จะกรองเหลือสาขาเดียว
export function buildCustomerDashboard(customers, branchNames = {}, branchOpened = {}, options = {}) {
  const total = customers.length
  if (total === 0) return { total: 0 }

  const dates = customers.map((c) => c.joined).sort()
  const firstDate = dates[0]
  const lastDate = dates[dates.length - 1]
  const dataEnd = options.dataEnd ?? lastDate
  const months = monthRange(options.fromMonth ?? firstDate.slice(0, 7), options.toMonth ?? lastDate.slice(0, 7))
  // เดือนสุดท้ายนับว่าไม่ครบ ถ้าข้อมูลยังไปไม่ถึงวันสุดท้ายของเดือน
  const lastMonth = months[months.length - 1]
  const lastMonthPartial = dataEnd < lastDayOfMonth(lastMonth)

  const branches = [...new Set(customers.map((c) => c.branch))].sort()
  const byMonth = new Map(
    months.map((m) => [m, { count: 0, never: 0, branches: Object.fromEntries(branches.map((b) => [b, 0])) }]),
  )
  for (const c of customers) {
    const row = byMonth.get(c.month)
    if (!row) continue
    row.count += 1
    row.branches[c.branch] += 1
    if (c.neverBought) row.never += 1
  }

  // กราฟลูกค้าใหม่: เดือนที่ครบใช้ key "count" ส่วนช่วงเดือนที่ไม่ครบใช้ "partialCount" (เส้นประ)
  let cumulative = 0
  const monthly = months.map((m, i) => {
    const { count } = byMonth.get(m)
    cumulative += count
    const isPartial = lastMonthPartial && i === months.length - 1
    const bridgesToPartial = lastMonthPartial && i === months.length - 2
    return {
      month: m,
      count: isPartial ? null : count,
      partialCount: isPartial || bridgesToPartial ? count : null,
      value: count,
      cumulative,
      partial: isPartial,
    }
  })

  // กราฟแยกสาขา: ไม่รวมเดือนที่ไม่ครบ เพราะทุกเส้นจะดิ่งลงพร้อมกันจนอ่านแนวโน้มผิด
  const completeMonths = lastMonthPartial ? months.slice(0, -1) : months
  const openedMonth = (id) => (branchOpened[id] ? branchOpened[id].slice(0, 7) : null)
  const byBranch = completeMonths.map((m) => {
    const row = { month: m }
    for (const b of branches) {
      const opened = openedMonth(b)
      row[b] = opened && m < opened ? null : byMonth.get(m).branches[b]
    }
    return row
  })

  // % ไม่เคยซื้อ ตามเดือนที่สมัคร (cohort)
  const cohort = months.map((m, i) => {
    const { count, never } = byMonth.get(m)
    const isPartial = lastMonthPartial && i === months.length - 1
    const bridgesToPartial = lastMonthPartial && i === months.length - 2
    const rate = count > 0 ? pct(never, count) : null
    return {
      month: m,
      rate: isPartial ? null : rate,
      partialRate: isPartial || bridgesToPartial ? rate : null,
      value: rate,
      never,
      count,
      partial: isPartial,
    }
  })

  // KPI ลูกค้าใหม่: ใช้เดือนล่าสุดที่ครบเดือน เทียบกับเดือนก่อนหน้า
  const latestFull = completeMonths[completeMonths.length - 1] ?? null
  const prevFull = completeMonths[completeMonths.length - 2] ?? null
  const latestCount = latestFull ? byMonth.get(latestFull).count : 0
  const prevCount = prevFull ? byMonth.get(prevFull).count : null
  const changePct = prevCount ? pct(latestCount - prevCount, prevCount) : null

  const count = (key) => customers.filter((c) => c[key]).length
  const neverCount = count('neverBought')
  const dupCount = count('dupPhone')
  const minorCount = count('minor')
  const mismatchCount = count('homeMismatch')

  return {
    total,
    firstDate,
    lastDate,
    lastMonthPartial,
    partialMonth: lastMonthPartial ? lastMonth : null,
    branches: branches.map((id) => ({
      id,
      name: branchNames[id] ?? id,
      colorIndex: Math.max(0, (options.branchOrder ?? branches).indexOf(id)),
      // เปิดสาขาระหว่างช่วงข้อมูล (ใช้เขียนหมายเหตุใต้กราฟ)
      openedInRange: openedMonth(id) && openedMonth(id) > months[0] && openedMonth(id) <= lastMonth ? openedMonth(id) : null,
    })),
    kpis: {
      newCustomers: { month: latestFull, count: latestCount, prevMonth: prevFull, prevCount, changePct },
      boughtPct: pct(total - neverCount, total),
      neverCount,
      dupPct: pct(dupCount, total),
      dupCount,
      minorPct: pct(minorCount, total),
      minorCount,
      mismatchPct: pct(mismatchCount, total),
      mismatchCount,
    },
    monthly,
    byBranch,
    cohort,
  }
}

// ---------- ลูกค้าเก่ากลับมาซื้อ (ใช้ sales.csv) ----------

// แปลงแถวยอดขายเป็นรายการบิลของสมาชิก { customerId, month } (1 บิลมีหลายแถวสินค้า จึงเก็บบิลละครั้ง)
// datetimeToDate: ฟังก์ชันแปลง datetime เป็น YYYY-MM-DD ตามเวลาไทย
export function prepareMemberOrders(salesRows, datetimeToDate) {
  const orders = new Map()
  let salesEnd = null
  for (const r of salesRows) {
    const date = datetimeToDate(r.datetime)
    if (!date) continue
    if (salesEnd === null || date > salesEnd) salesEnd = date
    const orderId = String(r.order_id ?? '').trim()
    const customerId = String(r.customer_id ?? '').trim()
    if (!orderId || !customerId || orders.has(orderId)) continue
    orders.set(orderId, { customerId, month: date.slice(0, 7) })
  }
  return { orders: [...orders.values()], salesEnd }
}

// ต่อเดือน: สมาชิกที่ซื้อในเดือนนั้น แบ่งเป็น
//   firstTime = เดือนนี้เป็นเดือนแรกที่เคยซื้อ
//   returning = เคยซื้อในเดือนก่อน ๆ แล้วกลับมาซื้ออีก
// customerIds: Set ของลูกค้าที่ผ่านตัวกรอง (null = ทุกคน) · แกนเดือนใช้ช่วงของยอดขายทั้งไฟล์เสมอ
export function buildRepeatByMonth(orders, customerIds, salesEnd) {
  if (orders.length === 0) return []
  const firstMonth = new Map()
  let minMonth = null
  let maxMonth = null
  for (const o of orders) {
    const f = firstMonth.get(o.customerId)
    if (!f || o.month < f) firstMonth.set(o.customerId, o.month)
    if (minMonth === null || o.month < minMonth) minMonth = o.month
    if (maxMonth === null || o.month > maxMonth) maxMonth = o.month
  }
  const buyers = new Map(monthRange(minMonth, maxMonth).map((m) => [m, new Set()]))
  for (const o of orders) {
    if (customerIds && !customerIds.has(o.customerId)) continue
    buyers.get(o.month).add(o.customerId)
  }
  return [...buyers].map(([month, set]) => {
    let firstTime = 0
    for (const id of set) if (firstMonth.get(id) === month) firstTime += 1
    const returning = set.size - firstTime
    return {
      month,
      returning,
      firstTime,
      total: set.size,
      returningPct: set.size ? (returning / set.size) * 100 : null,
      partial: month === maxMonth && salesEnd < lastDayOfMonth(month),
    }
  })
}
