"use client";

import { Fragment, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ConfirmDialog from "@/components/common/ConfirmDialog";

interface SoDu {
  id: string;
  doi_tuong: "Khách hàng" | "Nhà cung cấp";
  khach_hang_id: string | null;
  nha_cung_cap_id: string | null;
  so_du: number;
  updated_at: string;
}
interface GiaoDich {
  id: string;
  doi_tuong: "Khách hàng" | "Nhà cung cấp";
  khach_hang_id: string | null;
  nha_cung_cap_id: string | null;
  loai: "Phát sinh" | "Cấn trừ" | "Hoàn tiền";
  so_tien: number;
  so_du_sau: number;
  phuong_thuc: string;
  ly_do: string | null;
  created_at: string;
  nguoi_thuc_hien: { ho_ten: string } | { ho_ten: string }[] | null;
  hoa_don_xuat: { so_hoa_don: string | null } | { so_hoa_don: string | null }[] | null;
  hoa_don_dau_vao: { so_hoa_don: string | null } | { so_hoa_don: string | null }[] | null;
}
interface KhachHang {
  id: string;
  ten_day_du: string;
  ten_viet_tat: string | null;
}
interface NhaCungCap {
  id: string;
  ten: string | null;
}
interface HoaDonXuatMo {
  id: string;
  khach_hang_id: string;
  so_hoa_don: string | null;
  tong_tien: number;
  so_tien_da_thu: number | null;
}
interface HoaDonDauVaoMo {
  id: string;
  nha_cung_cap_id: string;
  so_hoa_don: string | null;
  tong_tien_thanh_toan: number;
  so_tien_da_thanh_toan: number | null;
}

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

const LOAI_COLOR: Record<string, string> = {
  "Phát sinh": "bg-blue-100 text-blue-700",
  "Cấn trừ": "bg-amber-100 text-amber-700",
  "Hoàn tiền": "bg-green-100 text-green-700",
};

export default function CreditView({
  soDuList,
  giaoDichList,
  khachHangList,
  ncList,
  hoaDonXuatMoList,
  hoaDonDauVaoMoList,
  phongBan,
}: {
  soDuList: SoDu[];
  giaoDichList: GiaoDich[];
  khachHangList: KhachHang[];
  ncList: NhaCungCap[];
  hoaDonXuatMoList: HoaDonXuatMo[];
  hoaDonDauVaoMoList: HoaDonDauVaoMo[];
  phongBan: string;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [tab, setTab] = useState<"Khách hàng" | "Nhà cung cấp">("Khách hàng");
  const [moRong, setMoRong] = useState<string | null>(null); // id cua doi tuong (khach_hang_id / nha_cung_cap_id) dang xem lich su
  const [dangXuLy, setDangXuLy] = useState(false);
  // window.prompt() khong duoc trinh duyet nhung ho tro (xem HoaDonView.tsx
  // muc 5e) — thay bang ConfirmDialog.
  const [choCanTru, setChoCanTru] = useState<{ soDu: SoDu; dsHoaDon: (HoaDonXuatMo | HoaDonDauVaoMo)[] } | null>(null);
  const [choHoanTien, setChoHoanTien] = useState<SoDu | null>(null);

  const khMap = useMemo(() => new Map(khachHangList.map((k) => [k.id, k.ten_viet_tat || k.ten_day_du])), [khachHangList]);
  const ncMap = useMemo(() => new Map(ncList.map((n) => [n.id, n.ten || "—"])), [ncList]);

  const canCanTruKhachHang = phongBan === "Chứng từ" || phongBan === "Kế toán";
  const canCanTruNcc = phongBan === "Kế toán";
  const canHoanTien = phongBan === "Kế toán" || phongBan === "Giám đốc";

  const dsHienTai = soDuList.filter((s) => s.doi_tuong === tab);

  function tenDoiTuong(s: SoDu) {
    return s.doi_tuong === "Khách hàng" ? (khMap.get(s.khach_hang_id!) ?? "—") : (ncMap.get(s.nha_cung_cap_id!) ?? "—");
  }

  function handleCanTru(s: SoDu) {
    const dsHoaDon = s.doi_tuong === "Khách hàng" ? hoaDonXuatMoList.filter((h) => h.khach_hang_id === s.khach_hang_id) : hoaDonDauVaoMoList.filter((h) => h.nha_cung_cap_id === s.nha_cung_cap_id);
    if (dsHoaDon.length === 0) {
      window.alert("Không có hóa đơn nào đang mở (chưa thu/trả đủ) của đối tượng này để cấn trừ.");
      return;
    }
    setChoCanTru({ soDu: s, dsHoaDon });
  }

  async function xuLyCanTruConfirm(s: SoDu, hd: HoaDonXuatMo | HoaDonDauVaoMo, values: Record<string, string>) {
    const soTien = Number(values.so_tien.replace(/[^\d.]/g, ""));
    if (!soTien || soTien <= 0) {
      window.alert("Số tiền không hợp lệ.");
      return;
    }
    setChoCanTru(null);
    setDangXuLy(true);
    const { error } =
      s.doi_tuong === "Khách hàng"
        ? await supabase.rpc("can_tru_credit_hoa_don_xuat", { p_khach_hang_id: s.khach_hang_id, p_hoa_don_id: hd.id, p_so_tien: soTien, p_ly_do: values.ly_do.trim() })
        : await supabase.rpc("can_tru_credit_hoa_don_dau_vao", { p_nha_cung_cap_id: s.nha_cung_cap_id, p_hoa_don_id: hd.id, p_so_tien: soTien, p_ly_do: values.ly_do.trim() });
    setDangXuLy(false);
    if (error) {
      window.alert(error.message);
      return;
    }
    router.refresh();
  }

  function handleHoanTien(s: SoDu) {
    setChoHoanTien(s);
  }

  async function xuLyHoanTienConfirm(s: SoDu, values: Record<string, string>) {
    const soTien = Number(values.so_tien.replace(/[^\d.]/g, ""));
    if (!soTien || soTien <= 0) {
      window.alert("Số tiền không hợp lệ.");
      return;
    }
    setChoHoanTien(null);
    setDangXuLy(true);
    const { error } =
      s.doi_tuong === "Khách hàng"
        ? await supabase.rpc("hoan_tien_khach_hang", { p_khach_hang_id: s.khach_hang_id, p_so_tien: soTien, p_phuong_thuc: values.phuong_thuc, p_ly_do: values.ly_do.trim() })
        : await supabase.rpc("hoan_tien_ncc", { p_nha_cung_cap_id: s.nha_cung_cap_id, p_so_tien: soTien, p_phuong_thuc: values.phuong_thuc, p_ly_do: values.ly_do.trim() });
    setDangXuLy(false);
    if (error) {
      window.alert(error.message);
      return;
    }
    router.refresh();
  }

  function lichSuCua(s: SoDu) {
    return giaoDichList.filter((g) => (s.doi_tuong === "Khách hàng" ? g.khach_hang_id === s.khach_hang_id : g.nha_cung_cap_id === s.nha_cung_cap_id));
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="mb-1 text-xl font-semibold text-slate-900">Credit khách hàng / nhà cung cấp</h1>
      <p className="mb-4 text-xs text-slate-500">
        Khoản tiền thừa khi thu/trả vượt số còn phải thu/trả trên hóa đơn — tự động phát sinh qua nút &quot;Thu tiền&quot; (Hóa đơn xuất) hoặc khi thanh toán
        hóa đơn đầu vào. Có thể dùng để cấn trừ vào hóa đơn khác, hoặc hoàn tiền thật.
      </p>

      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setTab("Khách hàng")}
          className={`rounded-lg px-3 py-2 text-sm font-medium ${tab === "Khách hàng" ? "bg-blue-600 text-white" : "border border-slate-300 bg-white text-slate-700"}`}
        >
          Khách hàng
        </button>
        <button
          onClick={() => setTab("Nhà cung cấp")}
          className={`rounded-lg px-3 py-2 text-sm font-medium ${tab === "Nhà cung cấp" ? "bg-blue-600 text-white" : "border border-slate-300 bg-white text-slate-700"}`}
        >
          Nhà cung cấp
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">{tab}</th>
              <th className="px-3 py-2 text-right font-medium">Số dư credit</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {dsHienTai.map((s) => {
              const idDoiTuong = s.doi_tuong === "Khách hàng" ? s.khach_hang_id! : s.nha_cung_cap_id!;
              const canCanTru = s.doi_tuong === "Khách hàng" ? canCanTruKhachHang : canCanTruNcc;
              const nguon = lichSuCua(s).filter((g) => g.loai === "Phát sinh");
              return (
                <Fragment key={s.id}>
                  <tr className="border-t border-slate-100">
                    <td className="px-3 py-2 font-medium text-slate-900">
                      {tenDoiTuong(s)}
                      {nguon.map((g) => (
                        <p key={g.id} className="text-xs font-normal text-slate-500">
                          Từ {one(g.hoa_don_xuat)?.so_hoa_don || one(g.hoa_don_dau_vao)?.so_hoa_don ? `HĐ ${one(g.hoa_don_xuat)?.so_hoa_don || one(g.hoa_don_dau_vao)?.so_hoa_don}` : "giao dịch không gắn số HĐ"} · {g.so_tien.toLocaleString("en-US")} · ghi ngày {new Date(g.created_at).toLocaleDateString("vi-VN")}
                          {g.ly_do ? ` · ${g.ly_do}` : ""}
                        </p>
                      ))}
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-blue-700">{s.so_du.toLocaleString("en-US")}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button onClick={() => setMoRong((prev) => (prev === idDoiTuong ? null : idDoiTuong))} className="text-xs font-medium text-slate-600">
                          {moRong === idDoiTuong ? "Ẩn lịch sử" : "Xem lịch sử"}
                        </button>
                        {canCanTru && (
                          <button onClick={() => handleCanTru(s)} disabled={dangXuLy} className="text-xs font-medium text-amber-600 disabled:opacity-50">
                            Cấn trừ vào hóa đơn
                          </button>
                        )}
                        {canHoanTien && (
                          <button onClick={() => handleHoanTien(s)} disabled={dangXuLy} className="text-xs font-medium text-green-700 disabled:opacity-50">
                            Hoàn tiền
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {moRong === idDoiTuong && (
                    <tr className="border-t border-slate-100 bg-slate-50">
                      <td colSpan={3} className="px-3 py-3">
                        <table className="w-full text-xs">
                          <thead className="text-left text-slate-500">
                            <tr>
                              <th className="px-2 py-1 font-medium">Thời gian</th>
                              <th className="px-2 py-1 font-medium">Loại</th>
                              <th className="px-2 py-1 text-right font-medium">Số tiền</th>
                              <th className="px-2 py-1 text-right font-medium">Số dư sau</th>
                              <th className="px-2 py-1 font-medium">Hóa đơn</th>
                              <th className="px-2 py-1 font-medium">Lý do</th>
                              <th className="px-2 py-1 font-medium">Người thực hiện</th>
                            </tr>
                          </thead>
                          <tbody>
                            {lichSuCua(s).map((g) => {
                              const nv = one(g.nguoi_thuc_hien);
                              const hdx = one(g.hoa_don_xuat);
                              const hddv = one(g.hoa_don_dau_vao);
                              return (
                                <tr key={g.id} className="border-t border-slate-200">
                                  <td className="px-2 py-1">{new Date(g.created_at).toLocaleString("vi-VN")}</td>
                                  <td className="px-2 py-1">
                                    <span className={`rounded-full px-1.5 py-0.5 font-medium ${LOAI_COLOR[g.loai]}`}>{g.loai}</span>
                                  </td>
                                  <td className="px-2 py-1 text-right">{g.so_tien.toLocaleString("en-US")}</td>
                                  <td className="px-2 py-1 text-right">{g.so_du_sau.toLocaleString("en-US")}</td>
                                  <td className="px-2 py-1">{hdx?.so_hoa_don || hddv?.so_hoa_don || "—"}</td>
                                  <td className="px-2 py-1">{g.ly_do || "—"}</td>
                                  <td className="px-2 py-1">{nv?.ho_ten || "—"}</td>
                                </tr>
                              );
                            })}
                            {lichSuCua(s).length === 0 && (
                              <tr>
                                <td colSpan={7} className="px-2 py-2 text-center text-slate-400">
                                  Chưa có giao dịch nào.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {dsHienTai.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-slate-400">
                  Không có {tab.toLowerCase()} nào đang có credit.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {choCanTru && (
        <ConfirmDialog
          title={`Cấn trừ credit — ${tenDoiTuong(choCanTru.soDu)}`}
          message={`Số dư credit hiện có: ${choCanTru.soDu.so_du.toLocaleString("en-US")}.`}
          fields={[
            {
              key: "hoa_don_id",
              label: "Cấn trừ vào hóa đơn",
              type: "select",
              required: true,
              options: choCanTru.dsHoaDon.map((h) => {
                const conLai =
                  choCanTru.soDu.doi_tuong === "Khách hàng"
                    ? (h as HoaDonXuatMo).tong_tien - ((h as HoaDonXuatMo).so_tien_da_thu ?? 0)
                    : (h as HoaDonDauVaoMo).tong_tien_thanh_toan - ((h as HoaDonDauVaoMo).so_tien_da_thanh_toan ?? 0);
                return { value: h.id, label: `${h.so_hoa_don ?? "(chưa có số)"} — còn ${conLai.toLocaleString("en-US")}` };
              }),
            },
            { key: "so_tien", label: "Số tiền cấn trừ", type: "text", required: true, placeholder: "VD: 1000000" },
            { key: "ly_do", label: "Lý do cấn trừ", type: "textarea", required: true, placeholder: "Bắt buộc" },
          ]}
          confirmLabel="Cấn trừ"
          onCancel={() => setChoCanTru(null)}
          onConfirm={(values) => {
            const hd = choCanTru.dsHoaDon.find((h) => h.id === values.hoa_don_id);
            if (!hd) return;
            void xuLyCanTruConfirm(choCanTru.soDu, hd, values);
          }}
        />
      )}

      {choHoanTien && (
        <ConfirmDialog
          title={`Hoàn tiền — ${tenDoiTuong(choHoanTien)}`}
          message={`Số dư hiện có: ${choHoanTien.so_du.toLocaleString("en-US")}.`}
          fields={[
            { key: "so_tien", label: "Số tiền hoàn", type: "text", required: true, defaultValue: String(choHoanTien.so_du) },
            {
              key: "phuong_thuc",
              label: "Phương thức hoàn",
              type: "select",
              defaultValue: "Tài khoản công ty",
              options: [
                { value: "Tiền mặt", label: "Tiền mặt" },
                { value: "Tài khoản công ty", label: "Tài khoản công ty" },
              ],
            },
            { key: "ly_do", label: "Lý do hoàn tiền", type: "textarea", required: true, placeholder: "Bắt buộc" },
          ]}
          confirmLabel="Hoàn tiền"
          onCancel={() => setChoHoanTien(null)}
          onConfirm={(values) => void xuLyHoanTienConfirm(choHoanTien, values)}
        />
      )}
    </div>
  );
}
