import { useEffect, useState } from 'react'

// true เมื่อจอกว้างน้อยกว่า 640px (ตรงกับ breakpoint sm ของ Tailwind)
export default function useIsMobile(query = '(max-width: 639px)') {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia(query).matches,
  )

  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = (e) => setIsMobile(e.matches)
    setIsMobile(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return isMobile
}
