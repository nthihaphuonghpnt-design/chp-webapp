-- ============================================================================
-- Cho phep dinh kem (dinh_kem) gan toi Hop dong hoac Hoa don, dong thoi gioi
-- han xem/them chi cho Sale/Chung tu/Ke toan/Giam doc — khop voi quyen xem
-- 2 module nay, khong lo cho Hien truong/Dieu phoi.
-- ============================================================================

alter table dinh_kem add column if not exists hop_dong_id uuid references hop_dong_khach_hang(id) on delete cascade;
alter table dinh_kem add column if not exists hoa_don_id uuid references hoa_don_xuat(id) on delete cascade;

do $$
begin
  if exists (
    select 1 from information_schema.table_constraints
    where table_name = 'dinh_kem' and constraint_name = 'dinh_kem_lien_ket_toi_check'
  ) then
    alter table dinh_kem drop constraint dinh_kem_lien_ket_toi_check;
  end if;
end $$;

alter table dinh_kem add constraint dinh_kem_lien_ket_toi_check check (lien_ket_toi in (
  'Tiếp nhận', 'Làm thủ tục', 'Thông quan', 'Giao hàng', 'Hoàn tất',
  'Chi phí phát sinh', 'Chi tiết vận chuyển', 'Thuê ngoài', 'Hợp đồng', 'Hóa đơn'
));

-- Xem/them dinh_kem: neu gan toi hop dong/hoa don thi gioi han theo quyen mo-
-- dun do; con lai (gan don hang nhu truoc) van mo cho tat ca nhu cu.
drop policy if exists "dinh_kem_select" on dinh_kem;
create policy "dinh_kem_select" on dinh_kem for select to authenticated
  using (
    (hop_dong_id is null and hoa_don_id is null)
    or current_phong_ban() in ('Sale', 'Chứng từ', 'Kế toán', 'Giám đốc')
  );

drop policy if exists "dinh_kem_insert" on dinh_kem;
create policy "dinh_kem_insert" on dinh_kem for insert to authenticated
  with check (
    (hop_dong_id is null and hoa_don_id is null)
    or current_phong_ban() in ('Chứng từ', 'Kế toán')
  );

-- Storage: file trong thu muc hop-dong/ hoac hoa-don/ chi cho phong ban duoc
-- phep xem module tuong ung; cac file khac (gan don hang) van mo nhu cu.
drop policy if exists "dinh_kem_storage_select" on storage.objects;
create policy "dinh_kem_storage_select" on storage.objects for select to authenticated
  using (
    bucket_id = 'dinh-kem'
    and (
      (name not like 'hop-dong/%' and name not like 'hoa-don/%')
      or current_phong_ban() in ('Sale', 'Chứng từ', 'Kế toán', 'Giám đốc')
    )
  );

drop policy if exists "dinh_kem_storage_insert" on storage.objects;
create policy "dinh_kem_storage_insert" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'dinh-kem'
    and (
      (name not like 'hop-dong/%' and name not like 'hoa-don/%')
      or current_phong_ban() in ('Chứng từ', 'Kế toán')
    )
  );
