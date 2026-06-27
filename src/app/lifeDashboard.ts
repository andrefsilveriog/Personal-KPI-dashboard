import { endOfISOWeek, format, getISOWeek, parseISO, startOfISOWeek } from "date-fns";

export type YesNo = "Yes" | "No";
export type BrushStatus = "Yes" | "Once" | "No";
export type NutritionLogStatus = "Yes" | "Partial" | "No";

export type WorkoutEntry = {
  date: string;
  went: YesNo;
  quality: number | "";
  notes: string;
};

export type HabitEntry = {
  date: string;
  antihistamine: YesNo;
  brushed: BrushStatus;
  flossed: YesNo;
  bedroomTidy: YesNo;
  deskTidy: YesNo;
  clothesAway: YesNo;
};

export type NutritionEntry = {
  date: string;
  logged: NutritionLogStatus;
  carbs: number | "";
  protein: number | "";
  fat: number | "";
};

export type SpendingEntry = {
  id: string;
  date: string;
  category: string;
  credit: number | "";
  cash: number | "";
  notes: string;
};

export type DashboardConfig = {
  workoutTarget: number;
  macroTolerance: number;
  macroGoals: {
    carbs: number;
    protein: number;
    fat: number;
  };
  budgets: Record<string, number>;
};

export type LifeDashboardData = {
  config: DashboardConfig;
  workouts: WorkoutEntry[];
  habits: HabitEntry[];
  nutrition: NutritionEntry[];
  spending: SpendingEntry[];
};

export type WeeklySummary = {
  week: number;
  workoutSessions: number;
  workoutTarget: number;
  hitWorkoutTarget: boolean;
  averageWorkoutQuality: number | null;
  daysLogged: number;
  brushedTwice: number;
  brushedOnce: number;
  antihistamineTaken: number;
  antihistamineTarget: number;
  flossed: number;
  bedroomTidy: number;
  deskTidy: number;
  clothesAway: number;
  averageHabitScore: number;
  nutritionFullyLogged: number;
  nutritionPartiallyLogged: number;
  nutritionMissed: number;
  carbsHit: number;
  proteinHit: number;
  fatHit: number;
  perfectMacroDays: number;
};

export type BudgetSummary = {
  category: string;
  budget: number;
  spent: number;
  used: number;
  status: "OK" | "Near" | "Over";
};

export const defaultConfig: DashboardConfig = {
  workoutTarget: 4,
  macroTolerance: 0.05,
  macroGoals: {
    carbs: 225,
    protein: 150,
    fat: 56
  },
  budgets: {
    Supermarket: 1600,
    Restaurants: 250,
    Car: 164,
    "Online Shopping": 200,
    "Gym Membership": 228,
    Health: 100,
    Tobacco: 80,
    Subscriptions: 240,
    "Phone Bill": 66.95,
    Utilities: 410,
    Therapy: 360,
    Others: 350
  }
};

export const initialData: LifeDashboardData = {
  config: defaultConfig,
  workouts: [
    { date: "2026-06-08", went: "No", quality: "", notes: "" },
    { date: "2026-06-09", went: "No", quality: "", notes: "Burst pipe in the kitchen, I would've gone otherwise" },
    { date: "2026-06-10", went: "Yes", quality: 10, notes: "Legs" },
    { date: "2026-06-11", went: "No", quality: "", notes: "" },
    { date: "2026-06-12", went: "No", quality: "", notes: "" }
  ],
  habits: [
    { date: "2026-06-08", antihistamine: "Yes", brushed: "Yes", flossed: "Yes", bedroomTidy: "Yes", deskTidy: "Yes", clothesAway: "Yes" },
    { date: "2026-06-09", antihistamine: "Yes", brushed: "Once", flossed: "Yes", bedroomTidy: "Yes", deskTidy: "Yes", clothesAway: "Yes" },
    { date: "2026-06-10", antihistamine: "Yes", brushed: "Yes", flossed: "No", bedroomTidy: "Yes", deskTidy: "Yes", clothesAway: "No" },
    { date: "2026-06-11", antihistamine: "No", brushed: "Yes", flossed: "Yes", bedroomTidy: "No", deskTidy: "Yes", clothesAway: "Yes" },
    { date: "2026-06-12", antihistamine: "Yes", brushed: "No", flossed: "Yes", bedroomTidy: "Yes", deskTidy: "Yes", clothesAway: "Yes" }
  ],
  nutrition: [
    { date: "2026-06-08", logged: "Yes", carbs: 219, protein: 157, fat: 58 },
    { date: "2026-06-09", logged: "Yes", carbs: 222, protein: 152, fat: 56 },
    { date: "2026-06-10", logged: "Yes", carbs: 224, protein: 147, fat: 55 },
    { date: "2026-06-11", logged: "Yes", carbs: 231, protein: 151, fat: 56 }
  ],
  spending: [
    { id: "seed-1", date: "2026-06-05", category: "Others", credit: "", cash: 339.38, notes: "Presente dia dos namorados (Zelda)" },
    { id: "seed-2", date: "2026-06-05", category: "Subscriptions", credit: "", cash: 23.9, notes: "Spotify" },
    { id: "seed-3", date: "2026-06-04", category: "Car", credit: 163.88, cash: "", notes: "Localiza (4/10)" },
    { id: "seed-4", date: "2026-06-06", category: "Gym Membership", credit: 104.9, cash: "", notes: "Academia" },
    { id: "seed-5", date: "2026-06-05", category: "Phone Bill", credit: 29.9, cash: "", notes: "Claro Flex" },
    { id: "seed-6", date: "2026-06-05", category: "Supermarket", credit: 90.64, cash: "", notes: "Zaffari" },
    { id: "seed-7", date: "2026-06-06", category: "Online Shopping", credit: 18.99, cash: "", notes: "Shopee" },
    { id: "seed-8", date: "2026-06-06", category: "Subscriptions", credit: 103.88, cash: "", notes: "Open AI" }
  ]
};

export function weekOf(date: string) {
  return getISOWeek(parseISO(date));
}

export function weekLabel(week: number, data: LifeDashboardData) {
  const match = [...data.workouts, ...data.habits, ...data.nutrition].find((entry) => weekOf(entry.date) === week);

  if (!match) {
    return `Week ${week}`;
  }

  const date = parseISO(match.date);
  return `${format(startOfISOWeek(date), "MMM d")} - ${format(endOfISOWeek(date), "MMM d")}`;
}

export function monthOf(date: string) {
  return format(parseISO(date), "yyyy-MM");
}

export function toMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", { currency: "BRL", style: "currency" }).format(value);
}

export function habitScore(entry: HabitEntry) {
  const brush = entry.brushed === "Yes" ? 1 : entry.brushed === "Once" ? 0.5 : 0;
  const others = [entry.flossed, entry.bedroomTidy, entry.deskTidy, entry.clothesAway].filter((value) => value === "Yes").length;
  return brush + others;
}

export function isMacroHit(actual: number | "", goal: number, tolerance: number) {
  if (actual === "") {
    return false;
  }

  const lower = goal * (1 - tolerance);
  const upper = goal * (1 + tolerance);
  return actual >= lower && actual <= upper;
}

export function spendingTotal(entry: SpendingEntry) {
  return Number(entry.credit || 0) + Number(entry.cash || 0);
}

export function sortSpendingByDate(entries: SpendingEntry[]) {
  return [...entries].sort((a, b) => {
    const byDate = b.date.localeCompare(a.date);
    return byDate || b.id.localeCompare(a.id);
  });
}

export function summarizeWeek(data: LifeDashboardData, week: number): WeeklySummary {
  const workouts = data.workouts.filter((entry) => weekOf(entry.date) === week);
  const habits = data.habits.filter((entry) => weekOf(entry.date) === week);
  const nutrition = data.nutrition.filter((entry) => weekOf(entry.date) === week);
  const workoutSessions = workouts.filter((entry) => entry.went === "Yes").length;
  const qualities = workouts
    .map((entry) => entry.quality)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const averageWorkoutQuality = qualities.length ? average(qualities) : null;

  const macroHits = nutrition.map((entry) => ({
    carbs: isMacroHit(entry.carbs, data.config.macroGoals.carbs, data.config.macroTolerance),
    protein: isMacroHit(entry.protein, data.config.macroGoals.protein, data.config.macroTolerance),
    fat: isMacroHit(entry.fat, data.config.macroGoals.fat, data.config.macroTolerance)
  }));

  return {
    week,
    workoutSessions,
    workoutTarget: data.config.workoutTarget,
    hitWorkoutTarget: workoutSessions >= data.config.workoutTarget,
    averageWorkoutQuality,
    daysLogged: new Set([...workouts, ...habits, ...nutrition].map((entry) => entry.date)).size,
    brushedTwice: habits.filter((entry) => entry.brushed === "Yes").length,
    brushedOnce: habits.filter((entry) => entry.brushed === "Once").length,
    antihistamineTaken: habits.filter((entry) => entry.antihistamine === "Yes").length,
    antihistamineTarget: 7,
    flossed: habits.filter((entry) => entry.flossed === "Yes").length,
    bedroomTidy: habits.filter((entry) => entry.bedroomTidy === "Yes").length,
    deskTidy: habits.filter((entry) => entry.deskTidy === "Yes").length,
    clothesAway: habits.filter((entry) => entry.clothesAway === "Yes").length,
    averageHabitScore: habits.length ? average(habits.map(habitScore)) : 0,
    nutritionFullyLogged: nutrition.filter((entry) => entry.logged === "Yes").length,
    nutritionPartiallyLogged: nutrition.filter((entry) => entry.logged === "Partial").length,
    nutritionMissed: nutrition.filter((entry) => entry.logged === "No").length,
    carbsHit: macroHits.filter((hit) => hit.carbs).length,
    proteinHit: macroHits.filter((hit) => hit.protein).length,
    fatHit: macroHits.filter((hit) => hit.fat).length,
    perfectMacroDays: macroHits.filter((hit) => hit.carbs && hit.protein && hit.fat).length
  };
}

export function summarizeBudgets(data: LifeDashboardData, month: string): BudgetSummary[] {
  const spending = data.spending.filter((entry) => monthOf(entry.date) === month);

  return Object.entries(data.config.budgets).map(([category, budget]) => {
    const spent = spending
      .filter((entry) => entry.category === category)
      .reduce((total, entry) => total + spendingTotal(entry), 0);
    const used = budget > 0 ? spent / budget : 0;
    const status = used >= 1 ? "Over" : used >= 0.9 ? "Near" : "OK";

    return { category, budget, spent, used, status };
  });
}

export function saveBudgetCategory(data: LifeDashboardData, previousCategory: string, nextCategory: string, budget: number) {
  const trimmedCategory = nextCategory.trim();

  if (!trimmedCategory) {
    return data;
  }

  const budgets = Object.fromEntries(
    Object.entries(data.config.budgets).map(([category, amount]) =>
      category === previousCategory ? [trimmedCategory, budget] : [category, amount]
    )
  );

  if (!Object.hasOwn(budgets, previousCategory) && !Object.hasOwn(data.config.budgets, previousCategory)) {
    budgets[trimmedCategory] = budget;
  }

  return {
    ...data,
    config: {
      ...data.config,
      budgets
    },
    spending: data.spending.map((entry) =>
      entry.category === previousCategory ? { ...entry, category: trimmedCategory } : entry
    )
  };
}

export function deleteBudgetCategory(data: LifeDashboardData, categoryToDelete: string) {
  const { [categoryToDelete]: _deleted, ...budgets } = data.config.budgets;

  return {
    ...data,
    config: {
      ...data.config,
      budgets
    }
  };
}

export function availableWeeks(data: LifeDashboardData) {
  return Array.from(new Set([...data.workouts, ...data.habits, ...data.nutrition].map((entry) => weekOf(entry.date)))).sort(
    (a, b) => b - a
  );
}

export function availableMonths(data: LifeDashboardData) {
  return Array.from(new Set(data.spending.map((entry) => monthOf(entry.date)))).sort((a, b) => b.localeCompare(a));
}

function average(values: number[]) {
  return values.reduce((total, value) => total + value, 0) / values.length;
}
