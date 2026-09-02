import Image from "next/image";
import { getCurrentUser } from "@/lib/auth";
import { CONG_TY } from "@/lib/excel";

function loiChao() {
  const gio = new Date().getHours();
  if (gio < 11) return "Chào buổi sáng";
  if (gio < 13) return "Chào buổi trưa";
  if (gio < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-white p-6 text-center sm:flex-row sm:text-left">
        <Image
          src="/logo-chp.jpg"
          alt="Châu Hoàng Phát"
          width={80}
          height={80}
          className="rounded-xl"
          priority
        />
        <div>
          <p className="text-sm font-bold tracking-wide text-blue-900">{CONG_TY.tenViet}</p>
          <p className="text-xs italic text-blue-600">{CONG_TY.tenAnh}</p>
        </div>
      </div>

      <h1 className="text-xl font-semibold text-slate-900">
        {loiChao()}, {user?.ho_ten ?? ""} 👋
      </h1>
      <p className="mt-1 text-sm text-slate-500">Phòng ban: {user?.phong_ban}</p>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
        <p className="text-sm font-medium text-slate-700">Thông tin công ty</p>
        <dl className="mt-2 space-y-1 text-sm text-slate-600">
          <div className="flex flex-wrap gap-1">
            <dt className="text-slate-400">MST:</dt>
            <dd>{CONG_TY.mst}</dd>
          </div>
          <div className="flex flex-wrap gap-1">
            <dt className="text-slate-400">Địa chỉ:</dt>
            <dd>{CONG_TY.diaChi}</dd>
          </div>
          <div className="flex flex-wrap gap-1">
            <dt className="text-slate-400">Email:</dt>
            <dd>{CONG_TY.email}</dd>
          </div>
        </dl>
      </div>

      <p className="mt-6 text-center text-xs text-slate-400">
        Dùng menu bên (hoặc nút &quot;Menu&quot; trên điện thoại) để vào các mục quản lý.
      </p>
    </div>
  );
}
