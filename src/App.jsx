import { useEffect, useMemo, useState } from 'react'
import Papa from 'papaparse'
import { buildFilteredDashboard, cleanRows, daysBack, findMissingColumns, getFilterBounds } from './lib/metrics'
import { formatDayMonth, formatFullDate, formatNumber } from './lib/format'
import KpiStrip from './components/KpiStrip'
import DailySalesChart from './components/DailySalesChart'
import BranchSalesChart from './components/BranchSalesChart'
import { DateRangeFilter, FilterBar, SelectFilter } from './components/FilterBar'

export default function App() {
  const [source, setSource] = useState(null) // { rows, skippedRows, bounds }
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({ from: '', to: '', branch: '' })

  useEffect(() => {
    Papa.parse('/sales.csv', {
      download: true,
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.replace(/^﻿/, '').trim(),
      complete: ({ data: rawRows, meta }) => {
        const fields = meta.fields ?? []
        // Vite ส่ง index.html กลับมาแทน ถ้าไม่พบไฟล์ใน public
        if (fields.some((f) => f.toLowerCase().includes('<!doctype') || f.toLowerCase().includes('<html'))) {
          setError('ไม่พบไฟล์ public/sales.csv ให้วางไฟล์ไว้ในโฟลเดอร์ public ที่อยู่ระดับเดียวกับ package.json แล้วรีเฟรชหน้า')
          return
        }
        const missing = findMissingColumns(fields)
        if (missing.length > 0) {
          setError(`ไฟล์ sales.csv ไม่มีคอลัมน์: ${missing.join(', ')} คอลัมน์ที่อ่านได้คือ: ${fields.join(', ') || '(ไม่มี)'}`)
          return
        }
        const rows = cleanRows(rawRows)
        if (rows.length === 0) {
          setError(`อ่านไฟล์ได้ ${rawRows.length} แถว แต่ไม่มีแถวที่ใช้คำนวณได้ ตรวจรูปแบบ datetime (เช่น 2025-04-01T18:48:40+07:00) และให้ qty, unit_price เป็นตัวเลข`)
          return
        }
        const bounds = getFilterBounds(rows)
        setSource({ rows, skippedRows: rawRows.length - rows.length, bounds })
        setFilters({ from: bounds.min, to: bounds.max, branch: '' })
      },
      error: () => setError('เปิดไฟล์ public/sales.csv ไม่ได้ ตรวจว่าไฟล์อยู่ในโฟลเดอร์ public และชื่อไฟล์ถูกต้อง'),
    })
  }, [])

  const data = useMemo(() => (source ? buildFilteredDashboard(source.rows, filters) : null), [source, filters])

  const bounds = source?.bounds
  const presets = bounds
    ? [
        { label: '7 วันล่าสุด', from: daysBack(bounds.max, 7), to: bounds.max },
        { label: '30 วัน', from: daysBack(bounds.max, 30), to: bounds.max },
        { label: '90 วัน', from: daysBack(bounds.max, 90), to: bounds.max },
        { label: 'ทั้งหมด', from: bounds.min, to: bounds.max },
      ].map((p) => ({ ...p, from: p.from < bounds.min ? bounds.min : p.from }))
    : []
  const isFiltered = bounds && (filters.branch || filters.from !== bounds.min || filters.to !== bounds.max)
  const reset = () => bounds && setFilters({ from: bounds.min, to: bounds.max, branch: '' })

  return (
    <main className="mx-auto max-w-6xl px-3 sm:px-6 py-6 sm:py-12 space-y-4 sm:space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl sm:text-4xl font-bold">บ้านบรู Dashboard</h1>
          {data?.dateRange && (
            <p className="mt-1 text-sm sm:text-base text-roast">
              ยอดขาย{filters.branch ? ` สาขา${filters.branch}` : ''} {formatDayMonth(data.dateRange.from)} ถึง {formatFullDate(data.dateRange.to)}
            </p>
          )}
        </div>
        {source?.skippedRows > 0 && (
          <p className="text-sm text-roast">ข้าม {formatNumber(source.skippedRows)} แถวที่ข้อมูลไม่ครบ</p>
        )}
      </header>

      {error && (
        <p role="alert" className="rounded-2xl border border-crema bg-white p-5 text-espresso">{error}</p>
      )}

      {!data && !error && <p className="text-roast">กำลังโหลดข้อมูลยอดขาย…</p>}

      {data && (
        <>
          <FilterBar
            summary={`แสดง ${formatNumber(data.rowCount)} จาก ${formatNumber(source.rows.length)} รายการสินค้า`}
            onReset={reset}
            canReset={isFiltered}
          >
            <DateRangeFilter
              from={filters.from}
              to={filters.to}
              min={bounds.min}
              max={bounds.max}
              presets={presets}
              onChange={(range) => setFilters((f) => ({ ...f, ...range }))}
            />
            <SelectFilter
              label="สาขา"
              value={filters.branch}
              allLabel="ทุกสาขา"
              options={bounds.branches.map((b) => ({ value: b, label: b }))}
              onChange={(branch) => setFilters((f) => ({ ...f, branch }))}
            />
          </FilterBar>

          {data.rowCount === 0 ? (
            <p className="rounded-2xl border border-rule bg-white p-5 text-roast">ไม่มียอดขายในช่วงที่เลือก ลองขยายช่วงวันที่หรือเลือกทุกสาขา</p>
          ) : (
            <>
              <KpiStrip data={data} />
              <DailySalesChart data={data.daily} />
              <BranchSalesChart data={data.byBranch} selected={filters.branch} />
            </>
          )}
        </>
      )}
    </main>
  )
}
