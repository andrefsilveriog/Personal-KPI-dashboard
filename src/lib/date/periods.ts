import { endOfDay, startOfDay } from "date-fns";

export type DatePeriod = {
  periodStart: Date;
  periodEnd: Date;
};

export function getDailyPeriod(date: Date): DatePeriod {
  return {
    periodStart: startOfDay(date),
    periodEnd: endOfDay(date)
  };
}
