import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  writeBatch
} from "firebase/firestore";
import { db } from "../lib/firebase";
import {
  DashboardConfig,
  defaultConfig,
  HabitEntry,
  LifeDashboardData,
  NutritionEntry,
  SpendingEntry,
  WorkoutEntry
} from "./lifeDashboard";

type StoredConfig = DashboardConfig & {
  updatedAt?: unknown;
};

const collections = {
  habits: "habits",
  nutrition: "nutrition",
  settings: "settings",
  spending: "spending",
  workouts: "workouts"
} as const;

export async function loadDashboardData(userId: string): Promise<LifeDashboardData | null> {
  const firestore = requireFirestore();
  const [settingsSnapshot, workoutsSnapshot, habitsSnapshot, nutritionSnapshot, spendingSnapshot] = await Promise.all([
    getDoc(doc(firestore, "users", userId, collections.settings, "current")),
    getDocs(collection(firestore, "users", userId, collections.workouts)),
    getDocs(collection(firestore, "users", userId, collections.habits)),
    getDocs(collection(firestore, "users", userId, collections.nutrition)),
    getDocs(collection(firestore, "users", userId, collections.spending))
  ]);

  if (
    !settingsSnapshot.exists() &&
    workoutsSnapshot.empty &&
    habitsSnapshot.empty &&
    nutritionSnapshot.empty &&
    spendingSnapshot.empty
  ) {
    return null;
  }

  const settings = settingsSnapshot.exists() ? stripMetadata(settingsSnapshot.data() as StoredConfig) : defaultConfig;

  return {
    config: {
      ...defaultConfig,
      ...settings,
      macroGoals: { ...defaultConfig.macroGoals, ...settings.macroGoals },
      budgets: { ...defaultConfig.budgets, ...settings.budgets }
    },
    workouts: workoutsSnapshot.docs.map((entry) => stripMetadata(entry.data() as WorkoutEntry)),
    habits: habitsSnapshot.docs.map((entry) => normalizeHabitEntry(stripMetadata(entry.data() as HabitEntry))),
    nutrition: nutritionSnapshot.docs.map((entry) => stripMetadata(entry.data() as NutritionEntry)),
    spending: spendingSnapshot.docs.map((entry) => stripMetadata(entry.data() as SpendingEntry))
  };
}

export async function replaceDashboardData(userId: string, data: LifeDashboardData) {
  const firestore = requireFirestore();
  const batch = writeBatch(firestore);

  batch.set(doc(firestore, "users", userId, collections.settings, "current"), {
    ...data.config,
    updatedAt: serverTimestamp()
  });

  for (const entry of data.workouts) {
    batch.set(doc(firestore, "users", userId, collections.workouts, entry.date), withUpdatedAt(entry));
  }

  for (const entry of data.habits) {
    batch.set(doc(firestore, "users", userId, collections.habits, entry.date), withUpdatedAt(entry));
  }

  for (const entry of data.nutrition) {
    batch.set(doc(firestore, "users", userId, collections.nutrition, entry.date), withUpdatedAt(entry));
  }

  for (const entry of data.spending) {
    batch.set(doc(firestore, "users", userId, collections.spending, entry.id), withUpdatedAt(entry));
  }

  await deleteMissingDocuments(userId, data);
  await batch.commit();
}

async function deleteMissingDocuments(userId: string, data: LifeDashboardData) {
  const firestore = requireFirestore();
  const [workoutsSnapshot, habitsSnapshot, nutritionSnapshot, spendingSnapshot] = await Promise.all([
    getDocs(collection(firestore, "users", userId, collections.workouts)),
    getDocs(collection(firestore, "users", userId, collections.habits)),
    getDocs(collection(firestore, "users", userId, collections.nutrition)),
    getDocs(collection(firestore, "users", userId, collections.spending))
  ]);

  await Promise.all([
    ...deleteDocsNotIn(workoutsSnapshot.docs.map((entry) => entry.id), new Set(data.workouts.map((entry) => entry.date)), (id) =>
      doc(firestore, "users", userId, collections.workouts, id)
    ),
    ...deleteDocsNotIn(habitsSnapshot.docs.map((entry) => entry.id), new Set(data.habits.map((entry) => entry.date)), (id) =>
      doc(firestore, "users", userId, collections.habits, id)
    ),
    ...deleteDocsNotIn(nutritionSnapshot.docs.map((entry) => entry.id), new Set(data.nutrition.map((entry) => entry.date)), (id) =>
      doc(firestore, "users", userId, collections.nutrition, id)
    ),
    ...deleteDocsNotIn(spendingSnapshot.docs.map((entry) => entry.id), new Set(data.spending.map((entry) => entry.id)), (id) =>
      doc(firestore, "users", userId, collections.spending, id)
    )
  ]);
}

function deleteDocsNotIn(ids: string[], currentIds: Set<string>, getRef: (id: string) => ReturnType<typeof doc>) {
  return ids.filter((id) => !currentIds.has(id)).map((id) => deleteDoc(getRef(id)));
}

function stripMetadata<T extends Record<string, unknown>>(data: T): T {
  const { createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = data;
  return rest as T;
}

function normalizeHabitEntry(entry: HabitEntry): HabitEntry {
  return {
    ...entry,
    antihistamine: entry.antihistamine ?? "No",
    weight: entry.weight ?? "No"
  };
}

function withUpdatedAt<T extends Record<string, unknown>>(entry: T) {
  return {
    ...entry,
    updatedAt: serverTimestamp()
  };
}

function requireFirestore() {
  if (!db) {
    throw new Error("Firebase is not configured. Add the Vite Firebase environment variables first.");
  }

  return db;
}
