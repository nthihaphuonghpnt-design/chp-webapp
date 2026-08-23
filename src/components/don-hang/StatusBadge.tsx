const COLORS: Record<string, string> = {
  "Tiếp nhận": "bg-slate-200 text-slate-700",
  "Làm thủ tục": "bg-amber-100 text-amber-700",
  "Thông quan": "bg-blue-100 text-blue-700",
  "Giao hàng": "bg-purple-100 text-purple-700",
  "Hoàn tất": "bg-green-100 text-green-700",
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${COLORS[status] ?? "bg-slate-200 text-slate-700"}`}>
      {status}
    </span>
  );
}
