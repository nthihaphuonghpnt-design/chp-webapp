-- ============================================================================
-- GAP-04 (audit): dinh_kem_insert va dinh_kem_storage_insert (0042) co 3 nhanh
-- theo doi tuong lien ket — hop_dong_id, hoa_don_id, hop_dong_nhan_vien_id —
-- va CA 3 nhanh nay deu co kiem tra current_phong_ban(). Rieng nhanh con lai
-- (khong gan hop_dong/hoa_don/hop_dong_nhan_vien nao — tuc la dinh kem cho
-- CHINH don hang, bao gom ca dinh kem cua to_khai_hai_quan vi ToKhaiSection
-- luon gui kem don_hang_id) lai la "true" — bat ky ai dang nhap deu upload/
-- xem duoc anh/chung tu cho BAT KY don hang nao, khong phan biet phong ban.
-- Component DinhKemSection.tsx (dung truc tiep o dau trang chi tiet don hang)
-- cung khong co prop canUpload nao ca — khong co lop chan nao, ca UI lan DB.
--
-- Fix: nhanh don hang gio doi hoi current_phong_ban() la 1 trong cac phong
-- ban thuc su thao tac hien truong/chung tu/chi phi cua don hang — dung
-- CHINH danh sach da dung cho canEditVanChuyen tren cung trang chi tiet don
-- hang (Hien truong, Dieu phoi, Chung tu, Ke toan), de nhat quan voi phan
-- quyen sua cac section khac tren cung 1 trang. Khong dong toi dieu kien
-- SELECT (xem) — pham vi GAP-04 la "khong co chan khi UPLOAD", xem anh van
-- de nghi mo cho nhieu phong ban hon (vd Sale tra loi khach) nen khong that
-- chat them o day.
-- ============================================================================

drop policy if exists "dinh_kem_insert" on dinh_kem;
create policy "dinh_kem_insert" on dinh_kem for insert to authenticated
  with check (
    (
      hop_dong_id is null and hoa_don_id is null and hop_dong_nhan_vien_id is null
      and current_phong_ban() in ('Hiện trường', 'Điều phối', 'Chứng từ', 'Kế toán')
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
        and current_phong_ban() in ('Hiện trường', 'Điều phối', 'Chứng từ', 'Kế toán')
      )
      or (name like 'hop-dong-nhan-vien/%' and current_phong_ban() = 'Kế toán')
      or ((name like 'hop-dong/%' or name like 'hoa-don/%') and current_phong_ban() in ('Chứng từ', 'Kế toán'))
    )
  );
