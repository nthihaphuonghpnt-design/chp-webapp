import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { PhongBanTen } from "@/types/database";

export interface CurrentUser {
  id: string;
  ho_ten: string;
  email_tai_khoan: string | null;
  phong_ban: PhongBanTen;
}

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("nhan_vien")
    .select("id, ho_ten, email_tai_khoan, phong_ban:phong_ban_id(ten)")
    .eq("auth_user_id", user.id)
    .single();

  if (!data) return null;

  const phongBan = Array.isArray(data.phong_ban)
    ? data.phong_ban[0]
    : data.phong_ban;

  return {
    id: data.id,
    ho_ten: data.ho_ten,
    email_tai_khoan: data.email_tai_khoan,
    phong_ban: (phongBan?.ten ?? "Sale") as PhongBanTen,
  };
});
