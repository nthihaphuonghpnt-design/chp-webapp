-- ============================================================================
-- Vá lỗi migration 0099: trigger dong bo So quy cho credit_giao_dich chi gan
-- "after insert" — THIEU "or delete", khac voi pattern chuan da dung cho
-- hoa_don_xuat/don_thue_ngoai (migration 0034: "after insert or update or
-- delete"). Ham sync_so_quy_credit_giao_dich() DA CO san nhanh xu ly
-- TG_OP = 'DELETE' (viet san tu dau) nhung khong bao gio duoc goi vi trigger
-- khong dang ky su kien DELETE — phat hien khi doi chieu gia goi cleanup
-- production: "delete from credit_giao_dich where id in (...)" khong xoa theo
-- dong So quy tuong ung, de lai orphan.
-- ============================================================================
drop trigger if exists after_cgd_sync_so_quy on credit_giao_dich;
create trigger after_cgd_sync_so_quy
  after insert or delete on credit_giao_dich
  for each row execute function sync_so_quy_credit_giao_dich();
-- Khong can "or update": credit_giao_dich la so cai bat bien, khong co
-- insert/update/delete nao duoc GRANT cho client (chi RPC insert), va ban
-- than cac RPC cung khong UPDATE dong da ghi — chi INSERT dong moi.
