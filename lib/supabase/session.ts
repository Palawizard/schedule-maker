import type { Session } from "@supabase/supabase-js";
import { supabase } from "./client";

const refreshGraceSeconds = 300;
const refreshTimeoutMs = 8000;

type AuthErrorLike = {
  status?: number;
  message?: string;
};

const isAuthErrorLike = (value: unknown): value is AuthErrorLike =>
  typeof value === "object" && value !== null;

const shouldForceSignOut = (error: unknown) => {
  if (!isAuthErrorLike(error)) return false;
  const status = typeof error.status === "number" ? error.status : null;
  if (status && status >= 400 && status < 500 && status !== 429) {
    return true;
  }
  const message = typeof error.message === "string" ? error.message : "";
  return message.toLowerCase().includes("refresh token");
};

const withTimeout = <T>(promise: Promise<T>, timeoutMs: number) =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Timeout"));
    }, timeoutMs);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });

const refreshSession = async (fallback: Session | null) => {
  try {
    const result = await withTimeout(
      supabase.auth.refreshSession(),
      refreshTimeoutMs,
    );
    if (result.error) {
      console.warn("Failed to refresh auth session", result.error);
      if (shouldForceSignOut(result.error)) {
        await supabase.auth.signOut();
        return null;
      }
      return fallback;
    }
    return result.data.session ?? fallback;
  } catch (error) {
    console.warn("Failed to refresh auth session", error);
    return fallback;
  }
};

export const getFreshSession = async () => {
  try {
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    if (!session) {
      return null;
    }
    const expiresAt = session.expires_at ?? 0;
    const now = Math.floor(Date.now() / 1000);
    if (expiresAt - now < refreshGraceSeconds) {
      return await refreshSession(session);
    }
    return session;
  } catch (error) {
    console.warn("Failed to read auth session", error);
    return null;
  }
};
