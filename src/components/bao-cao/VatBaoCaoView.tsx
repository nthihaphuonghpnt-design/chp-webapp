"use client";

import { Fragment, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { xuatExcelKeO, CONG_TY_HEADER_LINES, taiLogoCongTy, type ExcelColumn } from "@/lib/excel";
import {
  gomVatTheoKy,
  tinhVatTheoKy,
  kyTuThang,
  kyThangHoaDonXuat,
  kyThangHoaDonDauVao,
  tinhVaoVatDauRa,
  tinhVaoVatDauVaoDuocKhauTru,
  type VatGranularity,
  type HoaDonXuatVatRow,
  type HoaDonDauVaoVatRow,
} from "@/lib/vat";

interface HoaDonXuatRow extends HoaDonXuatVatRow {
  so_hoa_don: string | null;
  khach_hang_ten: string;
}
interface HoaDonDauVaoRow extends HoaDonDauVaoVatRow {
  so_hoa_don: string | null;
  nha_cung_cap_ten: string;
}

const GRANULARITY_LABEL: Record<VatGranularity, string> = { thang: "Tháng", quy: "Quý", nam: "Năm" };

export default function VatBaoCaoView({
  hoaDonXuatList,
  hoaDonDauVaoList,
}: {
  hoaDonXuatList: HoaDonXuatRow[];
  hoaDonDauVaoList: HoaDonDauVaoRow[];
}) {
  const searchParams = useSearchParams();
  const [granularity, setGranularity] = useState<VatGranularity>("thang");
  // Granularity mac dinh la "thang" nen kyTuThang(ky, "thang") === ky — khoi
  // tao truc tiep tu query param, khong can effect rieng chi de setState 1 lan.
  const [kyMoRong, setKyMoRong] = useState<string | null>(() => searchParams.get("ky"));

  const { vatRaTheoKy, vatVaoTheoKy } = useMemo(
    () => gomVatTheoKy(hoaDonXuatList, hoaDonDauVaoList, granularity),
    [hoaDonXuatList, hoaDonDauVaoList, granularity],
  );

  const danhSachKy = useMemo(() => {
    const tatCa = new Set<string>([...vatRaTheoKy.keys(), ...vatVaoTheoKy.keys()]);
    return Array.from(tatCa).sort();
  }, [vatRaTheoKy, vatVaoTheoKy]);

  const tongHop = useMemo(() => tinhVatTheoKy(danhSachKy, vatRaTheoKy, vatVaoTheoKy), [danhSachKy, vatRaTheoKy, vatVaoTheoKy]);

  function hoaDonXuatCuaKy(ky: string) {
    return hoaDonXuatList.filter((h) => tinhVaoVatDauRa(h) && kyTuThang(kyThangHoaDonXuat(h), granularity) === ky);
  }
  function hoaDonDauVaoCuaKy(ky: string) {
    return hoaDonDauVaoList.filter((h) => tinhVaoVatDauVaoDuocKhauTru(h) && kyTuThang(kyThangHoaDonDauVao(h), granularity) === ky);
  }

  async function handleExportExcel() {
    const columns: ExcelColumn[] = [
      { header: "Kỳ", key: "ky", width: 12 },
      { header: "VAT đầu ra", key: "vatRa", width: 16, numFmt: "#,##0" },
      { header: "VAT đầu vào đủ điều kiện", key: "vatVao", width: 20, numFmt: "#,##0" },
      { header: "Khấu trừ từ kỳ trước", key: "khauTru", width: 18, numFmt: "#,##0" },
      { header: "Phải nộp (âm = được khấu trừ)", key: "phaiNop", width: 22, numFmt: "#,##0" },
      { header: "Chuyển kỳ sau", key: "chuyenKy", width: 16, numFmt: "#,##0" },
    ];
    const rows = tongHop.map((t) => [t.ky, t.vatRa, t.vatVaoDuDieuKien, t.khauTruTuKyTruoc, t.phaiNopHoacDuocKhauTru, t.chuyenKySau]);
    const logo = await taiLogoCongTy();
    await xuatExcelKeO(`bao-cao-vat-${granularity}.xlsx`, {
      sheetName: "Báo cáo VAT",
      logo: logo ?? undefined,
      headerLines: [
        ...CONG_TY_HEADER_LINES,
        "",
        { text: `TỔNG HỢP VAT THEO ${GRANULARITY_LABEL[granularity].toUpperCase()}`, bold: true, size: 12 },
      ],
      columns,
      rows,
    });
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Báo cáo VAT</h1>
        <div className="flex flex-wrap gap-2">
          <select
            value={granularity}
            onChange={(e) => {
              setGranularity(e.target.value as VatGranularity);
              setKyMoRong(null);
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="thang">Theo tháng</option>
            <option value="quy">Theo quý</option>
            <option value="nam">Theo năm</option>
          </select>
          <button onClick={handleExportExcel} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            Xuất Excel
          </button>
        </div>
      </div>

      <p className="mb-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
        Giới hạn: hệ thống chưa theo dõi &quot;kỳ đã nộp tờ khai&quot;, nên bảng này KHÔNG phân biệt được trường hợp phải làm tờ khai bổ sung
        (01/KHBS theo Nghị định 123/2020/NĐ-CP) khi kỳ gốc đã nộp trước đó. Hóa đơn Điều chỉnh/Thay thế được tính theo quy tắc: hóa đơn gốc bị{" "}
        <strong>Đã thay thế</strong> loại khỏi tổng hợp (coi như chưa từng phát hành hợp lệ), hóa đơn gốc bị <strong>Đã điều chỉnh</strong> vẫn tính
        vào kỳ của nó, dòng Điều chỉnh/Thay thế mới tính vào kỳ riêng của nó. Kế toán cần đối chiếu lại với thực tế kê khai của công ty.
      </p>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">Kỳ</th>
              <th className="px-3 py-2 text-right font-medium">VAT đầu ra</th>
              <th className="px-3 py-2 text-right font-medium">VAT đầu vào đủ điều kiện</th>
              <th className="px-3 py-2 text-right font-medium">Khấu trừ từ kỳ trước</th>
              <th className="px-3 py-2 text-right font-medium">Phải nộp / được khấu trừ</th>
              <th className="px-3 py-2 text-right font-medium">Chuyển kỳ sau</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {tongHop.map((t) => (
              <Fragment key={t.ky}>
                <tr className="border-t border-slate-100">
                  <td className="px-3 py-2 font-medium text-slate-900">{t.ky}</td>
                  <td className="px-3 py-2 text-right text-slate-700">{t.vatRa.toLocaleString("en-US")}</td>
                  <td className="px-3 py-2 text-right text-slate-700">{t.vatVaoDuDieuKien.toLocaleString("en-US")}</td>
                  <td className="px-3 py-2 text-right text-slate-700">{t.khauTruTuKyTruoc.toLocaleString("en-US")}</td>
                  <td className={`px-3 py-2 text-right font-medium ${t.phaiNopHoacDuocKhauTru > 0 ? "text-red-600" : "text-green-700"}`}>
                    {t.phaiNopHoacDuocKhauTru > 0
                      ? `Phải nộp ${t.phaiNopHoacDuocKhauTru.toLocaleString("en-US")}`
                      : `Được khấu trừ ${Math.abs(t.phaiNopHoacDuocKhauTru).toLocaleString("en-US")}`}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-700">{t.chuyenKySau.toLocaleString("en-US")}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => setKyMoRong((prev) => (prev === t.ky ? null : t.ky))}
                      className="text-xs font-medium text-blue-600"
                    >
                      {kyMoRong === t.ky ? "Ẩn" : "Xem chi tiết"}
                    </button>
                  </td>
                </tr>
                {kyMoRong === t.ky && (
                  <tr className="border-t border-slate-100 bg-slate-50">
                    <td colSpan={7} className="px-3 py-3">
                      <ChiTietKy hoaDonXuat={hoaDonXuatCuaKy(t.ky)} hoaDonDauVao={hoaDonDauVaoCuaKy(t.ky)} vatRa={t.vatRa} vatVao={t.vatVaoDuDieuKien} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {tongHop.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  Chưa có hóa đơn nào để tổng hợp VAT.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ChiTietKy({
  hoaDonXuat,
  hoaDonDauVao,
  vatRa,
  vatVao,
}: {
  hoaDonXuat: HoaDonXuatRow[];
  hoaDonDauVao: HoaDonDauVaoRow[];
  vatRa: number;
  vatVao: number;
}) {
  const tongVatRaThucTe = hoaDonXuat.reduce((s, h) => s + (h.tien_vat ?? 0), 0);
  const tongVatVaoThucTe = hoaDonDauVao.reduce((s, h) => s + (h.tien_thue_gtgt ?? 0), 0);
  const khopRa = tongVatRaThucTe === vatRa;
  const khopVao = tongVatVaoThucTe === vatVao;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div>
        <p className="mb-1 text-xs font-medium text-slate-600">VAT đầu ra — hóa đơn xuất ({hoaDonXuat.length})</p>
        <table className="w-full text-xs">
          <thead className="text-left text-slate-500">
            <tr>
              <th className="px-2 py-1 font-medium">Số HĐ</th>
              <th className="px-2 py-1 font-medium">Khách hàng</th>
              <th className="px-2 py-1 font-medium">Loại</th>
              <th className="px-2 py-1 text-right font-medium">Tiền VAT</th>
            </tr>
          </thead>
          <tbody>
            {hoaDonXuat.map((h) => (
              <tr key={h.id} className="border-t border-slate-200">
                <td className="px-2 py-1">{h.so_hoa_don || "(chưa có số)"}</td>
                <td className="px-2 py-1">{h.khach_hang_ten}</td>
                <td className="px-2 py-1">{h.loai_hoa_don}</td>
                <td className="px-2 py-1 text-right">{(h.tien_vat ?? 0).toLocaleString("en-US")}</td>
              </tr>
            ))}
            {hoaDonXuat.length === 0 && (
              <tr>
                <td colSpan={4} className="px-2 py-2 text-center text-slate-400">
                  Không có.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <p className={`mt-1 text-xs font-medium ${khopRa ? "text-green-700" : "text-red-600"}`}>
          {khopRa ? "Khớp tổng VAT đầu ra." : `Chênh lệch ${(vatRa - tongVatRaThucTe).toLocaleString("en-US")} so với tổng kỳ.`}
        </p>
      </div>
      <div>
        <p className="mb-1 text-xs font-medium text-slate-600">VAT đầu vào đủ điều kiện — hóa đơn NCC ({hoaDonDauVao.length})</p>
        <table className="w-full text-xs">
          <thead className="text-left text-slate-500">
            <tr>
              <th className="px-2 py-1 font-medium">Số HĐ</th>
              <th className="px-2 py-1 font-medium">Nhà cung cấp</th>
              <th className="px-2 py-1 text-right font-medium">Tiền VAT</th>
            </tr>
          </thead>
          <tbody>
            {hoaDonDauVao.map((h) => (
              <tr key={h.id} className="border-t border-slate-200">
                <td className="px-2 py-1">{h.so_hoa_don || "(chưa có số)"}</td>
                <td className="px-2 py-1">{h.nha_cung_cap_ten}</td>
                <td className="px-2 py-1 text-right">{(h.tien_thue_gtgt ?? 0).toLocaleString("en-US")}</td>
              </tr>
            ))}
            {hoaDonDauVao.length === 0 && (
              <tr>
                <td colSpan={3} className="px-2 py-2 text-center text-slate-400">
                  Không có.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <p className={`mt-1 text-xs font-medium ${khopVao ? "text-green-700" : "text-red-600"}`}>
          {khopVao ? "Khớp tổng VAT đầu vào." : `Chênh lệch ${(vatVao - tongVatVaoThucTe).toLocaleString("en-US")} so với tổng kỳ.`}
        </p>
      </div>
    </div>
  );
}
