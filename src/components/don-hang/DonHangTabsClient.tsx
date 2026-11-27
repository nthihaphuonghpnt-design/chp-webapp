"use client";

import { useState, type ReactNode } from "react";
import ChiTietVanChuyenSection from "./ChiTietVanChuyenSection";
import ChiPhiGopSection from "./ChiPhiGopSection";
import type { ChiTietVanChuyen, PhatSinhChiPhi, DonThueNgoai, PhuThu } from "@/types/database";

const TABS = [
  { id: "thongtin", label: "Thông tin lô" },
  { id: "container", label: "Container/hàng hóa" },
  { id: "dieuvan", label: "Điều vận" },
  { id: "chiphi", label: "Chi phí & tạm ứng" },
  { id: "chungtu", label: "Chứng từ" },
  { id: "khac", label: "Khác" },
] as const;
type TabId = (typeof TABS)[number]["id"];

interface Option {
  id: string;
  ten: string;
  ma?: string | null;
}

interface DiaDiemOption {
  id: string;
  ten: string;
  ma_dia_diem?: string | null;
  dia_chi?: string | null;
  khu_vuc?: string | null;
}

// Khai bao tay (khong dung React.ComponentProps<typeof X>) de tranh TS phai
// suy dien kieu qua lai voi cac bang Supabase — tung lam `tsc --noEmit` het
// bo nho (JS heap OOM) tren may dev.
interface ChiTietVanChuyenProps {
  donHangId: string;
  initialRows: ChiTietVanChuyen[];
  diaDiemList: DiaDiemOption[];
  canEdit: boolean;
  goiYDiem?: { diem_1_id: string | null; diem_2_id: string | null; diem_3_id: string | null };
}

interface ChiPhiGopProps {
  hoaDonSoMap?: Record<string, string>;
  nhanVienTenMap?: Record<string, string>;
  donHangId: string;
  initialChiPhiRows: PhatSinhChiPhi[];
  initialThueNgoaiRows: DonThueNgoai[];
  initialPhuThuRows: PhuThu[];
  loaiChiPhiList: Option[];
  nhaCungCapList: Option[];
  doiTacThueNgoaiList: Option[];
  chiTietVanChuyenList: ChiTietVanChuyen[];
  phongBan: string;
  currentUserId?: string;
  nhanVienChiPhiTamUngOptions: Option[];
  nhanVienThueNgoaiTamUngOptions: Option[];
  congViecMap: Record<string, string>;
  donHangSoLuong?: number | null;
  bangGiaList?: { loai_chi_phi_id: string; hang_hoa_id: string | null; don_gia: number | null }[];
  donHangHangHoaId?: string | null;
}

/** Gom cac muc cua trang chi tiet don hang thanh tab, thay vi xep doc 1 lan
 * — giup tim muc can xem nhanh hon tren don hang nhieu du lieu. ChiTietVanChuyen
 * va ChiPhiGop duoc khoi tao NGAY TRONG component nay (thay vi nhan san JSX
 * tu ngoai) de co the noi "+ Thêm chi phí cho chặng này" (ben Dieu van) voi
 * form them chi phi (ben Chi phi) — bam nut do se chuyen tab + mo san dong
 * them moi voi dung chang vua chon. Dung class "hidden" thay vi go/mount lai
 * khi doi tab, de khong mat du lieu dang nhap do (vd dong "them chi phi" dang
 * go nua chung) khi nguoi dung lo qua tab khac roi quay lai. */
export default function DonHangTabsClient({
  thongTinLo,
  containerHangHoa,
  toKhai,
  dinhKem,
  chiPhiGiaoNhan,
  loiNhuan,
  tamUngDoiChieu,
  chiTietVanChuyenProps,
  chiPhiGopProps,
}: {
  thongTinLo: ReactNode;
  containerHangHoa: ReactNode;
  toKhai: ReactNode;
  dinhKem: ReactNode;
  chiPhiGiaoNhan: ReactNode;
  loiNhuan: ReactNode;
  tamUngDoiChieu: ReactNode;
  chiTietVanChuyenProps: ChiTietVanChuyenProps;
  chiPhiGopProps: ChiPhiGopProps;
}) {
  const [active, setActive] = useState<TabId>("thongtin");
  const [prefillLegId, setPrefillLegId] = useState<string | null>(null);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1 overflow-x-auto border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActive(t.id)}
            className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${
              active === t.id ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className={active === "thongtin" ? "flex flex-col gap-4" : "hidden"}>{thongTinLo}</div>
      <div className={active === "container" ? "flex flex-col gap-4" : "hidden"}>{containerHangHoa}</div>
      <div className={active === "dieuvan" ? "flex flex-col gap-4" : "hidden"}>
        {toKhai}
        <ChiTietVanChuyenSection
          {...chiTietVanChuyenProps}
          onAddChiPhiForLeg={(legId) => {
            setPrefillLegId(legId);
            setActive("chiphi");
          }}
        />
      </div>
      <div className={active === "chiphi" ? "flex flex-col gap-4" : "hidden"}>
        {tamUngDoiChieu}
        <ChiPhiGopSection
          {...chiPhiGopProps}
          prefillChiTietVanChuyenId={prefillLegId}
          onPrefillConsumed={() => setPrefillLegId(null)}
        />
      </div>
      <div className={active === "chungtu" ? "flex flex-col gap-4" : "hidden"}>{dinhKem}</div>
      <div className={active === "khac" ? "flex flex-col gap-4" : "hidden"}>
        {chiPhiGiaoNhan}
        {loiNhuan}
      </div>
    </div>
  );
}
