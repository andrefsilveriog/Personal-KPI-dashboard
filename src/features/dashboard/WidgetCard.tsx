import type { ReactNode } from "react";
import type { DashboardWidget } from "../../types/kpi";

type WidgetCardProps = {
  widget: DashboardWidget;
  children: ReactNode;
  actions?: ReactNode;
};

export function WidgetCard({ widget, children, actions }: WidgetCardProps) {
  return (
    <article className={widget.visible ? "widget-card" : "widget-card hidden-widget"}>
      <header className="widget-card-header">
        <div>
          <h2>{widget.title}</h2>
          {widget.subtitle && <p>{widget.subtitle}</p>}
          {!widget.visible && <span className="hidden-label">Hidden</span>}
        </div>
        {actions && <div className="widget-actions">{actions}</div>}
      </header>
      {children}
    </article>
  );
}
