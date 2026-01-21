"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { stripBasePath, withBasePath } from "@/lib/basePath";
import { supabase } from "@/lib/supabase/client";

type ProfileRecord = {
  full_name: string | null;
  avatar_url: string | null;
};

type AuthStatusProps = {
  className?: string;
  showAccountLink?: boolean;
};

const getUserFullName = (user: User) =>
  user.user_metadata?.full_name || user.user_metadata?.name || null;

const getUserAvatarUrl = (user: User) =>
  user.user_metadata?.avatar_url || user.user_metadata?.picture || null;

const getDisplayName = (user: User, profile: ProfileRecord | null) =>
  profile?.full_name ||
  getUserFullName(user) ||
  user.email ||
  "Account";

const getAvatarUrl = (user: User, profile: ProfileRecord | null) =>
  profile?.avatar_url || getUserAvatarUrl(user) || null;

const getInitials = (label: string) => {
  const parts = label.split(" ").filter(Boolean);
  const initials = parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return initials || label.slice(0, 2).toUpperCase();
};

export default function AuthStatus({
  className,
  showAccountLink = true,
}: AuthStatusProps) {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [nextPath, setNextPath] = useState("/");

  const loadProfile = async (authUser: User, isActive: () => boolean) => {
    try {
      const fullName = getUserFullName(authUser);
      const avatarUrl = getUserAvatarUrl(authUser);

      await supabase.from("profiles").upsert(
        {
          id: authUser.id,
          email: authUser.email ?? null,
          full_name: fullName,
          avatar_url: avatarUrl,
        },
        { onConflict: "id", ignoreDuplicates: true },
      );

      const { data } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", authUser.id)
        .maybeSingle();

      if (data && (fullName || avatarUrl)) {
        const updatePayload: ProfileRecord = {
          full_name: data.full_name,
          avatar_url: data.avatar_url,
        };
        if (!data.full_name && fullName) {
          updatePayload.full_name = fullName;
        }
        if (!data.avatar_url && avatarUrl) {
          updatePayload.avatar_url = avatarUrl;
        }
        if (
          updatePayload.full_name !== data.full_name ||
          updatePayload.avatar_url !== data.avatar_url
        ) {
          const { data: updated } = await supabase
            .from("profiles")
            .update(updatePayload)
            .eq("id", authUser.id)
            .select("full_name, avatar_url")
            .maybeSingle();
          if (isActive()) {
            setProfile(updated ?? data);
            return;
          }
        }
      }

      if (isActive()) {
        setProfile(data ?? null);
      }
    } catch (error) {
      console.warn("Failed to load profile data", error);
      if (isActive()) {
        setProfile(null);
      }
    }
  };

  useEffect(() => {
    let active = true;
    const isActive = () => active;

    const init = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!isActive()) return;

        const nextUser = data.session?.user ?? null;
        setUser(nextUser);
        if (nextUser) {
          await loadProfile(nextUser, isActive);
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.warn("Failed to load auth session", error);
      } finally {
        if (isActive()) {
          setIsLoading(false);
        }
      }
    };

    void init();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const nextUser = session?.user ?? null;
        setUser(nextUser);
        if (nextUser) {
          await loadProfile(nextUser, isActive);
        } else if (isActive()) {
          setProfile(null);
        }
        if (isActive()) {
          setIsLoading(false);
        }
      },
    );

    return () => {
      active = false;
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const displayName = useMemo(() => {
    if (!user) return null;
    return getDisplayName(user, profile);
  }, [user, profile]);

  const avatarUrl = useMemo(() => {
    if (!user) return null;
    return getAvatarUrl(user, profile);
  }, [user, profile]);
  useEffect(() => {
    setAvatarFailed(false);
  }, [avatarUrl]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const safePath = stripBasePath(pathname ?? "/");
    setNextPath(`${safePath}${window.location.search}`);
  }, [pathname]);

  const handleSignIn = async () => {
    setIsWorking(true);
    setAuthError(null);
    const nextPath = `${stripBasePath(window.location.pathname)}${
      window.location.search
    }`;
    const redirectTo = `${window.location.origin}${withBasePath(
      `/auth/callback?next=${encodeURIComponent(nextPath)}`,
    )}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) {
      setAuthError("Google sign-in is unavailable.");
    }
    setIsWorking(false);
  };

  const handleSignOut = async () => {
    setIsWorking(true);
    await supabase.auth.signOut();
    setIsWorking(false);
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className ?? ""}`}>
      {isLoading ? (
        <span className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500">
          Loading...
        </span>
      ) : user ? (
        <>
          {showAccountLink ? (
            <Link
              className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300"
              href="/account"
            >
              {avatarUrl && !avatarFailed ? (
                <img
                  alt={displayName ?? "Account"}
                  className="h-6 w-6 rounded-full object-cover"
                  onError={() => setAvatarFailed(true)}
                  referrerPolicy="no-referrer"
                  src={avatarUrl}
                />
              ) : (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-(--paper) text-[11px] font-semibold text-slate-600">
                  {displayName ? getInitials(displayName) : "U"}
                </span>
              )}
              <span className="max-w-28 truncate">{displayName}</span>
            </Link>
          ) : (
            <span className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
              {avatarUrl && !avatarFailed ? (
                <img
                  alt={displayName ?? "Account"}
                  className="h-6 w-6 rounded-full object-cover"
                  onError={() => setAvatarFailed(true)}
                  referrerPolicy="no-referrer"
                  src={avatarUrl}
                />
              ) : (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-(--paper) text-[11px] font-semibold text-slate-600">
                  {displayName ? getInitials(displayName) : "U"}
                </span>
              )}
              <span className="max-w-28 truncate">{displayName}</span>
            </span>
          )}
          <button
            className="rounded-full border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isWorking}
            type="button"
            onClick={handleSignOut}
          >
            Sign out
          </button>
        </>
      ) : (
        <>
          <button
            className="rounded-full bg-(--accent) px-4 py-2 text-xs font-semibold text-white shadow-[0_12px_30px_rgba(242,107,58,0.28)] transition hover:bg-(--accent-strong) disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isWorking}
            type="button"
            onClick={handleSignIn}
          >
            Sign in with Google
          </button>
          <Link
            className="rounded-full border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
            href={`/account?next=${encodeURIComponent(nextPath)}`}
          >
            Email sign in
          </Link>
          {authError ? (
            <span className="w-full text-xs font-semibold text-amber-600">
              {authError}
            </span>
          ) : null}
        </>
      )}
    </div>
  );
}
