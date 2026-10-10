// เลือกแหล่งข้อมูลให้แท็บ Lab 4 (ลูกค้า & เมนู, พยากรณ์ & ผิดปกติ)
//   ?demo           โหลด CSV แล้วคำนวณในเบราว์เซอร์ ไม่ใช้โควตา Firebase
//   ปกติ            อ่าน 5 เอกสารจาก collection analytics ใน Firestore
import { useEffect, useState } from 'react'
import Papa from 'papaparse'
import { prepareRows } from '../lib/metrics'
import { isConfigured } from '../lab3/firebase.js'
import { firestoreSource, createDemoSource } from '../lab3/dataSource.js'
import SetupGuide from '../lab3/SetupGuide.jsx'
import CustomersTab from './CustomersTab.jsx'
import ForecastTab from './ForecastTab.jsx'

export const DEMO = new URLSearchParams(window.location.search).has('demo')

const parse = (url) =>
  new Promise((resolve, reject) =>
    Papa.parse(url, {
      download: true,
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.replace(/^﻿/, '').trim(),
      complete: ({ data }) => resolve(data),
      error: () => reject(new Error(`เปิดไฟล์ public${url} ไม่ได้`)),
    }),
  )

// สร้าง demo source ครั้งเดียวต่อการเปิดหน้า (สลับแท็บไปมาไม่ต้องโหลด CSV ใหม่)
let demoSourcePromise = null
const loadDemoSource = () =>
  (demoSourcePromise ??= Promise.all([parse('/sales.csv'), parse('/products.csv'), parse('/thai_holidays.csv').catch(() => [])])
    .then(([sales, products, hol]) =>
      createDemoSource(prepareRows(sales), products, Object.fromEntries(hol.map((h) => [h.date, h.holiday]))),
    ))

export default function Lab4Loader({ tab }) {
  const [source, setSource] = useState(DEMO ? null : isConfigured ? firestoreSource : null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (DEMO) loadDemoSource().then(setSource).catch((e) => setError(e.message))
  }, [])

  if (!DEMO && !isConfigured) return <SetupGuide />
  if (error) return <p role="alert" className="rounded-2xl border border-crema bg-white p-5 text-espresso">{error}</p>
  if (!source) return <p className="text-roast">กำลังโหลดข้อมูลยอดขายสำหรับโหมดสาธิต…</p>
  return tab === '#forecast' ? <ForecastTab source={source} /> : <CustomersTab source={source} />
}
