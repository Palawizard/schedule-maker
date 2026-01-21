import { Suspense } from "react";
import AccountClient from "./AccountClient";

export const dynamic = "force-dynamic";

const accountFallback = (
  <div className="page-shell min-h-screen">
    <div className="relative mx-auto flex min-h-screen w-full max-w-3xl items-center px-6 py-16">
      <div className="w-full rounded-4xl border border-slate-200 bg-white/90 p-8 text-center shadow-[0_24px_60px_rgba(20,27,42,0.12)]">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
          Loading
        </p>
        <h1 className="font-display mt-4 text-3xl text-slate-900">
          Loading account...
        </h1>
      </div>
    </div>
  </div>
);

export default function AccountPage() {
  return (
    <Suspense fallback={accountFallback}>
      <AccountClient />
    </Suspense>
  );
}
