import { describe, expect, it } from "vitest";
import type { AppSettings } from "../types/kpi";
import { defaultKioskRefreshInterval, defaultKioskScale, resolveKioskSettings } from "../features/kiosk/kioskSettings";

describe("kiosk settings", () => {
  it("uses safe defaults when settings have not been saved", () => {
    expect(resolveKioskSettings(undefined, "kiosk-1")).toEqual({
      selectedKioskDashboardId: "kiosk-1",
      scale: defaultKioskScale,
      refreshIntervalSeconds: defaultKioskRefreshInterval,
      rotateDashboards: false
    });
  });

  it("reads saved scale, refresh interval, and selected dashboard", () => {
    const appSettings: AppSettings = {
      id: "default",
      userId: "user-1",
      theme: "dark",
      selectedKioskDashboardId: "kiosk-2",
      kioskScale: 125,
      kioskRefreshIntervalSeconds: 30,
      rotateKioskDashboards: true,
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-01T00:00:00.000Z"
    };

    expect(resolveKioskSettings(appSettings, "kiosk-1")).toEqual({
      selectedKioskDashboardId: "kiosk-2",
      scale: 125,
      refreshIntervalSeconds: 30,
      rotateDashboards: true
    });
  });
});
