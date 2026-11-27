"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import SearchableSelect from "@/components/common/SearchableSelect";
import QuickAddSelect from "@/components/common/QuickAddSelect";
import QuickAddKhachHang, { type KhachHangOption } from "@/components/common/QuickAddKhachHang";
import MoneyInput from "@/components/common/MoneyInput";
import { khachMeCua } from "@/lib/nhomKhach";
import type { DonHang } from "@/types/database";

interface Option {
  id: string;
  ten: string;
}

interface DiaDiemOption {
  id: string;
  ten: string;
  ma_dia_diem: string | null;
  dia_chi: string | null;
  khu_vuc: string | null;
}

interface MasterData {
  khachHang: { id: string; ten_day_du: string; ten_viet_tat: string | null; nhom_khach_hang_id?: string | null; nhom_khach_hang_ten?: string | null }[];
  nhomKhachHang: { id: string; ten: string; khach_hang_me_id?: string | null }[];
  coKhachDichVu?: boolean;
  loaiContainer: Option[];
  hangHoa: Option[];
  diaDiem: DiaDiemOption[];
  saleList: Option[];
  hienTruongList: Option[];
  chungTuList: Option[];
}

const LOAI_DON_HANG = ["Xuất", "Nhập", "Khác"];
const LOAI_KICH_CO = ["20'", "40'", "45'", "Hàng lẻ"];
const DVT = ["Cont", "Chuyến", "Kiện", "Khối", "Tấn", "Kg", "2x20"];

const STEPS = [
  "Thông tin & phân công",
  "Container/booking & hàng hóa",
  "Địa điểm & thời gian",
  "Giá & ghi chú",
  "Rà soát",
] as const;

export default function DonHangForm({
  masterData,
  initial,
  currentUserId,
  currentPhongBan,
}: {
  masterData: MasterData;
  initial?: DonHang | null;
  currentUserId?: string;
  currentPhongBan?: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaiContainerList, setLoaiContainerList] = useState(masterData.loaiContainer);
  const [hangHoaList, setHangHoaList] = useState(masterData.hangHoa);
  const [khachHangList, setKhachHangList] = useState<KhachHangOption[]>(masterData.khachHang);
  const [step, setStep] = useState(0);
  const [showBoSung, setShowBoSung] = useState(false);

  const [khachDichVuId, setKhachDichVuId] = useState(
    (initial as (DonHang & { khach_hang_dich_vu_id?: string | null }) | null | undefined)?.khach_hang_dich_vu_id ?? "",
  );
  const [values, setValues] = useState({
    khach_hang_id: initial?.khach_hang_id ?? "",
    loai_don_hang: initial?.loai_don_hang ?? "",
    loai_kich_co: initial?.loai_kich_co ?? "",
    loai_cont_hang_id: initial?.loai_cont_hang_id ?? "",
    dvt: initial?.dvt ?? "",
    so_luong: initial?.so_luong?.toString() ?? "",
    so_kien: initial?.so_kien?.toString() ?? "",
    so_kg: initial?.so_kg?.toString() ?? "",
    so_bl_bk: initial?.so_bl_bk ?? "",
    hang_hoa_id: initial?.hang_hoa_id ?? "",
    kich_thuoc: initial?.kich_thuoc ?? "",
    noi_lay_cont_hang_id: initial?.noi_lay_cont_hang_id ?? "",
    noi_dong_giao_id: initial?.noi_dong_giao_id ?? "",
    noi_ha_tra_rong_id: initial?.noi_ha_tra_rong_id ?? "",
    ngay_len_don: initial?.ngay_len_don ?? new Date().toISOString().slice(0, 10),
    ngay_van_chuyen: initial?.ngay_van_chuyen ?? "",
    han_lenh_ngay: initial?.han_lenh_ngay ?? "",
    han_lenh_gio: initial?.han_lenh_gio ?? "",
    ghi_chu_van_chuyen: initial?.ghi_chu_van_chuyen ?? "",
    gia: initial?.gia?.toString() ?? "",
    sale_phu_trach_id: initial?.sale_phu_trach_id ?? (currentPhongBan === "Sale" ? currentUserId ?? "" : ""),
    hien_truong_phu_trach_id: initial?.hien_truong_phu_trach_id ?? "",
    chung_tu_phu_trach_id: initial?.chung_tu_phu_trach_id ?? "",
    so_to_khai_ban_dau: "",
    so_cont_ban_dau: "",
  });

  const isHangLe = values.loai_kich_co === "Hàng lẻ";

  function set(key: keyof typeof values, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  const diaDiemOptions = masterData.diaDiem.map((d) => ({
    value: d.id,
    label: d.ten,
    code: d.ma_dia_diem,
    sublabel: [d.khu_vuc, d.dia_chi].filter(Boolean).join(" · "),
  }));

  function khachHangLabel() {
    const kh = khachHangList.find((k) => k.id === values.khach_hang_id);
    return kh ? kh.ten_viet_tat || kh.ten_day_du || "—" : "—";
  }
  function tenKhachDichVuMacDinh() {
    const me = khachMeCua(values.khach_hang_id, masterData.khachHang, masterData.nhomKhachHang);
    const k = masterData.khachHang.find((x) => x.id === me);
    return k ? `${k.ten_viet_tat || k.ten_day_du} (công ty mẹ của nhóm)` : khachHangLabel();
  }
  function optionLabel(list: Option[], id: string) {
    return list.find((o) => o.id === id)?.ten ?? "—";
  }
  function diaDiemLabel(id: string) {
    return masterData.diaDiem.find((d) => d.id === id)?.ten ?? "—";
  }

  function validateStep(s: number): string | null {
    if (s === 0) {
      if (!values.khach_hang_id) return "Vui lòng chọn khách hàng.";
      if (!values.sale_phu_trach_id) return "Vui lòng chọn Sale phụ trách.";
    }
    if (s === 2) {
      if (!values.ngay_len_don) return "Vui lòng chọn ngày lên đơn.";
    }
    return null;
  }

  function goNext() {
    const err = validateStep(step);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function goBack() {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    for (let s = 0; s < STEPS.length - 1; s++) {
      const err = validateStep(s);
      if (err) {
        setError(err);
        setStep(s);
        return;
      }
    }
    setSaving(true);
    setError(null);

    const { so_to_khai_ban_dau, so_cont_ban_dau, ...donHangValues } = values;

    const payload: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(donHangValues)) {
      payload[key] = value === "" ? null : value;
    }
    if (payload.gia) payload.gia = Number(payload.gia);
    if (payload.so_luong) payload.so_luong = Number(payload.so_luong);
    if (payload.so_kien) payload.so_kien = Number(payload.so_kien);
    if (payload.so_kg) payload.so_kg = Number(payload.so_kg);
    if (masterData.coKhachDichVu) payload.khach_hang_dich_vu_id = khachDichVuId || null;

    if (initial) {
      const { error: err } = await supabase.from("don_hang").update(payload).eq("id", initial.id);
      setSaving(false);
      if (err) {
        setError(err.message);
        return;
      }
      router.push(`/don-hang/${initial.id}`);
      router.refresh();
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data: nv } = await supabase
        .from("nhan_vien")
        .select("id")
        .eq("auth_user_id", user?.id)
        .single();

      const { data, error: err } = await supabase
        .from("don_hang")
        .insert({ ...payload, nguoi_tao_id: nv?.id })
        .select()
        .single();

      if (err) {
        setSaving(false);
        setError(err.message);
        return;
      }

      if (so_to_khai_ban_dau.trim()) {
        const { error: tkErr } = await supabase
          .from("to_khai_hai_quan")
          .insert({ don_hang_id: data.id, so_to_khai: so_to_khai_ban_dau.trim() });
        if (tkErr) {
          window.alert(
            `Đã tạo đơn hàng, nhưng lưu Số tờ khai ban đầu bị lỗi: ${tkErr.message}\nVào chi tiết đơn hàng để thêm tờ khai thủ công.`
          );
        }
      }

      // Cho phep go nhieu so container cach nhau boi dau phay (VD lo hang le
      // ghep nhieu container) — tach thanh tung dong rieng trong
      // don_hang_container, khong gop chung 1 dong 1 chuoi (moi container 1
      // dong de sau con sua/xoa rieng tung cai duoc o trang chi tiet).
      const soContList = so_cont_ban_dau
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (soContList.length > 0) {
        const { error: contErr } = await supabase
          .from("don_hang_container")
          .insert(soContList.map((so_cont) => ({ don_hang_id: data.id, so_cont })));
        if (contErr) {
          window.alert(
            `Đã tạo đơn hàng, nhưng lưu Số container bị lỗi: ${contErr.message}\nVào chi tiết đơn hàng để thêm container thủ công.`
          );
        }
      }

      setSaving(false);
      router.push(`/don-hang/${data.id}`);
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 pb-10">
      <StepIndicator current={step} onJump={(i) => i < step && setStep(i)} />

      {step === 0 && (
        <Section title={STEPS[0]}>
          <Field label="Khách hàng" required>
            <QuickAddKhachHang
              options={khachHangList}
              value={values.khach_hang_id}
              onChange={(v) => set("khach_hang_id", v)}
              onAdded={(row) => setKhachHangList((prev) => [...prev, row].sort((a, b) => (a.ten_viet_tat || a.ten_day_du || "").localeCompare(b.ten_viet_tat || b.ten_day_du || "")))}
              nhomKhachHangList={masterData.nhomKhachHang}
              placeholder="Gõ tên khách hàng..."
            />
          </Field>
          {masterData.coKhachDichVu && values.khach_hang_id && (
            <Field label="Khách xuất HĐ dịch vụ (Công ty giao dịch)" hint="Hóa đơn chi hộ luôn xuất cho khách hàng ở ô trên">
              <select value={khachDichVuId} onChange={(e) => setKhachDichVuId(e.target.value)} className={inputClass}>
                <option value="">Mặc định: {tenKhachDichVuMacDinh()}</option>
                {masterData.khachHang.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.ten_viet_tat || k.ten_day_du}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Sale phụ trách" required hint="Người nhận hoa hồng của đơn này">
            <select
              required
              value={values.sale_phu_trach_id}
              onChange={(e) => set("sale_phu_trach_id", e.target.value)}
              className={inputClass}
            >
              <option value="">-- Chọn --</option>
              {masterData.saleList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.ten}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Hiện trường phụ trách" hint="Bỏ trống nếu đơn này chưa cần Hiện trường xử lý">
            <select
              value={values.hien_truong_phu_trach_id}
              onChange={(e) => set("hien_truong_phu_trach_id", e.target.value)}
              className={inputClass}
            >
              <option value="">-- Chọn --</option>
              {masterData.hienTruongList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.ten}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Chứng từ phụ trách" hint="Bỏ trống nếu đơn này chưa cần Chứng từ xử lý">
            <select
              value={values.chung_tu_phu_trach_id}
              onChange={(e) => set("chung_tu_phu_trach_id", e.target.value)}
              className={inputClass}
            >
              <option value="">-- Chọn --</option>
              {masterData.chungTuList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.ten}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Loại đơn hàng">
            <select value={values.loai_don_hang} onChange={(e) => set("loai_don_hang", e.target.value)} className={inputClass}>
              <option value="">-- Chọn --</option>
              {LOAI_DON_HANG.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Loại kích cỡ" hint="Chọn 'Hàng lẻ' nếu đơn này không đi theo container">
            <select value={values.loai_kich_co} onChange={(e) => set("loai_kich_co", e.target.value)} className={inputClass}>
              <option value="">-- Chọn --</option>
              {LOAI_KICH_CO.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
        </Section>
      )}

      {step === 1 && (
        <Section title={STEPS[1]}>
          <Field label="Số vận đơn / booking">
            <input value={values.so_bl_bk} onChange={(e) => set("so_bl_bk", e.target.value)} className={inputClass} />
          </Field>

          {isHangLe ? (
            <>
              <Field label="Số kiện" hint="Hàng lẻ (LCL) — số kiện hàng">
                <input
                  type="number"
                  step="1"
                  value={values.so_kien}
                  onChange={(e) => set("so_kien", e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Số kg" hint="Hàng lẻ (LCL) — khối lượng">
                <input
                  type="number"
                  step="any"
                  value={values.so_kg}
                  onChange={(e) => set("so_kg", e.target.value)}
                  className={inputClass}
                />
              </Field>
            </>
          ) : (
            <>
              <Field label="Loại container">
                <QuickAddSelect
                  table="loai_container"
                  label="loại container"
                  options={loaiContainerList}
                  value={values.loai_cont_hang_id}
                  onChange={(v) => set("loai_cont_hang_id", v)}
                  onAdded={(row) => setLoaiContainerList((prev) => [...prev, row].sort((a, b) => a.ten.localeCompare(b.ten)))}
                />
              </Field>
              <Field label="Đơn vị tính">
                <select value={values.dvt} onChange={(e) => set("dvt", e.target.value)} className={inputClass}>
                  <option value="">-- Chọn --</option>
                  {DVT.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Số lượng" hint="VD: 3 (Cont)">
                <input
                  type="number"
                  step="any"
                  value={values.so_luong}
                  onChange={(e) => set("so_luong", e.target.value)}
                  className={inputClass}
                />
              </Field>
              {!initial && (
                <Field
                  label="Số container"
                  hint="Bỏ trống nếu chưa có — nhiều container cách nhau bởi dấu phẩy, có thể thêm sau ở trang chi tiết"
                >
                  <input
                    value={values.so_cont_ban_dau}
                    onChange={(e) => set("so_cont_ban_dau", e.target.value)}
                    className={inputClass}
                  />
                </Field>
              )}
            </>
          )}

          {!initial && (
            <Field label="Số tờ khai (nếu đã có sẵn)" hint="Bỏ trống nếu chưa có — Chứng từ sẽ bổ sung sau">
              <input
                value={values.so_to_khai_ban_dau}
                onChange={(e) => set("so_to_khai_ban_dau", e.target.value)}
                className={inputClass}
              />
            </Field>
          )}

          <Field label="Hàng hóa">
            <QuickAddSelect
              table="hang_hoa"
              label="hàng hóa"
              options={hangHoaList}
              value={values.hang_hoa_id}
              onChange={(v) => set("hang_hoa_id", v)}
              onAdded={(row) => setHangHoaList((prev) => [...prev, row].sort((a, b) => a.ten.localeCompare(b.ten)))}
            />
          </Field>
          <Field label="Kích thước (WxLxH)">
            <input value={values.kich_thuoc} onChange={(e) => set("kich_thuoc", e.target.value)} className={inputClass} />
          </Field>

          {!isHangLe && (
            <p className="sm:col-span-2 text-xs text-slate-400">
              Số seal, loại container, hoặc container thứ 2 trở đi sẽ nhập ở trang chi tiết sau khi lưu đơn hàng này
              (một lô có thể có nhiều container).
            </p>
          )}
        </Section>
      )}

      {step === 2 && (
        <Section title={STEPS[2]}>
          <Field label="Nơi lấy cont/hàng">
            <SearchableSelect
              options={diaDiemOptions}
              value={values.noi_lay_cont_hang_id}
              onChange={(v) => set("noi_lay_cont_hang_id", v)}
              placeholder="Gõ tên hoặc mã địa điểm..."
            />
          </Field>
          <Field label="Nơi đóng/giao">
            <SearchableSelect
              options={diaDiemOptions}
              value={values.noi_dong_giao_id}
              onChange={(v) => set("noi_dong_giao_id", v)}
              placeholder="Gõ tên hoặc mã địa điểm..."
            />
          </Field>
          <Field label="Nơi hạ/trả rỗng">
            <SearchableSelect
              options={diaDiemOptions}
              value={values.noi_ha_tra_rong_id}
              onChange={(v) => set("noi_ha_tra_rong_id", v)}
              placeholder="Gõ tên hoặc mã địa điểm..."
            />
          </Field>
          <Field label="Ngày lên đơn" required>
            <input
              type="date"
              required
              value={values.ngay_len_don}
              onChange={(e) => set("ngay_len_don", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Ngày vận chuyển">
            <input
              type="date"
              value={values.ngay_van_chuyen}
              onChange={(e) => set("ngay_van_chuyen", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Hạn lệnh - ngày">
            <input
              type="date"
              value={values.han_lenh_ngay}
              onChange={(e) => set("han_lenh_ngay", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Hạn lệnh - giờ">
            <input
              type="time"
              value={values.han_lenh_gio}
              onChange={(e) => set("han_lenh_gio", e.target.value)}
              className={inputClass}
            />
          </Field>
        </Section>
      )}

      {step === 3 && (
        <Section title={STEPS[3]}>
          <Field label="Giá bán cho khách">
            <MoneyInput value={values.gia} onChange={(v) => set("gia", v)} className={inputClass} />
          </Field>
          <div className="sm:col-span-2">
            <button
              type="button"
              onClick={() => setShowBoSung((v) => !v)}
              className="text-sm font-medium text-blue-600"
            >
              {showBoSung ? "▾" : "▸"} Thông tin bổ sung (ghi chú vận chuyển — có thể thêm sau)
            </button>
            {showBoSung && (
              <div className="mt-3">
                <Field label="Ghi chú vận chuyển">
                  <textarea
                    rows={3}
                    value={values.ghi_chu_van_chuyen}
                    onChange={(e) => set("ghi_chu_van_chuyen", e.target.value)}
                    className={inputClass}
                  />
                </Field>
              </div>
            )}
          </div>
        </Section>
      )}

      {step === 4 && (
        <Section title={STEPS[4]}>
          <ReviewRow label="Khách hàng" value={khachHangLabel()} />
          <ReviewRow label="Sale phụ trách" value={optionLabel(masterData.saleList, values.sale_phu_trach_id)} />
          <ReviewRow label="Hiện trường phụ trách" value={optionLabel(masterData.hienTruongList, values.hien_truong_phu_trach_id)} />
          <ReviewRow label="Chứng từ phụ trách" value={optionLabel(masterData.chungTuList, values.chung_tu_phu_trach_id)} />
          <ReviewRow label="Loại đơn hàng" value={values.loai_don_hang || "—"} />
          <ReviewRow label="Loại kích cỡ" value={values.loai_kich_co || "—"} />
          <ReviewRow label="Số vận đơn/booking" value={values.so_bl_bk || "—"} />
          {isHangLe ? (
            <>
              <ReviewRow label="Số kiện" value={values.so_kien || "—"} />
              <ReviewRow label="Số kg" value={values.so_kg || "—"} />
            </>
          ) : (
            <>
              <ReviewRow label="Loại container" value={optionLabel(loaiContainerList, values.loai_cont_hang_id)} />
              <ReviewRow label="Số lượng" value={values.so_luong ? `${values.so_luong} ${values.dvt || ""}` : "—"} />
              {!initial && <ReviewRow label="Số container" value={values.so_cont_ban_dau || "—"} />}
            </>
          )}
          <ReviewRow label="Hàng hóa" value={optionLabel(hangHoaList, values.hang_hoa_id)} />
          <ReviewRow label="Nơi lấy cont/hàng" value={diaDiemLabel(values.noi_lay_cont_hang_id)} />
          <ReviewRow label="Nơi đóng/giao" value={diaDiemLabel(values.noi_dong_giao_id)} />
          <ReviewRow label="Nơi hạ/trả rỗng" value={diaDiemLabel(values.noi_ha_tra_rong_id)} />
          <ReviewRow label="Ngày lên đơn" value={values.ngay_len_don || "—"} />
          <ReviewRow label="Ngày vận chuyển" value={values.ngay_van_chuyen || "—"} />
          <ReviewRow label="Giá bán cho khách" value={values.gia ? Number(values.gia).toLocaleString("vi-VN") + "đ" : "—"} />
        </Section>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        {step === 0 ? (
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700"
          >
            Hủy
          </button>
        ) : (
          <button
            type="button"
            onClick={goBack}
            className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700"
          >
            Quay lại
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={goNext}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white"
          >
            Tiếp tục
          </button>
        ) : (
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
          >
            {saving ? "Đang lưu..." : "Lưu"}
          </button>
        )}
      </div>
    </form>
  );
}

function StepIndicator({ current, onJump }: { current: number; onJump: (i: number) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      {STEPS.map((label, i) => (
        <button
          key={label}
          type="button"
          onClick={() => onJump(i)}
          disabled={i > current}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium ${
            i === current
              ? "bg-blue-600 text-white"
              : i < current
                ? "bg-blue-100 text-blue-700"
                : "bg-slate-100 text-slate-400"
          }`}
        >
          <span>{i + 1}.</span>
          {label}
        </button>
      ))}
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-slate-100 pb-2 sm:col-span-1">
      <span className="text-xs text-slate-400">{label}</span>
      <span className="text-sm font-medium text-slate-800">{value}</span>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-slate-900">{title}</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
