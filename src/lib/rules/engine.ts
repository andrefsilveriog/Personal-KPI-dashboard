import { format } from "date-fns";
import type {
  Aggregation,
  AggregationConfig,
  BudgetVersion,
  FieldValue,
  GoalVersion,
  Metric,
  MetricEntry,
  MetricField,
  RuleCondition
} from "../../types/kpi";
import { compareValues, isEmptyValue } from "./comparisons";
import { evaluateFormula } from "./formula";
import type { PeriodRange } from "./periods";

export type RuleStatus = "complete" | "onTrack" | "behind" | "missed" | "overBudget" | "approaching" | "noActivity";

export type DimensionFilters = Record<string, string | string[]>;

export type RuleEvaluationInput = {
  metric: Metric;
  fields: MetricField[];
  entries: MetricEntry[];
  goalVersions?: GoalVersion[];
  period: PeriodRange;
  aggregation?: Aggregation;
  aggregationConfig?: AggregationConfig;
  fieldKey?: string;
  dimensionFilters?: DimensionFilters;
  budgetVersions?: BudgetVersion[];
  now?: Date;
};

export type RuleEvaluationResult = {
  actualValue: FieldValue | Record<string, number>;
  targetValue?: FieldValue;
  percentageProgress?: number;
  status: RuleStatus;
  label: string;
  details: {
    aggregation: Aggregation;
    entryCount: number;
    matchingEntryCount?: number;
    goalVersionId?: string;
    periodStart: string;
    periodEnd: string;
    behaviorNotes: string[];
    groups?: Record<string, number>;
    budgetAmount?: number;
  };
};

function normalizeAggregation(aggregation: Aggregation): Aggregation {
  switch (aggregation) {
    case "count":
      return "countEntries";
    case "sum":
      return "sumField";
    case "average":
      return "averageField";
    case "latest":
      return "latestValue";
    default:
      return aggregation;
  }
}

function toDate(value: string): Date {
  return new Date(value);
}

function toNumber(value: FieldValue | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function getEntryValue(entry: MetricEntry, fieldKey: string): FieldValue | undefined {
  return entry.calculatedValues[fieldKey] ?? entry.values[fieldKey];
}

function getCalculatedValue(entry: MetricEntry, field: MetricField): FieldValue | undefined {
  const existing = getEntryValue(entry, field.key);

  if (!isEmptyValue(existing)) {
    return existing;
  }

  if (!field.calculation) {
    return existing;
  }

  if (field.calculation.type === "sumFields") {
    return field.calculation.fieldKeys.reduce((sum, key) => sum + toNumber(getEntryValue(entry, key)), 0);
  }

  return field.calculation.components.reduce((sum, component) => {
    const value = getEntryValue(entry, component.fieldKey);

    if (component.type === "booleanTrue") {
      return sum + (value === true ? component.score : 0);
    }

    return sum + (typeof value === "string" ? component.scores[value] ?? 0 : 0);
  }, 0);
}

function getValue(entry: MetricEntry, fields: MetricField[], fieldKey?: string): FieldValue | undefined {
  if (!fieldKey) {
    return undefined;
  }

  const field = fields.find((candidate) => candidate.key === fieldKey);
  return field ? getCalculatedValue(entry, field) : getEntryValue(entry, fieldKey);
}

function matchesCondition(entry: MetricEntry, fields: MetricField[], condition: RuleCondition): boolean {
  return compareValues(getValue(entry, fields, condition.fieldKey), condition.operator, condition.value);
}

function matchesConditions(entry: MetricEntry, fields: MetricField[], conditions: RuleCondition[] = []): boolean {
  return conditions.every((condition) => matchesCondition(entry, fields, condition));
}

function matchesDimensionFilters(entry: MetricEntry, filters: DimensionFilters | undefined): boolean {
  if (!filters) {
    return true;
  }

  return Object.entries(filters).every(([fieldKey, expected]) => {
    const value = entry.values[fieldKey] ?? entry.calculatedValues[fieldKey];
    const expectedValues = Array.isArray(expected) ? expected : [expected];
    return typeof value === "string" && expectedValues.includes(value);
  });
}

function filterEntries(input: RuleEvaluationInput): MetricEntry[] {
  return input.entries.filter((entry) => {
    if (entry.metricId !== input.metric.id || entry.archived) {
      return false;
    }

    const entryDate = toDate(entry.entryDate);
    return (
      entryDate >= input.period.periodStart &&
      entryDate <= input.period.periodEnd &&
      matchesDimensionFilters(entry, input.dimensionFilters)
    );
  });
}

function latestEntry(entries: MetricEntry[]): MetricEntry | undefined {
  return [...entries].sort((left, right) => toDate(right.entryDate).getTime() - toDate(left.entryDate).getTime())[0];
}

export function selectActiveGoalVersion(goalVersions: GoalVersion[], metricId: string, period: PeriodRange): GoalVersion | undefined {
  const periodStart = period.periodStart.getTime();

  return goalVersions
    .filter((goal) => {
      if (goal.metricId !== metricId) {
        return false;
      }

      const effectiveFrom = toDate(goal.effectiveFrom).getTime();
      const effectiveTo = goal.effectiveTo ? toDate(goal.effectiveTo).getTime() : Number.POSITIVE_INFINITY;
      return effectiveFrom <= periodStart && effectiveTo >= periodStart;
    })
    .sort((left, right) => toDate(right.effectiveFrom).getTime() - toDate(left.effectiveFrom).getTime())[0];
}

function activeBudgetVersions(budgetVersions: BudgetVersion[], period: PeriodRange): BudgetVersion[] {
  const periodStart = period.periodStart.getTime();

  return budgetVersions.filter((budget) => {
    const effectiveFrom = toDate(budget.effectiveFrom).getTime();
    const effectiveTo = budget.effectiveTo ? toDate(budget.effectiveTo).getTime() : Number.POSITIVE_INFINITY;
    return effectiveFrom <= periodStart && effectiveTo >= periodStart;
  });
}

function sumField(entries: MetricEntry[], fields: MetricField[], fieldKey: string | undefined): number {
  return entries.reduce((sum, entry) => sum + toNumber(getValue(entry, fields, fieldKey)), 0);
}

function aggregate(input: RuleEvaluationInput, entries: MetricEntry[], aggregation: Aggregation, config: AggregationConfig) {
  const fieldKey = input.fieldKey;
  const conditions = config.conditions ?? [];
  const matchingEntries = entries.filter((entry) => matchesConditions(entry, input.fields, conditions));

  switch (aggregation) {
    case "countEntries":
      return { actualValue: entries.length, matchingEntryCount: entries.length };
    case "countWhere":
      return { actualValue: matchingEntries.length, matchingEntryCount: matchingEntries.length };
    case "countUniqueDaysWhere":
      return {
        actualValue: new Set(matchingEntries.map((entry) => format(toDate(entry.entryDate), "yyyy-MM-dd"))).size,
        matchingEntryCount: matchingEntries.length
      };
    case "sumField":
      return { actualValue: sumField(entries, input.fields, fieldKey), matchingEntryCount: entries.length };
    case "averageField": {
      const values = entries.map((entry) => getValue(entry, input.fields, fieldKey)).filter((value) => typeof value === "number");
      return {
        actualValue: values.length === 0 ? 0 : values.reduce((sum, value) => sum + Number(value), 0) / values.length,
        matchingEntryCount: values.length
      };
    }
    case "latestValue":
      return {
        actualValue: entries.length === 0 ? null : getValue(latestEntry(entries) ?? entries[0], input.fields, fieldKey) ?? null,
        matchingEntryCount: entries.length
      };
    case "percentWhere":
      return {
        actualValue: entries.length === 0 ? 0 : (matchingEntries.length / entries.length) * 100,
        matchingEntryCount: matchingEntries.length
      };
    case "groupedSum": {
      const groups: Record<string, number> = {};
      const groupByFieldKey = config.groupByFieldKey ?? "category";

      for (const entry of entries) {
        const groupKey = getValue(entry, input.fields, groupByFieldKey);
        if (typeof groupKey !== "string") {
          continue;
        }
        groups[groupKey] = (groups[groupKey] ?? 0) + toNumber(getValue(entry, input.fields, fieldKey));
      }

      return { actualValue: groups, matchingEntryCount: entries.length, groups };
    }
    case "budgetUsedPercentage": {
      const used = sumField(entries, input.fields, fieldKey);
      const budgetAmount = activeBudgetVersions(input.budgetVersions ?? [], input.period).reduce((sum, budget) => {
        if (!input.dimensionFilters?.category) {
          return sum + budget.amount;
        }
        const filters = Array.isArray(input.dimensionFilters.category)
          ? input.dimensionFilters.category
          : [input.dimensionFilters.category];
        return filters.includes(budget.dimensionId) ? sum + budget.amount : sum;
      }, 0);

      return {
        actualValue: budgetAmount === 0 ? 0 : (used / budgetAmount) * 100,
        matchingEntryCount: entries.length,
        budgetAmount
      };
    }
    case "weightedScore": {
      const entry = latestEntry(entries);
      if (!entry) {
        return { actualValue: 0, matchingEntryCount: 0 };
      }
      const scoreField = input.fields.find((field) => field.key === fieldKey && field.calculation?.type === "score");
      return { actualValue: scoreField ? toNumber(getCalculatedValue(entry, scoreField)) : 0, matchingEntryCount: 1 };
    }
    case "calculatedFormula": {
      const entry = latestEntry(entries);
      return {
        actualValue: entry && config.formula ? evaluateFormula(config.formula, { ...entry.values, ...entry.calculatedValues }) : 0,
        matchingEntryCount: entry ? 1 : 0
      };
    }
    case "custom":
      return { actualValue: null, matchingEntryCount: entries.length };
    case "sum":
    case "average":
    case "count":
    case "latest":
      throw new Error("Legacy aggregations must be normalized before evaluation.");
  }
}

function progress(actualValue: FieldValue | Record<string, number>, targetValue: FieldValue | undefined): number | undefined {
  if (typeof actualValue !== "number" || typeof targetValue !== "number" || targetValue === 0) {
    return undefined;
  }

  return Math.max(0, Math.min(100, (actualValue / targetValue) * 100));
}

function evaluateStatus(
  actualValue: FieldValue | Record<string, number>,
  goal: GoalVersion | undefined,
  aggregation: Aggregation,
  entryCount: number,
  period: PeriodRange,
  now: Date
): RuleStatus {
  if (entryCount === 0) {
    return "noActivity";
  }

  if (aggregation === "budgetUsedPercentage" && typeof actualValue === "number") {
    if (actualValue > 100) {
      return "overBudget";
    }
    return actualValue >= 80 ? "approaching" : "onTrack";
  }

  if (!goal) {
    return "onTrack";
  }

  const operator = goal.toleranceType === "percentage" ? "withinPercentageTolerance" : goal.comparisonOperator;
  const isComplete = compareValues(actualValue as FieldValue, operator, goal.targetValue, goal.toleranceValue);

  if (isComplete) {
    return "complete";
  }

  return now > period.periodEnd ? "missed" : "behind";
}

export function evaluateMetricRule(input: RuleEvaluationInput): RuleEvaluationResult {
  const goal = selectActiveGoalVersion(input.goalVersions ?? [], input.metric.id, input.period);
  const aggregation = normalizeAggregation(goal?.aggregation ?? input.aggregation ?? "countEntries");
  const aggregationConfig = {
    ...(input.aggregationConfig ?? {}),
    ...(goal?.aggregationConfig ?? {})
  };
  const fieldKey = goal?.fieldKey ?? input.fieldKey;
  const entries = filterEntries(input);
  const aggregateResult = aggregate({ ...input, fieldKey }, entries, aggregation, aggregationConfig);
  const actualValue = aggregateResult.actualValue;
  const targetValue = goal?.targetValue;
  const behaviorNotes = ["If a period spans multiple goal versions, V1 uses the version active at periodStart."];

  return {
    actualValue,
    targetValue,
    percentageProgress: progress(actualValue, targetValue),
    status: evaluateStatus(actualValue, goal, aggregation, entries.length, input.period, input.now ?? new Date()),
    label: goal?.name ?? input.fields.find((field) => field.key === fieldKey)?.label ?? input.metric.name,
    details: {
      aggregation,
      entryCount: entries.length,
      matchingEntryCount: aggregateResult.matchingEntryCount,
      goalVersionId: goal?.id,
      periodStart: input.period.periodStart.toISOString(),
      periodEnd: input.period.periodEnd.toISOString(),
      behaviorNotes,
      groups: aggregateResult.groups,
      budgetAmount: aggregateResult.budgetAmount
    }
  };
}
