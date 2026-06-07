import type { Aggregation, DashboardWidget, FieldValue, GoalPeriod, Metric, MetricEntry, MetricField, GoalVersion, BudgetVersion, Dimension } from "../../types/kpi";
import { evaluateMetricRule, type RuleEvaluationResult } from "../../lib/rules";
import { resolvePeriod } from "../../lib/rules/periods";
import { calculateLedgerSummary, type LedgerSummary } from "../spending/ledgerUtils";

export type WidgetType = "kpi" | "progress" | "table" | "bar" | "budget" | "alerts";

export type WidgetDisplayOptions = {
  showActual: boolean;
  showTarget: boolean;
  showPercentage: boolean;
  showStatus: boolean;
  showTrend: boolean;
};

export type WidgetData = {
  widgetType: WidgetType;
  metric?: Metric;
  ruleResult?: RuleEvaluationResult;
  ledgerSummary?: LedgerSummary;
  tableRows: Array<Record<string, string | number>>;
  barRows: Array<{ name: string; value: number }>;
  displayOptions: WidgetDisplayOptions;
};

export type DashboardEngineInput = {
  widget: DashboardWidget;
  metrics: Metric[];
  fields: MetricField[];
  entries: MetricEntry[];
  goalVersions: GoalVersion[];
  budgetVersions: BudgetVersion[];
  dimensions: Dimension[];
};

const defaultDisplayOptions: WidgetDisplayOptions = {
  showActual: true,
  showTarget: true,
  showPercentage: true,
  showStatus: true,
  showTrend: false
};

function boolSetting(value: FieldValue | undefined, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export function normalizeWidgetType(widgetType: string): WidgetType {
  switch (widgetType) {
    case "goalProgress":
      return "progress";
    case "multiGoalSummary":
      return "table";
    case "latestValue":
      return "kpi";
    case "categoryBudgetSummary":
      return "budget";
    case "progress":
    case "table":
    case "bar":
    case "budget":
    case "alerts":
    case "kpi":
      return widgetType;
    default:
      return "kpi";
  }
}

export function getWidgetDisplayOptions(widget: DashboardWidget): WidgetDisplayOptions {
  return {
    showActual: boolSetting(widget.visualizationSettings.showActual, defaultDisplayOptions.showActual),
    showTarget: boolSetting(widget.visualizationSettings.showTarget, defaultDisplayOptions.showTarget),
    showPercentage: boolSetting(widget.visualizationSettings.showPercentage, defaultDisplayOptions.showPercentage),
    showStatus: boolSetting(widget.visualizationSettings.showStatus, defaultDisplayOptions.showStatus),
    showTrend: boolSetting(widget.visualizationSettings.showTrend, defaultDisplayOptions.showTrend)
  };
}

function widgetPeriodToKey(period: GoalPeriod) {
  switch (period) {
    case "daily":
      return "today";
    case "weekly":
      return "thisWeek";
    case "monthly":
      return "thisMonth";
    case "custom":
      return "last30Days";
  }
}

function valueToText(value: FieldValue | Record<string, number> | undefined): string {
  if (value === undefined || value === null) {
    return "";
  }

  if (typeof value === "object" && !Array.isArray(value)) {
    return Object.entries(value)
      .map(([key, amount]) => `${key}: ${amount}`)
      .join(", ");
  }

  return Array.isArray(value) ? value.join(", ") : String(value);
}

function buildTableRows(metric: Metric | undefined, fields: MetricField[], entries: MetricEntry[]): Array<Record<string, string | number>> {
  if (!metric) {
    return [];
  }

  const logFields = fields.filter((field) => field.metricId === metric.id && field.showInLogs).slice(0, 5);

  return entries
    .filter((entry) => entry.metricId === metric.id && !entry.archived)
    .slice(0, 8)
    .map((entry) => {
      const values = { ...entry.values, ...entry.calculatedValues };
      return logFields.reduce<Record<string, string | number>>(
        (row, field) => ({
          ...row,
          [field.label]: valueToText(values[field.key])
        }),
        { Date: entry.entryDate.slice(0, 10) }
      );
    });
}

function buildBarRows(ruleResult: RuleEvaluationResult | undefined, dimensions: Dimension[]): Array<{ name: string; value: number }> {
  const groups = ruleResult?.details.groups;

  if (!groups) {
    return [];
  }

  return Object.entries(groups).map(([key, value]) => ({
    name: dimensions.find((dimension) => dimension.id === key)?.name ?? key,
    value
  }));
}

export function computeWidgetData(input: DashboardEngineInput): WidgetData {
  const widgetType = normalizeWidgetType(input.widget.widgetType);
  const metric = input.metrics.find((candidate) => candidate.id === input.widget.metricId);
  const metricFields = metric ? input.fields.filter((field) => field.metricId === metric.id) : [];
  const period = resolvePeriod({ key: widgetPeriodToKey(input.widget.period) });
  const widgetGoalVersions = input.widget.goalVersionId
    ? input.goalVersions.filter((goal) => goal.id === input.widget.goalVersionId)
    : input.goalVersions.filter((goal) => goal.metricId === metric?.id);
  const aggregation = input.widget.aggregation as Aggregation;
  const isGroupedBudgetWidget = widgetType === "budget" || widgetType === "bar";
  const ruleResult = metric
    ? evaluateMetricRule({
        metric,
        fields: metricFields,
        entries: input.entries,
        goalVersions: widgetGoalVersions,
        period,
        aggregation: isGroupedBudgetWidget && aggregation === "sum" ? "groupedSum" : aggregation,
        aggregationConfig: isGroupedBudgetWidget ? { groupByFieldKey: "category" } : undefined,
        fieldKey: input.widget.fieldKey,
        budgetVersions: input.budgetVersions
      })
    : undefined;

  return {
    widgetType,
    metric,
    ruleResult,
    ledgerSummary:
      widgetType === "budget"
        ? calculateLedgerSummary({
            metrics: input.metrics,
            fields: input.fields,
            entries: input.entries,
            dimensions: input.dimensions,
            budgetVersions: input.budgetVersions
          })
        : undefined,
    tableRows: buildTableRows(metric, input.fields, input.entries),
    barRows: buildBarRows(ruleResult, input.dimensions),
    displayOptions: getWidgetDisplayOptions(input.widget)
  };
}
