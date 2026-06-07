import { describe, expect, it } from "vitest";
import type { MetricEntry } from "../types/kpi";
import {
  calculateExpectedPace,
  calculateLedgerSummary,
  findLedgerMetricConfigs,
  getActiveBudgetVersion,
  getLedgerStatus
} from "../features/spending/ledgerUtils";
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

describe("ledger utilities", () => {
  it("detects transaction ledger metrics from field types", () => {
    const configs = findLedgerMetricConfigs(seed.metrics, seed.metricFields);

    expect(configs).toHaveLength(1);
    expect(configs[0]?.categoryField.type).toBe("dimension");
    expect(configs[0]?.amountField.key).toBe("total_amount");
  });

  it("selects active budget versions by effective date", () => {
    const budget = getActiveBudgetVersion(seed.budgetVersions, "starter-spending-supermarket", new Date("2026-06-15T12:00:00.000Z"));

    expect(budget?.amount).toBe(800);
  });

  it("groups monthly spending by category with budgets and percent used", () => {
    const summary = calculateLedgerSummary({
      metrics: seed.metrics,
      fields: seed.metricFields,
      dimensions: seed.dimensions,
      budgetVersions: seed.budgetVersions,
      referenceDate: new Date("2026-06-15T12:00:00.000Z"),
      entries: [
        entry(
          "entry-1",
          "starter-spending",
          "2026-06-03T12:00:00.000Z",
          { category: "starter-spending-supermarket", credit_card_amount: 200, cash_amount: 50 },
          { total_amount: 250 }
        ),
        entry(
          "entry-2",
          "starter-spending",
          "2026-06-04T12:00:00.000Z",
          { category: "starter-spending-restaurants", credit_card_amount: 100, cash_amount: 0 },
          { total_amount: 100 }
        )
      ]
    });

    const supermarket = summary.categories.find((category) => category.dimension.id === "starter-spending-supermarket");

    expect(supermarket?.spent).toBe(250);
    expect(supermarket?.budget).toBe(800);
    expect(supermarket?.percentUsed).toBe(31.25);
    expect(summary.totalMonthlySpent).toBe(350);
    expect(summary.totalMonthlyBudget).toBeGreaterThan(0);
  });

  it("evaluates reusable budget statuses", () => {
    expect(getLedgerStatus(0, 100)).toBe("No Activity");
    expect(getLedgerStatus(50, 100)).toBe("On Track");
    expect(getLedgerStatus(85, 100)).toBe("Approaching");
    expect(getLedgerStatus(101, 100)).toBe("Over Budget");
  });

  it("calculates expected pace for the current month", () => {
    expect(calculateExpectedPace(new Date("2026-06-15T12:00:00.000Z"))).toBe(50);
  });
});
