import { useEffect, useState, type FormEvent } from "react";
import type { Aggregation, Dashboard, DashboardWidget, GoalPeriod, Metric } from "../../types/kpi";
import { saveDashboardWidget } from "./dashboardRepository";

type WidgetConfigPanelProps = {
  userId: string;
  dashboards: Dashboard[];
  metrics: Metric[];
  widget?: DashboardWidget;
  onSaved: () => Promise<void>;
  onCancel: () => void;
};

const widgetTypes = [
  { value: "kpi", label: "KPI card" },
  { value: "progress", label: "Progress card" },
  { value: "table", label: "Table card" },
  { value: "bar", label: "Bar chart" },
  { value: "budget", label: "Budget card" },
  { value: "alerts", label: "Alerts card" }
] as const;

const aggregations: Aggregation[] = [
  "countEntries",
  "countWhere",
  "sumField",
  "averageField",
  "latestValue",
  "groupedSum",
  "budgetUsedPercentage",
  "weightedScore"
];

const periods: GoalPeriod[] = ["daily", "weekly", "monthly", "custom"];

function boolFromSetting(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export function WidgetConfigPanel({ userId, dashboards, metrics, widget, onSaved, onCancel }: WidgetConfigPanelProps) {
  const defaultDashboard = dashboards.find((dashboard) => dashboard.isDefault) ?? dashboards[0];
  const [title, setTitle] = useState(widget?.title ?? "");
  const [subtitle, setSubtitle] = useState(widget?.subtitle ?? "");
  const [dashboardId, setDashboardId] = useState(widget?.dashboardId ?? defaultDashboard?.id ?? "");
  const [metricId, setMetricId] = useState(widget?.metricId ?? "");
  const [widgetType, setWidgetType] = useState(widget?.widgetType ?? "kpi");
  const [period, setPeriod] = useState<GoalPeriod>(widget?.period ?? "daily");
  const [aggregation, setAggregation] = useState<Aggregation>(widget?.aggregation ?? "countEntries");
  const [fieldKey, setFieldKey] = useState(widget?.fieldKey ?? "");
  const [displayOrder, setDisplayOrder] = useState(String(widget?.displayOrder ?? 100));
  const [visible, setVisible] = useState(widget?.visible ?? true);
  const [visibleInKiosk, setVisibleInKiosk] = useState(widget?.visibleInKiosk ?? false);
  const [showActual, setShowActual] = useState(boolFromSetting(widget?.visualizationSettings.showActual, true));
  const [showTarget, setShowTarget] = useState(boolFromSetting(widget?.visualizationSettings.showTarget, true));
  const [showPercentage, setShowPercentage] = useState(boolFromSetting(widget?.visualizationSettings.showPercentage, true));
  const [showStatus, setShowStatus] = useState(boolFromSetting(widget?.visualizationSettings.showStatus, true));
  const [showTrend, setShowTrend] = useState(boolFromSetting(widget?.visualizationSettings.showTrend, false));
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setTitle(widget?.title ?? "");
    setSubtitle(widget?.subtitle ?? "");
    setDashboardId(widget?.dashboardId ?? defaultDashboard?.id ?? "");
    setMetricId(widget?.metricId ?? "");
    setWidgetType(widget?.widgetType ?? "kpi");
    setPeriod(widget?.period ?? "daily");
    setAggregation(widget?.aggregation ?? "countEntries");
    setFieldKey(widget?.fieldKey ?? "");
    setDisplayOrder(String(widget?.displayOrder ?? 100));
    setVisible(widget?.visible ?? true);
    setVisibleInKiosk(widget?.visibleInKiosk ?? false);
    setShowActual(boolFromSetting(widget?.visualizationSettings.showActual, true));
    setShowTarget(boolFromSetting(widget?.visualizationSettings.showTarget, true));
    setShowPercentage(boolFromSetting(widget?.visualizationSettings.showPercentage, true));
    setShowStatus(boolFromSetting(widget?.visualizationSettings.showStatus, true));
    setShowTrend(boolFromSetting(widget?.visualizationSettings.showTrend, false));
  }, [defaultDashboard?.id, widget]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!dashboardId) {
      setMessage("Create or seed a dashboard before adding widgets.");
      return;
    }

    try {
      await saveDashboardWidget({
        id: widget?.id,
        userId,
        dashboardId,
        title: title.trim() || "Untitled widget",
        subtitle: subtitle.trim(),
        metricId: metricId || undefined,
        widgetType,
        period,
        aggregation,
        fieldKey: fieldKey || undefined,
        goalVersionId: widget?.goalVersionId,
        visualizationSettings: {
          ...widget?.visualizationSettings,
          showActual,
          showTarget,
          showPercentage,
          showStatus,
          showTrend
        },
        layout: widget?.layout ?? { x: 0, y: 0, w: 4, h: 3 },
        visible,
        visibleInKiosk,
        displayOrder: Number(displayOrder) || 0,
        createdAt: widget?.createdAt
      });
      await onSaved();
      onCancel();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save widget.");
    }
  }

  return (
    <form className="widget-config-panel" onSubmit={handleSubmit}>
      <h2>{widget ? "Edit widget" : "Create widget"}</h2>
      <label>
        Title
        <input value={title} onChange={(event) => setTitle(event.target.value)} />
      </label>
      <label>
        Subtitle
        <input value={subtitle} onChange={(event) => setSubtitle(event.target.value)} />
      </label>
      <label>
        Dashboard
        <select value={dashboardId} onChange={(event) => setDashboardId(event.target.value)}>
          {dashboards.map((dashboard) => (
            <option key={dashboard.id} value={dashboard.id}>
              {dashboard.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Metric
        <select value={metricId} onChange={(event) => setMetricId(event.target.value)}>
          <option value="">No metric</option>
          {metrics.map((metric) => (
            <option key={metric.id} value={metric.id}>
              {metric.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Widget type
        <select value={widgetType} onChange={(event) => setWidgetType(event.target.value)}>
          {widgetTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Period
        <select value={period} onChange={(event) => setPeriod(event.target.value as GoalPeriod)}>
          {periods.map((periodOption) => (
            <option key={periodOption} value={periodOption}>
              {periodOption}
            </option>
          ))}
        </select>
      </label>
      <label>
        Aggregation
        <select value={aggregation} onChange={(event) => setAggregation(event.target.value as Aggregation)}>
          {aggregations.map((aggregationOption) => (
            <option key={aggregationOption} value={aggregationOption}>
              {aggregationOption}
            </option>
          ))}
        </select>
      </label>
      <label>
        Field key
        <input value={fieldKey} onChange={(event) => setFieldKey(event.target.value)} />
      </label>
      <label>
        Display order
        <input type="number" value={displayOrder} onChange={(event) => setDisplayOrder(event.target.value)} />
      </label>
      <div className="toggle-grid">
        <label><input checked={visible} type="checkbox" onChange={(event) => setVisible(event.target.checked)} /> Visible</label>
        <label><input checked={visibleInKiosk} type="checkbox" onChange={(event) => setVisibleInKiosk(event.target.checked)} /> Kiosk</label>
        <label><input checked={showActual} type="checkbox" onChange={(event) => setShowActual(event.target.checked)} /> Actual</label>
        <label><input checked={showTarget} type="checkbox" onChange={(event) => setShowTarget(event.target.checked)} /> Target</label>
        <label><input checked={showPercentage} type="checkbox" onChange={(event) => setShowPercentage(event.target.checked)} /> Percentage</label>
        <label><input checked={showStatus} type="checkbox" onChange={(event) => setShowStatus(event.target.checked)} /> Status</label>
        <label><input checked={showTrend} type="checkbox" onChange={(event) => setShowTrend(event.target.checked)} /> Trend</label>
      </div>
      <div className="form-actions">
        <button className="primary-button" type="submit">Save widget</button>
        <button className="secondary-button" type="button" onClick={onCancel}>Cancel</button>
        {message && <span className="inline-status error">{message}</span>}
      </div>
    </form>
  );
}
