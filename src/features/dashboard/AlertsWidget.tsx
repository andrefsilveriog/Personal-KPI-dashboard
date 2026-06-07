import type { WidgetData } from "./dashboardEngine";

type AlertsWidgetProps = {
  data: WidgetData;
};

export function AlertsWidget({ data }: AlertsWidgetProps) {
  const alerts = data.ledgerSummary
    ? data.ledgerSummary.categories.filter((category) => category.status === "Approaching" || category.status === "Over Budget")
    : [];

  if (alerts.length === 0 && data.ruleResult?.status !== "behind" && data.ruleResult?.status !== "missed") {
    return <p className="status-message">No alerts.</p>;
  }

  return (
    <ul className="alerts-list">
      {data.ruleResult && (data.ruleResult.status === "behind" || data.ruleResult.status === "missed") && (
        <li>{data.ruleResult.label}: {data.ruleResult.status}</li>
      )}
      {alerts.map((alert) => (
        <li key={alert.dimension.id}>
          {alert.dimension.name}: {alert.status}
        </li>
      ))}
    </ul>
  );
}
