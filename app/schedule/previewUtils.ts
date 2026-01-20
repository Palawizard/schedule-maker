import type { ScheduleFile } from "./scheduleData";

const exportSizeMap: Record<string, { width: number; height: number }> = {
  story: { width: 1080, height: 1920 },
  youtube: { width: 1280, height: 720 },
  "x-vertical": { width: 1080, height: 1920 },
  "x-horizontal": { width: 1600, height: 900 },
};

export const getPreviewSize = (payload: ScheduleFile) => {
  if (payload.exportSizeId === "custom-vertical") {
    return payload.customVerticalSize;
  }
  if (payload.exportSizeId === "custom-horizontal") {
    return payload.customHorizontalSize;
  }
  return exportSizeMap[payload.exportSizeId] ?? exportSizeMap.story;
};

export const getLayoutMode = (
  payload: ScheduleFile,
): "portrait" | "landscape" => {
  if (payload.exportSizeId === "custom-vertical") return "portrait";
  if (payload.exportSizeId === "custom-horizontal") return "landscape";
  const size = exportSizeMap[payload.exportSizeId] ?? exportSizeMap.story;
  return size.width > size.height ? "landscape" : "portrait";
};
