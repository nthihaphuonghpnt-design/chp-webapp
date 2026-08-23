"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type FieldType = "text" | "textarea" | "select" | "tel" | "email";

export interface SelectOption {
  value: string;
  label: string;
}

export interface FieldConfig {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: SelectOption[];
  /** Show as a column in the list view. Defaults to true. */
  showInList?: boolean;
}

export type Row = Record<string, unknown> & { id: string };

interface Props {
  table: string;
  title: string;
  fields: FieldConfig[];
  initialRows: Row[];
  canEdit: boolean;
  /** Field used to mark active/inactive. Defaults to "dang_hoat_dong". */
  statusField?: string;
  statusLabels?: { active: string; inactive: string };
  /** The field to search/filter by (defaults to the first field). */
  searchField?: string;
}

export default function DanhMucManager({
  table,
  title,
  fields,
  initialRows,
  canEdit,
  statusField = "dang_hoat_dong",
  statusLabels = { active: "Đang hoạt động", inactive: "Ngừng hoạt động" },
  searchField,
}: Props) {
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Row | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);
  const listFields = fields.filter((f) => f.showInList !== false);
  const primaryField = searchField ?? fields[0]?.key;

  const filteredRows = rows.filter((r) => {
    if (!query) return true;
    const value = String(r[primaryField] ?? "").toLowerCase();
    return value.includes(query.toLowerCase());
  });

  function openNew() {
    setEditing(null);
    setShowForm(true);
    setError(null);
  }

  function openEdit(row: Row) {
    setEditing(row);
    setShowForm(true);
    setError(null);
  }

  function optionLabel(field: FieldConfig, value: unknown) {
    return field.options?.find((o) => o.value === value)?.label ?? String(value ?? "");
  }

  async function handleSubmit(formValues: Record<string, string>) {
    setSaving(true);
    setError(null);

    const payload: Record<string, unknown> = {};
    for (const f of fields) {
      payload[f.key] = formValues[f.key] === "" ? null : formValues[f.key];
    }

    if (editing) {
      const { data, error: err } = await supabase
        .from(table)
        .update(payload)
        .eq("id", editing.id)
        .select()
        .single();
      if (err) {
        setError(err.message);
        setSaving(false);
        return;
      }
      setRows((prev) => prev.map((r) => (r.id === editing.id ? (data as Row) : r)));
    } else {
      const { data, error: err } = await supabase
        .from(table)
        .insert({ ...payload, [statusField]: true })
        .select()
        .single();
      if (err) {
        setError(err.message);
        setSaving(false);
        return;
      }
      setRows((prev) => [data as Row, ...prev]);
    }

    setSaving(false);
    setShowForm(false);
    setEditing(null);
  }

  async function toggleStatus(row: Row) {
    if (!canEdit) return;
    const newValue = !row[statusField];
    const { data, error: err } = await supabase
      .from(table)
      .update({ [statusField]: newValue })
      .eq("id", row.id)
      .select()
      .single();
    if (!err && data) {
      setRows((prev) => prev.map((r) => (r.id === row.id ? (data as Row) : r)));
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        {canEdit && (
          <button
            onClick={openNew}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm active:bg-blue-700"
          >
            + Thêm mới
          </button>
        )}
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Tìm kiếm..."
        className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
      />

      {/* Mobile: card list */}
      <div className="flex flex-col gap-3 sm:hidden">
        {filteredRows.map((row) => (
          <div
            key={row.id}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            {listFields.map((f) => (
              <div key={f.key} className="mb-1 flex justify-between gap-2 text-sm">
                <span className="text-slate-500">{f.label}</span>
                <span className="text-right font-medium text-slate-900">
                  {f.type === "select" ? optionLabel(f, row[f.key]) : String(row[f.key] ?? "—")}
                </span>
              </div>
            ))}
            <div className="mt-3 flex items-center justify-between">
              <button
                disabled={!canEdit}
                onClick={() => toggleStatus(row)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  row[statusField]
                    ? "bg-green-100 text-green-700"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                {row[statusField] ? statusLabels.active : statusLabels.inactive}
              </button>
              {canEdit && (
                <button
                  onClick={() => openEdit(row)}
                  className="text-sm font-medium text-blue-600"
                >
                  Sửa
                </button>
              )}
            </div>
          </div>
        ))}
        {filteredRows.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-400">Chưa có dữ liệu.</p>
        )}
      </div>

      {/* Desktop: table */}
      <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white sm:block">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              {listFields.map((f) => (
                <th key={f.key} className="px-4 py-3 font-medium">
                  {f.label}
                </th>
              ))}
              <th className="px-4 py-3 font-medium">Trạng thái</th>
              {canEdit && <th className="px-4 py-3"></th>}
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => (
              <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50">
                {listFields.map((f) => (
                  <td key={f.key} className="px-4 py-3 text-slate-800">
                    {f.type === "select" ? optionLabel(f, row[f.key]) : String(row[f.key] ?? "—")}
                  </td>
                ))}
                <td className="px-4 py-3">
                  <button
                    disabled={!canEdit}
                    onClick={() => toggleStatus(row)}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      row[statusField]
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {row[statusField] ? statusLabels.active : statusLabels.inactive}
                  </button>
                </td>
                {canEdit && (
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openEdit(row)}
                      className="text-sm font-medium text-blue-600 hover:underline"
                    >
                      Sửa
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {filteredRows.length === 0 && (
              <tr>
                <td colSpan={listFields.length + 2} className="px-4 py-8 text-center text-slate-400">
                  Chưa có dữ liệu.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <FormModal
          fields={fields}
          initial={editing}
          saving={saving}
          error={error}
          onCancel={() => {
            setShowForm(false);
            setEditing(null);
            setError(null);
          }}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}

function FormModal({
  fields,
  initial,
  saving,
  error,
  onCancel,
  onSubmit,
}: {
  fields: FieldConfig[];
  initial: Row | null;
  saving: boolean;
  error: string | null;
  onCancel: () => void;
  onSubmit: (values: Record<string, string>) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const v: Record<string, string> = {};
    for (const f of fields) {
      v[f.key] = initial ? String(initial[f.key] ?? "") : "";
    }
    return v;
  });

  function set(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(values);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <form
        onSubmit={handleSubmit}
        className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-lg sm:rounded-2xl"
      >
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          {initial ? "Sửa thông tin" : "Thêm mới"}
        </h2>

        <div className="flex flex-col gap-4">
          {fields.map((f) => (
            <div key={f.key}>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {f.label}
                {f.required && <span className="text-red-500"> *</span>}
              </label>
              {f.type === "textarea" ? (
                <textarea
                  required={f.required}
                  value={values[f.key]}
                  onChange={(e) => set(f.key, e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                />
              ) : f.type === "select" ? (
                <select
                  required={f.required}
                  value={values[f.key]}
                  onChange={(e) => set(f.key, e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="">-- Chọn --</option>
                  {f.options?.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={f.type}
                  required={f.required}
                  value={values[f.key]}
                  onChange={(e) => set(f.key, e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                />
              )}
            </div>
          ))}
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
          >
            {saving ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      </form>
    </div>
  );
}
