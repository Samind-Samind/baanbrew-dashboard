"""clean_sales.py · รวมทุกขั้นของ Lab 2.1 เรียกครั้งเดียวได้ sales_clean.csv + cleaning_log.csv

ใช้ใน notebook:   clean, log = clean_sales("sales_raw.csv")
ใช้ใน terminal:   python clean_sales.py sales_raw.csv  [sales_clean.csv]  [cleaning_log.csv]
"""
import re
import sys

import pandas as pd

COLUMNS = ["order_id", "datetime", "branch", "product_id", "qty", "unit_price",
           "customer_id", "payment_method", "channel"]
STD_BRANCHES = ["สยาม", "สีลม", "อารีย์", "บางนา", "มหาวิทยาลัย"]
BRANCH_MAP = {
    "Siam": "สยาม", "สาขาสยาม": "สยาม",
    "Silom": "สีลม",
    "Ari": "อารีย์", "อารีย": "อารีย์",
    "Bangna": "บางนา",
    "มหาลัย": "มหาวิทยาลัย", "ม.": "มหาวิทยาลัย",  # ทีม POS ยืนยันว่า "ม." = มหาวิทยาลัย
}
ISO_RE = re.compile(r"^(\d{4})-(\d{1,2})-(\d{1,2})T(\d{1,2}):(\d{2})(?::(\d{2}))?")
DMY_RE = re.compile(r"^(\d{1,2})/(\d{1,2})/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$")
CLEAN_DT_RE = r"^20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+07:00$"


class CleaningError(ValueError):
    """ข้อมูลมีรูปแบบที่ไม่รู้จัก ต้องให้คนตัดสินใจก่อน (pipeline ควรหยุด ไม่เดาเอง)"""


def _fix_datetime(s):
    """แปลงเป็น YYYY-MM-DDTHH:MM:SS+07:00 ปี ค.ศ. · คืน None ถ้าไม่รู้จักรูปแบบหรือวันที่ไม่มีจริง
    ไม่ใช้ pd.to_datetime เพื่อกันวัน/เดือนสลับ และกันการแปลงเป็น UTC"""
    s = s.strip()
    m = ISO_RE.match(s)
    if m:
        y, mo, d, h, mi, sec = m.groups()
    else:
        m = DMY_RE.match(s)
        if not m:
            return None
        d, mo, y, h, mi, sec = m.groups()
    y = int(y)
    if y > 2400:  # ปี พ.ศ. → ค.ศ.
        y -= 543
    out = f"{y:04d}-{int(mo):02d}-{int(d):02d}T{int(h):02d}:{int(mi):02d}:{int(sec or 0):02d}+07:00"
    try:  # กันวันที่ที่ไม่มีจริง เช่น 31/02 หรือ 25:00
        pd.Timestamp(out[:19])
    except ValueError:
        return None
    return out


def clean_sales(path, out_path="sales_clean.csv", log_path="cleaning_log.csv", verbose=True):
    """อ่าน sales_raw.csv → ทำความสะอาดทุกขั้น → ตรวจผล → บันทึกไฟล์

    คืนค่า (clean, cleaning_log) เป็น DataFrame ทั้งคู่
    ถ้าเจอรูปแบบที่ไม่รู้จัก (วันที่, ชื่อสาขา, ราคา, คอลัมน์) จะ raise CleaningError และไม่บันทึกไฟล์
    ตั้ง out_path / log_path เป็น None ถ้าไม่ต้องการบันทึก
    """
    df = pd.read_csv(path, dtype=str, keep_default_na=False, encoding="utf-8-sig")
    df.columns = [c.strip() for c in df.columns]
    missing = [c for c in COLUMNS if c not in df.columns]
    if missing:
        raise CleaningError(f"ไม่มีคอลัมน์: {missing} · คอลัมน์ที่อ่านได้: {list(df.columns)}")

    clean = df[COLUMNS].copy()
    n_before = len(clean)
    log = []

    def add_log(step, n, decision):
        log.append({"ขั้นตอน": step, "จำนวนแถวที่กระทบ": int(n), "การตัดสินใจ": decision})

    # 1) ลบแถวซ้ำทุกคอลัมน์ (ไม่ใช้ order_id เพราะ 1 บิลมีหลายแถว)
    dup = clean.duplicated()
    clean = clean[~dup].copy()
    add_log("ลบแถวซ้ำทุกคอลัมน์", dup.sum(), "ลบ (เก็บแถวแรก)")

    # 2) datetime → ISO ปี ค.ศ. +07:00
    old_dt = clean["datetime"].str.strip()
    new_dt = old_dt.map(_fix_datetime)
    if new_dt.isna().any():
        bad = old_dt[new_dt.isna()]
        raise CleaningError(f"datetime ที่แปลงไม่ได้ {len(bad):,} แถว เช่น {bad.unique()[:5].tolist()}")
    add_log("datetime: ISO ปี พ.ศ.", old_dt.str.match(r"^25\d{2}-").sum(), "แปลง: ลบ 543 ปี")
    n_dmy_be = old_dt.str.match(r"^\d{1,2}/\d{1,2}/25\d{2}").sum()
    add_log("datetime: DD/MM/YYYY HH:MM", old_dt.str.contains("/").sum(),
            f"แปลงเป็น ISO เติมวินาที 00 (ในนี้เป็นปี พ.ศ. {n_dmy_be} แถว)")
    add_log("datetime: อื่น ๆ ที่ไม่ตรงรูปแบบสุดท้าย",
            ((old_dt != new_dt) & ~old_dt.str.match(r"^25\d{2}-") & ~old_dt.str.contains("/")).sum(),
            "จัดรูปแบบ (เติม 0 / วินาที / timezone)")
    clean["datetime"] = new_dt

    # 3) ชื่อสาขา: strip แล้ว map
    old_b = clean["branch"]
    new_b = old_b.str.strip().replace(BRANCH_MAP)
    unknown = ~new_b.isin(STD_BRANCHES)
    if unknown.any():
        raise CleaningError(f"ชื่อสาขาที่ยังไม่อยู่ใน BRANCH_MAP: {new_b[unknown].value_counts().to_dict()}")
    clean["branch"] = new_b
    add_log("ชื่อสาขาไม่มาตรฐาน", (old_b != new_b).sum(), "strip ช่องว่าง แล้ว map เป็น 5 ชื่อมาตรฐาน")

    # 4) unit_price: ตัด "บาท" / จุลภาค → ตัวเลข · ติดลบ → บวก
    old_p = clean["unit_price"]
    price = pd.to_numeric(old_p.str.replace("บาท", "", regex=False).str.replace(",", "", regex=False)
                          .str.replace("฿", "", regex=False).str.strip(), errors="coerce")
    if price.isna().any():
        raise CleaningError(f"unit_price ที่แปลงไม่ได้: {old_p[price.isna()].unique()[:5].tolist()}")
    add_log("unit_price มีข้อความปน", (~old_p.str.strip().str.match(r"^-?\d+(\.\d+)?$")).sum(),
            "ตัด 'บาท' / '฿' / จุลภาค แล้วแปลงเป็นตัวเลข")
    neg = price < 0
    add_log("unit_price ติดลบ", neg.sum(), "แปลงเป็นบวก · ฝ่ายบัญชียืนยันว่าไม่มีการคืนเงินใน POS")
    clean["unit_price"] = price.abs().round().astype(int).astype(str)

    # 5) qty: ต้องเป็นจำนวนเต็ม · ลบ qty = 0 (บิลยกเลิก)
    qty = pd.to_numeric(clean["qty"].str.strip(), errors="coerce")
    if qty.isna().any() or (qty < 0).any():
        raise CleaningError(f"qty ที่ไม่ใช่จำนวนเต็มบวก: {clean.loc[qty.isna() | (qty < 0), 'qty'].unique()[:5].tolist()}")
    qty0 = qty == 0
    clean = clean[~qty0].copy()
    clean["qty"] = qty[~qty0].astype(int).astype(str)
    add_log("qty = 0", qty0.sum(), "ลบ · เป็นบิลที่ยกเลิก")

    # 6) ลบ product_id ว่าง
    clean["product_id"] = clean["product_id"].str.strip()
    no_prod = clean["product_id"] == ""
    clean = clean[~no_prod]
    add_log("product_id ว่าง", no_prod.sum(), "ลบ · ไม่เดาสินค้าจากราคา เพราะหลายสินค้าราคาเท่ากันได้")

    # 7) ซ้ำอีกรอบหลังทำให้รูปแบบเหมือนกัน
    dup2 = clean.duplicated()
    clean = clean[~dup2].reset_index(drop=True)
    add_log("แถวซ้ำหลังแปลงรูปแบบ", dup2.sum(), "ลบ (ตรวจซ้ำหลังแปลงวันที่/สาขา/ราคา)")

    cleaning_log = pd.DataFrame(log)
    _validate(clean)

    if out_path:
        clean.to_csv(out_path, index=False, encoding="utf-8-sig")
    if log_path:
        cleaning_log.to_csv(log_path, index=False, encoding="utf-8-sig")
    if verbose:
        print(cleaning_log.to_string(index=False))
        print(f"\n{path}: {n_before:,} → {len(clean):,} แถว (ลบ {n_before - len(clean):,})"
              + (f" · บันทึก {out_path}" if out_path else "") + (f", {log_path}" if log_path else ""))
    return clean, cleaning_log


def _validate(clean):
    """ตรวจผลลัพธ์ก่อนบันทึก ถ้าไม่ผ่านให้หยุด ไม่ปล่อยไฟล์เสียเข้า Dashboard"""
    problems = []
    if list(clean.columns) != COLUMNS:
        problems.append("คอลัมน์ไม่ตรงลำดับ")
    if (~clean["datetime"].str.match(CLEAN_DT_RE)).any():
        problems.append("datetime ยังมีรูปแบบผิด")
    if (~clean["branch"].isin(STD_BRANCHES)).any():
        problems.append("ชื่อสาขายังไม่มาตรฐาน")
    if (pd.to_numeric(clean["unit_price"]) <= 0).any():
        problems.append("unit_price ≤ 0")
    if (pd.to_numeric(clean["qty"]) <= 0).any():
        problems.append("qty ≤ 0")
    if (~clean["product_id"].str.match(r"^P\d{3}$")).any():
        problems.append("product_id ผิดรูปแบบ")
    if clean.duplicated().any():
        problems.append("ยังมีแถวซ้ำ")
    if problems:
        raise CleaningError("ผลลัพธ์ไม่ผ่านการตรวจ: " + ", ".join(problems))


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit("ใช้: python clean_sales.py sales_raw.csv [sales_clean.csv] [cleaning_log.csv]")
    args = sys.argv[1:] + [None] * 3
    try:
        clean_sales(args[0], args[1] or "sales_clean.csv", args[2] or "cleaning_log.csv")
    except CleaningError as e:
        sys.exit(f"❌ {e}")
