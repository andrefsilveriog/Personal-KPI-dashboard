import { formatCurrency } from "../spending/ledgerUtils";
import type { WidgetData } from "./dashboardEngine";

type BudgetWidgetProps = {
  data: WidgetData;
};

export function BudgetWidget({ data }: BudgetWidgetProps) {
  const summary = data.ledgerSummary;

  if (!summary) {
    return <p className="status-message">No budget data.</p>;
  }

  return (
    <div className="budget-widget">
      <div className="widget-meta-row">
        <span>Spent {formatCurrency(summary.totalMonthlySpent)}</span>
        <span>Budget {formatCurrency(summary.totalMonthlyBudget)}</span>
        <span>Pace {summary.expectedPace.toFixed(1)}%</span>
      </div>
      <div className="budget-category-list">
        {summary.categories.slice(0, 6).map((category) => (
          <div key={category.dimension.id}>
            <span>{category.dimension.name}</span>
            <strong>{category.percentUsed === null ? "-" : `${category.percentUsed.toFixed(1)}%`}</strong>
            <em>{category.status}</em>
          </div>
        ))}
      </div>
    </div>
  );
}
