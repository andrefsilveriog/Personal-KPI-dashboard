import { describe, expect, it } from "vitest";
import {
  deleteBudgetCategory,
  initialData,
  isMacroHit,
  saveBudgetCategory,
  sortSpendingByDate,
  summarizeBudgets,
  summarizeWeek,
  weekOf
} from "../app/lifeDashboard";

describe("life dashboard calculations", () => {
  it("uses ISO week numbers like the workbook", () => {
    expect(weekOf("2026-06-08")).toBe(24);
  });

  it("summarizes the seeded weekly scorecard", () => {
    const summary = summarizeWeek(initialData, 24);

    expect(summary.workoutSessions).toBe(1);
    expect(summary.workoutTarget).toBe(4);
    expect(summary.hitWorkoutTarget).toBe(false);
    expect(summary.brushedTwice).toBe(3);
    expect(summary.brushedOnce).toBe(1);
    expect(summary.antihistamineTaken).toBe(4);
    expect(summary.antihistamineTarget).toBe(7);
    expect(summary.weight).toBe(4);
    expect(summary.averageHabitScore).toBe(4.9);
    expect(summary.perfectMacroDays).toBe(4);
  });

  it("applies the nutrition tolerance window", () => {
    expect(isMacroHit(225, 225, 0.05)).toBe(true);
    expect(isMacroHit(238, 225, 0.05)).toBe(false);
  });

  it("rolls spending into budget status buckets", () => {
    const budgets = summarizeBudgets(initialData, "2026-06");
    const car = budgets.find((entry) => entry.category === "Car");

    expect(car?.spent).toBe(163.88);
    expect(car?.status).toBe("Near");
  });

  it("renames budget categories and keeps ledger entries attached", () => {
    const renamed = saveBudgetCategory(initialData, "Car", "Transport", 300);
    const budgets = summarizeBudgets(renamed, "2026-06");
    const transport = budgets.find((entry) => entry.category === "Transport");

    expect(renamed.config.budgets.Transport).toBe(300);
    expect(renamed.config.budgets.Car).toBeUndefined();
    expect(renamed.spending.some((entry) => entry.category === "Transport")).toBe(true);
    expect(transport?.spent).toBe(163.88);
  });

  it("deletes budget categories without deleting ledger history", () => {
    const updated = deleteBudgetCategory(initialData, "Car");

    expect(updated.config.budgets.Car).toBeUndefined();
    expect(updated.spending.some((entry) => entry.category === "Car")).toBe(true);
  });

  it("sorts ledger entries by newest date first", () => {
    const sorted = sortSpendingByDate(initialData.spending);

    expect(sorted[0].date >= sorted[1].date).toBe(true);
    expect(sorted.map((entry) => entry.date)).toEqual([...sorted.map((entry) => entry.date)].sort().reverse());
  });
});
