import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { Dimension, EntryValues, Metric, MetricEntry, MetricField } from "../../types/kpi";
import { computeCalculatedValues, buildInitialValues, validateEntryValues } from "./entryCalculations";
import { resolveEntryPeriod, todayInputValue } from "./entryPeriods";
import { saveMetricEntry } from "./entriesRepository";
import { DynamicFieldRenderer } from "./DynamicFieldRenderer";

type DynamicMetricFormProps = {
  userId: string;
  metric: Metric;
  fields: MetricField[];
  dimensions: Dimension[];
  entries: MetricEntry[];
  mode: "quick" | "full";
  entryToEdit?: MetricEntry;
  onCancel?: () => void;
  onSaved: () => Promise<void>;
};

type SaveState =
  | { status: "idle"; message: string | null }
  | { status: "saving"; message: string | null }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

function visibleFields(fields: MetricField[], mode: "quick" | "full"): MetricField[] {
  return fields
    .filter((field) => !field.archived)
    .filter((field) => (mode === "quick" ? field.showInQuickEntry : field.showInFullEntry || field.type === "calculated"))
    .sort((left, right) => left.displayOrder - right.displayOrder);
}

function findExistingEntry(metric: Metric, entries: MetricEntry[], entryDateValue: string): MetricEntry | undefined {
  const period = resolveEntryPeriod(metric, entryDateValue);
  return entries.find(
    (entry) =>
      entry.metricId === metric.id &&
      !entry.archived &&
      entry.periodStart === period.periodStart &&
      entry.periodEnd === period.periodEnd
  );
}

function entryDateInputValue(entry: MetricEntry | undefined): string {
  return entry ? entry.entryDate.slice(0, 10) : todayInputValue();
}

export function DynamicMetricForm({
  userId,
  metric,
  fields,
  dimensions,
  entries,
  mode,
  entryToEdit,
  onCancel,
  onSaved
}: DynamicMetricFormProps) {
  const [entryDateValue, setEntryDateValue] = useState(entryDateInputValue(entryToEdit));
  const relevantFields = useMemo(() => visibleFields(fields, mode), [fields, mode]);
  const existingEntry = entryToEdit ?? (metric.allowMultipleEntriesPerPeriod ? undefined : findExistingEntry(metric, entries, entryDateValue));
  const existingValues = useMemo(
    () => (existingEntry ? { ...existingEntry.values, ...existingEntry.calculatedValues } : undefined),
    [existingEntry]
  );
  const [values, setValues] = useState<EntryValues>(() => buildInitialValues(relevantFields, existingValues));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle", message: null });
  const calculatedValues = useMemo(() => computeCalculatedValues(fields, values), [fields, values]);

  useEffect(() => {
    setEntryDateValue(entryDateInputValue(entryToEdit));
  }, [entryToEdit]);

  useEffect(() => {
    setValues(buildInitialValues(relevantFields, existingValues));
    setErrors({});
    setSaveState({ status: "idle", message: existingEntry ? "Loaded existing entry for this period." : null });
  }, [existingEntry, existingValues, relevantFields]);

  function handleChange(fieldKey: string, value: EntryValues[string]) {
    setValues((currentValues) => ({
      ...currentValues,
      [fieldKey]: value
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validateEntryValues(relevantFields, values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setSaveState({ status: "error", message: "Fix validation errors before saving." });
      return;
    }

    setSaveState({ status: "saving", message: null });

    try {
      await saveMetricEntry({
        userId,
        metric,
        fields,
        values,
        entryDateValue,
        existingEntries: entries,
        entryToUpdate: entryToEdit
      });
      await onSaved();
      setSaveState({
        status: "success",
        message: metric.allowMultipleEntriesPerPeriod ? "Entry saved." : "Entry saved for this period."
      });
      onCancel?.();
    } catch (error) {
      setSaveState({ status: "error", message: error instanceof Error ? error.message : "Could not save entry." });
    }
  }

  return (
    <form className="metric-form" onSubmit={handleSubmit}>
      <div className="metric-form-header">
        <div>
          <h2>{metric.name}</h2>
          <p>{metric.description}</p>
        </div>
        <label className="entry-date-field">
          Entry date
          <input type="date" value={entryDateValue} onChange={(event) => setEntryDateValue(event.target.value)} />
        </label>
      </div>
      <div className="field-grid">
        {relevantFields.map((field) => (
          <DynamicFieldRenderer
            key={field.id}
            calculatedValue={calculatedValues[field.key]}
            dimensions={dimensions}
            error={errors[field.key]}
            field={field}
            value={values[field.key]}
            values={values}
            onChange={handleChange}
          />
        ))}
      </div>
      <div className="form-actions">
        <button className="primary-button" disabled={saveState.status === "saving"} type="submit">
          {saveState.status === "saving" ? "Saving..." : existingEntry ? "Update entry" : "Save entry"}
        </button>
        {onCancel && (
          <button className="secondary-button" type="button" onClick={onCancel}>
            Cancel
          </button>
        )}
        {saveState.message && <span className={`inline-status ${saveState.status}`}>{saveState.message}</span>}
      </div>
    </form>
  );
}
