import { format } from "date-fns";
import type { Dimension, EntryValues, FieldValue, Metric, MetricEntry, MetricField } from "../../types/kpi";

export type LogsFilters = {
  metricId: string;
  startDate: string;
  endDate: string;
  dimensionValue: string;
  search: string;
};

export type LogRow = {
  entry: MetricEntry;
  metric: Metric;
  fields: MetricField[];
};

export function fieldsForMetric(fields: MetricField[], metricId: string): MetricField[] {
  return fields
    .filter((field) => field.metricId === metricId && !field.archived)
    .sort((left, right) => left.displayOrder - right.displayOrder);
}

export function logFieldsForMetric(fields: MetricField[], metricId: string): MetricField[] {
  return fieldsForMetric(fields, metricId).filter((field) => field.showInLogs || field.type === "calculated");
}

function dateInputToTime(value: string, endOfDay: boolean): number | null {
  if (!value) {
    return null;
  }

  const suffix = endOfDay ? "T23:59:59.999" : "T00:00:00.000";
  return new Date(`${value}${suffix}`).getTime();
}

function valueMatchesDimension(value: FieldValue | undefined, expected: string): boolean {
  if (!expected) {
    return true;
  }

  return typeof value === "string" && value === expected;
}

function stringifyValue(value: FieldValue | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }

  return Array.isArray(value) ? value.join(", ") : String(value);
}

function entrySearchText(entry: MetricEntry): string {
  return Object.values({ ...entry.values, ...entry.calculatedValues }).map(stringifyValue).join(" ").toLowerCase();
}

export function buildLogRows(metrics: Metric[], fields: MetricField[], entries: MetricEntry[]): LogRow[] {
  return entries
    .filter((entry) => !entry.archived)
    .flatMap((entry) => {
      const metric = metrics.find((candidate) => candidate.id === entry.metricId);

      if (!metric || metric.archived) {
        return [];
      }

      return [
        {
          entry,
          metric,
          fields: logFieldsForMetric(fields, metric.id)
        }
      ];
    })
    .sort((left, right) => new Date(right.entry.entryDate).getTime() - new Date(left.entry.entryDate).getTime());
}

export function filterLogRows(rows: LogRow[], filters: LogsFilters): LogRow[] {
  const startTime = dateInputToTime(filters.startDate, false);
  const endTime = dateInputToTime(filters.endDate, true);
  const search = filters.search.trim().toLowerCase();

  return rows.filter((row) => {
    const entryTime = new Date(row.entry.entryDate).getTime();
    const mergedValues = { ...row.entry.values, ...row.entry.calculatedValues };

    if (filters.metricId && row.metric.id !== filters.metricId) {
      return false;
    }

    if (startTime !== null && entryTime < startTime) {
      return false;
    }

    if (endTime !== null && entryTime > endTime) {
      return false;
    }

    if (filters.dimensionValue) {
      const dimensionFields = row.fields.filter((field) => field.type === "dimension" || field.type === "category");
      if (!dimensionFields.some((field) => valueMatchesDimension(mergedValues[field.key], filters.dimensionValue))) {
        return false;
      }
    }

    if (search && !entrySearchText(row.entry).includes(search) && !row.metric.name.toLowerCase().includes(search)) {
      return false;
    }

    return true;
  });
}

export function displayValue(value: FieldValue | undefined, field: MetricField, dimensions: Dimension[]): string {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  if (field.type === "boolean") {
    return value === true ? "Yes" : "No";
  }

  if (field.type === "dimension" || field.type === "category") {
    return dimensions.find((dimension) => dimension.id === value)?.name ?? stringifyValue(value);
  }

  if (field.type === "currency" || field.key.includes("amount")) {
    return typeof value === "number" ? value.toLocaleString("pt-BR", { currency: "BRL", style: "currency" }) : stringifyValue(value);
  }

  return stringifyValue(value);
}

function csvEscape(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

export function logsToCsv(rows: LogRow[], dimensions: Dimension[]): string {
  const headers = ["entryDate", "metric", "field", "label", "value", "entryId"];
  const lines = [headers.map(csvEscape).join(",")];

  for (const row of rows) {
    const mergedValues: EntryValues = { ...row.entry.values, ...row.entry.calculatedValues };

    for (const field of row.fields) {
      lines.push(
        [
          format(new Date(row.entry.entryDate), "yyyy-MM-dd"),
          row.metric.name,
          field.key,
          field.label,
          displayValue(mergedValues[field.key], field, dimensions),
          row.entry.id
        ]
          .map(csvEscape)
          .join(",")
      );
    }
  }

  return lines.join("\n");
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
