import { setDoc } from "firebase/firestore";
import type { AppSettings, KioskRefreshIntervalSeconds, KioskScale } from "../../types/kpi";
import { getUserDocument } from "../../lib/firebase/collections";

export const kioskScales: KioskScale[] = [75, 80, 90, 100, 110, 125, 150];
export const kioskRefreshIntervals: KioskRefreshIntervalSeconds[] = [30, 45, 60];
export const defaultKioskScale: KioskScale = 100;
export const defaultKioskRefreshInterval: KioskRefreshIntervalSeconds = 45;

export type KioskSettings = {
  selectedKioskDashboardId: string;
  scale: KioskScale;
  refreshIntervalSeconds: KioskRefreshIntervalSeconds;
  rotateDashboards: boolean;
};

export const appSettingsDocumentId = "default";

export function resolveKioskSettings(appSettings: AppSettings | undefined, fallbackDashboardId = ""): KioskSettings {
  return {
    selectedKioskDashboardId: appSettings?.selectedKioskDashboardId ?? fallbackDashboardId,
    scale: appSettings?.kioskScale ?? defaultKioskScale,
    refreshIntervalSeconds: appSettings?.kioskRefreshIntervalSeconds ?? defaultKioskRefreshInterval,
    rotateDashboards: appSettings?.rotateKioskDashboards ?? false
  };
}

export async function saveKioskSettings(userId: string, appSettings: AppSettings | undefined, settings: KioskSettings): Promise<AppSettings> {
  const now = new Date().toISOString();
  const nextSettings: AppSettings = {
    id: appSettings?.id ?? appSettingsDocumentId,
    userId,
    theme: appSettings?.theme ?? "dark",
    selectedKioskDashboardId: settings.selectedKioskDashboardId || undefined,
    kioskScale: settings.scale,
    kioskRefreshIntervalSeconds: settings.refreshIntervalSeconds,
    rotateKioskDashboards: settings.rotateDashboards,
    createdAt: appSettings?.createdAt ?? now,
    updatedAt: now
  };
  const ref = getUserDocument(userId, "appSettings", nextSettings.id);

  if (!ref) {
    throw new Error("Firebase config is missing.");
  }

  await setDoc(ref, nextSettings);
  return nextSettings;
}
