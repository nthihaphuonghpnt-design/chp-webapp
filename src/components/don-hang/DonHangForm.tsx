"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { DonHang } from "@/types/database";

interface Option {
  id: string;
  ten: string;
}

interface MasterData {
  khachHang: { id: string; ten_day_du: string; ten_viet_tat: string | null }[];
  loaiContainer: Option[];
  hangHoa: Option[];
  diaDiem: Option[];
}

const LOAI_DON_HANG = ["Xuất", "Nhập", "Khác"];
const LOAI_KICH_CO = ["20'", "40'", "45'", "Hàng lẻ"];
const DVT = ["Cont", "Chuyến", "Kiện", "Khối", "Tấn", "Kg", "2x20"];

export default function DonHangForm({
  masterData,
  initial,
}: {
  masterData: MasterData;
  initial?: DonHang | null;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [values, setValues] = useState({
    khach_hang_id: initial?.khach_hang_id ?? "",
    loai_don_hang: initial?.loai_don_hang ?? "",
    loai_kich_co: initial?.loai_kich_co ?? "",
    loai_cont_hang_id: initial?.loai_cont_hang_id ?? "",
    dvt: initial?.dvt ?? "",
    so_bl_bk: initial?.so_bl_bk ?? "",
    so_lo: initial?.so_lo ?? "",
    so_cont: initial?.so_cont ?? "",
    so_seal: initial?.so_seal ?? "",
    hang_hoa_id: initial?.hang_hoa_id ?? "",
    khoi_luong: initial?.khoi_luong?.toString() ?? "",
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
  });

  function set(key: keyof typeof values, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(values)) {
      payload[key] = value === "" ? null : value;
    }
    if (payload.khoi_luong) payload.khoi_luong = Number(payload.khoi_luong);
    if (payload.gia) payload.gia = Number(payload.gia);

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
      setSaving(false);
      if (err) {
        setError(err.message);
        return;
      }
      router.push(`/don-hang/${data.id}`);
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 pb-10">
      <Section title="Thông tin chung">
        <Field label="Khách hàng" required>
          <select
            required
            value={values.khach_hang_id}
            onChange={(e) => set("khach_hang_id", e.target.value)}
            className={inputClass}
          >
            <option value="">-- Chọn khách hàng --</option>
            {masterData.khachHang.map((k) => (
              <option key={k.id} value={k.id}>
                {k.ten_viet_tat || k.ten_day_du}
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
          <select value={values.loai_cont_hang_id} onChange={(e) => set("loai_cont_hang_id", e.target.value)} className={inputClass}>
            <option value="">-- Chọn --</option>
            {masterData.loaiContainer.map((o) => (
              <option key={o.id} value={o.id}>
                {o.ten}
              </option>
            ))}
          </select>
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
      </Section>

      <Section title="Số chứng từ">
        <Field label="Số vận đơn / booking">
          <input value={values.so_bl_bk} onChange={(e) => set("so_bl_bk", e.target.value)} className={inputClass} />
        </Field>
        <Field label="Số lô">
          <input value={values.so_lo} onChange={(e) => set("so_lo", e.target.value)} className={inputClass} />
        </Field>
        <Field label="Số container">
          <input value={values.so_cont} onChange={(e) => set("so_cont", e.target.value)} className={inputClass} />
        </Field>
        <Field label="Số seal">
          <input value={values.so_seal} onChange={(e) => set("so_seal", e.target.value)} className={inputClass} />
        </Field>
      </Section>

      <Section title="Hàng hóa">
        <Field label="Hàng hóa">
          <select value={values.hang_hoa_id} onChange={(e) => set("hang_hoa_id", e.target.value)} className={inputClass}>
            <option value="">-- Chọn --</option>
            {masterData.hangHoa.map((o) => (
              <option key={o.id} value={o.id}>
                {o.ten}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Khối lượng">
          <input
            type="number"
            step="any"
            value={values.khoi_luong}
            onChange={(e) => set("khoi_luong", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Kích thước (WxLxH)">
          <input value={values.kich_thuoc} onChange={(e) => set("kich_thuoc", e.target.value)} className={inputClass} />
        </Field>
      </Section>

      <Section title="Địa điểm">
        <Field label="Nơi lấy cont/hàng">
          <select value={values.noi_lay_cont_hang_id} onChange={(e) => set("noi_lay_cont_hang_id", e.target.value)} className={inputClass}>
            <option value="">-- Chọn --</option>
            {masterData.diaDiem.map((o) => (
              <option key={o.id} value={o.id}>
                {o.ten}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Nơi đóng/giao">
          <select value={values.noi_dong_giao_id} onChange={(e) => set("noi_dong_giao_id", e.target.value)} className={inputClass}>
            <option value="">-- Chọn --</option>
            {masterData.diaDiem.map((o) => (
              <option key={o.id} value={o.id}>
                {o.ten}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Nơi hạ/trả rỗng">
          <select value={values.noi_ha_tra_rong_id} onChange={(e) => set("noi_ha_tra_rong_id", e.target.value)} className={inputClass}>
            <option value="">-- Chọn --</option>
            {masterData.diaDiem.map((o) => (
              <option key={o.id} value={o.id}>
                {o.ten}
              </option>
            ))}
          </select>
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
          <input type="number" step="any" value={values.gia} onChange={(e) => set("gia", e.target.value)} className={inputClass} />
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

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      {children}
    </div>
  );
}
