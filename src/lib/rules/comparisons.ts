import type { ComparisonOperator, FieldValue } from "../../types/kpi";

export function isEmptyValue(value: FieldValue | undefined): boolean {
  return value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);
}

function toNumber(value: FieldValue | undefined): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function normalizedOperator(operator: ComparisonOperator): Exclude<ComparisonOperator, "eq" | "neq" | "gt" | "gte" | "lt" | "lte"> {
  switch (operator) {
    case "eq":
      return "equals";
    case "neq":
      return "notEquals";
    case "gt":
      return "greaterThan";
    case "gte":
      return "greaterThanOrEqual";
    case "lt":
      return "lessThan";
    case "lte":
      return "lessThanOrEqual";
    default:
      return operator;
  }
}

export function compareValues(
  actual: FieldValue | undefined,
  operator: ComparisonOperator,
  expected?: FieldValue,
  tolerancePercentage?: number
): boolean {
  const normalized = normalizedOperator(operator);
  const actualNumber = toNumber(actual);
  const expectedNumber = toNumber(expected);

  switch (normalized) {
    case "equals":
      return actual === expected;
    case "notEquals":
      return actual !== expected;
    case "greaterThan":
      return actualNumber !== null && expectedNumber !== null && actualNumber > expectedNumber;
    case "greaterThanOrEqual":
      return actualNumber !== null && expectedNumber !== null && actualNumber >= expectedNumber;
    case "lessThan":
      return actualNumber !== null && expectedNumber !== null && actualNumber < expectedNumber;
    case "lessThanOrEqual":
      return actualNumber !== null && expectedNumber !== null && actualNumber <= expectedNumber;
    case "between":
      if (!Array.isArray(expected) || expected.length < 2 || actualNumber === null) {
        return false;
      }
      return actualNumber >= Number(expected[0]) && actualNumber <= Number(expected[1]);
    case "withinPercentageTolerance":
      if (actualNumber === null || expectedNumber === null) {
        return false;
      }
      return Math.abs(actualNumber - expectedNumber) <= Math.abs(expectedNumber) * ((tolerancePercentage ?? 0) / 100);
    case "isEmpty":
      return isEmptyValue(actual);
    case "isNotEmpty":
      return !isEmptyValue(actual);
  }
}
