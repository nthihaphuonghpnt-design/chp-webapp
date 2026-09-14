"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import SearchableSelect from "@/components/common/SearchableSelect";

interface NhanVien {
  id: string;
  ho_ten: string;
}

interface DonHangRef {
  id: string;
  so_don_hang: string;
}

interface ChiTiet {
  don_hang: DonHangRef | DonHangRef[] | null;
}

type TrangThai = "Nháp" | "Đã duyệt" | "Đã thanh toán" | "Đã hủy";

interface PhieuRow {
  id: string;
  so_phieu: string | null;
  nhan_vien_id: string;
  ngay_quyet_toan: string;
  tong_da_tam_ung: number;
  tong_chi_thuc_te: number;
  chenh_lech_rong: number;
  trang_thai: TrangThai;
  phuong_thuc: string | null;
  nguoi_duyet_id: string | null;
  ghi_chu: string | null;
  created_at: string;
  nhan_vien: { ho_ten: string } | { ho_ten: string }[] | null;
  nguoi_duyet: { ho_ten: string } | { ho_ten: string }[] | null;
  chi_tiet: ChiTiet[] | null;
}

interface DonHangCho {
  don_hang_id: string;
  so_don_hang: string;
  tong_tam_ung: number;
  tong_chi_treo: number;
}

interface XemTruoc {
  tong_tam_ung_luc_tao: number;
  tong_chi_luc_tao: number;
  tong_tam_ung_hien_tai: number;
  tong_chi_hien_tai: number;
  co_thay_doi: boolean;
  don_hang_khong_du_dieu_kien: string[];
}

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

const PHIEU_SELECT_COLS =
  "*, nhan_vien:nhan_vien_id(ho_ten), nguoi_duyet:nguoi_duyet_id(ho_ten), chi_tiet:phieu_quyet_toan_chi_tiet(don_hang:don_hang_id(id, so_don_hang))";

const TRANG_THAI_COLOR: Record<TrangThai, string> = {
  "Nháp": "bg-slate-100 text-slate-600",
  "Đã duyệt": "bg-blue-100 text-blue-700",
  "Đã thanh toán": "bg-green-100 text-green-700",
  "Đã hủy": "bg-red-100 text-red-700",
};

function fmt(n: number) {
  return n.toLocaleString("en-US");
}

export default function PhieuQuyetToanView({
  initialPhieuList,
  nhanVienList,
  currentUserId,
  isKeToanOrGiamDoc,
}: {
  initialPhieuList: PhieuRow[];
  nhanVienList: NhanVien[];
  currentUserId?: string;
  isKeToanOrGiamDoc: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [phieuList, setPhieuList] = useState<PhieuRow[]>(initialPhieuList);
  const [trangThaiFilter, setTrangThaiFilter] = useState("");
  const [nhanVienFilter, setNhanVienFilter] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [driftDialog, setDriftDialog] = useState<{ phieu: PhieuRow; preview: XemTruoc } | null>(null);
  const [payDialog, setPayDialog] = useState<PhieuRow | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function reload() {
    const { data } = await supabase
      .from("phieu_quyet_toan_tam_ung")
      .select(PHIEU_SELECT_COLS)
      .order("created_at", { ascending: false });
    if (data) setPhieuList(data as unknown as PhieuRow[]);
  }

  const filtered = phieuList
    .filter((p) => !trangThaiFilter || p.trang_thai === trangThaiFilter)
    .filter((p) => !nhanVienFilter || p.nhan_vien_id === nhanVienFilter);

  async function handleDuyet(phieu: PhieuRow) {
    setBusy(phieu.id);
    const { error } = await supabase.rpc("duyet_phieu_quyet_toan_tam_ung", {
      p_phieu_id: phieu.id,
      p_xac_nhan_du_lieu_moi: false,
    });
    setBusy(null);
    if (!error) {
      await reload();
      return;
    }
    if (error.message.startsWith("DU_LIEU_DA_THAY_DOI")) {
      const { data } = await supabase.rpc("xem_truoc_duyet_phieu_quyet_toan", { p_phieu_id: phieu.id });
      const preview = Array.isArray(data) ? (data[0] as XemTruoc) : (data as XemTruoc);
      if (preview) setDriftDialog({ phieu, preview });
      else window.alert(error.message);
    } else {
      window.alert(error.message);
    }
  }

  async function handleXacNhanDuyetLai(phieu: PhieuRow) {
    setBusy(phieu.id);
    const { error } = await supabase.rpc("duyet_phieu_quyet_toan_tam_ung", {
      p_phieu_id: phieu.id,
      p_xac_nhan_du_lieu_moi: true,
    });
    setBusy(null);
    if (error) {
      window.alert(error.message);
      return;
    }
    setDriftDialog(null);
    await reload();
  }

  async function handleHuy(phieu: PhieuRow) {
    const canh_bao =
      phieu.trang_thai === "Đã duyệt"
        ? "Phiếu đã duyệt — hủy sẽ GIẢI PHÓNG lại toàn bộ tạm ứng/chi phí đã khóa để có thể đưa vào phiếu khác. Chắc chắn hủy?"
        : "Hủy phiếu nháp này?";
    if (!window.confirm(canh_bao)) return;
    setBusy(phieu.id);
    const { error } = await supabase.rpc("huy_phieu_quyet_toan_tam_ung", { p_phieu_id: phieu.id });
    setBusy(null);
    if (error) {
      window.alert(error.message);
      return;
    }
    await reload();
  }

  async function handleThanhToan(phieu: PhieuRow, phuongThuc: string) {
    setBusy(phieu.id);
    const { error } = await supabase.rpc("thanh_toan_phieu_quyet_toan_tam_ung", {
      p_phieu_id: phieu.id,
      p_phuong_thuc: phuongThuc,
    });
    setBusy(null);
    if (error) {
      window.alert(error.message);
      return;
    }
    setPayDialog(null);
    await reload();
  }

  async function handleSaveGhiChu(phieu: PhieuRow, ghiChu: string) {
    const { error } = await supabase.from("phieu_quyet_toan_tam_ung").update({ ghi_chu: ghiChu || null }).eq("id", phieu.id);
    if (error) window.alert(error.message);
    else await reload();
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Phiếu quyết toán tạm ứng</h1>
          <p className="text-sm text-slate-500">
            Gộp toàn bộ tạm ứng + chi phí treo (trả bằng tạm ứng) của 1 nhân viên theo từng đơn hàng đã hoàn tất, tính
            chênh lệch rồi hoàn/thu 1 lần.
          </p>
        </div>
        {isKeToanOrGiamDoc && (
          <button
            onClick={() => setShowNew(true)}
            className="shrink-0 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm"
          >
            + Tạo phiếu mới
          </button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-2">
        <div>
          <label className="mb-1 block text-xs text-slate-500">Trạng thái</label>
          <select
            value={trangThaiFilter}
            onChange={(e) => setTrangThaiFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"
          >
            <option value="">Tất cả</option>
            <option value="Nháp">Nháp</option>
            <option value="Đã duyệt">Đã duyệt</option>
            <option value="Đã thanh toán">Đã thanh toán</option>
            <option value="Đã hủy">Đã hủy</option>
          </select>
        </div>
        {isKeToanOrGiamDoc && (
          <div>
            <label className="mb-1 block text-xs text-slate-500">Nhân viên</label>
            <select
              value={nhanVienFilter}
              onChange={(e) => setNhanVienFilter(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"
            >
              <option value="">Tất cả</option>
              {nhanVienList.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.ho_ten}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {filtered.map((phieu) => (
          <PhieuCard
            key={phieu.id}
            phieu={phieu}
            isKeToanOrGiamDoc={isKeToanOrGiamDoc}
            busy={busy === phieu.id}
            onDuyet={() => handleDuyet(phieu)}
            onHuy={() => handleHuy(phieu)}
            onThanhToan={() => setPayDialog(phieu)}
            onSaveGhiChu={(gc) => handleSaveGhiChu(phieu, gc)}
          />
        ))}
        {filtered.length === 0 && <p className="py-8 text-center text-sm text-slate-400">Chưa có phiếu nào.</p>}
      </div>

      {showNew && (
        <NewPhieuModal
          nhanVienList={nhanVienList}
          currentUserId={currentUserId}
          isKeToanOrGiamDoc={isKeToanOrGiamDoc}
          supabase={supabase}
          onCancel={() => setShowNew(false)}
          onCreated={async () => {
            setShowNew(false);
            await reload();
          }}
        />
      )}

      {driftDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h2 className="mb-2 text-lg font-semibold text-amber-700">Dữ liệu đã thay đổi</h2>
            <p className="mb-3 text-sm text-slate-600">
              Số liệu hiện tại khác với lúc tạo phiếu {driftDialog.phieu.so_phieu ?? ""} (có thể do 1 đơn hàng bị mở lại,
              hoặc có dòng chi phí bị sửa/thêm sau khi tạo phiếu). Kiểm tra lại trước khi duyệt:
            </p>
            <table className="mb-3 w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="pb-1 font-medium"></th>
                  <th className="pb-1 font-medium">Lúc tạo phiếu</th>
                  <th className="pb-1 font-medium">Hiện tại</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-slate-100">
                  <td className="py-1 text-slate-500">Tổng tạm ứng</td>
                  <td className="py-1">{fmt(driftDialog.preview.tong_tam_ung_luc_tao)}</td>
                  <td className={`py-1 font-medium ${driftDialog.preview.tong_tam_ung_luc_tao !== driftDialog.preview.tong_tam_ung_hien_tai ? "text-amber-700" : ""}`}>
                    {fmt(driftDialog.preview.tong_tam_ung_hien_tai)}
                  </td>
                </tr>
                <tr className="border-t border-slate-100">
                  <td className="py-1 text-slate-500">Tổng chi treo</td>
                  <td className="py-1">{fmt(driftDialog.preview.tong_chi_luc_tao)}</td>
                  <td className={`py-1 font-medium ${driftDialog.preview.tong_chi_luc_tao !== driftDialog.preview.tong_chi_hien_tai ? "text-amber-700" : ""}`}>
                    {fmt(driftDialog.preview.tong_chi_hien_tai)}
                  </td>
                </tr>
              </tbody>
            </table>
            {driftDialog.preview.don_hang_khong_du_dieu_kien.length > 0 && (
              <p className="mb-3 rounded-lg bg-red-50 p-2 text-xs text-red-700">
                {driftDialog.preview.don_hang_khong_du_dieu_kien.length} đơn hàng trong phiếu này không còn đủ điều
                kiện (có thể đã bị Mở lại phần việc) — nếu duyệt tiếp, số liệu sẽ được tính lại KHÔNG bao gồm các đơn
                hàng này.
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setDriftDialog(null)}
                className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700"
              >
                Để xem lại
              </button>
              <button
                onClick={() => handleXacNhanDuyetLai(driftDialog.phieu)}
                className="flex-1 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white"
              >
                Xác nhận duyệt với số liệu mới
              </button>
            </div>
          </div>
        </div>
      )}

      {payDialog && (
        <PayDialog phieu={payDialog} onCancel={() => setPayDialog(null)} onConfirm={(pt) => handleThanhToan(payDialog, pt)} />
      )}
    </div>
  );
}

function PhieuCard({
  phieu,
  isKeToanOrGiamDoc,
  busy,
  onDuyet,
  onHuy,
  onThanhToan,
  onSaveGhiChu,
}: {
  phieu: PhieuRow;
  isKeToanOrGiamDoc: boolean;
  busy: boolean;
  onDuyet: () => void;
  onHuy: () => void;
  onThanhToan: () => void;
  onSaveGhiChu: (ghiChu: string) => void;
}) {
  const [ghiChu, setGhiChu] = useState(phieu.ghi_chu ?? "");
  const donHangList = (phieu.chi_tiet ?? []).map((c) => one(c.don_hang)).filter((d): d is DonHangRef => !!d);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="font-semibold text-slate-900">{phieu.so_phieu ?? "(chưa có số)"}</span>
          <span className="ml-2 text-slate-500">{one(phieu.nhan_vien)?.ho_ten ?? "—"}</span>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${TRANG_THAI_COLOR[phieu.trang_thai]}`}>{phieu.trang_thai}</span>
      </div>

      <p className="text-slate-500">Ngày quyết toán: {phieu.ngay_quyet_toan}</p>
      <p className="mt-1 text-slate-600">
        Đơn hàng ({donHangList.length}): {donHangList.map((d) => d.so_don_hang).join(", ") || "—"}
      </p>

      <div className="mt-2 grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-2 text-center">
        <div>
          <p className="text-xs text-slate-500">Tổng tạm ứng</p>
          <p className="font-medium text-slate-900">{fmt(phieu.tong_da_tam_ung)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Tổng chi thực tế</p>
          <p className="font-medium text-slate-900">{fmt(phieu.tong_chi_thuc_te)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">{phieu.chenh_lech_rong >= 0 ? "Còn phải hoàn (NV nợ)" : "Công ty phải trả thêm"}</p>
          <p className={`font-semibold ${phieu.chenh_lech_rong >= 0 ? "text-amber-700" : "text-red-700"}`}>{fmt(Math.abs(phieu.chenh_lech_rong))}</p>
        </div>
      </div>

      {phieu.trang_thai === "Đã thanh toán" && (
        <p className="mt-2 text-xs text-slate-500">
          Đã thanh toán qua {phieu.phuong_thuc} · Người duyệt: {one(phieu.nguoi_duyet)?.ho_ten ?? "—"}
        </p>
      )}
      {phieu.trang_thai === "Đã duyệt" && (
        <p className="mt-2 text-xs text-slate-500">Người duyệt: {one(phieu.nguoi_duyet)?.ho_ten ?? "—"}</p>
      )}

      {isKeToanOrGiamDoc && phieu.trang_thai !== "Đã thanh toán" && phieu.trang_thai !== "Đã hủy" ? (
        <div className="mt-2">
          <input
            value={ghiChu}
            onChange={(e) => setGhiChu(e.target.value)}
            onBlur={() => {
              if (ghiChu !== (phieu.ghi_chu ?? "")) onSaveGhiChu(ghiChu);
            }}
            placeholder="Ghi chú..."
            className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs"
          />
        </div>
      ) : phieu.ghi_chu ? (
        <p className="mt-2 text-xs text-slate-500">Ghi chú: {phieu.ghi_chu}</p>
      ) : null}

      {isKeToanOrGiamDoc && (
        <div className="mt-3 flex flex-wrap gap-3">
          {phieu.trang_thai === "Nháp" && (
            <>
              <button disabled={busy} onClick={onDuyet} className="text-xs font-medium text-green-600 disabled:opacity-50">
                Duyệt
              </button>
              <button disabled={busy} onClick={onHuy} className="text-xs font-medium text-red-600 disabled:opacity-50">
                Hủy phiếu
              </button>
            </>
          )}
          {phieu.trang_thai === "Đã duyệt" && (
            <>
              <button disabled={busy} onClick={onThanhToan} className="text-xs font-medium text-blue-600 disabled:opacity-50">
                Đánh dấu đã thanh toán
              </button>
              <button disabled={busy} onClick={onHuy} className="text-xs font-medium text-red-600 disabled:opacity-50">
                Hủy phiếu
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function PayDialog({
  phieu,
  onCancel,
  onConfirm,
}: {
  phieu: PhieuRow;
  onCancel: () => void;
  onConfirm: (phuongThuc: string) => void;
}) {
  const [phuongThuc, setPhuongThuc] = useState("Tiền mặt");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Đánh dấu đã thanh toán</h2>
        <p className="mb-3 text-sm text-slate-600">
          {phieu.chenh_lech_rong >= 0 ? "Thu lại từ nhân viên (họ tạm ứng dư)" : "Chi thêm cho nhân viên (công ty còn nợ)"}:{" "}
          <strong>{fmt(Math.abs(phieu.chenh_lech_rong))}</strong>. Số này sẽ tự tạo 1 dòng trong Sổ quỹ.
        </p>
        <label className="mb-1 block text-sm font-medium text-slate-700">Phương thức</label>
        <select
          value={phuongThuc}
          onChange={(e) => setPhuongThuc(e.target.value)}
          className="mb-4 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="Tiền mặt">Tiền mặt</option>
          <option value="Tài khoản công ty">Tài khoản công ty</option>
        </select>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700">
            Hủy
          </button>
          <button onClick={() => onConfirm(phuongThuc)} className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white">
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
}

function NewPhieuModal({
  nhanVienList,
  currentUserId,
  isKeToanOrGiamDoc,
  supabase,
  onCancel,
  onCreated,
}: {
  nhanVienList: NhanVien[];
  currentUserId?: string;
  isKeToanOrGiamDoc: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any;
  onCancel: () => void;
  onCreated: () => void;
}) {
  const [nhanVienId, setNhanVienId] = useState("");
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<DonHangCho[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  async function handlePickNhanVien(id: string) {
    setNhanVienId(id);
    setOrders([]);
    setSelected({});
    setErrMsg(null);
    if (!id) return;
    setLoading(true);
    const { data, error } = await supabase.rpc("don_hang_cho_quyet_toan", { p_nhan_vien_id: id });
    setLoading(false);
    if (error) {
      setErrMsg(error.message);
      return;
    }
    const rows = (data ?? []) as DonHangCho[];
    setOrders(rows);
    const all: Record<string, boolean> = {};
    for (const r of rows) all[r.don_hang_id] = true;
    setSelected(all);
  }

  const selectedIds = Object.keys(selected).filter((id) => selected[id]);
  const tongTamUng = orders.filter((o) => selected[o.don_hang_id]).reduce((s, o) => s + o.tong_tam_ung, 0);
  const tongChiTreo = orders.filter((o) => selected[o.don_hang_id]).reduce((s, o) => s + o.tong_chi_treo, 0);

  async function handleSubmit() {
    if (!nhanVienId || selectedIds.length === 0) {
      setErrMsg("Chọn nhân viên và ít nhất 1 đơn hàng.");
      return;
    }
    setSaving(true);
    setErrMsg(null);
    const { error } = await supabase.rpc("tao_phieu_quyet_toan_tam_ung", {
      p_nhan_vien_id: nhanVienId,
      p_don_hang_ids: selectedIds,
    });
    setSaving(false);
    if (error) {
      setErrMsg(error.message);
      return;
    }
    onCreated();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-lg sm:rounded-2xl">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Tạo phiếu quyết toán tạm ứng</h2>

        <label className="mb-1 block text-sm font-medium text-slate-700">Nhân viên</label>
        {isKeToanOrGiamDoc ? (
          <SearchableSelect
            options={nhanVienList.map((n) => ({ value: n.id, label: n.ho_ten }))}
            value={nhanVienId}
            onChange={handlePickNhanVien}
          />
        ) : (
          <p className="text-sm text-slate-500">{nhanVienList.find((n) => n.id === currentUserId)?.ho_ten ?? "Bạn"}</p>
        )}

        {loading && <p className="mt-3 text-sm text-slate-400">Đang tải danh sách đơn hàng...</p>}

        {!loading && nhanVienId && orders.length === 0 && (
          <p className="mt-3 rounded-lg bg-amber-50 p-2 text-sm text-amber-800">
            Nhân viên này chưa có đơn hàng nào đủ điều kiện quyết toán (phải đã được Kế toán tiếp nhận phần việc và
            còn tạm ứng/chi phí treo chưa quyết toán).
          </p>
        )}

        {orders.length > 0 && (
          <div className="mt-3">
            <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
              <span>Chọn đơn hàng đưa vào phiếu</span>
              <button
                type="button"
                onClick={() => {
                  const allChecked = orders.every((o) => selected[o.don_hang_id]);
                  const next: Record<string, boolean> = {};
                  for (const o of orders) next[o.don_hang_id] = !allChecked;
                  setSelected(next);
                }}
                className="font-medium text-blue-600"
              >
                {orders.every((o) => selected[o.don_hang_id]) ? "Bỏ chọn tất cả" : "Chọn tất cả"}
              </button>
            </div>
            <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200">
              {orders.map((o) => (
                <label key={o.don_hang_id} className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 text-sm last:border-b-0">
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!selected[o.don_hang_id]}
                      onChange={(e) => setSelected((prev) => ({ ...prev, [o.don_hang_id]: e.target.checked }))}
                    />
                    {o.so_don_hang}
                  </span>
                  <span className="text-xs text-slate-500">
                    Ứng {fmt(o.tong_tam_ung)} · Chi treo {fmt(o.tong_chi_treo)}
                  </span>
                </label>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-2 text-center text-sm">
              <div>
                <p className="text-xs text-slate-500">Tổng tạm ứng</p>
                <p className="font-medium">{fmt(tongTamUng)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Tổng chi treo</p>
                <p className="font-medium">{fmt(tongChiTreo)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Chênh lệch</p>
                <p className="font-semibold">{fmt(tongTamUng - tongChiTreo)}</p>
              </div>
            </div>
          </div>
        )}

        {errMsg && <p className="mt-3 rounded-lg bg-red-50 p-2 text-xs text-red-700">{errMsg}</p>}

        <div className="mt-6 flex gap-3">
          <button type="button" onClick={onCancel} className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700">
            Hủy
          </button>
          <button
            type="button"
            disabled={saving || selectedIds.length === 0}
            onClick={handleSubmit}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? "Đang tạo..." : "Tạo phiếu"}
          </button>
        </div>
      </div>
    </div>
  );
}
