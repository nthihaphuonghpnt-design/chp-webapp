// API Supabase tra toi da 1000 dong moi truy van va cat bot AM THAM. Dung ham
// nay cho cac truy van lay toan bo 1 bang lon. taoTruyVan phai co .order() on
// dinh (vd theo id) de cac trang khong trung/sot.
const MOI_TRANG = 1000;

export async function taiHetDong<T>(
  taoTruyVan: () => { range: (tu: number, den: number) => PromiseLike<{ data: T[] | null; error: unknown }> },
): Promise<{ data: T[] | null; error: unknown }> {
  const tatCa: T[] = [];
  for (let tu = 0; ; tu += MOI_TRANG) {
    const { data, error } = await taoTruyVan().range(tu, tu + MOI_TRANG - 1);
    if (error) return { data: null, error };
    tatCa.push(...(data ?? []));
    if ((data ?? []).length < MOI_TRANG) return { data: tatCa, error: null };
  }
}
