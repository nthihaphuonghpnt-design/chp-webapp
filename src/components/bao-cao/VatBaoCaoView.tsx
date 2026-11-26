"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ConfirmDialog from "@/components/common/ConfirmDialog";
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
  type TongHopVatKy,
} from "@/lib/vat";

interface HoaDonXuatRow extends HoaDonXuatVatRow {
  so_hoa_don: string | null;
  khach_hang_ten: string;
  vat_percent: number | null;
  updated_at: string;
}
interface HoaDonDauVaoRow extends HoaDonDauVaoVatRow {
  so_hoa_don: string | null;
  nha_cung_cap_ten: string;
  tong_tien_hang: number | null;
  updated_at: string;
}
interface KyKeKhaiRow {
  ky: string;
  granularity: string;
  trang_thai: "Đã kê khai" | "Đã nộp bổ sung";
  so_lieu_da_khai: { vatRa: number; vatVaoDuDieuKien: number; khauTruTuKyTruoc: number; phaiNopHoacDuocKhauTru: number; chuyenKySau: number };
  so_lan_bo_sung: number;
  ngay_ke_khai: string;
}

const GRANULARITY_LABEL: Record<VatGranularity, string> = { thang: "Tháng", quy: "Quý", nam: "Năm" };

// So sanh so lieu da ke khai (snapshot) voi so lieu song hien tai — sai lech
// duoi 1 dong (lam tron) coi nhu khop, tranh bao dong gia do lam tron so thuc.
function soLieuKhopNhau(a: KyKeKhaiRow["so_lieu_da_khai"], b: TongHopVatKy): boolean {
  return (
    Math.abs(a.vatRa - b.vatRa) < 1 &&
    Math.abs(a.vatVaoDuDieuKien - b.vatVaoDuDieuKien) < 1 &&
    Math.abs(a.khauTruTuKyTruoc - b.khauTruTuKyTruoc) < 1 &&
    Math.abs(a.phaiNopHoacDuocKhauTru - b.phaiNopHoacDuocKhauTru) < 1
  );
}

export default function VatBaoCaoView({
  hoaDonXuatList,
  hoaDonDauVaoList,
  kyKeKhaiList,
}: {
  hoaDonXuatList: HoaDonXuatRow[];
  hoaDonDauVaoList: HoaDonDauVaoRow[];
  kyKeKhaiList: KyKeKhaiRow[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const searchParams = useSearchParams();
  const [granularity, setGranularity] = useState<VatGranularity>("thang");
  // Granularity mac dinh la "thang" nen kyTuThang(ky, "thang") === ky — khoi
  // tao truc tiep tu query param, khong can effect rieng chi de setState 1 lan.
  const [kyMoRong, setKyMoRong] = useState<string | null>(() => searchParams.get("ky"));
  const [dangXuLyKy, setDangXuLyKy] = useState<string | null>(null);

  const kyKeKhaiMap = useMemo(() => {
    const m = new Map<string, KyKeKhaiRow>();
    for (const k of kyKeKhaiList) m.set(`${k.ky}|${k.granularity}`, k);
    return m;
  }, [kyKeKhaiList]);

  const { vatRaTheoKy, vatVaoTheoKy } = useMemo(
    () => gomVatTheoKy(hoaDonXuatList, hoaDonDauVaoList, granularity),
    [hoaDonXuatList, hoaDonDauVaoList, granularity],
  );

  // P1 muc 3 (2026-11-26): dem so hoa don dau vao con "Chua xac dinh" dieu
  // kien khau tru theo tung ky — de ke toan khong bo sot (hien tai cac dong
  // nay bi loai hoan toan khoi vatVaoTheoKy nen de xem dai nhu khong ton tai).
  const chuaXacDinhTheoKy = useMemo(() => {
    const m = new Map<string, number>();
    for (const h of hoaDonDauVaoList) {
      if (h.chi_ho || h.dieu_kien_khau_tru !== "Chưa xác định") continue;
      const ky = kyTuThang(kyThangHoaDonDauVao(h), granularity);
      m.set(ky, (m.get(ky) ?? 0) + 1);
    }
    return m;
  }, [hoaDonDauVaoList, granularity]);

  const danhSachKy = useMemo(() => {
    const tatCa = new Set<string>([...vatRaTheoKy.keys(), ...vatVaoTheoKy.keys(), ...chuaXacDinhTheoKy.keys()]);
    return Array.from(tatCa).sort();
  }, [vatRaTheoKy, vatVaoTheoKy, chuaXacDinhTheoKy]);

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

  async function handleDanhDauDaKeKhai(t: TongHopVatKy) {
    setDangXuLyKy(t.ky);
    const { error } = await supabase.rpc("danh_dau_da_ke_khai_vat", {
      p_ky: t.ky,
      p_granularity: granularity,
      p_so_lieu: {
        vatRa: t.vatRa,
        vatVaoDuDieuKien: t.vatVaoDuDieuKien,
        khauTruTuKyTruoc: t.khauTruTuKyTruoc,
        phaiNopHoacDuocKhauTru: t.phaiNopHoacDuocKhauTru,
        chuyenKySau: t.chuyenKySau,
      },
    });
    setDangXuLyKy(null);
    if (error) {
      alert(`Không đánh dấu được: ${error.message}`);
      return;
    }
    router.refresh();
  }

  // window.prompt() khong duoc trinh duyet nhung ho tro (xem HoaDonView.tsx
  // muc 5e) — thay bang ConfirmDialog.
  const [choBoSung01Khbs, setChoBoSung01Khbs] = useState<TongHopVatKy | null>(null);

  function handleBoSung01Khbs(t: TongHopVatKy) {
    setChoBoSung01Khbs(t);
  }

  async function xuLyBoSung01KhbsConfirm(t: TongHopVatKy, lyDo: string) {
    setChoBoSung01Khbs(null);
    setDangXuLyKy(t.ky);
    const { error } = await supabase.rpc("ghi_nhan_bo_sung_01khbs", {
      p_ky: t.ky,
      p_granularity: granularity,
      p_so_lieu_moi: {
        vatRa: t.vatRa,
        vatVaoDuDieuKien: t.vatVaoDuDieuKien,
        khauTruTuKyTruoc: t.khauTruTuKyTruoc,
        phaiNopHoacDuocKhauTru: t.phaiNopHoacDuocKhauTru,
        chuyenKySau: t.chuyenKySau,
      },
      p_ly_do: lyDo.trim(),
    });
    setDangXuLyKy(null);
    if (error) {
      alert(`Không ghi nhận được: ${error.message}`);
      return;
    }
    router.refresh();
  }

  // Xuat file du lieu ho tro lap To khai 01/GTGT (Thong tu 80/2021/TT-BTC),
  // anh xa DUNG so hieu chi tieu chinh thuc — nhung KHONG phai file XML da
  // duoc xac thuc nhap truc tiep vao phan mem HTKK/eTax cua Tong cuc Thue,
  // vi XSD chinh thuc cua HTKK khong duoc cong bo cong khai de doi chieu.
  // Dung de ke toan doi chieu/nhap tay vao HTKK, khong phai "Nhap XML" thang.
  function handleExportXmlChiTieu(t: TongHopVatKy) {
    const hdXuatKy = hoaDonXuatCuaKy(t.ky);
    const hdDauVaoKy = hoaDonDauVaoCuaKy(t.ky);
    // Chi tach duoc tien VAT theo tung muc thue suat (da co san tren tung hoa
    // don) — KHONG tach duoc gia tri truoc thue tuong ung (danh sach nay
    // khong mang tong_tien_truoc_thue), nen chi tieu 29/30/32 (gia tri truoc
    // thue) phai de 0 va ghi chu ro trong file, chi 31/33 (tien thue) la dung.
    const nhomTheoThueSuat = (percent: number) =>
      hdXuatKy.filter((h) => (h.vat_percent ?? 10) === percent).reduce((s, h) => s + (h.tien_vat ?? 0), 0);
    const vat10 = nhomTheoThueSuat(10);
    const vat5 = nhomTheoThueSuat(5);
    const vat0 = nhomTheoThueSuat(0);
    const giaTri23 = hdDauVaoKy.reduce((s, h) => s + (h.tong_tien_hang ?? 0), 0);

    const esc = (s: string | number) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!--
  GHI CHU QUAN TRONG: day la file du lieu ho tro lap To khai mau 01/GTGT
  (Thong tu 80/2021/TT-BTC), cac chi_tieu duoc anh xa dung so hieu chinh
  thuc. Day KHONG PHAI la file XML da duoc kiem chung nhap truc tiep vao
  chuc nang "Nhap XML" cua phan mem HTKK/eTax — Tong cuc Thue khong cong
  bo cong khai XSD chinh thuc de doi chieu byte-for-byte. Ke toan dung file
  nay de doi chieu/nhap tay vao HTKK, KHONG nop thang file nay cho co quan
  thue. Neu can nop qua XML that, phai lap truc tiep tren phan mem HTKK.
-->
<ToKhaiGTGT mau="01/GTGT" ky="${esc(t.ky)}" granularity="${esc(granularity)}">
  <ChiTieu ma="22" ten="Thue GTGT con duoc khau tru ky truoc chuyen sang">${Math.round(t.khauTruTuKyTruoc)}</ChiTieu>
  <ChiTieu ma="23" ten="Gia tri HHDV mua vao chua co thue (dau vao du dieu kien khau tru)">${Math.round(giaTri23)}</ChiTieu>
  <ChiTieu ma="24" ten="Thue GTGT cua HHDV mua vao">${Math.round(t.vatVaoDuDieuKien)}</ChiTieu>
  <ChiTieu ma="25" ten="Thue GTGT mua vao duoc khau tru">${Math.round(t.vatVaoDuDieuKien)}</ChiTieu>
  <ChiTieu ma="29" ten="Gia tri HHDV ban ra thue suat 0%" ghiChu="Chua tach duoc gia tri truoc thue theo thue suat, xem GhiChuThueSuat0Va5">0</ChiTieu>
  <ChiTieu ma="30" ten="Gia tri HHDV ban ra thue suat 5%">0</ChiTieu>
  <ChiTieu ma="31" ten="Thue GTGT thue suat 5%">${Math.round(vat5)}</ChiTieu>
  <ChiTieu ma="32" ten="Gia tri HHDV ban ra thue suat 10%">0</ChiTieu>
  <ChiTieu ma="33" ten="Thue GTGT thue suat 10%">${Math.round(vat10)}</ChiTieu>
  <ChiTieu ma="doanh_thu_vat_0_khong_tinh" ten="Ghi chu: tien VAT thue suat 0% trong ky (thong tin them, khong thuoc chi tieu chinh thuc)">${Math.round(vat0)}</ChiTieu>
  <ChiTieu ma="28" ten="Tong thue GTGT HHDV ban ra">${Math.round(t.vatRa)}</ChiTieu>
  <ChiTieu ma="35" ten="Tong thue GTGT (= chi tieu 28)">${Math.round(t.vatRa)}</ChiTieu>
  <ChiTieu ma="36" ten="Thue GTGT phat sinh trong ky (= 35 - 25)">${Math.round(t.vatRa - t.vatVaoDuDieuKien)}</ChiTieu>
  <ChiTieu ma="40" ten="Thue GTGT con phai nop trong ky">${t.phaiNopHoacDuocKhauTru > 0 ? Math.round(t.phaiNopHoacDuocKhauTru) : 0}</ChiTieu>
  <ChiTieu ma="43" ten="Thue GTGT con duoc khau tru chuyen ky sau">${Math.round(t.chuyenKySau)}</ChiTieu>
  <GhiChuThueSuat0Va5 dungLuong="Chua tach duoc gia tri truoc thue theo tung muc thue suat rieng (chi co tien_vat theo tung hoa don) — chi tieu 29/30/32 de 0, ke toan can dien tay tu tien_vat va vat_percent tren tung hoa don neu can chi tiet day du."/>
</ToKhaiGTGT>
`;
    const blob = new Blob([xml], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ho-tro-01gtgt-${t.ky}.xml`;
    a.click();
    URL.revokeObjectURL(url);
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
        Hóa đơn Điều chỉnh/Thay thế được tính theo quy tắc: hóa đơn gốc bị <strong>Đã thay thế</strong> loại khỏi tổng hợp (coi như chưa từng phát
        hành hợp lệ), hóa đơn gốc bị <strong>Đã điều chỉnh</strong> vẫn tính vào kỳ của nó, dòng Điều chỉnh/Thay thế mới tính vào kỳ riêng của nó.
        Nút &quot;Xuất XML hỗ trợ 01/GTGT&quot; xuất file ánh xạ đúng số hiệu chỉ tiêu chính thức để đối chiếu/nhập tay vào HTKK — <strong>không phải</strong>{" "}
        file đã kiểm chứng nhập thẳng qua chức năng &quot;Nhập XML&quot; của HTKK/eTax (Tổng cục Thuế không công bố công khai XSD chính thức để đối
        chiếu). Chỉ tiêu [29]/[30]/[32] (giá trị trước thuế theo từng mức thuế suất) chưa tách được, để 0 — kế toán cần bổ sung tay nếu cần đủ.
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
              <th className="px-3 py-2 text-right font-medium">HĐ đầu vào chưa xác định</th>
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
                    {(chuaXacDinhTheoKy.get(t.ky) ?? 0) > 0 ? (
                      <Link
                        href="/chi-phi/hoa-don-dau-vao"
                        className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 hover:underline"
                        title="Vào Hóa đơn đầu vào, lọc Điều kiện khấu trừ = Chưa xác định để xử lý"
                      >
                        {chuaXacDinhTheoKy.get(t.ky)} hóa đơn
                      </Link>
                    ) : (
                      <span className="text-xs text-slate-300">0</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => setKyMoRong((prev) => (prev === t.ky ? null : t.ky))}
                      className="text-xs font-medium text-blue-600"
                    >
                      {kyMoRong === t.ky ? "Ẩn" : "Xem chi tiết"}
                    </button>
                  </td>
                </tr>
                {granularity !== "nam" && (
                  <tr className="border-t border-slate-100 bg-slate-50/60">
                    <td colSpan={8} className="px-3 py-2">
                      <KeKhaiStatusBar
                        tongHopKy={t}
                        ghiNhan={kyKeKhaiMap.get(`${t.ky}|${granularity}`)}
                        hoaDonXuat={hoaDonXuatCuaKy(t.ky)}
                        hoaDonDauVao={hoaDonDauVaoCuaKy(t.ky)}
                        dangXuLy={dangXuLyKy === t.ky}
                        onDanhDau={() => handleDanhDauDaKeKhai(t)}
                        onBoSung={() => handleBoSung01Khbs(t)}
                        onXuatXml={() => handleExportXmlChiTieu(t)}
                      />
                    </td>
                  </tr>
                )}
                {kyMoRong === t.ky && (
                  <tr className="border-t border-slate-100 bg-slate-50">
                    <td colSpan={8} className="px-3 py-3">
                      <ChiTietKy hoaDonXuat={hoaDonXuatCuaKy(t.ky)} hoaDonDauVao={hoaDonDauVaoCuaKy(t.ky)} vatRa={t.vatRa} vatVao={t.vatVaoDuDieuKien} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {tongHop.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                  Chưa có hóa đơn nào để tổng hợp VAT.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {choBoSung01Khbs && (
        <ConfirmDialog
          title={`Bổ sung 01/KHBS — kỳ ${choBoSung01Khbs.ky}`}
          fields={[{ key: "ly_do", label: "Lý do/nội dung thay đổi", type: "textarea", required: true, placeholder: "Bắt buộc" }]}
          confirmLabel="Ghi nhận"
          onCancel={() => setChoBoSung01Khbs(null)}
          onConfirm={(values) => void xuLyBoSung01KhbsConfirm(choBoSung01Khbs, values.ly_do)}
        />
      )}
    </div>
  );
}

function KeKhaiStatusBar({
  tongHopKy,
  ghiNhan,
  hoaDonXuat,
  hoaDonDauVao,
  dangXuLy,
  onDanhDau,
  onBoSung,
  onXuatXml,
}: {
  tongHopKy: TongHopVatKy;
  ghiNhan: KyKeKhaiRow | undefined;
  hoaDonXuat: HoaDonXuatRow[];
  hoaDonDauVao: HoaDonDauVaoRow[];
  dangXuLy: boolean;
  onDanhDau: () => void;
  onBoSung: () => void;
  onXuatXml: () => void;
}) {
  const daKhop = ghiNhan ? soLieuKhopNhau(ghiNhan.so_lieu_da_khai, tongHopKy) : true;
  // P1 muc 3 (2026-11-26): "hoa don nao da doi" chi suy doan duoc bang updated_at
  // so voi ngay_ke_khai (khong co snapshot tung hoa don luc ke khai, chi co
  // tong so lieu) — danh sach nay la GOI Y de ke toan tu kiem tra, khong chac
  // chan 100% la nguyen nhan duy nhat gay lech so lieu.
  const hoaDonDaDoi = useMemo(() => {
    if (!ghiNhan || daKhop) return { xuat: [] as HoaDonXuatRow[], dauVao: [] as HoaDonDauVaoRow[] };
    const moc = ghiNhan.ngay_ke_khai;
    return {
      xuat: hoaDonXuat.filter((h) => h.updated_at && h.updated_at.slice(0, 10) >= moc),
      dauVao: hoaDonDauVao.filter((h) => h.updated_at && h.updated_at.slice(0, 10) >= moc),
    };
  }, [ghiNhan, daKhop, hoaDonXuat, hoaDonDauVao]);

  return (
    <div className="flex flex-col gap-2 text-xs">
    <div className="flex flex-wrap items-center gap-2">
      {!ghiNhan && (
        <>
          <span className="rounded-full bg-slate-200 px-2 py-0.5 font-medium text-slate-600">Chưa kê khai</span>
          <button onClick={onDanhDau} disabled={dangXuLy} className="rounded border border-slate-300 bg-white px-2 py-1 font-medium text-slate-700 disabled:opacity-50">
            Đánh dấu đã kê khai
          </button>
        </>
      )}
      {ghiNhan && daKhop && (
        <span className="rounded-full bg-green-100 px-2 py-0.5 font-medium text-green-700">
          {ghiNhan.trang_thai} ({ghiNhan.ngay_ke_khai}){ghiNhan.so_lan_bo_sung > 0 ? ` — đã bổ sung ${ghiNhan.so_lan_bo_sung} lần` : ""}
        </span>
      )}
      {ghiNhan && !daKhop && (
        <>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800">
            Số liệu đã đổi so với lần kê khai {ghiNhan.ngay_ke_khai} — cần nộp bổ sung 01/KHBS (chênh lệch phải nộp/được khấu trừ:{" "}
            {(tongHopKy.phaiNopHoacDuocKhauTru - ghiNhan.so_lieu_da_khai.phaiNopHoacDuocKhauTru).toLocaleString("en-US")})
          </span>
          <button onClick={onBoSung} disabled={dangXuLy} className="rounded border border-amber-400 bg-amber-50 px-2 py-1 font-medium text-amber-800 disabled:opacity-50">
            Ghi nhận đã nộp bổ sung 01/KHBS
          </button>
        </>
      )}
      <button onClick={onXuatXml} className="ml-auto rounded border border-slate-300 bg-white px-2 py-1 font-medium text-slate-700">
        Xuất XML hỗ trợ 01/GTGT
      </button>
    </div>
    {ghiNhan && !daKhop && (hoaDonDaDoi.xuat.length > 0 || hoaDonDaDoi.dauVao.length > 0) && (
      <div className="rounded border border-amber-200 bg-amber-50/60 p-2 text-amber-800">
        <p className="mb-1 font-medium">Hóa đơn có khả năng đã đổi từ sau {ghiNhan.ngay_ke_khai} (gợi ý theo thời điểm sửa gần nhất, kế toán tự kiểm tra lại):</p>
        {hoaDonDaDoi.xuat.length > 0 && (
          <p>Hóa đơn xuất: {hoaDonDaDoi.xuat.map((h) => h.so_hoa_don || "(chưa có số)").join(", ")}</p>
        )}
        {hoaDonDaDoi.dauVao.length > 0 && (
          <p>Hóa đơn đầu vào: {hoaDonDaDoi.dauVao.map((h) => h.so_hoa_don || "(chưa có số)").join(", ")}</p>
        )}
      </div>
    )}
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
