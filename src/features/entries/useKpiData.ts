import { useCallback, useEffect, useState } from "react";
import type { MetricEntry } from "../../types/kpi";
import { useAuth } from "../../lib/firebase/useAuth";
import { fetchKpiMetadata, fetchMetricEntries, type KpiMetadata } from "./entriesRepository";

export type KpiDataState = {
  status: "loading" | "ready" | "configMissing" | "error";
  metadata: KpiMetadata;
  entries: MetricEntry[];
  error: string | null;
  reload: () => Promise<void>;
};

const emptyMetadata: KpiMetadata = {
  metrics: [],
  fields: [],
  dimensions: [],
  budgetVersions: []
};

export function useKpiData(): KpiDataState {
  const { status: authStatus, userId } = useAuth();
  const [metadata, setMetadata] = useState<KpiMetadata>(emptyMetadata);
  const [entries, setEntries] = useState<MetricEntry[]>([]);
  const [status, setStatus] = useState<KpiDataState["status"]>("loading");
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (authStatus === "configMissing") {
      setStatus("configMissing");
      return;
    }

    if (!userId) {
      setStatus("loading");
      return;
    }

    setStatus("loading");

    try {
      const [nextMetadata, nextEntries] = await Promise.all([fetchKpiMetadata(userId), fetchMetricEntries(userId)]);
      setMetadata(nextMetadata);
      setEntries(nextEntries);
      setError(null);
      setStatus("ready");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not load KPI data.");
      setStatus("error");
    }
  }, [authStatus, userId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    status,
    metadata,
    entries,
    error,
    reload
  };
}
