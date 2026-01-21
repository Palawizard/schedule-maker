"use client";

import { useEffect } from "react";
import { getFreshSession } from "@/lib/supabase/session";

export default function AuthSessionSync() {
  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    let isRefreshing = false;
    let lastRefreshAt = 0;

    const refreshSessionIfNeeded = async () => {
      if (isRefreshing) return;
      const now = Date.now();
      if (now - lastRefreshAt < 30000) return;
      isRefreshing = true;
      try {
        await getFreshSession();
      } catch (error) {
        console.warn("Failed to refresh auth session", error);
      } finally {
        isRefreshing = false;
        lastRefreshAt = Date.now();
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState !== "visible") return;
      void refreshSessionIfNeeded();
    };

    const handleOnline = () => {
      void refreshSessionIfNeeded();
    };

    window.addEventListener("focus", handleVisibility);
    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibility);
    void refreshSessionIfNeeded();
    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void refreshSessionIfNeeded();
    }, 5 * 60 * 1000);

    return () => {
      window.removeEventListener("focus", handleVisibility);
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.clearInterval(intervalId);
    };
  }, []);

  return null;
}
