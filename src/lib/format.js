// ฟังก์ชันจัดรูปแบบตัวเลขและวันที่สำหรับแสดงผล

const bahtFormatter = new Intl.NumberFormat('th-TH', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const intFormatter = new Intl.NumberFormat('th-TH', { maximumFractionDigits: 0 })

// ฿12,345.50
export const formatBaht = (n) => `฿${bahtFormatter.format(n)}`

// ฿12,346 (ไม่มีทศนิยม ใช้กับแกนกราฟ)
export const formatBahtShort = (n) => `฿${intFormatter.format(n)}`

// 1,234
export const formatNumber = (n) => intFormatter.format(n)

const dayMonth = new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const fullDate = new Intl.DateTimeFormat('th-TH', {
  weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
})

const fromKey = (key) => new Date(`${key}T00:00:00Z`)

// "1 เม.ย."
export const formatDayMonth = (key) => dayMonth.format(fromKey(key))

// "อ. 1 เม.ย. 2568"
export const formatFullDate = (key) => fullDate.format(fromKey(key))

// "1 เม.ย. 68" (ปี พ.ศ. 2 หลัก ใช้กับแกนวันที่ของกราฟ)
const shortThaiParts = new Intl.DateTimeFormat('th-TH-u-ca-buddhist', {
  day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
})
export const formatShortThaiDate = (key) => {
  const parts = shortThaiParts.formatToParts(fromKey(key))
  const get = (type) => parts.find((p) => p.type === type)?.value ?? ''
  return `${get('day')} ${get('month')} ${get('year').slice(-2)}`
}
