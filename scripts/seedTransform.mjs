// Lab 3.1 · แปลงแถวจาก sales.csv (ผลลัพธ์ Lab 2.1) เป็นเอกสาร Firestore
// ใช้ AI เขียนฟังก์ชันในไฟล์นี้ (Prompt 3.1 ใน PROMPTS_LAB3.md) จนกว่า npm test จะผ่านทุกข้อ
// scripts/seed.mjs เรียกใช้ฟังก์ชันเหล่านี้ ไม่ต้องแก้ seed.mjs
import { addDays, daysBetween } from "../src/lab3/time.js";

export const BRANCHES = ["สยาม", "สีลม", "อารีย์", "บางนา", "มหาวิทยาลัย"];

// รูปแบบ datetime ที่ผ่านการทำความสะอาดจาก Lab 2.1 แล้ว (ปี ค.ศ. และเวลาไทย +07:00 เท่านั้น)
const DATETIME_RE = /^20\d\d-\d\d-\d\dT\d\d:\d\d:\d\d\+07:00$/;
const INT_RE = /^\d+$/;
const NUMBER_RE = /^\d+(\.\d+)?$/;

// วันที่ YYYY-MM-DD ตามเวลาไทย ตัดจากข้อความตรง ๆ ไม่ผ่าน new Date() จึงไม่กลายเป็น UTC
const dateOf = (iso) => iso.slice(0, 10);

/**
 * เลือกเฉพาะ N วันล่าสุดของข้อมูล นับจากวันล่าสุดในไฟล์ (ไม่ใช่วันนี้) รวมวันสุดท้ายด้วย
 * @returns {{ rows: object[], start: string, end: string }}  start/end เป็น YYYY-MM-DD
 */
export function selectLastDays(rows, days) {
  const end = rows.reduce((max, r) => (dateOf(r.datetime) > max ? dateOf(r.datetime) : max), "");
  const start = addDays(end, -(days - 1));
  const picked = rows.filter((r) => {
    const d = dateOf(r.datetime);
    return d >= start && d <= end;
  });
  return { rows: picked, start, end };
}

/** จำนวนวันที่ต้องเลื่อน ให้วันล่าสุดของข้อมูลกลายเป็น "เมื่อวาน" ของ today · ห้ามติดลบ */
export function computeShift(lastDataDate, today) {
  // วันล่าสุดของข้อมูลควรเป็น today − 1 วัน
  return Math.max(0, daysBetween(lastDataDate, addDays(today, -1)));
}

/** เลื่อนวันที่ใน datetime ("2026-09-20T16:05:09+07:00") ไป days วัน โดยคงเวลาและ +07:00 */
export function shiftDateTime(iso, days) {
  if (!days) return iso;
  return addDays(dateOf(iso), days) + iso.slice(10);
}

/**
 * แปลง 1 แถว CSV (ทุกค่าเป็นข้อความ) เป็น { id, data }
 * id = order_id + "-" + product_id
 * data มีฟิลด์: order_id, datetime, date, hour, branch, product_id, qty, unit_price, revenue,
 *               customer_id (ว่าง = null), payment_method, channel, source = "import"
 * ต้อง throw Error ถ้าข้อมูลยังไม่สะอาด: qty ไม่ใช่จำนวนเต็มบวก, ราคาไม่ใช่ตัวเลขบวก,
 * สาขาไม่อยู่ใน BRANCHES, datetime ไม่ใช่ 20YY-MM-DDTHH:MM:SS+07:00
 */
export function toSaleDoc(row, shiftDays = 0) {
  const where = `${row.order_id} ${row.product_id}`;
  const raw = (v) => String(v ?? "").trim();

  if (!DATETIME_RE.test(raw(row.datetime))) throw new Error(`${where}: datetime ไม่ถูกรูปแบบ "${row.datetime}"`);
  if (!INT_RE.test(raw(row.qty)) || Number(row.qty) <= 0) throw new Error(`${where}: qty ต้องเป็นจำนวนเต็มบวก "${row.qty}"`);
  if (!NUMBER_RE.test(raw(row.unit_price)) || Number(row.unit_price) <= 0) throw new Error(`${where}: unit_price ต้องเป็นตัวเลขบวก "${row.unit_price}"`);
  if (!BRANCHES.includes(raw(row.branch))) throw new Error(`${where}: ไม่รู้จักสาขา "${row.branch}"`);

  const datetime = shiftDateTime(raw(row.datetime), shiftDays);
  const qty = Number(row.qty);
  const unit_price = Number(row.unit_price);
  const customer_id = raw(row.customer_id);

  return {
    id: `${row.order_id}-${row.product_id}`,
    data: {
      order_id: row.order_id,
      datetime,
      date: dateOf(datetime),
      hour: Number(datetime.slice(11, 13)),
      branch: raw(row.branch),
      product_id: row.product_id,
      qty,
      unit_price,
      revenue: qty * unit_price,
      customer_id: customer_id === "" ? null : customer_id,
      payment_method: row.payment_method,
      channel: row.channel,
      source: "import",
    },
  };
}

/** สรุป: { docs, bills (นับ order_id ไม่ซ้ำ), revenue, byBranch: {สาขา: ยอด}, start, end } */
export function summarize(docs) {
  const bills = new Set();
  const byBranch = {};
  let revenue = 0;
  let start = null;
  let end = null;
  for (const { data } of docs) {
    bills.add(data.order_id);
    revenue += data.revenue;
    byBranch[data.branch] = (byBranch[data.branch] ?? 0) + data.revenue;
    if (start === null || data.date < start) start = data.date;
    if (end === null || data.date > end) end = data.date;
  }
  return { docs: docs.length, bills: bills.size, revenue, byBranch, start, end };
}
