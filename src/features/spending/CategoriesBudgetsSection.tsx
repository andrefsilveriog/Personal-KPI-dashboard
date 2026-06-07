import { useMemo, useState, type FormEvent } from "react";
import type { Dimension } from "../../types/kpi";
import { useAuth } from "../../lib/firebase/useAuth";
import { todayInputValue } from "../entries/entryPeriods";
import { useKpiData } from "../entries/useKpiData";
import { archiveDimension, createBudgetVersion, saveDimension } from "./ledgerRepository";
import { calculateLedgerSummary, formatCurrency, getActiveBudgetVersion } from "./ledgerUtils";

type DimensionFormState = {
  id: string | null;
  name: string;
  color: string;
  icon: string;
  displayOrder: string;
};

type BudgetFormState = {
  dimensionId: string;
  amount: string;
  effectiveFrom: string;
  versionNote: string;
};

const emptyDimensionForm: DimensionFormState = {
  id: null,
  name: "",
  color: "#94a3b8",
  icon: "tag",
  displayOrder: "100"
};

const emptyBudgetForm: BudgetFormState = {
  dimensionId: "",
  amount: "",
  effectiveFrom: todayInputValue(),
  versionNote: ""
};

function activeDimensions(dimensions: Dimension[]): Dimension[] {
  return dimensions.filter((dimension) => !dimension.archived).sort((left, right) => left.displayOrder - right.displayOrder);
}

export function CategoriesBudgetsSection() {
  const { userId } = useAuth();
  const { status, metadata, entries, error, reload } = useKpiData();
  const [dimensionForm, setDimensionForm] = useState<DimensionFormState>(emptyDimensionForm);
  const [budgetForm, setBudgetForm] = useState<BudgetFormState>(emptyBudgetForm);
  const [message, setMessage] = useState<string | null>(null);
  const dimensions = activeDimensions(metadata.dimensions);
  const summary = useMemo(
    () =>
      calculateLedgerSummary({
        metrics: metadata.metrics,
        fields: metadata.fields,
        entries,
        dimensions,
        budgetVersions: metadata.budgetVersions
      }),
    [dimensions, entries, metadata.budgetVersions, metadata.fields, metadata.metrics]
  );

  function editDimension(dimension: Dimension) {
    setDimensionForm({
      id: dimension.id,
      name: dimension.name,
      color: dimension.color,
      icon: dimension.icon,
      displayOrder: String(dimension.displayOrder)
    });
  }

  async function handleSaveDimension(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!userId || !dimensionForm.name.trim()) {
      return;
    }

    const existingDimension = dimensionForm.id
      ? metadata.dimensions.find((dimension) => dimension.id === dimensionForm.id)
      : undefined;

    try {
      await saveDimension({
        userId,
        dimension: existingDimension,
        name: dimensionForm.name.trim(),
        color: dimensionForm.color,
        icon: dimensionForm.icon.trim() || "tag",
        displayOrder: Number(dimensionForm.displayOrder) || 0
      });
      setDimensionForm(emptyDimensionForm);
      setMessage("Category saved.");
      await reload();
    } catch (saveError) {
      setMessage(saveError instanceof Error ? saveError.message : "Could not save category.");
    }
  }

  async function handleArchiveDimension(dimension: Dimension) {
    if (!userId || !window.confirm("Archive this category?")) {
      return;
    }

    try {
      await archiveDimension(userId, dimension);
      setMessage("Category archived.");
      await reload();
    } catch (archiveError) {
      setMessage(archiveError instanceof Error ? archiveError.message : "Could not archive category.");
    }
  }

  async function handleSaveBudget(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!userId || !budgetForm.dimensionId || budgetForm.amount === "") {
      return;
    }

    try {
      await createBudgetVersion({
        userId,
        dimensionId: budgetForm.dimensionId,
        amount: Number(budgetForm.amount),
        effectiveFrom: budgetForm.effectiveFrom,
        versionNote: budgetForm.versionNote,
        existingBudgetVersions: metadata.budgetVersions
      });
      setBudgetForm(emptyBudgetForm);
      setMessage("Budget version saved.");
      await reload();
    } catch (budgetError) {
      setMessage(budgetError instanceof Error ? budgetError.message : "Could not save budget.");
    }
  }

  if (status === "loading") {
    return <p className="status-message">Loading categories and budgets.</p>;
  }

  if (status === "configMissing") {
    return <p className="status-message error">Add Firebase config before managing categories.</p>;
  }

  if (status === "error") {
    return <p className="status-message error">{error}</p>;
  }

  return (
    <section className="ledger-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Ledger</p>
          <h2>Categories & Budgets</h2>
        </div>
        {message && <span className="inline-status success">{message}</span>}
      </div>

      <div className="ledger-summary-grid">
        <div className="summary-tile">
          <span>Total spent</span>
          <strong>{formatCurrency(summary.totalMonthlySpent)}</strong>
        </div>
        <div className="summary-tile">
          <span>Total budget</span>
          <strong>{formatCurrency(summary.totalMonthlyBudget)}</strong>
        </div>
        <div className="summary-tile">
          <span>Percent used</span>
          <strong>{summary.totalPercentUsed === null ? "-" : `${summary.totalPercentUsed.toFixed(1)}%`}</strong>
        </div>
        <div className="summary-tile">
          <span>Expected pace</span>
          <strong>{summary.expectedPace.toFixed(1)}%</strong>
        </div>
      </div>

      <form className="ledger-form" onSubmit={handleSaveDimension}>
        <h3>{dimensionForm.id ? "Edit category" : "Add category"}</h3>
        <label>
          Name
          <input
            required
            value={dimensionForm.name}
            onChange={(event) => setDimensionForm((current) => ({ ...current, name: event.target.value }))}
          />
        </label>
        <label>
          Color
          <input
            type="color"
            value={dimensionForm.color}
            onChange={(event) => setDimensionForm((current) => ({ ...current, color: event.target.value }))}
          />
        </label>
        <label>
          Icon
          <input
            value={dimensionForm.icon}
            onChange={(event) => setDimensionForm((current) => ({ ...current, icon: event.target.value }))}
          />
        </label>
        <label>
          Display order
          <input
            type="number"
            value={dimensionForm.displayOrder}
            onChange={(event) => setDimensionForm((current) => ({ ...current, displayOrder: event.target.value }))}
          />
        </label>
        <div className="form-actions">
          <button className="primary-button" type="submit">
            Save category
          </button>
          {dimensionForm.id && (
            <button className="secondary-button" type="button" onClick={() => setDimensionForm(emptyDimensionForm)}>
              Cancel
            </button>
          )}
        </div>
      </form>

      <form className="ledger-form" onSubmit={handleSaveBudget}>
        <h3>Set monthly budget</h3>
        <label>
          Category
          <select
            required
            value={budgetForm.dimensionId}
            onChange={(event) => setBudgetForm((current) => ({ ...current, dimensionId: event.target.value }))}
          >
            <option value="">Choose category</option>
            {dimensions.map((dimension) => (
              <option key={dimension.id} value={dimension.id}>
                {dimension.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Amount
          <input
            min={0}
            required
            step={0.01}
            type="number"
            value={budgetForm.amount}
            onChange={(event) => setBudgetForm((current) => ({ ...current, amount: event.target.value }))}
          />
        </label>
        <label>
          Effective from
          <input
            required
            type="date"
            value={budgetForm.effectiveFrom}
            onChange={(event) => setBudgetForm((current) => ({ ...current, effectiveFrom: event.target.value }))}
          />
        </label>
        <label>
          Note
          <input
            value={budgetForm.versionNote}
            onChange={(event) => setBudgetForm((current) => ({ ...current, versionNote: event.target.value }))}
          />
        </label>
        <button className="primary-button" type="submit">
          Save budget version
        </button>
      </form>

      <div className="category-list">
        {summary.categories.map((category) => {
          const history = metadata.budgetVersions
            .filter((budget) => budget.dimensionId === category.dimension.id)
            .sort((left, right) => right.effectiveFrom.localeCompare(left.effectiveFrom));
          const currentBudget = getActiveBudgetVersion(metadata.budgetVersions, category.dimension.id, new Date());

          return (
            <article className="category-card" key={category.dimension.id}>
              <div className="category-card-header">
                <div>
                  <span className="category-swatch" style={{ background: category.dimension.color }} />
                  <h3>{category.dimension.name}</h3>
                  <p>{category.dimension.icon} · order {category.dimension.displayOrder}</p>
                </div>
                <div className="log-actions">
                  <button className="secondary-button" type="button" onClick={() => editDimension(category.dimension)}>
                    Edit
                  </button>
                  <button className="danger-button" type="button" onClick={() => void handleArchiveDimension(category.dimension)}>
                    Archive
                  </button>
                </div>
              </div>
              <dl className="log-values">
                <div>
                  <dt>Current budget</dt>
                  <dd>{currentBudget ? formatCurrency(currentBudget.amount) : "-"}</dd>
                </div>
                <div>
                  <dt>Monthly spent</dt>
                  <dd>{formatCurrency(category.spent)}</dd>
                </div>
                <div>
                  <dt>Percent used</dt>
                  <dd>{category.percentUsed === null ? "-" : `${category.percentUsed.toFixed(1)}%`}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{category.status}</dd>
                </div>
              </dl>
              <details className="budget-history">
                <summary>Budget history</summary>
                {history.length === 0 && <p>No budget versions yet.</p>}
                {history.map((budget) => (
                  <div className="history-row" key={budget.id}>
                    <span>{formatCurrency(budget.amount)}</span>
                    <span>
                      {budget.effectiveFrom} - {budget.effectiveTo ?? "current"}
                    </span>
                    <span>{budget.versionNote}</span>
                  </div>
                ))}
              </details>
            </article>
          );
        })}
      </div>
    </section>
  );
}
