import type { StoryDay } from "./StorySchedulePreview";

export type ThemeConfig = {
  backgroundId: string;
  fontId: string;
  cardStyleId: string;
  borderId: string;
  borderWeightId: string;
};

export type CustomExportSize = {
  width: number;
  height: number;
};

export type ScheduleFile = {
  version: number;
  scheduleName: string;
  scheduleTimeZone: string;
  exportSizeId: string;
  customVerticalSize: CustomExportSize;
  customHorizontalSize: CustomExportSize;
  showHeader: boolean;
  headerTitle: string;
  headerAlignment: "left" | "center";
  headerTone: "bright" | "soft";
  showFooter: boolean;
  footerLink: string;
  footerStyle: "solid" | "glass";
  footerSize: "regular" | "compact";
  theme: ThemeConfig;
  days: StoryDay[];
};

export const initialDays: StoryDay[] = [
  {
    id: "day-1",
    day: "Tuesday",
    date: "Jan 12",
    off: false,
    streams: [
      {
        id: "stream-1",
        title: "Test Stream then VRChat pics!",
        thumbUrl:
          "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/438100/capsule_616x353.jpg?t=1762366454",
        baseTime: "20:30",
        times: [
          {
            id: "slot-1",
            zoneId: "uk",
            label: "",
            time: "",
            flag: "uk",
            customLabel: "",
            customTime: "",
            customZone: "",
            customEmoji: "",
            customFlag: "globe",
          },
          {
            id: "slot-2",
            zoneId: "us-et",
            label: "",
            time: "",
            flag: "us",
            customLabel: "",
            customTime: "",
            customZone: "",
            customEmoji: "",
            customFlag: "globe",
          },
        ],
      },
    ],
  },
  {
    id: "day-2",
    day: "Wednesday",
    date: "",
    off: true,
    streams: [
      {
        id: "stream-2",
        title: "",
        thumbUrl: "",
        baseTime: "20:30",
        times: [],
      },
    ],
  },
  {
    id: "day-3",
    day: "Thursday",
    date: "Jan 14",
    off: false,
    streams: [
      {
        id: "stream-3",
        title: "Valorant ranked!",
        thumbUrl:
          "https://image.jeuxvideo.com/medias-sm/158341/1583411902-8477-jaquette-avant.jpg",
        baseTime: "20:30",
        times: [
          {
            id: "slot-3",
            zoneId: "uk",
            label: "",
            time: "",
            flag: "uk",
            customLabel: "",
            customTime: "",
            customZone: "",
            customEmoji: "",
            customFlag: "globe",
          },
          {
            id: "slot-4",
            zoneId: "us-et",
            label: "",
            time: "",
            flag: "us",
            customLabel: "",
            customTime: "",
            customZone: "",
            customEmoji: "",
            customFlag: "globe",
          },
        ],
      },
    ],
  },
  {
    id: "day-4",
    day: "Friday",
    date: "",
    off: true,
    streams: [
      {
        id: "stream-4",
        title: "",
        thumbUrl: "",
        baseTime: "20:30",
        times: [],
      },
    ],
  },
  {
    id: "day-5",
    day: "Saturday",
    date: "Jan 16",
    off: false,
    streams: [
      {
        id: "stream-5",
        title: "Starting an hardcore world!",
        thumbUrl:
          "https://www.nintendo.com/eu/media/images/10_share_images/games_15/nintendo_switch_4/2x1_NSwitch_Minecraft.jpg",
        baseTime: "20:30",
        times: [
          {
            id: "slot-5",
            zoneId: "uk",
            label: "",
            time: "",
            flag: "uk",
            customLabel: "",
            customTime: "",
            customZone: "",
            customEmoji: "",
            customFlag: "globe",
          },
          {
            id: "slot-6",
            zoneId: "us-et",
            label: "",
            time: "",
            flag: "us",
            customLabel: "",
            customTime: "",
            customZone: "",
            customEmoji: "",
            customFlag: "globe",
          },
        ],
      },
    ],
  },
];

export const emptySchedulePayload: ScheduleFile = {
  version: 2,
  scheduleName: "Untitled schedule",
  scheduleTimeZone: "Europe/Paris",
  exportSizeId: "story",
  customVerticalSize: { width: 1080, height: 1920 },
  customHorizontalSize: { width: 1920, height: 1080 },
  showHeader: false,
  headerTitle: "Weekly Schedule",
  headerAlignment: "left",
  headerTone: "bright",
  showFooter: true,
  footerLink: "twitch.tv/yourname",
  footerStyle: "solid",
  footerSize: "regular",
  theme: {
    backgroundId: "nebula",
    fontId: "grotesk-fraunces",
    cardStyleId: "glass",
    borderId: "soft",
    borderWeightId: "hairline",
  },
  days: [],
};
