"use client";

import { useEffect } from "react";

/** Dang ky service worker cho PWA (cai duoc tren dien thoai, co trang offline.html fallback khi mat mang). */
export default function RegisterServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return null;
}
