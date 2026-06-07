import { useMemo, useState } from "react";
import type { DashboardWidget } from "../../types/kpi";
import { useAuth } from "../../lib/firebase/useAuth";
import { useKpiData } from "../entries/useKpiData";
import { computeWidgetData } from "./dashboardEngine";
import { DashboardWidgetRenderer } from "./DashboardWidgetRenderer";
import { deleteDashboardWidget, duplicateDashboardWidget, updateDashboardWidget } from "./dashboardRepository";
import { WidgetConfigPanel } from "./WidgetConfigPanel";

export function DashboardPage() {
  const { userId } = useAuth();
  const { status, metadata, entries, error, reload } = useKpiData();
  const [editingWidget, setEditingWidget] = useState<DashboardWidget | undefined>();
  const [isCreating, setIsCreating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const defaultDashboard = metadata.dashboards.find((dashboard) => dashboard.isDefault) ?? metadata.dashboards[0];
  const widgets = useMemo(
    () =>
      metadata.dashboardWidgets
        .filter((widget) => widget.dashboardId === defaultDashboard?.id)
        .sort((left, right) => left.displayOrder - right.displayOrder),
    [defaultDashboard?.id, metadata.dashboardWidgets]
  );
  const pageTitle = defaultDashboard?.name ?? "Dashboard";

  async function mutateWidget(action: () => Promise<unknown>, successMessage: string) {
    try {
      await action();
      await reload();
      setMessage(successMessage);
    } catch (mutationError) {
      setMessage(mutationError instanceof Error ? mutationError.message : "Widget action failed.");
    }
  }

  if (status === "loading") {
    return (
      <section className="dashboard-page">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Dashboard</p>
            <h1>{pageTitle}</h1>
          </div>
        </div>
        <p className="status-message">Loading dashboard.</p>
      </section>
    );
  }

  if (status === "configMissing") {
    return (
      <section className="dashboard-page">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Dashboard</p>
            <h1>{pageTitle}</h1>
          </div>
        </div>
        <p className="status-message error">Add Firebase config before loading dashboards.</p>
      </section>
    );
  }

  if (status === "error") {
    return (
      <section className="dashboard-page">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Dashboard</p>
            <h1>{pageTitle}</h1>
          </div>
        </div>
        <p className="status-message error">{error}</p>
      </section>
    );
  }

  return (
    <section className="dashboard-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1>{pageTitle}</h1>
        </div>
        <button className="primary-button" type="button" onClick={() => setIsCreating(true)}>
          Create widget
        </button>
      </div>
      {message && <p className="status-message">{message}</p>}
      {!defaultDashboard && <p className="status-message">Seed or create a dashboard before adding widgets.</p>}
      {userId && (isCreating || editingWidget) && (
        <WidgetConfigPanel
          dashboards={metadata.dashboards}
          metrics={metadata.metrics}
          userId={userId}
          widget={editingWidget}
          onCancel={() => {
            setEditingWidget(undefined);
            setIsCreating(false);
          }}
          onSaved={reload}
        />
      )}
      <div className="dashboard-grid">
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
            <DashboardWidgetRenderer
              key={widget.id}
              data={data}
              widget={widget}
              actions={
                userId && (
                  <>
                    <button className="secondary-button compact" type="button" onClick={() => setEditingWidget(widget)}>Edit</button>
                    <button
                      className="secondary-button compact"
                      type="button"
                      onClick={() => void mutateWidget(() => updateDashboardWidget(userId, { ...widget, visible: !widget.visible }), "Widget visibility updated.")}
                    >
                      {widget.visible ? "Hide" : "Show"}
                    </button>
                    <button
                      className="secondary-button compact"
                      type="button"
                      onClick={() => void mutateWidget(() => updateDashboardWidget(userId, { ...widget, displayOrder: widget.displayOrder - 1 }), "Widget moved.")}
                    >
                      Up
                    </button>
                    <button
                      className="secondary-button compact"
                      type="button"
                      onClick={() => void mutateWidget(() => updateDashboardWidget(userId, { ...widget, displayOrder: widget.displayOrder + 1 }), "Widget moved.")}
                    >
                      Down
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
          );
        })}
      </div>
    </section>
  );
}
