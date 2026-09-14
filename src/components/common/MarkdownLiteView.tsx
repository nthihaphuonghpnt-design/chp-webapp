"use client";

import type { ReactNode } from "react";

// Render markdown-lite (chi ho tro #/##/###, ---, bang | | |, *in nghieng*,
// danh sach so/chu) — KHONG dung thu vien ngoai, chi du de hien noi quy/tai
// lieu noi bo doc duoc dep mat, khong can chinh xac 100% chuan Markdown.

function renderInline(text: string, key: number) {
  const parts = text.split(/(\*[^*]+\*)/g);
  return (
    <span key={key}>
      {parts.map((p, i) =>
        p.startsWith("*") && p.endsWith("*") && p.length > 2 ? (
          <em key={i} className="text-slate-500">
            {p.slice(1, -1)}
          </em>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </span>
  );
}

export default function MarkdownLiteView({ content }: { content: string }) {
  const lines = content.split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "---") {
      blocks.push(<hr key={key++} className="my-6 border-slate-200" />);
      i++;
      continue;
    }
    if (line.startsWith("# ")) {
      blocks.push(
        <h1 key={key++} className="mb-2 text-2xl font-bold text-slate-900" style={{ textWrap: "balance" }}>
          {renderInline(line.slice(2), key)}
        </h1>
      );
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      blocks.push(
        <h2 key={key++} className="mb-2 mt-6 text-lg font-semibold text-slate-900">
          {renderInline(line.slice(3), key)}
        </h2>
      );
      i++;
      continue;
    }
    if (line.startsWith("### ")) {
      blocks.push(
        <h3 key={key++} className="mb-1 mt-4 text-base font-semibold text-slate-800">
          {renderInline(line.slice(4), key)}
        </h3>
      );
      i++;
      continue;
    }
    if (line.trim().startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      const rows = tableLines.filter((l) => !/^\|\s*-+\s*(\|\s*-+\s*)*\|?$/.test(l.trim())).map((l) =>
        l
          .trim()
          .replace(/^\||\|$/g, "")
          .split("|")
          .map((c) => c.trim())
      );
      const [head, ...body] = rows;
      blocks.push(
        <div key={key++} className="my-3 overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                {head.map((c, ci) => (
                  <th key={ci} className="px-3 py-2 font-medium text-slate-600">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((r, ri) => (
                <tr key={ri} className="border-t border-slate-100">
                  {r.map((c, ci) => (
                    <td key={ci} className="px-3 py-2 text-slate-700">
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }
    if (line.trim() === "") {
      i++;
      continue;
    }
    // Gom cac dong lien tiep khong rong, khong phai heading/table/hr thanh 1 doan.
    const paraLines: string[] = [];
    while (i < lines.length && lines[i].trim() !== "" && !lines[i].startsWith("#") && lines[i].trim() !== "---" && !lines[i].trim().startsWith("|")) {
      paraLines.push(lines[i]);
      i++;
    }
    blocks.push(
      <p key={key++} className="mb-3 leading-relaxed text-slate-700">
        {paraLines.map((l, li) => (
          <span key={li}>
            {renderInline(l, li)}
            {li < paraLines.length - 1 && <br />}
          </span>
        ))}
      </p>
    );
  }

  return <div className="prose-slate">{blocks}</div>;
}
