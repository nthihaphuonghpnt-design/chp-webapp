import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CHP - Quản lý nội bộ",
    short_name: "CHP",
    description: "Hệ thống quản lý nội bộ Châu Hoàng Phát",
    start_url: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#2563eb",
    icons: [
      { src: "/icon-192", sizes: "192x192", type: "image/png" },
      { src: "/icon-512", sizes: "512x512", type: "image/png" },
    ],
  };
}
