import { addDoc, getDocs, setDoc } from "firebase/firestore";
import { format, subDays } from "date-fns";
import type { BudgetVersion, Dimension } from "../../types/kpi";
import { getUserCollection, getUserDocument } from "../../lib/firebase/collections";
import { getActiveBudgetVersion } from "./ledgerUtils";

export type SaveDimensionInput = {
  userId: string;
  dimension?: Dimension;
  name: string;
  description?: string;
  type?: string;
  color: string;
  icon: string;
  displayOrder: number;
};

export async function saveDimension(input: SaveDimensionInput): Promise<Dimension> {
  const dimension: Dimension = {
    id: input.dimension?.id ?? "",
    userId: input.userId,
    type: input.dimension?.type ?? input.type ?? "spendingCategory",
    name: input.name,
    description: input.description ?? input.dimension?.description ?? "",
    parentId: input.dimension?.parentId,
    icon: input.icon,
    color: input.color,
    archived: input.dimension?.archived ?? false,
    displayOrder: input.displayOrder
  };

  if (input.dimension) {
    const ref = getUserDocument(input.userId, "dimensions", input.dimension.id);

    if (!ref) {
      throw new Error("Firebase config is missing.");
    }

    await setDoc(ref, dimension);
    return dimension;
  }

  const collectionRef = getUserCollection(input.userId, "dimensions");

  if (!collectionRef) {
    throw new Error("Firebase config is missing.");
  }

  const ref = await addDoc(collectionRef, dimension);
  const savedDimension = { ...dimension, id: ref.id };
  await setDoc(ref, savedDimension);
  return savedDimension;
}

export async function archiveDimension(userId: string, dimension: Dimension): Promise<Dimension> {
  const archivedDimension: Dimension = {
    ...dimension,
    archived: true
  };
  const ref = getUserDocument(userId, "dimensions", dimension.id);

  if (!ref) {
    throw new Error("Firebase config is missing.");
  }

  await setDoc(ref, archivedDimension);
  return archivedDimension;
}

export async function fetchBudgetVersions(userId: string): Promise<BudgetVersion[]> {
  const collectionRef = getUserCollection(userId, "budgetVersions");

  if (!collectionRef) {
    throw new Error("Firebase config is missing.");
  }

  const snapshot = await getDocs(collectionRef);
  return snapshot.docs.map((doc) => doc.data());
}

export async function createBudgetVersion(params: {
  userId: string;
  dimensionId: string;
  amount: number;
  currency?: string;
  effectiveFrom: string;
  versionNote?: string;
  existingBudgetVersions: BudgetVersion[];
}): Promise<BudgetVersion> {
  const activeDate = new Date(`${params.effectiveFrom}T12:00:00.000`);
  const previousActive = getActiveBudgetVersion(params.existingBudgetVersions, params.dimensionId, activeDate);
  const now = new Date().toISOString();

  if (previousActive) {
    const previousRef = getUserDocument(params.userId, "budgetVersions", previousActive.id);

    if (!previousRef) {
      throw new Error("Firebase config is missing.");
    }

    await setDoc(previousRef, {
      ...previousActive,
      effectiveTo: format(subDays(activeDate, 1), "yyyy-MM-dd"),
      updatedAt: now
    });
  }

  const budgetVersion: BudgetVersion = {
    id: "",
    userId: params.userId,
    dimensionId: params.dimensionId,
    amount: params.amount,
    currency: params.currency ?? "BRL",
    period: "monthly",
    effectiveFrom: params.effectiveFrom,
    effectiveTo: null,
    versionNote: params.versionNote ?? "",
    createdAt: now,
    updatedAt: now
  };
  const collectionRef = getUserCollection(params.userId, "budgetVersions");

  if (!collectionRef) {
    throw new Error("Firebase config is missing.");
  }

  const ref = await addDoc(collectionRef, budgetVersion);
  const savedBudget = { ...budgetVersion, id: ref.id };
  await setDoc(ref, savedBudget);
  return savedBudget;
}
