// Lab 4.1 · ใช้ Claude Code เขียนฟังก์ชันที่ยังว่าง (Prompt 4.1A ใน PROMPTS_LAB4.md) จนกว่า npm test จะผ่าน · ห้ามแก้ไฟล์ test
// Lab 4.1 · RFM: แบ่งกลุ่มลูกค้าสมาชิกด้วย Recency, Frequency, Monetary
// rows = ผลจาก prepareRows() (มี order_id, date, revenue, customer_id)
import { daysBetween } from "../../lab3/time.js";

/**
 * คะแนน 1–5 ตามตำแหน่งเปอร์เซ็นไทล์ (ค่ามาก = คะแนนสูง)
 * ค่าที่เท่ากันต้องได้คะแนนเท่ากันเสมอ: score = 1 + floor(5 × จำนวนค่าที่ "น้อยกว่า" / n)
 */
export function percentileScores(values) {
  const n = values.length;
  const sorted = [...values].sort((a, b) => a - b);
  // นับค่าที่น้อยกว่า v ด้วย binary search = ตำแหน่งแรกของ v ในลิสต์ที่เรียงแล้ว
  // ค่าที่เท่ากันจึงได้ตำแหน่งเดียวกันและได้คะแนนเท่ากันเสมอ
  const countLess = (v) => {
    let lo = 0, hi = n;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (sorted[mid] < v) lo = mid + 1; else hi = mid;
    }
    return lo;
  };
  return values.map((v) => 1 + Math.floor((5 * countLess(v)) / n));
}

/** กติกาตั้งชื่อกลุ่ม ตรวจจากบนลงล่าง ข้อแรกที่ตรงคือคำตอบ */
export function segmentOf(r, f) {
  if (r >= 4 && f >= 4) return "Champions";
  if (r >= 3 && f >= 4) return "Loyal";
  if (r >= 4 && f <= 2) return "New";
  if (r <= 2 && f >= 3) return "At Risk";
  if (r <= 2) return "Lost";
  return "Need Attention";
}

export const SEGMENTS = [
  { id: "Champions", th: "ลูกค้าชั้นยอด", action: "ให้สิทธิพิเศษ ชวนลองเมนูใหม่ก่อนใคร" },
  { id: "Loyal", th: "ลูกค้าประจำ", action: "สะสมแต้ม/ขยับขึ้นเป็นชั้นยอด" },
  { id: "New", th: "ลูกค้าใหม่", action: "คูปองครั้งที่ 2 ภายใน 14 วัน" },
  { id: "Need Attention", th: "ต้องดูแล", action: "โปรฯ ตามเมนูที่เคยซื้อ" },
  { id: "At Risk", th: "เสี่ยงหาย", action: "ดึงกลับด่วน: เคยซื้อบ่อยแต่หายไปนาน" },
  { id: "Lost", th: "หายไปแล้ว", action: "ใช้งบน้อย ส่งข้อความครั้งเดียว" },
];

/**
 * @param rows   แถวยอดขาย (ไม่นับแถวที่ customer_id ว่าง)
 * @param asOf   วันที่วิเคราะห์ YYYY-MM-DD (ใช้วันล่าสุดของข้อมูล ไม่ใช่วันนี้)
 * @returns {{ customers: object[], segments: object[], asOf: string }}
 *   customers: { id, R (วันที่ไม่ได้มา), F (จำนวนบิล), M (ยอดซื้อรวม), r, f, m, segment }
 *   segments:  { segment, customers, revenue, revenueShare, customerShare } เรียงตาม SEGMENTS
 */
export function computeRfm(rows, asOf) {
  // รวมยอดต่อลูกค้า: วันล่าสุด, ชุดเลขบิล (นับบิล ไม่ใช่นับแถว), ยอดรวม
  const byCustomer = new Map();
  for (const x of rows) {
    if (!x.customer_id) continue; // walk-in ไม่ใช่สมาชิก
    const c = byCustomer.get(x.customer_id) ?? { last: x.date, orders: new Set(), M: 0 };
    if (x.date > c.last) c.last = x.date;
    c.orders.add(x.order_id);
    c.M += x.revenue;
    byCustomer.set(x.customer_id, c);
  }

  const customers = [...byCustomer].map(([id, c]) => ({ id, R: daysBetween(c.last, asOf), F: c.orders.size, M: c.M }));

  // R น้อย = มาเมื่อเร็ว ๆ นี้ = ดี จึงให้คะแนนจาก −R
  const r = percentileScores(customers.map((c) => -c.R));
  const f = percentileScores(customers.map((c) => c.F));
  const m = percentileScores(customers.map((c) => c.M));
  customers.forEach((c, i) => Object.assign(c, { r: r[i], f: f[i], m: m[i], segment: segmentOf(r[i], f[i]) }));

  const totalRevenue = customers.reduce((s, c) => s + c.M, 0);
  const segments = SEGMENTS.map(({ id }) => {
    const group = customers.filter((c) => c.segment === id);
    const revenue = group.reduce((s, c) => s + c.M, 0);
    return {
      segment: id,
      customers: group.length,
      revenue,
      revenueShare: totalRevenue ? revenue / totalRevenue : 0,
      customerShare: customers.length ? group.length / customers.length : 0,
    };
  });

  return { customers, segments, asOf };
}
