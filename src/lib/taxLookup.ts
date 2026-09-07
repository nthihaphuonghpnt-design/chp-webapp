/** Tra cuu ten/dia chi cong ty theo ma so thue qua VietQR (dung chung cho DanhMucManager va cac form them nhanh). */
export async function lookupTaxCode(taxCode: string): Promise<{ name: string; address: string } | null> {
  try {
    const res = await fetch(`https://api.vietqr.io/v2/business/${encodeURIComponent(taxCode)}`);
    if (!res.ok) return null;
    const json = await res.json();
    if (json?.code === "00" && json?.data) {
      return { name: json.data.name ?? "", address: json.data.address ?? "" };
    }
    return null;
  } catch {
    return null;
  }
}
