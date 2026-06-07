import { endOfDay, endOfMonth, endOfWeek, format, startOfDay, startOfMonth, startOfWeek } from "date-fns";
import type { Metric } from "../../types/kpi";

export type EntryPeriod = {
  entryDate: string;
  periodStart: string;
  periodEnd: string;
};

export function todayInputValue(date: Date = new Date()): string {
  return format(date, "yyyy-MM-dd");
}

export function resolveEntryPeriod(metric: Metric, entryDateValue: string): EntryPeriod {
  const entryDate = new Date(`${entryDateValue}T12:00:00.000`);

  if (metric.cadence === "weekly") {
    return {
      entryDate: entryDate.toISOString(),
      periodStart: startOfWeek(entryDate, { weekStartsOn: 1 }).toISOString(),
      periodEnd: endOfWeek(entryDate, { weekStartsOn: 1 }).toISOString()
    };
  }

  if (metric.cadence === "monthly") {
    return {
      entryDate: entryDate.toISOString(),
      periodStart: startOfMonth(entryDate).toISOString(),
      periodEnd: endOfMonth(entryDate).toISOString()
    };
  }

  return {
    entryDate: entryDate.toISOString(),
    periodStart: startOfDay(entryDate).toISOString(),
    periodEnd: endOfDay(entryDate).toISOString()
  };
}
