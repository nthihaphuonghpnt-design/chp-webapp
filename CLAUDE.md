@AGENTS.md

# CHP Webapp — Ghi chú cho các phiên làm việc sau

Đây là bản đồ cấu trúc dự án, viết để bất kỳ phiên Claude Code nào (kể cả trên máy khác) đọc vào là hiểu ngay hệ thống đang có gì, không cần người dùng giải thích lại từ đầu. Tài liệu này **mô tả code**, không phải hướng dẫn dùng cho nhân viên (bản đó là artifact "Hướng Dẫn Dùng Thử CHP Webapp" đã publish riêng).

## 0. Bối cảnh vận hành — đọc trước khi làm gì

- **Chủ đầu tư**: anh Bảo Dũng (không rành code), công ty CHP (Châu Hoàng Phát) — dịch vụ khai báo hải quan / vận tải / ủy thác xuất nhập khẩu.
- **Deploy**: Next.js (App Router) + Supabase, host trên **Vercel** (project `chp-webapp`, region function đã pin `sin1`/Singapore để khớp Supabase `ap-southeast-1`). Domain chính thức: **`app.chauhoangphat.com`** (CNAME → Vercel), bản `.vercel.app` vẫn còn nhưng không dùng để gửi nhân viên.
- **Git**: repo **riêng tư** `github.com/nthihaphuonghpnt-design/chp-webapp`, nhánh `main`. Push lên `main` là Vercel tự build & deploy (không cần thao tác gì thêm bên Vercel).
- **⚠️ Làm việc từ nhiều máy**: dự án này được sửa song song từ ít nhất 2 máy (máy chính + máy nhà) trong các phiên Claude Code riêng biệt, không chia sẻ ngữ cảnh cho nhau. **Luôn `git pull`/`git fetch` trước khi bắt đầu sửa gì**, và kiểm tra `git log origin/main` xem có commit lạ không trước khi tin tưởng code local là bản mới nhất — từng xảy ra việc 2 máy cùng làm PWA trùng nhau, phải dọn lại sau khi merge.
- **⚠️ Số thứ tự migration KHÔNG đáng tin 100%**: từng có trường hợp migration đã đưa cho người dùng nhưng người dùng **quên chạy** (ví dụ 0039 — vá bảo mật lương, khá nghiêm trọng), phát hiện muộn qua migration `0057_catchup_ra_soat_toan_bo.sql` (migration gộp, sinh ra sau khi introspect trực tiếp database sống để đối chiếu). Trước khi giả định 1 tính năng "chắc chắn đã có trên production", nên nhờ người dùng chạy 1 câu SQL kiểm tra nhanh (kiểu `select exists(...)`) thay vì tin theo số thứ tự file.
- File `.env.local` chỉ chứa 2 biến public (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) — không có secret nào cần giữ kín trong repo.

## 1. Sơ đồ trang / module chính

Quy ước: mọi trang thật nằm trong `src/app/(app)/**` (dùng chung layout có `AppNav`), trừ `/login`. Cột "Quyền xem trang" ghi theo đúng điều kiện chặn (nếu có) đọc trực tiếp từ code — không suy đoán.

| Route | Trang làm gì | Component chính render | Quyền xem trang (chặn ở page.tsx) |
|---|---|---|---|
| `/` | Trang chủ — dashboard việc cần làm (chấm công hôm nay, nhắc nhở, đơn Sale chưa xong, chi phí/thuê ngoài chờ duyệt, hợp đồng sắp hết hạn, tờ khai chưa xong, tạm ứng chờ duyệt...) | *(server component, không có client view riêng)* | Không chặn — ai đăng nhập cũng vào được, nội dung từng khối tự ẩn/hiện theo phòng ban |
| `/login` | Đăng nhập | *(tự chứa)* | Trang công khai |
| `/don-hang` | Danh sách đơn hàng | `DonHangList`, `DonHangExcelTools` | Không chặn xem; nút "+ Nhập lô hàng mới" chỉ hiện với `canManageDonHang()` |
| `/don-hang/moi` | Tạo đơn hàng mới | `DonHangForm` | Chặn nếu không phải `canManageDonHang()` |
| `/don-hang/[id]` | Chi tiết 1 đơn hàng — trang lớn nhất hệ thống, gồm nhiều section con | `ToKhaiSection`, `ChiTietVanChuyenSection`, `ContainerSection`, `DinhKemSection`, `ChiPhiSection`, `ThueNgoaiSection`, `LineItemsSection` (dùng lại cho Phụ thu + Chi phí giao nhận), `ConfirmButtons`, `StatusBadge` | Không chặn cả trang; **từng khối con tự gate riêng** — xem mục 3 |
| `/don-hang/[id]/sua` | Sửa thông tin đơn hàng | `DonHangForm` | Chặn nếu không phải `canManageDonHang()` |
| `/khach-hang/hop-dong` | Hợp đồng khách hàng | `HopDongView` | Chặn nếu không phải `["Sale","Kế toán","Giám đốc"]`; sửa/xóa chỉ Kế toán |
| `/khach-hang/hoa-don` | Hóa đơn xuất | `HoaDonView` | Chặn nếu không phải `["Sale","Chứng từ","Kế toán","Giám đốc"]`; sửa: Chứng từ/Kế toán, xóa: Kế toán |
| `/khach-hang/bang-ke` | Bảng kê chi phí theo khách hàng → tạo hóa đơn | `BangKeView` | Chỉ `"Kế toán"` |
| `/danh-muc/bang-gia-khach-hang` | Bảng giá đã thỏa thuận với khách | `BangGiaView` | Không chặn xem; sửa: `["Sale","Kế toán","Giám đốc"]` |
| `/tam-ung-giai-chi` | Tạm ứng & giải chi (nhân viên/tài xế/khách hàng) | `TamUngGiaiChiView` | Không chặn ở page.tsx (logic quyền nằm trong component, theo `currentPhongBan`) |
| `/thu-chi/so-quy` | Sổ quỹ (tiền mặt / tài khoản công ty) | `SoQuyView` | Chỉ `["Kế toán","Giám đốc"]` |
| `/chi-phi/dinh-phi-thang` | Định phí phân bổ theo tháng | `DanhMucManager` | Không chặn xem; sửa chỉ `"Kế toán"` |
| `/bao-cao` | Báo cáo doanh thu/chi phí/lợi nhuận | `BaoCaoView` | Chỉ `["Sale","Kế toán","Giám đốc"]` |
| `/cham-cong` | Chấm công (tự chấm + admin duyệt) | `ChamCongCuaToiView`, `ChamCongAdminView`, `DonNghiPhepView`, `DonNghiPhepAdminView` | Không chặn cả trang; admin = `["Kế toán","Giám đốc"]`, tự chấm chỉ áp dụng "nhân viên văn phòng" (`laNhanVienVanPhong` = mọi phòng ban trừ Hiện trường/Sale) |
| `/luong-cua-toi` | Xem lương của chính mình | `LuongCuaToiView` | Chỉ cần đăng nhập — luôn lọc theo đúng `user.id`, không phân biệt phòng ban |
| `/chi-phi/bang-luong` | Bảng lương toàn công ty | `BangLuongView` | Chỉ `["Kế toán","Giám đốc"]` |
| `/nhan-vien/hop-dong` | Hợp đồng lao động nhân viên | `HopDongNhanVienView` | Chỉ `["Kế toán","Giám đốc"]` |
| `/lich-nhac-nho` | Lịch nhắc nhở việc cần làm | `LichNhacNhoView` | Không chặn ở page.tsx |
| `/danh-muc` | Trang chỉ mục — link tới toàn bộ danh mục dùng chung | *(tĩnh)* | Không chặn |
| `/danh-muc/khach-hang`, `/hang-hoa`, `/dia-diem`, `/loai-container`, `/loai-chi-phi`, `/nha-cung-cap`, `/doi-tac-thue-ngoai`, `/xe-van-chuyen`, `/nhom-khach-hang` | CRUD danh mục dùng chung | `DanhMucManager` (dùng lại cho tất cả) | Chỉ cần đăng nhập là sửa được (`canEdit={!!user}`) — **không giới hạn phòng ban** |
| `/danh-muc/lich-nghi-le` | Lịch nghỉ lễ (phục vụ chấm công) | `DanhMucManager` + `ThemNgayLeHangLoat` | Sửa/thêm hàng loạt chỉ `["Kế toán","Giám đốc"]` |
| `/danh-muc/nhan-vien` | Danh sách nhân viên (có thông tin lương) | `DanhMucManager` | Chặn cả trang nếu không phải `["Kế toán","Giám đốc"]` — **không có trong menu điều hướng**, chỉ vào được qua card ở `/danh-muc` |

## 2. Vai trò từng thư mục

```
src/
  app/
    (app)/            route group dùng chung layout có AppNav — gần như toàn bộ trang thật
    login/            trang đăng nhập, đứng ngoài (app) vì không có nav
  components/
    don-hang/         mọi section trong trang chi tiết đơn hàng (chi phí, tờ khai, vận chuyển, container, đính kèm...)
    khach-hang/        hợp đồng, hóa đơn, bảng giá, bảng kê — mọi thứ quy về "khách hàng"
    chi-phi/           Bảng lương (BangLuongView) — dù tên thư mục là "chi-phi", chỉ chứa payroll
    luong/             LuongCuaToiView — bản self-service của Bảng lương
    nhan-vien/         Hợp đồng nhân viên
    cham-cong/         4 view của module Chấm công (tự chấm/admin × chấm công/nghỉ phép)
    tam-ung-giai-chi/  Tạm ứng & giải chi
    thu-chi/           Sổ quỹ
    bao-cao/           Báo cáo tổng hợp
    lich-nhac-nho/     Lịch nhắc nhở
    danh-muc/          DanhMucManager (CRUD tổng quát dùng chung cho ~10 trang danh mục) + tiện ích liên quan
    common/            Component tái sử dụng xuyên suốt: MoneyInput, SearchableSelect, FileAttachSection,
                        QuickAddKhachHang/NhaCungCap/DoiTacThueNgoai/Select (dropdown + modal thêm nhanh),
                        RegisterServiceWorker (đăng ký service worker cho PWA)
    layout/            AppNav.tsx — menu điều hướng + phân quyền hiển thị menu
  lib/
    auth.ts            getCurrentUser() — nguồn sự thật duy nhất về "ai đang đăng nhập, phòng ban gì"
    permissions.ts      canManageDonHang() — HIỆN CHỈ CÓ 1 helper này, các check quyền khác đều viết
                        thẳng trong từng page/component (user.phong_ban === "...")
    chamCong.ts         helper miền chấm công (ngày hôm nay theo giờ VN, ai phải chấm công, tính trạng thái...)
    luong.ts            công thức lương DÙNG CHUNG giữa BangLuongView và LuongCuaToiView — sửa lương thì
                        sửa Ở ĐÂY, đừng sửa riêng từng view kẻo 2 chỗ lệch nhau
    excel.ts            toolkit xuất Excel có letterhead công ty (dùng bởi gần hết các trang danh sách)
    nhacViec.ts          tính mốc "cuối tháng" để hiện nhắc việc trên trang chủ
    taxLookup.ts         tra cứu tên/địa chỉ công ty theo MST (API VietQR) — dùng khi thêm khách hàng/NCC
    supabase/
      client.ts          Supabase client phía trình duyệt ("use client")
      server.ts          Supabase client phía server component
      middleware.ts       chặn truy cập khi chưa đăng nhập (redirect /login) — đây là lớp bảo vệ TOÀN TRANG,
                        tách biệt với phân quyền theo phòng ban ở từng page
  types/database.ts      toàn bộ interface TypeScript khớp schema Supabase — sửa schema thì nhớ cập nhật theo
supabase/migrations/     lịch sử migration SQL, đánh số thứ tự — xem mục 0 về rủi ro "chưa chạy hết"
```

## 3. Phân quyền theo phòng ban — nằm ở những đâu

Có **3 lớp** phân quyền tách biệt, không lớp nào thay thế lớp nào:

**Lớp 1 — Middleware (chặn chưa đăng nhập, không liên quan phòng ban)**
`src/lib/supabase/middleware.ts` → `updateSession()`: chưa đăng nhập thì redirect `/login`, đã đăng nhập mà vào `/login` thì redirect `/`.

**Lớp 2 — Code phía Next.js (UI/UX, KHÔNG phải bảo mật thật sự)**
Đây là lớp quyết định **người dùng nhìn thấy gì**, nhưng chỉ chặn ở giao diện — không chặn được ai đó gọi thẳng Supabase API. Gồm:
- `src/lib/auth.ts` → `getCurrentUser()`: mọi page/component lấy `user.phong_ban` từ đây.
- `src/lib/permissions.ts` → `canManageDonHang()`: quyền tạo/sửa đơn hàng (B1).
- Từng `page.tsx` tự chặn bằng `if (user?.phong_ban !== "...")` hoặc so sánh với mảng — xem bảng ở mục 1, cột cuối. **Không có helper trung tâm cho các quyền này**, mỗi trang viết điều kiện riêng — khi đổi 1 quyền, phải tìm đúng file page.tsx đó mà sửa, không có chỗ sửa 1 lần cho tất cả.
- `src/components/layout/AppNav.tsx` → mảng `roles` trên từng mục menu — chỉ ẩn/hiện menu, **không phải chặn truy cập** (ai đó gõ thẳng URL vẫn vào được nếu page.tsx không tự chặn).
- Trong `/don-hang/[id]/page.tsx` có nhiều biến gate cục bộ (`canSeeLoiNhuan`, `canEditVanChuyen`, `canEditToKhai`, `canEditContainer`...) áp riêng cho từng section con của trang chi tiết đơn hàng — đây là trang có phân quyền chi tiết nhất hệ thống.

**Lớp 3 — Row Level Security (RLS) trong Supabase — đây mới là lớp bảo mật THẬT SỰ**
Hàm SQL trung tâm `current_phong_ban()` (định nghĩa lần đầu ở `supabase/migrations/0001_module9_danh_muc.sql`) — đọc phòng ban của người đang gọi API từ `auth.uid()`. **37/57 file migration** có dùng hàm này để viết policy `using (current_phong_ban() = '...')` trên các bảng. Vì RLS được sửa qua nhiều migration nối tiếp (drop rồi tạo lại policy cùng tên), **trạng thái cuối cùng phải xem trực tiếp trong Supabase Dashboard → Authentication → Policies (hoặc query `pg_policies`)**, không nên suy ra chỉ bằng cách đọc migration theo thứ tự — dễ nhầm vì có bản vá muộn hơn. Các migration đáng chú ý nhất về phân quyền (thời điểm siết/mở quyền lớn):
- `0020` — Hiện trường/Chứng từ chỉ xem chi phí do chính mình nhập.
- `0033` — giới hạn hợp đồng khách hàng + chi phí giao nhận theo phòng ban.
- `0039` — **thu hồi quyền SELECT trực tiếp cột lương** (`luong_co_dinh`, `muc_dong_bhxh`) khỏi mọi role, chỉ cho xem qua RPC `luong_cua_nhan_vien()` (Kế toán/Giám đốc xem ai cũng được, người khác chỉ xem của chính mình). Đây là lỗ hổng bảo mật nghiêm trọng nhất từng phát hiện trong dự án — mọi lần đụng tới lương phải nhớ đi qua RPC này, không select thẳng cột.
- `0040`, `0041` — Sale chỉ xem giá vốn/giá bán/phụ thu/hóa đơn của đơn hàng do chính Sale đó phụ trách, không xem được của Sale khác.
- `0057` — migration gộp "rà soát toàn bộ", vá các migration bị bỏ sót chưa chạy (xem mục 0).
