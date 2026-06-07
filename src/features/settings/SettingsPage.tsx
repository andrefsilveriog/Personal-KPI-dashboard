import { useState } from "react";
import { useAuth } from "../../lib/firebase/useAuth";
import { seedStarterMetrics, type SeedStarterMetricsResult } from "../../seed/seedStarterMetrics";
import { KioskSettingsSection } from "../kiosk/KioskSettingsSection";
import { CategoriesBudgetsSection } from "../spending/CategoriesBudgetsSection";

type SeedState =
  | { status: "idle"; message: string | null }
  | { status: "running"; message: string | null }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

function resultMessage(result: SeedStarterMetricsResult): string {
  if (result.created === 0) {
    return `Starter records already exist. Skipped ${result.skipped} records.`;
  }

  return `Created ${result.created} starter records. Skipped ${result.skipped} existing records.`;
}

export function SettingsPage() {
  const { status, userId } = useAuth();
  const [seedState, setSeedState] = useState<SeedState>({ status: "idle", message: null });

  const canSeed = status === "authenticated" && userId !== null && seedState.status !== "running";

  async function handleSeedStarterMetrics() {
    if (!userId) {
      return;
    }

    setSeedState({ status: "running", message: "Seeding starter records." });

    try {
      const result = await seedStarterMetrics(userId);
      setSeedState({ status: "success", message: resultMessage(result) });
    } catch (error) {
      setSeedState({
        status: "error",
        message: error instanceof Error ? error.message : "Could not seed starter metrics."
      });
    }
  }

  return (
    <section className="settings-page">
      <p className="eyebrow">Settings</p>
      <h1>Settings</h1>
      <div className="action-panel">
        <div>
          <h2>Starter configuration</h2>
          <p>Seed starter metrics, fields, goals, spending dimensions, budgets, dashboards, and widgets.</p>
        </div>
        <button className="primary-button" type="button" onClick={handleSeedStarterMetrics} disabled={!canSeed}>
          {seedState.status === "running" ? "Seeding..." : "Seed starter metrics"}
        </button>
      </div>
      {status === "configMissing" && (
        <p className="status-message error">Add Firebase environment variables before seeding records.</p>
      )}
      {status === "loading" && <p className="status-message">Authenticating before seeding is available.</p>}
      {seedState.message && <p className={`status-message ${seedState.status}`}>{seedState.message}</p>}
      <KioskSettingsSection />
      <CategoriesBudgetsSection />
    </section>
  );
}
