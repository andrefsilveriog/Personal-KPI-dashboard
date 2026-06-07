import { differenceInCalendarDays, endOfMonth, startOfMonth } from "date-fns";
import type { BudgetVersion, Dimension, Metric, MetricEntry, MetricField } from "../../types/kpi";

export type LedgerStatus = "No Activity" | "On Track" | "Approaching" | "Over Budget";

export type LedgerMetricConfig = {
  metric: Metric;
  categoryField: MetricField;
  amountField: MetricField;
};

export type CategoryLedgerSummary = {
  dimension: Dimension;
  spent: number;
  budget: number;
  percentUsed: number | null;
  status: LedgerStatus;
};

export type LedgerSummary = {
  categories: CategoryLedgerSummary[];
  totalMonthlySpent: number;
  totalMonthlyBudget: number;
  totalPercentUsed: number | null;
  expectedPace: number;
};

export function findLedgerMetricConfigs(metrics: Metric[], fields: MetricField[]): LedgerMetricConfig[] {
  return metrics
    .filter((metric) => metric.cadence === "transaction" && !metric.archived)
    .flatMap((metric) => {
      const metricFields = fields.filter((field) => field.metricId === metric.id && !field.archived);
      const categoryField = metricFields.find((field) => field.type === "dimension" || field.type === "category");
      const amountField =
        metricFields.find((field) => field.type === "calculated" && field.key.includes("amount")) ??
        metricFields.find((field) => field.type === "currency" && field.key.includes("total")) ??
        metricFields.find((field) => field.type === "currency");

      if (!categoryField || !amountField) {
        return [];
      }

      return [{ metric, categoryField, amountField }];
    });
}

function toDateOnly(value: string): number {
  return new Date(`${value.slice(0, 10)}T12:00:00.000`).getTime();
}

export function getActiveBudgetVersion(
  budgetVersions: BudgetVersion[],
  dimensionId: string,
  activeDate: Date
): BudgetVersion | undefined {
  const activeTime = activeDate.getTime();

  return budgetVersions
    .filter((budget) => budget.dimensionId === dimensionId)
    .filter((budget) => {
      const fromTime = toDateOnly(budget.effectiveFrom);
      const toTime = budget.effectiveTo ? toDateOnly(budget.effectiveTo) : Number.POSITIVE_INFINITY;
      return fromTime <= activeTime && toTime >= activeTime;
    })
    .sort((left, right) => toDateOnly(right.effectiveFrom) - toDateOnly(left.effectiveFrom))[0];
}

function valueToNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function getEntryValue(entry: MetricEntry, fieldKey: string): unknown {
  return entry.calculatedValues[fieldKey] ?? entry.values[fieldKey];
}

function isInMonth(entry: MetricEntry, referenceDate: Date): boolean {
  const entryTime = new Date(entry.entryDate).getTime();
  return entryTime >= startOfMonth(referenceDate).getTime() && entryTime <= endOfMonth(referenceDate).getTime();
}

export function getLedgerStatus(spent: number, budget: number): LedgerStatus {
  if (spent === 0) {
    return "No Activity";
  }

  if (budget <= 0) {
    return "On Track";
  }

  const percentUsed = (spent / budget) * 100;

  if (percentUsed > 100) {
    return "Over Budget";
  }

  return percentUsed >= 80 ? "Approaching" : "On Track";
}

export function calculateExpectedPace(referenceDate: Date = new Date()): number {
  const monthStart = startOfMonth(referenceDate);
  const monthEnd = endOfMonth(referenceDate);
  const elapsedDays = differenceInCalendarDays(referenceDate, monthStart) + 1;
  const totalDays = differenceInCalendarDays(monthEnd, monthStart) + 1;
  return Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));
}

export function calculateLedgerSummary(params: {
  metrics: Metric[];
  fields: MetricField[];
  entries: MetricEntry[];
  dimensions: Dimension[];
  budgetVersions: BudgetVersion[];
  referenceDate?: Date;
}): LedgerSummary {
  const referenceDate = params.referenceDate ?? new Date();
  const configs = findLedgerMetricConfigs(params.metrics, params.fields);
  const dimensions = params.dimensions.filter((dimension) => !dimension.archived);
  const spentByDimension = new Map<string, number>();

  for (const config of configs) {
    const metricEntries = params.entries.filter(
      (entry) => entry.metricId === config.metric.id && !entry.archived && isInMonth(entry, referenceDate)
    );

    for (const entry of metricEntries) {
      const dimensionId = getEntryValue(entry, config.categoryField.key);

      if (typeof dimensionId !== "string") {
        continue;
      }

      const spent = valueToNumber(getEntryValue(entry, config.amountField.key));
      spentByDimension.set(dimensionId, (spentByDimension.get(dimensionId) ?? 0) + spent);
    }
  }

  const categories = dimensions.map<CategoryLedgerSummary>((dimension) => {
    const spent = spentByDimension.get(dimension.id) ?? 0;
    const budget = getActiveBudgetVersion(params.budgetVersions, dimension.id, referenceDate)?.amount ?? 0;

    return {
      dimension,
      spent,
      budget,
      percentUsed: budget > 0 ? (spent / budget) * 100 : null,
      status: getLedgerStatus(spent, budget)
    };
  });

  const totalMonthlySpent = categories.reduce((total, category) => total + category.spent, 0);
  const totalMonthlyBudget = categories.reduce((total, category) => total + category.budget, 0);

  return {
    categories,
    totalMonthlySpent,
    totalMonthlyBudget,
    totalPercentUsed: totalMonthlyBudget > 0 ? (totalMonthlySpent / totalMonthlyBudget) * 100 : null,
    expectedPace: calculateExpectedPace(referenceDate)
  };
}

export function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { currency: "BRL", style: "currency" });
}
