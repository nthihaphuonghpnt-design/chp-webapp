"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

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
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400"
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
      {open && (
        <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
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
        </div>
      )}
    </div>
  );
}
