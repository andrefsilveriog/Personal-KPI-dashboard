import type { DashboardWidget } from "../../types/kpi";
import type { ReactNode } from "react";
import { AlertsWidget } from "./AlertsWidget";
import { BarChartWidget } from "./BarChartWidget";
import { BudgetWidget } from "./BudgetWidget";
import type { WidgetData } from "./dashboardEngine";
import { KPIWidget } from "./KPIWidget";
import { ProgressWidget } from "./ProgressWidget";
import { TableWidget } from "./TableWidget";
import { WidgetCard } from "./WidgetCard";

type DashboardWidgetRendererProps = {
  widget: DashboardWidget;
  data: WidgetData;
  actions?: ReactNode;
};

export function DashboardWidgetRenderer({ widget, data, actions }: DashboardWidgetRendererProps) {
  function renderWidget() {
    switch (data.widgetType) {
      case "progress":
        return <ProgressWidget data={data} />;
      case "table":
        return <TableWidget data={data} />;
      case "bar":
        return <BarChartWidget data={data} />;
      case "budget":
        return <BudgetWidget data={data} />;
      case "alerts":
        return <AlertsWidget data={data} />;
      case "kpi":
      default:
        return <KPIWidget data={data} />;
    }
  }

  return (
    <WidgetCard actions={actions} widget={widget}>
      {renderWidget()}
    </WidgetCard>
  );
}
