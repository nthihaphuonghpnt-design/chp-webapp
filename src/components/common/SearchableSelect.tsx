"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface SearchableOption {
  value: string;
  label: string;
  code?: string | null;
  sublabel?: string | null;
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "-- Chọn --",
  className = "",
  disabled = false,
}: {
  options: SearchableOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  // Danh sach goi y gio render qua portal (xem duoi), khong con la con DOM
  // cua rootRef nua — can them ref rieng de "click ben trong dropdown"
  // khong bi tinh nham la "click ra ngoai" (neu khong, bam chon 1 goi y se
  // tu dong dong dropdown truoc khi kip bat su kien click chon).
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (rootRef.current?.contains(target) || dropdownRef.current?.contains(target)) return;
      setOpen(false);
      setQuery("");
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // Danh sach goi y render qua portal ra document.body (xem duoi) nen thoat
  // duoc canh cat cua cac the cha co overflow-x-auto (vi du bang chi phi cuon
  // ngang) — truoc day danh sach bi khuat/mat vi ke thua vung cat cua the
  // cha. Vi portal khong con nam trong "relative" cua rootRef nua, phai tu
  // tinh toa do fixed tu getBoundingClientRect() cua chinh no.
  useEffect(() => {
    if (!open) return;
    function capNhatViTri() {
      const rect = rootRef.current?.getBoundingClientRect();
      if (rect) setDropdownPos({ top: rect.bottom, left: rect.left, width: rect.width });
    }
    capNhatViTri();
    // Cuon (ca trang lan container cuon ngang, vd bang chi phi) hoac resize
    // co the lam input doi vi tri — TINH LAI vi tri (khong dong dropdown):
    // dong luc scroll tung thu vi gay dua voi su kien click chon (mousedown
    // -> scroll -> click, "scroll" fire truoc lam dropdown bi go khoi DOM
    // dung luc click dang xu ly, mat luon lua chon).
    window.addEventListener("scroll", capNhatViTri, true);
    window.addEventListener("resize", capNhatViTri);
    return () => {
      window.removeEventListener("scroll", capNhatViTri, true);
      window.removeEventListener("resize", capNhatViTri);
    };
  }, [open]);

  const filtered = useMemo(() => {
    if (!query) return options;
    const q = query.toLowerCase();
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.code ?? "").toLowerCase().includes(q) ||
        (o.sublabel ?? "").toLowerCase().includes(q)
    );
  }, [options, query]);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <input
        value={open ? query : selected ? `${selected.code ? `${selected.code} — ` : ""}${selected.label}` : ""}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => {
          if (disabled) return;
          setOpen(true);
          setQuery("");
        }}
        disabled={disabled}
        placeholder={placeholder}
        title={selected ? `${selected.code ? `${selected.code} — ` : ""}${selected.label}` : undefined}
        className="w-full truncate rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400"
      />
      {selected && !open && !disabled && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          aria-label="Xóa lựa chọn"
        >
          ✕
        </button>
      )}
      {open &&
        dropdownPos &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{ position: "fixed", top: dropdownPos.top, left: dropdownPos.left, width: Math.max(dropdownPos.width, 220) }}
            className="z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg"
          >
            {filtered.length === 0 && <p className="px-3 py-2 text-sm text-slate-400">Không tìm thấy.</p>}
            {filtered.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                  setQuery("");
                }}
                className={`block w-full px-3 py-2 text-left text-sm hover:bg-blue-50 ${
                  o.value === value ? "bg-blue-50 font-medium text-blue-700" : "text-slate-700"
                }`}
              >
                {o.code && <span className="text-slate-400">{o.code} — </span>}
                {o.label}
                {o.sublabel && <span className="block text-xs text-slate-400">{o.sublabel}</span>}
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
}
