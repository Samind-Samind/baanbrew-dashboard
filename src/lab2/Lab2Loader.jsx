// โหลดข้อมูลให้หน้า Lab 2.2 · อ่าน sales.csv + products.csv แล้วส่ง { rows, products } ให้ Lab2Page
import { useEffect, useState } from 'react'
import Papa from 'papaparse'
import { prepareRows } from '../lib/metrics'
import Lab2Page from './Lab2Page.jsx'

const parse = (url) =>
  new Promise((resolve, reject) =>
    Papa.parse(url, {
      download: true,
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.replace(/^\uFEFF/, '').trim(),
      complete: ({ data, meta }) => {
        // Vite ส่ง index.html กลับมาแทน ถ้าไม่พบไฟล์ใน public
        if ((meta.fields ?? []).some((f) => f.toLowerCase().includes('<!doctype') || f.toLowerCase().includes('<html'))) {
          reject(new Error(`ไม่พบไฟล์ public${url}`))
        } else resolve(data)
      },
      error: () => reject(new Error(`เปิดไฟล์ public${url} ไม่ได้`)),
    }),
  )

export default function Lab2Loader() {
  const [state, setState] = useState({ rows: null, products: null, error: null })

  useEffect(() => {
    Promise.all([parse('/sales.csv'), parse('/products.csv')])
      .then(([sales, products]) => setState({ rows: prepareRows(sales), products, error: null }))
      .catch((e) => setState({ rows: null, products: null, error: e.message }))
  }, [])

  if (state.error) return <p role="alert" className="rounded-2xl border border-crema bg-white p-5 text-espresso">{state.error}</p>
  if (!state.rows) return <p className="text-roast">กำลังโหลดข้อมูล Lab 2.2…</p>
  return <Lab2Page rows={state.rows} products={state.products} />
}