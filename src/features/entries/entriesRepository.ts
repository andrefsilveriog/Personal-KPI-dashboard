import { addDoc, getDocs, setDoc } from "firebase/firestore";
import type { BudgetVersion, Dashboard, DashboardWidget, Dimension, GoalVersion, Metric, MetricEntry, MetricField } from "../../types/kpi";
import { getUserCollection, getUserDocument } from "../../lib/firebase/collections";
import { computeCalculatedValues } from "./entryCalculations";
import { resolveEntryPeriod, todayInputValue } from "./entryPeriods";

export type KpiMetadata = {
  metrics: Metric[];
  fields: MetricField[];
  dimensions: Dimension[];
  budgetVersions: BudgetVersion[];
  dashboards: Dashboard[];
  dashboardWidgets: DashboardWidget[];
  goalVersions: GoalVersion[];
};

export async function fetchKpiMetadata(userId: string): Promise<KpiMetadata> {
  const metricCollection = getUserCollection(userId, "metrics");
  const fieldCollection = getUserCollection(userId, "metricFields");
  const dimensionCollection = getUserCollection(userId, "dimensions");
  const budgetCollection = getUserCollection(userId, "budgetVersions");
  const dashboardCollection = getUserCollection(userId, "dashboards");
  const widgetCollection = getUserCollection(userId, "dashboardWidgets");
  const goalCollection = getUserCollection(userId, "goalVersions");

  if (!metricCollection || !fieldCollection || !dimensionCollection || !budgetCollection || !dashboardCollection || !widgetCollection || !goalCollection) {
    throw new Error("Firebase config is missing.");
  }

  const [metricsSnapshot, fieldsSnapshot, dimensionsSnapshot, budgetsSnapshot, dashboardsSnapshot, widgetsSnapshot, goalsSnapshot] = await Promise.all([
    getDocs(metricCollection),
    getDocs(fieldCollection),
    getDocs(dimensionCollection),
    getDocs(budgetCollection),
    getDocs(dashboardCollection),
    getDocs(widgetCollection),
    getDocs(goalCollection)
  ]);

  return {
    metrics: metricsSnapshot.docs.map((doc) => doc.data()).filter((metric) => !metric.archived),
    fields: fieldsSnapshot.docs.map((doc) => doc.data()).filter((field) => !field.archived),
    dimensions: dimensionsSnapshot.docs.map((doc) => doc.data()).filter((dimension) => !dimension.archived),
    budgetVersions: budgetsSnapshot.docs.map((doc) => doc.data()),
    dashboards: dashboardsSnapshot.docs.map((doc) => doc.data()),
    dashboardWidgets: widgetsSnapshot.docs.map((doc) => doc.data()),
    goalVersions: goalsSnapshot.docs.map((doc) => doc.data())
  };
}

export async function fetchMetricEntries(userId: string): Promise<MetricEntry[]> {
  const entryCollection = getUserCollection(userId, "metricEntries");

  if (!entryCollection) {
    throw new Error("Firebase config is missing.");
  }

  const snapshot = await getDocs(entryCollection);
  return snapshot.docs.map((doc) => doc.data()).filter((entry) => !entry.archived);
}

function findExistingPeriodEntry(entries: MetricEntry[], metric: Metric, periodStart: string, periodEnd: string): MetricEntry | undefined {
  return entries.find(
    (entry) =>
      entry.metricId === metric.id &&
      !entry.archived &&
      entry.periodStart === periodStart &&
      entry.periodEnd === periodEnd
  );
}

export type SaveMetricEntryInput = {
  userId: string;
  metric: Metric;
  fields: MetricField[];
  values: MetricEntry["values"];
  entryDateValue?: string;
  existingEntries: MetricEntry[];
  entryToUpdate?: MetricEntry;
};

export async function saveMetricEntry(input: SaveMetricEntryInput): Promise<MetricEntry> {
  const entryDateValue = input.entryDateValue || todayInputValue();
  const period = resolveEntryPeriod(input.metric, entryDateValue);
  const calculatedValues = computeCalculatedValues(input.fields, input.values);
  const now = new Date().toISOString();
  const existingEntry = input.entryToUpdate
    ? input.entryToUpdate
    : input.metric.allowMultipleEntriesPerPeriod
    ? undefined
    : findExistingPeriodEntry(input.existingEntries, input.metric, period.periodStart, period.periodEnd);

  if (existingEntry) {
    const updatedEntry: MetricEntry = {
      ...existingEntry,
      values: input.values,
      calculatedValues,
      entryDate: period.entryDate,
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
      updatedAt: now
    };
    const documentRef = getUserDocument(input.userId, "metricEntries", existingEntry.id);

    if (!documentRef) {
      throw new Error("Firebase config is missing.");
    }

    await setDoc(documentRef, updatedEntry);
    return updatedEntry;
  }

  const entry: MetricEntry = {
    id: "",
    userId: input.userId,
    metricId: input.metric.id,
    entryDate: period.entryDate,
    periodStart: period.periodStart,
    periodEnd: period.periodEnd,
    values: input.values,
    calculatedValues,
    createdAt: now,
    updatedAt: now,
    archived: false
  };
  const collectionRef = getUserCollection(input.userId, "metricEntries");

  if (!collectionRef) {
    throw new Error("Firebase config is missing.");
  }

  const documentRef = await addDoc(collectionRef, entry);
  const savedEntry = { ...entry, id: documentRef.id };
  await setDoc(documentRef, savedEntry);
  return savedEntry;
}

export async function archiveMetricEntry(userId: string, entry: MetricEntry): Promise<MetricEntry> {
  const documentRef = getUserDocument(userId, "metricEntries", entry.id);

  if (!documentRef) {
    throw new Error("Firebase config is missing.");
  }

  const archivedEntry: MetricEntry = {
    ...entry,
    archived: true,
    updatedAt: new Date().toISOString()
  };

  await setDoc(documentRef, archivedEntry);
  return archivedEntry;
}
