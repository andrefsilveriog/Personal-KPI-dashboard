import { describe, expect, it } from "vitest";
import { createStarterSeed } from "../seed/starterSeed";

const seed = createStarterSeed({
  userId: "user-1",
  now: "2026-06-07T12:00:00.000Z",
  today: "2026-06-07"
});

describe("starter seed config", () => {
  it("creates starter records as user-scoped configuration", () => {
    expect(seed.metrics).toHaveLength(4);
    expect(seed.metricFields.length).toBeGreaterThan(0);
    expect(seed.goalVersions).toHaveLength(4);
    expect(seed.dimensions).toHaveLength(11);
    expect(seed.budgetVersions).toHaveLength(11);
    expect(seed.dashboards).toHaveLength(2);
    expect(seed.dashboardWidgets.length).toBeGreaterThan(0);
    expect(seed.metrics.every((metric) => metric.userId === "user-1")).toBe(true);
  });

  it("stores calculated behavior as field metadata", () => {
    const habitScore = seed.metricFields.find((field) => field.id === "starter-daily-habits-score");
    const spendingTotal = seed.metricFields.find((field) => field.id === "starter-spending-total-amount");

    expect(habitScore?.calculation?.type).toBe("score");
    expect(spendingTotal?.calculation).toEqual({
      type: "sumFields",
      fieldKeys: ["credit_card_amount", "cash_amount"]
    });
  });

  it("stores conditional goal behavior as metadata", () => {
    const workoutGoal = seed.goalVersions.find((goal) => goal.id === "starter-goal-workout-weekly-completed");

    expect(workoutGoal?.aggregation).toBe("count");
    expect(workoutGoal?.aggregationConfig?.conditions).toEqual([
      { fieldKey: "completed", operator: "eq", value: true }
    ]);
  });

  it("creates BRL monthly budgets effective from the supplied date", () => {
    expect(seed.budgetVersions.every((budget) => budget.currency === "BRL")).toBe(true);
    expect(seed.budgetVersions.every((budget) => budget.period === "monthly")).toBe(true);
    expect(seed.budgetVersions.every((budget) => budget.effectiveFrom === "2026-06-07")).toBe(true);
  });
});
