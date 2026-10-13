"use client";

import { useEffect } from "react";

/**
 * PwaRegister registers the service worker in the background for offline shell support.
 * It does not display any popups, banners, or instructional screens.
 */
export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator && window.location.protocol.startsWith("http")) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          if (process.env.NODE_ENV === "development") {
            console.log("[PWA] Service worker registered:", reg.scope);
          }
        })
        .catch((err) => {
          console.warn("[PWA] Service worker registration failed:", err);
        });
    }
  }, []);

  return null;
}
