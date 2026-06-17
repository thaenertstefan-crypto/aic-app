"use client";

import { useEffect } from "react";

// Registers the service worker (public/sw.js) in production so the app is
// installable and shows the offline fallback. Renders nothing.
//
// In development the service worker is deliberately NOT registered: a cached
// worker serves stale assets (old CSS/JS) and causes confusing visual glitches
// such as the previous color palette reappearing after a hard refresh. To heal
// browsers that registered it during an earlier dev session, any existing
// registration and its caches are removed on load.
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => {
          registrations.forEach((registration) => registration.unregister());
        })
        .catch(() => {});
      if ("caches" in window) {
        caches
          .keys()
          .then((keys) => keys.forEach((key) => caches.delete(key)))
          .catch(() => {});
      }
      return;
    }

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.error("Service worker registration failed:", error);
      });
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register);
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
