// โทนสีพาสเทลของแท็บ Dashboard และแท็บลูกค้า (แท็บ Lab 2.2 ยังใช้โทนเดิม)
// ชุดสีกราฟผ่านการตรวจแยกสีสำหรับคนตาบอดสี (validate_palette.js) แล้ว

export const CHART = {
  grid: '#ebe6ef',
  tick: '#77728a',
  ink: '#3d3a4b',
  cursor: '#ee9a6a',
  hoverFill: '#f6f2fb',
  primary: '#6c63c7', // เส้น/แท่งหลัก (คราม-ลาเวนเดอร์)
  accent: '#e2725b', // เส้นค่าเฉลี่ย (ปะการัง)
  secondary: '#ee9a6a', // ส่วนที่สองของแท่งซ้อน (พีช)
  rose: '#d4688f',
  primarySoft: '#c9c3ec',
  muted: '#e4e0ef',
}

// สีประจำสาขา ลำดับนี้ผ่านการตรวจ (ห้ามสลับลำดับโดยไม่ตรวจใหม่)
export const BRANCH_COLORS = ['#6f8fe0', '#f08a6c', '#9b86d9', '#3fb38c', '#e3a72f']

// โทนของไอคอนตกแต่ง: bg = พื้นวงกลม, fg = สีไอคอน
export const TONES = {
  lavender: { bg: '#ece8fb', fg: '#5b52b5' },
  peach: { bg: '#fde9dc', fg: '#c25f35' },
  mint: { bg: '#dcf3ea', fg: '#2a8466' },
  rose: { bg: '#fbe3ec', fg: '#b4466f' },
  butter: { bg: '#fbf0d2', fg: '#946b0e' },
  sky: { bg: '#e2ecfb', fg: '#3c64b3' },
}
