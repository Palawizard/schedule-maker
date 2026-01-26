"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import AuthStatus from "../components/AuthStatus";
import { withBasePath } from "@/lib/basePath";
import { getFreshSession } from "@/lib/supabase/session";
import { supabase } from "@/lib/supabase/client";
import {
  emptySchedulePayload,
  type ScheduleFile,
} from "../schedule/scheduleData";
import StorySchedulePreview from "../schedule/StorySchedulePreview";
import { getLayoutMode, getPreviewSize } from "../schedule/previewUtils";

type ScheduleRow = {
  id: string;
  name: string | null;
  payload: ScheduleFile;
  updated_at: string;
  created_at: string;
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

const getUniqueName = (base: string, existing: string[]) => {
  const normalized = existing.map((name) => name.toLowerCase());
  if (!normalized.includes(base.toLowerCase())) return base;
  let index = 2;
  while (normalized.includes(`${base.toLowerCase()} (${index})`)) {
    index += 1;
  }
  return `${base} (${index})`;
};

const clonePayload = (payload: ScheduleFile) =>
  JSON.parse(JSON.stringify(payload)) as ScheduleFile;

export default function SchedulesPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pendingRenameId, setPendingRenameId] = useState<string | null>(null);
  const [pendingRenameName, setPendingRenameName] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingShareId, setPendingShareId] = useState<string | null>(null);
  const [shareLink, setShareLink] = useState("");
  const [shareStatus, setShareStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [shareError, setShareError] = useState<string | null>(null);

  const scheduleNames = useMemo(
    () =>
      schedules.map(
        (schedule) =>
          schedule.name || schedule.payload.scheduleName || "Schedule",
      ),
    [schedules],
  );
  const pendingRenameSchedule = useMemo(
    () => schedules.find((schedule) => schedule.id === pendingRenameId) ?? null,
    [schedules, pendingRenameId],
  );
  const pendingDeleteSchedule = useMemo(
    () => schedules.find((schedule) => schedule.id === pendingDeleteId) ?? null,
    [schedules, pendingDeleteId],
  );
  const pendingShareSchedule = useMemo(
    () => schedules.find((schedule) => schedule.id === pendingShareId) ?? null,
    [schedules, pendingShareId],
  );

  const formatDate = (value: string) =>
    new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));

  const loadSchedules = async () => {
    setStatus("loading");
    setMessage(null);
    const { data, error } = await supabase
      .from("schedules")
      .select("id, name, payload, updated_at, created_at")
      .order("updated_at", { ascending: false });
    if (error) {
      setStatus("error");
      setMessage("Unable to load schedules.");
      return;
    }
    setSchedules((data as ScheduleRow[]) ?? []);
    setStatus("ready");
  };

  useEffect(() => {
    let active = true;

    const init = async () => {
      const session = await getFreshSession();
      if (!active) return;
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      if (nextUser) {
        await loadSchedules();
      } else {
        setStatus("ready");
      }
    };

    void init();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!active) return;
        const nextUser = session?.user ?? null;
        setUser(nextUser);
        if (nextUser) {
          await loadSchedules();
        } else {
          setSchedules([]);
          setStatus("ready");
        }
      },
    );

    return () => {
      active = false;
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const handleCreate = async () => {
    if (!user) return;
    setActiveId("create");
    setMessage(null);
    const baseName = "New schedule";
    const name = getUniqueName(baseName, scheduleNames);
    const payload = clonePayload(emptySchedulePayload);
    payload.scheduleName = name;

    const { data, error } = await supabase
      .from("schedules")
      .insert({ user_id: user.id, name, payload })
      .select("id, name, payload, updated_at, created_at")
      .single();

    if (error || !data) {
      setMessage("Unable to create schedule.");
      setActiveId(null);
      return;
    }

    const next = data as ScheduleRow;
    setSchedules((prev) => [next, ...prev]);
    setActiveId(null);
    router.push(`/schedule?id=${next.id}`);
  };

  const handleOpen = (id: string) => {
    router.push(`/schedule?id=${id}`);
  };

  const handleRename = async () => {
    if (!user || !pendingRenameId) return;
    const name = pendingRenameName.trim();
    if (!name) return;
    const current = schedules.find(
      (schedule) => schedule.id === pendingRenameId,
    );
    if (!current) return;

    setActiveId(pendingRenameId);
    setMessage(null);
    const payload = clonePayload(current.payload);
    payload.scheduleName = name;

    const { error } = await supabase
      .from("schedules")
      .update({ name, payload })
      .eq("id", pendingRenameId)
      .eq("user_id", user.id);

    if (error) {
      setMessage("Unable to rename schedule.");
      setActiveId(null);
      return;
    }

    setSchedules((prev) =>
      prev.map((schedule) =>
        schedule.id === pendingRenameId
          ? { ...schedule, name, payload }
          : schedule,
      ),
    );
    setPendingRenameId(null);
    setPendingRenameName("");
    setActiveId(null);
  };

  const handleDuplicate = async (schedule: ScheduleRow) => {
    if (!user) return;
    setActiveId(schedule.id);
    setMessage(null);
    const baseName = schedule.name || schedule.payload.scheduleName || "Schedule";
    const name = getUniqueName(`${baseName} (copy)`, scheduleNames);
    const payload = clonePayload(schedule.payload);
    payload.scheduleName = name;

    const { data, error } = await supabase
      .from("schedules")
      .insert({ user_id: user.id, name, payload })
      .select("id, name, payload, updated_at, created_at")
      .single();

    if (error || !data) {
      setMessage("Unable to duplicate schedule.");
      setActiveId(null);
      return;
    }

    setSchedules((prev) => [data as ScheduleRow, ...prev]);
    setActiveId(null);
  };

  const handleDeleteConfirm = async () => {
    if (!user || !pendingDeleteId) return;
    const current = schedules.find(
      (schedule) => schedule.id === pendingDeleteId,
    );
    if (!current) {
      setPendingDeleteId(null);
      return;
    }

    setActiveId(pendingDeleteId);
    setMessage(null);
    const { error } = await supabase
      .from("schedules")
      .delete()
      .eq("id", pendingDeleteId)
      .eq("user_id", user.id);

    if (error) {
      setMessage("Unable to delete schedule.");
      setActiveId(null);
      return;
    }

    setSchedules((prev) =>
      prev.filter((item) => item.id !== pendingDeleteId),
    );
    setPendingDeleteId(null);
    setActiveId(null);
  };

  const handleShare = async (schedule: ScheduleRow) => {
    setPendingShareId(schedule.id);
    setShareLink("");
    setShareStatus("loading");
    setShareError(null);

    const session = await getFreshSession();
    const token = session?.access_token;
    if (!token) {
      setShareStatus("error");
      setShareError("Sign in to create a share link.");
      return;
    }

    try {
      const response = await fetch(withBasePath("/api/share"), {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ scheduleId: schedule.id }),
      });
      if (!response.ok) {
        throw new Error("Unable to create share link.");
      }
      const payload = (await response.json()) as { shareToken?: string };
      if (!payload.shareToken) {
        throw new Error("Share token missing.");
      }
      const link = `${window.location.origin}${withBasePath(
        `/share/${payload.shareToken}`,
      )}`;
      setShareLink(link);
      setShareStatus("ready");
    } catch (error) {
      console.error("Failed to create share link", error);
      setShareStatus("error");
      setShareError("Unable to create share link.");
    }
  };

  const cancelRename = () => {
    setPendingRenameId(null);
    setPendingRenameName("");
  };

  const cancelDelete = () => {
    setPendingDeleteId(null);
  };

  const cancelShare = () => {
    setPendingShareId(null);
    setShareLink("");
    setShareStatus("idle");
    setShareError(null);
  };

  const handleCopyShare = async () => {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink);
    } catch (error) {
      console.error("Failed to copy share link", error);
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
            <div className="flex flex-wrap items-center gap-2">
              <AuthStatus />
              <Link
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                href="/"
              >
                Back home
              </Link>
            </div>
          </div>
        </header>

        <main className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-20 pt-6">
          <section className="rounded-4xl border border-slate-200 bg-white/90 p-8 shadow-[0_30px_70px_rgba(20,27,42,0.12)]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                  Your schedules
                </p>
                <h1 className="font-display mt-3 text-3xl text-slate-900">
                  Manage your studio lineup
                </h1>
                <p className="mt-2 text-sm text-slate-600">
                  Create, duplicate, and organize every schedule you build.
                </p>
              </div>
              {user ? (
                <button
                  className="rounded-full bg-(--accent) px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(242,107,58,0.28)] transition hover:bg-(--accent-strong) disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={activeId === "create"}
                  type="button"
                  onClick={handleCreate}
                >
                  New schedule
                </button>
              ) : null}
            </div>

            {!user ? (
              <div className="mt-6 rounded-3xl border border-slate-200 bg-(--paper) p-6 text-center">
                <p className="text-sm text-slate-600">
                  Sign in to view and manage your schedules.
                </p>
                <Link
                  className="mt-4 inline-flex rounded-full bg-(--accent) px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(242,107,58,0.28)] transition hover:bg-(--accent-strong)"
                  href="/account?next=/schedules"
                >
                  Sign in to continue
                </Link>
              </div>
            ) : status === "loading" ? (
              <p className="mt-6 text-sm text-slate-600">Loading schedules...</p>
            ) : (
              <div className="mt-8 space-y-4">
                {message ? (
                  <p className="text-sm font-semibold text-amber-600">
                    {message}
                  </p>
                ) : null}
                {status === "error" ? (
                  <div className="rounded-3xl border border-slate-200 bg-(--paper) p-6 text-sm text-slate-600">
                    Unable to load schedules. Try refreshing.
                  </div>
                ) : schedules.length === 0 ? (
                  <div className="rounded-3xl border border-slate-200 bg-(--paper) p-6 text-sm text-slate-600">
                    No schedules yet. Create your first schedule to get started.
                  </div>
                ) : (
                  <div className="grid gap-4 lg:grid-cols-2">
                    {schedules.map((schedule) => {
                      const title =
                        schedule.name ||
                        schedule.payload.scheduleName ||
                        "Schedule";
                      const previewDayId = schedule.payload.days[0]?.id ?? null;
                      const previewSize = getPreviewSize(schedule.payload);
                      const previewLayoutMode = getLayoutMode(schedule.payload);
                      return (
                        <div
                          key={schedule.id}
                          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(20,27,42,0.08)]"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                                Schedule
                              </p>
                              <h2 className="mt-2 text-xl font-semibold text-slate-900">
                                {title}
                              </h2>
                            </div>
                            <button
                              className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                              type="button"
                              onClick={() => handleOpen(schedule.id)}
                            >
                              Open
                            </button>
                          </div>
                          <div className="mt-4 text-xs text-slate-500">
                            <p>Updated: {formatDate(schedule.updated_at)}</p>
                            <p>Created: {formatDate(schedule.created_at)}</p>
                          </div>
                          <div className="mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-slate-950/90 p-3 shadow-[0_12px_30px_rgba(15,23,42,0.25)]">
                            <div className="pointer-events-none mx-auto w-full max-w-64">
                              <StorySchedulePreview
                                days={schedule.payload.days}
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
                                isExporting
                                canvasWidth={previewSize.width}
                                canvasHeight={previewSize.height}
                                layoutMode={previewLayoutMode}
                                showHeader={schedule.payload.showHeader}
                                headerTitle={schedule.payload.headerTitle}
                                headerAlignment={schedule.payload.headerAlignment}
                                headerTone={schedule.payload.headerTone}
                                showFooter={schedule.payload.showFooter}
                                footerLink={schedule.payload.footerLink}
                                footerStyle={schedule.payload.footerStyle}
                                footerSize={schedule.payload.footerSize}
                              />
                            </div>
                          </div>
                          <div className="mt-4 flex flex-wrap gap-2">
                            <button
                              className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-70"
                              disabled={activeId === schedule.id}
                              type="button"
                              onClick={() => {
                                setPendingRenameId(schedule.id);
                                setPendingRenameName(title);
                              }}
                            >
                              Rename
                            </button>
                            <button
                              className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-70"
                              disabled={activeId === schedule.id}
                              type="button"
                              onClick={() => handleDuplicate(schedule)}
                            >
                              Duplicate
                            </button>
                            <button
                              className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-70"
                              disabled={activeId === schedule.id}
                              type="button"
                              onClick={() => handleShare(schedule)}
                            >
                              Share
                            </button>
                            <button
                              className="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:border-rose-300 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
                              disabled={activeId === schedule.id}
                              type="button"
                              onClick={() => setPendingDeleteId(schedule.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </section>
        </main>
        {pendingRenameId ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4"
            onClick={cancelRename}
          >
            <div
              className="w-full max-w-sm rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_30px_80px_rgba(20,27,42,0.3)]"
              onClick={(event) => event.stopPropagation()}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Rename schedule
              </p>
              <h3 className="mt-2 font-display text-2xl text-slate-900">
                Update{" "}
                {pendingRenameSchedule?.name ||
                  pendingRenameSchedule?.payload.scheduleName ||
                  "this schedule"}
                ?
              </h3>
              <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                New name
              </label>
              <input
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none"
                maxLength={64}
                onChange={(event) => setPendingRenameName(event.target.value)}
                value={pendingRenameName}
              />
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={cancelRename}
                  className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRename}
                  disabled={
                    activeId === pendingRenameId ||
                    pendingRenameName.trim().length === 0
                  }
                  className="flex-1 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        ) : null}
        {pendingDeleteId ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4"
            onClick={cancelDelete}
          >
            <div
              className="w-full max-w-sm rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_30px_80px_rgba(20,27,42,0.3)]"
              onClick={(event) => event.stopPropagation()}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Delete schedule
              </p>
              <h3 className="mt-2 font-display text-2xl text-slate-900">
                Remove{" "}
                {pendingDeleteSchedule?.name ||
                  pendingDeleteSchedule?.payload.scheduleName ||
                  "this schedule"}
                ?
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                This will permanently delete the schedule and its content.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={cancelDelete}
                  className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  disabled={activeId === pendingDeleteId}
                  className="flex-1 rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ) : null}
        {pendingShareId ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4"
            onClick={cancelShare}
          >
            <div
              className="w-full max-w-sm rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_30px_80px_rgba(20,27,42,0.3)]"
              onClick={(event) => event.stopPropagation()}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Share preview
              </p>
              <h3 className="mt-2 font-display text-2xl text-slate-900">
                Share{" "}
                {pendingShareSchedule?.name ||
                  pendingShareSchedule?.payload.scheduleName ||
                  "this schedule"}
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Anyone with the link can view a read-only preview.
              </p>
              {shareStatus === "loading" ? (
                <p className="mt-4 text-sm text-slate-600">
                  Generating link...
                </p>
              ) : shareStatus === "error" ? (
                <p className="mt-4 text-sm text-amber-600">
                  {shareError ?? "Unable to create share link."}
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  <input
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
                    readOnly
                    value={shareLink}
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleCopyShare}
                      className="flex-1 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      Copy link
                    </button>
                    <a
                      className="flex-1 rounded-full border border-slate-300 px-4 py-2 text-center text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                      href={shareLink}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Open preview
                    </a>
                  </div>
                </div>
              )}
              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={cancelShare}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
