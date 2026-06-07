import { describe, expect, it } from "vitest";
import type { MetricEntry } from "../types/kpi";
import { buildLogRows, filterLogRows, logsToCsv } from "../features/entries/logsUtils";
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

const rows = buildLogRows(seed.metrics, seed.metricFields, [
  entry("workout-1", "starter-workout", "2026-06-02T12:00:00.000Z", {
    completed: true,
    notes: "strong session"
  }),
  entry(
    "spending-1",
    "starter-spending",
    "2026-06-03T12:00:00.000Z",
    {
      category: "starter-spending-supermarket",
      credit_card_amount: 100,
      cash_amount: 20,
      notes: "weekly groceries"
    },
    { total_amount: 120 }
  )
]);

describe("logs utilities", () => {
  it("filters logs by metric", () => {
    expect(filterLogRows(rows, { metricId: "starter-workout", startDate: "", endDate: "", dimensionValue: "", search: "" })).toHaveLength(1);
  });

  it("filters logs by dimension/category", () => {
    expect(
      filterLogRows(rows, {
        metricId: "",
        startDate: "",
        endDate: "",
        dimensionValue: "starter-spending-supermarket",
        search: ""
      })
    ).toHaveLength(1);
  });

  it("searches text values", () => {
    const filtered = filterLogRows(rows, { metricId: "", startDate: "", endDate: "", dimensionValue: "", search: "groceries" });

    expect(filtered[0]?.entry.id).toBe("spending-1");
  });

  it("exports filtered logs to CSV", () => {
    const csv = logsToCsv(filterLogRows(rows, { metricId: "starter-spending", startDate: "", endDate: "", dimensionValue: "", search: "" }), seed.dimensions);

    expect(csv).toContain("entryDate,metric,field,label,value,entryId");
    expect(csv).toContain("Spending");
    expect(csv).toContain("R$");
    expect(csv).toContain("Supermarket");
  });
});
