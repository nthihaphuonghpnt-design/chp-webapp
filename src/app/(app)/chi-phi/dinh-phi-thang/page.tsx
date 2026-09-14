import { redirect } from "next/navigation";

// Da thay the hoan toan boi "Hóa đơn đầu vào" (migration 0082) — theo doi
// duoc nha cung cap, so hoa don, thue GTGT, da tra/chua tra, khong chi don
// gian "thang + khoan muc + so tien" nhu bang cu nua. Giu route redirect de
// link/bookmark cu khong bi gay.
export default function DinhPhiThangPage() {
  redirect("/chi-phi/hoa-don-dau-vao");
}
