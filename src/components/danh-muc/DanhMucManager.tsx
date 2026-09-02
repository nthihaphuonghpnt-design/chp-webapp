"use client";

import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { xuatExcelKeO, type ExcelColumn } from "@/lib/excel";
import { createClient } from "@/lib/supabase/client";
import { lookupTaxCode } from "@/lib/taxLookup";
import MoneyInput from "@/components/common/MoneyInput";

export type FieldType = "text" | "textarea" | "select" | "tel" | "email" | "number";

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
  /** Ghi chú nhỏ hiển thị dưới ô nhập trong form. */
  hint?: string;
}

export interface TaxLookupConfig {
  /** field key holding the tax code (mã số thuế) */
  taxField: string;
  /** field key to auto-fill with the company's registered name */
  nameField: string;
  /** field key to auto-fill with the company's registered address */
  addressField: string;
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
  /** Extra fields to also match when searching (e.g. mã, mã số thuế) besides searchField. */
  extraSearchFields?: string[];
  /** Tra cứu tự động theo mã số thuế (Khách hàng, Nhà cung cấp, Đối tác thuê ngoài). */
  taxLookup?: TaxLookupConfig;
  /**
   * Danh sach cot duoc phep doc lai sau khi luu (vd "id, ho_ten, ..."). Bo
   * trong = doc het ("*"). Dung khi bang co cot bi gioi han quyen SELECT rieng
   * (vi du nhan_vien.luong_co_dinh/muc_dong_bhxh — xem migration 0039) de
   * tranh loi quyen lam hong ca thao tac luu; gia tri vua nhap van hien dung
   * tren man hinh vi duoc gop truc tiep tu form, khong can doc lai tu DB.
   */
  selectColumns?: string;
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
  extraSearchFields,
  taxLookup,
  selectColumns,
}: Props) {
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Row | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<{ success: number; errors: string[] } | null>(
    null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supabase = useMemo(() => createClient(), []);
  const listFields = fields.filter((f) => f.showInList !== false);
  const primaryField = searchField ?? fields[0]?.key;
  const searchFieldsAll = [primaryField, ...(extraSearchFields ?? [])];

  const filteredRows = rows.filter((r) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return searchFieldsAll.some((key) => {
      const field = fields.find((f) => f.key === key);
      const value = field?.type === "select" ? optionLabel(field, r[key]) : String(r[key] ?? "");
      return value.toLowerCase().includes(q);
    });
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

  function displayValue(field: FieldConfig, value: unknown) {
    if (field.type === "select") return optionLabel(field, value);
    if (field.type === "number" && value !== null && value !== undefined && value !== "") {
      return Number(value).toLocaleString("en-US");
    }
    return String(value ?? "—");
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
        .select(selectColumns)
        .single();
      if (err) {
        setError(err.message);
        setSaving(false);
        return;
      }
      // Gop payload vua luu de vao du du lieu tren man hinh du selectColumns co
      // loai tru vai cot (vi du luong_co_dinh) khoi ket qua doc lai.
      setRows((prev) => prev.map((r) => (r.id === editing.id ? { ...(data as unknown as Row), ...payload } : r)));
    } else {
      const { data, error: err } = await supabase
        .from(table)
        .insert({ ...payload, [statusField]: true })
        .select(selectColumns)
        .single();
      if (err) {
        setError(err.message);
        setSaving(false);
        return;
      }
      setRows((prev) => [{ ...(data as unknown as Row), ...payload }, ...prev]);
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
      .select(selectColumns)
      .single();
    if (!err && data) {
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...(data as unknown as Row), [statusField]: newValue } : r)));
    }
  }

  async function handleDelete(row: Row) {
    if (!canEdit) return;
    const primaryFieldConfig = fields.find((f) => f.key === primaryField);
    const label =
      primaryFieldConfig?.type === "select"
        ? optionLabel(primaryFieldConfig, row[primaryField])
        : String(row[primaryField] ?? "mục này");
    if (!window.confirm(`Xóa hẳn "${label}"? Thao tác này không thể hoàn tác.`)) return;

    const { error: err } = await supabase.from(table).delete().eq("id", row.id);
    if (err) {
      if (err.code === "23503") {
        window.alert(
          `Không thể xóa "${label}" vì đang được dùng ở nơi khác trong hệ thống. Hãy chuyển sang "${statusLabels.inactive}" thay vì xóa.`
        );
      } else {
        window.alert(`Không thể xóa: ${err.message}`);
      }
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== row.id));
  }

  function handleDownloadTemplate() {
    const headers = fields.map((f) => f.label);
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Mẫu nhập");

    const selectFields = fields.filter((f) => f.type === "select" && f.options?.length);
    if (selectFields.length > 0) {
      const guideRows: (string | undefined)[][] = [["Cột", "Giá trị hợp lệ (gõ đúng như liệt kê)"]];
      selectFields.forEach((f) => guideRows.push([f.label, f.options?.map((o) => o.label).join(", ")]));
      const wsGuide = XLSX.utils.aoa_to_sheet(guideRows);
      XLSX.utils.book_append_sheet(wb, wsGuide, "Hướng dẫn");
    }

    XLSX.writeFile(wb, `mau-nhap-${table}.xlsx`);
  }

  async function handleExportExcel() {
    const v = (x: unknown): string | number => (typeof x === "number" ? x : String(x ?? ""));
    const columns: ExcelColumn[] = [...fields.map((f) => ({ header: f.label, key: f.key, width: 16 })), { header: "Trạng thái", key: "trangThai", width: 14 }];
    const exportRows = filteredRows.map((row) => [
      ...fields.map((f) => v(f.type === "select" ? optionLabel(f, row[f.key]) : (row[f.key] ?? ""))),
      row[statusField] ? statusLabels.active : statusLabels.inactive,
    ]);
    await xuatExcelKeO(`du-lieu-${table}-${new Date().toISOString().slice(0, 10)}.xlsx`, {
      sheetName: "Dữ liệu",
      headerLines: [title.toUpperCase()],
      columns,
      rows: exportRows,
    });
  }

  async function handleImportFile(file: File) {
    setImporting(true);
    setImportSummary(null);

    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

    const normalizedFields = fields.map((f) => ({ field: f, norm: f.label.trim().toLowerCase() }));
    const records: Record<string, unknown>[] = [];
    const rowErrors: string[] = [];

    raw.forEach((rawRow, idx) => {
      const rowNum = idx + 2;
      const normalizedRow: Record<string, unknown> = {};
      for (const key of Object.keys(rawRow)) {
        normalizedRow[key.trim().toLowerCase()] = rawRow[key];
      }

      const record: Record<string, unknown> = { [statusField]: true };
      let hasError = false;

      for (const { field, norm } of normalizedFields) {
        let value = String(normalizedRow[norm] ?? "").trim();

        if (field.type === "select" && value) {
          const opt = field.options?.find((o) => o.label.trim().toLowerCase() === value.toLowerCase());
          if (!opt) {
            rowErrors.push(`Dòng ${rowNum}: giá trị "${value}" ở cột "${field.label}" không hợp lệ.`);
            hasError = true;
            continue;
          }
          value = opt.value;
        }

        if (field.required && !value) {
          rowErrors.push(`Dòng ${rowNum}: thiếu "${field.label}".`);
          hasError = true;
          continue;
        }

        record[field.key] = value === "" ? null : value;
      }

      if (!hasError) records.push(record);
    });

    if (records.length === 0) {
      setImportSummary({ success: 0, errors: rowErrors.length ? rowErrors : ["File không có dòng dữ liệu hợp lệ."] });
      setImporting(false);
      return;
    }

    const { data, error: err } = await supabase.from(table).insert(records).select(selectColumns);
    setImporting(false);

    if (err) {
      setImportSummary({ success: 0, errors: [...rowErrors, `Lỗi khi lưu vào hệ thống: ${err.message}`] });
      return;
    }

    const savedRows = ((data as unknown as Row[]) ?? []).map((d, i) => ({ ...d, ...records[i] }));
    setRows((prev) => [...savedRows, ...prev]);
    setImportSummary({ success: data?.length ?? 0, errors: rowErrors });
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleExportExcel}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
          >
            Xuất Excel
          </button>
          {canEdit && (
            <>
              <button
                onClick={handleDownloadTemplate}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
              >
                Tải mẫu Excel
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-60"
              >
                {importing ? "Đang nhập..." : "Nhập từ Excel"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImportFile(file);
                  e.target.value = "";
                }}
              />
              <button
                onClick={openNew}
                className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm active:bg-blue-700"
              >
                + Thêm mới
              </button>
            </>
          )}
        </div>
      </div>

      {importSummary && (
        <div
          className={`mb-4 rounded-lg border p-3 text-sm ${
            importSummary.errors.length > 0
              ? "border-amber-300 bg-amber-50 text-amber-800"
              : "border-green-300 bg-green-50 text-green-800"
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium">
              Đã nhập thành công {importSummary.success} dòng
              {importSummary.errors.length > 0 ? `, ${importSummary.errors.length} dòng lỗi:` : "."}
            </p>
            <button onClick={() => setImportSummary(null)} className="text-xs underline">
              Đóng
            </button>
          </div>
          {importSummary.errors.length > 0 && (
            <ul className="mt-2 list-disc space-y-0.5 pl-5">
              {importSummary.errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}

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
                  {displayValue(f, row[f.key])}
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
                <div className="flex gap-3">
                  <button
                    onClick={() => openEdit(row)}
                    className="text-sm font-medium text-blue-600"
                  >
                    Sửa
                  </button>
                  <button
                    onClick={() => handleDelete(row)}
                    className="text-sm font-medium text-red-600"
                  >
                    Xóa
                  </button>
                </div>
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
                    {displayValue(f, row[f.key])}
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
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => openEdit(row)}
                        className="text-sm font-medium text-blue-600 hover:underline"
                      >
                        Sửa
                      </button>
                      <button
                        onClick={() => handleDelete(row)}
                        className="text-sm font-medium text-red-600 hover:underline"
                      >
                        Xóa
                      </button>
                    </div>
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
          taxLookup={taxLookup}
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

export function FormModal({
  fields,
  initial,
  saving,
  error,
  taxLookup,
  onCancel,
  onSubmit,
}: {
  fields: FieldConfig[];
  initial: Row | null;
  saving: boolean;
  error: string | null;
  taxLookup?: TaxLookupConfig;
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
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupMsg, setLookupMsg] = useState<string | null>(null);

  function set(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleTaxBlur() {
    if (!taxLookup) return;
    const code = values[taxLookup.taxField]?.trim();
    if (!code || !/^\d{10}(\d{3})?$/.test(code)) return;

    setLookingUp(true);
    setLookupMsg(null);
    const result = await lookupTaxCode(code);
    setLookingUp(false);

    if (!result || !result.name) {
      setLookupMsg("Không tìm thấy thông tin cho mã số thuế này — vui lòng nhập tay.");
      return;
    }
    setValues((prev) => ({
      ...prev,
      [taxLookup.nameField]: result.name || prev[taxLookup.nameField],
      [taxLookup.addressField]: result.address || prev[taxLookup.addressField],
    }));
    setLookupMsg("Đã tự động điền tên và địa chỉ — anh kiểm tra lại trước khi lưu.");
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
              ) : f.type === "number" ? (
                <MoneyInput
                  required={f.required}
                  value={values[f.key]}
                  onChange={(v) => set(f.key, v)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                />
              ) : (
                <input
                  type={f.type}
                  required={f.required}
                  value={values[f.key]}
                  onChange={(e) => set(f.key, e.target.value)}
                  onBlur={taxLookup?.taxField === f.key ? handleTaxBlur : undefined}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                />
              )}
              {f.hint && !(taxLookup?.taxField === f.key && (lookingUp || lookupMsg)) && (
                <p className="mt-1 text-xs text-slate-400">{f.hint}</p>
              )}
              {taxLookup?.taxField === f.key && lookingUp && (
                <p className="mt-1 text-xs text-slate-400">Đang tra cứu...</p>
              )}
              {taxLookup?.taxField === f.key && lookupMsg && !lookingUp && (
                <p className="mt-1 text-xs text-slate-500">{lookupMsg}</p>
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
