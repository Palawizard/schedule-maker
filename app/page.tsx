import Link from "next/link";
import AuthStatus from "./components/AuthStatus";
import { withBasePath } from "@/lib/basePath";

const featureHighlights = [
  {
    title: "Your schedules hub",
    description:
      "Keep multiple schedules with thumbnails, and jump right back into the last one.",
  },
  {
    title: "Smart stream layout",
    description:
      "Cards auto-flow so the schedule always fills the canvas cleanly.",
  },
  {
    title: "Custom export sizes",
    description:
      "Pick portrait or landscape, then enter any width and height you want.",
  },
  {
    title: "Preview-first exports",
    description:
      "Switch to preview mode and download or copy a PNG with rounded corners.",
  },
  {
    title: "Shareable preview links",
    description:
      "Generate a view-only link so anyone can view and download the PNG.",
  },
  {
    title: "Account persistence",
    description:
      "Schedules stay tied to your account after refreshes or device changes.",
  },
  {
    title: "Time zone aware slots",
    description:
      "Set a base time zone and keep every stream readable across regions.",
  },
];

const workflow = [
  {
    title: "Sign in and create",
    description: "Use Google or email, then start with a blank schedule.",
  },
  {
    title: "Build the week",
    description: "Add days, streams, and labels with automatic layout.",
  },
  {
    title: "Pick your export size",
    description: "Choose portrait or landscape and enter any dimensions.",
  },
  {
    title: "Preview, export, share",
    description: "Download a PNG or share a view-only link in seconds.",
  },
];

const scheduleActions = [
  {
    title: "Create blank schedules",
    description: "Start clean every time without templates.",
  },
  {
    title: "Rename and duplicate",
    description: "Keep variations without losing the original.",
  },
  {
    title: "Delete safely",
    description: "Confirm removals with the same studio popups.",
  },
  {
    title: "Preview thumbnails",
    description: "See the latest export size at a glance.",
  },
];

const previewActions = [
  {
    title: "Download PNG",
    description: "Export the exact canvas with rounded corners.",
  },
  {
    title: "Copy PNG",
    description: "Send the image straight to your clipboard.",
  },
  {
    title: "View-only sharing",
    description: "Let anyone view and download without editing access.",
  },
];


export default function Home() {
  return (
    <div className="page-shell min-h-screen">
      <div className="relative overflow-hidden">
        <div className="hero-glow pointer-events-none absolute -top-40 right-0 h-105 w-105 opacity-80 blur-3xl" />
        <div className="pointer-events-none absolute -left-32 top-40 h-70 w-70 rounded-full bg-(--sea)/15 blur-3xl" />
        <header className="relative z-10 mx-auto w-full max-w-6xl px-6 py-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[26px] border border-slate-200 bg-white px-4 py-3 shadow-[0_18px_40px_rgba(20,27,42,0.12)]">
            <Link className="flex items-center gap-3 text-lg font-semibold" href="/">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-(--accent) text-white">
                P
              </span>
              Pala&apos;s Stream Schedule Maker
            </Link>
            <div className="flex flex-wrap items-center gap-3">
              <AuthStatus />
              <Link
                className="rounded-full bg-(--accent) px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(242,107,58,0.3)] transition hover:bg-(--accent-strong)"
                href="/schedules"
              >
                Launch studio
              </Link>
            </div>
          </div>
        </header>

        <main className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-20 pt-8">
          <section className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-6">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">
                Stream schedule studio
              </p>
              <h1 className="font-display text-4xl leading-[1.05] text-slate-900 sm:text-5xl lg:text-6xl">
                Plan, preview, and share stream schedules that scale.
              </h1>
              <p className="max-w-xl text-lg text-slate-600">
                Keep every schedule in one account, pick any export size, and
                ship view-only previews with PNG downloads.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  className="rounded-full bg-(--accent) px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_40px_rgba(242,107,58,0.25)] transition hover:-translate-y-0.5 hover:bg-(--accent-strong)"
                  href="/schedules"
                >
                  Open my schedules
                </Link>
                <Link
                  className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                  href="/#features"
                >
                  See features
                </Link>
              </div>
            </div>

            <div className="relative animate-float-in">
              <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-(--sea)/20 blur-2xl" />
              <div className="rounded-4xl border border-slate-200 bg-white/85 p-5 shadow-[0_30px_80px_rgba(20,27,42,0.18)] backdrop-blur">
                <div className="relative">
                  <span className="absolute left-4 top-4 rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 shadow-sm">
                    Studio snapshot
                  </span>
                  <img
                    src={withBasePath("/studio-snapshot.png")}
                    alt="Studio snapshot"
                    className="h-auto w-full rounded-3xl border border-slate-200 object-cover"
                  />
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                    Saved in account
                  </span>
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                    Shareable link
                  </span>
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                    Custom sizes
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section
            id="features"
            className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3"
          >
            {featureHighlights.map((feature, index) => (
              <div
                key={feature.title}
                className="animate-fade-up rounded-[28px] border border-slate-200 bg-white/80 p-6 shadow-[0_20px_50px_rgba(20,27,42,0.08)]"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <h3 className="font-display text-2xl text-slate-900">
                  {feature.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </section>

          <section className="mt-16 rounded-4xl border border-slate-200 bg-(--paper) px-6 py-10 shadow-[0_30px_70px_rgba(20,27,42,0.12)] md:px-10">
            <div className="grid items-center gap-8 md:grid-cols-[1.15fr_0.85fr]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                  Studio flow
                </p>
                <h2 className="font-display mt-3 text-3xl text-slate-900 md:text-4xl">
                  Everything from sign-in to share is one straight line.
                </h2>
                <p className="mt-4 text-sm leading-6 text-slate-600">
                  The editor keeps everything focused: build the schedule,
                  preview at the exact size, then export or share.
                </p>
              </div>
              <div className="space-y-4">
                {workflow.map((step, index) => (
                  <div
                    key={step.title}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Step {index + 1}
                    </p>
                    <p className="text-sm font-semibold text-slate-900">
                      {step.title}
                    </p>
                    <p className="text-sm text-slate-600">{step.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="mt-16 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-4xl border border-slate-200 bg-white/85 p-6 shadow-[0_25px_60px_rgba(20,27,42,0.12)]">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                Your schedules
              </p>
              <h2 className="font-display mt-3 text-2xl text-slate-900 md:text-3xl">
                Manage every week from a single library.
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Keep multiple schedules per account with previews that match
                your chosen export size.
              </p>
              <div className="mt-6 grid gap-4">
                {scheduleActions.map((action) => (
                  <div
                    key={action.title}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
                  >
                    <p className="text-sm font-semibold text-slate-900">
                      {action.title}
                    </p>
                    <p className="text-sm text-slate-600">
                      {action.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-4xl border border-slate-200 bg-(--paper) p-6 shadow-[0_25px_60px_rgba(20,27,42,0.12)]">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                Preview and share
              </p>
              <h2 className="font-display mt-3 text-2xl text-slate-900 md:text-3xl">
                Export or share in seconds.
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Preview mode gives you the exact canvas, then export or send a
                share link with zero edits exposed.
              </p>
              <div className="mt-6 space-y-4">
                {previewActions.map((action) => (
                  <div
                    key={action.title}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
                  >
                    <p className="text-sm font-semibold text-slate-900">
                      {action.title}
                    </p>
                    <p className="text-sm text-slate-600">
                      {action.description}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-6 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                View-only links keep editing locked and let anyone download the
                PNG.
              </div>
            </div>
          </section>

          <section className="mt-16 rounded-4xl border border-slate-200 bg-white/90 px-6 py-10 text-center shadow-[0_30px_70px_rgba(20,27,42,0.12)]">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
              Ready to build?
            </p>
            <h2 className="font-display mt-3 text-3xl text-slate-900 md:text-4xl">
              Open the studio and start your next schedule.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-slate-600">
              Every schedule is saved to your account, and share links are ready
              when you are.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                className="rounded-full bg-(--accent) px-6 py-3 text-sm font-semibold text-white shadow-[0_16px_40px_rgba(242,107,58,0.25)] transition hover:-translate-y-0.5 hover:bg-(--accent-strong)"
                href="/schedules"
              >
                Launch studio
              </Link>
              <Link
                className="rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                href="/account"
              >
                Manage account
              </Link>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
