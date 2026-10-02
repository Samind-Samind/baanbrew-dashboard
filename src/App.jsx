import { useEffect, useState } from 'react'
import Papa from 'papaparse'
import { buildDashboard, findMissingColumns } from './lib/metrics'
import { formatDayMonth, formatFullDate, formatNumber } from './lib/format'
import KpiStrip from './components/KpiStrip'
import DailySalesChart from './components/DailySalesChart'
import BranchSalesChart from './components/BranchSalesChart'

export default function App() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    Papa.parse('/sales.csv', {
      download: true,
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.replace(/^\uFEFF/, '').trim(),
      complete: ({ data: rows, meta }) => {
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
        const result = buildDashboard(rows)
        if (result.rowCount === 0) {
          setError(`อ่านไฟล์ได้ ${rows.length} แถว แต่ไม่มีแถวที่ใช้คำนวณได้ ตรวจรูปแบบ datetime (เช่น 2025-04-01T18:48:40+07:00) และให้ qty, unit_price เป็นตัวเลข`)
          return
        }
        setData(result)
      },
      error: () => setError('เปิดไฟล์ public/sales.csv ไม่ได้ ตรวจว่าไฟล์อยู่ในโฟลเดอร์ public และชื่อไฟล์ถูกต้อง'),
    })
  }, [])

  return (
    <main className="mx-auto max-w-6xl px-3 sm:px-6 py-6 sm:py-12 space-y-4 sm:space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl sm:text-4xl font-bold">บ้านบรู Dashboard</h1>
          {data?.dateRange && (
            <p className="mt-1 text-sm sm:text-base text-roast">
              ยอดขาย {formatDayMonth(data.dateRange.from)} ถึง {formatFullDate(data.dateRange.to)}
            </p>
          )}
        </div>
        {data?.skippedRows > 0 && (
          <p className="text-sm text-roast">ข้าม {formatNumber(data.skippedRows)} แถวที่ข้อมูลไม่ครบ</p>
        )}
      </header>

      {error && (
        <p role="alert" className="rounded-2xl border border-crema bg-white p-5 text-espresso">{error}</p>
      )}

      {!data && !error && <p className="text-roast">กำลังโหลดข้อมูลยอดขาย…</p>}

      {data && (
        <>
          <KpiStrip data={data} />
          <DailySalesChart data={data.daily} />
          <BranchSalesChart data={data.byBranch} />
        </>
      )}
    </main>
  )
}
