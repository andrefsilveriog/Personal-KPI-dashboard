import { describe, expect, it } from "vitest";
import type { MetricEntry } from "../types/kpi";
import { computeWidgetData, getWidgetDisplayOptions, normalizeWidgetType } from "../features/dashboard/dashboardEngine";
import { createStarterSeed } from "../seed/starterSeed";

const seed = createStarterSeed({
  userId: "user-1",
  now: "2026-06-01T12:00:00.000Z",
  today: "2026-06-01"
});

function entry(
  id: string,
  metricId: string,
  entryDate: string,
  values: MetricEntry["values"],
  calculatedValues: MetricEntry["calculatedValues"] = {}
): MetricEntry {
  return {
    id,
    userId: "user-1",
    metricId,
    entryDate,
    periodStart: entryDate,
    periodEnd: entryDate,
    values,
    calculatedValues,
    createdAt: entryDate,
    updatedAt: entryDate,
    archived: false
  };
}

describe("dashboard widget engine", () => {
  it("normalizes seeded widget aliases to supported widget types", () => {
    expect(normalizeWidgetType("goalProgress")).toBe("progress");
    expect(normalizeWidgetType("categoryBudgetSummary")).toBe("budget");
  });

  it("computes seeded progress widget data from the rule engine", () => {
    const widget = seed.dashboardWidgets.find((candidate) => candidate.id === "starter-widget-default-workout");

    if (!widget) {
      throw new Error("Missing widget");
    }

    const data = computeWidgetData({
      widget,
      metrics: seed.metrics,
      fields: seed.metricFields,
      entries: [
        entry("workout-1", "starter-workout", "2026-06-01T12:00:00.000Z", { completed: true }),
        entry("workout-2", "starter-workout", "2026-06-02T12:00:00.000Z", { completed: true }),
        entry("workout-3", "starter-workout", "2026-06-03T12:00:00.000Z", { completed: true }),
        entry("workout-4", "starter-workout", "2026-06-04T12:00:00.000Z", { completed: true })
      ],
      goalVersions: seed.goalVersions,
      budgetVersions: seed.budgetVersions,
      dimensions: seed.dimensions
    });

    expect(data.widgetType).toBe("progress");
    expect(data.ruleResult?.actualValue).toBe(4);
    expect(data.ruleResult?.percentageProgress).toBe(100);
  });

  it("computes budget widget data from generic transaction fields", () => {
    const widget = seed.dashboardWidgets.find((candidate) => candidate.id === "starter-widget-default-spending");

    if (!widget) {
      throw new Error("Missing widget");
    }

    const data = computeWidgetData({
      widget,
      metrics: seed.metrics,
      fields: seed.metricFields,
      entries: [
        entry(
          "spending-1",
          "starter-spending",
          "2026-06-02T12:00:00.000Z",
          { category: "starter-spending-supermarket", credit_card_amount: 100, cash_amount: 50 },
          { total_amount: 150 }
        )
      ],
      goalVersions: seed.goalVersions,
      budgetVersions: seed.budgetVersions,
      dimensions: seed.dimensions
    });

    expect(data.widgetType).toBe("budget");
    expect(data.ledgerSummary?.totalMonthlySpent).toBe(150);
    expect(data.barRows[0]).toEqual({ name: "Supermarket", value: 150 });
  });

  it("reads widget display options from visualization settings", () => {
    const widget = {
      ...seed.dashboardWidgets[0],
      visualizationSettings: { showActual: false, showTarget: true, showPercentage: false, showStatus: true, showTrend: true }
    };

    expect(getWidgetDisplayOptions(widget)).toEqual({
      showActual: false,
      showTarget: true,
      showPercentage: false,
      showStatus: true,
      showTrend: true
    });
  });
});
