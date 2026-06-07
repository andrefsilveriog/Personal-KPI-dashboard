import { Link } from "react-router-dom";
import { useAuth } from "../../lib/firebase/useAuth";
import { DynamicMetricForm } from "./DynamicMetricForm";
import { useKpiData } from "./useKpiData";

export function QuickEntryPage() {
  const { userId } = useAuth();
  const { status, metadata, entries, error, reload } = useKpiData();

  const quickMetrics = metadata.metrics
    .filter((metric) => metric.quickEntryEnabled && !metric.archived)
    .sort((left, right) => left.name.localeCompare(right.name));

  return (
    <section className="entry-page">
      <div className="page-heading">
        <p className="eyebrow">Today</p>
        <h1>Today</h1>
        <Link className="secondary-link" to="/logs">
          Full entry
        </Link>
      </div>

      {status === "loading" && <p className="status-message">Loading metric configuration.</p>}
      {status === "configMissing" && <p className="status-message error">Add Firebase config before loading entries.</p>}
      {status === "error" && <p className="status-message error">{error}</p>}
      {status === "ready" && quickMetrics.length === 0 && (
        <p className="status-message">No quick-entry metrics found. Seed starter metrics from Settings first.</p>
      )}
      {status === "ready" &&
        userId &&
        quickMetrics.map((metric) => (
          <DynamicMetricForm
            key={metric.id}
            dimensions={metadata.dimensions}
            entries={entries}
            fields={metadata.fields.filter((field) => field.metricId === metric.id)}
            metric={metric}
            mode="quick"
            userId={userId}
            onSaved={reload}
          />
        ))}
    </section>
  );
}
