// สลับระหว่างหน้า Dashboard หลักกับหน้า Lab 2.2 ด้วย #hash ใน URL (ไม่ต้องติดตั้ง router)
import { useEffect, useState } from 'react'
import App from './App.jsx'
import Lab2Loader from './lab2/Lab2Loader.jsx'

const PAGES = [
  { hash: '', label: 'Dashboard' },
  { hash: '#lab2', label: 'Lab 2.2 · ซ่อมกราฟ' },
]
const current = () => (window.location.hash === '#lab2' ? '#lab2' : '')

export default function Root() {
  const [page, setPage] = useState(current)

  useEffect(() => {
    const onHash = () => setPage(current())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  return (
    <>
      <nav className="mx-auto flex max-w-6xl gap-2 px-3 pt-4 sm:px-6">
        {PAGES.map((p) => (
          <a
            key={p.label}
            href={p.hash || '#'}
            aria-current={page === p.hash ? 'page' : undefined}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
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
      ) : (
        <App />
      )}
    </>
  )
}