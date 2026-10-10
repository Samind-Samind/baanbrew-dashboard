// Lab 4.2 · ใช้ Claude Code เขียนฟังก์ชันที่ยังว่าง (Prompt 4.2A ใน PROMPTS_LAB4.md) จนกว่า npm test จะผ่าน · ห้ามแก้ไฟล์ test
// Lab 4.2 · Cohort retention รายเดือน
// cohort = เดือนแรกที่ลูกค้าสมาชิกซื้อ · retention[k] = สัดส่วนลูกค้าใน cohort ที่กลับมาซื้อในเดือนที่ k (k=0 คือเดือนแรก = 100%)

/** จำนวนเดือนจาก a ถึง b เช่น monthIndex("2025-11", "2026-02") = 3 */
export function monthIndex(a, b) {
  // ตัดสตริงตรง ๆ ไม่ผ่าน Date จึงไม่มีปัญหา timezone
  const [ya, ma] = a.split("-").map(Number);
  const [yb, mb] = b.split("-").map(Number);
  return (yb - ya) * 12 + (mb - ma);
}

/**
 * @param rows  แถวยอดขาย (ไม่นับ customer_id ว่าง)
 * @param asOf  วันสุดท้ายของข้อมูล YYYY-MM-DD ใช้บอกว่าเดือนสุดท้ายข้อมูลไม่ครบหรือไม่
 * @returns {{ cohorts: {cohort, size, retention: number[]}[], lastMonth, lastMonthPartial, daysInLastMonth }}
 *   retention ยาวเท่าจำนวนเดือนที่สังเกตได้ของ cohort นั้น (ถึง lastMonth)
 */
export function computeCohorts(rows, asOf) {
  // เดือนที่ลูกค้าแต่ละคนมาซื้อ (Set จึงนับซ้ำในเดือนเดียวกันครั้งเดียว)
  const monthsByCustomer = new Map();
  for (const x of rows) {
    if (!x.customer_id) continue; // walk-in ไม่ใช่สมาชิก
    const months = monthsByCustomer.get(x.customer_id) ?? new Set();
    months.add(x.date.slice(0, 7));
    monthsByCustomer.set(x.customer_id, months);
  }

  const lastMonth = asOf.slice(0, 7);
  // จำนวนวันของเดือนสุดท้าย: วันที่ 0 ของเดือนถัดไป = วันสุดท้ายของเดือนนี้ (Date.UTC จึงไม่เพี้ยนเพราะ timezone)
  const [y, m, d] = asOf.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();

  // จัดลูกค้าเข้า cohort ตามเดือนแรกที่ซื้อ แล้วนับว่าเดือนที่ k หลังจากนั้นมีกี่คนกลับมา
  const byCohort = new Map();
  for (const months of monthsByCustomer.values()) {
    const sorted = [...months].sort();
    const cohort = sorted[0];
    const c = byCohort.get(cohort) ?? { size: 0, active: new Array(monthIndex(cohort, lastMonth) + 1).fill(0) };
    c.size += 1;
    for (const ym of sorted) {
      const k = monthIndex(cohort, ym);
      if (k < c.active.length) c.active[k] += 1;
    }
    byCohort.set(cohort, c);
  }

  const cohorts = [...byCohort]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([cohort, c]) => ({ cohort, size: c.size, retention: c.active.map((n) => n / c.size) }));

  return { cohorts, lastMonth, lastMonthPartial: d < daysInMonth, daysInLastMonth: d, daysInMonth };
}
