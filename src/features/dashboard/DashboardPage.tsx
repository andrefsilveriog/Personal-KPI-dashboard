import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { format } from "date-fns";
import GridLayout, { WidthProvider, type Layout } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import type { Dashboard, DashboardType, DashboardWidget } from "../../types/kpi";
import { useAuth } from "../../lib/firebase/useAuth";
import { useKpiData } from "../entries/useKpiData";
import { computeWidgetData } from "./dashboardEngine";
import {
  applyDashboardLayoutPreset,
  dashboardLayoutPresets,
  mergeGridLayoutIntoWidgets,
  widgetsToGridLayout,
  type DashboardLayoutPreset,
  type GridLayoutItem
} from "./dashboardLayouts";
import { DashboardWidgetRenderer } from "./DashboardWidgetRenderer";
import {
  deleteDashboardWidget,
  duplicateDashboardWidget,
  saveDashboard,
  saveDashboardWidgetLayouts,
  setDefaultDashboard,
  updateDashboardWidget
} from "./dashboardRepository";
import { WidgetConfigPanel } from "./WidgetConfigPanel";
import { resolveKioskSettings } from "../kiosk/kioskSettings";

const ResponsiveGrid = WidthProvider(GridLayout);

type DashboardPageProps = {
  dashboardType?: DashboardType;
  kioskMode?: boolean;
};

type KioskStyle = CSSProperties & {
  "--kiosk-scale"?: string;
  "--kiosk-card-padding"?: string;
  "--kiosk-value-size"?: string;
  "--kiosk-grid-gap"?: string;
};

function layoutFromReactGrid(layout: Layout[]): GridLayoutItem[] {
  return layout.map((item) => ({
    i: item.i,
    x: item.x,
    y: item.y,
    w: item.w,
    h: item.h,
    minW: item.minW,
    minH: item.minH
  }));
}

function sortWidgets(widgets: DashboardWidget[]): DashboardWidget[] {
  return [...widgets].sort((left, right) => {
    if (left.displayOrder !== right.displayOrder) {
      return left.displayOrder - right.displayOrder;
    }

    if (left.layout.y !== right.layout.y) {
      return left.layout.y - right.layout.y;
    }

    return left.layout.x - right.layout.x;
  });
}

export function DashboardPage({ dashboardType, kioskMode = false }: DashboardPageProps) {
  const { userId } = useAuth();
  const { status, metadata, entries, error, reload } = useKpiData();
  const kioskDashboards = useMemo(
    () => metadata.dashboards.filter((dashboard) => dashboard.type === "kiosk"),
    [metadata.dashboards]
  );
  const appSettings = metadata.appSettings[0];
  const kioskSettings = resolveKioskSettings(appSettings, kioskDashboards[0]?.id);
  const preferredDashboard = useMemo(() => {
    if (kioskMode) {
      const selectedKioskDashboard = metadata.dashboards.find(
        (dashboard) => dashboard.id === kioskSettings.selectedKioskDashboardId
      );

      return selectedKioskDashboard ?? kioskDashboards[0] ?? metadata.dashboards[0];
    }

    const typedDashboard = dashboardType
      ? metadata.dashboards.find((dashboard) => dashboard.type === dashboardType)
      : undefined;

    return typedDashboard ?? metadata.dashboards.find((dashboard) => dashboard.isDefault) ?? metadata.dashboards[0];
  }, [dashboardType, kioskDashboards, kioskMode, kioskSettings.selectedKioskDashboardId, metadata.dashboards]);
  const [selectedDashboardId, setSelectedDashboardId] = useState("");
  const [editingWidget, setEditingWidget] = useState<DashboardWidget | undefined>();
  const [isCreatingWidget, setIsCreatingWidget] = useState(false);
  const [isCreatingDashboard, setIsCreatingDashboard] = useState(false);
  const [newDashboardName, setNewDashboardName] = useState("");
  const [newDashboardType, setNewDashboardType] = useState<DashboardType>(dashboardType ?? "custom");
  const [renameValue, setRenameValue] = useState("");
  const [draftLayout, setDraftLayout] = useState<GridLayoutItem[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    if (kioskMode && preferredDashboard && selectedDashboardId !== preferredDashboard.id) {
      setSelectedDashboardId(preferredDashboard.id);
      return;
    }

    if (!selectedDashboardId && preferredDashboard) {
      setSelectedDashboardId(preferredDashboard.id);
    }
  }, [kioskMode, preferredDashboard, selectedDashboardId]);

  const availableDashboards = useMemo(
    () => (dashboardType ? metadata.dashboards.filter((dashboard) => dashboard.type === dashboardType) : metadata.dashboards),
    [dashboardType, metadata.dashboards]
  );
  const activeDashboard =
    availableDashboards.find((dashboard) => dashboard.id === selectedDashboardId) ?? preferredDashboard;
  const widgets = useMemo(() => {
    const dashboardWidgets = metadata.dashboardWidgets.filter((widget) => widget.dashboardId === activeDashboard?.id);
    const visibleWidgets = kioskMode
      ? dashboardWidgets.filter((widget) => widget.visible && widget.visibleInKiosk)
      : dashboardWidgets;

    return sortWidgets(visibleWidgets);
  }, [activeDashboard?.id, kioskMode, metadata.dashboardWidgets]);
  const gridLayout = useMemo(
    () => (draftLayout.length > 0 ? draftLayout : widgetsToGridLayout(widgets)),
    [draftLayout, widgets]
  );
  const pageTitle = activeDashboard?.name ?? (kioskMode ? "Kiosk" : "Dashboard");
  const selectedPeriods = useMemo(
    () => Array.from(new Set(widgets.map((widget) => widget.period))).join(", "),
    [widgets]
  );
  const kioskScaleFactor = kioskSettings.scale / 100;
  const kioskGridGap = Math.round(16 * kioskScaleFactor);
  const kioskStyle: KioskStyle = kioskMode
    ? {
        "--kiosk-scale": String(kioskScaleFactor),
        "--kiosk-card-padding": `${Math.round(18 * kioskScaleFactor)}px`,
        "--kiosk-value-size": `${Math.max(1.7, 2.3 * kioskScaleFactor)}rem`,
        "--kiosk-grid-gap": `${kioskGridGap}px`
      }
    : {};

  useEffect(() => {
    setRenameValue(activeDashboard?.name ?? "");
    setDraftLayout(widgetsToGridLayout(widgets));
  }, [activeDashboard?.id, activeDashboard?.name, widgets]);

  useEffect(() => {
    if (!kioskMode || status !== "ready") {
      return undefined;
    }

    const refreshTimer = window.setInterval(() => {
      void reload();
    }, kioskSettings.refreshIntervalSeconds * 1000);

    return () => window.clearInterval(refreshTimer);
  }, [kioskMode, kioskSettings.refreshIntervalSeconds, reload, status]);

  useEffect(() => {
    if (!kioskMode) {
      return undefined;
    }

    const clockTimer = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => window.clearInterval(clockTimer);
  }, [kioskMode]);

  async function mutateWidget(action: () => Promise<unknown>, successMessage: string) {
    try {
      await action();
      await reload();
      setMessage(successMessage);
    } catch (mutationError) {
      setMessage(mutationError instanceof Error ? mutationError.message : "Widget action failed.");
    }
  }

  async function mutateDashboard(action: () => Promise<unknown>, successMessage: string) {
    try {
      await action();
      await reload();
      setMessage(successMessage);
    } catch (mutationError) {
      setMessage(mutationError instanceof Error ? mutationError.message : "Dashboard action failed.");
    }
  }

  async function handleCreateDashboard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!userId) {
      return;
    }

    await mutateDashboard(async () => {
      const dashboard = await saveDashboard({
        userId,
        name: newDashboardName.trim() || "New dashboard",
        type: newDashboardType,
        isDefault: metadata.dashboards.length === 0,
        settings: { columns: 12 }
      });
      setSelectedDashboardId(dashboard.id);
      setNewDashboardName("");
      setIsCreatingDashboard(false);
    }, "Dashboard created.");
  }

  async function handleRenameDashboard() {
    if (!userId || !activeDashboard) {
      return;
    }

    await mutateDashboard(
      () =>
        saveDashboard({
          ...activeDashboard,
          userId,
          name: renameValue.trim() || activeDashboard.name,
          createdAt: activeDashboard.createdAt
        }),
      "Dashboard renamed."
    );
  }

  async function handleSaveLayout() {
    if (!userId) {
      return;
    }

    const widgetsWithLayout = mergeGridLayoutIntoWidgets(widgets, gridLayout).map((widget, index) => ({
      ...widget,
      displayOrder: (index + 1) * 10
    }));
    await mutateWidget(() => saveDashboardWidgetLayouts(userId, widgetsWithLayout), "Layout saved.");
  }

  async function handleApplyPreset(preset: DashboardLayoutPreset) {
    if (!userId) {
      return;
    }

    const widgetsWithLayout = applyDashboardLayoutPreset(widgets, preset);
    setDraftLayout(widgetsToGridLayout(widgetsWithLayout));
    await mutateWidget(() => saveDashboardWidgetLayouts(userId, widgetsWithLayout), "Layout preset applied.");
  }

  async function handleResetLayout() {
    await handleApplyPreset("threeColumns");
  }

  function renderShellMessage(text: string, isError = false) {
    return (
      <section className={kioskMode ? "dashboard-page kiosk-dashboard-page" : "dashboard-page"} style={kioskStyle}>
        <div className="page-heading">
          <div>
            <p className="eyebrow">{kioskMode ? "Kiosk" : "Dashboard"}</p>
            <h1>{pageTitle}</h1>
          </div>
        </div>
        <p className={isError ? "status-message error" : "status-message"}>{text}</p>
      </section>
    );
  }

  if (status === "loading") {
    return renderShellMessage("Loading dashboard.");
  }

  if (status === "configMissing") {
    return renderShellMessage("Add Firebase config before loading dashboards.", true);
  }

  if (status === "error") {
    return renderShellMessage(error ?? "Could not load dashboard.", true);
  }

  return (
    <section className={kioskMode ? "dashboard-page kiosk-dashboard-page" : "dashboard-page"} style={kioskStyle}>
      {kioskMode ? (
        <header className="kiosk-header">
          <div>
            <p className="eyebrow">Kiosk</p>
            <h1>{pageTitle}</h1>
            {selectedPeriods && <p>Periods: {selectedPeriods}</p>}
          </div>
          <div className="kiosk-clock" aria-live="polite">
            <strong>{format(currentTime, "HH:mm:ss")}</strong>
            <span>{format(currentTime, "EEEE, MMMM d, yyyy")}</span>
            <em>Refresh every {kioskSettings.refreshIntervalSeconds}s</em>
          </div>
        </header>
      ) : (
        <div className="page-heading">
          <div>
            <p className="eyebrow">Dashboard</p>
            <h1>{pageTitle}</h1>
          </div>
          <div className="dashboard-heading-actions">
            <button className="secondary-button" type="button" onClick={() => setIsCreatingDashboard((value) => !value)}>
              Create dashboard
            </button>
            <button className="primary-button" type="button" onClick={() => setIsCreatingWidget(true)}>
              Create widget
            </button>
          </div>
        </div>
      )}
      {message && <p className="status-message">{message}</p>}
      {!activeDashboard && <p className="status-message">Seed or create a dashboard before adding widgets.</p>}
      {!kioskMode && activeDashboard && (
        <div className="dashboard-builder-panel">
          <label>
            Dashboard
            <select value={activeDashboard.id} onChange={(event) => setSelectedDashboardId(event.target.value)}>
              {availableDashboards.map((dashboard) => (
                <option key={dashboard.id} value={dashboard.id}>
                  {dashboard.name} ({dashboard.type})
                </option>
              ))}
            </select>
          </label>
          <label>
            Rename
            <input value={renameValue} onChange={(event) => setRenameValue(event.target.value)} />
          </label>
          <div className="form-actions">
            <button className="secondary-button" type="button" onClick={() => void handleRenameDashboard()}>
              Save name
            </button>
            {userId && (
              <button
                className="secondary-button"
                type="button"
                disabled={activeDashboard.isDefault}
                onClick={() => void mutateDashboard(() => setDefaultDashboard(userId, metadata.dashboards, activeDashboard.id), "Default dashboard updated.")}
              >
                Make default
              </button>
            )}
          </div>
        </div>
      )}
      {!kioskMode && userId && isCreatingDashboard && (
        <form className="dashboard-builder-panel" onSubmit={handleCreateDashboard}>
          <label>
            Dashboard name
            <input value={newDashboardName} onChange={(event) => setNewDashboardName(event.target.value)} />
          </label>
          <label>
            Type
            <select value={newDashboardType} onChange={(event) => setNewDashboardType(event.target.value as DashboardType)}>
              <option value="default">Default</option>
              <option value="kiosk">Kiosk</option>
              <option value="mobile">Mobile</option>
              <option value="weeklyReview">Weekly review</option>
              <option value="monthlyReview">Monthly review</option>
              <option value="custom">Custom</option>
            </select>
          </label>
          <div className="form-actions">
            <button className="primary-button" type="submit">
              Save dashboard
            </button>
            <button className="secondary-button" type="button" onClick={() => setIsCreatingDashboard(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}
      {userId && !kioskMode && (isCreatingWidget || editingWidget) && (
        <WidgetConfigPanel
          dashboards={metadata.dashboards}
          metrics={metadata.metrics}
          userId={userId}
          widget={editingWidget}
          onCancel={() => {
            setEditingWidget(undefined);
            setIsCreatingWidget(false);
          }}
          onSaved={reload}
        />
      )}
      {!kioskMode && widgets.length > 0 && (
        <div className="layout-toolbar">
          <button className="primary-button" type="button" onClick={() => void handleSaveLayout()}>
            Save layout
          </button>
          <button className="secondary-button" type="button" onClick={() => void handleResetLayout()}>
            Reset layout
          </button>
          {dashboardLayoutPresets.map((preset) => (
            <button
              className="secondary-button compact"
              key={preset.value}
              type="button"
              onClick={() => void handleApplyPreset(preset.value)}
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}
      <ResponsiveGrid
        className="dashboard-grid-layout"
        cols={12}
        draggableHandle=".widget-drag-handle"
        isDraggable={!kioskMode}
        isResizable={!kioskMode}
        layout={gridLayout}
        rowHeight={kioskMode ? Math.round(78 * kioskScaleFactor) : 72}
        margin={kioskMode ? [kioskGridGap, kioskGridGap] : [16, 16]}
        onLayoutChange={(nextLayout) => {
          if (!kioskMode) {
            setDraftLayout(layoutFromReactGrid(nextLayout));
          }
        }}
      >
        {widgets.map((widget) => {
          const data = computeWidgetData({
            widget,
            metrics: metadata.metrics,
            fields: metadata.fields,
            entries,
            goalVersions: metadata.goalVersions,
            budgetVersions: metadata.budgetVersions,
            dimensions: metadata.dimensions
          });

          return (
            <div key={widget.id}>
              <DashboardWidgetRenderer
                data={data}
                widget={widget}
                actions={
                  userId &&
                  !kioskMode && (
                    <>
                      <span className="widget-drag-handle" aria-label="Drag widget" title="Drag widget">
                        Move
                      </span>
                      <button className="secondary-button compact" type="button" onClick={() => setEditingWidget(widget)}>
                        Edit
                      </button>
                      <button
                        className="secondary-button compact"
                        type="button"
                        onClick={() =>
                          void mutateWidget(
                            () => updateDashboardWidget(userId, { ...widget, visible: !widget.visible }),
                            "Widget visibility updated."
                          )
                        }
                      >
                        {widget.visible ? "Hide" : "Show"}
                      </button>
                      <button
                        className="secondary-button compact"
                        type="button"
                        onClick={() => void mutateWidget(() => duplicateDashboardWidget(userId, widget), "Widget duplicated.")}
                      >
                        Duplicate
                      </button>
                      <button
                        className="danger-button compact"
                        type="button"
                        onClick={() => {
                          if (window.confirm("Delete this widget?")) {
                            void mutateWidget(() => deleteDashboardWidget(userId, widget.id), "Widget deleted.");
                          }
                        }}
                      >
                        Delete
                      </button>
                    </>
                  )
                }
              />
            </div>
          );
        })}
      </ResponsiveGrid>
    </section>
  );
}
