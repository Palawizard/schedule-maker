"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function AuthCallback() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [message, setMessage] = useState("Finalizing sign-in...");

  useEffect(() => {
    let active = true;

    const finalize = async () => {
      const params = new URLSearchParams(window.location.search);
      const next = params.get("next") || "/schedule";
      const code = params.get("code");
      const oauthError = params.get("error_description") || params.get("error");

      if (oauthError) {
        if (active) {
          setStatus("error");
          setMessage(oauthError);
        }
        return;
      }

      const { data: sessionBefore } = await supabase.auth.getSession();
      if (sessionBefore.session) {
        if (active) {
          router.replace(next);
        }
        return;
      }

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          const { data: sessionAfter } = await supabase.auth.getSession();
          if (sessionAfter.session) {
            if (active) {
              router.replace(next);
            }
            return;
          }
          if (active) {
            setStatus("error");
            setMessage("Sign-in failed. Please try again.");
          }
          return;
        }
      }

      const { data: sessionAfter } = await supabase.auth.getSession();
      if (sessionAfter.session) {
        if (active) {
          router.replace(next);
        }
        return;
      }

      if (active) {
        setStatus("error");
        setMessage("Sign-in failed. Please try again.");
      }
    };

    void finalize();

    return () => {
      active = false;
    };
  }, [router]);

  return (
    <div className="page-shell min-h-screen">
      <div className="relative mx-auto flex min-h-screen w-full max-w-3xl items-center px-6 py-16">
        <div className="w-full rounded-4xl border border-slate-200 bg-white/90 p-8 text-center shadow-[0_24px_60px_rgba(20,27,42,0.12)]">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
            Supabase
          </p>
          <h1 className="font-display mt-4 text-3xl text-slate-900">
            {message}
          </h1>
          {status === "error" ? (
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                className="rounded-full bg-(--accent) px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(242,107,58,0.28)] transition hover:bg-(--accent-strong)"
                href="/schedule"
              >
                Go to schedule
              </Link>
              <Link
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                href="/"
              >
                Back home
              </Link>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-600">
              Hang tight, we&apos;re connecting your account.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
