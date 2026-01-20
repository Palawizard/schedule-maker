import Link from "next/link";
import AuthStatus from "./components/AuthStatus";

const features = [
  {
    title: "Edit and preview modes",
    description:
      "Swap between the full editor and a clean preview before you export.",
  },
  {
    title: "Smart stream sizing",
    description:
      "Streams expand or compress so the schedule always fits the canvas.",
  },
  {
    title: "Time zone aware slots",
    description:
      "Pick a base zone and auto-calculate every slot across regions.",
  },
  {
    title: "Custom flags and labels",
    description:
      "Use the emoji picker to set custom flags and names for time slots.",
  },
  {
    title: "Portrait and landscape exports",
    description:
      "Export for Stories, YouTube posts, or X in both orientations.",
  },
  {
    title: "PNG with rounded corners",
    description:
      "Download PNG files that keep the rounded canvas edges intact.",
  },
];

const exportSizes = [
  { label: "Story", size: "1080 x 1920" },
  { label: "YouTube post", size: "1280 x 720" },
  { label: "X vertical", size: "1080 x 1920" },
  { label: "X horizontal", size: "1600 x 900" },
];

const workflow = [
  {
    title: "Name the week",
    description: "Set your schedule name and base time zone.",
  },
  {
    title: "Build the days",
    description: "Add streams, time slots, and day off cards.",
  },
  {
    title: "Preview and export",
    description: "Switch to preview and download the final PNG.",
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
                Build stream schedules that stay readable at every size.
              </h1>
              <p className="max-w-xl text-lg text-slate-600">
                Design your week with time zones, smart scaling, and fast edits.
                Export portrait or landscape PNGs that are ready to post.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  className="rounded-full bg-(--accent) px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_40px_rgba(242,107,58,0.25)] transition hover:-translate-y-0.5 hover:bg-(--accent-strong)"
                  href="/schedules"
                >
                  Create my schedule
                </Link>
                <Link
                  className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                  href="/#features"
                >
                  See features
                </Link>
              </div>
              <div className="flex flex-wrap gap-6 text-sm text-slate-500">
                <div>
                  <p className="text-2xl font-semibold text-slate-900">7</p>
                  <p>days max</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold text-slate-900">2</p>
                  <p>modes</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold text-slate-900">4</p>
                  <p>export sizes</p>
                </div>
              </div>
            </div>

            <div className="relative animate-float-in">
              <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-(--sea)/20 blur-2xl" />
              <div className="rounded-4xl border border-slate-200 bg-white/85 p-6 shadow-[0_30px_80px_rgba(20,27,42,0.18)] backdrop-blur">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                      Studio snapshot
                    </p>
                    <p className="text-lg font-semibold text-slate-900">
                      Week 24
                    </p>
                  </div>
                  <div className="flex items-center rounded-full border border-slate-200 bg-white p-1 text-[11px] font-semibold">
                    <span className="rounded-full bg-(--accent) px-3 py-1 text-white">
                      Edit
                    </span>
                    <span className="px-3 py-1 text-slate-500">Preview</span>
                  </div>
                </div>
                <div className="mt-5 grid gap-3">
                  <div className="rounded-2xl border border-slate-200 bg-(--paper) px-4 py-3 text-sm text-slate-700">
                    Schedule name: <span className="font-semibold">Week 24</span>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-(--paper) px-4 py-3 text-sm text-slate-700">
                    Time zone: <span className="font-semibold">Europe/Paris</span>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-(--paper) px-4 py-3 text-sm text-slate-700">
                    Export size: <span className="font-semibold">YouTube post</span>
                  </div>
                </div>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {exportSizes.map((item) => (
                    <div
                      key={item.label}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500"
                    >
                      <p className="text-sm font-semibold text-slate-900">
                        {item.label}
                      </p>
                      <p>{item.size}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500">
                  <span>Preview mode required</span>
                  <span className="text-slate-900">Download PNG</span>
                </div>
              </div>
            </div>
          </section>

          <section id="features" className="mt-16 grid gap-6 md:grid-cols-2">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="animate-fade-up rounded-[28px] border border-slate-200 bg-white/80 p-6 shadow-[0_20px_50px_rgba(20,27,42,0.08)]"
                style={{ animationDelay: `${index * 120}ms` }}
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
            <div className="grid items-center gap-8 md:grid-cols-[1.2fr_0.8fr]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                  Workflow
                </p>
                <h2 className="font-display mt-3 text-3xl text-slate-900 md:text-4xl">
                  Move from plan to export in minutes.
                </h2>
                <p className="mt-4 text-sm leading-6 text-slate-600">
                  The editor keeps everything focused: edit the week, preview the
                  export, and download a clean PNG with rounded corners.
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
        </main>
      </div>
    </div>
  );
}
