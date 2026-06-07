import { format } from "date-fns";
import { getDoc, writeBatch } from "firebase/firestore";
import type { CollectionMap, UserCollectionName } from "../lib/firebase/collections";
import { getUserDocument } from "../lib/firebase/collections";
import { getFirebaseClient } from "../lib/firebase/firebase";
import { createStarterSeed } from "./starterSeed";

export type SeedStarterMetricsResult = {
  created: number;
  skipped: number;
};

async function seedCollection<K extends UserCollectionName>(
  userId: string,
  collectionName: K,
  items: CollectionMap[K][]
): Promise<SeedStarterMetricsResult> {
  const client = getFirebaseClient();

  if (!client) {
    throw new Error("Firebase config is missing.");
  }

  const batch = writeBatch(client.db);
  let created = 0;
  let skipped = 0;

  for (const item of items) {
    const ref = getUserDocument(userId, collectionName, item.id);

    if (!ref) {
      throw new Error("Firebase config is missing.");
    }

    const existing = await getDoc(ref);

    if (existing.exists()) {
      skipped += 1;
      continue;
    }

    batch.set(ref, item);
    created += 1;
  }

  if (created > 0) {
    await batch.commit();
  }

  return { created, skipped };
}

export async function seedStarterMetrics(userId: string, date: Date = new Date()): Promise<SeedStarterMetricsResult> {
  const now = date.toISOString();
  const today = format(date, "yyyy-MM-dd");
  const seed = createStarterSeed({ userId, now, today });

  const results = await Promise.all([
    seedCollection(userId, "metrics", seed.metrics),
    seedCollection(userId, "metricFields", seed.metricFields),
    seedCollection(userId, "goalVersions", seed.goalVersions),
    seedCollection(userId, "dimensions", seed.dimensions),
    seedCollection(userId, "budgetVersions", seed.budgetVersions),
    seedCollection(userId, "dashboards", seed.dashboards),
    seedCollection(userId, "dashboardWidgets", seed.dashboardWidgets)
  ]);

  return results.reduce<SeedStarterMetricsResult>(
    (total, result) => ({
      created: total.created + result.created,
      skipped: total.skipped + result.skipped
    }),
    { created: 0, skipped: 0 }
  );
}
