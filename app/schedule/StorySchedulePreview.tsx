"use client";

import { useEffect, useRef, useState, type DragEvent, type RefObject } from "react";

const DESIGN_WIDTH = 1080;
const DESIGN_HEIGHT = 1920;
const LANDSCAPE_WIDTH = 1200;
const LANDSCAPE_HEIGHT = 675;
const BASE_CONTENT_TOP = 150;
const BASE_CONTENT_BOTTOM = 120;
const HEADER_FONT_SIZE = 56;
const MIN_HEADER_FONT_SIZE = 28;
const HEADER_MAX_CHARS = 72;
const HEADER_CHARS_PER_LINE = 24;
const HEADER_GAP = 64;
const FOOTER_HEIGHT = 110;
const FOOTER_GAP = 40;
const DAY_CARD_HEIGHT = 250;
const OFF_DAY_CARD_HEIGHT = 140;
const DAY_CARD_THUMB_WIDTH = 260;
const OFF_DAY_THUMB_WIDTH = 220;
const ADD_BUTTON_HEIGHT = 76;
const EMPTY_STATE_HEIGHT = 110;
const LIST_GAP = 14;
const LANDSCAPE_PADDING = 28;
const LANDSCAPE_GAP = 14;
const LANDSCAPE_HEADER_SIZE = 42;
const LANDSCAPE_MIN_HEADER_SIZE = 26;
const LANDSCAPE_HEADER_MAX_CHARS = 64;
const LANDSCAPE_HEADER_CHARS_PER_LINE = 26;
const LANDSCAPE_TILE_PADDING = 12;
const LANDSCAPE_TILE_RADIUS = 20;
const LANDSCAPE_DAY_NAME_SIZE = 14;
const LANDSCAPE_DATE_SIZE = 13;
const LANDSCAPE_LIVE_SIZE = 13;
const LANDSCAPE_TITLE_SIZE = 24;
const LANDSCAPE_TZ_SIZE = 14;
const LANDSCAPE_TIME_SIZE = 16;
const LANDSCAPE_PILL_RADIUS = 16;
const LANDSCAPE_PILL_MIN_HEIGHT = 46;
const LANDSCAPE_FLAG_WIDTH = 22;
const LANDSCAPE_FLAG_HEIGHT = 16;

const canvasBackground =
  "radial-gradient(820px 560px at 22% 14%, rgba(124,58,237,0.28), transparent 64%)," +
  "radial-gradient(820px 600px at 84% 22%, rgba(34,211,238,0.16), transparent 66%)," +
  "linear-gradient(180deg, rgb(9,7,24), rgb(11,7,34))";

const thumbOverlay =
  "linear-gradient(135deg, rgba(124,58,237,0.16), rgba(34,211,238,0.1))";

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

type TimeSlot = {
  id: string;
  label: string;
  time: string;
  flag: FlagKey;
  zoneId: string;
  customLabel: string;
  customTime: string;
  customZone: string;
  customEmoji: string;
  customFlag: FlagKey;
};

type Stream = {
  id: string;
  title: string;
  thumbUrl: string;
  baseTime: string;
  times: TimeSlot[];
};

export type StoryDay = {
  id: string;
  day: string;
  date: string;
  off: boolean;
  streams: Stream[];
};

type StorySchedulePreviewProps = {
  days: StoryDay[];
  selectedDayId: string | null;
  selectedTarget: "day" | "header" | "footer" | null;
  onSelectDayAction: (id: string) => void;
  onSelectHeaderAction: () => void;
  onSelectFooterAction: () => void;
  onAddDayAction: (position: "top" | "bottom") => void;
  onDeleteDayAction: (id: string) => void;
  onReorderDayAction: (
    dragId: string,
    targetId: string,
    position: "before" | "after",
  ) => void;
  canAddDay: boolean;
  showAddControls: boolean;
  isExporting: boolean;
  canvasWidth: number;
  canvasHeight: number;
  showHeader: boolean;
  headerTitle: string;
  headerAlignment: "left" | "center";
  headerTone: "bright" | "soft";
  showFooter: boolean;
  footerLink: string;
  footerStyle: "solid" | "glass";
  footerSize: "regular" | "compact";
  exportRef?: RefObject<HTMLDivElement>;
};

function FlagUK() {
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

function FlagUS() {
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
      <g fill="#FFF">
        <circle cx="4" cy="4" r="1.1" />
        <circle cx="10" cy="4" r="1.1" />
        <circle cx="16" cy="4" r="1.1" />
        <circle cx="22" cy="4" r="1.1" />
        <circle cx="7" cy="8" r="1.1" />
        <circle cx="13" cy="8" r="1.1" />
        <circle cx="19" cy="8" r="1.1" />
        <circle cx="4" cy="12" r="1.1" />
        <circle cx="10" cy="12" r="1.1" />
        <circle cx="16" cy="12" r="1.1" />
        <circle cx="22" cy="12" r="1.1" />
        <circle cx="7" cy="16" r="1.1" />
        <circle cx="13" cy="16" r="1.1" />
        <circle cx="19" cy="16" r="1.1" />
      </g>
    </svg>
  );
}

function FlagEU() {
  return (
    <svg viewBox="0 0 60 42" xmlns="http://www.w3.org/2000/svg">
      <rect width="60" height="42" fill="#1e3a8a" />
      <g fill="#facc15">
        <circle cx="30" cy="10" r="2" />
        <circle cx="38" cy="12" r="2" />
        <circle cx="44" cy="18" r="2" />
        <circle cx="44" cy="26" r="2" />
        <circle cx="38" cy="32" r="2" />
        <circle cx="30" cy="34" r="2" />
        <circle cx="22" cy="32" r="2" />
        <circle cx="16" cy="26" r="2" />
        <circle cx="16" cy="18" r="2" />
        <circle cx="22" cy="12" r="2" />
      </g>
    </svg>
  );
}

function FlagJP() {
  return (
    <svg viewBox="0 0 60 42" xmlns="http://www.w3.org/2000/svg">
      <rect width="60" height="42" fill="#FFF" />
      <circle cx="30" cy="21" r="10" fill="#D7002D" />
    </svg>
  );
}

function FlagAU() {
  return (
    <svg viewBox="0 0 60 42" xmlns="http://www.w3.org/2000/svg">
      <rect width="60" height="42" fill="#0F1C6B" />
      <circle cx="18" cy="16" r="6" fill="#FFF" />
      <circle cx="44" cy="28" r="4" fill="#FDE047" />
    </svg>
  );
}

function FlagFR() {
  return (
    <svg viewBox="0 0 60 42" xmlns="http://www.w3.org/2000/svg">
      <rect width="20" height="42" fill="#0055A4" />
      <rect x="20" width="20" height="42" fill="#FFF" />
      <rect x="40" width="20" height="42" fill="#EF4135" />
    </svg>
  );
}

function FlagDE() {
  return (
    <svg viewBox="0 0 60 42" xmlns="http://www.w3.org/2000/svg">
      <rect width="60" height="14" fill="#000" />
      <rect y="14" width="60" height="14" fill="#DD0000" />
      <rect y="28" width="60" height="14" fill="#FFCE00" />
    </svg>
  );
}

function FlagES() {
  return (
    <svg viewBox="0 0 60 42" xmlns="http://www.w3.org/2000/svg">
      <rect width="60" height="10" fill="#AA151B" />
      <rect y="10" width="60" height="22" fill="#F1BF00" />
      <rect y="32" width="60" height="10" fill="#AA151B" />
    </svg>
  );
}

function FlagIT() {
  return (
    <svg viewBox="0 0 60 42" xmlns="http://www.w3.org/2000/svg">
      <rect width="20" height="42" fill="#009246" />
      <rect x="20" width="20" height="42" fill="#FFF" />
      <rect x="40" width="20" height="42" fill="#CE2B37" />
    </svg>
  );
}

function FlagBR() {
  return (
    <svg viewBox="0 0 60 42" xmlns="http://www.w3.org/2000/svg">
      <rect width="60" height="42" fill="#009C3B" />
      <polygon points="30,6 54,21 30,36 6,21" fill="#FFDF00" />
      <circle cx="30" cy="21" r="8" fill="#002776" />
    </svg>
  );
}

function FlagIN() {
  return (
    <svg viewBox="0 0 60 42" xmlns="http://www.w3.org/2000/svg">
      <rect width="60" height="14" fill="#FF9933" />
      <rect y="14" width="60" height="14" fill="#FFF" />
      <rect y="28" width="60" height="14" fill="#138808" />
      <circle cx="30" cy="21" r="4" fill="#000080" />
    </svg>
  );
}

function FlagKR() {
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

function FlagGlobe() {
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

function FlagIcon({ flag }: { flag: FlagKey }) {
  if (flag === "uk") return <FlagUK />;
  if (flag === "us") return <FlagUS />;
  if (flag === "eu") return <FlagEU />;
  if (flag === "jp") return <FlagJP />;
  if (flag === "au") return <FlagAU />;
  if (flag === "fr") return <FlagFR />;
  if (flag === "de") return <FlagDE />;
  if (flag === "es") return <FlagES />;
  if (flag === "it") return <FlagIT />;
  if (flag === "br") return <FlagBR />;
  if (flag === "in") return <FlagIN />;
  if (flag === "kr") return <FlagKR />;
  return <FlagGlobe />;
}

export default function StorySchedulePreview({
  days,
  selectedDayId,
  selectedTarget,
  onSelectDayAction,
  onSelectHeaderAction,
  onSelectFooterAction,
  onAddDayAction,
  onDeleteDayAction,
  onReorderDayAction,
  canAddDay,
  showAddControls,
  isExporting,
  canvasWidth,
  canvasHeight,
  showHeader,
  headerTitle,
  headerAlignment,
  headerTone,
  showFooter,
  footerLink,
  footerStyle,
  footerSize,
  exportRef,
}: StorySchedulePreviewProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.32);
  const [draggingDayId, setDraggingDayId] = useState<string | null>(null);
  const [dragOverDayId, setDragOverDayId] = useState<string | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<
    "before" | "after" | null
  >(null);
  const isLandscape = canvasWidth > canvasHeight;
  const canEdit = showAddControls && !isExporting;

  const handleDragStart = (event: DragEvent, dayId: string) => {
    if (!canEdit) return;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", dayId);
    setDraggingDayId(dayId);
    setDragOverDayId(null);
    setDragOverPosition(null);
    onSelectDayAction(dayId);
  };

  const handleDragOver = (event: DragEvent, dayId: string, axis: "x" | "y") => {
    if (!canEdit) return;
    event.preventDefault();
    if (dayId === draggingDayId) {
      setDragOverDayId(null);
      setDragOverPosition(null);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const midpoint =
      axis === "x"
        ? rect.left + rect.width / 2
        : rect.top + rect.height / 2;
    const cursor = axis === "x" ? event.clientX : event.clientY;
    const position = cursor < midpoint ? "before" : "after";
    setDragOverDayId(dayId);
    setDragOverPosition(position);
  };

  const handleDragLeave = (event: DragEvent) => {
    if (!canEdit) return;
    const related = event.relatedTarget as Node | null;
    if (related && event.currentTarget.contains(related)) return;
    setDragOverDayId(null);
    setDragOverPosition(null);
  };

  const handleDrop = (
    event: DragEvent,
    dayId: string,
    axis: "x" | "y",
  ) => {
    if (!canEdit) return;
    event.preventDefault();
    const dragId = draggingDayId ?? event.dataTransfer.getData("text/plain");
    if (!dragId || dragId === dayId) {
      setDragOverDayId(null);
      setDragOverPosition(null);
      setDraggingDayId(null);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const midpoint =
      axis === "x"
        ? rect.left + rect.width / 2
        : rect.top + rect.height / 2;
    const cursor = axis === "x" ? event.clientX : event.clientY;
    const position = cursor < midpoint ? "before" : "after";
    onReorderDayAction(dragId, dayId, position);
    setDragOverDayId(null);
    setDragOverPosition(null);
    setDraggingDayId(null);
  };

  const handleDragEnd = () => {
    setDragOverDayId(null);
    setDragOverPosition(null);
    setDraggingDayId(null);
  };

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const updateScale = () => {
      const width = wrapper.clientWidth;
      const height = wrapper.clientHeight;
      const nextScale = Math.min(
        width / canvasWidth,
        height / canvasHeight,
        1,
      );
      setScale(Number(nextScale.toFixed(4)));
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(wrapper);

    return () => observer.disconnect();
  }, [canvasWidth, canvasHeight]);

  const addDayButtonClass = `flex w-full items-center justify-center gap-3 rounded-3xl border-2 border-dashed font-semibold uppercase tracking-[0.24em] transition ${
    canAddDay
      ? "border-white/30 bg-white/5 text-white/80 hover:border-white/60 hover:text-white"
      : "cursor-not-allowed border-white/15 bg-white/5 text-white/40"
  }`;

  const dayCount = days.length;
  const offCount = days.reduce((total, day) => total + (day.off ? 1 : 0), 0);
  const addButtonCount = showAddControls ? (dayCount === 0 ? 1 : 2) : 0;
  const listItemsCount =
    dayCount === 0 ? 1 + addButtonCount : dayCount + addButtonCount;
  const widthScale = canvasWidth / DESIGN_WIDTH;
  const heightScale = canvasHeight / DESIGN_HEIGHT;
  const layoutScale = Math.min(widthScale, heightScale);
  const dayCardHeight = DAY_CARD_HEIGHT * heightScale;
  const offDayCardHeight = OFF_DAY_CARD_HEIGHT * heightScale;
  const addButtonHeight = ADD_BUTTON_HEIGHT * heightScale;
  const emptyStateHeight = EMPTY_STATE_HEIGHT * heightScale;
  const listGap = LIST_GAP * heightScale;
  const dayCardThumbWidth = DAY_CARD_THUMB_WIDTH * widthScale;
  const offDayThumbWidth = OFF_DAY_THUMB_WIDTH * widthScale;
  const baseListHeight =
    dayCount === 0
      ? emptyStateHeight +
        addButtonHeight * addButtonCount +
        listGap * (listItemsCount - 1)
      : (dayCount - offCount) * dayCardHeight +
        offCount * offDayCardHeight +
        addButtonHeight * addButtonCount +
        listGap * (listItemsCount - 1);
  const density = Math.max(dayCount, 1);
  const spacingScale = Math.max(
    0.78,
    Math.min(1.18, 1.12 - (density - 2) * 0.05),
  );
  const headerText = headerTitle || "Weekly Schedule";
  const headerLength = headerText.trim().length;
  const headerMaxChars = Math.max(
    32,
    Math.round(HEADER_MAX_CHARS * widthScale),
  );
  const headerCharsPerLine = Math.max(
    14,
    Math.round(HEADER_CHARS_PER_LINE * widthScale),
  );
  const headerBaseSize = HEADER_FONT_SIZE * layoutScale;
  const headerMinSize = MIN_HEADER_FONT_SIZE * layoutScale;
  const headerFontSize =
    headerLength <= headerMaxChars
      ? headerBaseSize
      : Math.max(
          headerMinSize,
          Math.round((headerBaseSize * headerMaxChars) / headerLength),
        );
  const headerLineHeight = 1.18;
  const headerLines = Math.min(
    3,
    Math.max(1, Math.ceil(headerLength / headerCharsPerLine)),
  );
  const headerPadding = Math.max(
    6 * layoutScale,
    Math.round(headerFontSize * 0.16),
  );
  const headerHeight =
    headerFontSize * headerLineHeight * headerLines + headerPadding;
  const headerColor =
    headerTone === "soft" ? "rgba(255,255,255,0.78)" : "rgba(255,255,255,0.96)";
  const headerAlign = headerAlignment === "center" ? "center" : "left";
  const isHeaderSelected = selectedTarget === "header";
  const isFooterSelected = selectedTarget === "footer";
  const footerClass =
    footerStyle === "solid"
      ? "border-white/25 bg-white/15"
      : "border-white/15 bg-white/5";
  const footerScale = layoutScale;
  const footerMetrics =
    footerSize === "compact"
      ? {
          paddingX: 40 * footerScale,
          paddingY: 22 * footerScale,
          fontSize: 32 * footerScale,
          gap: 18 * footerScale,
          dotSize: 14 * footerScale,
          dotShadow: 9 * footerScale,
        }
      : {
          paddingX: 52 * footerScale,
          paddingY: 34 * footerScale,
          fontSize: 38 * footerScale,
          gap: 24 * footerScale,
          dotSize: 18 * footerScale,
          dotShadow: 12 * footerScale,
        };
  const contentPaddingTop = BASE_CONTENT_TOP * heightScale * spacingScale;
  const contentPaddingBottom =
    BASE_CONTENT_BOTTOM * heightScale * spacingScale;
  const contentPaddingX = 64 * widthScale;
  const headerGap = HEADER_GAP * heightScale * spacingScale;
  const footerGap = FOOTER_GAP * heightScale * spacingScale;
  const footerHeight =
    (footerSize === "compact" ? 96 : FOOTER_HEIGHT) * heightScale;
  const reservedHeight =
    contentPaddingTop +
    contentPaddingBottom +
    (showHeader ? headerHeight + headerGap : 0) +
    (showFooter ? footerHeight + footerGap : 0);
  const availableHeight = Math.max(0, canvasHeight - reservedHeight);
  const countScale =
    dayCount <= 1
      ? 1.24
      : 1.16 - (Math.min(dayCount, 7) - 2) * 0.08;
  const fitScale = baseListHeight > 0 ? availableHeight / baseListHeight : 1;
  const listScale = Math.min(1.3, countScale, fitScale);
  const scaledListHeight = baseListHeight * listScale;
  const scaleX = (value: number) =>
    Number((value * widthScale * listScale).toFixed(2));
  const scaleY = (value: number) =>
    Number((value * heightScale * listScale).toFixed(2));
  const scaleUnit = (value: number) =>
    Number((value * layoutScale * listScale).toFixed(2));
  const scaleFont = (value: number) =>
    Math.round(value * layoutScale * listScale);
  const scaledGap = listGap * listScale;
  const scaledAddButtonHeight = addButtonHeight * listScale;
  const scaledEmptyStateHeight = emptyStateHeight * listScale;
  const scaledDayCardHeight = dayCardHeight * listScale;
  const scaledOffDayCardHeight = offDayCardHeight * listScale;
  const scaledDayThumbWidth = dayCardThumbWidth * listScale;
  const scaledOffDayThumbWidth = offDayThumbWidth * listScale;
  const portraitStreamBorderWidth = isExporting
    ? 1
    : Math.max(1, Math.round(1 / Math.max(scale, 0.2)));

  const landscapeWidthScale = canvasWidth / LANDSCAPE_WIDTH;
  const landscapeHeightScale = canvasHeight / LANDSCAPE_HEIGHT;
  const landscapeScale = Math.min(landscapeWidthScale, landscapeHeightScale);
  const landscapeX = (value: number) => value * landscapeWidthScale;
  const landscapeY = (value: number) => value * landscapeHeightScale;
  const landscapeUnit = (value: number) => value * landscapeScale;
  const landscapeFont = (value: number) => Math.round(value * landscapeScale);
  const landscapePadding = LANDSCAPE_PADDING * landscapeScale;
  const landscapeGap = LANDSCAPE_GAP * landscapeScale;
  const landscapeHeaderText = headerTitle || "Weekly Schedule";
  const landscapeHeaderLength = landscapeHeaderText.trim().length;
  const landscapeHeaderMaxChars = Math.max(
    36,
    Math.round(LANDSCAPE_HEADER_MAX_CHARS * landscapeWidthScale),
  );
  const landscapeHeaderCharsPerLine = Math.max(
    16,
    Math.round(LANDSCAPE_HEADER_CHARS_PER_LINE * landscapeWidthScale),
  );
  const landscapeHeaderBaseSize = LANDSCAPE_HEADER_SIZE * landscapeScale;
  const landscapeHeaderMinSize = LANDSCAPE_MIN_HEADER_SIZE * landscapeScale;
  const landscapeHeaderFontSize =
    landscapeHeaderLength <= landscapeHeaderMaxChars
      ? landscapeHeaderBaseSize
      : Math.max(
          landscapeHeaderMinSize,
          Math.round(
            (landscapeHeaderBaseSize * landscapeHeaderMaxChars) /
              landscapeHeaderLength,
          ),
        );
  const landscapeHeaderLineHeight = 1.14;
  const landscapeHeaderLines = Math.min(
    3,
    Math.max(1, Math.ceil(landscapeHeaderLength / landscapeHeaderCharsPerLine)),
  );
  const landscapeHeaderPadding = Math.max(
    4 * landscapeScale,
    Math.round(landscapeHeaderFontSize * 0.14),
  );
  const landscapeHeaderHeight =
    landscapeHeaderFontSize * landscapeHeaderLineHeight * landscapeHeaderLines +
    landscapeHeaderPadding;
  const landscapeFooterMetrics =
    footerSize === "compact"
      ? {
          paddingX: 22 * landscapeScale,
          paddingY: 12 * landscapeScale,
          fontSize: 18 * landscapeScale,
          gap: 10 * landscapeScale,
          dotSize: 10 * landscapeScale,
          dotShadow: 6 * landscapeScale,
        }
      : {
          paddingX: 26 * landscapeScale,
          paddingY: 16 * landscapeScale,
          fontSize: 22 * landscapeScale,
          gap: 14 * landscapeScale,
          dotSize: 12 * landscapeScale,
          dotShadow: 8 * landscapeScale,
        };
  const landscapeFooterHeight = 52 * landscapeScale;
  const landscapeDensityScale = Math.max(
    0.72,
    1 - Math.max(0, dayCount - 4) * 0.06,
  );
  const tileScale = landscapeScale * landscapeDensityScale;
  const tileUnit = (value: number) => value * tileScale;
  const tileFont = (value: number) => Math.round(value * tileScale);
  const tilePadding = LANDSCAPE_TILE_PADDING * tileScale;
  const tileOffPadding = tilePadding * 0.7;
  const tileRadius = LANDSCAPE_TILE_RADIUS * tileScale;
  const gridGap = 10 * tileScale;
  const addButtonHeightLandscape = 46 * landscapeScale;
  const addColumnWeight = Math.max(0.04, Math.min(0.08, 0.07 - dayCount * 0.004));
  const offDayWeight = Math.max(0.55, Math.min(0.85, 0.8 - dayCount * 0.04));
  const streamDayWeight = 1;

  const renderAddDayButton = (
    position: "top" | "bottom",
    label: string,
  ) => (
    <button
      type="button"
      onClick={() => onAddDayAction(position)}
      disabled={!canAddDay}
      className={addDayButtonClass}
      style={{
        height: scaledAddButtonHeight,
        padding: `${scaleY(24)}px ${scaleX(16)}px`,
        fontSize: scaleFont(13),
        gap: scaleUnit(12),
      }}
    >
      <span className="font-black" style={{ fontSize: scaleFont(22) }}>
        +
      </span>
      {label}
    </button>
  );

  const renderLandscapeAddButton = (
    position: "top" | "bottom",
    label: string,
  ) => (
    <button
      type="button"
      onClick={() => onAddDayAction(position)}
      disabled={!canAddDay}
      className={addDayButtonClass}
      style={{
        height: addButtonHeightLandscape,
        padding: `${landscapeY(12)}px ${landscapeX(12)}px`,
        fontSize: landscapeFont(11),
        gap: landscapeUnit(8),
      }}
    >
      <span className="font-black" style={{ fontSize: landscapeFont(16) }}>
        +
      </span>
      {label}
    </button>
  );

  if (isLandscape) {
    return (
      <div className="flex w-full justify-center">
        <div
          ref={wrapperRef}
          className="relative w-full max-w-245"
          style={{ aspectRatio: `${canvasWidth} / ${canvasHeight}` }}
        >
          <div
            ref={exportRef}
            className="absolute left-0 top-0"
            style={{
              width: canvasWidth,
              height: canvasHeight,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          >
            <div
              className={`relative h-full w-full overflow-hidden rounded-[38px] border border-white/10 text-white ${
                isExporting ? "shadow-none" : "shadow-[0_28px_85px_rgba(0,0,0,0.58)]"
              }`}
              style={{ backgroundImage: canvasBackground }}
            >
              <div
                className="absolute inset-0 flex flex-col"
                style={{
                  padding: landscapePadding,
                  gap: landscapeGap,
                }}
              >
                {showHeader ? (
                  <div className="flex items-end" style={{ height: landscapeHeaderHeight }}>
                    <button
                      type="button"
                      onClick={onSelectHeaderAction}
                      aria-pressed={isHeaderSelected}
                      className={`w-full rounded-[20px] transition focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-cyan-300 ${
                        isHeaderSelected
                          ? "ring-2 ring-cyan-300/80 bg-white/5"
                          : "ring-1 ring-transparent"
                      }`}
                      style={{
                        textAlign: headerAlign,
                        color: headerColor,
                      }}
                    >
                      <span
                        className="font-black leading-[1.05] tracking-[-0.02em] wrap-break-word"
                        style={{
                          fontSize: landscapeHeaderFontSize,
                          lineHeight: landscapeHeaderLineHeight,
                          paddingBottom: landscapeHeaderPadding,
                          display: "-webkit-box",
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {landscapeHeaderText}
                      </span>
                    </button>
                  </div>
                ) : null}

                <main
                  className="flex min-h-0 flex-1 flex-col"
                  style={{ gap: landscapeGap }}
                >
                  {days.length === 0 ? (
                    <div className="flex flex-col" style={{ gap: landscapeGap }}>
                      <div
                        className="rounded-[20px] border border-dashed border-white/20 bg-white/5 text-center text-sm text-white/70"
                        style={{
                          padding: `${landscapeY(32)}px ${landscapeX(24)}px`,
                          fontSize: landscapeFont(13),
                        }}
                      >
                        No days yet. Add your first day to get started.
                      </div>
                      {showAddControls
                        ? renderLandscapeAddButton("bottom", "Add your first day")
                        : null}
                    </div>
                  ) : null}
                  {days.length > 0 ? (
                    <div
                      className="flex min-h-0 flex-1 items-stretch"
                      style={{ gap: landscapeGap }}
                    >
                      {showAddControls ? (
                        <button
                          type="button"
                          onClick={() => onAddDayAction("top")}
                          disabled={!canAddDay}
                          className={addDayButtonClass}
                          style={{
                            flex: `${addColumnWeight} 1 0`,
                            height: "100%",
                            padding: `${landscapeY(18)}px ${landscapeX(12)}px`,
                            fontSize: landscapeFont(11),
                            gap: landscapeUnit(10),
                            borderRadius: tileRadius,
                          }}
                        >
                          <span
                            className="font-black"
                            style={{ fontSize: landscapeFont(16) }}
                          >
                            +
                          </span>
                          Add day
                        </button>
                      ) : null}
                      <div
                        className="flex min-h-0 flex-1 items-stretch"
                        style={{ gap: gridGap }}
                      >
                        {days.map((day) => {
                          const isSelected =
                            selectedTarget === "day" && day.id === selectedDayId;
                          const isDragging = draggingDayId === day.id;
                          const isDragOver =
                            dragOverDayId === day.id && draggingDayId !== day.id;
                          const dropIndicator =
                            isDragOver && dragOverPosition
                              ? dragOverPosition
                              : null;
                          const tileWeight = day.off ? offDayWeight : streamDayWeight;
                          const streamCount = day.streams.length;
                          const primaryStream = day.streams[0] ?? {
                            id: "stream-empty",
                            title: "",
                            thumbUrl: "",
                            baseTime: "20:30",
                            times: [],
                          };

                          if (!day.off && streamCount <= 1) {
                            const slotCount = primaryStream.times.length;
                            const slotScale = Math.max(
                              0.78,
                              Math.min(
                                1,
                                1 - Math.max(0, slotCount - 2) * 0.12,
                              ),
                            );
                            const slotUnit = (value: number) =>
                              tileUnit(value) * slotScale;
                            const flagWidth =
                              LANDSCAPE_FLAG_WIDTH * tileScale * slotScale;
                            const flagHeight =
                              LANDSCAPE_FLAG_HEIGHT * tileScale * slotScale;
                            const emojiFont = Math.max(
                              10,
                              Math.round(flagHeight * 1.25),
                            );
                            const backgroundImage = primaryStream.thumbUrl
                              ? `${thumbOverlay}, linear-gradient(180deg, rgba(8,8,14,0.5), rgba(8,8,14,0.5)), url("${primaryStream.thumbUrl}")`
                              : `${thumbOverlay}, linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0))`;

                            return (
                              <div
                                key={day.id}
                                className="relative flex min-h-0 flex-col"
                                style={{
                                  flex: `${tileWeight} 1 0`,
                                  height: "100%",
                                  minWidth: 0,
                                }}
                              >
                                {dropIndicator ? (
                                  <div
                                    aria-hidden="true"
                                    className="pointer-events-none absolute top-0 bottom-0"
                                    style={{
                                      left:
                                        dropIndicator === "before"
                                          ? tileUnit(-6)
                                          : "auto",
                                      right:
                                        dropIndicator === "after"
                                          ? tileUnit(-6)
                                          : "auto",
                                      width: tileUnit(4),
                                      borderRadius: tileUnit(4),
                                      background:
                                        "linear-gradient(180deg, rgba(251,191,36,0.1), rgba(251,191,36,0.9), rgba(251,191,36,0.1))",
                                      boxShadow:
                                        "0 0 0 1px rgba(251,191,36,0.65), 0 0 18px rgba(251,191,36,0.45)",
                                      zIndex: 15,
                                    }}
                                  />
                                ) : null}
                                <button
                                  type="button"
                                  onClick={() => onSelectDayAction(day.id)}
                                  draggable={canEdit}
                                  onDragStart={(event) =>
                                    handleDragStart(event, day.id)
                                  }
                                  onDragOver={(event) =>
                                    handleDragOver(event, day.id, "x")
                                  }
                                  onDragLeave={handleDragLeave}
                                  onDrop={(event) => handleDrop(event, day.id, "x")}
                                  onDragEnd={handleDragEnd}
                                  aria-pressed={isSelected}
                                  className={`relative flex min-h-0 w-full flex-1 flex-col border text-left transition focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-cyan-300 ${
                                    isSelected
                                      ? "border-cyan-300/80"
                                      : "border-white/20"
                                  } ${day.off ? "border-2 border-dashed" : ""} ${
                                    canEdit
                                      ? "cursor-grab active:cursor-grabbing"
                                      : ""
                                  }`}
                                  style={{
                                    borderRadius: tileRadius,
                                    padding: tilePadding,
                                    backgroundColor: "rgba(255,255,255,0.06)",
                                    backgroundImage,
                                    backgroundSize: "cover",
                                    backgroundPosition: "center",
                                    backgroundBlendMode: "screen, normal, normal",
                                    boxShadow: isSelected
                                      ? `0 0 0 ${tileUnit(2)}px rgba(56,189,248,0.85) inset`
                                      : "none",
                                    outline: isDragOver
                                      ? `${tileUnit(1.5)}px solid rgba(251,191,36,0.7)`
                                      : "none",
                                    outlineOffset: tileUnit(2),
                                    opacity: isDragging ? 0.6 : 1,
                                  }}
                                >
                                  <div className="relative z-10 flex min-h-0 flex-1 flex-col">
                                    <div
                                      className="font-black uppercase tracking-[0.12em] text-white/85"
                                      style={{
                                        fontSize: tileFont(LANDSCAPE_DAY_NAME_SIZE),
                                        paddingTop: tileUnit(2),
                                      }}
                                    >
                                      {day.day}
                                    </div>
                                    <div
                                      className="flex flex-wrap items-center"
                                      style={{
                                        gap: tileUnit(8),
                                        marginTop: tileUnit(8),
                                      }}
                                    >
                                      <div
                                        className="inline-flex items-center rounded-full border border-white/20 bg-black/60 font-black uppercase tracking-widest text-white/95"
                                        style={{
                                          gap: tileUnit(8),
                                          padding: `${tileUnit(6)}px ${tileUnit(9)}px`,
                                          fontSize: tileFont(LANDSCAPE_LIVE_SIZE),
                                        }}
                                      >
                                        <span
                                          className="rounded-full bg-red-500"
                                          style={{
                                            width: tileUnit(9),
                                            height: tileUnit(9),
                                            boxShadow: `0 0 0 ${tileUnit(6)}px rgba(255,45,45,0.16)`,
                                          }}
                                        />
                                        <span>Live</span>
                                      </div>
                                      <div
                                        className="inline-flex items-center rounded-full border border-white/20 bg-white/20 font-black uppercase tracking-[0.06em] text-white/85"
                                        style={{
                                          padding: `${tileUnit(6)}px ${tileUnit(9)}px`,
                                          fontSize: tileFont(LANDSCAPE_DATE_SIZE),
                                        }}
                                      >
                                        {day.date || "TBD"}
                                      </div>
                                    </div>
                                  </div>

                                  <div
                                    className="absolute left-0 right-0 flex flex-col"
                                    style={{
                                      left: tilePadding,
                                      right: tilePadding,
                                      top: "50%",
                                      transform: "translateY(-50%)",
                                      gap: tileUnit(12),
                                    }}
                                  >
                                    <div
                                      className="font-black leading-[1.18] tracking-[-0.01em]"
                                      style={{
                                        fontSize: tileFont(LANDSCAPE_TITLE_SIZE),
                                        display: "-webkit-box",
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: "vertical",
                                        overflow: "hidden",
                                        wordBreak: "break-word",
                                      }}
                                    >
                                      {primaryStream.title || "Untitled stream"}
                                    </div>
                                    <div
                                      className="flex flex-col"
                                      style={{ gap: slotUnit(8) }}
                                    >
                                      {primaryStream.times.length === 0 ? (
                                        <div
                                          className="w-full rounded-2xl border border-dashed border-white/20 bg-white/5 font-semibold uppercase tracking-[0.14em] text-white/70"
                                          style={{
                                            minHeight:
                                              LANDSCAPE_PILL_MIN_HEIGHT *
                                              tileScale *
                                              slotScale,
                                            padding: `${slotUnit(8)}px ${slotUnit(
                                              10,
                                            )}px`,
                                            fontSize: Math.max(
                                              9,
                                              Math.round(
                                                tileFont(10) * slotScale,
                                              ),
                                            ),
                                          }}
                                        >
                                          Add time slot
                                        </div>
                                      ) : (
                                        primaryStream.times.map((slot) => {
                                          const hasCustomEmoji =
                                            slot.zoneId === "custom" &&
                                            Boolean(slot.customEmoji);

                                          return (
                                            <div
                                              key={slot.id}
                                              className="flex w-full items-center rounded-2xl border border-white/20 bg-white/20 text-white/95"
                                              style={{
                                                minHeight:
                                                  LANDSCAPE_PILL_MIN_HEIGHT *
                                                  tileScale *
                                                  slotScale,
                                                padding: `${slotUnit(4)}px ${slotUnit(
                                                  10,
                                                )}px`,
                                                borderRadius:
                                                  LANDSCAPE_PILL_RADIUS *
                                                  tileScale *
                                                  slotScale,
                                              }}
                                            >
                                              <div
                                                className="flex w-full items-center"
                                                style={{ gap: slotUnit(8) }}
                                              >
                                                <span
                                                  className={`overflow-hidden rounded-[3px] ${
                                                    hasCustomEmoji
                                                      ? "shadow-none"
                                                      : "shadow-[0_0_0_1px_rgba(255,255,255,0.18)]"
                                                  }`}
                                                  style={{
                                                    width: flagWidth,
                                                    height: flagHeight,
                                                  }}
                                                >
                                                  {hasCustomEmoji ? (
                                                    <span
                                                      className="flex h-full w-full items-center justify-center"
                                                      style={{
                                                        fontSize: emojiFont,
                                                        lineHeight: 1,
                                                      }}
                                                    >
                                                      {slot.customEmoji}
                                                    </span>
                                                  ) : (
                                                    <FlagIcon flag={slot.flag} />
                                                  )}
                                                </span>
                                                <span
                                                  className="min-w-0 truncate font-black uppercase tracking-widest text-white/80"
                                                  style={{
                                                    fontSize: Math.max(
                                                      9,
                                                      Math.round(
                                                        tileFont(
                                                          LANDSCAPE_TZ_SIZE,
                                                        ) * slotScale,
                                                      ),
                                                    ),
                                                  }}
                                                >
                                                  {slot.label}
                                                </span>
                                                <span
                                                  className="font-black"
                                                  style={{
                                                    marginLeft: "auto",
                                                    fontSize: Math.max(
                                                      9,
                                                      Math.round(
                                                        tileFont(
                                                          LANDSCAPE_TIME_SIZE,
                                                        ) * slotScale,
                                                      ),
                                                    ),
                                                  }}
                                                >
                                                  {slot.time}
                                                </span>
                                              </div>
                                            </div>
                                          );
                                        })
                                      )}
                                    </div>
                                  </div>
                                </button>
                                {canEdit && isSelected ? (
                                  <button
                                    type="button"
                                    aria-label="Delete day"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      onDeleteDayAction(day.id);
                                    }}
                                    className="absolute flex items-center justify-center rounded-full bg-red-500 text-white shadow-[0_6px_18px_rgba(0,0,0,0.35)] transition hover:bg-red-600"
                                    style={{
                                      top: tileUnit(6),
                                      right: tileUnit(6),
                                      width: tileUnit(28),
                                      height: tileUnit(28),
                                      zIndex: 10,
                                      fontSize: tileFont(14),
                                      pointerEvents: "auto",
                                    }}
                                  >
                                    x
                                  </button>
                                ) : null}
                              </div>
                            );
                          }

                          const streamScale = Math.max(
                            0.6,
                            1 - Math.max(0, streamCount - 1) * 0.18,
                          );
                          const streamPillScale = Math.max(
                            0.65,
                            1 - Math.max(0, streamCount - 1) * 0.14,
                          );
                          const streamUnit = (value: number) =>
                            tileUnit(value) * streamScale;
                          const streamFont = (value: number) =>
                            Math.round(tileFont(value) * streamScale);
                          return (
                            <div
                              key={day.id}
                              className="relative flex min-h-0 flex-col"
                              style={{
                                flex: `${tileWeight} 1 0`,
                                height: "100%",
                                minWidth: 0,
                              }}
                            >
                              {dropIndicator ? (
                                <div
                                  aria-hidden="true"
                                  className="pointer-events-none absolute top-0 bottom-0"
                                  style={{
                                    left:
                                      dropIndicator === "before"
                                        ? tileUnit(-6)
                                        : "auto",
                                    right:
                                      dropIndicator === "after"
                                        ? tileUnit(-6)
                                        : "auto",
                                    width: tileUnit(4),
                                    borderRadius: tileUnit(4),
                                    background:
                                      "linear-gradient(180deg, rgba(251,191,36,0.1), rgba(251,191,36,0.9), rgba(251,191,36,0.1))",
                                    boxShadow:
                                      "0 0 0 1px rgba(251,191,36,0.65), 0 0 18px rgba(251,191,36,0.45)",
                                    zIndex: 15,
                                  }}
                                />
                              ) : null}
                              <button
                                type="button"
                                onClick={() => onSelectDayAction(day.id)}
                                draggable={canEdit}
                                onDragStart={(event) => handleDragStart(event, day.id)}
                                onDragOver={(event) =>
                                  handleDragOver(event, day.id, "x")
                                }
                                onDragLeave={handleDragLeave}
                                onDrop={(event) => handleDrop(event, day.id, "x")}
                                onDragEnd={handleDragEnd}
                                aria-pressed={isSelected}
                                className={`relative flex min-h-0 w-full flex-1 flex-col border text-left transition focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-cyan-300 ${
                                  isSelected
                                    ? "border-cyan-300/80"
                                    : "border-white/20"
                                } ${day.off ? "border-2 border-dashed" : ""} ${
                                  canEdit ? "cursor-grab active:cursor-grabbing" : ""
                                }`}
                                style={{
                                  borderRadius: tileRadius,
                                  padding: day.off ? tileOffPadding : tilePadding,
                                  backgroundColor: day.off
                                    ? "rgba(255,255,255,0.04)"
                                    : "rgba(255,255,255,0.06)",
                                  boxShadow: isSelected
                                    ? `0 0 0 ${tileUnit(2)}px rgba(56,189,248,0.85) inset`
                                    : "none",
                                  outline: isDragOver
                                    ? `${tileUnit(1.5)}px solid rgba(251,191,36,0.7)`
                                    : "none",
                                  outlineOffset: tileUnit(2),
                                  opacity: isDragging ? 0.6 : 1,
                                }}
                              >
                            <div
                              className="relative z-10 flex min-h-0 flex-1 flex-col"
                              style={{ gap: tileUnit(10) }}
                            >
                              <div
                                className="flex flex-col"
                                style={{ gap: tileUnit(8) }}
                              >
                                <div
                                  className="font-black uppercase tracking-[0.12em] text-white/85"
                                  style={{
                                    fontSize: tileFont(LANDSCAPE_DAY_NAME_SIZE),
                                    paddingTop: tileUnit(2),
                                  }}
                                >
                                  {day.day}
                                </div>
                                {!day.off ? (
                                  <div
                                    className="flex flex-wrap items-center"
                                    style={{
                                      gap: tileUnit(8),
                                    }}
                                  >
                                    <div
                                      className="inline-flex items-center rounded-full border border-white/20 bg-black/60 font-black uppercase tracking-widest text-white/95"
                                      style={{
                                        gap: tileUnit(8),
                                        padding: `${tileUnit(6)}px ${tileUnit(9)}px`,
                                        fontSize: tileFont(LANDSCAPE_LIVE_SIZE),
                                      }}
                                    >
                                      <span
                                        className="rounded-full bg-red-500"
                                        style={{
                                          width: tileUnit(9),
                                          height: tileUnit(9),
                                          boxShadow: `0 0 0 ${tileUnit(6)}px rgba(255,45,45,0.16)`,
                                        }}
                                      />
                                      <span>Live</span>
                                    </div>
                                    <div
                                      className="inline-flex items-center rounded-full border border-white/20 bg-white/20 font-black uppercase tracking-[0.06em] text-white/85"
                                      style={{
                                        padding: `${tileUnit(6)}px ${tileUnit(9)}px`,
                                        fontSize: tileFont(LANDSCAPE_DATE_SIZE),
                                      }}
                                    >
                                      {day.date || "TBD"}
                                    </div>
                                  </div>
                                ) : (
                                  <div
                                    className="font-semibold text-white/65"
                                    style={{ fontSize: tileFont(13) }}
                                  >
                                  No streams scheduled
                                  </div>
                                )}
                              </div>

                              {!day.off ? (
                                <div
                                  className="flex min-h-0 flex-1 flex-col"
                                  style={{ gap: streamUnit(8) }}
                                >
                                  {day.streams.length === 0 ? (
                                    <div
                                      className="w-full rounded-2xl border border-dashed border-white/20 bg-white/5 font-semibold uppercase tracking-[0.14em] text-white/70"
                                      style={{
                                        minHeight:
                                          LANDSCAPE_PILL_MIN_HEIGHT * tileScale,
                                        padding: `${streamUnit(8)}px ${streamUnit(10)}px`,
                                        fontSize: streamFont(10),
                                      }}
                                    >
                                      Add stream
                                    </div>
                                  ) : (
                                    day.streams.map((stream) => {
                                      const slotCount = stream.times.length;
                                      const slotScale =
                                        Math.max(
                                          0.72,
                                          Math.min(
                                            1,
                                            1 - Math.max(0, slotCount - 2) * 0.12,
                                          ),
                                        ) * streamScale * streamPillScale;
                                      const slotUnit = (value: number) =>
                                        tileUnit(value) * slotScale;
                                      const flagWidth =
                                        LANDSCAPE_FLAG_WIDTH * tileScale * slotScale;
                                      const flagHeight =
                                        LANDSCAPE_FLAG_HEIGHT * tileScale * slotScale;
                                      const emojiFont = Math.max(
                                        10,
                                        Math.round(flagHeight * 1.25),
                                      );
                                      const streamBackground = stream.thumbUrl
                                        ? `${thumbOverlay}, linear-gradient(180deg, rgba(8,8,14,0.55), rgba(8,8,14,0.55)), url("${stream.thumbUrl}")`
                                        : `${thumbOverlay}, linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0))`;

                                      return (
                                        <div
                                          key={stream.id}
                                          className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/15 bg-white/10 text-white/95"
                                          style={{
                                            gap: streamUnit(6),
                                            padding: `${streamUnit(8)}px ${streamUnit(
                                              10,
                                            )}px`,
                                            backgroundImage: streamBackground,
                                            backgroundSize: "cover",
                                            backgroundPosition: "center",
                                            backgroundBlendMode:
                                              "screen, normal, normal",
                                          }}
                                        >
                                          <div
                                            className="font-black leading-[1.16] tracking-[-0.01em]"
                                            style={{
                                              fontSize: streamFont(
                                                LANDSCAPE_TITLE_SIZE,
                                              ),
                                              display: "-webkit-box",
                                              WebkitLineClamp: 2,
                                              WebkitBoxOrient: "vertical",
                                              overflow: "hidden",
                                              wordBreak: "break-word",
                                            }}
                                          >
                                            {stream.title || "Untitled stream"}
                                          </div>
                                          <div
                                            className="flex flex-col"
                                            style={{ gap: slotUnit(6) }}
                                          >
                                            {stream.times.length === 0 ? (
                                              <div
                                                className="w-full rounded-[14px] border border-dashed border-white/20 bg-white/5 font-semibold uppercase tracking-[0.14em] text-white/70"
                                                style={{
                                                  minHeight:
                                                    LANDSCAPE_PILL_MIN_HEIGHT *
                                                    tileScale *
                                                    slotScale,
                                                  padding: `${slotUnit(6)}px ${slotUnit(
                                                    8,
                                                  )}px`,
                                                  fontSize: Math.max(
                                                    9,
                                                    Math.round(
                                                      tileFont(10) * slotScale,
                                                    ),
                                                  ),
                                                }}
                                              >
                                                Add time slot
                                              </div>
                                            ) : (
                                              stream.times.map((slot) => {
                                                const hasCustomEmoji =
                                                  slot.zoneId === "custom" &&
                                                  Boolean(slot.customEmoji);

                                                return (
                                                  <div
                                                    key={slot.id}
                                                    className="flex w-full items-center rounded-[14px] border border-white/20 bg-white/20 text-white/95"
                                                    style={{
                                                      minHeight:
                                                        LANDSCAPE_PILL_MIN_HEIGHT *
                                                        tileScale *
                                                        slotScale,
                                                      padding: `${slotUnit(
                                                        4,
                                                      )}px ${slotUnit(8)}px`,
                                                      borderRadius:
                                                        LANDSCAPE_PILL_RADIUS *
                                                        tileScale *
                                                        slotScale,
                                                    }}
                                                  >
                                                    <div
                                                      className="flex w-full items-center"
                                                      style={{ gap: slotUnit(6) }}
                                                    >
                                                      <span
                                                        className={`overflow-hidden rounded-[3px] ${
                                                          hasCustomEmoji
                                                            ? "shadow-none"
                                                            : "shadow-[0_0_0_1px_rgba(255,255,255,0.18)]"
                                                        }`}
                                                        style={{
                                                          width: flagWidth,
                                                          height: flagHeight,
                                                        }}
                                                      >
                                                        {hasCustomEmoji ? (
                                                          <span
                                                            className="flex h-full w-full items-center justify-center"
                                                            style={{
                                                              fontSize: emojiFont,
                                                              lineHeight: 1,
                                                            }}
                                                          >
                                                            {slot.customEmoji}
                                                          </span>
                                                        ) : (
                                                          <FlagIcon
                                                            flag={slot.flag}
                                                          />
                                                        )}
                                                      </span>
                                                      <span
                                                        className="min-w-0 truncate font-black uppercase tracking-widest text-white/80"
                                                        style={{
                                                          fontSize: Math.max(
                                                            9,
                                                            Math.round(
                                                              tileFont(
                                                                LANDSCAPE_TZ_SIZE,
                                                              ) * slotScale,
                                                            ),
                                                          ),
                                                        }}
                                                      >
                                                        {slot.label}
                                                      </span>
                                                      <span
                                                        className="font-black"
                                                        style={{
                                                          marginLeft: "auto",
                                                          fontSize: Math.max(
                                                            9,
                                                            Math.round(
                                                              tileFont(
                                                                LANDSCAPE_TIME_SIZE,
                                                              ) * slotScale,
                                                            ),
                                                          ),
                                                        }}
                                                      >
                                                        {slot.time}
                                                      </span>
                                                    </div>
                                                  </div>
                                                );
                                              })
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                              ) : null}
                            </div>
                              </button>
                                {canEdit && isSelected ? (
                                  <button
                                    type="button"
                                    aria-label="Delete day"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      onDeleteDayAction(day.id);
                                    }}
                                    className="absolute flex items-center justify-center rounded-full bg-red-500 text-white shadow-[0_6px_18px_rgba(0,0,0,0.35)] transition hover:bg-red-600"
                                    style={{
                                      top: tileUnit(6),
                                      right: tileUnit(6),
                                      width: tileUnit(28),
                                      height: tileUnit(28),
                                      zIndex: 10,
                                      fontSize: tileFont(14),
                                      pointerEvents: "auto",
                                    }}
                                  >
                                    x
                                  </button>
                                ) : null}
                            </div>
                        );
                      })}
                      </div>
                      {showAddControls ? (
                        <button
                          type="button"
                          onClick={() => onAddDayAction("bottom")}
                          disabled={!canAddDay}
                          className={addDayButtonClass}
                          style={{
                            flex: `${addColumnWeight} 1 0`,
                            height: "100%",
                            padding: `${landscapeY(18)}px ${landscapeX(12)}px`,
                            fontSize: landscapeFont(11),
                            gap: landscapeUnit(10),
                            borderRadius: tileRadius,
                          }}
                        >
                          <span
                            className="font-black"
                            style={{ fontSize: landscapeFont(16) }}
                          >
                            +
                          </span>
                          Add day
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </main>

                {showFooter ? (
                  <footer className="flex justify-center">
                    <button
                      type="button"
                      onClick={onSelectFooterAction}
                      aria-pressed={isFooterSelected}
                      className={`inline-flex items-center rounded-full font-black leading-none tracking-[0.02em] text-white/95 transition focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-cyan-300 ${footerClass}`}
                      style={{
                        minHeight: landscapeFooterHeight,
                        padding: `${landscapeFooterMetrics.paddingY}px ${landscapeFooterMetrics.paddingX}px`,
                        fontSize: landscapeFooterMetrics.fontSize,
                        gap: landscapeFooterMetrics.gap,
                        boxShadow: isFooterSelected
                          ? `0 0 0 ${landscapeUnit(1.5)}px rgba(56,189,248,0.85) inset`
                          : `0 0 0 ${landscapeUnit(1)}px rgba(255,255,255,0.24) inset`,
                      }}
                    >
                      <span
                        className="rounded-full bg-red-500"
                        style={{
                          width: landscapeFooterMetrics.dotSize,
                          height: landscapeFooterMetrics.dotSize,
                          boxShadow: `0 0 0 ${landscapeFooterMetrics.dotShadow}px rgba(255,45,45,0.16)`,
                        }}
                      />
                      {footerLink || "twitch.tv/yourname"}
                    </button>
                  </footer>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full justify-center">
      <div
        ref={wrapperRef}
        className="relative w-full max-w-130"
        style={{ aspectRatio: `${canvasWidth} / ${canvasHeight}` }}
      >
        <div
          ref={exportRef}
          className="absolute left-0 top-0"
          data-exporting={isExporting ? "true" : "false"}
          style={{
            width: canvasWidth,
            height: canvasHeight,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <div
            className={`relative h-full w-full overflow-hidden rounded-[38px] border border-white/10 text-white ${
              isExporting ? "shadow-none" : "shadow-[0_28px_85px_rgba(0,0,0,0.58)]"
            }`}
            style={{ backgroundImage: canvasBackground }}
          >
            <div
              className="absolute inset-0 flex flex-col justify-center"
              style={{
                paddingTop: contentPaddingTop,
                paddingBottom: contentPaddingBottom,
                paddingLeft: contentPaddingX,
                paddingRight: contentPaddingX,
              }}
            >
              {showHeader ? (
                <div
                  className="flex items-end"
                  style={{ height: headerHeight, marginBottom: headerGap }}
                >
                  <button
                    type="button"
                    onClick={onSelectHeaderAction}
                    aria-pressed={isHeaderSelected}
                    className={`w-full rounded-3xl transition focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-cyan-300 ${
                      isHeaderSelected
                        ? "ring-2 ring-cyan-300/80 bg-white/5"
                        : "ring-1 ring-transparent"
                    }`}
                    style={{
                      textAlign: headerAlign,
                      color: headerColor,
                    }}
                  >
                    <span
                      className="text-[56px] font-black leading-[1.05] tracking-[-0.02em] wrap-break-word"
                      style={{
                        fontSize: headerFontSize,
                        lineHeight: headerLineHeight,
                        paddingBottom: headerPadding,
                        display: "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {headerText}
                    </span>
                  </button>
                </div>
              ) : null}

              <main className="relative" style={{ height: scaledListHeight }}>
                <div
                  className="flex flex-col"
                  style={{
                    gap: scaledGap,
                  }}
                >
                  {days.length === 0 ? (
                    <div className="flex flex-col" style={{ gap: scaledGap }}>
                      <div
                        className="rounded-[28px] border border-dashed border-white/20 bg-white/5 px-6 py-10 text-center text-sm text-white/70"
                        style={{
                          height: scaledEmptyStateHeight,
                          padding: `${scaleY(40)}px ${scaleX(24)}px`,
                          fontSize: scaleFont(14),
                        }}
                      >
                        No days yet. Add your first day to get started.
                      </div>
                      {showAddControls
                        ? renderAddDayButton("bottom", "Add your first day")
                        : null}
                    </div>
                  ) : null}
                  {days.length > 0 && showAddControls
                    ? renderAddDayButton("top", "Add day (up to 7)")
                    : null}
                  {days.map((day) => {
                    const isSelected =
                      selectedTarget === "day" && day.id === selectedDayId;
                    const isDragging = draggingDayId === day.id;
                    const isDragOver =
                      dragOverDayId === day.id && draggingDayId !== day.id;
                    const dropIndicator =
                      isDragOver && dragOverPosition
                        ? dragOverPosition
                        : null;
                    if (day.off) {
                      return (
                        <div
                          key={day.id}
                          className="relative"
                          style={{ minWidth: 0 }}
                        >
                          {dropIndicator ? (
                            <div
                              aria-hidden="true"
                              className="pointer-events-none absolute left-0 right-0"
                              style={{
                                top:
                                  dropIndicator === "before"
                                    ? scaleUnit(-6)
                                    : "auto",
                                bottom:
                                  dropIndicator === "after"
                                    ? scaleUnit(-6)
                                    : "auto",
                                height: scaleUnit(4),
                                borderRadius: scaleUnit(4),
                                background:
                                  "linear-gradient(90deg, rgba(251,191,36,0.1), rgba(251,191,36,0.9), rgba(251,191,36,0.1))",
                                boxShadow:
                                  "0 0 0 1px rgba(251,191,36,0.65), 0 0 18px rgba(251,191,36,0.45)",
                                zIndex: 12,
                              }}
                            />
                          ) : null}
                          <button
                            type="button"
                            onClick={() => onSelectDayAction(day.id)}
                            draggable={canEdit}
                            onDragStart={(event) => handleDragStart(event, day.id)}
                            onDragOver={(event) =>
                              handleDragOver(event, day.id, "y")
                            }
                            onDragLeave={handleDragLeave}
                            onDrop={(event) => handleDrop(event, day.id, "y")}
                            onDragEnd={handleDragEnd}
                            aria-pressed={isSelected}
                            className={`grid h-35 w-full grid-cols-[220px_1fr] gap-4.5 rounded-[28px] border-2 border-dashed border-white/30 bg-white/5 p-4 text-left backdrop-blur-[10px] transition focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-cyan-300 ${
                              canEdit ? "cursor-grab active:cursor-grabbing" : ""
                            }`}
                            style={{
                              height: scaledOffDayCardHeight,
                              gridTemplateColumns: `${scaledOffDayThumbWidth}px 1fr`,
                              gap: scaleUnit(18),
                              padding: `${scaleY(16)}px ${scaleX(16)}px`,
                              boxShadow: isSelected
                                ? `0 0 0 ${scaleUnit(2)}px rgba(56,189,248,0.85) inset`
                                : "none",
                              outline: isDragOver
                                ? `${scaleUnit(1.5)}px solid rgba(251,191,36,0.7)`
                                : "none",
                              outlineOffset: scaleUnit(2),
                              opacity: isDragging ? 0.6 : 1,
                            }}
                          >
                            <div
                              className="relative aspect-video w-full max-h-full self-center overflow-hidden rounded-[18px]"
                              style={{
                                backgroundImage:
                                  "linear-gradient(135deg, rgba(124,58,237,0.1), rgba(34,211,238,0.06))",
                                backgroundColor: "rgba(0,0,0,0.18)",
                                boxShadow: `0 0 0 ${scaleUnit(1)}px rgba(255,255,255,0.18) inset`,
                              }}
                            />
                            <div
                              className="flex min-w-0 flex-col justify-center gap-2.5"
                              style={{ gap: scaleY(10) }}
                            >
                              <div className="flex flex-wrap items-center gap-3">
                                <div
                                  className="text-[18px] font-black uppercase tracking-[0.08em] text-white/75"
                                  style={{ fontSize: scaleFont(18) }}
                                >
                                  {day.day}
                                </div>
                              </div>
                              <div
                                className="text-[18px] font-semibold text-white/70"
                                style={{ fontSize: scaleFont(18) }}
                              >
                                No streams scheduled
                              </div>
                            </div>
                          </button>
                          {canEdit && isSelected ? (
                            <button
                              type="button"
                              aria-label="Delete day"
                              onClick={(event) => {
                                event.stopPropagation();
                                onDeleteDayAction(day.id);
                              }}
                              className="absolute flex items-center justify-center rounded-full bg-red-500 text-white shadow-[0_6px_18px_rgba(0,0,0,0.35)] transition hover:bg-red-600"
                              style={{
                                top: scaleY(10),
                                right: scaleX(10),
                                width: scaleUnit(26),
                                height: scaleUnit(26),
                                fontSize: scaleFont(14),
                              }}
                            >
                              x
                            </button>
                          ) : null}
                        </div>
                      );
                    }

                    const streamCount = day.streams.length;
                    const primaryStream = day.streams[0] ?? {
                      id: "stream-empty",
                      title: "",
                      thumbUrl: "",
                      baseTime: "20:30",
                      times: [],
                    };

                    if (streamCount <= 1) {
                      const slotCount = primaryStream.times.length;
                      const timeScale = Math.max(
                        0.58,
                        Math.min(1, 1 - Math.max(0, slotCount - 2) * 0.12),
                      );
                      const timeGap = scaleUnit(10) * timeScale;
                      const timePaddingY = scaleY(12) * timeScale;
                      const timePaddingX = scaleX(14) * timeScale;
                      const timeFont = Math.max(
                        10,
                        Math.round(scaleFont(18) * timeScale),
                      );
                      const timeLabelFont = Math.max(
                        9,
                        Math.round(scaleFont(13) * timeScale),
                      );
                      const timeFlagWidth = scaleUnit(20) * timeScale;
                      const timeFlagHeight = scaleUnit(14) * timeScale;
                      const timeEmojiFont = Math.max(
                        10,
                        Math.round(timeFlagHeight * 1.25),
                      );
                      const timeWrap = slotCount > 0 ? "nowrap" : "wrap";
                      const backgroundImage = primaryStream.thumbUrl
                        ? `${thumbOverlay}, url("${primaryStream.thumbUrl}")`
                        : `${thumbOverlay}, linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0))`;

                      return (
                        <div
                          key={day.id}
                          className="relative"
                          style={{ minWidth: 0 }}
                        >
                          {dropIndicator ? (
                            <div
                              aria-hidden="true"
                              className="pointer-events-none absolute left-0 right-0"
                              style={{
                                top:
                                  dropIndicator === "before"
                                    ? scaleUnit(-6)
                                    : "auto",
                                bottom:
                                  dropIndicator === "after"
                                    ? scaleUnit(-6)
                                    : "auto",
                                height: scaleUnit(4),
                                borderRadius: scaleUnit(4),
                                background:
                                  "linear-gradient(90deg, rgba(251,191,36,0.1), rgba(251,191,36,0.9), rgba(251,191,36,0.1))",
                                boxShadow:
                                  "0 0 0 1px rgba(251,191,36,0.65), 0 0 18px rgba(251,191,36,0.45)",
                                zIndex: 12,
                              }}
                            />
                          ) : null}
                          <button
                            type="button"
                            onClick={() => onSelectDayAction(day.id)}
                            draggable={canEdit}
                            onDragStart={(event) => handleDragStart(event, day.id)}
                            onDragOver={(event) =>
                              handleDragOver(event, day.id, "y")
                            }
                            onDragLeave={handleDragLeave}
                            onDrop={(event) => handleDrop(event, day.id, "y")}
                            onDragEnd={handleDragEnd}
                            aria-pressed={isSelected}
                            className={`grid h-62.5 w-full grid-cols-[260px_1fr] gap-5 rounded-[28px] bg-white/10 p-5 text-left backdrop-blur-[10px] transition focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-cyan-300 ${
                              canEdit ? "cursor-grab active:cursor-grabbing" : ""
                            }`}
                            style={{
                              height: scaledDayCardHeight,
                              gridTemplateColumns: `${scaledDayThumbWidth}px 1fr`,
                              gap: scaleUnit(20),
                              padding: `${scaleY(20)}px ${scaleX(20)}px`,
                              boxShadow: isSelected
                                ? `0 0 0 ${scaleUnit(2)}px rgba(56,189,248,0.85) inset`
                                : `0 0 0 ${scaleUnit(1.5)}px rgba(255,255,255,0.18) inset`,
                              outline: isDragOver
                                ? `${scaleUnit(1.5)}px solid rgba(251,191,36,0.7)`
                                : "none",
                              outlineOffset: scaleUnit(2),
                              opacity: isDragging ? 0.6 : 1,
                            }}
                          >
                            <div
                              className="relative aspect-video w-full max-h-full self-center overflow-hidden rounded-[20px]"
                              style={{
                                backgroundImage,
                                backgroundColor: "rgba(0,0,0,0.2)",
                                backgroundSize: "cover",
                                backgroundPosition: "center",
                                backgroundBlendMode: "screen, normal",
                                boxShadow: `0 0 0 ${scaleUnit(1)}px rgba(255,255,255,0.18) inset`,
                              }}
                            >
                              <div
                                className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full bg-black/40 px-3 py-2 text-[13px] font-black uppercase tracking-widest text-white/95"
                                style={{
                                  left: scaleX(12),
                                  top: scaleY(12),
                                  gap: scaleUnit(8),
                                  padding: `${scaleY(8)}px ${scaleX(12)}px`,
                                  fontSize: scaleFont(13),
                                  boxShadow: `0 0 0 ${scaleUnit(1)}px rgba(255,255,255,0.24) inset`,
                                }}
                              >
                                <span
                                  className="h-2.5 w-2.5 rounded-full bg-red-500 shadow-[0_0_0_6px_rgba(255,45,45,0.18)]"
                                  style={{
                                    width: scaleUnit(10),
                                    height: scaleUnit(10),
                                  }}
                                />
                                <span>Live</span>
                              </div>
                            </div>
                            <div className="flex min-w-0 flex-col justify-center gap-3">
                              <div className="flex flex-wrap items-center gap-3">
                                <div
                                  className="text-[20px] font-black uppercase tracking-[0.08em] text-white/80"
                                  style={{ fontSize: scaleFont(20) }}
                                >
                                  {day.day}
                                </div>
                                <div
                                  className="inline-flex items-center rounded-full bg-white/10 px-3 py-2 text-[13px] font-black uppercase tracking-[0.06em] text-white/85"
                                  style={{
                                    padding: `${scaleY(8)}px ${scaleX(12)}px`,
                                    fontSize: scaleFont(13),
                                    boxShadow: `0 0 0 ${scaleUnit(1)}px rgba(255,255,255,0.24) inset`,
                                  }}
                                >
                                  {day.date || "TBD"}
                                </div>
                              </div>
                              <div
                                className="text-[38px] font-black leading-[1.12] tracking-[-0.02em]"
                                style={{
                                  fontSize: scaleFont(38),
                                  lineHeight: 1.24,
                                  display: "-webkit-box",
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: "vertical",
                                  overflow: "hidden",
                                  wordBreak: "break-word",
                                  paddingBottom: scaleY(8),
                                }}
                              >
                                {primaryStream.title || "Untitled stream"}
                              </div>
                              <div
                                className="items-center"
                                style={{
                                  display: "flex",
                                  flexWrap: timeWrap,
                                  gap: slotCount > 0 ? timeGap : scaleUnit(10),
                                }}
                              >
                                {primaryStream.times.length === 0 ? (
                                  <div
                                    className="rounded-full bg-white/5 px-4 py-3 text-[13px] font-semibold uppercase tracking-[0.2em] text-white/70"
                                    style={{
                                      padding: `${timePaddingY}px ${timePaddingX}px`,
                                      fontSize: Math.max(
                                        9,
                                        Math.round(scaleFont(12) * timeScale),
                                      ),
                                      boxShadow: `0 0 0 ${scaleUnit(
                                        1,
                                      )}px rgba(255,255,255,0.22) inset`,
                                    }}
                                  >
                                    Add time slot
                                  </div>
                                ) : (
                                  primaryStream.times.map((slot) => {
                                    const hasCustomEmoji =
                                      slot.zoneId === "custom" &&
                                      Boolean(slot.customEmoji);

                                    return (
                                      <div
                                        key={slot.id}
                                        className="min-w-0 inline-flex items-center rounded-full bg-white/10 text-[18px] font-extrabold text-white/95"
                                        style={{
                                          flex: "0 1 auto",
                                          width: "fit-content",
                                          maxWidth: "100%",
                                          gap: timeGap,
                                          padding: `${timePaddingY}px ${timePaddingX}px`,
                                          fontSize: timeFont,
                                          boxShadow: `0 0 0 ${scaleUnit(
                                            1,
                                          )}px rgba(255,255,255,0.24) inset`,
                                        }}
                                      >
                                        <span
                                          className={`h-3.5 w-5 overflow-hidden rounded-[3px] ${
                                            hasCustomEmoji
                                              ? "shadow-none"
                                              : "shadow-[0_0_0_1px_rgba(255,255,255,0.18)]"
                                          }`}
                                          style={{
                                            width: timeFlagWidth,
                                            height: timeFlagHeight,
                                          }}
                                        >
                                          {hasCustomEmoji ? (
                                            <span
                                              className="flex h-full w-full items-center justify-center"
                                              style={{
                                                fontSize: timeEmojiFont,
                                                lineHeight: 1,
                                              }}
                                            >
                                              {slot.customEmoji}
                                            </span>
                                          ) : (
                                            <FlagIcon flag={slot.flag} />
                                          )}
                                        </span>
                                        <span
                                          className="min-w-0 truncate text-[13px] font-black uppercase tracking-[0.08em] text-white/80"
                                          style={{ fontSize: timeLabelFont }}
                                        >
                                          {slot.label}
                                        </span>
                                        <span>{slot.time}</span>
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            </div>
                          </button>
                          {canEdit && isSelected ? (
                            <button
                              type="button"
                              aria-label="Delete day"
                              onClick={(event) => {
                                event.stopPropagation();
                                onDeleteDayAction(day.id);
                              }}
                              className="absolute flex items-center justify-center rounded-full bg-red-500 text-white shadow-[0_6px_18px_rgba(0,0,0,0.35)] transition hover:bg-red-600"
                              style={{
                                top: scaleY(10),
                                right: scaleX(10),
                                width: scaleUnit(26),
                                height: scaleUnit(26),
                                zIndex: 5,
                                fontSize: scaleFont(14),
                              }}
                            >
                              x
                            </button>
                          ) : null}
                        </div>
                      );
                    }

                    const streamScale = Math.max(
                      0.7,
                      1 - Math.max(0, streamCount - 1) * 0.15,
                    );
                    const streamGap = scaleUnit(12) * streamScale;
                    const streamTitleFont = Math.max(
                      12,
                      Math.round(scaleFont(30) * streamScale),
                    );

                    return (
                      <div
                        key={day.id}
                        className="relative"
                        style={{ minWidth: 0 }}
                      >
                        {dropIndicator ? (
                          <div
                            aria-hidden="true"
                            className="pointer-events-none absolute left-0 right-0"
                            style={{
                              top:
                                dropIndicator === "before"
                                  ? scaleUnit(-6)
                                  : "auto",
                              bottom:
                                dropIndicator === "after"
                                  ? scaleUnit(-6)
                                  : "auto",
                              height: scaleUnit(4),
                              borderRadius: scaleUnit(4),
                              background:
                                "linear-gradient(90deg, rgba(251,191,36,0.1), rgba(251,191,36,0.9), rgba(251,191,36,0.1))",
                              boxShadow:
                                "0 0 0 1px rgba(251,191,36,0.65), 0 0 18px rgba(251,191,36,0.45)",
                              zIndex: 12,
                            }}
                          />
                        ) : null}
                        <button
                          type="button"
                          onClick={() => onSelectDayAction(day.id)}
                          draggable={canEdit}
                          onDragStart={(event) => handleDragStart(event, day.id)}
                          onDragOver={(event) =>
                            handleDragOver(event, day.id, "y")
                          }
                          onDragLeave={handleDragLeave}
                          onDrop={(event) => handleDrop(event, day.id, "y")}
                          onDragEnd={handleDragEnd}
                          aria-pressed={isSelected}
                          className={`flex min-h-0 h-62.5 w-full flex-col rounded-[28px] bg-white/10 p-5 text-left backdrop-blur-[10px] transition focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-cyan-300 ${
                            canEdit ? "cursor-grab active:cursor-grabbing" : ""
                          }`}
                          style={{
                            height: scaledDayCardHeight,
                            gap: scaleUnit(12),
                            padding: `${scaleY(18)}px ${scaleX(18)}px`,
                            boxShadow: isSelected
                              ? `0 0 0 ${scaleUnit(2)}px rgba(56,189,248,0.85) inset`
                              : `0 0 0 ${scaleUnit(1.5)}px rgba(255,255,255,0.18) inset`,
                            outline: isDragOver
                              ? `${scaleUnit(1.5)}px solid rgba(251,191,36,0.7)`
                              : "none",
                            outlineOffset: scaleUnit(2),
                            opacity: isDragging ? 0.6 : 1,
                          }}
                        >
                        <div className="flex flex-wrap items-center gap-3">
                          <div
                            className="text-[20px] font-black uppercase tracking-[0.08em] text-white/80"
                            style={{ fontSize: scaleFont(20) }}
                          >
                            {day.day}
                          </div>
                          <div
                            className="inline-flex items-center rounded-full bg-white/10 px-3 py-2 text-[13px] font-black uppercase tracking-[0.06em] text-white/85"
                            style={{
                              padding: `${scaleY(8)}px ${scaleX(12)}px`,
                              fontSize: scaleFont(13),
                              boxShadow: `0 0 0 ${scaleUnit(1)}px rgba(255,255,255,0.24) inset`,
                            }}
                          >
                            {day.date || "TBD"}
                          </div>
                        </div>
                        <div
                          className="flex min-h-0 flex-1 items-stretch"
                          style={{ gap: streamGap }}
                        >
                          {day.streams.length === 0 ? (
                            <div
                              className="flex min-h-0 flex-1 items-center justify-center rounded-[20px] border border-dashed border-white/20 bg-white/5 text-[12px] font-semibold uppercase tracking-[0.2em] text-white/70"
                              style={{
                                fontSize: Math.max(
                                  10,
                                  Math.round(scaleFont(12) * streamScale),
                                ),
                              }}
                            >
                              Add stream
                            </div>
                          ) : (
                            day.streams.map((stream) => {
                              const slotCount = stream.times.length;
                              const timeScale =
                                Math.max(
                                  0.58,
                                  Math.min(
                                    1,
                                    1 - Math.max(0, slotCount - 2) * 0.12,
                                  ),
                                ) * streamScale;
                              const timeGap = scaleUnit(10) * timeScale;
                              const timePaddingY = scaleY(12) * timeScale;
                              const timePaddingX = scaleX(14) * timeScale;
                              const timeFont = Math.max(
                                10,
                                Math.round(scaleFont(18) * timeScale),
                              );
                              const timeLabelFont = Math.max(
                                9,
                                Math.round(scaleFont(13) * timeScale),
                              );
                              const timeFlagWidth = scaleUnit(20) * timeScale;
                              const timeFlagHeight = scaleUnit(14) * timeScale;
                              const timeEmojiFont = Math.max(
                                10,
                                Math.round(timeFlagHeight * 1.25),
                              );
                              const timeWrap =
                                streamCount > 1
                                  ? "wrap"
                                  : slotCount > 0
                                    ? "nowrap"
                                    : "wrap";
                              const streamBackground = stream.thumbUrl
                                ? `${thumbOverlay}, linear-gradient(180deg, rgba(8,8,14,0.55), rgba(8,8,14,0.55)), url("${stream.thumbUrl}")`
                                : `${thumbOverlay}, linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0))`;

                              return (
                                <div
                                  key={stream.id}
                                  className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/15 bg-white/10 text-white/95"
                                  style={{
                                    gap: scaleUnit(8) * streamScale,
                                    padding: `${scaleY(12) * streamScale}px ${
                                      scaleX(12) * streamScale
                                    }px`,
                                    backgroundImage: streamBackground,
                                    backgroundSize: "cover",
                                    backgroundPosition: "center",
                                    backgroundBlendMode:
                                      "screen, normal, normal",
                                    borderWidth: portraitStreamBorderWidth,
                                  }}
                                >
                                  <div
                                    className="font-black leading-[1.12] tracking-[-0.02em]"
                                    style={{
                                      fontSize: streamTitleFont,
                                      display: "-webkit-box",
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: "vertical",
                                      overflow: "hidden",
                                      wordBreak: "break-word",
                                    }}
                                  >
                                    {stream.title || "Untitled stream"}
                                  </div>
                                  <div
                                    className="items-center"
                                    style={{
                                      display: "flex",
                                      flexWrap: timeWrap,
                                      gap: timeGap,
                                    }}
                                  >
                                    {stream.times.length === 0 ? (
                                      <div
                                        className="rounded-full bg-white/5 px-4 py-3 text-[13px] font-semibold uppercase tracking-[0.2em] text-white/70"
                                        style={{
                                          padding: `${timePaddingY}px ${timePaddingX}px`,
                                          fontSize: Math.max(
                                            9,
                                            Math.round(
                                              scaleFont(12) * timeScale,
                                            ),
                                          ),
                                          boxShadow: `0 0 0 ${scaleUnit(
                                            1,
                                          )}px rgba(255,255,255,0.22) inset`,
                                        }}
                                      >
                                        Add time slot
                                      </div>
                                    ) : (
                                      stream.times.map((slot) => {
                                        const hasCustomEmoji =
                                          slot.zoneId === "custom" &&
                                          Boolean(slot.customEmoji);

                                        return (
                                          <div
                                            key={slot.id}
                                            className="min-w-0 inline-flex items-center rounded-full bg-white/10 text-[18px] font-extrabold text-white/95"
                                            style={{
                                              flex: "0 1 auto",
                                              width: "fit-content",
                                              maxWidth: "100%",
                                              gap: timeGap,
                                              padding: `${timePaddingY}px ${timePaddingX}px`,
                                              fontSize: timeFont,
                                              boxShadow: `0 0 0 ${scaleUnit(
                                                1,
                                              )}px rgba(255,255,255,0.24) inset`,
                                            }}
                                          >
                                            <span
                                              className={`h-3.5 w-5 overflow-hidden rounded-[3px] ${
                                                hasCustomEmoji
                                                  ? "shadow-none"
                                                  : "shadow-[0_0_0_1px_rgba(255,255,255,0.18)]"
                                              }`}
                                              style={{
                                                width: timeFlagWidth,
                                                height: timeFlagHeight,
                                              }}
                                            >
                                              {hasCustomEmoji ? (
                                                <span
                                                  className="flex h-full w-full items-center justify-center"
                                                  style={{
                                                    fontSize: timeEmojiFont,
                                                    lineHeight: 1,
                                                  }}
                                                >
                                                  {slot.customEmoji}
                                                </span>
                                              ) : (
                                                <FlagIcon flag={slot.flag} />
                                              )}
                                            </span>
                                            <span
                                              className="min-w-0 truncate text-[13px] font-black uppercase tracking-[0.08em] text-white/80"
                                              style={{
                                                fontSize: timeLabelFont,
                                              }}
                                            >
                                              {slot.label}
                                            </span>
                                            <span>{slot.time}</span>
                                          </div>
                                        );
                                      })
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                        </button>
                        {canEdit && isSelected ? (
                          <button
                            type="button"
                            aria-label="Delete day"
                            onClick={(event) => {
                              event.stopPropagation();
                              onDeleteDayAction(day.id);
                            }}
                            className="absolute flex items-center justify-center rounded-full bg-red-500 text-white shadow-[0_6px_18px_rgba(0,0,0,0.35)] transition hover:bg-red-600"
                            style={{
                              top: scaleY(10),
                              right: scaleX(10),
                              width: scaleUnit(26),
                              height: scaleUnit(26),
                              zIndex: 5,
                              fontSize: scaleFont(14),
                            }}
                          >
                            x
                          </button>
                        ) : null}
                      </div>
                    );
                  })}
                  {days.length > 0 && showAddControls
                    ? renderAddDayButton("bottom", "Add day (up to 7)")
                    : null}
                </div>
              </main>

              {showFooter ? (
                <footer
                  className="flex justify-center"
                  style={{ marginTop: footerGap }}
                >
                    <button
                      type="button"
                      onClick={onSelectFooterAction}
                      aria-pressed={isFooterSelected}
                      className={`inline-flex items-center rounded-full text-[38px] font-black leading-none tracking-[0.02em] text-white/95 transition focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-cyan-300 ${footerClass}`}
                      style={{
                        minHeight: footerHeight,
                        padding: `${footerMetrics.paddingY}px ${footerMetrics.paddingX}px`,
                        fontSize: footerMetrics.fontSize,
                        gap: footerMetrics.gap,
                        boxShadow: isFooterSelected
                          ? `0 0 0 ${scaleUnit(2)}px rgba(56,189,248,0.85) inset`
                          : `0 0 0 ${scaleUnit(1)}px rgba(255,255,255,0.24) inset`,
                      }}
                    >
                    <span
                      className="rounded-full bg-red-500"
                      style={{
                        width: footerMetrics.dotSize,
                        height: footerMetrics.dotSize,
                        boxShadow: `0 0 0 ${footerMetrics.dotShadow}px rgba(255,45,45,0.16)`,
                      }}
                    />
                    {footerLink || "twitch.tv/yourname"}
                  </button>
                </footer>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

