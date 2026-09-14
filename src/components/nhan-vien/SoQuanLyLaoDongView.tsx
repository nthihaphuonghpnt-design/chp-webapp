"use client";

import { xuatExcelKeO, CONG_TY_HEADER_LINES, taiLogoCongTy, type ExcelColumn } from "@/lib/excel";

export interface DongLaoDong {
  id: string;
  ho_ten: string;
  gioi_tinh: string | null;
  ngay_sinh: string | null;
  quoc_tich: string | null;
  noi_cu_tru: string | null;
  so_cccd: string | null;
  trinh_do_chuyen_mon: string | null;
  phong_ban: string;
  loai_hop_dong: string | null;
  ngay_vao_lam: string | null;
  co_dong_bhxh: boolean;
  luong_co_dinh: number | null;
  so_ngay_nghi_trong_nam: number;
  dang_lam_viec: boolean;
  ngay_nghi_viec: string | null;
  ly_do_nghi_viec: string | null;
}

const CHUA_CO_DU_LIEU =
  'Chưa theo dõi trên hệ thống — cần bổ sung thủ công: "Nâng bậc/nâng lương", "Số giờ làm thêm", "Đào tạo/bồi dưỡng", "Kỷ luật lao động/trách nhiệm vật chất", "Tai nạn lao động/bệnh nghề nghiệp".';

export default function SoQuanLyLaoDongView({ rows, namHienTai }: { rows: DongLaoDong[]; namHienTai: number }) {
  async function handleExportExcel() {
    const columns: ExcelColumn[] = [
      { header: "Họ và tên", key: "hoTen", width: 22 },
      { header: "Giới tính", key: "gioiTinh", width: 10 },
      { header: "Ngày sinh", key: "ngaySinh", width: 12 },
      { header: "Quốc tịch", key: "quocTich", width: 12 },
      { header: "Nơi cư trú", key: "noiCuTru", width: 26 },
      { header: "Số CCCD/hộ chiếu", key: "cccd", width: 16 },
      { header: "Trình độ chuyên môn kỹ thuật", key: "trinhDo", width: 22 },
      { header: "Vị trí việc làm", key: "viTri", width: 16 },
      { header: "Loại hợp đồng lao động", key: "loaiHd", width: 20 },
      { header: "Thời điểm bắt đầu làm việc", key: "batDau", width: 16 },
      { header: "Tham gia BHXH/BHYT/BHTN", key: "bhxh", width: 18 },
      { header: "Tiền lương", key: "luong", width: 14, numFmt: "#,##0" },
      { header: `Số ngày nghỉ trong năm ${namHienTai}`, key: "ngayNghi", width: 14 },
      { header: "Nâng bậc, nâng lương", key: "nangBac", width: 24 },
      { header: "Số giờ làm thêm", key: "gioLamThem", width: 16 },
      { header: "Học nghề, đào tạo, bồi dưỡng", key: "daoTao", width: 24 },
      { header: "Kỷ luật lao động, trách nhiệm vật chất", key: "kyLuat", width: 24 },
      { header: "Tai nạn lao động, bệnh nghề nghiệp", key: "taiNan", width: 24 },
      { header: "Thời điểm chấm dứt HĐLĐ", key: "chamDut", width: 16 },
      { header: "Lý do chấm dứt HĐLĐ", key: "lyDoChamDut", width: 22 },
    ];
    const exportRows = rows.map((r) => [
      r.ho_ten,
      r.gioi_tinh ?? "",
      r.ngay_sinh ?? "",
      r.quoc_tich ?? "",
      r.noi_cu_tru ?? "",
      r.so_cccd ?? "",
      r.trinh_do_chuyen_mon ?? "",
      r.phong_ban,
      r.loai_hop_dong ?? "",
      r.ngay_vao_lam ?? "",
      r.co_dong_bhxh ? "Có" : "Không",
      r.luong_co_dinh ?? "",
      r.so_ngay_nghi_trong_nam,
      "",
      "",
      "",
      "",
      "",
      r.ngay_nghi_viec ?? "",
      r.ly_do_nghi_viec ?? "",
    ]);
    const logo = await taiLogoCongTy();
    await xuatExcelKeO(`so-quan-ly-lao-dong-${new Date().toISOString().slice(0, 10)}.xlsx`, {
      sheetName: "Sổ quản lý lao động",
      logo: logo ?? undefined,
      headerLines: [
        ...CONG_TY_HEADER_LINES,
        "",
        { text: "SỔ QUẢN LÝ LAO ĐỘNG", bold: true, size: 12 },
        { text: "(Theo Điều 3 Nghị định 145/2020/NĐ-CP hướng dẫn Bộ luật Lao động)", italic: true, size: 9 },
        { text: CHUA_CO_DU_LIEU, italic: true, size: 9 },
      ],
      columns,
      rows: exportRows,
    });
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Sổ quản lý lao động</h1>
          <p className="text-xs text-slate-500">Theo Điều 3 Nghị định 145/2020/NĐ-CP hướng dẫn Bộ luật Lao động</p>
        </div>
        <button onClick={handleExportExcel} className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white">
          Xuất Excel
        </button>
      </div>

      <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">{CHUA_CO_DU_LIEU}</div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[1400px] text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              {[
                "Họ tên",
                "Giới tính",
                "Ngày sinh",
                "Quốc tịch",
                "Nơi cư trú",
                "Số CCCD",
                "Trình độ CMKT",
                "Vị trí",
                "Loại HĐLĐ",
                "Bắt đầu làm",
                "BHXH/BHYT/BHTN",
                "Lương",
                `Ngày nghỉ ${namHienTai}`,
                "Trạng thái",
              ].map((h) => (
                <th key={h} className="px-3 py-2 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-3 py-2 font-medium text-slate-900">{r.ho_ten}</td>
                <td className="px-3 py-2">{r.gioi_tinh ?? "—"}</td>
                <td className="px-3 py-2">{r.ngay_sinh ?? "—"}</td>
                <td className="px-3 py-2">{r.quoc_tich ?? "—"}</td>
                <td className="px-3 py-2">{r.noi_cu_tru ?? "—"}</td>
                <td className="px-3 py-2">{r.so_cccd ?? "—"}</td>
                <td className="px-3 py-2">{r.trinh_do_chuyen_mon ?? "—"}</td>
                <td className="px-3 py-2">{r.phong_ban}</td>
                <td className="px-3 py-2">{r.loai_hop_dong ?? "—"}</td>
                <td className="px-3 py-2">{r.ngay_vao_lam ?? "—"}</td>
                <td className="px-3 py-2">{r.co_dong_bhxh ? "Có" : "Không"}</td>
                <td className="px-3 py-2">{r.luong_co_dinh?.toLocaleString("en-US") ?? "—"}</td>
                <td className="px-3 py-2">{r.so_ngay_nghi_trong_nam}</td>
                <td className="px-3 py-2">
                  {r.dang_lam_viec ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Đang làm việc</span>
                  ) : (
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600" title={r.ly_do_nghi_viec ?? ""}>
                      Đã nghỉ {r.ngay_nghi_viec ? `(${r.ngay_nghi_viec})` : ""}
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={14} className="px-4 py-8 text-center text-slate-400">
                  Chưa có dữ liệu nhân viên.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
