-- ============================================================================
-- Theo yeu cau nguoi dung: chua co Noi quy lao dong bang van ban, muon
-- soan san theo dung quy dinh moi nhat (Bo luat Lao dong 2019 + Nghi dinh
-- 145/2020/ND-CP) kem Dinh muc chi tieu noi bo, dinh o trang chu cho moi
-- nguoi xem. Bang nay chi giu 1 ban ghi (singleton) — noi dung dang text,
-- sua truc tiep qua textarea don gian (khong dung trinh soan thao rich-text
-- rieng, giu dung tinh than "khong hop thoai, nhap truc tiep" da thong nhat
-- trong phien lam viec nay).
-- ============================================================================

create table if not exists noi_quy_cong_ty (
  id uuid primary key default gen_random_uuid(),
  noi_dung text not null,
  ngay_ap_dung date,
  nguoi_cap_nhat_id uuid references nhan_vien(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at before update on noi_quy_cong_ty
  for each row execute function set_updated_at();

alter table noi_quy_cong_ty enable row level security;

-- Moi nhan vien da dang nhap deu xem duoc (day la noi quy ap dung cho tat
-- ca), chi Ke toan/Giam doc duoc sua.
create policy "nqct_select" on noi_quy_cong_ty for select to authenticated using (true);
create policy "nqct_insert" on noi_quy_cong_ty for insert to authenticated
  with check (current_phong_ban() in ('Kế toán', 'Giám đốc'));
create policy "nqct_update" on noi_quy_cong_ty for update to authenticated
  using (current_phong_ban() in ('Kế toán', 'Giám đốc'));

create or replace function ghi_nhat_ky_noi_quy_cong_ty()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform ghi_nhat_ky('noi_quy_cong_ty', new.id, 'sua_noi_quy_cong_ty', null, to_jsonb(old), to_jsonb(new));
  return new;
end;
$$;

drop trigger if exists after_nqct_ghi_nhat_ky on noi_quy_cong_ty;
create trigger after_nqct_ghi_nhat_ky
  after update on noi_quy_cong_ty
  for each row execute function ghi_nhat_ky_noi_quy_cong_ty();
