"use client";

function formatDisplay(raw: string): string {
  if (!raw) return "";
  const neg = raw.trim().startsWith("-");
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const [intPart, ...rest] = cleaned.split(".");
  const withCommas = (intPart || "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const decPart = rest.length > 0 ? "." + rest.join("").slice(0, 2) : "";
  return (neg ? "-" : "") + withCommas + decPart;
}

function toRawNumber(display: string): string {
  const neg = display.trim().startsWith("-");
  const cleaned = display.replace(/,/g, "").replace(/[^0-9.]/g, "");
  return cleaned ? (neg ? "-" : "") + cleaned : "";
}

/** Ô nhập số tiền: tự hiện dấu phẩy phân cách hàng nghìn ngay khi gõ. Gọi onChange với giá trị số thuần (không dấu phẩy) để lưu. */
export default function MoneyInput({
  value,
  onChange,
  className,
  required,
  disabled,
  placeholder,
}: {
  value: string;
  onChange: (rawValue: string) => void;
  className?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      inputMode="decimal"
      required={required}
      disabled={disabled}
      placeholder={placeholder}
      value={formatDisplay(value)}
      onChange={(e) => onChange(toRawNumber(e.target.value))}
      className={className}
    />
  );
}
