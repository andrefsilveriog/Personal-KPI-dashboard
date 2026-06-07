import { addDoc, deleteDoc, setDoc } from "firebase/firestore";
import type { Dashboard, DashboardWidget } from "../../types/kpi";
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

export type SaveDashboardInput = Omit<Dashboard, "id" | "userId" | "createdAt" | "updatedAt"> & {
  id?: string;
  userId: string;
  createdAt?: string;
};

export async function saveDashboard(input: SaveDashboardInput): Promise<Dashboard> {
  const now = new Date().toISOString();
  const dashboard: Dashboard = {
    ...input,
    id: input.id ?? "",
    userId: input.userId,
    createdAt: input.createdAt ?? now,
    updatedAt: now
  };

  if (input.id) {
    const ref = getUserDocument(input.userId, "dashboards", input.id);

    if (!ref) {
      throw new Error("Firebase config is missing.");
    }

    await setDoc(ref, dashboard);
    return dashboard;
  }

  const collectionRef = getUserCollection(input.userId, "dashboards");

  if (!collectionRef) {
    throw new Error("Firebase config is missing.");
  }

  const ref = await addDoc(collectionRef, dashboard);
  const savedDashboard = { ...dashboard, id: ref.id };
  await setDoc(ref, savedDashboard);
  return savedDashboard;
}

export async function updateDashboard(userId: string, dashboard: Dashboard): Promise<Dashboard> {
  return saveDashboard({
    ...dashboard,
    userId,
    createdAt: dashboard.createdAt
  });
}

export async function setDefaultDashboard(userId: string, dashboards: Dashboard[], dashboardId: string): Promise<void> {
  await Promise.all(
    dashboards.map((dashboard) =>
      updateDashboard(userId, {
        ...dashboard,
        isDefault: dashboard.id === dashboardId
      })
    )
  );
}

export async function saveDashboardWidgetLayouts(userId: string, widgets: DashboardWidget[]): Promise<void> {
  await Promise.all(widgets.map((widget) => updateDashboardWidget(userId, widget)));
}
