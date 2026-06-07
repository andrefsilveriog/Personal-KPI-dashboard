import { useAuth } from "../../lib/firebase/useAuth";
import { DynamicMetricForm } from "./DynamicMetricForm";
import { useKpiData } from "./useKpiData";

export function FullEntryPage() {
  const { userId } = useAuth();
  const { status, metadata, entries, error, reload } = useKpiData();

  const activeMetrics = metadata.metrics.filter((metric) => !metric.archived).sort((left, right) => left.name.localeCompare(right.name));

  return (
    <section className="entry-page">
      <div className="page-heading">
        <p className="eyebrow">Logs</p>
        <h1>Full Entry</h1>
      </div>

      {status === "loading" && <p className="status-message">Loading metric configuration.</p>}
      {status === "configMissing" && <p className="status-message error">Add Firebase config before loading entries.</p>}
      {status === "error" && <p className="status-message error">{error}</p>}
      {status === "ready" && activeMetrics.length === 0 && (
        <p className="status-message">No metrics found. Seed starter metrics from Settings first.</p>
      )}
      {status === "ready" &&
        userId &&
        activeMetrics.map((metric) => (
          <DynamicMetricForm
            key={metric.id}
            dimensions={metadata.dimensions}
            entries={entries}
            fields={metadata.fields.filter((field) => field.metricId === metric.id)}
            metric={metric}
            mode="full"
            userId={userId}
            onSaved={reload}
          />
        ))}
    </section>
  );
}
