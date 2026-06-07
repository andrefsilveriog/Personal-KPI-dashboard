import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays
} from "date-fns";

export type PeriodKey = "today" | "thisWeek" | "thisMonth" | "last7Days" | "last30Days" | "custom";

export type PeriodRange = {
  key: PeriodKey;
  periodStart: Date;
  periodEnd: Date;
};

export type PeriodOptions =
  | {
      key: Exclude<PeriodKey, "custom">;
      referenceDate?: Date;
      weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
    }
  | {
      key: "custom";
      start: Date;
      end: Date;
    };

export function resolvePeriod(options: PeriodOptions): PeriodRange {
  if (options.key === "custom") {
    return {
      key: "custom",
      periodStart: startOfDay(options.start),
      periodEnd: endOfDay(options.end)
    };
  }

  const referenceDate = options.referenceDate ?? new Date();
  const weekStartsOn = options.weekStartsOn ?? 1;

  switch (options.key) {
    case "today":
      return {
        key: options.key,
        periodStart: startOfDay(referenceDate),
        periodEnd: endOfDay(referenceDate)
      };
    case "thisWeek":
      return {
        key: options.key,
        periodStart: startOfWeek(referenceDate, { weekStartsOn }),
        periodEnd: endOfWeek(referenceDate, { weekStartsOn })
      };
    case "thisMonth":
      return {
        key: options.key,
        periodStart: startOfMonth(referenceDate),
        periodEnd: endOfMonth(referenceDate)
      };
    case "last7Days":
      return {
        key: options.key,
        periodStart: startOfDay(subDays(referenceDate, 6)),
        periodEnd: endOfDay(referenceDate)
      };
    case "last30Days":
      return {
        key: options.key,
        periodStart: startOfDay(subDays(referenceDate, 29)),
        periodEnd: endOfDay(referenceDate)
      };
  }
}
