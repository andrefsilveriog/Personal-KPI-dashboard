import { describe, expect, it } from "vitest";
import type { GoalVersion, MetricEntry } from "../types/kpi";
import { evaluateMetricRule, resolvePeriod, selectActiveGoalVersion } from "../lib/rules";
import { createStarterSeed } from "../seed/starterSeed";

const seed = createStarterSeed({
  userId: "user-1",
  now: "2026-06-01T12:00:00.000Z",
  today: "2026-06-01"
});

function metric(id: string) {
  const found = seed.metrics.find((candidate) => candidate.id === id);
  if (!found) {
    throw new Error(`Missing metric ${id}`);
  }
  return found;
}

function fields(metricId: string) {
  return seed.metricFields.filter((field) => field.metricId === metricId);
}

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

describe("generic rule engine", () => {
  it("evaluates workout weekly count target from goal metadata", () => {
    const period = resolvePeriod({ key: "thisWeek", referenceDate: new Date("2026-06-03T12:00:00.000Z") });
    const result = evaluateMetricRule({
      metric: metric("starter-workout"),
      fields: fields("starter-workout"),
      entries: [
        entry("workout-1", "starter-workout", "2026-06-01T12:00:00.000Z", { completed: true }),
        entry("workout-2", "starter-workout", "2026-06-02T12:00:00.000Z", { completed: true }),
        entry("workout-3", "starter-workout", "2026-06-03T12:00:00.000Z", { completed: false }),
        entry("workout-4", "starter-workout", "2026-06-04T12:00:00.000Z", { completed: true }),
        entry("workout-5", "starter-workout", "2026-06-05T12:00:00.000Z", { completed: true })
      ],
      goalVersions: seed.goalVersions,
      period,
      now: new Date("2026-06-05T12:00:00.000Z")
    });

    expect(result.actualValue).toBe(4);
    expect(result.targetValue).toBe(4);
    expect(result.percentageProgress).toBe(100);
    expect(result.status).toBe("complete");
    expect(result.details.aggregation).toBe("countWhere");
  });

  it("evaluates nutrition percentage tolerance from goal metadata", () => {
    const period = resolvePeriod({
      key: "custom",
      start: new Date("2026-06-02T00:00:00.000Z"),
      end: new Date("2026-06-02T23:59:59.000Z")
    });
    const result = evaluateMetricRule({
      metric: metric("starter-nutrition"),
      fields: fields("starter-nutrition"),
      entries: [entry("nutrition-1", "starter-nutrition", "2026-06-02T12:00:00.000Z", { carbs_g: 260 })],
      goalVersions: seed.goalVersions.filter((goal) => goal.fieldKey === "carbs_g"),
      period,
      now: new Date("2026-06-02T12:00:00.000Z")
    });

    expect(result.actualValue).toBe(260);
    expect(result.targetValue).toBe(250);
    expect(result.status).toBe("complete");
  });

  it("evaluates habit weighted score from field calculation metadata", () => {
    const period = resolvePeriod({
      key: "custom",
      start: new Date("2026-06-02T00:00:00.000Z"),
      end: new Date("2026-06-02T23:59:59.000Z")
    });
    const result = evaluateMetricRule({
      metric: metric("starter-daily-habits"),
      fields: fields("starter-daily-habits"),
      entries: [
        entry("habit-1", "starter-daily-habits", "2026-06-02T12:00:00.000Z", {
          brushed: "once",
          flossed: true,
          bedroom_tidy: false,
          desk_tidy: true,
          clothes_put_away: true
        })
      ],
      period,
      aggregation: "weightedScore",
      fieldKey: "score"
    });

    expect(result.actualValue).toBe(3.5);
    expect(result.status).toBe("onTrack");
  });

  it("evaluates spending grouped monthly sum using calculated field metadata", () => {
    const period = resolvePeriod({ key: "thisMonth", referenceDate: new Date("2026-06-15T12:00:00.000Z") });
    const result = evaluateMetricRule({
      metric: metric("starter-spending"),
      fields: fields("starter-spending"),
      entries: [
        entry("spending-1", "starter-spending", "2026-06-02T12:00:00.000Z", {
          category: "starter-spending-supermarket",
          credit_card_amount: 100,
          cash_amount: 25
        }),
        entry("spending-2", "starter-spending", "2026-06-03T12:00:00.000Z", {
          category: "starter-spending-restaurants",
          credit_card_amount: 50,
          cash_amount: 10
        }),
        entry("spending-3", "starter-spending", "2026-06-04T12:00:00.000Z", {
          category: "starter-spending-supermarket",
          credit_card_amount: 75,
          cash_amount: 0
        })
      ],
      period,
      aggregation: "groupedSum",
      fieldKey: "total_amount",
      aggregationConfig: { groupByFieldKey: "category" }
    });

    expect(result.actualValue).toEqual({
      "starter-spending-supermarket": 200,
      "starter-spending-restaurants": 60
    });
  });

  it("evaluates budget used percentage against active budget versions", () => {
    const period = resolvePeriod({ key: "thisMonth", referenceDate: new Date("2026-06-15T12:00:00.000Z") });
    const result = evaluateMetricRule({
      metric: metric("starter-spending"),
      fields: fields("starter-spending"),
      entries: [
        entry("spending-1", "starter-spending", "2026-06-02T12:00:00.000Z", {
          category: "starter-spending-supermarket",
          credit_card_amount: 400,
          cash_amount: 100
        })
      ],
      period,
      aggregation: "budgetUsedPercentage",
      fieldKey: "total_amount",
      dimensionFilters: { category: "starter-spending-supermarket" },
      budgetVersions: seed.budgetVersions
    });

    expect(result.actualValue).toBe(62.5);
    expect(result.details.budgetAmount).toBe(800);
    expect(result.status).toBe("onTrack");
  });

  it("selects the goal version active at periodStart when period spans versions", () => {
    const period = resolvePeriod({ key: "thisWeek", referenceDate: new Date("2026-06-03T12:00:00.000Z") });
    const goals: GoalVersion[] = [
      {
        ...seed.goalVersions[0],
        id: "old-goal",
        targetValue: 3,
        effectiveFrom: "2026-05-01",
        effectiveTo: "2026-06-02"
      },
      {
        ...seed.goalVersions[0],
        id: "new-goal",
        targetValue: 5,
        effectiveFrom: "2026-06-03",
        effectiveTo: null
      }
    ];

    expect(selectActiveGoalVersion(goals, "starter-workout", period)?.id).toBe("old-goal");
  });
});
