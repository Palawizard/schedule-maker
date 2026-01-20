"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

type ProfileRecord = {
  full_name: string | null;
  avatar_url: string | null;
};

const getDisplayName = (user: User, profile: ProfileRecord | null) =>
  profile?.full_name ||
  user.user_metadata?.full_name ||
  user.user_metadata?.name ||
  user.email ||
  "Account";

const getAvatarUrl = (user: User, profile: ProfileRecord | null) =>
  profile?.avatar_url || user.user_metadata?.avatar_url || null;

const getInitials = (label: string) => {
  const parts = label.split(" ").filter(Boolean);
  const initials = parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return initials || label.slice(0, 2).toUpperCase();
};

export default function AccountPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "saving">(
    "loading",
  );
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authStatus, setAuthStatus] = useState<"idle" | "working">("idle");
  const [authMessage, setAuthMessage] = useState<string | null>(null);

  const nextPath = useMemo(() => {
    const raw = searchParams.get("next");
    if (raw && raw.startsWith("/")) return raw;
    return "/account";
  }, [searchParams]);

  const loadProfile = async (authUser: User, isActive: () => boolean) => {
    const fullName =
      authUser.user_metadata?.full_name || authUser.user_metadata?.name || null;
    const avatarUrl = authUser.user_metadata?.avatar_url || null;

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

    if (!isActive()) return;
    setProfile(data ?? null);
    setDisplayName(data?.full_name ?? getDisplayName(authUser, data));
  };

  useEffect(() => {
    let active = true;
    const isActive = () => active;

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!isActive()) return;

      const nextUser = data.session?.user ?? null;
      setUser(nextUser);

      if (nextUser) {
        await loadProfile(nextUser, isActive);
      } else {
        setProfile(null);
        setDisplayName("");
      }

      if (isActive()) {
        setStatus("ready");
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
          setDisplayName("");
        }
      },
    );

    return () => {
      active = false;
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const avatarUrl = useMemo(() => {
    if (!user) return null;
    return getAvatarUrl(user, profile);
  }, [user, profile]);

  const providerLabel = useMemo(() => {
    if (!user) return "Unknown";
    const providers = user.app_metadata?.providers;
    if (Array.isArray(providers) && providers.length > 0) {
      return providers.join(", ");
    }
    return user.app_metadata?.provider ?? "Unknown";
  }, [user]);

  const handleSignIn = async () => {
    setAuthMessage(null);
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
      nextPath,
    )}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) {
      setAuthMessage("Google sign-in is unavailable.");
    }
  };

  const handleSignOut = async () => {
    setAuthMessage(null);
    await supabase.auth.signOut();
  };

  const handleEmailSignIn = async () => {
    const email = authEmail.trim();
    if (!email || !authPassword) {
      setAuthMessage("Enter an email and password.");
      return;
    }
    setAuthStatus("working");
    setAuthMessage(null);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: authPassword,
    });
    if (error) {
      setAuthMessage(error.message);
    } else {
      setAuthMessage("Signed in.");
      router.replace(nextPath);
    }
    setAuthStatus("idle");
  };

  const handleEmailSignUp = async () => {
    const email = authEmail.trim();
    if (!email || !authPassword) {
      setAuthMessage("Enter an email and password.");
      return;
    }
    setAuthStatus("working");
    setAuthMessage(null);
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
      nextPath,
    )}`;
    const { data, error } = await supabase.auth.signUp({
      email,
      password: authPassword,
      options: { emailRedirectTo: redirectTo },
    });
    if (error) {
      setAuthMessage(error.message);
    } else if (data.session) {
      setAuthMessage("Account created and signed in.");
      router.replace(nextPath);
    } else {
      setAuthMessage("Check your email to confirm your account.");
    }
    setAuthStatus("idle");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;

    setStatus("saving");
    setProfileMessage(null);
    const fullName = displayName.trim() || null;

    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName })
      .eq("id", user.id);

    if (error) {
      setProfileMessage("Save failed. Please try again.");
    } else {
      setProfile((prev) => ({
        full_name: fullName,
        avatar_url: prev?.avatar_url ?? null,
      }));
      setProfileMessage("Saved.");
    }

    setStatus("ready");
  };

  return (
    <div className="page-shell min-h-screen">
      <div className="relative overflow-hidden">
        <div className="hero-glow pointer-events-none absolute -top-32 right-0 h-90 w-90 opacity-70 blur-3xl" />
        <header className="relative z-10 mx-auto w-full max-w-6xl px-6 py-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[26px] border border-slate-200 bg-white px-4 py-3 shadow-[0_18px_40px_rgba(20,27,42,0.12)]">
            <Link className="flex items-center gap-3 text-lg font-semibold" href="/">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-(--accent) text-white">
                P
              </span>
              Pala&apos;s Stream Schedule Maker
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                href="/schedule"
              >
                Open studio
              </Link>
              <Link
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                href="/"
              >
                Back home
              </Link>
            </div>
          </div>
        </header>

        <main className="relative z-10 mx-auto w-full max-w-4xl px-6 pb-20 pt-6">
          <section className="rounded-4xl border border-slate-200 bg-white/90 p-8 shadow-[0_30px_70px_rgba(20,27,42,0.12)]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                  Account
                </p>
                <h1 className="font-display mt-3 text-3xl text-slate-900">
                  Manage your profile
                </h1>
                <p className="mt-2 text-sm text-slate-600">
                  Connect with Google and keep your display name up to date.
                </p>
              </div>
              {user ? (
                <button
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                  type="button"
                  onClick={handleSignOut}
                >
                  Sign out
                </button>
              ) : (
                <button
                  className="rounded-full bg-(--accent) px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(242,107,58,0.28)] transition hover:bg-(--accent-strong)"
                  type="button"
                  onClick={handleSignIn}
                >
                  Sign in with Google
                </button>
              )}
            </div>

            {status === "loading" ? (
              <p className="mt-6 text-sm text-slate-600">Loading account...</p>
            ) : user ? (
              <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_16px_40px_rgba(20,27,42,0.08)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Profile
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-4">
                    {avatarUrl ? (
                      <img
                        alt={displayName || "Account"}
                        className="h-16 w-16 rounded-3xl object-cover"
                        src={avatarUrl}
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-(--paper) text-lg font-semibold text-slate-600">
                        {displayName ? getInitials(displayName) : "U"}
                      </div>
                    )}
                    <div>
                      <p className="text-lg font-semibold text-slate-900">
                        {displayName || "Set a display name"}
                      </p>
                      <p className="text-sm text-slate-600">{user.email}</p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-2 text-xs text-slate-500">
                    <p>Provider: {providerLabel}</p>
                    <p>User ID: {user.id}</p>
                  </div>
                </div>

                <form
                  className="rounded-3xl border border-slate-200 bg-(--paper) p-5 shadow-[0_16px_40px_rgba(20,27,42,0.08)]"
                  onSubmit={handleSubmit}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Display name
                  </p>
                  <label className="mt-4 block text-sm font-semibold text-slate-700">
                    Name
                  </label>
                  <input
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none"
                    maxLength={48}
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder="Add a display name"
                    type="text"
                    value={displayName}
                  />
                  <button
                    className="mt-4 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                    disabled={status === "saving"}
                    type="submit"
                  >
                    {status === "saving" ? "Saving..." : "Save"}
                  </button>
                  {profileMessage ? (
                    <p className="mt-3 text-xs text-slate-500">
                      {profileMessage}
                    </p>
                  ) : null}
                </form>
              </div>
            ) : (
              <div className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_16px_40px_rgba(20,27,42,0.08)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Email account
                  </p>
                  <label className="mt-4 block text-sm font-semibold text-slate-700">
                    Email
                  </label>
                  <input
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none"
                    onChange={(event) => setAuthEmail(event.target.value)}
                    placeholder="you@example.com"
                    type="email"
                    value={authEmail}
                  />
                  <label className="mt-4 block text-sm font-semibold text-slate-700">
                    Password
                  </label>
                  <input
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none"
                    onChange={(event) => setAuthPassword(event.target.value)}
                    placeholder="At least 6 characters"
                    type="password"
                    value={authPassword}
                  />
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                      disabled={authStatus === "working"}
                      type="button"
                      onClick={handleEmailSignIn}
                    >
                      Sign in
                    </button>
                    <button
                      className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-70"
                      disabled={authStatus === "working"}
                      type="button"
                      onClick={handleEmailSignUp}
                    >
                      Create account
                    </button>
                  </div>
                  {authMessage ? (
                    <p className="mt-3 text-xs text-slate-500">
                      {authMessage}
                    </p>
                  ) : null}
                </div>

                <div className="rounded-3xl border border-slate-200 bg-(--paper) p-5 shadow-[0_16px_40px_rgba(20,27,42,0.08)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Google account
                  </p>
                  <p className="mt-4 text-sm text-slate-600">
                    Use Google to sign in without a password.
                  </p>
                  <button
                    className="mt-4 rounded-full bg-(--accent) px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(242,107,58,0.28)] transition hover:bg-(--accent-strong)"
                    type="button"
                    onClick={handleSignIn}
                  >
                    Sign in with Google
                  </button>
                </div>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
