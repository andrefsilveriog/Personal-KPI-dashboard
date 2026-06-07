import type { WidgetData } from "./dashboardEngine";

type ProgressWidgetProps = {
  data: WidgetData;
};

export function ProgressWidget({ data }: ProgressWidgetProps) {
  const percentage = data.ruleResult?.percentageProgress ?? 0;

  return (
    <div className="progress-widget">
      {data.displayOptions.showPercentage && <strong>{percentage.toFixed(0)}%</strong>}
      <div className="progress-track">
        <span style={{ width: `${Math.max(0, Math.min(100, percentage))}%` }} />
      </div>
      <div className="widget-meta-row">
        {data.displayOptions.showActual && <span>Actual: {String(data.ruleResult?.actualValue ?? "-")}</span>}
        {data.displayOptions.showTarget && <span>Target: {String(data.ruleResult?.targetValue ?? "-")}</span>}
      </div>
    </div>
  );
}
