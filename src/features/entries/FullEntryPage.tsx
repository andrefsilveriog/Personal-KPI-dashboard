import { useMemo, useState } from "react";
import type { MetricEntry } from "../../types/kpi";
import { useAuth } from "../../lib/firebase/useAuth";
import { DynamicMetricForm } from "./DynamicMetricForm";
import { archiveMetricEntry } from "./entriesRepository";
import {
  buildLogRows,
  displayValue,
  downloadCsv,
  fieldsForMetric,
  filterLogRows,
  logsToCsv,
  type LogsFilters
} from "./logsUtils";
import { useKpiData } from "./useKpiData";

const initialFilters: LogsFilters = {
  metricId: "",
  startDate: "",
  endDate: "",
  dimensionValue: "",
  search: ""
};

function entryValues(entry: MetricEntry) {
  return {
    ...entry.values,
    ...entry.calculatedValues
  };
}

export function FullEntryPage() {
  const { userId } = useAuth();
  const { status, metadata, entries, error, reload } = useKpiData();
  const [filters, setFilters] = useState<LogsFilters>(initialFilters);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [archiveMessage, setArchiveMessage] = useState<string | null>(null);

  const activeMetrics = metadata.metrics.filter((metric) => !metric.archived).sort((left, right) => left.name.localeCompare(right.name));
  const rows = useMemo(() => buildLogRows(metadata.metrics, metadata.fields, entries), [entries, metadata.fields, metadata.metrics]);
  const filteredRows = useMemo(() => filterLogRows(rows, filters), [filters, rows]);
  const dimensionOptions = metadata.dimensions.filter((dimension) => !dimension.archived).sort((left, right) => left.displayOrder - right.displayOrder);

  function updateFilter(key: keyof LogsFilters, value: string) {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [key]: value
    }));
  }

  async function handleArchive(entry: MetricEntry) {
    if (!userId || !window.confirm("Archive this entry?")) {
      return;
    }

    try {
      await archiveMetricEntry(userId, entry);
      await reload();
      setArchiveMessage("Entry archived.");
    } catch (archiveError) {
      setArchiveMessage(archiveError instanceof Error ? archiveError.message : "Could not archive entry.");
    }
  }

  function handleExport() {
    downloadCsv("kpi-logs.csv", logsToCsv(filteredRows, metadata.dimensions));
  }

  return (
    <section className="entry-page logs-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Logs</p>
          <h1>Logs</h1>
        </div>
        <button className="secondary-button" type="button" onClick={handleExport} disabled={filteredRows.length === 0}>
          Export CSV
        </button>
      </div>

      {status === "loading" && <p className="status-message">Loading metric configuration.</p>}
      {status === "configMissing" && <p className="status-message error">Add Firebase config before loading entries.</p>}
      {status === "error" && <p className="status-message error">{error}</p>}
      {archiveMessage && <p className="status-message">{archiveMessage}</p>}

      {status === "ready" && (
        <>
          <section className="filters-panel" aria-label="Log filters">
            <label>
              Metric
              <select value={filters.metricId} onChange={(event) => updateFilter("metricId", event.target.value)}>
                <option value="">All metrics</option>
                {activeMetrics.map((metric) => (
                  <option key={metric.id} value={metric.id}>
                    {metric.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Start date
              <input type="date" value={filters.startDate} onChange={(event) => updateFilter("startDate", event.target.value)} />
            </label>
            <label>
              End date
              <input type="date" value={filters.endDate} onChange={(event) => updateFilter("endDate", event.target.value)} />
            </label>
            <label>
              Category
              <select value={filters.dimensionValue} onChange={(event) => updateFilter("dimensionValue", event.target.value)}>
                <option value="">All categories</option>
                {dimensionOptions.map((dimension) => (
                  <option key={dimension.id} value={dimension.id}>
                    {dimension.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Search
              <input
                placeholder="Search notes or values"
                type="search"
                value={filters.search}
                onChange={(event) => updateFilter("search", event.target.value)}
              />
            </label>
          </section>

          <section className="logs-list" aria-label="Filtered logs">
            {filteredRows.length === 0 && <p className="status-message">No entries match the current filters.</p>}
            {filteredRows.map((row) => {
              const values = entryValues(row.entry);
              const metricFields = fieldsForMetric(metadata.fields, row.metric.id);
              const isEditing = editingEntryId === row.entry.id;

              return (
                <article className="log-card" key={row.entry.id}>
                  <div className="log-card-header">
                    <div>
                      <h2>{row.metric.name}</h2>
                      <p>{new Date(row.entry.entryDate).toLocaleDateString()}</p>
                    </div>
                    <div className="log-actions">
                      <button className="secondary-button" type="button" onClick={() => setEditingEntryId(isEditing ? null : row.entry.id)}>
                        {isEditing ? "Close" : "Edit"}
                      </button>
                      <button className="danger-button" type="button" onClick={() => void handleArchive(row.entry)}>
                        Archive
                      </button>
                    </div>
                  </div>

                  <dl className="log-values">
                    {row.fields.map((field) => (
                      <div key={field.id}>
                        <dt>{field.label}</dt>
                        <dd>{displayValue(values[field.key], field, metadata.dimensions) || "-"}</dd>
                      </div>
                    ))}
                  </dl>

                  {isEditing && userId && (
                    <DynamicMetricForm
                      dimensions={metadata.dimensions}
                      entries={entries}
                      entryToEdit={row.entry}
                      fields={metricFields}
                      metric={row.metric}
                      mode="full"
                      userId={userId}
                      onCancel={() => setEditingEntryId(null)}
                      onSaved={reload}
                    />
                  )}
                </article>
              );
            })}
          </section>

          <details className="create-entry-panel">
            <summary>Create full entry</summary>
            {activeMetrics.length === 0 && <p className="status-message">No metrics found. Seed starter metrics from Settings first.</p>}
            {userId &&
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
          </details>
        </>
      )}
    </section>
  );
}
