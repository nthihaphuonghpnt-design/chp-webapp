-- ============================================================================
-- 2 yeu cau tu Bao Dung (2026-09-19):
-- 1) "Tai lieu dinh kem khong the xoa duoc" — dung: dinh_kem tu 0003 chi co
--    policy select/insert, CHUA BAO GIO co policy delete (ca cho bang
--    dinh_kem lan cho storage.objects bucket dinh-kem) — voi RLS bat, thieu
--    policy nghia la KHONG AI xoa duoc bat ky dong/file nao, bat ke UI co nut
--    Xoa hay khong. UI (DinhKemSection, FileAttachSection) cung chua tung co
--    nut xoa — them ca 2 lop trong PR nay.
-- 2) "Mo quyen Sale duoc dinh chung tu" — nhanh dinh kem cho CHINH don hang
--    (khong gan hop_dong/hoa_don/hop_dong_nhan_vien — bao gom ca dinh kem
--    cua to_khai_hai_quan) tu 0071 gioi han con ('Hien truong', 'Dieu phoi',
--    'Chung tu', 'Ke toan'), chua co Sale. Them Sale vao nhanh nay (insert
--    VA delete moi) — khong dong toi 2 nhanh con lai (hop dong nhan vien:
--    Ke toan; hop dong/hoa don: Chung tu+Ke toan), ngoai pham vi yeu cau.
-- 3) "Sale nhap to khai day du khi Chung tu khong lam lo do" — to_khai_insert
--    (0008) da cho Sale/Giam doc tu truoc, nhung to_khai_update/to_khai_delete
--    (0005) van con CHI Chung tu — Sale tao duoc to khai roi lai khong sua/
--    xoa duoc. Mo rong ca 2 sang Sale, khop voi lua chon "day du nhu Chung
--    tu" cua Bao Dung.
-- ============================================================================

drop policy if exists "dinh_kem_insert" on dinh_kem;
create policy "dinh_kem_insert" on dinh_kem for insert to authenticated
  with check (
    (
      hop_dong_id is null and hoa_don_id is null and hop_dong_nhan_vien_id is null
      and current_phong_ban() in ('Hiện trường', 'Điều phối', 'Chứng từ', 'Kế toán', 'Sale')
    )
    or (hop_dong_nhan_vien_id is not null and current_phong_ban() = 'Kế toán')
    or ((hop_dong_id is not null or hoa_don_id is not null) and current_phong_ban() in ('Chứng từ', 'Kế toán'))
  );

create policy "dinh_kem_delete" on dinh_kem for delete to authenticated
  using (
    (
      hop_dong_id is null and hoa_don_id is null and hop_dong_nhan_vien_id is null
      and current_phong_ban() in ('Hiện trường', 'Điều phối', 'Chứng từ', 'Kế toán', 'Sale')
    )
    or (hop_dong_nhan_vien_id is not null and current_phong_ban() = 'Kế toán')
    or ((hop_dong_id is not null or hoa_don_id is not null) and current_phong_ban() in ('Chứng từ', 'Kế toán'))
  );

drop policy if exists "dinh_kem_storage_insert" on storage.objects;
create policy "dinh_kem_storage_insert" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'dinh-kem'
    and (
      (
        name not like 'hop-dong/%' and name not like 'hoa-don/%' and name not like 'hop-dong-nhan-vien/%'
        and current_phong_ban() in ('Hiện trường', 'Điều phối', 'Chứng từ', 'Kế toán', 'Sale')
      )
      or (name like 'hop-dong-nhan-vien/%' and current_phong_ban() = 'Kế toán')
      or ((name like 'hop-dong/%' or name like 'hoa-don/%') and current_phong_ban() in ('Chứng từ', 'Kế toán'))
    )
  );

create policy "dinh_kem_storage_delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'dinh-kem'
    and (
      (
        name not like 'hop-dong/%' and name not like 'hoa-don/%' and name not like 'hop-dong-nhan-vien/%'
        and current_phong_ban() in ('Hiện trường', 'Điều phối', 'Chứng từ', 'Kế toán', 'Sale')
      )
      or (name like 'hop-dong-nhan-vien/%' and current_phong_ban() = 'Kế toán')
      or ((name like 'hop-dong/%' or name like 'hoa-don/%') and current_phong_ban() in ('Chứng từ', 'Kế toán'))
    )
  );

drop policy if exists "to_khai_update" on to_khai_hai_quan;
create policy "to_khai_update" on to_khai_hai_quan for update to authenticated
  using (current_phong_ban() in ('Chứng từ', 'Sale'));

drop policy if exists "to_khai_delete" on to_khai_hai_quan;
create policy "to_khai_delete" on to_khai_hai_quan for delete to authenticated
  using (current_phong_ban() in ('Chứng từ', 'Sale'));
