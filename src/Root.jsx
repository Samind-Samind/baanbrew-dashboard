// สลับระหว่างหน้า Dashboard หลัก หน้าลูกค้า หน้า Lab 2.2 และหน้า Lab 3 (Firestore) ด้วย #hash ใน URL (ไม่ต้องติดตั้ง router)
import { useEffect, useState } from 'react'
import App from './App.jsx'
import Lab2Loader from './lab2/Lab2Loader.jsx'
import CustomersPage from './customers/CustomersPage.jsx'
import LiveTab from './lab3/LiveTab.jsx'
import RulesTester from './lab3/RulesTester.jsx'
import SetupGuide from './lab3/SetupGuide.jsx'
import { isConfigured } from './lab3/firebase.js'
import Lab4Loader from './lab4/Lab4Loader.jsx'

const PAGES = [
  { hash: '', label: 'Dashboard' },
  { hash: '#customers', label: 'ลูกค้า' },
  { hash: '#lab2', label: 'Lab 2.2 · ซ่อมกราฟ' },
  { hash: '#live', label: 'สด · Firestore' },
  { hash: '#rfm', label: 'ลูกค้า & เมนู' },
  { hash: '#forecast', label: 'พยากรณ์ & ผิดปกติ' },
  { hash: '#rules', label: 'ทดสอบ Rules' },
]
const current = () => PAGES.find((p) => p.hash && p.hash === window.location.hash)?.hash ?? ''

export default function Root() {
  const [page, setPage] = useState(current)

  useEffect(() => {
    const onHash = () => setPage(current())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  // แท็บ Dashboard ลูกค้า และยอดขายสดใช้โทนพาสเทล ส่วนแท็บ Lab 2.2 และทดสอบ Rules คงโทนเดิมไว้
  useEffect(() => {
    document.body.classList.toggle('theme-pastel', ['', '#customers', '#live'].includes(page))
  }, [page])

  return (
    <>
      <nav className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-3 pt-4 sm:px-6">
        {PAGES.map((p) => (
          <a
            key={p.label}
            href={p.hash || '#'}
            aria-current={page === p.hash ? 'page' : undefined}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium ${
              page === p.hash ? 'bg-espresso text-paper' : 'bg-white text-espresso ring-1 ring-rule'
            }`}
          >
            {p.label}
          </a>
        ))}
      </nav>
      {page === '#lab2' ? (
        <main className="mx-auto max-w-6xl px-3 py-6 sm:px-6">
          <Lab2Loader />
        </main>
      ) : page === '#rfm' || page === '#forecast' ? (
        <main className="mx-auto max-w-6xl px-3 py-6 sm:px-6">
          <Lab4Loader tab={page} />
        </main>
      ) : page === '#live' || page === '#rules' ? (
        <main className="mx-auto max-w-6xl px-3 py-6 sm:px-6">
          {!isConfigured ? <SetupGuide /> : page === '#live' ? <LiveTab /> : <RulesTester />}
        </main>
      ) : (
        page === '#customers' ? <CustomersPage /> : <App />
      )}
    </>
  )
}