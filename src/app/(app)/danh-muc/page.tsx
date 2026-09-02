import Link from "next/link";

const ITEMS = [
  { href: "/danh-muc/khach-hang", label: "Khách hàng", desc: "Danh sách khách hàng sử dụng dịch vụ" },
  { href: "/danh-muc/nhom-khach-hang", label: "Nhóm khách hàng", desc: "Gom các công ty con của cùng 1 mối quan hệ (vd tập đoàn) cho dễ lọc" },
  { href: "/danh-muc/nha-cung-cap", label: "Nhà cung cấp / Đối tác", desc: "Đối tác cung cấp dịch vụ chi phí (bốc xếp, kiểm dịch...)" },
  { href: "/danh-muc/doi-tac-thue-ngoai", label: "Đối tác thuê ngoài", desc: "Công ty vận tải / hãng tàu / đại lý cước biển" },
  { href: "/danh-muc/nhan-vien", label: "Nhân viên", desc: "Nhân viên và phòng ban, dùng để đăng nhập & phân quyền" },
  { href: "/danh-muc/loai-chi-phi", label: "Loại chi phí", desc: "Danh mục các khoản chi phí thường gặp" },
  { href: "/danh-muc/loai-container", label: "Loại container / Hàng hóa", desc: "20', 40', 45'..." },
  { href: "/danh-muc/hang-hoa", label: "Hàng hóa", desc: "Danh mục loại hàng hóa" },
  { href: "/danh-muc/dia-diem", label: "Địa điểm", desc: "Cảng, kho, nơi giao nhận" },
  { href: "/danh-muc/xe-van-chuyen", label: "Xe vận chuyển", desc: "Xe thuê ngoài, chọn khi nhập lô hàng" },
];

export default function DanhMucIndexPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="mb-4 text-xl font-semibold text-slate-900">Danh mục dùng chung</h1>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-blue-300"
          >
            <p className="font-medium text-slate-900">{item.label}</p>
            <p className="mt-1 text-sm text-slate-500">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
