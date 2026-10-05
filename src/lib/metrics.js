// ทุกการคำนวณของ Dashboard อยู่ในไฟล์นี้ (ไม่มี React, ทดสอบแยกได้)

const BANGKOK_DATE = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Bangkok',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

// คอลัมน์ที่ต้องมีใน CSV ถึงจะคำนวณได้
export const REQUIRED_COLUMNS = ['order_id', 'datetime', 'branch', 'qty', 'unit_price', 'customer_id']

// คืนรายชื่อคอลัมน์ที่ขาดไป (ถ้าครบจะได้ array ว่าง)
export function findMissingColumns(fields = []) {
  const have = new Set(fields.map((f) => String(f).replace(/^\uFEFF/, '').trim()))
  return REQUIRED_COLUMNS.filter((c) => !have.has(c))
}

const round2 = (n) => Math.round(n * 100) / 100

const toNumber = (value) => {
  const text = String(value ?? '').replace(/,/g, '').trim()
  if (text === '') return NaN
  const n = Number(text)
  return Number.isFinite(n) ? n : NaN
}

// แปลง datetime เป็นวันที่ตามเวลาไทย รูปแบบ YYYY-MM-DD
export function toThaiDateKey(datetime) {
  const d = new Date(String(datetime ?? '').trim())
  return Number.isNaN(d.getTime()) ? null : BANGKOK_DATE.format(d)
}

// แปลงแถวดิบจาก PapaParse ให้พร้อมคำนวณ และตัดแถวที่ข้อมูลไม่ครบ
export function cleanRows(rawRows) {
  const rows = []
  for (const raw of rawRows) {
    const orderId = String(raw.order_id ?? '').trim()
    const qty = toNumber(raw.qty)
    const unitPrice = toNumber(raw.unit_price)
    const date = toThaiDateKey(raw.datetime)
    if (!orderId || !date || Number.isNaN(qty) || Number.isNaN(unitPrice)) continue

    const customerId = String(raw.customer_id ?? '').trim()
    rows.push({
      orderId,
      date,
      branch: String(raw.branch ?? '').trim() || 'ไม่ระบุสาขา',
      productId: String(raw.product_id ?? '').trim(),
      qty,
      unitPrice,
      amount: qty * unitPrice,
      customerId: customerId || null, // null = ลูกค้าทั่วไป
      paymentMethod: String(raw.payment_method ?? '').trim(),
      channel: String(raw.channel ?? '').trim(),
    })
  }
  return rows
}

export function calcTotalSales(rows) {
  return round2(rows.reduce((sum, r) => sum + r.amount, 0))
}

export function countOrders(rows) {
  return new Set(rows.map((r) => r.orderId)).size
}

export function calcAverageOrderValue(rows) {
  const orders = countOrders(rows)
  return orders === 0 ? 0 : round2(calcTotalSales(rows) / orders)
}

export function countUniqueMembers(rows) {
  const members = new Set()
  for (const r of rows) if (r.customerId) members.add(r.customerId)
  return members.size
}

// เพิ่มวันทีละ 1 วัน บนสตริง YYYY-MM-DD (คำนวณแบบ UTC เพื่อไม่ให้เพี้ยนตาม timezone เครื่อง)
function nextDateKey(key) {
  const d = new Date(`${key}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

// ยอดขายรายวัน เรียงตามวันที่ วันที่ไม่มีการขายจะแสดงเป็น 0
export function getDailySales(rows) {
  if (rows.length === 0) return []
  const byDate = new Map()
  for (const r of rows) byDate.set(r.date, (byDate.get(r.date) ?? 0) + r.amount)

  const keys = [...byDate.keys()].sort()
  const last = keys[keys.length - 1]
  const result = []
  for (let key = keys[0]; key <= last; key = nextDateKey(key)) {
    result.push({ date: key, sales: round2(byDate.get(key) ?? 0) })
  }
  return result
}

// เพิ่มค่าเฉลี่ยเคลื่อนที่ย้อนหลัง (ค่าเริ่มต้น 7 วัน) ให้ข้อมูลรายวันที่เรียงวันและเติมวันว่างแล้ว
// วันที่มีข้อมูลย้อนหลังไม่ครบตามจำนวนวันจะได้ค่า null และกราฟจะไม่วาดเส้นช่วงนั้น
export function addMovingAverage(daily, windowDays = 7) {
  let runningSum = 0
  return daily.map((day, i) => {
    runningSum += day.sales
    if (i >= windowDays) runningSum -= daily[i - windowDays].sales
    const avg = i >= windowDays - 1 ? round2(runningSum / windowDays) : null
    return { ...day, avg7: avg }
  })
}

// ยอดขายแยกสาขา เรียงจากมากไปน้อย
export function getSalesByBranch(rows) {
  const byBranch = new Map()
  for (const r of rows) byBranch.set(r.branch, (byBranch.get(r.branch) ?? 0) + r.amount)
  return [...byBranch]
    .map(([branch, sales]) => ({ branch, sales: round2(sales) }))
    .sort((a, b) => b.sales - a.sales)
}

// รวมทุกตัวเลขที่หน้า Dashboard ใช้ไว้ในที่เดียว
export function buildDashboard(rawRows) {
  const rows = cleanRows(rawRows)
  return { ...buildFilteredDashboard(rows), skippedRows: rawRows.length - rows.length }
}

// ---------- ตัวกรองของแท็บ Dashboard ----------

// วันแรก/วันสุดท้ายที่มีข้อมูล และรายชื่อสาขา (ใช้ตั้งค่าตัวกรอง)
export function getFilterBounds(rows) {
  let min = null
  let max = null
  const branches = new Set()
  for (const r of rows) {
    if (min === null || r.date < min) min = r.date
    if (max === null || r.date > max) max = r.date
    branches.add(r.branch)
  }
  return { min, max, branches: [...branches].sort((a, b) => a.localeCompare(b, 'th')) }
}

// ย้อนหลัง n วันจาก dateKey (นับรวมวันนั้น) เช่น daysBack('2026-09-20', 7) = '2026-09-14'
export function daysBack(dateKey, n) {
  const d = new Date(`${dateKey}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - (n - 1))
  return d.toISOString().slice(0, 10)
}

// filters = { from, to, branch } · branch ว่าง = ทุกสาขา
// - KPI และกราฟรายวัน: กรองทั้งช่วงวันที่และสาขา
// - ค่าเฉลี่ย 7 วัน: คิดจากข้อมูลก่อนตัดช่วงวันที่ วันแรกของช่วงจึงมีค่าเฉลี่ยทันที
// - กราฟแยกสาขา: กรองแค่ช่วงวันที่ เพื่อให้ยังเทียบกับสาขาอื่นได้ (หน้าจอจะเน้นสาขาที่เลือก)
export function buildFilteredDashboard(rows, filters = {}) {
  const { from = null, to = null, branch = '' } = filters
  const inRange = (r) => (!from || r.date >= from) && (!to || r.date <= to)
  const branchRows = branch ? rows.filter((r) => r.branch === branch) : rows
  const filtered = branchRows.filter(inRange)

  const dailyAll = addMovingAverage(getDailySales(branchRows), 7)
  const daily = dailyAll.filter((d) => (!from || d.date >= from) && (!to || d.date <= to))

  return {
    rowCount: filtered.length,
    skippedRows: 0,
    totalSales: calcTotalSales(filtered),
    orderCount: countOrders(filtered),
    averageOrderValue: calcAverageOrderValue(filtered),
    uniqueMembers: countUniqueMembers(filtered),
    daily,
    byBranch: getSalesByBranch(rows.filter(inRange)),
    dateRange: daily.length ? { from: daily[0].date, to: daily[daily.length - 1].date } : null,
  }
}

// ---------- สำหรับ Lab 2.2 (src/lab2) ----------
const BANGKOK_HOUR = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', hourCycle: 'h23' })

// แถวที่ทำความสะอาดแล้ว + ชื่อฟิลด์ที่ lab2Metrics.js ใช้ (product_id, revenue, hour)
export function prepareRows(rawRows) {
  const rows = []
  for (const raw of rawRows) {
    const [r] = cleanRows([raw])
    if (!r) continue
    rows.push({ ...r, product_id: r.productId, revenue: r.amount, hour: Number(BANGKOK_HOUR.format(new Date(String(raw.datetime).trim()))) })
  }
  return rows
}

// ยอดขายรายวันในรูป { date, revenue } (ใช้ใน BadChart3)
export function dailyRevenue(rows) {
  return getDailySales(rows).map((d) => ({ date: d.date, revenue: d.sales }))
}
