"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import SearchableSelect from "@/components/common/SearchableSelect";
import QuickAddSelect from "@/components/common/QuickAddSelect";
import QuickAddKhachHang, { type KhachHangOption } from "@/components/common/QuickAddKhachHang";
import MoneyInput from "@/components/common/MoneyInput";
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
  khachHang: { id: string; ten_day_du: string; ten_viet_tat: string | null; nhom_khach_hang_ten?: string | null }[];
  nhomKhachHang: { id: string; ten: string }[];
  loaiContainer: Option[];
  hangHoa: Option[];
  diaDiem: DiaDiemOption[];
  saleList: Option[];
}

const LOAI_DON_HANG = ["Xuất", "Nhập", "Khác"];
const LOAI_KICH_CO = ["20'", "40'", "45'", "Hàng lẻ"];
const DVT = ["Cont", "Chuyến", "Kiện", "Khối", "Tấn", "Kg", "2x20"];

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

  const [values, setValues] = useState({
    khach_hang_id: initial?.khach_hang_id ?? "",
    loai_don_hang: initial?.loai_don_hang ?? "",
    loai_kich_co: initial?.loai_kich_co ?? "",
    loai_cont_hang_id: initial?.loai_cont_hang_id ?? "",
    dvt: initial?.dvt ?? "",
    so_luong: initial?.so_luong?.toString() ?? "",
    so_bl_bk: initial?.so_bl_bk ?? "",
    so_lo: initial?.so_lo ?? "",
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
    so_to_khai_ban_dau: "",
  });

  function set(key: keyof typeof values, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  const diaDiemOptions = masterData.diaDiem.map((d) => ({
    value: d.id,
    label: d.ten,
    code: d.ma_dia_diem,
    sublabel: [d.khu_vuc, d.dia_chi].filter(Boolean).join(" · "),
  }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.khach_hang_id) {
      setError("Vui lòng chọn khách hàng.");
      return;
    }
    setSaving(true);
    setError(null);

    const { so_to_khai_ban_dau, ...donHangValues } = values;

    const payload: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(donHangValues)) {
      payload[key] = value === "" ? null : value;
    }
    if (payload.gia) payload.gia = Number(payload.gia);
    if (payload.so_luong) payload.so_luong = Number(payload.so_luong);

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
        await supabase
          .from("to_khai_hai_quan")
          .insert({ don_hang_id: data.id, so_to_khai: so_to_khai_ban_dau.trim() });
      }

      setSaving(false);
      router.push(`/don-hang/${data.id}`);
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 pb-10">
      <Section title="Thông tin chung">
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
        <Field label="Loại kích cỡ">
          <select value={values.loai_kich_co} onChange={(e) => set("loai_kich_co", e.target.value)} className={inputClass}>
            <option value="">-- Chọn --</option>
            {LOAI_KICH_CO.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </Field>
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
        <Field label="Số lượng" hint="VD: 3 (Cont), 500 (Kg)...">
          <input
            type="number"
            step="any"
            value={values.so_luong}
            onChange={(e) => set("so_luong", e.target.value)}
            className={inputClass}
          />
        </Field>
        {!initial && (
          <Field label="Số tờ khai (nếu đã có sẵn)" hint="Bỏ trống nếu chưa có — Chứng từ sẽ bổ sung sau">
            <input
              value={values.so_to_khai_ban_dau}
              onChange={(e) => set("so_to_khai_ban_dau", e.target.value)}
              className={inputClass}
            />
          </Field>
        )}
      </Section>

      <Section title="Số chứng từ">
        <Field label="Số vận đơn / booking">
          <input value={values.so_bl_bk} onChange={(e) => set("so_bl_bk", e.target.value)} className={inputClass} />
        </Field>
        <Field label="Số lô">
          <input value={values.so_lo} onChange={(e) => set("so_lo", e.target.value)} className={inputClass} />
        </Field>
        {!initial && (
          <p className="sm:col-span-2 text-xs text-slate-400">
            Số container, số seal, khối lượng/số ký từng container sẽ nhập ở trang chi tiết sau khi lưu đơn hàng
            này (một lô có thể có nhiều container).
          </p>
        )}
      </Section>

      <Section title="Hàng hóa">
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
      </Section>

      <Section title="Địa điểm">
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
      </Section>

      <Section title="Thời gian">
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

      <Section title="Khác">
        <Field label="Ghi chú vận chuyển">
          <textarea
            rows={3}
            value={values.ghi_chu_van_chuyen}
            onChange={(e) => set("ghi_chu_van_chuyen", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Giá bán cho khách">
          <MoneyInput value={values.gia} onChange={(v) => set("gia", v)} className={inputClass} />
        </Field>
      </Section>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700"
        >
          Hủy
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
        >
          {saving ? "Đang lưu..." : "Lưu"}
        </button>
      </div>
    </form>
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
