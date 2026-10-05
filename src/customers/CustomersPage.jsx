// หน้า Dashboard ลูกค้า · อ่าน customers.csv + branches.csv (ชื่อสาขา) + sales.csv (การซื้อซ้ำ)
import { useEffect, useMemo, useState } from 'react'
import Papa from 'papaparse'
import {
  buildCustomerDashboard,
  buildRepeatByMonth,
  filterCustomers,
  findMissingCustomerColumns,
  getCustomerFilterBounds,
  prepareCustomers,
  prepareMemberOrders,
} from '../lib/customerMetrics'
import { toThaiDateKey } from '../lib/metrics'
import { formatFullDate, formatMonthName, formatNumber, formatThaiYear } from '../lib/format'
import { FilterBar, SelectFilter } from '../components/FilterBar'
import CustomerKpiCards from './CustomerKpiCards'
import NewCustomersChart from './NewCustomersChart'
import BranchSignupChart, { BranchTable } from './BranchSignupChart'
import NeverBoughtChart from './NeverBoughtChart'
import RepeatBuyersChart from './RepeatBuyersChart'

const parse = (url) =>
  new Promise((resolve, reject) =>
    Papa.parse(url, {
      download: true,
      header: true,
      skipEmptyLines: true,
      // ไฟล์ CSV มี BOM อยู่หน้าหัวคอลัมน์แรก ต้องตัดออกก่อน
      transformHeader: (h) => h.replace(/^﻿/, '').trim(),
      complete: ({ data, meta }) => {
        const fields = meta.fields ?? []
        // Vite ส่ง index.html กลับมาแทน ถ้าไม่พบไฟล์ใน public
        if (fields.some((f) => f.toLowerCase().includes('<!doctype') || f.toLowerCase().includes('<html'))) {
          reject(new Error(`ไม่พบไฟล์ public${url} ให้วางไฟล์ไว้ในโฟลเดอร์ public แล้วรีเฟรชหน้า`))
        } else resolve({ data, fields })
      },
      error: () => reject(new Error(`เปิดไฟล์ public${url} ไม่ได้`)),
    }),
  )

// year = ปี ค.ศ. 'YYYY', month = 'MM' · ค่าว่าง = ทุกปี / ทุกเดือน (ต้องเลือกปีก่อนจึงเลือกเดือนได้)
const EMPTY_FILTERS = { year: '', month: '', branch: '', gender: '' }

// แปลงปี + เดือนที่เลือก เป็นช่วงเดือน YYYY-MM ที่ใช้กรองและเป็นแกนของกราฟ
function toMonthRange({ year, month }, months) {
  const inYear = year ? months.filter((m) => m.startsWith(`${year}-`)) : months
  if (year && month) return { fromMonth: `${year}-${month}`, toMonth: `${year}-${month}` }
  return { fromMonth: inYear[0], toMonth: inYear[inYear.length - 1] }
}

export default function CustomersPage() {
  const [state, setState] = useState({ customers: null, skipped: 0, branchNames: {}, branchOpened: {}, sales: null, error: null })
  const [filters, setFilters] = useState(EMPTY_FILTERS)

  useEffect(() => {
    // branches.csv และ sales.csv ไม่บังคับ: ถ้าไม่มี หน้ายังแสดงส่วนอื่นได้
    const branchesReq = parse('/branches.csv').catch(() => ({ data: [] }))
    const salesReq = parse('/sales.csv').catch(() => null)
    Promise.all([parse('/customers.csv'), branchesReq, salesReq])
      .then(([cust, br, sales]) => {
        const missing = findMissingCustomerColumns(cust.fields)
        if (missing.length > 0) {
          throw new Error(`ไฟล์ customers.csv ไม่มีคอลัมน์: ${missing.join(', ')} คอลัมน์ที่อ่านได้คือ: ${cust.fields.join(', ') || '(ไม่มี)'}`)
        }
        const { customers, skipped } = prepareCustomers(cust.data)
        if (customers.length === 0) {
          throw new Error(`อ่านไฟล์ได้ ${cust.data.length} แถว แต่ไม่มีแถวที่ใช้ได้ ตรวจว่า joined_date อยู่ในรูปแบบ YYYY-MM-DD`)
        }
        const branchNames = Object.fromEntries(br.data.map((b) => [b.branch_id, b.branch]).filter(([id, name]) => id && name))
        const branchOpened = Object.fromEntries(br.data.map((b) => [b.branch_id, b.opened_date]).filter(([id, d]) => id && /^\d{4}-\d{2}-\d{2}$/.test(d ?? '')))
        const memberOrders = sales ? prepareMemberOrders(sales.data, toThaiDateKey) : null
        setState({ customers, skipped, branchNames, branchOpened, sales: memberOrders, error: null })
      })
      .catch((e) => setState((s) => ({ ...s, error: e.message })))
  }, [])

  const bounds = useMemo(() => (state.customers ? getCustomerFilterBounds(state.customers) : null), [state.customers])
  const range = useMemo(() => (bounds ? toMonthRange(filters, bounds.months) : null), [bounds, filters])
  const filtered = useMemo(
    () => (state.customers && range ? filterCustomers(state.customers, { ...range, branch: filters.branch, gender: filters.gender }) : null),
    [state.customers, range, filters.branch, filters.gender],
  )

  const data = useMemo(() => {
    if (!filtered || !bounds) return null
    return buildCustomerDashboard(filtered, state.branchNames, state.branchOpened, {
      ...range,
      dataEnd: bounds.dataEnd,
      branchOrder: bounds.branches,
    })
  }, [filtered, bounds, range, state.branchNames, state.branchOpened])

  const repeat = useMemo(() => {
    if (!state.sales || !filtered) return null
    const all = filtered.length === state.customers.length
    return buildRepeatByMonth(state.sales.orders, all ? null : new Set(filtered.map((c) => c.id)), state.sales.salesEnd)
  }, [state.sales, state.customers, filtered])

  const isFiltered = Boolean(filters.year || filters.month || filters.branch || filters.gender)
  const reset = () => setFilters(EMPTY_FILTERS)
  const set = (patch) => setFilters((f) => ({ ...f, ...patch }))

  const years = bounds ? [...new Set(bounds.months.map((m) => m.slice(0, 4)))] : []
  // เดือนที่มีข้อมูลในปีที่เลือก (เช่น ปี 2568 เริ่มที่เมษายน)
  const monthsOfYear = bounds && filters.year ? bounds.months.filter((m) => m.startsWith(`${filters.year}-`)).map((m) => m.slice(5)) : []

  return (
    <main className="mx-auto max-w-6xl px-3 sm:px-6 py-6 sm:py-12 space-y-4 sm:space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl sm:text-4xl font-bold">ลูกค้าบ้านบรู</h1>
          {data?.total > 0 && (
            <p className="mt-1 text-sm sm:text-base text-roast">
              สมาชิกที่สมัครตั้งแต่ {formatFullDate(data.firstDate)} ถึง {formatFullDate(data.lastDate)}
            </p>
          )}
        </div>
        {state.skipped > 0 && <p className="text-sm text-roast">ข้าม {formatNumber(state.skipped)} แถวที่ข้อมูลไม่ครบหรือซ้ำ</p>}
      </header>

      {state.error && (
        <p role="alert" className="rounded-2xl border border-crema bg-white p-5 text-espresso">{state.error}</p>
      )}

      {!data && !state.error && <p className="text-roast">กำลังโหลดข้อมูลลูกค้า…</p>}

      {data && bounds && (
        <>
          <FilterBar
            summary={`แสดง ${formatNumber(filtered.length)} จาก ${formatNumber(state.customers.length)} คน`}
            onReset={reset}
            canReset={isFiltered}
          >
            <SelectFilter
              label="ปีที่สมัคร (พ.ศ.)"
              value={filters.year}
              allLabel="ทุกปี"
              options={years.map((y) => ({ value: y, label: formatThaiYear(y) }))}
              onChange={(year) => set({ year, month: '' })}
            />
            <SelectFilter
              label="เดือนที่สมัคร"
              value={filters.month}
              allLabel={filters.year ? 'ทุกเดือน' : 'เลือกปีก่อน'}
              disabled={!filters.year}
              options={monthsOfYear.map((mm) => ({ value: mm, label: formatMonthName(mm) }))}
              onChange={(month) => set({ month })}
            />
            <SelectFilter
              label="สาขาบ้าน"
              value={filters.branch}
              allLabel="ทุกสาขา"
              options={bounds.branches.map((id) => ({ value: id, label: state.branchNames[id] ?? id }))}
              onChange={(branch) => set({ branch })}
            />
            <SelectFilter
              label="เพศ"
              value={filters.gender}
              allLabel="ทุกเพศ"
              options={bounds.genders.map((g) => ({ value: g, label: g }))}
              onChange={(gender) => set({ gender })}
            />
          </FilterBar>

          {data.total === 0 ? (
            <p className="rounded-2xl border border-rule bg-white p-5 text-roast">ไม่มีลูกค้าที่ตรงกับตัวกรอง ลองขยายช่วงเดือนหรือเลือกทุกสาขา</p>
          ) : (
            <>
              <CustomerKpiCards data={data} grandTotal={isFiltered ? state.customers.length : null} />
              <NewCustomersChart data={data.monthly} partialMonth={data.partialMonth} lastDate={bounds.dataEnd} />
              {repeat && <RepeatBuyersChart data={repeat} salesEnd={state.sales.salesEnd} />}
              <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
                <BranchSignupChart data={data.byBranch} branches={data.branches} partialMonth={data.partialMonth} />
                <NeverBoughtChart data={data.cohort} partialMonth={data.partialMonth} />
              </div>
              <BranchTable data={data.byBranch} branches={data.branches} />
            </>
          )}
        </>
      )}
    </main>
  )
}
