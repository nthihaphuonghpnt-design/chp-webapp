-- ============================================================================
-- Bo sung yeu cau V4 Phan I.1 / VI (2026-11-27, "nang uu tien cao"): So quy
-- Tien mat am rat sau (-1,231,178,916 dau ky) vi 46 giao dich "rut tien ngan
-- hang ve quy tien mat" / "nop tien mat vao tai khoan" CO THAT tren sao ke
-- VCB tai khoan cong ty (09/2025 - 11/2026) CHUA TUNG duoc ghi qua tinh nang
-- "Chuyen quy noi bo" (co san tu migration 0086, dieu_chuyen_quy) — dieu_chuyen_quy
-- dang hoan toan rong (0 dong) truoc migration nay. Vi vay So quy Tien mat chi
-- co 227 dong Chi (tam ung) ma gan nhu khong co dong Thu nao doi ung.
--
-- Da doi chieu CHINH XAC tung dong voi 6 file sao ke VCB (J:\My Drive\SKNH,
-- 2025 + 2026, cot "Doi chieu CHP webapp" da duoc Ke toan ghi "Chuyen quy noi
-- bo (TM <-> NH cong ty) - khong phai chi phi lo"): 46 dong, tong rut (Ngan
-- hang -> Tien mat) = 375,144,000, tong nop (Tien mat -> Ngan hang) = 290,000,000
-- — KHOP CHINH XAC voi so lieu nguoi dung da bao cao.
--
-- Insert thang vao dieu_chuyen_quy (khong qua RPC/UI) — trigger
-- sync_so_quy_dieu_chuyen (0086) tu dong sinh dung cap dong So quy (Chi o so
-- nguon, Thu o so dich) cho tung dong.
--
-- LUU Y: sau khi backfill, So quy Tien mat van con am ~1,166,952,916 (227
-- dong Chi tam ung lich su, gan nhu khong co Thu nao khac ngoai cac khoan vua
-- them) — day la phan CHUA THE tu dong sua duoc vi khong co "sao ke" cho tien
-- mat vat ly; can Ke toan kiem quy thuc te va dung tinh nang "Chot so du dau
-- ky" (da co san, da dung dung cho so Tai khoan cong ty o chot rieng ngay
-- 2026-11-01 = 3,404,559) de chot 1 moc dung cho Tien mat.
-- ============================================================================

insert into dieu_chuyen_quy (ngay, chieu, so_tien, ghi_chu) values
  ('2025-09-11', 'Ngân hàng → Tiền mặt', 10000000, 'Sao ke VCB: MBBIZ6044911661.RUT NHAP QUY TM'),
  ('2025-09-16', 'Ngân hàng → Tiền mặt', 5000000, 'Sao ke VCB: MBBIZ6045231202.RUT NHAP QUY TM'),
  ('2025-09-17', 'Ngân hàng → Tiền mặt', 2000000, 'Sao ke VCB: MBBIZ6045256344.RUT NHAP QUY TM'),
  ('2025-09-20', 'Ngân hàng → Tiền mặt', 7000000, 'Sao ke VCB: MBBIZ6045464488.Rut nhap quy TM'),
  ('2025-09-23', 'Ngân hàng → Tiền mặt', 2500000, 'Sao ke VCB: MBBIZ6045608724.RUT NHAP QUY TM'),
  ('2025-11-30', 'Ngân hàng → Tiền mặt', 28000000, 'Sao ke VCB: MBBIZ6049744930.RUT NHAP QUY TM'),
  ('2025-12-10', 'Ngân hàng → Tiền mặt', 1000000, 'Sao ke VCB: MBBIZ6050488560.Rut TM'),
  ('2025-12-11', 'Ngân hàng → Tiền mặt', 5000000, 'Sao ke VCB: MBBIZ6050540977.RUT TM'),
  ('2025-12-23', 'Ngân hàng → Tiền mặt', 2000000, 'Sao ke VCB: MBBIZ6051290259.Rut TM'),
  ('2025-12-23', 'Ngân hàng → Tiền mặt', 2000000, 'Sao ke VCB: MBBIZ6051351229.RUT TM'),
  ('2025-12-29', 'Tiền mặt → Ngân hàng', 6000000, 'Sao ke VCB: 020097042212291547002025PF1I563702.29480.154701.NOP TM VAO TK'),
  ('2025-12-31', 'Tiền mặt → Ngân hàng', 2000000, 'Sao ke VCB: 0200970422123114121720255AI2104834.28513.141218.NOP TM VAO TK'),
  ('2026-01-06', 'Ngân hàng → Tiền mặt', 30600000, 'Sao ke VCB: MBBIZ6052385760.RUT NHAP QUY TM'),
  ('2026-01-27', 'Ngân hàng → Tiền mặt', 3000000, 'Sao ke VCB: MBBIZ6054177984.RUT TM'),
  ('2026-01-30', 'Ngân hàng → Tiền mặt', 2000000, 'Sao ke VCB: MBBIZ6054477483.RUT TM'),
  ('2026-02-10', 'Ngân hàng → Tiền mặt', 10000000, 'Sao ke VCB: MBBIZ6055881378.RUT NHAP QUY TM'),
  ('2026-02-25', 'Ngân hàng → Tiền mặt', 2000000, 'Sao ke VCB: MBBIZ6056884995.RUT NHAP QUY TM'),
  ('2026-02-26', 'Ngân hàng → Tiền mặt', 2000000, 'Sao ke VCB: MBBIZ6056927064.RUT NHAP QUY TM'),
  ('2026-03-04', 'Ngân hàng → Tiền mặt', 5000000, 'Sao ke VCB: MBBIZ6057551593.RUT NHAP QUY TM'),
  ('2026-03-12', 'Tiền mặt → Ngân hàng', 15000000, 'Sao ke VCB: MBVCB.13336063455.NOP TM VAO TK CTY'),
  ('2026-03-13', 'Ngân hàng → Tiền mặt', 6000000, 'Sao ke VCB: MBBIZ6058517963.RUT NHAP QUY TM'),
  ('2026-03-18', 'Tiền mặt → Ngân hàng', 15000000, 'Sao ke VCB: MBVCB.13413323588.NOP TM VAO TK CTY'),
  ('2026-03-30', 'Ngân hàng → Tiền mặt', 9000000, 'Sao ke VCB: MBBIZ6060101542.RUT NHAP QUY TM'),
  ('2026-04-03', 'Tiền mặt → Ngân hàng', 4000000, 'Sao ke VCB: NOP TM VAO TK#SP#020097042204031117092026X47F839132.5189.22859.111710'),
  ('2026-05-01', 'Ngân hàng → Tiền mặt', 5000000, 'Sao ke VCB: MBBIZ6064024742.RUT NHAP QUY TM'),
  ('2026-05-05', 'Ngân hàng → Tiền mặt', 20000000, 'Sao ke VCB: MBBIZ6064403369.RUT NHAP QUY TM'),
  ('2026-05-27', 'Ngân hàng → Tiền mặt', 1500000, 'Sao ke VCB: MBBIZ6067132561.RUT TM'),
  ('2026-05-29', 'Ngân hàng → Tiền mặt', 52500000, 'Sao ke VCB: MBBIZ6067438741.RUT NHAP QUY TM'),
  ('2026-06-09', 'Tiền mặt → Ngân hàng', 20000000, 'Sao ke VCB: NOP TM VAO TK CTY#SP#0200970422060916193920266EXM439402.5189.75880.161939'),
  ('2026-06-26', 'Ngân hàng → Tiền mặt', 10000000, 'Sao ke VCB: MBBIZ6071035876.RUT NHAP QUY TM'),
  ('2026-06-27', 'Ngân hàng → Tiền mặt', 10000000, 'Sao ke VCB: MBBIZ6071203497.RUT NHAP QUY TM'),
  ('2026-07-06', 'Ngân hàng → Tiền mặt', 15000000, 'Sao ke VCB: MBBIZ6072283914.RUT NHAP QUY TM'),
  ('2026-08-05', 'Ngân hàng → Tiền mặt', 22000000, 'Sao ke VCB: MBBIZ6076300909.RUT NHAP QUY TM'),
  ('2026-08-08', 'Ngân hàng → Tiền mặt', 5000000, 'Sao ke VCB: MBBIZ6076735178.RUT NHAP QUY TM'),
  ('2026-08-13', 'Tiền mặt → Ngân hàng', 25000000, 'Sao ke VCB: NOP TM VAO TK#SP#0200970422081312540720263LHF779527.5189.27815.125408'),
  ('2026-08-25', 'Ngân hàng → Tiền mặt', 25000000, 'Sao ke VCB: MBBIZ6078933823.RUT NHAP QUY TM'),
  ('2026-08-26', 'Ngân hàng → Tiền mặt', 10000000, 'Sao ke VCB: MBBIZ6079098829.RUT NHAP QUY TM'),
  ('2026-09-23', 'Ngân hàng → Tiền mặt', 5000000, 'Sao ke VCB: MBBIZ6082731286.RUT NHAP QUY TM'),
  ('2026-09-25', 'Ngân hàng → Tiền mặt', 30000000, 'Sao ke VCB: MBBIZ6082969986.RUT TIEN'),
  ('2026-10-01', 'Ngân hàng → Tiền mặt', 10000000, 'Sao ke VCB: MBBIZ6083857574.RUT TIEN TK'),
  ('2026-10-28', 'Tiền mặt → Ngân hàng', 70000000, 'Sao ke VCB: MBVCB.16755766177.NOP TM VAO TK CTY'),
  ('2026-10-30', 'Ngân hàng → Tiền mặt', 10022000, 'Sao ke VCB: MBBIZ.6087869026.6303BFTVGL89YA18.RUT TM NHAP QUY CTY'),
  ('2026-11-07', 'Ngân hàng → Tiền mặt', 10022000, 'Sao ke VCB: MBBIZ.6089108373.6311BFTVGLFGRVQI.RUT NHAP QUY TM'),
  ('2026-11-10', 'Tiền mặt → Ngân hàng', 10000000, 'Sao ke VCB: MBVCB.16966727575.NOP TM VAO TK CTY'),
  ('2026-11-12', 'Tiền mặt → Ngân hàng', 110000000, 'Sao ke VCB: 6316MSCBDLBQAN2L.NOP TM VAO TK CTY.20261112.143539'),
  ('2026-11-12', 'Tiền mặt → Ngân hàng', 13000000, 'Sao ke VCB: NOP TM VAO TK CTY#SP#0200970422111221295920262Q7J217325.5387.70329.212959');
