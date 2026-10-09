// Lab 3.2 · ฟอร์มบันทึกยอดขาย (Prompt 3.2C)
// ตรวจด้วย validateSaleForm และสร้างเอกสารด้วย buildSale (src/lab3/saleModel.js) แล้วเขียนลง collection "sales"
// ราคาไม่ได้มาจากช่องกรอก แต่มาจากเมนูใน Firestore เสมอ (Security Rules ใน Lab 3.3 จะตรวจซ้ำอีกชั้น)
import { useState } from "react";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "./firebase.js";
import { BRANCHES, MAX_QTY, PAYMENTS, buildSale, validateSaleForm } from "./saleModel.js";
import { formatBaht } from "../lib/format";

const EMPTY = { branch: "", product_id: "", qty: "1", payment_method: PAYMENTS[0], customer_id: "" };

const saveError = (e) =>
  e.code === "permission-denied" ? "ถูกปฏิเสธโดย Security Rules" : `บันทึกไม่สำเร็จ: ${e.message}`;

export default function SaleForm({ products, uid }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null); // { ok: boolean, text: string }

  const product = products?.find((p) => p.product_id === form.product_id);
  const qty = Number(form.qty);
  const total = product && Number.isInteger(qty) && qty >= 1 && qty <= MAX_QTY ? qty * product.price : null;

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((errs) => ({ ...errs, [field]: undefined }));
    setStatus(null);
  };

  async function submit(e) {
    e.preventDefault();
    const found = validateSaleForm(form, products ?? []);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const sale = buildSale(form, product, { uid });
    setSaving(true);
    setStatus(null);
    try {
      await setDoc(doc(db, "sales", sale.id), { ...sale.data, created_at: serverTimestamp() });
      setStatus({ ok: true, text: `บันทึกแล้ว ${sale.data.order_id} · ${formatBaht(sale.data.revenue)}` });
      // คงสาขาและวิธีชำระเงินไว้ เพราะพนักงานมักบันทึกสาขาเดิมต่อเนื่อง
      setForm((f) => ({ ...f, product_id: "", qty: "1", customer_id: "" }));
    } catch (err) {
      setStatus({ ok: false, text: saveError(err) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="rounded-2xl border border-rule bg-white p-4 sm:p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold">บันทึกยอดขาย</h2>
        <p className="text-sm text-roast">บันทึกแล้วหน้า Dashboard ทุกเครื่องจะขยับเอง</p>
      </div>

      <Field label="สาขา" error={errors.branch}>
        <select value={form.branch} onChange={set("branch")} className={inputClass(errors.branch)}>
          <option value="">เลือกสาขา</option>
          {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
      </Field>

      <Field label="เมนู" error={errors.product_id}>
        <select value={form.product_id} onChange={set("product_id")} disabled={!products} className={inputClass(errors.product_id)}>
          <option value="">{products ? "เลือกเมนู" : "กำลังโหลดเมนู…"}</option>
          {products?.map((p) => (
            <option key={p.product_id} value={p.product_id}>{p.product_name} · {formatBaht(p.price)}</option>
          ))}
        </select>
      </Field>

      <Field label={`จำนวน (1–${MAX_QTY})`} error={errors.qty}>
        <input type="number" inputMode="numeric" min="1" max={MAX_QTY} step="1" value={form.qty} onChange={set("qty")} className={inputClass(errors.qty)} />
      </Field>

      <Field label="วิธีชำระเงิน" error={errors.payment_method}>
        <select value={form.payment_method} onChange={set("payment_method")} className={inputClass(errors.payment_method)}>
          {PAYMENTS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </Field>

      <Field label="รหัสสมาชิก (ไม่บังคับ)" error={errors.customer_id}>
        <input type="text" placeholder="เช่น C01234" autoComplete="off" value={form.customer_id} onChange={set("customer_id")} className={inputClass(errors.customer_id)} />
      </Field>

      <div className="flex items-baseline justify-between border-t border-rule pt-4">
        <span className="text-sm text-roast">ยอดรวม</span>
        <span className="text-2xl font-semibold tabular-nums">{total === null ? "—" : formatBaht(total)}</span>
      </div>

      <button
        type="submit"
        disabled={saving || !products}
        className="w-full rounded-full bg-espresso px-4 py-2.5 font-medium text-paper disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? "กำลังบันทึก…" : "บันทึกยอดขาย"}
      </button>

      {status && (
        <p role="status" className={`rounded-lg px-3 py-2 text-sm ${status.ok ? "bg-[#dcf3ea] text-[#1f6b52]" : "bg-[#fbe3ec] text-[#9b2f58]"}`}>
          {status.ok ? "✅ " : "❌ "}{status.text}
        </p>
      )}
    </form>
  );
}

const inputClass = (error) =>
  `mt-1 w-full rounded-lg bg-white px-3 py-2 ring-1 ${error ? "ring-[#d4688f]" : "ring-rule"} focus:outline-none focus:ring-2 focus:ring-[#6c63c7]`;

function Field({ label, error, children }) {
  return (
    <label className="block text-sm">
      <span className="font-medium">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-[#b4466f]">{error}</span>}
    </label>
  );
}
