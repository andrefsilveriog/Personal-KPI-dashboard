import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { KioskRefreshIntervalSeconds, KioskScale } from "../../types/kpi";
import { useAuth } from "../../lib/firebase/useAuth";
import { useKpiData } from "../entries/useKpiData";
import {
  kioskRefreshIntervals,
  kioskScales,
  resolveKioskSettings,
  saveKioskSettings
} from "./kioskSettings";

type SaveState =
  | { status: "idle"; message: string | null }
  | { status: "saving"; message: string | null }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

export function KioskSettingsSection() {
  const { userId } = useAuth();
  const { status, metadata, reload } = useKpiData();
  const appSettings = metadata.appSettings[0];
  const kioskDashboards = useMemo(
    () => metadata.dashboards.filter((dashboard) => dashboard.type === "kiosk"),
    [metadata.dashboards]
  );
  const fallbackDashboardId = kioskDashboards[0]?.id ?? "";
  const resolvedSettings = resolveKioskSettings(appSettings, fallbackDashboardId);
  const [selectedDashboardId, setSelectedDashboardId] = useState(resolvedSettings.selectedKioskDashboardId);
  const [scale, setScale] = useState<KioskScale>(resolvedSettings.scale);
  const [refreshIntervalSeconds, setRefreshIntervalSeconds] = useState<KioskRefreshIntervalSeconds>(
    resolvedSettings.refreshIntervalSeconds
  );
  const [rotateDashboards, setRotateDashboards] = useState(resolvedSettings.rotateDashboards);
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle", message: null });

  useEffect(() => {
    setSelectedDashboardId(resolvedSettings.selectedKioskDashboardId);
    setScale(resolvedSettings.scale);
    setRefreshIntervalSeconds(resolvedSettings.refreshIntervalSeconds);
    setRotateDashboards(resolvedSettings.rotateDashboards);
  }, [
    resolvedSettings.refreshIntervalSeconds,
    resolvedSettings.rotateDashboards,
    resolvedSettings.scale,
    resolvedSettings.selectedKioskDashboardId
  ]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!userId) {
      return;
    }

    setSaveState({ status: "saving", message: "Saving kiosk settings." });

    try {
      await saveKioskSettings(userId, appSettings, {
        selectedKioskDashboardId: selectedDashboardId,
        scale,
        refreshIntervalSeconds,
        rotateDashboards
      });
      await reload();
      setSaveState({ status: "success", message: "Kiosk settings saved." });
    } catch (error) {
      setSaveState({
        status: "error",
        message: error instanceof Error ? error.message : "Could not save kiosk settings."
      });
    }
  }

  return (
    <section className="settings-section">
      <div className="section-heading">
        <div>
          <h2>Kiosk settings</h2>
          <p>Configure the full-screen dashboard display.</p>
        </div>
      </div>
      {status === "loading" && <p className="status-message">Loading kiosk settings.</p>}
      {status === "configMissing" && <p className="status-message error">Add Firebase config before saving kiosk settings.</p>}
      <form className="kiosk-settings-form" onSubmit={handleSubmit}>
        <label>
          Selected kiosk dashboard
          <select value={selectedDashboardId} onChange={(event) => setSelectedDashboardId(event.target.value)}>
            {kioskDashboards.length === 0 && <option value="">No kiosk dashboard available</option>}
            {kioskDashboards.map((dashboard) => (
              <option key={dashboard.id} value={dashboard.id}>
                {dashboard.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Scale
          <select value={scale} onChange={(event) => setScale(Number(event.target.value) as KioskScale)}>
            {kioskScales.map((scaleOption) => (
              <option key={scaleOption} value={scaleOption}>
                {scaleOption}%
              </option>
            ))}
          </select>
        </label>
        <label>
          Refresh interval
          <select
            value={refreshIntervalSeconds}
            onChange={(event) => setRefreshIntervalSeconds(Number(event.target.value) as KioskRefreshIntervalSeconds)}
          >
            {kioskRefreshIntervals.map((interval) => (
              <option key={interval} value={interval}>
                {interval} seconds
              </option>
            ))}
          </select>
        </label>
        <label className="checkbox-field">
          <input
            checked={rotateDashboards}
            disabled
            type="checkbox"
            onChange={(event) => setRotateDashboards(event.target.checked)}
          />
          Rotate dashboards later
        </label>
        <div className="form-actions">
          <button className="primary-button" disabled={!userId || status !== "ready"} type="submit">
            {saveState.status === "saving" ? "Saving..." : "Save kiosk settings"}
          </button>
          {saveState.message && <span className={`inline-status ${saveState.status}`}>{saveState.message}</span>}
        </div>
      </form>
    </section>
  );
}
