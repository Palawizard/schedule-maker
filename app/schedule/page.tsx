"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import { getFontEmbedCSS, toBlob, toPng } from "html-to-image";
import type { User } from "@supabase/supabase-js";
import AuthStatus from "../components/AuthStatus";
import { supabase } from "@/lib/supabase/client";
import StorySchedulePreview, {
  StoryDay,
  type PreviewTheme,
} from "./StorySchedulePreview";
import {
  type CustomExportSize,
  type ScheduleFile,
  initialDays,
} from "./scheduleData";

const weekDays = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

type ExportSizeOption = {
  id: string;
  label: string;
  width: number;
  height: number;
};

const exportSizes: ExportSizeOption[] = [
  { id: "story", label: "Story", width: 1080, height: 1920 },
  { id: "youtube", label: "YouTube post", width: 1280, height: 720 },
  { id: "x-vertical", label: "X vertical", width: 1080, height: 1920 },
  { id: "x-horizontal", label: "X horizontal", width: 1600, height: 900 },
];

const isExportSizeId = (value: string) =>
  exportSizes.some((size) => size.id === value) ||
  value === "custom-vertical" ||
  value === "custom-horizontal";

const scheduleCookiePrefix = "pala-schedule-draft-v2";
const scheduleCookieMaxAgeSeconds = 60 * 60 * 24 * 30;
const getScheduleCookieName = (scheduleId: string) =>
  `${scheduleCookiePrefix}-${scheduleId}`;

const readCookie = (name: string) => {
  if (typeof document === "undefined") return null;
  const entry = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  if (!entry) return null;
  const value = entry.slice(name.length + 1);
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const writeCookie = (name: string, value: string, maxAgeSeconds: number) => {
  if (typeof document === "undefined" || typeof window === "undefined") return;
  const encoded = encodeURIComponent(value);
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encoded}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${secure}`;
};

const fontMimeTypes: Record<string, string> = {
  woff2: "font/woff2",
  woff: "font/woff",
  ttf: "font/ttf",
  otf: "font/otf",
  eot: "application/vnd.ms-fontobject",
};

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onloadend = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });

const inlineFontUrls = async (
  cssText: string,
  baseUrl: string | null,
  cache: Map<string, string>,
) => {
  const urlRegex = /url\((['"]?)([^'")]+)\1\)/g;
  const matches = Array.from(cssText.matchAll(urlRegex));
  let result = cssText;

  for (const match of matches) {
    const original = match[0];
    const url = match[2];
    if (!url || url.startsWith("data:")) continue;
    const absoluteUrl = (() => {
      try {
        return new URL(url, baseUrl ?? window.location.href).href;
      } catch {
        return url;
      }
    })();
    let dataUrl = cache.get(absoluteUrl);
    if (!dataUrl) {
      try {
        const response = await fetch(absoluteUrl);
        if (!response.ok) continue;
        const blob = await response.blob();
        const ext = absoluteUrl.split(".").pop()?.toLowerCase() ?? "";
        const mime = blob.type || fontMimeTypes[ext] || "application/octet-stream";
        const typedBlob =
          blob.type === mime ? blob : blob.slice(0, blob.size, mime);
        dataUrl = await blobToDataUrl(typedBlob);
        cache.set(absoluteUrl, dataUrl);
      } catch {
        continue;
      }
    }
    result = result.replace(original, `url("${dataUrl}")`);
  }

  return result;
};

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

  const fontFaceRules: Array<{ cssText: string; baseUrl: string | null }> = [];
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList | undefined;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    if (!rules) continue;
    for (const rule of Array.from(rules)) {
      if (rule.type === CSSRule.FONT_FACE_RULE) {
        fontFaceRules.push({ cssText: rule.cssText, baseUrl: sheet.href });
      }
    }
  }

  if (fontFaceRules.length === 0) return "";
  const cache = new Map<string, string>();
  const inlined = await Promise.all(
    fontFaceRules.map((rule) =>
      inlineFontUrls(rule.cssText, rule.baseUrl, cache),
    ),
  );
  return Array.from(new Set(inlined)).join("\n");
};

type FlagKey =
  | "uk"
  | "us"
  | "eu"
  | "jp"
  | "au"
  | "fr"
  | "de"
  | "es"
  | "it"
  | "br"
  | "in"
  | "kr"
  | "globe";

type TimeZoneOption = {
  id: string;
  label: string;
};

type SlotZoneOption = {
  id: string;
  label: string;
  timeZone: string | null;
  flag: FlagKey;
  description: string;
};

const defaultTimeZones: TimeZoneOption[] = [
  { id: "Europe/Paris", label: "Paris (CET)" },
  { id: "Europe/London", label: "London (UK)" },
  { id: "America/New_York", label: "US Eastern (ET)" },
  { id: "America/Chicago", label: "US Central (CT)" },
  { id: "America/Denver", label: "US Mountain (MT)" },
  { id: "America/Los_Angeles", label: "US Pacific (PT)" },
  { id: "Asia/Tokyo", label: "Tokyo (JST)" },
  { id: "Australia/Sydney", label: "Sydney (AET)" },
  { id: "UTC", label: "UTC" },
];

const slotZoneOptions: SlotZoneOption[] = [
  {
    id: "uk",
    label: "UK",
    timeZone: "Europe/London",
    flag: "uk",
    description: "Europe/London",
  },
  {
    id: "us-et",
    label: "US (ET)",
    timeZone: "America/New_York",
    flag: "us",
    description: "America/New_York",
  },
  {
    id: "us-ct",
    label: "US (CT)",
    timeZone: "America/Chicago",
    flag: "us",
    description: "America/Chicago",
  },
  {
    id: "us-mt",
    label: "US (MT)",
    timeZone: "America/Denver",
    flag: "us",
    description: "America/Denver",
  },
  {
    id: "us-pt",
    label: "US (PT)",
    timeZone: "America/Los_Angeles",
    flag: "us",
    description: "America/Los_Angeles",
  },
  {
    id: "cet",
    label: "Central Europe",
    timeZone: "Europe/Paris",
    flag: "eu",
    description: "Europe/Paris",
  },
  {
    id: "fr",
    label: "France",
    timeZone: "Europe/Paris",
    flag: "fr",
    description: "Europe/Paris",
  },
  {
    id: "de",
    label: "Germany",
    timeZone: "Europe/Berlin",
    flag: "de",
    description: "Europe/Berlin",
  },
  {
    id: "es",
    label: "Spain",
    timeZone: "Europe/Madrid",
    flag: "es",
    description: "Europe/Madrid",
  },
  {
    id: "it",
    label: "Italy",
    timeZone: "Europe/Rome",
    flag: "it",
    description: "Europe/Rome",
  },
  {
    id: "br",
    label: "Brazil",
    timeZone: "America/Sao_Paulo",
    flag: "br",
    description: "America/Sao_Paulo",
  },
  {
    id: "in",
    label: "India",
    timeZone: "Asia/Kolkata",
    flag: "in",
    description: "Asia/Kolkata",
  },
  {
    id: "kr",
    label: "Korea",
    timeZone: "Asia/Seoul",
    flag: "kr",
    description: "Asia/Seoul",
  },
  {
    id: "utc",
    label: "UTC",
    timeZone: "UTC",
    flag: "globe",
    description: "UTC",
  },
  {
    id: "jst",
    label: "Japan",
    timeZone: "Asia/Tokyo",
    flag: "jp",
    description: "Asia/Tokyo",
  },
  {
    id: "aet",
    label: "Australia",
    timeZone: "Australia/Sydney",
    flag: "au",
    description: "Australia/Sydney",
  },
  {
    id: "custom",
    label: "Custom",
    timeZone: null,
    flag: "globe",
    description: "Manual entry",
  },
];

type ThemeBackgroundOption = {
  id: string;
  label: string;
  description: string;
  background: string;
  thumbOverlay: string;
};


type ThemeFontOption = {
  id: string;
  label: string;
  description: string;
  body: string;
  heading: string;
};

type ThemeCardStyleOption = {
  id: string;
  label: string;
  description: string;
  surface: string;
  surfaceStrong: string;
};

type ThemeBorderOption = {
  id: string;
  label: string;
  description: string;
  frameRadius: number;
  cardRadius: number;
};

type ThemeBorderWeightOption = {
  id: string;
  label: string;
  description: string;
  frameBorderWidth: number;
  cardBorderWidth: number;
};

const themeBackgrounds: ThemeBackgroundOption[] = [
  {
    id: "nebula",
    label: "Nebula",
    description: "Violet and cyan haze",
    background:
      "radial-gradient(820px 560px at 22% 14%, rgba(124,58,237,0.28), transparent 64%)," +
      "radial-gradient(820px 600px at 84% 22%, rgba(34,211,238,0.16), transparent 66%)," +
      "linear-gradient(180deg, rgb(9,7,24), rgb(11,7,34))",
    thumbOverlay:
      "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(34,211,238,0.14))",
  },
  {
    id: "sunset",
    label: "Sunset",
    description: "Warm orange glow",
    background:
      "radial-gradient(820px 560px at 20% 16%, rgba(251,146,60,0.28), transparent 64%)," +
      "radial-gradient(760px 560px at 82% 20%, rgba(244,63,94,0.22), transparent 60%)," +
      "linear-gradient(180deg, rgb(20,7,16), rgb(34,10,22))",
    thumbOverlay:
      "linear-gradient(135deg, rgba(251,146,60,0.2), rgba(244,63,94,0.16))",
  },
  {
    id: "coast",
    label: "Coast",
    description: "Cool teal drift",
    background:
      "radial-gradient(820px 560px at 20% 16%, rgba(14,165,233,0.26), transparent 64%)," +
      "radial-gradient(760px 560px at 82% 22%, rgba(45,212,191,0.2), transparent 60%)," +
      "linear-gradient(180deg, rgb(7,12,24), rgb(9,20,32))",
    thumbOverlay:
      "linear-gradient(135deg, rgba(14,165,233,0.2), rgba(45,212,191,0.14))",
  },
  {
    id: "graphite",
    label: "Graphite",
    description: "Minimal charcoal",
    background:
      "radial-gradient(760px 500px at 18% 18%, rgba(148,163,184,0.2), transparent 60%)," +
      "radial-gradient(760px 520px at 82% 26%, rgba(71,85,105,0.24), transparent 60%)," +
      "linear-gradient(180deg, rgb(10,12,16), rgb(20,24,30))",
    thumbOverlay:
      "linear-gradient(135deg, rgba(148,163,184,0.18), rgba(71,85,105,0.12))",
  },
  {
    id: "garden",
    label: "Garden",
    description: "Fresh green glow",
    background:
      "radial-gradient(820px 560px at 20% 16%, rgba(34,197,94,0.24), transparent 64%)," +
      "radial-gradient(760px 560px at 82% 24%, rgba(132,204,22,0.2), transparent 60%)," +
      "linear-gradient(180deg, rgb(8,16,12), rgb(12,24,16))",
    thumbOverlay:
      "linear-gradient(135deg, rgba(34,197,94,0.2), rgba(132,204,22,0.14))",
  },
];

const basePalette = {
  accent: "#38bdf8",
  accentSoft: "rgba(56,189,248,0.2)",
  accentGlow: "rgba(56,189,248,0.55)",
  border: "rgba(255,255,255,0.22)",
  live: "#f87171",
  liveGlow: "rgba(248,113,113,0.2)",
};

const themeFonts: ThemeFontOption[] = [
  {
    id: "grotesk-fraunces",
    label: "Grotesk / Fraunces",
    description: "Clean body, serif accents",
    body: 'var(--font-space-grotesk), "Segoe UI", sans-serif',
    heading: 'var(--font-fraunces), var(--font-space-grotesk), serif',
  },
  {
    id: "fraunces-grotesk",
    label: "Fraunces / Grotesk",
    description: "Serif body, clean accents",
    body: 'var(--font-fraunces), var(--font-space-grotesk), serif',
    heading: 'var(--font-space-grotesk), "Segoe UI", sans-serif',
  },
  {
    id: "grotesk-only",
    label: "Grotesk only",
    description: "Mono sans look",
    body: 'var(--font-space-grotesk), "Segoe UI", sans-serif',
    heading: 'var(--font-space-grotesk), "Segoe UI", sans-serif',
  },
  {
    id: "fraunces-only",
    label: "Fraunces only",
    description: "Bold editorial",
    body: 'var(--font-fraunces), var(--font-space-grotesk), serif',
    heading: 'var(--font-fraunces), var(--font-space-grotesk), serif',
  },
  {
    id: "sora-playfair",
    label: "Sora / Playfair",
    description: "Geometric body, classic display",
    body: 'var(--font-sora), "Segoe UI", sans-serif',
    heading: 'var(--font-playfair-display), var(--font-fraunces), serif',
  },
  {
    id: "playfair-sora",
    label: "Playfair / Sora",
    description: "Editorial body, crisp sans",
    body: 'var(--font-playfair-display), var(--font-fraunces), serif',
    heading: 'var(--font-sora), var(--font-space-grotesk), sans-serif',
  },
  {
    id: "manrope-fraunces",
    label: "Manrope / Fraunces",
    description: "Friendly sans, elegant serif",
    body: 'var(--font-manrope), "Segoe UI", sans-serif',
    heading: 'var(--font-fraunces), var(--font-playfair-display), serif',
  },
  {
    id: "manrope-only",
    label: "Manrope only",
    description: "Modern sans focus",
    body: 'var(--font-manrope), "Segoe UI", sans-serif',
    heading: 'var(--font-manrope), "Segoe UI", sans-serif',
  },
  {
    id: "sora-only",
    label: "Sora only",
    description: "Crisp geometric sans",
    body: 'var(--font-sora), "Segoe UI", sans-serif',
    heading: 'var(--font-sora), "Segoe UI", sans-serif',
  },
];

const themeCardStyles: ThemeCardStyleOption[] = [
  {
    id: "glass",
    label: "Glass",
    description: "Airy and translucent",
    surface: "rgba(255,255,255,0.08)",
    surfaceStrong: "rgba(255,255,255,0.16)",
  },
  {
    id: "mist",
    label: "Mist",
    description: "Smoky contrast",
    surface: "rgba(15,23,42,0.35)",
    surfaceStrong: "rgba(15,23,42,0.55)",
  },
  {
    id: "crisp",
    label: "Crisp",
    description: "Bright edges",
    surface: "rgba(255,255,255,0.12)",
    surfaceStrong: "rgba(255,255,255,0.22)",
  },
];

const themeBorders: ThemeBorderOption[] = [
  {
    id: "soft",
    label: "Soft",
    description: "Rounded corners",
    frameRadius: 38,
    cardRadius: 28,
  },
  {
    id: "sharp",
    label: "Sharp",
    description: "Tighter cuts",
    frameRadius: 22,
    cardRadius: 16,
  },
  {
    id: "pill",
    label: "Pill",
    description: "Extra round",
    frameRadius: 58,
    cardRadius: 40,
  },
];

const themeBorderWeights: ThemeBorderWeightOption[] = [
  {
    id: "hairline",
    label: "Hairline",
    description: "1px strokes",
    frameBorderWidth: 1,
    cardBorderWidth: 1,
  },
  {
    id: "medium",
    label: "Medium",
    description: "2px strokes",
    frameBorderWidth: 2,
    cardBorderWidth: 2,
  },
  {
    id: "bold",
    label: "Bold",
    description: "3px strokes",
    frameBorderWidth: 3,
    cardBorderWidth: 3,
  },
];

const flagKeys: FlagKey[] = [
  "uk",
  "us",
  "eu",
  "jp",
  "au",
  "fr",
  "de",
  "es",
  "it",
  "br",
  "in",
  "kr",
  "globe",
];

const flagKeySet = new Set(flagKeys);

const isFlagKey = (value: unknown): value is FlagKey =>
  typeof value === "string" && flagKeySet.has(value as FlagKey);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getString = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback;

const getBoolean = (value: unknown, fallback = false) =>
  typeof value === "boolean" ? value : fallback;

const getPositiveNumber = (value: unknown, fallback: number) => {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value, 10)
        : Number.NaN;
  if (!Number.isFinite(numeric) || numeric <= 0) return fallback;
  return Math.round(numeric);
};

const getArray = <T,>(value: unknown): T[] =>
  Array.isArray(value) ? (value as T[]) : [];

const getMaxIdValue = (id: string) => {
  const matches = id.match(/\d+/g);
  if (!matches) return null;
  return matches.reduce((max, match) => {
    const value = Number.parseInt(match, 10);
    if (Number.isNaN(value)) return max;
    return Math.max(max, value);
  }, -1);
};

const parseTimeValue = (value: string) => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return { hours, minutes };
};

const getTimeZoneOffset = (date: Date, timeZone: string) => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const asUTC = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  );
  return (asUTC - date.getTime()) / 60000;
};

const buildBaseDate = (baseTime: string, baseTimeZone: string) => {
  const parsed = parseTimeValue(baseTime);
  if (!parsed) return null;
  const now = new Date();
  const utcDate = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      parsed.hours,
      parsed.minutes,
      0,
    ),
  );
  const offset = getTimeZoneOffset(utcDate, baseTimeZone);
  return new Date(utcDate.getTime() - offset * 60000);
};

const formatTimeInZone = (date: Date, timeZone: string) =>
  new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);

const resolveThumbUrl = (value: string) => {
  if (!value) return "";
  if (
    value.startsWith("blob:") ||
    value.startsWith("data:") ||
    value.startsWith("/api/image-proxy?url=")
  ) {
    return value;
  }
  if (/^https?:\/\//i.test(value)) {
    return `/api/image-proxy?url=${encodeURIComponent(value)}`;
  }
  return value;
};

function FlagIcon({ flag }: { flag: FlagKey }) {
  if (flag === "uk") {
    return (
      <svg viewBox="0 0 60 42" xmlns="http://www.w3.org/2000/svg">
        <rect width="60" height="42" fill="#012169" />
        <path d="M0,0 L60,42 M60,0 L0,42" stroke="#FFF" strokeWidth="8" />
        <path d="M0,0 L60,42 M60,0 L0,42" stroke="#C8102E" strokeWidth="4" />
        <path d="M30,0 V42 M0,21 H60" stroke="#FFF" strokeWidth="14" />
        <path d="M30,0 V42 M0,21 H60" stroke="#C8102E" strokeWidth="8" />
      </svg>
    );
  }
  if (flag === "us") {
    return (
      <svg viewBox="0 0 60 42" xmlns="http://www.w3.org/2000/svg">
        <rect width="60" height="42" fill="#FFF" />
        <g fill="#B22234">
          <rect y="0" width="60" height="4" />
          <rect y="8" width="60" height="4" />
          <rect y="16" width="60" height="4" />
          <rect y="24" width="60" height="4" />
          <rect y="32" width="60" height="4" />
          <rect y="40" width="60" height="2" />
        </g>
        <rect width="26" height="22" fill="#3C3B6E" />
      </svg>
    );
  }
  if (flag === "eu") {
    return (
      <svg viewBox="0 0 60 42" xmlns="http://www.w3.org/2000/svg">
        <rect width="60" height="42" fill="#1e3a8a" />
        <circle cx="30" cy="10" r="2" fill="#facc15" />
        <circle cx="38" cy="12" r="2" fill="#facc15" />
        <circle cx="44" cy="18" r="2" fill="#facc15" />
        <circle cx="44" cy="26" r="2" fill="#facc15" />
        <circle cx="38" cy="32" r="2" fill="#facc15" />
        <circle cx="30" cy="34" r="2" fill="#facc15" />
        <circle cx="22" cy="32" r="2" fill="#facc15" />
        <circle cx="16" cy="26" r="2" fill="#facc15" />
        <circle cx="16" cy="18" r="2" fill="#facc15" />
        <circle cx="22" cy="12" r="2" fill="#facc15" />
      </svg>
    );
  }
  if (flag === "jp") {
    return (
      <svg viewBox="0 0 60 42" xmlns="http://www.w3.org/2000/svg">
        <rect width="60" height="42" fill="#FFF" />
        <circle cx="30" cy="21" r="10" fill="#D7002D" />
      </svg>
    );
  }
  if (flag === "au") {
    return (
      <svg viewBox="0 0 60 42" xmlns="http://www.w3.org/2000/svg">
        <rect width="60" height="42" fill="#0F1C6B" />
        <circle cx="18" cy="16" r="6" fill="#FFF" />
        <circle cx="44" cy="28" r="4" fill="#FDE047" />
      </svg>
    );
  }
  if (flag === "fr") {
    return (
      <svg viewBox="0 0 60 42" xmlns="http://www.w3.org/2000/svg">
        <rect width="20" height="42" fill="#0055A4" />
        <rect x="20" width="20" height="42" fill="#FFF" />
        <rect x="40" width="20" height="42" fill="#EF4135" />
      </svg>
    );
  }
  if (flag === "de") {
    return (
      <svg viewBox="0 0 60 42" xmlns="http://www.w3.org/2000/svg">
        <rect width="60" height="14" fill="#000" />
        <rect y="14" width="60" height="14" fill="#DD0000" />
        <rect y="28" width="60" height="14" fill="#FFCE00" />
      </svg>
    );
  }
  if (flag === "es") {
    return (
      <svg viewBox="0 0 60 42" xmlns="http://www.w3.org/2000/svg">
        <rect width="60" height="10" fill="#AA151B" />
        <rect y="10" width="60" height="22" fill="#F1BF00" />
        <rect y="32" width="60" height="10" fill="#AA151B" />
      </svg>
    );
  }
  if (flag === "it") {
    return (
      <svg viewBox="0 0 60 42" xmlns="http://www.w3.org/2000/svg">
        <rect width="20" height="42" fill="#009246" />
        <rect x="20" width="20" height="42" fill="#FFF" />
        <rect x="40" width="20" height="42" fill="#CE2B37" />
      </svg>
    );
  }
  if (flag === "br") {
    return (
      <svg viewBox="0 0 60 42" xmlns="http://www.w3.org/2000/svg">
        <rect width="60" height="42" fill="#009C3B" />
        <polygon points="30,6 54,21 30,36 6,21" fill="#FFDF00" />
        <circle cx="30" cy="21" r="8" fill="#002776" />
      </svg>
    );
  }
  if (flag === "in") {
    return (
      <svg viewBox="0 0 60 42" xmlns="http://www.w3.org/2000/svg">
        <rect width="60" height="14" fill="#FF9933" />
        <rect y="14" width="60" height="14" fill="#FFF" />
        <rect y="28" width="60" height="14" fill="#138808" />
        <circle cx="30" cy="21" r="4" fill="#000080" />
      </svg>
    );
  }
  if (flag === "kr") {
    return (
      <svg viewBox="0 0 60 42" xmlns="http://www.w3.org/2000/svg">
        <rect width="60" height="42" fill="#FFF" />
        <path
          d="M30 11 A10 10 0 0 1 40 21 A10 10 0 0 1 20 21 A10 10 0 0 1 30 11 Z"
          fill="#CD2E3A"
        />
        <path
          d="M30 31 A10 10 0 0 1 20 21 A10 10 0 0 1 40 21 A10 10 0 0 1 30 31 Z"
          fill="#0047A0"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 60 42" xmlns="http://www.w3.org/2000/svg">
      <rect width="60" height="42" fill="#0f172a" />
      <circle cx="30" cy="21" r="14" fill="none" stroke="#38bdf8" strokeWidth="2" />
      <path d="M16,21 H44" stroke="#38bdf8" strokeWidth="2" />
      <path d="M30,7 V35" stroke="#38bdf8" strokeWidth="2" />
      <ellipse cx="30" cy="21" rx="6" ry="14" fill="none" stroke="#38bdf8" strokeWidth="2" />
    </svg>
  );
}

type Stream = StoryDay["streams"][number];
type TimeSlot = Stream["times"][number];

type SelectedElement =
  | { type: "day"; id: string }
  | { type: "header" }
  | { type: "footer" }
  | null;

export default function SchedulePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const scheduleId = useMemo(() => searchParams.get("id"), [searchParams]);
  const idRef = useRef(100);
  const previewRef = useRef<HTMLDivElement>(null);
  const scheduleFileInputRef = useRef<HTMLInputElement>(null);
  const lastPersistedRef = useRef<string | null>(null);
  const persistTimeoutRef = useRef<number | null>(null);
  const [scheduleName, setScheduleName] = useState("Week 24");
  const [timeZoneOptions, setTimeZoneOptions] =
    useState<TimeZoneOption[]>(defaultTimeZones);
  const [scheduleTimeZone, setScheduleTimeZone] = useState(
    defaultTimeZones[0]?.id ?? "UTC",
  );
  const [days, setDays] = useState<StoryDay[]>(initialDays);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(
    initialDays[0]?.id ?? null,
  );
  const [selectedStreamId, setSelectedStreamId] = useState<string | null>(
    initialDays[0]?.streams[0]?.id ?? null,
  );
  const [selectedElement, setSelectedElement] = useState<SelectedElement>(
    initialDays[0]?.id ? { type: "day", id: initialDays[0].id } : null,
  );
  const [showHeader, setShowHeader] = useState(false);
  const [headerTitle, setHeaderTitle] = useState("Weekly Schedule");
  const [headerAlignment, setHeaderAlignment] = useState<"left" | "center">(
    "left",
  );
  const [headerTone, setHeaderTone] = useState<"bright" | "soft">("bright");
  const [showFooter, setShowFooter] = useState(true);
  const [footerLink, setFooterLink] = useState("twitch.tv/yourname");
  const [footerStyle, setFooterStyle] = useState<"solid" | "glass">("solid");
  const [footerSize, setFooterSize] = useState<"regular" | "compact">(
    "regular",
  );
  const [exportSizeId, setExportSizeId] = useState(
    exportSizes[0]?.id ?? "story",
  );
  const [customVerticalSize, setCustomVerticalSize] =
    useState<CustomExportSize>({
      width: 1080,
      height: 1920,
    });
  const [customHorizontalSize, setCustomHorizontalSize] =
    useState<CustomExportSize>({
      width: 1920,
      height: 1080,
    });
  const [themeBackgroundId, setThemeBackgroundId] = useState(
    themeBackgrounds[0]?.id ?? "nebula",
  );
  const [themeFontId, setThemeFontId] = useState(
    themeFonts[0]?.id ?? "grotesk-fraunces",
  );
  const [themeCardStyleId, setThemeCardStyleId] = useState(
    themeCardStyles[0]?.id ?? "glass",
  );
  const [themeBorderId, setThemeBorderId] = useState(
    themeBorders[0]?.id ?? "soft",
  );
  const [themeBorderWeightId, setThemeBorderWeightId] = useState(
    themeBorderWeights[0]?.id ?? "hairline",
  );
  const [activeEmojiPickerId, setActiveEmojiPickerId] = useState<string | null>(
    null,
  );
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [exportRequested, setExportRequested] = useState(false);
  const [copyRequested, setCopyRequested] = useState(false);
  const [isExportingView, setIsExportingView] = useState(false);
  const [canCopyToClipboard, setCanCopyToClipboard] = useState(false);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [scheduleRecordId, setScheduleRecordId] = useState<string | null>(null);
  const [scheduleLoadError, setScheduleLoadError] = useState<string | null>(
    null,
  );
  const [isScheduleReady, setIsScheduleReady] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareStatus, setShareStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [shareLink, setShareLink] = useState("");
  const [shareError, setShareError] = useState<string | null>(null);
  const [pendingDeleteDayId, setPendingDeleteDayId] = useState<string | null>(
    null,
  );
  const [pendingDeleteStream, setPendingDeleteStream] = useState<{
    dayId: string;
    streamId: string;
  } | null>(null);
  const [pendingClearAll, setPendingClearAll] = useState(false);
  const [localThumbNames, setLocalThumbNames] = useState<Record<string, string>>(
    {},
  );
  const [scheduleFileError, setScheduleFileError] = useState<string | null>(null);
  const objectUrlsRef = useRef<Record<string, string>>({});

  const selectedDay = useMemo(
    () => days.find((day) => day.id === selectedDayId) ?? null,
    [days, selectedDayId],
  );
  const selectedStream = useMemo(() => {
    if (!selectedDay) return null;
    if (!selectedStreamId) return selectedDay.streams[0] ?? null;
    return (
      selectedDay.streams.find((stream) => stream.id === selectedStreamId) ??
      selectedDay.streams[0] ??
      null
    );
  }, [selectedDay, selectedStreamId]);
  const pendingDeleteDay = useMemo(
    () => days.find((day) => day.id === pendingDeleteDayId) ?? null,
    [days, pendingDeleteDayId],
  );
  const pendingDeleteStreamInfo = useMemo(() => {
    if (!pendingDeleteStream) return null;
    const day = days.find((entry) => entry.id === pendingDeleteStream.dayId);
    if (!day) return null;
    const stream = day.streams.find(
      (entry) => entry.id === pendingDeleteStream.streamId,
    );
    if (!stream) return null;
    return { day, stream };
  }, [days, pendingDeleteStream]);
  const syncCustomVerticalSize = (next: CustomExportSize) => {
    setCustomVerticalSize((prev) => ({
      width: getPositiveNumber(next.width, prev.width),
      height: getPositiveNumber(next.height, prev.height),
    }));
  };
  const syncCustomHorizontalSize = (next: CustomExportSize) => {
    setCustomHorizontalSize((prev) => ({
      width: getPositiveNumber(next.width, prev.width),
      height: getPositiveNumber(next.height, prev.height),
    }));
  };
  const exportSizeOptions = useMemo(
    () => [
      ...exportSizes,
      {
        id: "custom-vertical",
        label: "Custom vertical (portrait)",
        width: customVerticalSize.width,
        height: customVerticalSize.height,
      },
      {
        id: "custom-horizontal",
        label: "Custom horizontal (landscape)",
        width: customHorizontalSize.width,
        height: customHorizontalSize.height,
      },
    ],
    [customHorizontalSize, customVerticalSize],
  );
  const selectedExport = useMemo(
    () =>
      exportSizeOptions.find((size) => size.id === exportSizeId) ??
      exportSizeOptions[0],
    [exportSizeId, exportSizeOptions],
  );
  const selectedThemeBackground = useMemo(
    () =>
      themeBackgrounds.find((option) => option.id === themeBackgroundId) ??
      themeBackgrounds[0],
    [themeBackgroundId],
  );
  const selectedThemeFont = useMemo(
    () =>
      themeFonts.find((option) => option.id === themeFontId) ??
      themeFonts[0],
    [themeFontId],
  );
  const selectedThemeCardStyle = useMemo(
    () =>
      themeCardStyles.find((option) => option.id === themeCardStyleId) ??
      themeCardStyles[0],
    [themeCardStyleId],
  );
  const selectedThemeBorder = useMemo(
    () =>
      themeBorders.find((option) => option.id === themeBorderId) ??
      themeBorders[0],
    [themeBorderId],
  );
  const selectedThemeBorderWeight = useMemo(
    () =>
      themeBorderWeights.find((option) => option.id === themeBorderWeightId) ??
      themeBorderWeights[0],
    [themeBorderWeightId],
  );
  const exportWidth = selectedExport?.width ?? 1080;
  const exportHeight = selectedExport?.height ?? 1920;
  const layoutMode = useMemo<"portrait" | "landscape">(() => {
    if (exportSizeId === "custom-vertical") return "portrait";
    if (exportSizeId === "custom-horizontal") return "landscape";
    return exportWidth > exportHeight ? "landscape" : "portrait";
  }, [exportHeight, exportSizeId, exportWidth]);
  const previewTheme = useMemo<PreviewTheme>(
    () => ({
      background: selectedThemeBackground.background,
      thumbOverlay: selectedThemeBackground.thumbOverlay,
      accent: basePalette.accent,
      accentSoft: basePalette.accentSoft,
      accentGlow: basePalette.accentGlow,
      borderColor: basePalette.border,
      cardSurface: selectedThemeCardStyle.surface,
      cardSurfaceStrong: selectedThemeCardStyle.surfaceStrong,
      frameRadius: selectedThemeBorder.frameRadius,
      cardRadius: selectedThemeBorder.cardRadius,
      frameBorderWidth: selectedThemeBorderWeight.frameBorderWidth,
      cardBorderWidth: selectedThemeBorderWeight.cardBorderWidth,
      bodyFont: selectedThemeFont.body,
      headingFont: selectedThemeFont.heading,
      liveColor: basePalette.live,
      liveGlow: basePalette.liveGlow,
    }),
    [
      selectedThemeBackground,
      selectedThemeCardStyle,
      selectedThemeBorder,
      selectedThemeBorderWeight,
      selectedThemeFont,
    ],
  );
  const slotZoneMap = useMemo(
    () => new Map(slotZoneOptions.map((option) => [option.id, option])),
    [],
  );
  const scheduleTimeZoneLabel = useMemo(
    () =>
      timeZoneOptions.find((option) => option.id === scheduleTimeZone)?.label ??
      scheduleTimeZone,
    [scheduleTimeZone, timeZoneOptions],
  );
  useEffect(() => {
    let active = true;
    setScheduleLoadError(null);

    const loadFromCookie = () => {
      if (!scheduleId) return null;
      const stored = readCookie(getScheduleCookieName(scheduleId));
      if (!stored) return null;
      try {
        const parsed = JSON.parse(stored) as unknown;
        return normalizeScheduleFile(parsed);
      } catch (error) {
        console.warn("Failed to parse schedule cookie", error);
        return null;
      }
    };

    const loadFromAccount = async (user: User, id: string) => {
      const { data, error } = await supabase
        .from("schedules")
        .select("id, payload")
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (error || !data?.payload) return null;
      if (active) {
        setScheduleRecordId(data.id);
      }
      return normalizeScheduleFile(data.payload);
    };

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      const nextUser = data.session?.user ?? null;
      setAuthUser(nextUser);
      if (!nextUser) {
        if (active) {
          setIsScheduleReady(true);
        }
        return;
      }
      if (!scheduleId) {
        if (active) {
          setIsScheduleReady(true);
        }
        return;
      }

      let payload: ScheduleFile | null = null;
      payload = await loadFromAccount(nextUser, scheduleId);
      if (!payload) {
        payload = loadFromCookie();
      }
      if (payload && active) {
        applyLoadedSchedule(payload);
      } else if (active) {
        setScheduleLoadError("Schedule not found.");
      }
      if (active) {
        setIsScheduleReady(true);
      }
    };

    void init();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!active) return;
        setAuthUser(session?.user ?? null);
      },
    );

    return () => {
      active = false;
      authListener?.subscription.unsubscribe();
    };
  }, [scheduleId]);
  useEffect(() => {
    lastPersistedRef.current = null;
    setScheduleRecordId(null);
  }, [scheduleId]);
  useEffect(() => {
    if (!isScheduleReady || !authUser) return;
    if (!scheduleId) {
      router.replace("/schedules");
    }
  }, [authUser, isScheduleReady, scheduleId, router]);
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
  const getSlotDisplay = useMemo(
    () =>
      (slot: TimeSlot, baseTime: string) => {
        if (slot.zoneId === "custom") {
          return {
            label: slot.customLabel || slot.customZone || "Custom",
            time: slot.customTime || "--:--",
            flag: slot.customFlag,
          };
        }
        const zone = slotZoneMap.get(slot.zoneId);
        if (!zone || !zone.timeZone) {
          return {
            label: slot.customLabel || slot.customZone || "Custom",
            time: slot.customTime || "--:--",
            flag: slot.customFlag,
          };
        }
        const baseDate = buildBaseDate(baseTime, scheduleTimeZone);
        const time = baseDate
          ? formatTimeInZone(baseDate, zone.timeZone)
          : "--:--";
        return {
          label: zone.label,
          time,
          flag: zone.flag,
        };
      },
    [scheduleTimeZone, slotZoneMap],
  );
  const previewDays = useMemo(
    () =>
      days.map((day) => ({
        ...day,
        streams: day.streams.map((stream) => ({
          ...stream,
          thumbUrl: resolveThumbUrl(stream.thumbUrl),
          times: stream.times.map((slot) => {
            const display = getSlotDisplay(slot, stream.baseTime);
            return {
              ...slot,
              label: display.label,
              time: display.time,
              flag: display.flag,
            };
          }),
        })),
      })),
    [days, getSlotDisplay],
  );
  const schedulePayload = useMemo<ScheduleFile>(
    () => ({
      version: 2,
      scheduleName,
      scheduleTimeZone,
      exportSizeId,
      customVerticalSize,
      customHorizontalSize,
      showHeader,
      headerTitle,
      headerAlignment,
      headerTone,
      showFooter,
      footerLink,
      footerStyle,
      footerSize,
      theme: {
        backgroundId: themeBackgroundId,
        fontId: themeFontId,
        cardStyleId: themeCardStyleId,
        borderId: themeBorderId,
        borderWeightId: themeBorderWeightId,
      },
      days,
    }),
    [
      scheduleName,
      scheduleTimeZone,
      exportSizeId,
      customVerticalSize,
      customHorizontalSize,
      showHeader,
      headerTitle,
      headerAlignment,
      headerTone,
      showFooter,
      footerLink,
      footerStyle,
      footerSize,
      themeBackgroundId,
      themeFontId,
      themeCardStyleId,
      themeBorderId,
      themeBorderWeightId,
      days,
    ],
  );
  const schedulePayloadJson = useMemo(
    () => JSON.stringify(schedulePayload),
    [schedulePayload],
  );

  useEffect(() => {
    if (!isScheduleReady || !scheduleId) return;
    if (schedulePayloadJson === lastPersistedRef.current) return;

    if (persistTimeoutRef.current) {
      window.clearTimeout(persistTimeoutRef.current);
    }

    persistTimeoutRef.current = window.setTimeout(() => {
      lastPersistedRef.current = schedulePayloadJson;

      writeCookie(
        getScheduleCookieName(scheduleId),
        schedulePayloadJson,
        scheduleCookieMaxAgeSeconds,
      );

      if (authUser) {
        void supabase
          .from("schedules")
          .upsert(
            {
              id: scheduleRecordId ?? scheduleId,
              user_id: authUser.id,
              name: schedulePayload.scheduleName,
              payload: schedulePayload,
            },
            { onConflict: "id" },
          )
          .then(({ error }) => {
            if (error) {
              console.error("Failed to persist schedule", error);
            }
          });
      }
    }, 700);

    return () => {
      if (persistTimeoutRef.current) {
        window.clearTimeout(persistTimeoutRef.current);
      }
    };
  }, [
    authUser,
    isScheduleReady,
    scheduleId,
    scheduleRecordId,
    schedulePayload,
    schedulePayloadJson,
  ]);

  const selectDay = (id: string, streamId?: string) => {
    setSelectedDayId(id);
    setSelectedElement({ type: "day", id });
    const day = days.find((entry) => entry.id === id);
    const hasSelectedStream =
      selectedStreamId &&
      day?.streams.some((stream) => stream.id === selectedStreamId);
    const nextStreamId =
      streamId ??
      (hasSelectedStream ? selectedStreamId : day?.streams[0]?.id ?? null);
    setSelectedStreamId(nextStreamId);
  };

  const selectHeader = () => {
    setSelectedElement({ type: "header" });
  };

  const selectFooter = () => {
    setSelectedElement({ type: "footer" });
  };

  const showHeaderElement = () => {
    setShowHeader(true);
    setSelectedElement({ type: "header" });
  };

  const hideHeaderElement = () => {
    setShowHeader(false);
    if (selectedElement?.type === "header") {
      setSelectedElement(
        selectedDayId ? { type: "day", id: selectedDayId } : null,
      );
    }
  };

  const toggleHeader = () => {
    if (showHeader) {
      hideHeaderElement();
    } else {
      showHeaderElement();
    }
  };

  const showFooterElement = () => {
    setShowFooter(true);
    setSelectedElement({ type: "footer" });
  };

  const hideFooterElement = () => {
    setShowFooter(false);
    if (selectedElement?.type === "footer") {
      setSelectedElement(
        selectedDayId ? { type: "day", id: selectedDayId } : null,
      );
    }
  };

  const toggleFooter = () => {
    if (showFooter) {
      hideFooterElement();
    } else {
      showFooterElement();
    }
  };

  useEffect(() => {
    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const supported =
      typeof Intl.supportedValuesOf === "function"
        ? Intl.supportedValuesOf("timeZone")
        : [];
    const fallback = defaultTimeZones.map((option) => option.id);
    const baseZones = supported.length ? supported : fallback;
    const seen = new Set<string>();
    const nextOptions: TimeZoneOption[] = [];
    const addZone = (zone: string) => {
      if (seen.has(zone)) return;
      seen.add(zone);
      nextOptions.push({
        id: zone,
        label: userTimeZone && zone === userTimeZone ? `Local (${zone})` : zone,
      });
    };
    if (userTimeZone) addZone(userTimeZone);
    baseZones.forEach(addZone);
    setTimeZoneOptions(nextOptions);
    if (userTimeZone) setScheduleTimeZone(userTimeZone);
  }, []);

  useEffect(() => {
    return () => {
      Object.values(objectUrlsRef.current).forEach((url) =>
        URL.revokeObjectURL(url),
      );
    };
  }, []);

  const canAddDay = days.length < 7;

  const ensureTimeZoneOption = (zone: string) => {
    if (!zone) return;
    setTimeZoneOptions((prev) => {
      if (prev.some((option) => option.id === zone)) return prev;
      return [{ id: zone, label: zone }, ...prev];
    });
  };

  const getNextDayName = (currentDays: StoryDay[]) => {
    const used = new Set(currentDays.map((day) => day.day.toLowerCase()));
    return (
      weekDays.find((day) => !used.has(day.toLowerCase())) ??
      `Day ${currentDays.length + 1}`
    );
  };

  const createTimeSlot = (): TimeSlot => ({
    id: `slot-${idRef.current++}`,
    zoneId: "uk",
    label: "",
    time: "",
    flag: "uk",
    customLabel: "",
    customTime: "",
    customZone: "",
    customEmoji: "",
    customFlag: "globe",
  });

  const createStream = (): Stream => ({
    id: `stream-${idRef.current++}`,
    title: "New stream",
    thumbUrl: "",
    baseTime: "20:30",
    times: [createTimeSlot()],
  });

  const createDay = (dayName: string): StoryDay => ({
    id: `day-${idRef.current++}`,
    day: dayName,
    date: "",
    off: false,
    streams: [createStream()],
  });

  const addDay = (position: "top" | "bottom") => {
    if (!canAddDay) return;
    const dayName = getNextDayName(days);
    const newDay = createDay(dayName);
    setDays((prev) =>
      position === "top" ? [newDay, ...prev] : [...prev, newDay],
    );
    selectDay(newDay.id, newDay.streams[0]?.id ?? null);
  };

  const reorderDays = (
    dragId: string,
    targetId: string,
    position: "before" | "after",
  ) => {
    if (dragId === targetId) return;
    setDays((prev) => {
      const dragged = prev.find((day) => day.id === dragId);
      if (!dragged) return prev;
      const remaining = prev.filter((day) => day.id !== dragId);
      const targetIndex = remaining.findIndex((day) => day.id === targetId);
      if (targetIndex === -1) return prev;
      const insertIndex = position === "after" ? targetIndex + 1 : targetIndex;
      const next = [...remaining];
      next.splice(insertIndex, 0, dragged);
      return next;
    });
  };

  const reorderStreams = (
    dayId: string,
    dragId: string,
    targetId: string,
    position: "before" | "after",
  ) => {
    if (dragId === targetId) return;
    setDays((prev) =>
      prev.map((day) => {
        if (day.id !== dayId) return day;
        const dragged = day.streams.find((stream) => stream.id === dragId);
        if (!dragged) return day;
        const remaining = day.streams.filter((stream) => stream.id !== dragId);
        const targetIndex = remaining.findIndex(
          (stream) => stream.id === targetId,
        );
        if (targetIndex === -1) return day;
        const insertIndex = position === "after" ? targetIndex + 1 : targetIndex;
        const nextStreams = [...remaining];
        nextStreams.splice(insertIndex, 0, dragged);
        return { ...day, streams: nextStreams };
      }),
    );
  };

  const updateDay = (id: string, patch: Partial<StoryDay>) => {
    setDays((prev) =>
      prev.map((day) => (day.id === id ? { ...day, ...patch } : day)),
    );
  };

  const updateStream = (
    dayId: string,
    streamId: string,
    patch: Partial<Stream>,
  ) => {
    setDays((prev) =>
      prev.map((day) => {
        if (day.id !== dayId) return day;
        return {
          ...day,
          streams: day.streams.map((stream) =>
            stream.id === streamId ? { ...stream, ...patch } : stream,
          ),
        };
      }),
    );
  };

  const updateThumbnailUrl = (dayId: string, streamId: string, value: string) => {
    const existingUrl = objectUrlsRef.current[streamId];
    if (existingUrl) {
      URL.revokeObjectURL(existingUrl);
      delete objectUrlsRef.current[streamId];
      setLocalThumbNames((prev) => {
        const next = { ...prev };
        delete next[streamId];
        return next;
      });
    }
    updateStream(dayId, streamId, { thumbUrl: value });
  };

  const handleThumbnailUpload = (dayId: string, streamId: string, file: File) => {
    const nextUrl = URL.createObjectURL(file);
    const existingUrl = objectUrlsRef.current[streamId];
    if (existingUrl) {
      URL.revokeObjectURL(existingUrl);
    }
    objectUrlsRef.current[streamId] = nextUrl;
    setLocalThumbNames((prev) => ({ ...prev, [streamId]: file.name }));
    updateStream(dayId, streamId, { thumbUrl: nextUrl });
  };

  const clearThumbnail = (dayId: string, streamId: string) => {
    const existingUrl = objectUrlsRef.current[streamId];
    if (existingUrl) {
      URL.revokeObjectURL(existingUrl);
      delete objectUrlsRef.current[streamId];
    }
    setLocalThumbNames((prev) => {
      const next = { ...prev };
      delete next[streamId];
      return next;
    });
    updateStream(dayId, streamId, { thumbUrl: "" });
  };

  const clearLocalThumbnails = () => {
    Object.values(objectUrlsRef.current).forEach((url) =>
      URL.revokeObjectURL(url),
    );
    objectUrlsRef.current = {};
    setLocalThumbNames({});
  };

  const updateTimeSlot = (
    dayId: string,
    streamId: string,
    slotId: string,
    patch: Partial<TimeSlot>,
  ) => {
    setDays((prev) =>
      prev.map((day) => {
        if (day.id !== dayId) return day;
        return {
          ...day,
          streams: day.streams.map((stream) =>
            stream.id === streamId
              ? {
                  ...stream,
                  times: stream.times.map((slot) =>
                    slot.id === slotId ? { ...slot, ...patch } : slot,
                  ),
                }
              : stream,
          ),
        };
      }),
    );
  };

  const handleEmojiPick =
    (dayId: string, streamId: string, slotId: string) =>
    (emojiData: EmojiClickData) => {
      updateTimeSlot(dayId, streamId, slotId, {
        customEmoji: emojiData.emoji,
      });
      setActiveEmojiPickerId(null);
    };

  const addTimeSlot = (dayId: string, streamId: string) => {
    setDays((prev) =>
      prev.map((day) =>
        day.id === dayId
          ? {
              ...day,
              streams: day.streams.map((stream) =>
                stream.id === streamId
                  ? { ...stream, times: [...stream.times, createTimeSlot()] }
                  : stream,
              ),
            }
          : day,
      ),
    );
  };

  const removeTimeSlot = (dayId: string, streamId: string, slotId: string) => {
    setDays((prev) =>
      prev.map((day) =>
        day.id === dayId
          ? {
              ...day,
              streams: day.streams.map((stream) =>
                stream.id === streamId
                  ? {
                      ...stream,
                      times: stream.times.filter((slot) => slot.id !== slotId),
                    }
                  : stream,
              ),
            }
          : day,
      ),
    );
  };

  const addStream = (dayId: string) => {
    const newStream = createStream();
    setDays((prev) =>
      prev.map((day) =>
        day.id === dayId
          ? { ...day, streams: [...day.streams, newStream] }
          : day,
      ),
    );
    setSelectedStreamId(newStream.id);
  };

  const removeStream = (dayId: string, streamId: string) => {
    const day = days.find((entry) => entry.id === dayId);
    if (!day || day.streams.length <= 1) return;
    const existingUrl = objectUrlsRef.current[streamId];
    if (existingUrl) {
      URL.revokeObjectURL(existingUrl);
      delete objectUrlsRef.current[streamId];
    }
    setLocalThumbNames((prev) => {
      if (!prev[streamId]) return prev;
      const next = { ...prev };
      delete next[streamId];
      return next;
    });
    setDays((prev) =>
      prev.map((entry) => {
        if (entry.id !== dayId) return entry;
        const nextStreams = entry.streams.filter(
          (stream) => stream.id !== streamId,
        );
        if (selectedStreamId === streamId) {
          setSelectedStreamId(nextStreams[0]?.id ?? null);
        }
        return {
          ...entry,
          streams: nextStreams,
        };
      }),
    );
  };

  const requestDeleteDay = (dayId: string) => {
    setPendingDeleteDayId(dayId);
  };

  const requestDeleteStream = (dayId: string, streamId: string) => {
    setPendingDeleteStream({ dayId, streamId });
  };

  const removeDay = (dayId: string) => {
    const day = days.find((entry) => entry.id === dayId);
    if (day) {
      day.streams.forEach((stream) => {
        const existingUrl = objectUrlsRef.current[stream.id];
        if (existingUrl) {
          URL.revokeObjectURL(existingUrl);
          delete objectUrlsRef.current[stream.id];
        }
      });
      setLocalThumbNames((prev) => {
        const next = { ...prev };
        day.streams.forEach((stream) => {
          delete next[stream.id];
        });
        return next;
      });
    }
    setDays((prev) => {
      const next = prev.filter((day) => day.id !== dayId);
      if (selectedDayId === dayId) {
        const nextId = next[0]?.id ?? null;
        const nextStreamId = next[0]?.streams[0]?.id ?? null;
        setSelectedDayId(nextId);
        setSelectedStreamId(nextStreamId);
        if (selectedElement?.type === "day") {
          setSelectedElement(nextId ? { type: "day", id: nextId } : null);
        }
      }
      return next;
    });
  };

  const confirmDeleteStream = () => {
    if (!pendingDeleteStream) return;
    removeStream(pendingDeleteStream.dayId, pendingDeleteStream.streamId);
    setPendingDeleteStream(null);
  };

  const cancelDeleteStream = () => {
    setPendingDeleteStream(null);
  };

  const requestClearAll = () => {
    setPendingDeleteDayId(null);
    setPendingDeleteStream(null);
    setPendingClearAll(true);
  };

  const confirmClearAll = () => {
    clearLocalThumbnails();
    setDays([]);
    setSelectedDayId(null);
    setSelectedStreamId(null);
    setPendingDeleteStream(null);
    if (selectedElement?.type === "day") {
      setSelectedElement(null);
    }
    setPendingDeleteDayId(null);
    setPendingClearAll(false);
  };

  const cancelClearAll = () => {
    setPendingClearAll(false);
  };

  const confirmDeleteDay = () => {
    if (!pendingDeleteDayId) return;
    removeDay(pendingDeleteDayId);
    setPendingDeleteDayId(null);
  };

  const cancelDeleteDay = () => {
    setPendingDeleteDayId(null);
  };

  const normalizeScheduleFile = (payload: unknown): ScheduleFile | null => {
    if (!isRecord(payload)) return null;
    const rawDays = Array.isArray(payload.days) ? payload.days : null;
    if (!rawDays) return null;
    let fallbackId = 1;
    const makeFallbackId = (prefix: string) =>
      `${prefix}-imported-${fallbackId++}`;
    const normalizeSlot = (value: unknown): TimeSlot => {
      const record = isRecord(value) ? value : {};
      const zoneId = getString(record.zoneId, "uk");
      const customLabel = getString(record.customLabel);
      const customTime = getString(record.customTime);
      const customZone = getString(record.customZone);
      const customEmoji = getString(record.customEmoji);
      const customFlag = isFlagKey(record.customFlag)
        ? record.customFlag
        : "globe";
      const fallbackFlag = zoneId === "custom" ? customFlag : "uk";
      const flag = isFlagKey(record.flag) ? record.flag : fallbackFlag;
      return {
        id: getString(record.id, makeFallbackId("slot")),
        zoneId,
        label: getString(record.label),
        time: getString(record.time),
        flag,
        customLabel,
        customTime,
        customZone,
        customEmoji,
        customFlag,
      };
    };
    const normalizeStream = (value: unknown): Stream => {
      const record = isRecord(value) ? value : {};
      return {
        id: getString(record.id, makeFallbackId("stream")),
        title: getString(record.title),
        thumbUrl: getString(record.thumbUrl),
        baseTime: getString(record.baseTime, "20:30"),
        times: getArray<unknown>(record.times).map(normalizeSlot),
      };
    };
    const normalizedDays = rawDays.map((value: unknown): StoryDay => {
      const record = isRecord(value) ? value : {};
      return {
        id: getString(record.id, makeFallbackId("day")),
        day: getString(record.day, "Day"),
        date: getString(record.date),
        off: getBoolean(record.off, false),
        streams: getArray<unknown>(record.streams).map(normalizeStream),
      };
    });

    const nextHeaderAlignment =
      payload.headerAlignment === "center" || payload.headerAlignment === "left"
        ? payload.headerAlignment
        : headerAlignment;
    const nextHeaderTone =
      payload.headerTone === "soft" || payload.headerTone === "bright"
        ? payload.headerTone
        : headerTone;
    const nextFooterStyle =
      payload.footerStyle === "glass" || payload.footerStyle === "solid"
        ? payload.footerStyle
        : footerStyle;
    const nextFooterSize =
      payload.footerSize === "compact" || payload.footerSize === "regular"
        ? payload.footerSize
        : footerSize;
    const nextExportSizeId =
      typeof payload.exportSizeId === "string" &&
      isExportSizeId(payload.exportSizeId)
        ? payload.exportSizeId
        : exportSizeId;
    const customVerticalRecord = isRecord(payload.customVerticalSize)
      ? payload.customVerticalSize
      : {};
    const customHorizontalRecord = isRecord(payload.customHorizontalSize)
      ? payload.customHorizontalSize
      : {};
    const nextCustomVerticalSize = {
      width: getPositiveNumber(
        customVerticalRecord.width,
        customVerticalSize.width,
      ),
      height: getPositiveNumber(
        customVerticalRecord.height,
        customVerticalSize.height,
      ),
    };
    const nextCustomHorizontalSize = {
      width: getPositiveNumber(
        customHorizontalRecord.width,
        customHorizontalSize.width,
      ),
      height: getPositiveNumber(
        customHorizontalRecord.height,
        customHorizontalSize.height,
      ),
    };
    const themeRecord = isRecord(payload.theme) ? payload.theme : {};
    const nextThemeBackgroundId =
      typeof themeRecord.backgroundId === "string" &&
      themeBackgrounds.some((option) => option.id === themeRecord.backgroundId)
        ? themeRecord.backgroundId
        : themeBackgroundId;
    const nextThemeFontId =
      typeof themeRecord.fontId === "string" &&
      themeFonts.some((option) => option.id === themeRecord.fontId)
        ? themeRecord.fontId
        : themeFontId;
    const nextThemeCardStyleId =
      typeof themeRecord.cardStyleId === "string" &&
      themeCardStyles.some((option) => option.id === themeRecord.cardStyleId)
        ? themeRecord.cardStyleId
        : themeCardStyleId;
    const nextThemeBorderId =
      typeof themeRecord.borderId === "string" &&
      themeBorders.some((option) => option.id === themeRecord.borderId)
        ? themeRecord.borderId
        : themeBorderId;
    const nextThemeBorderWeightId =
      typeof themeRecord.borderWeightId === "string" &&
      themeBorderWeights.some(
        (option) => option.id === themeRecord.borderWeightId,
      )
        ? themeRecord.borderWeightId
        : themeBorderWeightId;
    return {
      version: typeof payload.version === "number" ? payload.version : 1,
      scheduleName: getString(payload.scheduleName, scheduleName),
      scheduleTimeZone: getString(
        payload.scheduleTimeZone,
        scheduleTimeZone,
      ),
      exportSizeId: nextExportSizeId,
      customVerticalSize: nextCustomVerticalSize,
      customHorizontalSize: nextCustomHorizontalSize,
      showHeader: getBoolean(payload.showHeader, showHeader),
      headerTitle: getString(payload.headerTitle, headerTitle),
      headerAlignment: nextHeaderAlignment,
      headerTone: nextHeaderTone,
      showFooter: getBoolean(payload.showFooter, showFooter),
      footerLink: getString(payload.footerLink, footerLink),
      footerStyle: nextFooterStyle,
      footerSize: nextFooterSize,
      theme: {
        backgroundId: nextThemeBackgroundId,
        fontId: nextThemeFontId,
        cardStyleId: nextThemeCardStyleId,
        borderId: nextThemeBorderId,
        borderWeightId: nextThemeBorderWeightId,
      },
      days: normalizedDays,
    };
  };

  const updateIdRefFromDays = (loadedDays: StoryDay[]) => {
    let maxId = -1;
    const collect = (id: string) => {
      const next = getMaxIdValue(id);
      if (next === null) return;
      maxId = Math.max(maxId, next);
    };
    loadedDays.forEach((day) => {
      collect(day.id);
      day.streams.forEach((stream) => {
        collect(stream.id);
        stream.times.forEach((slot) => collect(slot.id));
      });
    });
    if (maxId >= 0) {
      idRef.current = Math.max(idRef.current, maxId + 1);
    }
  };

  const handleScheduleSave = () => {
    setScheduleFileError(null);
    const payload = schedulePayload;
    const safeName = scheduleName
      .trim()
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase();
    const fileName = `${safeName || "schedule"}.schedule`;
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const applyLoadedSchedule = (payload: ScheduleFile) => {
    clearLocalThumbnails();
    setScheduleName(payload.scheduleName);
    setScheduleTimeZone(payload.scheduleTimeZone);
    ensureTimeZoneOption(payload.scheduleTimeZone);
    setExportSizeId(payload.exportSizeId);
    syncCustomVerticalSize(payload.customVerticalSize);
    setShowHeader(payload.showHeader);
    setHeaderTitle(payload.headerTitle);
    setHeaderAlignment(payload.headerAlignment);
    setHeaderTone(payload.headerTone);
    setShowFooter(payload.showFooter);
    setFooterLink(payload.footerLink);
    setFooterStyle(payload.footerStyle);
    setFooterSize(payload.footerSize);
    setThemeBackgroundId(payload.theme.backgroundId);
    setThemeFontId(payload.theme.fontId);
    setThemeCardStyleId(payload.theme.cardStyleId);
    setThemeBorderId(payload.theme.borderId);
    setThemeBorderWeightId(payload.theme.borderWeightId);
    setDays(payload.days);
    const nextSelectedDayId = payload.days[0]?.id ?? null;
    const nextSelectedStreamId = payload.days[0]?.streams[0]?.id ?? null;
    setSelectedDayId(nextSelectedDayId);
    setSelectedStreamId(nextSelectedStreamId);
    setSelectedElement(
      nextSelectedDayId ? { type: "day", id: nextSelectedDayId } : null,
    );
    setActiveEmojiPickerId(null);
    setPendingDeleteDayId(null);
    setPendingDeleteStream(null);
    setPendingClearAll(false);
    setIsDownloading(false);
    setExportRequested(false);
    setIsExportingView(false);
    updateIdRefFromDays(payload.days);
    lastPersistedRef.current = JSON.stringify(payload);
  };

  const handleScheduleLoad = async (file: File) => {
    setScheduleFileError(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;
      const normalized = normalizeScheduleFile(parsed);
      if (!normalized) {
        setScheduleFileError("Invalid schedule file.");
        return;
      }
      applyLoadedSchedule(normalized);
    } catch (error) {
      console.error("Failed to load schedule file", error);
      setScheduleFileError("Invalid schedule file.");
    }
  };

  const handleScheduleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      void handleScheduleLoad(file);
    }
    event.currentTarget.value = "";
  };

  const openShareModal = async () => {
    if (!scheduleId) return;
    setShareModalOpen(true);
    setShareStatus("loading");
    setShareLink("");
    setShareError(null);

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setShareStatus("error");
      setShareError("Sign in to create a share link.");
      return;
    }

    try {
      const response = await fetch("/api/share", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ scheduleId }),
      });
      if (!response.ok) {
        throw new Error("Unable to create share link.");
      }
      const payload = (await response.json()) as { shareToken?: string };
      if (!payload.shareToken) {
        throw new Error("Share token missing.");
      }
      const link = `${window.location.origin}/share/${payload.shareToken}`;
      setShareLink(link);
      setShareStatus("ready");
    } catch (error) {
      console.error("Failed to create share link", error);
      setShareStatus("error");
      setShareError("Unable to create share link.");
    }
  };

  const closeShareModal = () => {
    setShareModalOpen(false);
    setShareStatus("idle");
    setShareLink("");
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

  const handleDownload = () => {
    if (
      !previewRef.current ||
      isDownloading ||
      exportRequested ||
      isCopying ||
      copyRequested
    ) {
      return;
    }
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setSelectedElement(null);
    setIsExportingView(true);
    setIsDownloading(true);
    setExportRequested(true);
  };

  const handleDownloadClick = () => {
    if (!isPreviewMode) {
      setIsPreviewMode(true);
      return;
    }
    handleDownload();
  };

  const handleCopy = () => {
    if (
      !previewRef.current ||
      isCopying ||
      copyRequested ||
      isDownloading ||
      exportRequested
    ) {
      return;
    }
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setSelectedElement(null);
    setIsExportingView(true);
    setIsCopying(true);
    setCopyRequested(true);
  };

  const handleCopyClick = () => {
    if (!isPreviewMode) {
      setIsPreviewMode(true);
      return;
    }
    handleCopy();
  };

  useEffect(() => {
    if (!exportRequested || !isExportingView) return;
    const exportNode = previewRef.current;
    if (!exportNode) {
      setIsDownloading(false);
      setExportRequested(false);
      setIsExportingView(false);
      return;
    }

    exportNode.setAttribute("data-exporting", "true");
    const runExport = async () => {
      try {
        await new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        );
        if (document.fonts?.ready) {
          await document.fonts.ready;
        }
        const fontEmbedCSS = await buildFontEmbedCSS(exportNode);
        const dataUrl = await toPng(exportNode, {
          pixelRatio: 1,
          cacheBust: true,
          includeQueryParams: true,
          fontEmbedCSS,
          width: exportWidth,
          height: exportHeight,
          style: {
            transform: "scale(1)",
            transformOrigin: "top left",
          },
        });
        const safeName = scheduleName
          .trim()
          .replace(/[^a-z0-9]+/gi, "-")
          .replace(/^-+|-+$/g, "")
          .toLowerCase();
        const safeExport = (selectedExport?.label ?? exportSizeId)
          .trim()
          .replace(/[^a-z0-9]+/gi, "-")
          .replace(/^-+|-+$/g, "")
          .toLowerCase();
        const fileBase = safeName || "schedule";
        const exportBase = safeExport || "export";
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = `${fileBase}-${exportBase}.png`;
        link.click();
      } catch (error) {
        console.error("Failed to export image", error);
      } finally {
        exportNode.setAttribute("data-exporting", "false");
        setIsDownloading(false);
        setExportRequested(false);
        setIsExportingView(false);
      }
    };

    void runExport();
  }, [
    exportRequested,
    isExportingView,
    exportWidth,
    exportHeight,
    scheduleName,
    exportSizeId,
    selectedExport?.label,
  ]);

  useEffect(() => {
    if (!copyRequested || !isExportingView) return;
    const exportNode = previewRef.current;
    if (!exportNode) {
      setIsCopying(false);
      setCopyRequested(false);
      setIsExportingView(false);
      return;
    }

    exportNode.setAttribute("data-exporting", "true");
    const runCopy = async () => {
      try {
        await new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        );
        if (document.fonts?.ready) {
          await document.fonts.ready;
        }
        const fontEmbedCSS = await buildFontEmbedCSS(exportNode);
        const blob = await toBlob(exportNode, {
          pixelRatio: 1,
          cacheBust: true,
          includeQueryParams: true,
          fontEmbedCSS,
          width: exportWidth,
          height: exportHeight,
          style: {
            transform: "scale(1)",
            transformOrigin: "top left",
          },
        });
        if (!blob) {
          throw new Error("Failed to copy image");
        }
        if (
          typeof window === "undefined" ||
          typeof navigator === "undefined" ||
          !navigator.clipboard ||
          typeof (window as typeof window).ClipboardItem === "undefined"
        ) {
          throw new Error("Clipboard unavailable");
        }
        await navigator.clipboard.write([
          new (window as typeof window).ClipboardItem({
            "image/png": blob,
          }),
        ]);
      } catch (error) {
        console.error("Failed to copy image", error);
      } finally {
        exportNode.setAttribute("data-exporting", "false");
        setIsCopying(false);
        setCopyRequested(false);
        setIsExportingView(false);
      }
    };

    void runCopy();
  }, [copyRequested, isExportingView, exportWidth, exportHeight]);

  if (!isScheduleReady) {
    return (
      <div className="page-shell min-h-screen">
        <div className="relative mx-auto flex min-h-screen w-full max-w-3xl items-center px-6 py-16">
          <div className="w-full rounded-4xl border border-slate-200 bg-white/90 p-8 text-center shadow-[0_24px_60px_rgba(20,27,42,0.12)]">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Loading
            </p>
            <h1 className="font-display mt-4 text-3xl text-slate-900">
              Loading your studio...
            </h1>
          </div>
        </div>
      </div>
    );
  }

  if (!authUser) {
    return (
      <div className="page-shell min-h-screen">
        <div className="relative overflow-hidden">
          <div className="hero-glow pointer-events-none absolute -top-32 right-0 h-90 w-90 opacity-70 blur-3xl" />
          <header className="relative z-10 mx-auto w-full max-w-6xl px-6 py-6">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[26px] border border-slate-200 bg-white px-4 py-3 shadow-[0_18px_40px_rgba(20,27,42,0.12)]">
              <Link
                className="flex items-center gap-3 text-lg font-semibold"
                href="/"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-(--accent) text-white">
                  P
                </span>
                Pala&apos;s Stream Schedule Maker
              </Link>
              <Link
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                href="/"
              >
                Back to home
              </Link>
            </div>
          </header>

          <main className="relative z-10 mx-auto w-full max-w-3xl px-6 pb-20 pt-6">
            <section className="rounded-4xl border border-slate-200 bg-white/90 p-8 text-center shadow-[0_30px_70px_rgba(20,27,42,0.12)]">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                Studio access
              </p>
              <h1 className="font-display mt-4 text-3xl text-slate-900">
                Sign in to open the schedule studio
              </h1>
              <p className="mt-3 text-sm text-slate-600">
                Your schedules sync to your account and the studio saves
                automatically.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link
                  className="rounded-full bg-(--accent) px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(242,107,58,0.28)] transition hover:bg-(--accent-strong)"
                  href="/account?next=/schedules"
                >
                  Sign in to continue
                </Link>
                <Link
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                  href="/"
                >
                  Back home
                </Link>
              </div>
            </section>
          </main>
        </div>
      </div>
    );
  }

  if (!scheduleId) {
    return (
      <div className="page-shell min-h-screen">
        <div className="relative mx-auto flex min-h-screen w-full max-w-3xl items-center px-6 py-16">
          <div className="w-full rounded-4xl border border-slate-200 bg-white/90 p-8 text-center shadow-[0_24px_60px_rgba(20,27,42,0.12)]">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Redirecting
            </p>
            <h1 className="font-display mt-4 text-3xl text-slate-900">
              Sending you to your schedules...
            </h1>
            <Link
              className="mt-6 inline-flex rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
              href="/schedules"
            >
              Go now
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (scheduleLoadError) {
    return (
      <div className="page-shell min-h-screen">
        <div className="relative mx-auto flex min-h-screen w-full max-w-3xl items-center px-6 py-16">
          <div className="w-full rounded-4xl border border-slate-200 bg-white/90 p-8 text-center shadow-[0_24px_60px_rgba(20,27,42,0.12)]">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Schedule error
            </p>
            <h1 className="font-display mt-4 text-3xl text-slate-900">
              {scheduleLoadError}
            </h1>
            <p className="mt-3 text-sm text-slate-600">
              Pick another schedule or create a new one.
            </p>
            <Link
              className="mt-6 inline-flex rounded-full bg-(--accent) px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(242,107,58,0.28)] transition hover:bg-(--accent-strong)"
              href="/schedules"
            >
              Back to schedules
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell min-h-screen">
      <div className="relative">
        <div className="hero-glow pointer-events-none absolute -top-32 left-0 h-90 w-90 opacity-70 blur-3xl" />
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
                href="/schedules"
              >
                Your schedules
              </Link>
              <Link
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                href="/"
              >
                Back to home
              </Link>
            </div>
          </div>
        </header>

        <main className="relative z-10 mx-auto w-full max-w-440 px-3 pb-20 lg:px-5">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Builder
            </p>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h1 className="font-display text-3xl text-slate-900 sm:text-4xl">
                Schedule workshop
              </h1>
              <div className="flex items-center rounded-full border border-slate-200 bg-white p-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setIsPreviewMode(false)}
                  className={`rounded-full px-3 py-1 transition ${
                    !isPreviewMode
                      ? "bg-(--accent) text-white"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setIsPreviewMode(true)}
                  className={`rounded-full px-3 py-1 transition ${
                    isPreviewMode
                      ? "bg-(--accent) text-white"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Preview
                </button>
              </div>
            </div>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              General options and elements on the left, inspector on the right.
              Center working area to build the week.
            </p>
          </div>

          <section
            className={`grid gap-5 ${
              isPreviewMode
                ? "lg:grid-cols-1"
                : "lg:grid-cols-[280px_minmax(0,1fr)_280px] items-start"
            }`}
          >
            {!isPreviewMode ? (
              <aside className="space-y-6">
                <div className="rounded-[28px] border border-slate-200 bg-white/85 p-6 shadow-[0_24px_60px_rgba(20,27,42,0.1)]">
                <h2 className="font-display text-xl text-slate-900">
                  General options
                </h2>
                <div className="mt-4 space-y-4 text-sm text-slate-700">
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Schedule name
                    </span>
                    <input
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
                      value={scheduleName}
                      onChange={(event) => setScheduleName(event.target.value)}
                      type="text"
                    />
                  </label>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Time zone
                    </p>
                    <select
                      className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                      value={scheduleTimeZone}
                      onChange={(event) => setScheduleTimeZone(event.target.value)}
                    >
                      {timeZoneOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Export size
                    </p>
                    <div className="space-y-2">
                      {exportSizeOptions.map((size) => (
                        <div key={size.id} className="space-y-2">
                          <button
                            type="button"
                            onClick={() => setExportSizeId(size.id)}
                            aria-pressed={exportSizeId === size.id}
                            className={`flex w-full items-center justify-between rounded-2xl border bg-white px-3 py-2 text-left text-xs font-semibold transition ${
                              exportSizeId === size.id
                                ? "border-(--accent) text-slate-900"
                                : "border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900"
                            }`}
                          >
                            <span className="text-sm font-semibold text-slate-900">
                              {size.label}
                            </span>
                            <span className="text-xs text-slate-500">
                              {size.width} x {size.height}
                            </span>
                          </button>
                          {size.id === "custom-vertical" &&
                          exportSizeId === "custom-vertical" ? (
                            <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-3 py-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                Custom vertical size
                              </p>
                              <div className="mt-2 grid grid-cols-2 gap-2">
                                <label className="block">
                                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                                    Width
                                  </span>
                                  <input
                                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
                                    type="number"
                                    min={1}
                                    value={customVerticalSize.width}
                                    onChange={(event) => {
                                      const nextWidth = getPositiveNumber(
                                        event.target.value,
                                        customVerticalSize.width,
                                      );
                                      syncCustomVerticalSize({
                                        ...customVerticalSize,
                                        width: nextWidth,
                                      });
                                      setExportSizeId("custom-vertical");
                                    }}
                                  />
                                </label>
                                <label className="block">
                                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                                    Height
                                  </span>
                                  <input
                                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
                                    type="number"
                                    min={1}
                                    value={customVerticalSize.height}
                                    onChange={(event) => {
                                      const nextHeight = getPositiveNumber(
                                        event.target.value,
                                        customVerticalSize.height,
                                      );
                                      syncCustomVerticalSize({
                                        ...customVerticalSize,
                                        height: nextHeight,
                                      });
                                      setExportSizeId("custom-vertical");
                                    }}
                                  />
                                </label>
                              </div>
                            </div>
                          ) : null}
                          {size.id === "custom-horizontal" &&
                          exportSizeId === "custom-horizontal" ? (
                            <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-3 py-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                Custom horizontal size
                              </p>
                              <div className="mt-2 grid grid-cols-2 gap-2">
                                <label className="block">
                                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                                    Width
                                  </span>
                                  <input
                                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
                                    type="number"
                                    min={1}
                                    value={customHorizontalSize.width}
                                    onChange={(event) => {
                                      const nextWidth = getPositiveNumber(
                                        event.target.value,
                                        customHorizontalSize.width,
                                      );
                                      syncCustomHorizontalSize({
                                        ...customHorizontalSize,
                                        width: nextWidth,
                                      });
                                      setExportSizeId("custom-horizontal");
                                    }}
                                  />
                                </label>
                                <label className="block">
                                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                                    Height
                                  </span>
                                  <input
                                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
                                    type="number"
                                    min={1}
                                    value={customHorizontalSize.height}
                                    onChange={(event) => {
                                      const nextHeight = getPositiveNumber(
                                        event.target.value,
                                        customHorizontalSize.height,
                                      );
                                      syncCustomHorizontalSize({
                                        ...customHorizontalSize,
                                        height: nextHeight,
                                      });
                                      setExportSizeId("custom-horizontal");
                                    }}
                                  />
                                </label>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Schedule file
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleScheduleSave}
                        className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                      >
                        Save .schedule
                      </button>
                      <button
                        type="button"
                        onClick={() => scheduleFileInputRef.current?.click()}
                        className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                      >
                        Load .schedule
                      </button>
                      <input
                        ref={scheduleFileInputRef}
                        type="file"
                        accept=".schedule,application/json"
                        onChange={handleScheduleFileChange}
                        className="hidden"
                      />
                    </div>
                    {scheduleFileError ? (
                      <p className="text-xs text-red-600">
                        {scheduleFileError}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white/85 p-6 shadow-[0_20px_50px_rgba(20,27,42,0.08)]">
                <h2 className="font-display text-xl text-slate-900">
                  Theme studio
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Backgrounds, typography, surfaces, and borders.
                </p>
                <div className="mt-4 space-y-4 text-sm text-slate-700">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Background
                    </p>
                    <div className="space-y-2">
                      {themeBackgrounds.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setThemeBackgroundId(option.id)}
                          aria-pressed={themeBackgroundId === option.id}
                          className={`flex w-full items-center gap-3 rounded-2xl border bg-white px-3 py-2 text-left text-xs font-semibold transition ${
                            themeBackgroundId === option.id
                              ? "border-(--accent) text-slate-900"
                              : "border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900"
                          }`}
                        >
                          <span
                            className="h-10 w-10 rounded-2xl border border-white/40 shadow-[0_0_0_1px_rgba(15,23,42,0.08)]"
                            style={{
                              backgroundImage: option.background,
                              backgroundSize: "cover",
                              backgroundPosition: "center",
                            }}
                          />
                          <span>
                            <span className="block text-sm font-semibold text-slate-900">
                              {option.label}
                            </span>
                            <span className="block text-xs text-slate-500">
                              {option.description}
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Font pairing
                    </p>
                    <div className="space-y-2">
                      {themeFonts.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setThemeFontId(option.id)}
                          aria-pressed={themeFontId === option.id}
                          className={`flex w-full items-center justify-between rounded-2xl border bg-white px-3 py-2 text-left text-xs font-semibold transition ${
                            themeFontId === option.id
                              ? "border-(--accent) text-slate-900"
                              : "border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900"
                          }`}
                        >
                          <span>
                            <span
                              className="block text-sm font-semibold text-slate-900"
                              style={{ fontFamily: option.heading }}
                            >
                              {option.label}
                            </span>
                            <span className="block text-xs text-slate-500">
                              {option.description}
                            </span>
                          </span>
                          <span className="text-xs text-slate-500">Aa</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Card surface
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {themeCardStyles.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setThemeCardStyleId(option.id)}
                          aria-pressed={themeCardStyleId === option.id}
                          className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition ${
                            themeCardStyleId === option.id
                              ? "border-(--accent) text-slate-900"
                              : "border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900"
                          }`}
                        >
                          <span
                            className="h-4 w-4 rounded-md border border-slate-200"
                            style={{ backgroundColor: option.surfaceStrong }}
                          />
                          <span>{option.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Corners
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {themeBorders.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setThemeBorderId(option.id)}
                          aria-pressed={themeBorderId === option.id}
                          className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition ${
                            themeBorderId === option.id
                              ? "border-(--accent) text-slate-900"
                              : "border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900"
                          }`}
                        >
                          <span
                            className="h-4 w-4 border border-slate-300"
                            style={{ borderRadius: option.cardRadius }}
                          />
                          <span>{option.label}</span>
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500">
                      {selectedThemeBorder?.description}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Border weight
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {themeBorderWeights.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setThemeBorderWeightId(option.id)}
                          aria-pressed={themeBorderWeightId === option.id}
                          className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition ${
                            themeBorderWeightId === option.id
                              ? "border-(--accent) text-slate-900"
                              : "border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900"
                          }`}
                        >
                          <span
                            className="h-3 w-8 rounded-full bg-slate-200"
                            style={{ height: option.frameBorderWidth + 2 }}
                          />
                          <span>{option.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white/85 p-6 shadow-[0_20px_50px_rgba(20,27,42,0.08)]">
                <h2 className="font-display text-xl text-slate-900">
                  Elements menu
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Add optional elements to the canvas.
                </p>
                <div className="mt-4 space-y-3 text-sm text-slate-700">
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          Main title (top)
                        </p>
                        <p className="text-xs text-slate-500">
                          Top headline above the schedule.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={toggleHeader}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                      >
                        {showHeader ? "Remove" : "Add"}
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          Link pill (bottom)
                        </p>
                        <p className="text-xs text-slate-500">
                          Bottom call-to-action link.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={toggleFooter}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                      >
                        {showFooter ? "Remove" : "Add"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-red-200 bg-white/85 p-6 shadow-[0_20px_50px_rgba(20,27,42,0.08)]">
                <h2 className="font-display text-xl text-slate-900">
                  Danger zone
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Remove every day and time slot from the schedule.
                </p>
                <button
                  type="button"
                  onClick={requestClearAll}
                  disabled={days.length === 0}
                  className="mt-4 w-full rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:border-red-300 hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Remove all days
                </button>
              </div>
              </aside>
            ) : null}

            <div
              className={`rounded-4xl border border-slate-200 bg-white/80 p-6 shadow-[0_30px_80px_rgba(20,27,42,0.14)] ${
                !isPreviewMode ? "sticky top-6 self-start" : ""
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Working area
                  </p>
                  <h2 className="font-display text-2xl text-slate-900">
                    {scheduleName.trim() || "Schedule"}
                  </h2>
                  <p className="mt-2 text-sm text-slate-600">
                    {exportWidth}x{exportHeight}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-sm font-semibold">
                  <button
                    type="button"
                    onClick={handleDownloadClick}
                    disabled={isDownloading || isCopying || !isPreviewMode}
                    className="rounded-full bg-(--accent) px-4 py-2 text-white transition hover:bg-(--accent-strong) disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isDownloading
                      ? "Preparing..."
                      : isPreviewMode
                        ? "Download PNG"
                        : "Switch to preview mode to download"}
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyClick}
                    disabled={
                      isCopying ||
                      isDownloading ||
                      !isPreviewMode ||
                      !canCopyToClipboard
                    }
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-slate-700 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isCopying
                      ? "Copying..."
                      : isPreviewMode
                        ? "Copy PNG"
                        : "Switch to preview mode to copy"}
                  </button>
                  <button
                    type="button"
                    onClick={openShareModal}
                    disabled={!scheduleId}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-slate-700 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Share preview
                  </button>
                </div>
              </div>

              <div
                className={`mt-6 flex flex-col items-center rounded-[28px] border border-slate-200 bg-(--paper) p-4 ${
                  !isPreviewMode ? "max-h-[calc(100vh-240px)] overflow-y-auto" : ""
                }`}
              >
                <StorySchedulePreview
                  days={previewDays}
                  selectedDayId={selectedDayId}
                  selectedTarget={
                    isPreviewMode || isExportingView
                      ? null
                      : selectedElement?.type ?? null
                  }
                  onSelectDayAction={
                    isPreviewMode || isExportingView ? () => {} : selectDay
                  }
                  onSelectHeaderAction={
                    isPreviewMode || isExportingView ? () => {} : selectHeader
                  }
                  onSelectFooterAction={
                    isPreviewMode || isExportingView ? () => {} : selectFooter
                  }
                  onAddDayAction={addDay}
                  onDeleteDayAction={requestDeleteDay}
                  onReorderDayAction={reorderDays}
                  onReorderStreamAction={reorderStreams}
                  canAddDay={canAddDay}
                  showAddControls={!isPreviewMode && !isExportingView}
                  isExporting={isExportingView}
                  canvasWidth={exportWidth}
                  canvasHeight={exportHeight}
                  layoutMode={layoutMode}
                  showHeader={showHeader}
                  headerTitle={headerTitle}
                  headerAlignment={headerAlignment}
                  headerTone={headerTone}
                  showFooter={showFooter}
                  footerLink={footerLink}
                  footerStyle={footerStyle}
                  footerSize={footerSize}
                  theme={previewTheme}
                  exportRef={previewRef}
                />
              </div>
            </div>

            {!isPreviewMode ? (
              <aside className="space-y-6">
                <div className="rounded-[28px] border border-slate-200 bg-(--paper) p-6 shadow-[0_20px_50px_rgba(20,27,42,0.08)]">
                <h2 className="font-display text-xl text-slate-900">
                  Inspector
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Click a block to show its details here.
                </p>
                {!selectedElement ? (
                  <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white/80 px-4 py-6 text-sm text-slate-500">
                    No element selected yet.
                  </div>
                ) : selectedElement.type === "day" && selectedDay ? (
                  <div className="mt-4 space-y-4 text-sm text-slate-700">
                    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
                      {days.length} of 7 days used
                    </div>

                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Day name
                      </span>
                      <input
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
                        value={selectedDay.day}
                        onChange={(event) =>
                          updateDay(selectedDay.id, { day: event.target.value })
                        }
                        type="text"
                      />
                    </label>

                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Date label
                      </span>
                      <input
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
                        value={selectedDay.date}
                        onChange={(event) =>
                          updateDay(selectedDay.id, { date: event.target.value })
                        }
                        type="text"
                        placeholder="Jan 12"
                      />
                    </label>

                    <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2">
                      <input
                        checked={selectedDay.off}
                        onChange={(event) =>
                          updateDay(selectedDay.id, { off: event.target.checked })
                        }
                        type="checkbox"
                        className="h-4 w-4"
                      />
                      <span className="text-sm">Day off (no streams)</span>
                    </label>

                    <div className="space-y-4">
                      {selectedDay.off ? (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-3 py-3 text-xs text-slate-500">
                          This day is off. Turn it back on to edit details.
                        </div>
                      ) : null}

                      {!selectedDay.off ? (
                        <div className="space-y-4">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                Streams
                              </span>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => addStream(selectedDay.id)}
                                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                                >
                                  Add stream
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    selectedStream
                                      ? requestDeleteStream(
                                          selectedDay.id,
                                          selectedStream.id,
                                        )
                                      : null
                                  }
                                  disabled={
                                    !selectedStream ||
                                    selectedDay.streams.length <= 1
                                  }
                                  className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 transition hover:border-red-300 hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  Remove stream
                                </button>
                              </div>
                            </div>

                            {selectedDay.streams.length === 0 ? (
                              <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-3 py-3 text-xs text-slate-500">
                                No streams yet.
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {selectedDay.streams.map((stream, index) => {
                                  const streamLabel =
                                    stream.title.trim() || `Stream ${index + 1}`;
                                  const isActive =
                                    selectedStream?.id === stream.id;
                                  return (
                                    <button
                                      key={stream.id}
                                      type="button"
                                      onClick={() =>
                                        setSelectedStreamId(stream.id)
                                      }
                                      aria-pressed={isActive}
                                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                                        isActive
                                          ? "border-(--accent) text-slate-900"
                                          : "border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900"
                                      }`}
                                    >
                                      {streamLabel}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                          {!selectedStream ? (
                            <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-3 py-3 text-xs text-slate-500">
                              Select a stream to edit its details.
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <label className="block">
                            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                              Stream title
                            </span>
                            <input
                              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
                              value={selectedStream.title}
                              onChange={(event) =>
                                updateStream(selectedDay.id, selectedStream.id, {
                                  title: event.target.value,
                                })
                              }
                              type="text"
                              placeholder="New stream"
                            />
                          </label>

                          <label className="block">
                            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                              Thumbnail URL
                            </span>
                            <input
                              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
                              value={selectedStream.thumbUrl}
                              onChange={(event) =>
                                updateThumbnailUrl(
                                  selectedDay.id,
                                  selectedStream.id,
                                  event.target.value,
                                )
                              }
                              type="text"
                              placeholder="https://..."
                            />
                          </label>

                          <label className="block">
                            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                              Upload thumbnail
                            </span>
                            <input
                              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm file:mr-4 file:rounded-full file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-slate-700"
                              type="file"
                              accept="image/*"
                              onChange={(event) => {
                                const file = event.target.files?.[0];
                                if (file) {
                                  handleThumbnailUpload(
                                    selectedDay.id,
                                    selectedStream.id,
                                    file,
                                  );
                                }
                                event.currentTarget.value = "";
                              }}
                            />
                            {localThumbNames[selectedStream.id] ? (
                              <p className="mt-2 text-xs text-slate-500">
                                Local file: {localThumbNames[selectedStream.id]}
                              </p>
                            ) : null}
                            <button
                              type="button"
                              onClick={() =>
                                clearThumbnail(selectedDay.id, selectedStream.id)
                              }
                              disabled={!selectedStream.thumbUrl}
                              className="mt-3 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Clear thumbnail
                            </button>
                          </label>

                          <label className="block">
                            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                              Stream time (base)
                            </span>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <input
                                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
                                value={selectedStream.baseTime}
                                onChange={(event) =>
                                  updateStream(selectedDay.id, selectedStream.id, {
                                    baseTime: event.target.value,
                                  })
                                }
                                type="time"
                              />
                              <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                                {scheduleTimeZoneLabel}
                              </div>
                            </div>
                          </label>

                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                Time slots
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  addTimeSlot(selectedDay.id, selectedStream.id)
                                }
                                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                              >
                                Add slot
                              </button>
                            </div>

                            {selectedStream.times.length === 0 ? (
                              <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-3 py-3 text-xs text-slate-500">
                                No time slots yet.
                              </div>
                            ) : (
                              selectedStream.times.map((slot) => {
                                const display = getSlotDisplay(
                                  slot,
                                  selectedStream.baseTime,
                                );
                                const isCustom = slot.zoneId === "custom";
                                return (
                                  <div
                                    key={slot.id}
                                    className="rounded-2xl border border-slate-200 bg-white px-3 py-3"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                        Time zone
                                      </span>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              removeTimeSlot(
                                                selectedDay.id,
                                                selectedStream.id,
                                                slot.id,
                                              )
                                            }
                                        className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                                      >
                                        Remove
                                      </button>
                                    </div>

                                    <div className="mt-2 grid grid-cols-2 gap-2">
                                      {slotZoneOptions.map((option) => (
                                        <button
                                          key={option.id}
                                          type="button"
                                          onClick={() =>
                                            updateTimeSlot(
                                              selectedDay.id,
                                              selectedStream.id,
                                              slot.id,
                                              option.id === "custom"
                                                ? {
                                                    zoneId: option.id,
                                                    flag:
                                                      slot.customFlag || "globe",
                                                    customFlag:
                                                      slot.customFlag || "globe",
                                                    customLabel:
                                                      slot.customLabel || "Custom",
                                                  }
                                                : {
                                                    zoneId: option.id,
                                                    flag: option.flag,
                                                    label: option.label,
                                                  },
                                            )
                                          }
                                          aria-pressed={slot.zoneId === option.id}
                                          className={`flex flex-col gap-1 rounded-2xl border px-3 py-2 text-left text-xs font-semibold transition ${
                                            slot.zoneId === option.id
                                              ? "border-(--accent) text-slate-900"
                                              : "border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900"
                                          }`}
                                        >
                                          <span className="flex items-center gap-2">
                                            <span className="h-4 w-6 shrink-0 overflow-hidden rounded-[3px] shadow-[0_0_0_1px_rgba(15,23,42,0.12)] [&_svg]:block [&_svg]:h-full [&_svg]:w-full">
                                              <FlagIcon flag={option.flag} />
                                            </span>
                                            <span>{option.label}</span>
                                          </span>
                                          <span className="text-[10px] text-slate-500">
                                            {option.description}
                                          </span>
                                        </button>
                                      ))}
                                    </div>

                                    {!isCustom ? (
                                      <div className="mt-3 flex items-center justify-between rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                                        <span>Calculated time</span>
                                        <span className="text-sm font-semibold text-slate-900">
                                          {display.time}
                                        </span>
                                      </div>
                                    ) : (
                                      <div className="mt-3 space-y-3">
                                        <div className="space-y-2">
                                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                            Emoji
                                          </p>
                                          <div className="relative">
                                            <button
                                              type="button"
                                              onClick={() =>
                                                setActiveEmojiPickerId((prev) =>
                                                  prev === slot.id ? null : slot.id,
                                                )
                                              }
                                              className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
                                            >
                                              <span className="text-base">
                                                {slot.customEmoji || "Choose emoji"}
                                              </span>
                                              <span className="text-xs text-slate-500">
                                                Picker
                                              </span>
                                            </button>
                                            {activeEmojiPickerId === slot.id ? (
                                              <div className="absolute z-20 mt-2">
                                                <EmojiPicker
                                                  onEmojiClick={handleEmojiPick(
                                                    selectedDay.id,
                                                    selectedStream.id,
                                                    slot.id,
                                                  )}
                                                />
                                              </div>
                                            ) : null}
                                          </div>
                                        </div>

                                        <label className="block">
                                          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                            Time zone label
                                          </span>
                                          <input
                                            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
                                            value={slot.customLabel}
                                            onChange={(event) =>
                                              updateTimeSlot(
                                                selectedDay.id,
                                                selectedStream.id,
                                                slot.id,
                                                {
                                                  customLabel: event.target.value,
                                                  label: event.target.value,
                                                },
                                              )
                                            }
                                            type="text"
                                            placeholder="Custom label"
                                          />
                                        </label>

                                        <label className="block">
                                          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                            Time zone name
                                          </span>
                                          <input
                                            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
                                            value={slot.customZone}
                                            onChange={(event) =>
                                              updateTimeSlot(
                                                selectedDay.id,
                                                selectedStream.id,
                                                slot.id,
                                                { customZone: event.target.value },
                                              )
                                            }
                                            type="text"
                                            placeholder="Asia/Singapore"
                                          />
                                        </label>

                                        <label className="block">
                                          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                            Stream time
                                          </span>
                                          <input
                                            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
                                            value={slot.customTime}
                                            onChange={(event) =>
                                              updateTimeSlot(
                                                selectedDay.id,
                                                selectedStream.id,
                                                slot.id,
                                                {
                                                  customTime: event.target.value,
                                                  time: event.target.value,
                                                },
                                              )
                                            }
                                            type="text"
                                            placeholder="8:00 PM"
                                          />
                                        </label>
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              requestDeleteStream(
                                selectedDay.id,
                                selectedStream.id,
                              )
                            }
                            disabled={selectedDay.streams.length <= 1}
                            className="w-full rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:border-red-300 hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Delete stream
                          </button>
                        </div>
                      )}
                        </div>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => requestDeleteDay(selectedDay.id)}
                        className="w-full rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:border-red-300 hover:text-red-800"
                      >
                        Delete day
                      </button>
                    </div>
                  </div>
                ) : selectedElement.type === "header" ? (
                  <div className="mt-4 space-y-4 text-sm text-slate-700">
                    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
                      Main title settings
                    </div>

                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Title
                      </span>
                      <input
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
                        value={headerTitle}
                        onChange={(event) => setHeaderTitle(event.target.value)}
                        type="text"
                        placeholder="Weekly Schedule"
                      />
                    </label>

                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Alignment
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setHeaderAlignment("left")}
                          aria-pressed={headerAlignment === "left"}
                          className={`flex-1 rounded-2xl border px-3 py-2 text-xs font-semibold transition ${
                            headerAlignment === "left"
                              ? "border-(--accent) text-slate-900"
                              : "border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900"
                          }`}
                        >
                          Left
                        </button>
                        <button
                          type="button"
                          onClick={() => setHeaderAlignment("center")}
                          aria-pressed={headerAlignment === "center"}
                          className={`flex-1 rounded-2xl border px-3 py-2 text-xs font-semibold transition ${
                            headerAlignment === "center"
                              ? "border-(--accent) text-slate-900"
                              : "border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900"
                          }`}
                        >
                          Center
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Tone
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setHeaderTone("bright")}
                          aria-pressed={headerTone === "bright"}
                          className={`flex-1 rounded-2xl border px-3 py-2 text-xs font-semibold transition ${
                            headerTone === "bright"
                              ? "border-(--accent) text-slate-900"
                              : "border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900"
                          }`}
                        >
                          Bright
                        </button>
                        <button
                          type="button"
                          onClick={() => setHeaderTone("soft")}
                          aria-pressed={headerTone === "soft"}
                          className={`flex-1 rounded-2xl border px-3 py-2 text-xs font-semibold transition ${
                            headerTone === "soft"
                              ? "border-(--accent) text-slate-900"
                              : "border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900"
                          }`}
                        >
                          Soft
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={hideHeaderElement}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                    >
                      Hide main title
                    </button>
                  </div>
                ) : selectedElement.type === "footer" ? (
                  <div className="mt-4 space-y-4 text-sm text-slate-700">
                    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
                      Link pill settings
                    </div>

                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Link text
                      </span>
                      <input
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
                        value={footerLink}
                        onChange={(event) => setFooterLink(event.target.value)}
                        type="text"
                        placeholder="twitch.tv/yourname"
                      />
                    </label>

                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Style
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setFooterStyle("solid")}
                          aria-pressed={footerStyle === "solid"}
                          className={`flex-1 rounded-2xl border px-3 py-2 text-xs font-semibold transition ${
                            footerStyle === "solid"
                              ? "border-(--accent) text-slate-900"
                              : "border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900"
                          }`}
                        >
                          Solid
                        </button>
                        <button
                          type="button"
                          onClick={() => setFooterStyle("glass")}
                          aria-pressed={footerStyle === "glass"}
                          className={`flex-1 rounded-2xl border px-3 py-2 text-xs font-semibold transition ${
                            footerStyle === "glass"
                              ? "border-(--accent) text-slate-900"
                              : "border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900"
                          }`}
                        >
                          Glass
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Size
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setFooterSize("regular")}
                          aria-pressed={footerSize === "regular"}
                          className={`flex-1 rounded-2xl border px-3 py-2 text-xs font-semibold transition ${
                            footerSize === "regular"
                              ? "border-(--accent) text-slate-900"
                              : "border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900"
                          }`}
                        >
                          Regular
                        </button>
                        <button
                          type="button"
                          onClick={() => setFooterSize("compact")}
                          aria-pressed={footerSize === "compact"}
                          className={`flex-1 rounded-2xl border px-3 py-2 text-xs font-semibold transition ${
                            footerSize === "compact"
                              ? "border-(--accent) text-slate-900"
                              : "border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900"
                          }`}
                        >
                          Compact
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={hideFooterElement}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                    >
                      Hide link pill
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white/80 px-4 py-6 text-sm text-slate-500">
                    No element selected yet.
                  </div>
                )}
              </div>
              </aside>
            ) : null}
          </section>
          {pendingDeleteDayId ? (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4"
              onClick={cancelDeleteDay}
            >
              <div
                className="w-full max-w-sm rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_30px_80px_rgba(20,27,42,0.3)]"
                onClick={(event) => event.stopPropagation()}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Delete day
                </p>
                <h3 className="mt-2 font-display text-2xl text-slate-900">
                  Remove {pendingDeleteDay?.day || "this day"}?
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  This will remove the streams and their time slots from the
                  schedule.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={cancelDeleteDay}
                    className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmDeleteDay}
                    className="flex-1 rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ) : null}
          {pendingDeleteStream ? (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4"
              onClick={cancelDeleteStream}
            >
              <div
                className="w-full max-w-sm rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_30px_80px_rgba(20,27,42,0.3)]"
                onClick={(event) => event.stopPropagation()}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Delete stream
                </p>
                <h3 className="mt-2 font-display text-2xl text-slate-900">
                  Remove{" "}
                  {pendingDeleteStreamInfo?.stream.title.trim() || "this stream"}
                  ?
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  This will remove the stream and its time slots from{" "}
                  {pendingDeleteStreamInfo?.day.day || "this day"}.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={cancelDeleteStream}
                    className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmDeleteStream}
                    className="flex-1 rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ) : null}
          {pendingClearAll ? (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4"
              onClick={cancelClearAll}
            >
              <div
                className="w-full max-w-sm rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_30px_80px_rgba(20,27,42,0.3)]"
                onClick={(event) => event.stopPropagation()}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Clear schedule
                </p>
                <h3 className="mt-2 font-display text-2xl text-slate-900">
                  Remove all days?
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  This will delete every day, stream, and time slot from the
                  schedule.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={cancelClearAll}
                    className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmClearAll}
                    className="flex-1 rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600"
                  >
                    Remove all
                  </button>
                </div>
              </div>
            </div>
          ) : null}
          {shareModalOpen ? (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4"
              onClick={closeShareModal}
            >
              <div
                className="w-full max-w-sm rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_30px_80px_rgba(20,27,42,0.3)]"
                onClick={(event) => event.stopPropagation()}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Share preview
                </p>
                <h3 className="mt-2 font-display text-2xl text-slate-900">
                  Share this schedule
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
                    onClick={closeShareModal}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}
