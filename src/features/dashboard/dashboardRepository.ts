import { addDoc, deleteDoc, setDoc } from "firebase/firestore";
import type { DashboardWidget } from "../../types/kpi";
import { getUserCollection, getUserDocument } from "../../lib/firebase/collections";

export type SaveDashboardWidgetInput = Omit<DashboardWidget, "id" | "userId" | "createdAt" | "updatedAt"> & {
  id?: string;
  userId: string;
  createdAt?: string;
};

export async function saveDashboardWidget(input: SaveDashboardWidgetInput): Promise<DashboardWidget> {
  const now = new Date().toISOString();
  const widget: DashboardWidget = {
    ...input,
    id: input.id ?? "",
    userId: input.userId,
    createdAt: now,
    updatedAt: now
  };

  if (input.id) {
    const ref = getUserDocument(input.userId, "dashboardWidgets", input.id);

    if (!ref) {
      throw new Error("Firebase config is missing.");
    }

    const updatedWidget = { ...widget, createdAt: input.createdAt ?? now };
    await setDoc(ref, updatedWidget);
    return updatedWidget;
  }

  const collectionRef = getUserCollection(input.userId, "dashboardWidgets");

  if (!collectionRef) {
    throw new Error("Firebase config is missing.");
  }

  const ref = await addDoc(collectionRef, widget);
  const savedWidget = { ...widget, id: ref.id };
  await setDoc(ref, savedWidget);
  return savedWidget;
}

export async function updateDashboardWidget(userId: string, widget: DashboardWidget): Promise<DashboardWidget> {
  const ref = getUserDocument(userId, "dashboardWidgets", widget.id);

  if (!ref) {
    throw new Error("Firebase config is missing.");
  }

  const updatedWidget = {
    ...widget,
    updatedAt: new Date().toISOString()
  };

  await setDoc(ref, updatedWidget);
  return updatedWidget;
}

export async function duplicateDashboardWidget(userId: string, widget: DashboardWidget): Promise<DashboardWidget> {
  return saveDashboardWidget({
    ...widget,
    id: undefined,
    userId,
    title: `${widget.title} Copy`,
    displayOrder: widget.displayOrder + 1
  });
}

export async function deleteDashboardWidget(userId: string, widgetId: string): Promise<void> {
  const ref = getUserDocument(userId, "dashboardWidgets", widgetId);

  if (!ref) {
    throw new Error("Firebase config is missing.");
  }

  await deleteDoc(ref);
}
