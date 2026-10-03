"""profile_customers.py · รวมทุกขั้นของ Lab 2.2 (profiling ข้อมูลลูกค้า) เรียกครั้งเดียวได้ profiling_log

ใช้ใน notebook:
    from profile_customers import profile_customers, flag_customers
    profiling_log = profile_customers(cust, branches, sales)
    flagged = flag_customers(cust, branches, sales)          # ถ้าต้องการไฟล์ติด flag ด้วย

ใช้ใน terminal (pipeline):
    python profile_customers.py customers.csv branches.csv sales.csv [customer_profiling_log.csv] [customers_flagged.csv]
    exit code 1 ถ้ามีข้อใดระดับ "ผิดพลาด" เพื่อให้ pipeline หยุด

หลักการ: รายงานอย่างเดียว ไม่แก้และไม่ลบข้อมูล · ไม่แก้ DataFrame ที่ส่งเข้ามา
"""
import sys

import pandas as pd

REQUIRED = {
    "cust": ["customer_id", "nickname", "gender", "age_group", "home_branch_id", "joined_date", "phone"],
    "branches": ["branch_id", "branch", "opened_date"],
    "sales": ["order_id", "datetime", "branch", "customer_id"],
}
STD_GENDER = ["ชาย", "หญิง", "ไม่ระบุ"]
AGE_ORDER = ["ต่ำกว่า 18", "18-24", "25-34", "35-44", "45-54", "55+"]
PHONE_RE = r"^0\d{2}-xxx-\d{4}$"
MIXED_NAME_RANGE = (0.3, 0.7)  # ชื่อเล่นที่ %หญิงอยู่ในช่วงนี้ถือว่า "ไม่บอกเพศ"

# ระดับความรุนแรง
PASS, NOTE, WARN, ERROR = "ผ่าน", "ข้อสังเกต", "เตือน", "ผิดพลาด"


def _check_columns(**frames):
    for name, df in frames.items():
        missing = [c for c in REQUIRED[name] if c not in df.columns]
        if missing:
            raise ValueError(f"{name} ไม่มีคอลัมน์: {missing} · มี: {list(df.columns)}")


def _as_str(df):
    """ทำสำเนาและบังคับเป็น str ค่าว่างเป็น "" (กันกรณีอ่านไฟล์มาแบบไม่ใช้ dtype=str)"""
    return df.copy().astype(object).fillna("").astype(str)


def _derive(cust, branches, sales):
    """คำนวณค่ากลางที่ใช้ร่วมกันระหว่าง profile_customers และ flag_customers"""
    br = branches.set_index("branch_id")
    name_to_id = dict(zip(branches["branch"].str.strip(), branches["branch_id"]))

    s = sales[sales["customer_id"].str.strip() != ""].copy()
    s["date"] = s["datetime"].str[:10]  # ไม่ใช้ pd.to_datetime กัน timezone เลื่อน
    s["branch_id"] = s["branch"].str.strip().map(name_to_id)
    by_cust = s.groupby("customer_id")

    ids_sales = set(s["customer_id"])
    first_buy = cust["customer_id"].map(by_cust["date"].min())
    # นับ "บิล" ต่อสาขา (ไม่ใช่แถว เพราะ 1 บิลมีหลายแถว)
    bills = s.groupby(["customer_id", "branch_id"])["order_id"].nunique().unstack(fill_value=0)
    top_branch = cust["customer_id"].map(bills.idxmax(axis=1))
    max_bills = cust["customer_id"].map(bills.max(axis=1))
    home_bills = pd.Series(
        [bills.at[c, h] if c in bills.index and h in bills.columns else 0
         for c, h in zip(cust["customer_id"], cust["home_branch_id"])], index=cust.index)
    # ซื้อสาขาอื่นบ่อยกว่าสาขาตัวเอง "อย่างชัดเจน" · ถ้าเสมอกันไม่นับ (เดิมใช้ value_counts ซึ่งเลือกสาขาแบบสุ่มเมื่อเสมอ)
    home_ne_top = max_bills.notna() & (home_bills < max_bills)

    return {
        "opened": cust["home_branch_id"].map(br["opened_date"]),
        "ids_sales": ids_sales,
        "first_buy": first_buy,
        "top_branch": top_branch,
        "unmapped_sales_branch": int(s["branch_id"].isna().sum()),
        "sales_first": sales["datetime"].str[:10].min(),
        "dup_phone": cust["phone"].duplicated(keep=False),
        "minor": cust["age_group"] == "ต่ำกว่า 18",
        "never_bought": ~cust["customer_id"].isin(ids_sales),
        "home_ne_top": home_ne_top,
    }


def profile_customers(cust, branches, sales):
    """ตรวจ customers 3 ระดับ (คอลัมน์ / ข้ามตาราง / ความหมาย) คืน profiling_log เป็น DataFrame

    คอลัมน์: ระดับ, สิ่งที่ตรวจ, จำนวน, ระดับความรุนแรง, ข้อเสนอแนะ
    ข้อที่ "ควรเป็น 0" ถ้าเจอ > 0 จะเป็นระดับ "ผิดพลาด" อัตโนมัติ (ไม่ได้ตั้งค่าตายตัวว่าผ่าน)
    """
    _check_columns(cust=cust, branches=branches, sales=sales)
    cust, branches, sales = _as_str(cust), _as_str(branches), _as_str(sales)
    d = _derive(cust, branches, sales)
    log = []

    def must_be_zero(level, item, n, advice):
        n = int(n)
        log.append({"ระดับ": level, "สิ่งที่ตรวจ": item, "จำนวน": n,
                    "ระดับความรุนแรง": PASS if n == 0 else ERROR, "ข้อเสนอแนะ": "-" if n == 0 else advice})

    def finding(level, item, n, severity, advice):
        log.append({"ระดับ": level, "สิ่งที่ตรวจ": item, "จำนวน": int(n),
                    "ระดับความรุนแรง": severity, "ข้อเสนอแนะ": advice})

    # ---------- ระดับ 1: คอลัมน์ ----------
    stripped = cust.apply(lambda c: c.str.strip())
    ids = cust["customer_id"]
    jd_ok = pd.to_datetime(cust["joined_date"], format="%Y-%m-%d", errors="coerce").notna() \
        & cust["joined_date"].str.match(r"^\d{4}-\d{2}-\d{2}$")
    must_be_zero("คอลัมน์", "customer_id ซ้ำ", ids.duplicated().sum(), "ตรวจกับระบบสมาชิกว่าเป็นคนเดียวกันหรือออกรหัสซ้ำ")
    must_be_zero("คอลัมน์", "customer_id ผิดรูปแบบ C+5 หลัก", (~ids.str.match(r"^C\d{5}$")).sum(), "แก้ที่ระบบต้นทาง")
    must_be_zero("คอลัมน์", "ช่องว่าง (ทั้งไฟล์)", (stripped == "").sum().sum(), "ดูว่าคอลัมน์ไหนว่าง และว่างเพราะอะไร")
    must_be_zero("คอลัมน์", "ค่ามีช่องว่างหน้า/ท้าย", (cust != stripped).sum().sum(), "strip ก่อนใช้งาน")
    must_be_zero("คอลัมน์", "gender นอกค่ามาตรฐาน", (~cust["gender"].isin(STD_GENDER)).sum(), "map เป็น ชาย/หญิง/ไม่ระบุ")
    must_be_zero("คอลัมน์", "age_group นอกค่ามาตรฐาน", (~cust["age_group"].isin(AGE_ORDER)).sum(), "map ให้ตรงช่วงอายุมาตรฐาน")
    must_be_zero("คอลัมน์", "joined_date ผิดรูปแบบ/ไม่มีจริง", (~jd_ok).sum(), "แปลงเป็น YYYY-MM-DD ปี ค.ศ.")
    must_be_zero("คอลัมน์", "phone ผิดรูปแบบ 0XX-xxx-XXXX", (~cust["phone"].str.match(PHONE_RE)).sum(), "ตรวจการปิดเลขกลาง")

    # ---------- ระดับ 2: ข้ามตาราง ----------
    must_be_zero("ข้ามตาราง", "home_branch_id ไม่มีใน branches", d["opened"].isna().sum(), "เพิ่มสาขาใน branches.csv หรือแก้รหัส")
    must_be_zero("ข้ามตาราง", "สมัครก่อนสาขาตัวเองเปิด", (cust["joined_date"] < d["opened"]).sum(), "ตรวจ joined_date หรือ opened_date")
    must_be_zero("ข้ามตาราง", "customer_id ใน sales ไม่มีในทะเบียน (รหัส)",
                 len(d["ids_sales"] - set(ids)), "ทะเบียนลูกค้าไม่ครบ ขอไฟล์ล่าสุด")
    must_be_zero("ข้ามตาราง", "ซื้อครั้งแรกก่อนวันสมัคร", (d["first_buy"] < cust["joined_date"]).sum(), "ตรวจ joined_date")
    must_be_zero("ข้ามตาราง", "ชื่อสาขาใน sales ที่ไม่มีใน branches (แถว)", d["unmapped_sales_branch"], "รัน clean_sales ก่อน")
    finding("ข้ามตาราง", "สมาชิกที่ไม่เคยซื้อ", d["never_bought"].sum(), NOTE,
            "เก็บไว้ ใช้เป็นกลุ่มเป้าหมายแคมเปญกระตุ้นการซื้อครั้งแรก")
    finding("ข้ามตาราง", "ซื้อสาขาอื่นบ่อยกว่า home_branch (บิล)", d["home_ne_top"].sum(), NOTE,
            "วิเคราะห์รายสาขาให้ระบุว่าใช้สาขาที่สมัครหรือสาขาที่ซื้อจริง")
    # สาขาที่เปิดก่อนวันแรกของ sales ควรมีสมาชิกที่สมัครก่อนวันนั้นบ้าง ถ้าไม่มีเลย = ข้อมูลน่าจะถูกตัด/ย้ายระบบ
    old_branches = branches.loc[branches["opened_date"] < d["sales_first"], "branch_id"]
    n_old_members = int((cust["home_branch_id"].isin(old_branches) & (cust["joined_date"] < d["sales_first"])).sum())
    if len(old_branches) and n_old_members == 0:
        finding("ข้ามตาราง", f"สมาชิกที่สมัครก่อน {d['sales_first']} ในสาขาที่เปิดก่อนหน้า", 0, WARN,
                f"{len(old_branches)} สาขาเปิดก่อนวันแรกของ sales แต่ไม่มีสมาชิกเก่าเลย "
                "ยืนยันกับเจ้าของข้อมูลก่อนใช้ joined_date วัดการเติบโต")
    else:
        finding("ข้ามตาราง", f"สมาชิกที่สมัครก่อน {d['sales_first']}", n_old_members, PASS, "-")

    # ---------- ระดับ 3: ความหมาย ----------
    n = len(cust)
    n_prefix = cust["phone"].str[:3].nunique()
    expected = n * (1 - (1 - 1 / (n_prefix * 10_000)) ** (n - 1)) if n_prefix else 0
    n_dup_phone = int(d["dup_phone"].sum())
    dup_sev = NOTE if n_dup_phone <= expected * 1.5 + 10 else WARN  # มากกว่าที่คาดจากความบังเอิญชัดเจน → เตือน
    finding("ความหมาย", "แถวที่เบอร์โทรซ้ำ", n_dup_phone, dup_sev,
            f"คาดจากการสุ่ม ~{expected:.0f} แถว เพราะปิดเลขกลาง ห้ามใช้เบอร์รวมบัญชี"
            if dup_sev == NOTE else f"มากกว่าที่คาดจากการสุ่ม (~{expected:.0f}) ชัดเจน อาจมีการสมัครซ้ำ ตรวจเพิ่ม")

    mf = cust[cust["gender"].isin(["ชาย", "หญิง"])]
    pct_f = mf.groupby("nickname")["gender"].apply(lambda g: (g == "หญิง").mean())
    n_mixed = int(pct_f.between(*MIXED_NAME_RANGE).sum())
    finding("ความหมาย", f"ชื่อเล่นที่ %หญิง {MIXED_NAME_RANGE[0]:.0%}–{MIXED_NAME_RANGE[1]:.0%} (จาก {len(pct_f)} ชื่อ)",
            n_mixed, WARN if len(pct_f) and n_mixed / len(pct_f) > 0.5 else NOTE,
            "gender ไม่สัมพันธ์กับชื่อ อย่าใช้วิเคราะห์ตามเพศโดยไม่ระบุข้อจำกัด")
    finding("ความหมาย", "ลูกค้าอายุต่ำกว่า 18", d["minor"].sum(), WARN if d["minor"].any() else PASS,
            "ห้ามส่งการตลาดจนกว่าจะมีความยินยอมจากผู้ปกครอง (PDPA)" if d["minor"].any() else "-")

    return pd.DataFrame(log)


def flag_customers(cust, branches, sales):
    """คืนสำเนาของ cust + คอลัมน์ flag_* (True/False) ไม่แก้หรือลบค่าเดิม จำนวนแถวเท่าเดิม"""
    _check_columns(cust=cust, branches=branches, sales=sales)
    c, b, s = _as_str(cust), _as_str(branches), _as_str(sales)
    d = _derive(c, b, s)
    flagged = cust.copy()
    flagged["flag_dup_phone"] = d["dup_phone"].astype(bool).values
    flagged["flag_minor"] = d["minor"].astype(bool).values
    flagged["flag_never_bought"] = d["never_bought"].astype(bool).values
    flagged["flag_home_ne_top_branch"] = d["home_ne_top"].astype(bool).values
    assert len(flagged) == len(cust) and flagged[cust.columns].equals(cust), "ห้ามแก้ข้อมูลเดิม"
    return flagged


def _read(path):
    return pd.read_csv(path, dtype=str, keep_default_na=False, encoding="utf-8-sig")


if __name__ == "__main__":
    if len(sys.argv) < 4:
        sys.exit("ใช้: python profile_customers.py customers.csv branches.csv sales.csv "
                 "[customer_profiling_log.csv] [customers_flagged.csv]")
    args = sys.argv[1:] + [None] * 2
    cust, branches, sales = _read(args[0]), _read(args[1]), _read(args[2])
    log = profile_customers(cust, branches, sales)
    log.to_csv(args[3] or "customer_profiling_log.csv", index=False, encoding="utf-8-sig")
    flag_customers(cust, branches, sales).to_csv(args[4] or "customers_flagged.csv", index=False, encoding="utf-8-sig")
    pd.set_option("display.width", 200)
    print(log[["ระดับ", "สิ่งที่ตรวจ", "จำนวน", "ระดับความรุนแรง"]].to_string(index=False))
    n_err = (log["ระดับความรุนแรง"] == ERROR).sum()
    print(f"\nผิดพลาด {n_err} · เตือน {(log['ระดับความรุนแรง'] == WARN).sum()} · "
          f"ข้อสังเกต {(log['ระดับความรุนแรง'] == NOTE).sum()}")
    sys.exit(1 if n_err else 0)
