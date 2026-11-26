"use client";

import { useState } from "react";

export interface ConfirmDialogField {
  key: string;
  label: string;
  type?: "text" | "textarea" | "select";
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
}

/**
 * Thay the window.prompt()/window.confirm() — trinh duyet nhung (vd preview
 * trong app) KHONG ho tro 2 ham nay, bam nut se khong co phan hoi gi va console
 * bao loi "prompt() is not supported" (P1 muc 5e, 2026-11-26). Dung CHUNG cho
 * moi cho can hoi ly do / xac nhan / nhap 1-2 truong truoc khi thuc hien 1
 * hanh dong (huy hoa don, sua phuong thuc thu, ghi nhan thu tien...).
 */
export default function ConfirmDialog({
  title,
  message,
  fields,
  confirmLabel = "Xác nhận",
  cancelLabel = "Hủy",
  danger,
  onCancel,
  onConfirm,
}: {
  title: string;
  message?: string;
  fields?: ConfirmDialogField[];
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: (values: Record<string, string>) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries((fields ?? []).map((f) => [f.key, f.defaultValue ?? (f.type === "select" ? f.options?.[0]?.value ?? "" : "")])),
  );

  function set(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  const thieuTruongBatBuoc = (fields ?? []).some((f) => f.required && !values[f.key]?.trim());

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          onCancel();
        }
      }}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (thieuTruongBatBuoc) return;
          onConfirm(values);
        }}
        className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl"
      >
        <h2 className="mb-2 text-lg font-semibold text-slate-900">{title}</h2>
        {message && <p className="mb-3 whitespace-pre-line text-sm text-slate-600">{message}</p>}
        {(fields ?? []).map((f) => (
          <div key={f.key} className="mb-3">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              {f.label} {f.required && <span className="text-red-600">*</span>}
            </label>
            {f.type === "select" ? (
              <select
                value={values[f.key]}
                onChange={(e) => set(f.key, e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                autoFocus
              >
                {(f.options ?? []).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : f.type === "textarea" ? (
              <textarea
                value={values[f.key]}
                onChange={(e) => set(f.key, e.target.value)}
                placeholder={f.placeholder}
                rows={3}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                autoFocus
              />
            ) : (
              <input
                value={values[f.key]}
                onChange={(e) => set(f.key, e.target.value)}
                placeholder={f.placeholder}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                autoFocus
              />
            )}
          </div>
        ))}
        <div className="mt-4 flex gap-3">
          <button type="button" onClick={onCancel} className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700">
            {cancelLabel}
          </button>
          <button
            type="submit"
            disabled={thieuTruongBatBuoc}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40 ${danger ? "bg-red-600" : "bg-blue-600"}`}
          >
            {confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
