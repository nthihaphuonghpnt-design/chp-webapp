"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import SearchableSelect, { type SearchableOption } from "@/components/common/SearchableSelect";
import MoneyInput from "@/components/common/MoneyInput";
import type { ChiTietVanChuyen, PhatSinhChiPhi, DonThueNgoai, PhuThu } from "@/types/database";
import { PHAT_SINH_CHI_PHI_SAFE_COLS, DON_THUE_NGOAI_SAFE_COLS } from "@/lib/giaBan";

interface Option {
  id: string;
  ten: string;
  ma?: string | null;
}

type Loai = "chi_phi" | "thue_ngoai" | "phu_thu";

const LOAI_LABEL: Record<Loai, string> = {
  chi_phi: "Chi phí phát sinh",
  thue_ngoai: "Thuê ngoài",
  phu_thu: "Phụ thu",
};
const LOAI_DICH_VU_THUE = ["Vận tải nội địa thuê ngoài", "Cước đường biển", "Dịch vụ bên thứ 3 khác"];
const TRANG_THAI_COLOR: Record<string, string> = {
  "Nháp": "bg-slate-200 text-slate-600",
  "Chờ duyệt": "bg-amber-100 text-amber-700",
  "Đã duyệt": "bg-green-100 text-green-700",
  "Từ chối": "bg-red-100 text-red-700",
};

function fmt(n: number | null | undefined) {
  return (n ?? 0).toLocaleString("en-US");
}

// Gia tri "the hien" chung cho 1 dong, du no la Chi phi / Thue ngoai / Phu thu —
// giup render 1 bang duy nhat ma khong phai viet 3 lan gan giong nhau.
interface RowView {
  key: string;
  loai: Loai;
  raw: PhatSinhChiPhi | DonThueNgoai | PhuThu;
  ten: string;
  doiTac: string;
  chang: string | null;
  buy: number | null;
  sell: number | null;
  noiBo: boolean | null; // null = khong ap dung (thue ngoai / phu thu)
  chiHo: boolean | null;
  trangThai: string | null; // null = khong co workflow duyet (phu thu)
  nguoiNhapId: string | null;
  nguonThanhToan: string | null; // null = khong ap dung (phu thu)
}

interface NewRowValues {
  loai: Loai;
  loai_chi_phi_id: string;
  loai_dich_vu_thue: string;
  loai_phu_thu: string;
  nha_cung_cap_id: string | null;
  doi_tac_thue_ngoai_id: string | null;
  chi_tiet_van_chuyen_id: string | null;
  buy: string;
  sell: string;
  noi_bo: boolean;
  chi_ho: boolean;
  ghi_chu: string;
  nguon_thanh_toan: string;
  tam_ung_id: string;
  // Chi dung khi Ke toan tao dong moi + chon "Tam ung nhan vien": nhan vien
  // nao dang duoc nhap ho — quyet dinh nguoi_nhap_id cua dong (xem
  // luuDongMoi). Khong dung khi sua dong da co san (khong doi duoc nguoi).
  nhan_vien_tam_ung_id: string;
}

function blankNewRow(loaiMacDinh: Loai): NewRowValues {
  return {
    loai: loaiMacDinh,
    loai_chi_phi_id: "",
    loai_dich_vu_thue: "",
    loai_phu_thu: "",
    nha_cung_cap_id: null,
    doi_tac_thue_ngoai_id: null,
    chi_tiet_van_chuyen_id: null,
    buy: "",
    sell: "",
    noi_bo: true,
    chi_ho: false,
    ghi_chu: "",
    nguon_thanh_toan: "",
    tam_ung_id: "",
    nhan_vien_tam_ung_id: "",
  };
}

interface TamUngOption {
  id: string;
  so_tien: number;
  ngay_thuc_hien: string;
  so_phieu: string | null;
}

export default function ChiPhiGopSection({
  donHangId,
  initialChiPhiRows,
  initialThueNgoaiRows,
  initialPhuThuRows,
  loaiChiPhiList,
  nhaCungCapList: initialNhaCungCapList,
  doiTacThueNgoaiList: initialDoiTacThueNgoaiList,
  chiTietVanChuyenList,
  phongBan,
  currentUserId,
  nhanVienChiPhiTamUngOptions,
  nhanVienThueNgoaiTamUngOptions,
  congViecMap,
}: {
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
}) {
  const supabase = useMemo(() => createClient(), []);
  const [chiPhiRows, setChiPhiRows] = useState<PhatSinhChiPhi[]>(initialChiPhiRows);
  const [thueNgoaiRows, setThueNgoaiRows] = useState<DonThueNgoai[]>(initialThueNgoaiRows);
  const [phuThuRows, setPhuThuRows] = useState<PhuThu[]>(initialPhuThuRows);
  const nhaCungCapList = initialNhaCungCapList;
  const doiTacThueNgoaiList = initialDoiTacThueNgoaiList;

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<NewRowValues | null>(null);
  const [addingRows, setAddingRows] = useState<({ key: number } & NewRowValues)[]>([]);
  const [nextKey, setNextKey] = useState(1);

  // Danh sach tam ung tai theo tung "dong dang sua" (state key "edit:<rv.key>")
  // hoac "dong dang them" (state key "add:<r.key>") — moi dong doc lap, vi co
  // the co nhieu dong "Them" cung luc, moi dong 1 nhan vien/tam ung khac nhau.
  const [tamUngOptionsByKey, setTamUngOptionsByKey] = useState<Record<string, TamUngOption[]>>({});
  const [loadingTamUngKeys, setLoadingTamUngKeys] = useState<Set<string>>(new Set());

  async function taiKhoanTamUng(stateKey: string, nhanVienId: string) {
    setLoadingTamUngKeys((prev) => new Set(prev).add(stateKey));
    const { data } = await supabase
      .from("tam_ung_giai_chi")
      .select("id, so_tien, ngay_thuc_hien, so_phieu")
      .eq("don_hang_id", donHangId)
      .eq("nhan_vien_id", nhanVienId)
      .eq("loai", "Tạm ứng")
      .eq("trang_thai", "Đã duyệt")
      .is("phieu_quyet_toan_id", null)
      .order("ngay_thuc_hien", { ascending: true });
    setTamUngOptionsByKey((prev) => ({ ...prev, [stateKey]: data ?? [] }));
    setLoadingTamUngKeys((prev) => {
      const next = new Set(prev);
      next.delete(stateKey);
      return next;
    });
  }

  const canSeeSell = ["Sale", "Kế toán", "Giám đốc"].includes(phongBan);
  const canApprove = phongBan === "Kế toán";
  const isKeToan = phongBan === "Kế toán";
  const isDieuPhoi = phongBan === "Điều phối";
  const isSaleOnly = phongBan === "Sale";
  const canChonNguonThanhToan = ["Điều phối", "Kế toán"].includes(phongBan);
  const chiPhuThu = phongBan !== "Chứng từ"; // giu dung logic cu: Chung tu khong thay Phu thu

  const loaiChoPhepThem: Loai[] = [
    ...(["Hiện trường", "Điều phối", "Chứng từ", "Kế toán"].includes(phongBan) ? (["chi_phi"] as Loai[]) : []),
    ...(["Hiện trường", "Điều phối", "Kế toán"].includes(phongBan) ? (["thue_ngoai"] as Loai[]) : []),
    ...(["Sale", "Kế toán"].includes(phongBan) && chiPhuThu ? (["phu_thu"] as Loai[]) : []),
  ];
  const coTheThem = loaiChoPhepThem.length > 0;

  function loaiChiPhiTen(id: string | null) {
    return loaiChiPhiList.find((l) => l.id === id)?.ten ?? "—";
  }
  function nccTen(id: string | null) {
    return nhaCungCapList.find((n) => n.id === id)?.ten ?? "—";
  }
  function doiTacTen(id: string | null) {
    return doiTacThueNgoaiList.find((d) => d.id === id)?.ten ?? "—";
  }
  function changTen(id: string | null) {
    const c = chiTietVanChuyenList.find((c) => c.id === id);
    return c ? `${c.ngay_vc ?? "?"} · ${c.so_xe || c.tai_xe_cty_thue || "chặng"}` : null;
  }

  // ---- Gop 3 nguon thanh 1 danh sach hien thi, loc theo quyen xem ----
  const rows: RowView[] = useMemo(() => {
    const chiThayCuaMinh = ["Hiện trường", "Chứng từ"].includes(phongBan);
    const out: RowView[] = [];
    for (const r of chiPhiRows) {
      if (chiThayCuaMinh && r.nguoi_nhap_id !== currentUserId) continue;
      out.push({
        key: `cp:${r.id}`,
        loai: "chi_phi",
        raw: r,
        ten: loaiChiPhiTen(r.loai_chi_phi_id),
        doiTac: r.nha_cung_cap_id ? nccTen(r.nha_cung_cap_id) : r.doi_tac_thue_ngoai_id ? doiTacTen(r.doi_tac_thue_ngoai_id) : "—",
        chang: changTen(r.chi_tiet_van_chuyen_id),
        buy: r.so_tien_da_chi,
        sell: r.gia_ban_sell,
        noiBo: r.noi_bo,
        chiHo: r.chi_ho,
        trangThai: r.trang_thai,
        nguoiNhapId: r.nguoi_nhap_id,
        nguonThanhToan: r.nguon_thanh_toan,
      });
    }
    for (const r of thueNgoaiRows) {
      if (chiThayCuaMinh && r.nguoi_nhap_id !== currentUserId) continue;
      out.push({
        key: `tn:${r.id}`,
        loai: "thue_ngoai",
        raw: r,
        ten: r.loai_dich_vu_thue ?? "—",
        doiTac: doiTacTen(r.doi_tac_thue_ngoai_id),
        chang: null,
        buy: r.so_tien_da_chi,
        sell: r.gia_ban_sell,
        noiBo: null,
        chiHo: null,
        trangThai: r.trang_thai,
        nguoiNhapId: r.nguoi_nhap_id,
        nguonThanhToan: r.nguon_thanh_toan,
      });
    }
    if (chiPhuThu) {
      for (const r of phuThuRows) {
        out.push({
          key: `pt:${r.id}`,
          loai: "phu_thu",
          raw: r,
          ten: r.loai_phu_thu ?? "—",
          doiTac: "—",
          chang: null,
          buy: null,
          sell: r.thanh_tien,
          noiBo: null,
          chiHo: null,
          trangThai: null,
          nguoiNhapId: null,
          nguonThanhToan: null,
        });
      }
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chiPhiRows, thueNgoaiRows, phuThuRows, phongBan, currentUserId, loaiChiPhiList, nhaCungCapList, doiTacThueNgoaiList, chiTietVanChuyenList]);

  const doiTacOptions: SearchableOption[] = [
    ...nhaCungCapList.map((o) => ({ value: `ncc:${o.id}`, label: o.ten, sublabel: "Nhà cung cấp" })),
    ...doiTacThueNgoaiList.map((o) => ({ value: `doitac:${o.id}`, label: o.ten, sublabel: "Đối tác thuê ngoài" })),
  ];
  const doiTacThueNgoaiOptions: SearchableOption[] = doiTacThueNgoaiList.map((o) => ({ value: o.id, label: o.ten }));
  const loaiChiPhiOptions: SearchableOption[] = loaiChiPhiList.map((o) => ({ value: o.id, label: o.ten, code: o.ma }));
  const changOptions: SearchableOption[] = chiTietVanChuyenList.map((c) => ({
    value: c.id,
    label: c.ngay_vc ? `${c.ngay_vc} · ${c.so_xe || c.tai_xe_cty_thue || "chặng"}` : c.so_xe || c.tai_xe_cty_thue || "Chặng chưa có ngày",
  }));

  async function layNhanVienId() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: nv } = await supabase.from("nhan_vien").select("id").eq("auth_user_id", user?.id).single();
    return nv?.id as string | undefined;
  }

  // ---- Them dong moi (co the them nhieu dong 1 luc, moi dong luu rieng khi bam Luu) ----
  function themDongMoi() {
    setAddingRows((prev) => [...prev, { key: nextKey, ...blankNewRow(loaiChoPhepThem[0]) }]);
    setNextKey((k) => k + 1);
  }
  function capNhatDongMoi(key: number, patch: Partial<NewRowValues>) {
    setAddingRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }
  function huyDongMoi(key: number) {
    setAddingRows((prev) => prev.filter((r) => r.key !== key));
  }

  async function luuDongMoi(row: { key: number } & NewRowValues) {
    // Ke toan nhap ho: khi chon "Tam ung nhan vien" + chon dung nhan vien,
    // nguoi_nhap_id phai la NHAN VIEN DO (khong phai Ke toan dang dang
    // nhap) de khop dieu kien tam_ung.nhan_vien_id = nguoi_nhap_id ma
    // kiem_tra_tam_ung_id_hop_le (0066) bat buoc.
    const nhanVienId = row.nhan_vien_tam_ung_id || (await layNhanVienId());
    if (row.loai === "chi_phi") {
      if (!row.loai_chi_phi_id || !row.buy) {
        window.alert("Cần chọn Loại chi phí và nhập Số tiền đã chi.");
        return;
      }
      const { data, error } = await supabase
        .from("phat_sinh_chi_phi")
        .insert({
          don_hang_id: donHangId,
          loai_chi_phi_id: row.loai_chi_phi_id,
          nha_cung_cap_id: row.nha_cung_cap_id,
          doi_tac_thue_ngoai_id: row.doi_tac_thue_ngoai_id,
          chi_tiet_van_chuyen_id: row.chi_tiet_van_chuyen_id,
          so_tien_da_chi: Number(row.buy),
          gia_ban_sell: row.sell ? Number(row.sell) : null,
          noi_bo: row.noi_bo,
          chi_ho: row.chi_ho,
          ghi_chu: row.ghi_chu || null,
          nguoi_nhap_id: nhanVienId,
          // Ke toan tu nhap thi khong can ai duyet lai (chinh ho la nguoi
          // duyet) — vao thang "Da duyet" luon, khoi phai tu tay duyet lai
          // dong minh vua nhap. Phong ban khac van "Cho duyet" nhu cu, cho
          // Ke toan duyet.
          trang_thai: isKeToan ? "Đã duyệt" : "Chờ duyệt",
          // Hien truong/Chung tu khong tu chon nguon thanh toan — de trong de
          // trigger tu_dong_nguon_thanh_toan_hien_truong (0062/0066) tu gan.
          ...(canChonNguonThanhToan ? { nguon_thanh_toan: row.nguon_thanh_toan || null, tam_ung_id: row.tam_ung_id || null } : {}),
        })
        .select(PHAT_SINH_CHI_PHI_SAFE_COLS)
        .single();
      if (error) return window.alert(error.message);
      // gia_ban_sell khong con doc lai truc tiep duoc tu 0061 — ghep lai tu
      // chinh gia tri vua gui, khong can goi RPC round-trip.
      const rowDayDu = { ...data, gia_ban_sell: row.sell ? Number(row.sell) : null } as PhatSinhChiPhi;
      setChiPhiRows((prev) => [rowDayDu, ...prev]);
    } else if (row.loai === "thue_ngoai") {
      if (!row.loai_dich_vu_thue || !row.doi_tac_thue_ngoai_id || !row.buy) {
        window.alert("Cần chọn Loại dịch vụ, Đối tác thuê ngoài và nhập Số tiền đã chi.");
        return;
      }
      const { data, error } = await supabase
        .from("don_thue_ngoai")
        .insert({
          don_hang_id: donHangId,
          loai_dich_vu_thue: row.loai_dich_vu_thue,
          doi_tac_thue_ngoai_id: row.doi_tac_thue_ngoai_id,
          noi_dung: row.ghi_chu || null,
          so_tien_da_chi: Number(row.buy),
          gia_ban_sell: row.sell ? Number(row.sell) : null,
          ngay_thue: new Date().toISOString().slice(0, 10),
          nguoi_nhap_id: nhanVienId,
          // Cung logic voi chi_phi phia tren: Ke toan tu nhap thi vao thang
          // "Da duyet" luon.
          trang_thai: isKeToan ? "Đã duyệt" : "Chờ duyệt",
          ...(canChonNguonThanhToan ? { nguon_thanh_toan: row.nguon_thanh_toan || null, tam_ung_id: row.tam_ung_id || null } : {}),
        })
        .select(DON_THUE_NGOAI_SAFE_COLS)
        .single();
      if (error) return window.alert(error.message);
      const rowDayDu = { ...data, gia_ban_sell: row.sell ? Number(row.sell) : null } as DonThueNgoai;
      setThueNgoaiRows((prev) => [rowDayDu, ...prev]);
    } else {
      if (!row.loai_phu_thu || !row.sell) {
        window.alert("Cần nhập Loại phụ thu và Thành tiền.");
        return;
      }
      const { data, error } = await supabase
        .from("phu_thu")
        .insert({ don_hang_id: donHangId, loai_phu_thu: row.loai_phu_thu, thanh_tien: Number(row.sell), ghi_chu: row.ghi_chu || null })
        .select()
        .single();
      if (error) return window.alert(error.message);
      setPhuThuRows((prev) => [data as PhuThu, ...prev]);
    }
    huyDongMoi(row.key);
  }

  // ---- Sua dong co san ----
  function batDauSua(rv: RowView) {
    setEditingKey(rv.key);
    if (rv.loai === "chi_phi") {
      const r = rv.raw as PhatSinhChiPhi;
      setEditValues({
        loai: "chi_phi",
        loai_chi_phi_id: r.loai_chi_phi_id ?? "",
        loai_dich_vu_thue: "",
        loai_phu_thu: "",
        nha_cung_cap_id: r.nha_cung_cap_id,
        doi_tac_thue_ngoai_id: r.doi_tac_thue_ngoai_id,
        chi_tiet_van_chuyen_id: r.chi_tiet_van_chuyen_id,
        buy: r.so_tien_da_chi?.toString() ?? "",
        sell: r.gia_ban_sell?.toString() ?? "",
        noi_bo: r.noi_bo,
        chi_ho: r.chi_ho,
        ghi_chu: r.ghi_chu ?? "",
        nguon_thanh_toan: r.nguon_thanh_toan ?? "",
        tam_ung_id: r.tam_ung_id ?? "",
        nhan_vien_tam_ung_id: "",
      });
      if (canChonNguonThanhToan && r.nguon_thanh_toan === "Tạm ứng nhân viên" && r.nguoi_nhap_id) {
        taiKhoanTamUng(`edit:${rv.key}`, r.nguoi_nhap_id);
      }
    } else if (rv.loai === "thue_ngoai") {
      const r = rv.raw as DonThueNgoai;
      setEditValues({
        loai: "thue_ngoai",
        loai_chi_phi_id: "",
        loai_dich_vu_thue: r.loai_dich_vu_thue ?? "",
        loai_phu_thu: "",
        nha_cung_cap_id: null,
        doi_tac_thue_ngoai_id: r.doi_tac_thue_ngoai_id,
        chi_tiet_van_chuyen_id: null,
        buy: r.so_tien_da_chi?.toString() ?? "",
        sell: r.gia_ban_sell?.toString() ?? "",
        noi_bo: false,
        chi_ho: false,
        ghi_chu: r.noi_dung ?? "",
        nguon_thanh_toan: r.nguon_thanh_toan ?? "",
        tam_ung_id: r.tam_ung_id ?? "",
        nhan_vien_tam_ung_id: "",
      });
      if (canChonNguonThanhToan && r.nguon_thanh_toan === "Tạm ứng nhân viên" && r.nguoi_nhap_id) {
        taiKhoanTamUng(`edit:${rv.key}`, r.nguoi_nhap_id);
      }
    } else {
      const r = rv.raw as PhuThu;
      setEditValues({
        loai: "phu_thu",
        loai_chi_phi_id: "",
        loai_dich_vu_thue: "",
        loai_phu_thu: r.loai_phu_thu ?? "",
        nha_cung_cap_id: null,
        doi_tac_thue_ngoai_id: null,
        chi_tiet_van_chuyen_id: null,
        buy: "",
        sell: r.thanh_tien?.toString() ?? "",
        noi_bo: false,
        chi_ho: false,
        ghi_chu: r.ghi_chu ?? "",
        nguon_thanh_toan: "",
        tam_ung_id: "",
        nhan_vien_tam_ung_id: "",
      });
    }
  }

  // Khoa lac quan (optimistic locking): moi UPDATE o day them dieu kien
  // eq("updated_at", ...) theo dung gia tri da doc luc mo form sua. Neu giua
  // luc dang sua co nguoi khac (vd Ke toan) da luu truoc, dieu kien nay
  // khong khop dong nao (updated_at da doi), UPDATE tra ve 0 dong va
  // .single() bao loi PGRST116 — bat rieng de bao ro thay vi am tham ghi de
  // len thay doi cua nguoi kia.
  function laLoiXungDotSua(error: { code?: string } | null): boolean {
    return error?.code === "PGRST116";
  }
  const CANH_BAO_XUNG_DOT = "Dữ liệu dòng này vừa bị người khác sửa trong lúc bạn đang sửa. Tải lại trang để lấy bản mới nhất rồi sửa lại — thay đổi vừa nhập chưa được lưu.";

  async function luuSua(rv: RowView) {
    if (!editValues) return;
    // Da duyet -> Ke toan sua truc tiep phai nhap ly do, bat buoc o tang DB
    // (enforce_phat_sinh_chi_phi_update/enforce_don_thue_ngoai_update, 0104) —
    // hoi truoc o day de khong ghi de mat du lieu form neu nguoi dung huy,
    // va de bao loi ro rang ngay tren UI thay vi lo message loi tho tu DB.
    let lyDoSuaGanNhat: string | null = null;
    if ((rv.loai === "chi_phi" || rv.loai === "thue_ngoai") && rv.trangThai === "Đã duyệt") {
      const lyDo = window.prompt(`"${LOAI_LABEL[rv.loai]}" này đã duyệt — phải nhập lý do khi sửa:`);
      if (lyDo === null) return;
      if (!lyDo.trim()) {
        window.alert("Phải nhập lý do khi sửa dòng đã duyệt.");
        return;
      }
      lyDoSuaGanNhat = lyDo;
    }
    if (rv.loai === "chi_phi") {
      const { data, error } = await supabase
        .from("phat_sinh_chi_phi")
        .update({
          loai_chi_phi_id: editValues.loai_chi_phi_id || null,
          nha_cung_cap_id: editValues.nha_cung_cap_id,
          doi_tac_thue_ngoai_id: editValues.doi_tac_thue_ngoai_id,
          chi_tiet_van_chuyen_id: editValues.chi_tiet_van_chuyen_id,
          so_tien_da_chi: editValues.buy ? Number(editValues.buy) : null,
          gia_ban_sell: editValues.sell ? Number(editValues.sell) : null,
          noi_bo: editValues.noi_bo,
          chi_ho: editValues.chi_ho,
          ghi_chu: editValues.ghi_chu || null,
          ...(canChonNguonThanhToan
            ? { nguon_thanh_toan: editValues.nguon_thanh_toan || null, tam_ung_id: editValues.tam_ung_id || null }
            : {}),
          ...(lyDoSuaGanNhat ? { ly_do_sua_gan_nhat: lyDoSuaGanNhat } : {}),
        })
        .eq("id", rv.raw.id)
        .eq("updated_at", rv.raw.updated_at)
        .select(PHAT_SINH_CHI_PHI_SAFE_COLS)
        .single();
      if (error) return window.alert(laLoiXungDotSua(error) ? CANH_BAO_XUNG_DOT : error.message);
      const rowDayDu = { ...data, gia_ban_sell: editValues.sell ? Number(editValues.sell) : null } as PhatSinhChiPhi;
      setChiPhiRows((prev) => prev.map((r) => (r.id === rv.raw.id ? rowDayDu : r)));
    } else if (rv.loai === "thue_ngoai") {
      const { data, error } = await supabase
        .from("don_thue_ngoai")
        .update({
          loai_dich_vu_thue: editValues.loai_dich_vu_thue || null,
          doi_tac_thue_ngoai_id: editValues.doi_tac_thue_ngoai_id,
          noi_dung: editValues.ghi_chu || null,
          so_tien_da_chi: editValues.buy ? Number(editValues.buy) : null,
          gia_ban_sell: editValues.sell ? Number(editValues.sell) : null,
          ...(canChonNguonThanhToan
            ? { nguon_thanh_toan: editValues.nguon_thanh_toan || null, tam_ung_id: editValues.tam_ung_id || null }
            : {}),
          ...(lyDoSuaGanNhat ? { ly_do_sua_gan_nhat: lyDoSuaGanNhat } : {}),
        })
        .eq("id", rv.raw.id)
        .eq("updated_at", rv.raw.updated_at)
        .select(DON_THUE_NGOAI_SAFE_COLS)
        .single();
      if (error) return window.alert(laLoiXungDotSua(error) ? CANH_BAO_XUNG_DOT : error.message);
      const rowDayDu = { ...data, gia_ban_sell: editValues.sell ? Number(editValues.sell) : null } as DonThueNgoai;
      setThueNgoaiRows((prev) => prev.map((r) => (r.id === rv.raw.id ? rowDayDu : r)));
    } else {
      const { data, error } = await supabase
        .from("phu_thu")
        .update({ loai_phu_thu: editValues.loai_phu_thu || null, thanh_tien: editValues.sell ? Number(editValues.sell) : null, ghi_chu: editValues.ghi_chu || null })
        .eq("id", rv.raw.id)
        .eq("updated_at", rv.raw.updated_at)
        .select()
        .single();
      if (error) return window.alert(laLoiXungDotSua(error) ? CANH_BAO_XUNG_DOT : error.message);
      setPhuThuRows((prev) => prev.map((r) => (r.id === rv.raw.id ? (data as PhuThu) : r)));
    }
    setEditingKey(null);
    setEditValues(null);
  }

  async function xoaDong(rv: RowView) {
    if (!window.confirm("Xóa dòng này?")) return;
    const table = rv.loai === "chi_phi" ? "phat_sinh_chi_phi" : rv.loai === "thue_ngoai" ? "don_thue_ngoai" : "phu_thu";
    const { error } = await supabase.from(table).delete().eq("id", rv.raw.id);
    if (error) return window.alert(error.message);
    if (rv.loai === "chi_phi") setChiPhiRows((prev) => prev.filter((r) => r.id !== rv.raw.id));
    else if (rv.loai === "thue_ngoai") setThueNgoaiRows((prev) => prev.filter((r) => r.id !== rv.raw.id));
    else setPhuThuRows((prev) => prev.filter((r) => r.id !== rv.raw.id));
  }

  async function duyet(rv: RowView, trangThai: "Đã duyệt" | "Từ chối") {
    const table = rv.loai === "chi_phi" ? "phat_sinh_chi_phi" : "don_thue_ngoai";
    // Khai bao ro : string — neu de TS tu suy literal type se ghep union 2
    // chuoi SAFE_COLS rat dai, lam "Expression produces a union type that is
    // too complex to represent" khi supabase-js co parse chuoi select().
    const safeCols: string = rv.loai === "chi_phi" ? PHAT_SINH_CHI_PHI_SAFE_COLS : DON_THUE_NGOAI_SAFE_COLS;
    const nhanVienId = rv.loai === "chi_phi" ? await layNhanVienId() : undefined;
    const payload: Record<string, unknown> = { trang_thai: trangThai };
    if (nhanVienId) payload.nguoi_duyet_id = nhanVienId;
    const { data, error } = await supabase.from(table).update(payload).eq("id", rv.raw.id).select(safeCols).single();
    if (error) return window.alert(error.message);
    // gia_ban_sell khong doi trong thao tac duyet — giu nguyen tu rv.sell.
    // safeCols la string chung (khong phai literal) nen data tra ve kieu
    // khong the suy dien tinh; ep ve Record de spread duoc.
    const dataObj = data as unknown as Record<string, unknown>;
    if (rv.loai === "chi_phi") setChiPhiRows((prev) => prev.map((r) => (r.id === rv.raw.id ? ({ ...dataObj, gia_ban_sell: rv.sell } as PhatSinhChiPhi) : r)));
    else setThueNgoaiRows((prev) => prev.map((r) => (r.id === rv.raw.id ? ({ ...dataObj, gia_ban_sell: rv.sell } as DonThueNgoai) : r)));
  }

  function coTheSua(rv: RowView) {
    if (rv.loai === "chi_phi") return ["Hiện trường", "Điều phối", "Chứng từ", "Kế toán", "Sale"].includes(phongBan);
    if (rv.loai === "thue_ngoai") return ["Hiện trường", "Điều phối", "Kế toán"].includes(phongBan);
    return ["Sale", "Kế toán"].includes(phongBan);
  }

  // Phan anh dung 2 dieu kien khoa da enforce o DB (enforce_phat_sinh_chi_phi_update/
  // enforce_don_thue_ngoai_update, 0064): "Da duyet" khoa Hien truong/Dieu
  // phoi/Chung tu; "Ke toan da tiep nhan" CHI khoa Hien truong/Chung tu (chi
  // phi) hoac chi Hien truong (thue ngoai) — Dieu phoi khong tham gia chu
  // trinh nay. Ke toan/Sale khong bao gio bi khoa boi dieu kien nay.
  function traLoiKhoa(rv: RowView): string | null {
    if (rv.loai === "phu_thu") return null;
    if (rv.loai === "chi_phi") {
      if (!["Hiện trường", "Điều phối", "Chứng từ"].includes(phongBan)) return null;
      if (rv.trangThai === "Đã duyệt") return "Đã duyệt, không thể sửa.";
      if (phongBan !== "Điều phối" && rv.nguoiNhapId && congViecMap[rv.nguoiNhapId] === "Đã tiếp nhận") {
        return "Kế toán đã tiếp nhận — liên hệ Kế toán để sửa.";
      }
    } else if (rv.loai === "thue_ngoai") {
      if (!["Hiện trường", "Điều phối"].includes(phongBan)) return null;
      if (rv.trangThai === "Đã duyệt") return "Đã duyệt, không thể sửa.";
      if (phongBan === "Hiện trường" && rv.nguoiNhapId && congViecMap[rv.nguoiNhapId] === "Đã tiếp nhận") {
        return "Kế toán đã tiếp nhận — liên hệ Kế toán để sửa.";
      }
    }
    return null;
  }

  // Cung chieu cao voi input ben trong SearchableSelect (px-3 py-2.5, cung
  // dinh nghia cung dat — component do khong nhan className rieng cho input
  // nen phai khop tay o day) de cac o trong 1 dong deu nhau, khong lom khom.
  const cls = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400";

  const tongBuy = rows.filter((r) => r.noiBo).reduce((s, r) => s + (r.buy ?? 0), 0);
  const tongSell = rows.reduce((s, r) => s + (r.sell ?? 0), 0);

  // ---- Nguon thanh toan + tam ung (chi Dieu phoi/Ke toan chon tay; Hien
  // truong/Chung tu de trigger tu dong gan — chi hien text "tu dong") ----
  function renderNguonThanhToanControls(
    loai: Loai,
    values: NewRowValues,
    set: (patch: Partial<NewRowValues>) => void,
    stateKey: string,
    lockedNhanVienId: string | undefined,
    disabled: boolean
  ) {
    if (loai === "phu_thu") return <span className="text-slate-300">—</span>;
    if (!canChonNguonThanhToan) {
      return <span className="text-xs text-slate-400">Tự động theo tạm ứng</span>;
    }
    if (disabled) {
      return <span className="text-xs text-slate-400">{values.nguon_thanh_toan || "—"}</span>;
    }

    const nhanVienTamUngOptions = loai === "chi_phi" ? nhanVienChiPhiTamUngOptions : nhanVienThueNgoaiTamUngOptions;
    const tamUngOptions = tamUngOptionsByKey[stateKey] ?? [];
    const dangTaiTamUng = loadingTamUngKeys.has(stateKey);

    function chonNguonThanhToan(v: string) {
      set({
        nguon_thanh_toan: v,
        tam_ung_id: v === "Tạm ứng nhân viên" ? values.tam_ung_id : "",
        nhan_vien_tam_ung_id: v === "Tạm ứng nhân viên" ? values.nhan_vien_tam_ung_id : "",
      });
      if (v !== "Tạm ứng nhân viên") return;
      if (isDieuPhoi && currentUserId) taiKhoanTamUng(stateKey, currentUserId);
      else if (lockedNhanVienId) taiKhoanTamUng(stateKey, lockedNhanVienId);
    }

    return (
      <div className="flex flex-col gap-1">
        <select value={values.nguon_thanh_toan} onChange={(e) => chonNguonThanhToan(e.target.value)} className={cls}>
          <option value="">-- Chọn --</option>
          <option value="Tiền mặt">Tiền mặt</option>
          <option value="Tài khoản công ty">Tài khoản công ty</option>
          <option value="Tạm ứng nhân viên">Tạm ứng nhân viên</option>
        </select>
        {values.nguon_thanh_toan === "Tạm ứng nhân viên" && (
          <>
            {isKeToan && !lockedNhanVienId && (
              <SearchableSelect
                options={nhanVienTamUngOptions.map((n) => ({ value: n.id, label: n.ten }))}
                value={values.nhan_vien_tam_ung_id}
                onChange={(v) => {
                  set({ nhan_vien_tam_ung_id: v, tam_ung_id: "" });
                  if (v) taiKhoanTamUng(stateKey, v);
                }}
                placeholder="-- Nhân viên --"
              />
            )}
            <select value={values.tam_ung_id} onChange={(e) => set({ tam_ung_id: e.target.value })} className={cls} disabled={dangTaiTamUng}>
              <option value="">-- Để trống --</option>
              {tamUngOptions.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.ngay_thuc_hien} · {t.so_tien.toLocaleString("en-US")}
                  {t.so_phieu ? ` · ${t.so_phieu}` : ""}
                </option>
              ))}
            </select>
          </>
        )}
      </div>
    );
  }

  // ---- Cac o nhap cho 1 dong (dung chung cho dong-them-moi va dong-dang-sua) ----
  function renderEditCells(
    loai: Loai,
    values: NewRowValues,
    set: (patch: Partial<NewRowValues>) => void,
    onlySellEditable: boolean,
    stateKey: string,
    lockedNhanVienId?: string
  ) {
    const disabledKhac = onlySellEditable;
    return (
      <>
        <td className="px-2 py-1.5">
          {loai === "chi_phi" ? (
            <SearchableSelect options={loaiChiPhiOptions} value={values.loai_chi_phi_id} onChange={(v) => set({ loai_chi_phi_id: v })} />
          ) : loai === "thue_ngoai" ? (
            <select disabled={disabledKhac} value={values.loai_dich_vu_thue} onChange={(e) => set({ loai_dich_vu_thue: e.target.value })} className={cls}>
              <option value="">-- Chọn --</option>
              {LOAI_DICH_VU_THUE.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          ) : (
            <input disabled={disabledKhac} value={values.loai_phu_thu} onChange={(e) => set({ loai_phu_thu: e.target.value })} className={cls} placeholder="VD: Phí lưu kho" />
          )}
        </td>
        <td className="px-2 py-1.5">
          {loai === "chi_phi" ? (
            <SearchableSelect
              disabled={disabledKhac}
              options={doiTacOptions}
              value={values.nha_cung_cap_id ? `ncc:${values.nha_cung_cap_id}` : values.doi_tac_thue_ngoai_id ? `doitac:${values.doi_tac_thue_ngoai_id}` : ""}
              onChange={(v) => {
                if (v.startsWith("ncc:")) set({ nha_cung_cap_id: v.slice(4), doi_tac_thue_ngoai_id: null });
                else if (v.startsWith("doitac:")) set({ doi_tac_thue_ngoai_id: v.slice(7), nha_cung_cap_id: null });
                else set({ nha_cung_cap_id: null, doi_tac_thue_ngoai_id: null });
              }}
            />
          ) : loai === "thue_ngoai" ? (
            <SearchableSelect disabled={disabledKhac} options={doiTacThueNgoaiOptions} value={values.doi_tac_thue_ngoai_id ?? ""} onChange={(v) => set({ doi_tac_thue_ngoai_id: v || null })} />
          ) : (
            <span className="text-slate-300">—</span>
          )}
        </td>
        <td className="px-2 py-1.5">
          {loai === "chi_phi" ? (
            <SearchableSelect
              disabled={disabledKhac}
              options={changOptions}
              value={values.chi_tiet_van_chuyen_id ?? ""}
              onChange={(v) => set({ chi_tiet_van_chuyen_id: v || null })}
              placeholder="-- Không gắn --"
            />
          ) : (
            <span className="text-slate-300">—</span>
          )}
        </td>
        <td className="px-2 py-1.5">
          {loai === "phu_thu" ? <span className="text-slate-300">—</span> : <MoneyInput disabled={disabledKhac} value={values.buy} onChange={(v) => set({ buy: v })} className={cls} />}
        </td>
        {canSeeSell && (
          <td className="px-2 py-1.5">
            <MoneyInput value={values.sell} onChange={(v) => set({ sell: v })} className={cls} />
          </td>
        )}
        <td className="px-2 py-1.5">
          {loai === "chi_phi" ? (
            <div className="flex items-center gap-2 text-xs">
              <label className="flex items-center gap-1">
                <input disabled={disabledKhac} type="checkbox" checked={values.noi_bo} onChange={(e) => set({ noi_bo: e.target.checked, chi_ho: e.target.checked ? false : values.chi_ho })} />
                Nội bộ
              </label>
              <label className="flex items-center gap-1">
                <input disabled={disabledKhac} type="checkbox" checked={values.chi_ho} onChange={(e) => set({ chi_ho: e.target.checked, noi_bo: e.target.checked ? false : values.noi_bo })} />
                Chi hộ
              </label>
            </div>
          ) : (
            <span className="text-slate-300">—</span>
          )}
        </td>
        <td className="px-2 py-1.5">{renderNguonThanhToanControls(loai, values, set, stateKey, lockedNhanVienId, disabledKhac)}</td>
        {canSeeSell && (
          <td className="px-2 py-1.5 text-slate-400">
            {loai === "phu_thu" ? fmt(Number(values.sell) || 0) : fmt((Number(values.sell) || 0) - (Number(values.buy) || 0))}
          </td>
        )}
      </>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Danh sách chi phí & phụ thu lô hàng</h2>
          {["Hiện trường", "Chứng từ"].includes(phongBan) && <p className="text-xs text-slate-400">Chỉ hiện các dòng do chính bạn nhập.</p>}
        </div>
        {coTheThem && (
          <button onClick={themDongMoi} className="rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white">
            + Thêm dòng
          </button>
        )}
      </div>

      {/* ---- Desktop: bang inline ---- */}
      <div className="hidden overflow-x-auto sm:block">
        <table className={`w-full text-sm ${canSeeSell ? "min-w-[1490px]" : "min-w-[1270px]"}`} style={{ tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: 110 }} />
            <col style={{ width: 180 }} />
            <col style={{ width: 190 }} />
            <col style={{ width: 160 }} />
            <col style={{ width: 110 }} />
            {canSeeSell && <col style={{ width: 110 }} />}
            <col style={{ width: 130 }} />
            <col style={{ width: 170 }} />
            {canSeeSell && <col style={{ width: 110 }} />}
            <col style={{ width: 100 }} />
            <col style={{ width: 120 }} />
          </colgroup>
          <thead className="bg-slate-50 text-left text-xs font-medium text-slate-500">
            <tr>
              <th className="px-2 py-2">Loại dòng</th>
              <th className="px-2 py-2">Loại chi phí / dịch vụ</th>
              <th className="px-2 py-2">NCC / Đối tác</th>
              <th className="px-2 py-2">Chặng</th>
              <th className="px-2 py-2">Số tiền đã chi</th>
              {canSeeSell && <th className="px-2 py-2">Giá bán</th>}
              <th className="px-2 py-2">Nội bộ / Chi hộ</th>
              <th className="px-2 py-2">Nguồn thanh toán</th>
              {canSeeSell && <th className="px-2 py-2">Lợi nhuận</th>}
              <th className="px-2 py-2">Trạng thái</th>
              <th className="px-2 py-2">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((rv) => {
              const dangSua = editingKey === rv.key && editValues;
              const chiSuaSell = rv.loai === "chi_phi" && isSaleOnly;
              const loiNhuan = rv.sell !== null || rv.buy !== null ? (rv.sell ?? 0) - (rv.buy ?? 0) : null;
              return (
                <tr key={rv.key} className="border-t border-slate-100 align-top">
                  {dangSua ? (
                    <>
                      <td className="px-2 py-1.5 text-xs font-medium text-slate-500">{LOAI_LABEL[rv.loai]}</td>
                      {renderEditCells(
                        rv.loai,
                        editValues!,
                        (patch) => setEditValues((prev) => (prev ? { ...prev, ...patch } : prev)),
                        chiSuaSell,
                        `edit:${rv.key}`,
                        rv.nguoiNhapId ?? undefined
                      )}
                      <td className="px-2 py-1.5">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${rv.trangThai ? TRANG_THAI_COLOR[rv.trangThai] : "bg-slate-100 text-slate-400"}`}>
                          {rv.trangThai ?? "—"}
                        </span>
                      </td>
                      <td className="px-2 py-1.5">
                        <div className="flex gap-2">
                          <button onClick={() => luuSua(rv)} className="text-xs font-medium text-green-600">
                            Lưu
                          </button>
                          <button
                            onClick={() => {
                              setEditingKey(null);
                              setEditValues(null);
                            }}
                            className="text-xs font-medium text-slate-500"
                          >
                            Hủy
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-2 py-2 text-xs font-medium text-slate-500">{LOAI_LABEL[rv.loai]}</td>
                      <td className="px-2 py-2 font-medium text-slate-900">{rv.ten}</td>
                      <td className="px-2 py-2 text-slate-600">{rv.doiTac}</td>
                      <td className="px-2 py-2 text-slate-500">{rv.chang ?? "—"}</td>
                      <td className="px-2 py-2 text-slate-700">{rv.buy !== null ? fmt(rv.buy) : "—"}</td>
                      {canSeeSell && <td className="px-2 py-2 text-slate-700">{rv.sell !== null ? fmt(rv.sell) : "—"}</td>}
                      <td className="px-2 py-2 text-slate-500">{rv.noiBo === null ? "—" : rv.noiBo ? "Nội bộ" : rv.chiHo ? "Chi hộ" : "—"}</td>
                      <td className="px-2 py-2 text-slate-500">{rv.nguonThanhToan ?? "—"}</td>
                      {canSeeSell && <td className="px-2 py-2 font-medium text-slate-700">{loiNhuan !== null ? fmt(loiNhuan) : "—"}</td>}
                      <td className="px-2 py-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${rv.trangThai ? TRANG_THAI_COLOR[rv.trangThai] : "bg-slate-100 text-slate-400"}`}>
                          {rv.trangThai ?? "—"}
                        </span>
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex flex-wrap items-center gap-2">
                          {coTheSua(rv) && !traLoiKhoa(rv) && (
                            <button onClick={() => batDauSua(rv)} className="text-xs font-medium text-blue-600">
                              Sửa
                            </button>
                          )}
                          {coTheSua(rv) && traLoiKhoa(rv) && <span className="text-xs text-slate-400">{traLoiKhoa(rv)}</span>}
                          {canApprove && rv.trangThai && ["Nháp", "Chờ duyệt"].includes(rv.trangThai) && (
                            <>
                              <button onClick={() => duyet(rv, "Đã duyệt")} className="text-xs font-medium text-green-600">
                                Duyệt
                              </button>
                              <button onClick={() => duyet(rv, "Từ chối")} className="text-xs font-medium text-red-600">
                                Từ chối
                              </button>
                            </>
                          )}
                          {isKeToan && (
                            <button onClick={() => xoaDong(rv)} className="text-xs font-medium text-red-600">
                              Xóa
                            </button>
                          )}
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}

            {addingRows.map((r) => (
              <tr key={r.key} className="border-t border-slate-100 bg-blue-50/30 align-top">
                <td className="px-2 py-1.5">
                  <select
                    value={r.loai}
                    onChange={(e) => capNhatDongMoi(r.key, blankNewRow(e.target.value as Loai))}
                    className={cls}
                  >
                    {loaiChoPhepThem.map((l) => (
                      <option key={l} value={l}>
                        {LOAI_LABEL[l]}
                      </option>
                    ))}
                  </select>
                </td>
                {renderEditCells(r.loai, r, (patch) => capNhatDongMoi(r.key, patch), false, `add:${r.key}`, undefined)}
                <td className="px-2 py-1.5 text-slate-300">—</td>
                <td className="px-2 py-1.5">
                  <div className="flex gap-2">
                    <button onClick={() => luuDongMoi(r)} className="text-xs font-medium text-green-600">
                      Lưu
                    </button>
                    <button onClick={() => huyDongMoi(r.key)} className="text-xs font-medium text-slate-500">
                      Hủy
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {rows.length === 0 && addingRows.length === 0 && (
              <tr>
                <td colSpan={11} className="px-2 py-6 text-center text-slate-400">
                  Chưa có dòng nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ---- Mobile: the (card) ---- */}
      <div className="flex flex-col gap-2 sm:hidden">
        {rows.map((rv) => {
          const loiNhuan = rv.sell !== null || rv.buy !== null ? (rv.sell ?? 0) - (rv.buy ?? 0) : null;
          return (
            <div key={rv.key} className="rounded-lg border border-slate-100 p-3 text-sm">
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-slate-900">
                  {rv.ten} <span className="font-normal text-slate-400">· {LOAI_LABEL[rv.loai]}</span>
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${rv.trangThai ? TRANG_THAI_COLOR[rv.trangThai] : "bg-slate-100 text-slate-400"}`}>
                  {rv.trangThai ?? "—"}
                </span>
              </div>
              <p className="text-slate-500">
                {rv.doiTac} · Số tiền đã chi: {rv.buy !== null ? fmt(rv.buy) : "—"}
                {canSeeSell && rv.sell !== null && ` · Giá bán: ${fmt(rv.sell)}`}
                {canSeeSell && loiNhuan !== null && ` · LN: ${fmt(loiNhuan)}`}
                {rv.noiBo !== null && ` · ${rv.noiBo ? "Nội bộ" : rv.chiHo ? "Chi hộ" : "—"}`}
                {rv.nguonThanhToan && ` · Nguồn: ${rv.nguonThanhToan}`}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                {coTheSua(rv) && !traLoiKhoa(rv) && (
                  <button onClick={() => batDauSua(rv)} className="text-xs font-medium text-blue-600">
                    Sửa
                  </button>
                )}
                {coTheSua(rv) && traLoiKhoa(rv) && <span className="text-xs text-slate-400">{traLoiKhoa(rv)}</span>}
                {canApprove && rv.trangThai && ["Nháp", "Chờ duyệt"].includes(rv.trangThai) && (
                  <>
                    <button onClick={() => duyet(rv, "Đã duyệt")} className="text-xs font-medium text-green-600">
                      Duyệt
                    </button>
                    <button onClick={() => duyet(rv, "Từ chối")} className="text-xs font-medium text-red-600">
                      Từ chối
                    </button>
                  </>
                )}
                {isKeToan && (
                  <button onClick={() => xoaDong(rv)} className="text-xs font-medium text-red-600">
                    Xóa
                  </button>
                )}
              </div>

              {editingKey === rv.key && editValues && (
                <div className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3">
                  {editValues.loai === "chi_phi" && <SearchableSelect options={loaiChiPhiOptions} value={editValues.loai_chi_phi_id} onChange={(v) => setEditValues((p) => (p ? { ...p, loai_chi_phi_id: v } : p))} />}
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Số tiền đã chi</label>
                    <MoneyInput value={editValues.buy} onChange={(v) => setEditValues((p) => (p ? { ...p, buy: v } : p))} className={cls} disabled={rv.loai === "phu_thu"} />
                  </div>
                  {canSeeSell && (
                    <div>
                      <label className="mb-1 block text-xs text-slate-500">Giá bán</label>
                      <MoneyInput value={editValues.sell} onChange={(v) => setEditValues((p) => (p ? { ...p, sell: v } : p))} className={cls} />
                    </div>
                  )}
                  {rv.loai !== "phu_thu" && (
                    <div>
                      <label className="mb-1 block text-xs text-slate-500">Nguồn thanh toán</label>
                      {renderNguonThanhToanControls(
                        rv.loai,
                        editValues,
                        (patch) => setEditValues((p) => (p ? { ...p, ...patch } : p)),
                        `edit:${rv.key}`,
                        rv.nguoiNhapId ?? undefined,
                        false
                      )}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button onClick={() => luuSua(rv)} className="flex-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white">
                      Lưu
                    </button>
                    <button
                      onClick={() => {
                        setEditingKey(null);
                        setEditValues(null);
                      }}
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700"
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {addingRows.map((r) => (
          <div key={r.key} className="rounded-lg border border-blue-200 bg-blue-50/40 p-3 text-sm">
            <label className="mb-1 block text-xs text-slate-500">Loại dòng</label>
            <select value={r.loai} onChange={(e) => capNhatDongMoi(r.key, blankNewRow(e.target.value as Loai))} className={`${cls} mb-2`}>
              {loaiChoPhepThem.map((l) => (
                <option key={l} value={l}>
                  {LOAI_LABEL[l]}
                </option>
              ))}
            </select>
            {r.loai === "chi_phi" && (
              <div className="mb-2">
                <label className="mb-1 block text-xs text-slate-500">Loại chi phí</label>
                <SearchableSelect options={loaiChiPhiOptions} value={r.loai_chi_phi_id} onChange={(v) => capNhatDongMoi(r.key, { loai_chi_phi_id: v })} />
              </div>
            )}
            {r.loai === "thue_ngoai" && (
              <>
                <div className="mb-2">
                  <label className="mb-1 block text-xs text-slate-500">Loại dịch vụ</label>
                  <select value={r.loai_dich_vu_thue} onChange={(e) => capNhatDongMoi(r.key, { loai_dich_vu_thue: e.target.value })} className={cls}>
                    <option value="">-- Chọn --</option>
                    {LOAI_DICH_VU_THUE.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-2">
                  <label className="mb-1 block text-xs text-slate-500">Đối tác thuê ngoài</label>
                  <SearchableSelect options={doiTacThueNgoaiOptions} value={r.doi_tac_thue_ngoai_id ?? ""} onChange={(v) => capNhatDongMoi(r.key, { doi_tac_thue_ngoai_id: v || null })} />
                </div>
              </>
            )}
            {r.loai === "phu_thu" && (
              <div className="mb-2">
                <label className="mb-1 block text-xs text-slate-500">Loại phụ thu</label>
                <input value={r.loai_phu_thu} onChange={(e) => capNhatDongMoi(r.key, { loai_phu_thu: e.target.value })} className={cls} placeholder="VD: Phí lưu kho" />
              </div>
            )}
            {r.loai !== "phu_thu" && (
              <div className="mb-2">
                <label className="mb-1 block text-xs text-slate-500">Số tiền đã chi</label>
                <MoneyInput value={r.buy} onChange={(v) => capNhatDongMoi(r.key, { buy: v })} className={cls} />
              </div>
            )}
            <div className="mb-2">
              <label className="mb-1 block text-xs text-slate-500">Giá bán / Thành tiền</label>
              <MoneyInput value={r.sell} onChange={(v) => capNhatDongMoi(r.key, { sell: v })} className={cls} />
            </div>
            {r.loai !== "phu_thu" && (
              <div className="mb-2">
                <label className="mb-1 block text-xs text-slate-500">Nguồn thanh toán</label>
                {renderNguonThanhToanControls(r.loai, r, (patch) => capNhatDongMoi(r.key, patch), `add:${r.key}`, undefined, false)}
              </div>
            )}
            {r.loai === "chi_phi" && (
              <div className="mb-2 flex items-center gap-3 text-xs">
                <label className="flex items-center gap-1">
                  <input type="checkbox" checked={r.noi_bo} onChange={(e) => capNhatDongMoi(r.key, { noi_bo: e.target.checked, chi_ho: e.target.checked ? false : r.chi_ho })} />
                  Nội bộ
                </label>
                <label className="flex items-center gap-1">
                  <input type="checkbox" checked={r.chi_ho} onChange={(e) => capNhatDongMoi(r.key, { chi_ho: e.target.checked, noi_bo: e.target.checked ? false : r.noi_bo })} />
                  Chi hộ
                </label>
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => luuDongMoi(r)} className="flex-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white">
                Lưu
              </button>
              <button onClick={() => huyDongMoi(r.key)} className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700">
                Hủy
              </button>
            </div>
          </div>
        ))}

        {rows.length === 0 && addingRows.length === 0 && <p className="text-sm text-slate-400">Chưa có dòng nào.</p>}
      </div>

      {rows.length > 0 && (
        <div className="mt-3 border-t border-slate-100 pt-3 text-sm text-slate-600">
          Tổng số tiền đã chi (nội bộ): <strong>{fmt(tongBuy)}</strong>
          {canSeeSell && (
            <>
              {" · "}Tổng giá bán: <strong>{fmt(tongSell)}</strong>
            </>
          )}
        </div>
      )}
    </div>
  );
}
