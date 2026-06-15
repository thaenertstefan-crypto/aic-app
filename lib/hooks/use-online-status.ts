"use client";

import { useEffect, useState } from "react";

/**
 * Tracks the browser's online/offline state.
 *
 * Defaults to `true` during SSR and the first client paint so we never flash
 * an offline banner before `navigator.onLine` has been read.
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return online;
}
