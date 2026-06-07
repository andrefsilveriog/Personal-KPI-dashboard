import type { WidgetData } from "./dashboardEngine";

type KPIWidgetProps = {
  data: WidgetData;
};

function formatValue(value: unknown): string {
  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
  }

  if (value === null || value === undefined) {
    return "-";
  }

  return String(value);
}

export function KPIWidget({ data }: KPIWidgetProps) {
  return (
    <div className="kpi-widget">
      {data.displayOptions.showActual && <strong>{formatValue(data.ruleResult?.actualValue)}</strong>}
      {data.displayOptions.showStatus && <span>{data.ruleResult?.status ?? "noActivity"}</span>}
    </div>
  );
}
