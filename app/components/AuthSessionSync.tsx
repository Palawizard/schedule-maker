"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase/client";

export default function AuthSessionSync() {
  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    let isRefreshing = false;

    const refreshSessionIfNeeded = async () => {
      if (isRefreshing) return;
      isRefreshing = true;
      try {
        const { data } = await supabase.auth.getSession();
        const session = data.session;
        if (!session) {
          await supabase.auth.refreshSession();
          return;
        }
        const expiresAt = session.expires_at ?? 0;
        const now = Math.floor(Date.now() / 1000);
        if (expiresAt - now < 60) {
          await supabase.auth.refreshSession();
        }
      } catch (error) {
        console.warn("Failed to refresh auth session", error);
      } finally {
        isRefreshing = false;
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

    return () => {
      window.removeEventListener("focus", handleVisibility);
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return null;
}
