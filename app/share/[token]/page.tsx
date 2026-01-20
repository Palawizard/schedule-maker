"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getFontEmbedCSS, toBlob, toPng } from "html-to-image";
import StorySchedulePreview from "../../schedule/StorySchedulePreview";
import type { ScheduleFile } from "../../schedule/scheduleData";
import { getLayoutMode, getPreviewSize } from "../../schedule/previewUtils";

type ShareResponse = {
  schedule_id: string;
  share_token: string;
  name: string | null;
  payload: ScheduleFile;
  created_at: string;
  expires_at: string | null;
};

const noop = () => {};
const noopSelectDay = (_id: string) => {};
const noopAddDay = (_position: "top" | "bottom") => {};
const noopDeleteDay = (_id: string) => {};
const noopReorderDay = (
  _dragId: string,
  _targetId: string,
  _position: "before" | "after",
) => {};
const noopReorderStream = (
  _dayId: string,
  _dragId: string,
  _targetId: string,
  _position: "before" | "after",
) => {};

export default function SharePage() {
  const params = useParams();
  const token = useMemo(() => {
    const raw = params?.token;
    return typeof raw === "string" ? raw : raw?.[0] ?? "";
  }, [params]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [share, setShare] = useState<ShareResponse | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [canCopyToClipboard, setCanCopyToClipboard] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) return;
    let active = true;

    const loadShare = async () => {
      setStatus("loading");
      const response = await fetch(`/api/share/${token}`);
      if (!response.ok) {
        if (active) setStatus("error");
        return;
      }
      const payload = (await response.json()) as { share: ShareResponse };
      if (active) {
        setShare(payload.share);
        setStatus("ready");
      }
    };

    void loadShare();

    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    if (typeof navigator === "undefined" || typeof window === "undefined") {
      setCanCopyToClipboard(false);
      return;
    }
    setCanCopyToClipboard(
      Boolean(
        navigator.clipboard &&
          typeof (window as typeof window).ClipboardItem !== "undefined",
      ),
    );
  }, []);

  if (status === "loading") {
    return (
      <div className="page-shell min-h-screen">
        <div className="relative mx-auto flex min-h-screen w-full max-w-3xl items-center px-6 py-16">
          <div className="w-full rounded-4xl border border-slate-200 bg-white/90 p-8 text-center shadow-[0_24px_60px_rgba(20,27,42,0.12)]">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Loading
            </p>
            <h1 className="font-display mt-4 text-3xl text-slate-900">
              Loading shared schedule...
            </h1>
          </div>
        </div>
      </div>
    );
  }

  if (status === "error" || !share) {
    return (
      <div className="page-shell min-h-screen">
        <div className="relative mx-auto flex min-h-screen w-full max-w-3xl items-center px-6 py-16">
          <div className="w-full rounded-4xl border border-slate-200 bg-white/90 p-8 text-center shadow-[0_24px_60px_rgba(20,27,42,0.12)]">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Not found
            </p>
            <h1 className="font-display mt-4 text-3xl text-slate-900">
              This preview link is unavailable.
            </h1>
            <Link
              className="mt-6 inline-flex rounded-full bg-(--accent) px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(242,107,58,0.28)] transition hover:bg-(--accent-strong)"
              href="/"
            >
              Back home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const previewSize = getPreviewSize(share.payload);
  const layoutMode = getLayoutMode(share.payload);
  const previewDayId = share.payload.days[0]?.id ?? null;
  const title = share.name || share.payload.scheduleName || "Schedule";
  const safeName = title
    .trim()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  const fileName = `${safeName || "schedule"}-preview.png`;

  const buildFontEmbedCSS = async (root: HTMLElement) => {
    try {
      const css = await getFontEmbedCSS(root, {
        cacheBust: true,
        includeQueryParams: true,
      });
      if (css.trim()) return css;
    } catch (error) {
      console.warn("Failed to gather embedded fonts", error);
    }
    return "";
  };

  const handleDownload = async () => {
    if (!exportRef.current || isDownloading) return;
    setIsDownloading(true);
    exportRef.current.setAttribute("data-exporting", "true");
    try {
      const fontEmbedCSS = await buildFontEmbedCSS(exportRef.current);
      const dataUrl = await toPng(exportRef.current, {
        pixelRatio: 1,
        cacheBust: true,
        includeQueryParams: true,
        fontEmbedCSS,
        width: previewSize.width,
        height: previewSize.height,
        style: {
          transform: "scale(1)",
          transformOrigin: "top left",
        },
      });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = fileName;
      link.click();
    } catch (error) {
      console.error("Failed to export shared preview", error);
    } finally {
      exportRef.current.setAttribute("data-exporting", "false");
      setIsDownloading(false);
    }
  };

  const handleCopy = async () => {
    if (!exportRef.current || isCopying || !canCopyToClipboard) return;
    setIsCopying(true);
    exportRef.current.setAttribute("data-exporting", "true");
    try {
      const fontEmbedCSS = await buildFontEmbedCSS(exportRef.current);
      const blob = await toBlob(exportRef.current, {
        pixelRatio: 1,
        cacheBust: true,
        includeQueryParams: true,
        fontEmbedCSS,
        width: previewSize.width,
        height: previewSize.height,
        style: {
          transform: "scale(1)",
          transformOrigin: "top left",
        },
      });
      if (!blob) {
        throw new Error("Failed to copy image");
      }
      await navigator.clipboard.write([
        new (window as typeof window).ClipboardItem({
          "image/png": blob,
        }),
      ]);
    } catch (error) {
      console.error("Failed to copy shared preview", error);
    } finally {
      exportRef.current.setAttribute("data-exporting", "false");
      setIsCopying(false);
    }
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
            <Link
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
              href="/schedules"
            >
              Create your own
            </Link>
          </div>
        </header>

        <main className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-20 pt-6">
          <section className="rounded-4xl border border-slate-200 bg-white/90 p-8 shadow-[0_30px_70px_rgba(20,27,42,0.12)]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                  View only
                </p>
                <h1 className="font-display mt-3 text-3xl text-slate-900">
                  {title}
                </h1>
                <p className="mt-2 text-sm text-slate-600">
                  This is a shared preview link. Editing is disabled.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isDownloading}
                  type="button"
                  onClick={handleDownload}
                >
                  {isDownloading ? "Preparing..." : "Download PNG"}
                </button>
                <button
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isCopying || !canCopyToClipboard}
                  type="button"
                  onClick={handleCopy}
                >
                  {isCopying ? "Copying..." : "Copy PNG"}
                </button>
                <Link
                  className="rounded-full bg-(--accent) px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(242,107,58,0.28)] transition hover:bg-(--accent-strong)"
                  href="/schedules"
                >
                  Build my schedule
                </Link>
              </div>
            </div>

            <div className="mt-8 flex justify-center">
              <div className="w-full max-w-4xl rounded-[28px] border border-slate-200 bg-(--paper) p-4">
                <StorySchedulePreview
                  days={share.payload.days}
                  selectedDayId={previewDayId}
                  selectedTarget={null}
                  onSelectDayAction={noopSelectDay}
                  onSelectHeaderAction={noop}
                  onSelectFooterAction={noop}
                  onAddDayAction={noopAddDay}
                  onDeleteDayAction={noopDeleteDay}
                  onReorderDayAction={noopReorderDay}
                  onReorderStreamAction={noopReorderStream}
                  canAddDay={false}
                  showAddControls={false}
                  isExporting={false}
                  canvasWidth={previewSize.width}
                  canvasHeight={previewSize.height}
                  layoutMode={layoutMode}
                  showHeader={share.payload.showHeader}
                  headerTitle={share.payload.headerTitle}
                  headerAlignment={share.payload.headerAlignment}
                  headerTone={share.payload.headerTone}
                  showFooter={share.payload.showFooter}
                  footerLink={share.payload.footerLink}
                  footerStyle={share.payload.footerStyle}
                  footerSize={share.payload.footerSize}
                  exportRef={exportRef}
                />
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
