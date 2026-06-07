import { collection, doc, type CollectionReference, type DocumentReference } from "firebase/firestore";
import type {
  AppSettings,
  BudgetVersion,
  Dashboard,
  DashboardWidget,
  Dimension,
  GoalVersion,
  Metric,
  MetricEntry,
  MetricField
} from "../../types/kpi";
import { getFirebaseClient } from "./firebase";
import { createFirestoreConverter } from "./converters";

export type UserCollectionName =
  | "metrics"
  | "metricFields"
  | "metricEntries"
  | "goalVersions"
  | "dashboards"
  | "dashboardWidgets"
  | "dimensions"
  | "budgetVersions"
  | "appSettings";

export type CollectionMap = {
  metrics: Metric;
  metricFields: MetricField;
  metricEntries: MetricEntry;
  goalVersions: GoalVersion;
  dashboards: Dashboard;
  dashboardWidgets: DashboardWidget;
  dimensions: Dimension;
  budgetVersions: BudgetVersion;
  appSettings: AppSettings;
};

export function userCollectionPath(userId: string, collectionName: UserCollectionName): string {
  return `users/${userId}/${collectionName}`;
}

export function userDocumentPath(userId: string, collectionName: UserCollectionName, documentId: string): string {
  return `${userCollectionPath(userId, collectionName)}/${documentId}`;
}

export function getUserCollection<K extends UserCollectionName>(
  userId: string,
  collectionName: K
): CollectionReference<CollectionMap[K]> | null {
  const client = getFirebaseClient();

  if (!client) {
    return null;
  }

  return collection(client.db, userCollectionPath(userId, collectionName)).withConverter(
    createFirestoreConverter<CollectionMap[K]>()
  );
}

export function getUserDocument<K extends UserCollectionName>(
  userId: string,
  collectionName: K,
  documentId: string
): DocumentReference<CollectionMap[K]> | null {
  const client = getFirebaseClient();

  if (!client) {
    return null;
  }

  return doc(client.db, userDocumentPath(userId, collectionName, documentId)).withConverter(
    createFirestoreConverter<CollectionMap[K]>()
  );
}
