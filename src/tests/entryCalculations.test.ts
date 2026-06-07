import { describe, expect, it } from "vitest";
import { buildInitialValues, computeCalculatedValues, validateEntryValues } from "../features/entries/entryCalculations";
import { resolveEntryPeriod } from "../features/entries/entryPeriods";
import { createStarterSeed } from "../seed/starterSeed";

const seed = createStarterSeed({
  userId: "user-1",
  now: "2026-06-01T12:00:00.000Z",
  today: "2026-06-01"
});

const habitFields = seed.metricFields.filter((field) => field.metricId === "starter-daily-habits");
const spendingFields = seed.metricFields.filter((field) => field.metricId === "starter-spending");

describe("entry calculations", () => {
  it("keeps old entry values and defaults newly added fields", () => {
    const values = buildInitialValues(habitFields, { brushed: "yes", flossed: true });

    expect(values.brushed).toBe("yes");
    expect(values.flossed).toBe(true);
    expect(values.bedroom_tidy).toBe(false);
  });

  it("computes calculated fields before save", () => {
    const spendingCalculated = computeCalculatedValues(spendingFields, {
      credit_card_amount: 12.5,
      cash_amount: 7.5
    });
    const habitCalculated = computeCalculatedValues(habitFields, {
      brushed: "once",
      flossed: true,
      bedroom_tidy: true,
      desk_tidy: false,
      clothes_put_away: true
    });

    expect(spendingCalculated.total_amount).toBe(20);
    expect(habitCalculated.score).toBe(3.5);
  });

  it("validates required, min, max, and enum options from field definitions", () => {
    const fields = habitFields.filter((field) => field.key === "brushed");

    expect(validateEntryValues(fields, { brushed: "" }).brushed).toBe("Required");
    expect(validateEntryValues(fields, { brushed: "twice" }).brushed).toBe("Choose a valid option");
  });

  it("resolves daily metrics to a single-day period for duplicate prevention", () => {
    const workout = seed.metrics.find((metric) => metric.id === "starter-workout");

    if (!workout) {
      throw new Error("Missing workout metric");
    }

    const period = resolveEntryPeriod(workout, "2026-06-02");

    expect(new Date(period.periodStart).getTime()).toBeLessThan(new Date(period.entryDate).getTime());
    expect(new Date(period.periodEnd).getTime()).toBeGreaterThan(new Date(period.entryDate).getTime());
  });
});
