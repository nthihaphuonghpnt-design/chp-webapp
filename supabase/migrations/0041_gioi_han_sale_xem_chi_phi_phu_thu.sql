-- ============================================================================
-- Fix: Sale dang xem duoc gia von/gia ban va phu thu cua TAT CA don hang, ke
-- ca don hang cua Sale khac phu trach — cung mot loai lo ho nhu hoa_don_xuat
-- da sua o migration 0040 (RLS mo cho ca phong ban thay vi loc theo tung don
-- hang cua rieng minh).
--
-- phat_sinh_chi_phi (psc_select, tu 0020): "not in (Hien truong, Chung tu)"
-- -> Sale/Dieu phoi/Ke toan/Giam doc thay HET. Gio Sale chi thay dong minh tu
-- nhap HOAC don hang minh la sale_phu_trach_id; Dieu phoi/Ke toan/Giam doc
-- khong doi (can thay het de dieu phoi/doi soat). Hien truong/Chung tu khong
-- doi (van chi thay dong minh nhap, theo 0020).
--
-- phu_thu (phu_thu_select, tu 0033): "<> Chung tu" -> moi nguoi khac thay
-- het. Gio Sale chi thay phu thu cua don hang minh phu trach; Chung tu van
-- khong thay gi (giu nguyen theo 0033); cac phong ban con lai khong doi.
--
-- KHONG dong toi chi_phi_giao_nhan / don_thue_ngoai — do la chi phi van hanh
-- dung chung (tra cong Hien truong, quyet dinh thue xe...), khac ban chat
-- voi "doanh thu/loi nhuan cua rieng 1 lo hang do Sale nao phu trach".
-- ============================================================================

drop policy if exists "psc_select" on phat_sinh_chi_phi;
create policy "psc_select" on phat_sinh_chi_phi for select to authenticated
  using (
    current_phong_ban() in ('Điều phối', 'Kế toán', 'Giám đốc')
    or nguoi_nhap_id in (select id from nhan_vien where auth_user_id = auth.uid())
    or (
      current_phong_ban() = 'Sale'
      and don_hang_id in (
        select dh.id
        from don_hang dh
        join nhan_vien nv on nv.id = dh.sale_phu_trach_id
        where nv.auth_user_id = auth.uid()
      )
    )
  );

drop policy if exists "phu_thu_select" on phu_thu;
create policy "phu_thu_select" on phu_thu for select to authenticated
  using (
    current_phong_ban() in ('Hiện trường', 'Điều phối', 'Kế toán', 'Giám đốc')
    or (
      current_phong_ban() = 'Sale'
      and don_hang_id in (
        select dh.id
        from don_hang dh
        join nhan_vien nv on nv.id = dh.sale_phu_trach_id
        where nv.auth_user_id = auth.uid()
      )
    )
  );
