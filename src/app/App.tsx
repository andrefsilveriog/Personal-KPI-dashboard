import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { onAuthStateChanged, signInWithPopup, signOut, User } from "firebase/auth";
import {
  availableWeeks,
  defaultConfig,
  deleteBudgetCategory,
  HabitEntry,
  initialData,
  LifeDashboardData,
  NutritionEntry,
  saveBudgetCategory,
  SpendingEntry,
  sortSpendingByDate,
  summarizeBudgets,
  summarizeWeek,
  spendingTotal,
  toMoney,
  weekLabel,
  WorkoutEntry
} from "./lifeDashboard";
import { auth, googleProvider, isFirebaseConfigured } from "../lib/firebase";
import { loadDashboardData, replaceDashboardData } from "./lifeDashboardRepository";

const storageKey = "life-dashboard-v2";
const themeStorageKey = "life-dashboard-theme";
const today = new Date().toISOString().slice(0, 10);
const currentMonth = today.slice(0, 7);

type Tab = "dashboard" | "today" | "ledger" | "logs" | "settings";
type Theme = "light" | "dark";
type LogTarget = "workout" | "habit" | "antihistamine" | "nutrition" | "ledger";
type SyncStatus = "local" | "loading" | "saving" | "synced" | "error";

export function App() {
  const [data, setData] = useState(loadData);
  const [theme, setTheme] = useState<Theme>(loadTheme);
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [logTarget, setLogTarget] = useState<LogTarget | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(!isFirebaseConfigured);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(isFirebaseConfigured ? "loading" : "local");
  const [syncError, setSyncError] = useState("");
  const latestData = useRef(data);
  const weeks = availableWeeks(data);
  const [selectedWeek, setSelectedWeek] = useState(weeks[0] ?? 1);
  const weekly = useMemo(() => summarizeWeek(data, selectedWeek), [data, selectedWeek]);
  const budgets = useMemo(() => summarizeBudgets(data, currentMonth), [data]);

  useEffect(() => {
    latestData.current = data;
  }, [data]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(themeStorageKey, theme);
  }, [theme]);

  useEffect(() => {
    if (!auth) {
      setSyncStatus("local");
      return;
    }

    return onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      setSyncError("");
      setAuthReady(true);

      if (!nextUser) {
        setSyncStatus("local");
        return;
      }

      setSyncStatus("loading");

      try {
        const remoteData = await loadDashboardData(nextUser.uid);

        if (remoteData) {
          latestData.current = remoteData;
          setData(remoteData);
          saveLocalData(remoteData);
        } else {
          const blankData = createBlankData();
          latestData.current = blankData;
          setData(blankData);
          saveLocalData(blankData);
          await replaceDashboardData(nextUser.uid, blankData);
        }

        setSyncStatus("synced");
      } catch (error) {
        setSyncStatus("error");
        setSyncError(error instanceof Error ? error.message : "Could not load Firebase data.");
      }
    });
  }, []);

  function updateData(next: LifeDashboardData) {
    latestData.current = next;
    setData(next);
    saveLocalData(next);

    if (!user) {
      setSyncStatus(isFirebaseConfigured ? "local" : "local");
      return;
    }

    setSyncStatus("saving");
    replaceDashboardData(user.uid, next)
      .then(() => {
        setSyncError("");
        setSyncStatus("synced");
      })
      .catch((error) => {
        setSyncStatus("error");
        setSyncError(error instanceof Error ? error.message : "Could not save Firebase data.");
      });
  }

  function resetDemoData() {
    updateData(initialData);
    setSelectedWeek(availableWeeks(initialData)[0] ?? 1);
  }

  useEffect(() => {
    if (!weeks.includes(selectedWeek)) {
      setSelectedWeek(weeks[0] ?? currentIsoWeek());
    }
  }, [selectedWeek, weeks]);

  function openLogger(target: LogTarget) {
    setLogTarget(target);
  }

  async function signIn() {
    if (!auth) {
      setSyncStatus("error");
      setSyncError("Firebase config is missing. Paste the web app config into .env.local first.");
      return;
    }

    setSyncStatus("loading");
    setSyncError("");

    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      setSyncStatus("error");
      setSyncError(error instanceof Error ? error.message : "Could not sign in.");
    }
  }

  async function signOutOfFirebase() {
    if (!auth) {
      return;
    }

    await signOut(auth);
  }

  if (isFirebaseConfigured && !authReady) {
    return <LoadingScreen />;
  }

  if (isFirebaseConfigured && !user) {
    return <SignInScreen onSignIn={signIn} syncError={syncError} />;
  }

  return (
    <main className="shell">
      <div className={`app-content ${logTarget ? "is-blurred" : ""}`}>
        <header className="topbar">
          <div>
            <h1>Life Dashboard</h1>
            <p>Weekly habits, monthly budgets, fast ledger entry.</p>
          </div>
          <div className="topbar-actions">
            <AuthControls
              isConfigured={isFirebaseConfigured}
              onSignIn={signIn}
              onSignOut={signOutOfFirebase}
              status={syncStatus}
              user={user}
            />
            <button className="ghost-button" type="button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </button>
            <button className="ghost-button" type="button" onClick={resetDemoData}>
              Reset sample data
            </button>
          </div>
          {(syncError || !isFirebaseConfigured) && (
            <p className={syncError ? "sync-message is-error" : "sync-message"}>
              {syncError || "Firebase is not configured yet. Local browser storage is active."}
            </p>
          )}
        </header>

        <nav className="tabs" aria-label="Dashboard views">
          {(["dashboard", "today", "ledger", "logs", "settings"] as Tab[]).map((tab) => (
            <button
              className={activeTab === tab ? "tab is-active" : "tab"}
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </nav>

        {activeTab === "dashboard" && (
          <DashboardView
            budgets={budgets}
            data={data}
            onLogMetric={openLogger}
            selectedWeek={selectedWeek}
            setSelectedWeek={setSelectedWeek}
            weekly={weekly}
          />
        )}
        {activeTab === "today" && <TodayView data={data} updateData={updateData} />}
        {activeTab === "ledger" && <LedgerView data={data} updateData={updateData} />}
        {activeTab === "logs" && <LogsView data={data} />}
        {activeTab === "settings" && <SettingsView data={data} updateData={updateData} />}
      </div>

      {logTarget && (
        <MetricLogModal
          data={data}
          target={logTarget}
          onClose={() => setLogTarget(null)}
          updateData={updateData}
        />
      )}
    </main>
  );
}

function LoadingScreen() {
  return (
    <main className="auth-shell">
      <section className="auth-panel panel">
        <h1>Life Dashboard</h1>
        <p>Checking sign-in...</p>
      </section>
    </main>
  );
}

function SignInScreen({ onSignIn, syncError }: { onSignIn: () => void; syncError: string }) {
  return (
    <main className="auth-shell">
      <section className="auth-panel panel">
        <h1>Life Dashboard</h1>
        <p>Sign in to load your private dashboard.</p>
        {syncError && <p className="sync-message is-error">{syncError}</p>}
        <button className="primary-button" type="button" onClick={onSignIn}>
          Sign in with Google
        </button>
      </section>
    </main>
  );
}

function AuthControls({
  isConfigured,
  onSignIn,
  onSignOut,
  status,
  user
}: {
  isConfigured: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
  status: SyncStatus;
  user: User | null;
}) {
  const labelByStatus: Record<SyncStatus, string> = {
    error: "Sync issue",
    loading: "Loading",
    local: isConfigured ? "Local only" : "Local",
    saving: "Saving",
    synced: "Synced"
  };

  return (
    <div className="auth-controls">
      <span className={`sync-pill sync-${status}`}>{labelByStatus[status]}</span>
      {user ? (
        <>
          <span className="user-label">{user.displayName ?? user.email ?? "Signed in"}</span>
          <button className="ghost-button" type="button" onClick={onSignOut}>
            Sign out
          </button>
        </>
      ) : (
        <button className="ghost-button" disabled={!isConfigured} type="button" onClick={onSignIn}>
          Sign in
        </button>
      )}
    </div>
  );
}

type DashboardViewProps = {
  budgets: ReturnType<typeof summarizeBudgets>;
  data: LifeDashboardData;
  onLogMetric: (target: LogTarget) => void;
  selectedWeek: number;
  setSelectedWeek: (value: number) => void;
  weekly: ReturnType<typeof summarizeWeek>;
};

function DashboardView({
  budgets,
  data,
  onLogMetric,
  selectedWeek,
  setSelectedWeek,
  weekly
}: DashboardViewProps) {
  const weeks = availableWeeks(data);
  const overBudget = budgets.filter((budget) => budget.status === "Over").length;
  const nearBudget = budgets.filter((budget) => budget.status === "Near").length;
  const totalBudget = budgets.reduce((total, entry) => total + entry.budget, 0);
  const totalSpent = budgets.reduce((total, entry) => total + entry.spent, 0);

  return (
    <section className="dashboard-grid">
      <div className="toolbar dashboard-toolbar">
        <label>
          Week
          <select value={selectedWeek} onChange={(event) => setSelectedWeek(Number(event.target.value))}>
            {(weeks.length ? weeks : [selectedWeek]).map((week) => (
              <option key={week} value={week}>
                {weekLabel(week, data)}
              </option>
            ))}
          </select>
        </label>
        <span className="toolbar-note">Budgets: {currentMonth}</span>
      </div>

      <section className="metric-grid compact-metrics">
        <MetricCard label="Workout" value={`${weekly.workoutSessions}/${weekly.workoutTarget}`} detail={weekly.hitWorkoutTarget ? "Target hit" : "Not yet"} progress={weekly.workoutSessions / weekly.workoutTarget} tone={weekly.hitWorkoutTarget ? "good" : "warn"} onClick={() => onLogMetric("workout")} />
        <MetricCard label="Avg quality" value={weekly.averageWorkoutQuality?.toFixed(1) ?? "-"} detail={`${weekly.daysLogged} days touched`} onClick={() => onLogMetric("workout")} />
        <MetricCard label="Habit score" value={weekly.averageHabitScore.toFixed(1)} detail="Out of 5 daily" progress={weekly.averageHabitScore / 5} onClick={() => onLogMetric("habit")} />
        <MetricCard label="Antihistamine" value={`${weekly.antihistamineTaken}/${weekly.antihistamineTarget}`} detail="Daily dose" progress={weekly.antihistamineTaken / weekly.antihistamineTarget} tone={weekly.antihistamineTaken >= weekly.antihistamineTarget ? "good" : "warn"} onClick={() => onLogMetric("antihistamine")} />
        <MetricCard label="Perfect macros" value={String(weekly.perfectMacroDays)} detail={`${weekly.nutritionFullyLogged} fully logged`} progress={weekly.perfectMacroDays / 7} tone={weekly.perfectMacroDays >= 4 ? "good" : "warn"} onClick={() => onLogMetric("nutrition")} />
        <MetricCard label="Budgets" value={`${overBudget} over`} detail={`${nearBudget} near limit`} tone={overBudget ? "bad" : nearBudget ? "warn" : "good"} onClick={() => onLogMetric("ledger")} />
      </section>

      <section className="dashboard-main">
        <div className="panel">
          <h2>Weekly Breakdown</h2>
          <div className="summary-list">
            <SummaryRow label="Brushed twice" target={7} value={weekly.brushedTwice} />
            <SummaryRow label="Brushed once only" target={7} value={weekly.brushedOnce} />
            <SummaryRow label="Antihistamine" target={weekly.antihistamineTarget} value={weekly.antihistamineTaken} />
            <SummaryRow label="Flossed" target={7} value={weekly.flossed} />
            <SummaryRow label="Bedroom tidy" target={7} value={weekly.bedroomTidy} />
            <SummaryRow label="Desk tidy" target={7} value={weekly.deskTidy} />
            <SummaryRow label="Clothes away" target={7} value={weekly.clothesAway} />
            <SummaryRow label="Carbs goal hit" target={7} value={weekly.carbsHit} />
            <SummaryRow label="Protein goal hit" target={7} value={weekly.proteinHit} />
            <SummaryRow label="Fat goal hit" target={7} value={weekly.fatHit} />
          </div>
        </div>

        <div className="panel budget-panel">
          <div className="panel-heading">
            <h2>Monthly Budgets</h2>
            <strong>{toMoney(totalSpent)} / {toMoney(totalBudget)}</strong>
          </div>
          <BudgetBars budgets={budgets} />
        </div>
      </section>
    </section>
  );
}

type SpendingDraft = {
  date: string;
  category: string;
  amount: number | "";
  payment: "credit" | "cash";
  notes: string;
};

function TodayView({ data, updateData }: { data: LifeDashboardData; updateData: (data: LifeDashboardData) => void }) {
  const [workout, setWorkout] = useState<WorkoutEntry>(() => data.workouts.find((entry) => entry.date === today) ?? { date: today, went: "No", quality: "", notes: "" });
  const [habit, setHabit] = useState<HabitEntry>(() => data.habits.find((entry) => entry.date === today) ?? {
    date: today,
    antihistamine: "No",
    brushed: "Yes",
    flossed: "Yes",
    bedroomTidy: "Yes",
    deskTidy: "Yes",
    clothesAway: "Yes"
  });
  const [nutrition, setNutrition] = useState<NutritionEntry>(() => data.nutrition.find((entry) => entry.date === today) ?? { date: today, logged: "Yes", carbs: "", protein: "", fat: "" });

  function saveWorkout(event: FormEvent) {
    event.preventDefault();
    updateData({ ...data, workouts: upsertByDate(data.workouts, workout) });
  }

  function saveHabit(event: FormEvent) {
    event.preventDefault();
    updateData({ ...data, habits: upsertByDate(data.habits, habit) });
  }

  function saveNutrition(event: FormEvent) {
    event.preventDefault();
    updateData({ ...data, nutrition: upsertByDate(data.nutrition, nutrition) });
  }

  return (
    <section className="form-grid">
      <EntryPanel title="Workout" onSubmit={saveWorkout}>
        <Field label="Date"><input type="date" value={workout.date} onChange={(event) => setWorkout({ ...workout, date: event.target.value })} /></Field>
        <Field label="Went"><SelectYesNo value={workout.went} onChange={(value) => setWorkout({ ...workout, went: value })} /></Field>
        <Field label="Quality"><input max="10" min="1" type="number" value={workout.quality} onChange={(event) => setWorkout({ ...workout, quality: readNumber(event.target.value) })} /></Field>
        <Field label="Notes"><input value={workout.notes} onChange={(event) => setWorkout({ ...workout, notes: event.target.value })} /></Field>
      </EntryPanel>

      <EntryPanel title="Daily Habits" onSubmit={saveHabit}>
        <Field label="Date"><input type="date" value={habit.date} onChange={(event) => setHabit({ ...habit, date: event.target.value })} /></Field>
        <Field label="Antihistamine"><SelectYesNo value={habit.antihistamine} onChange={(value) => setHabit({ ...habit, antihistamine: value })} /></Field>
        <Field label="Brushed"><select value={habit.brushed} onChange={(event) => setHabit({ ...habit, brushed: event.target.value as HabitEntry["brushed"] })}><option>Yes</option><option>Once</option><option>No</option></select></Field>
        <Field label="Flossed"><SelectYesNo value={habit.flossed} onChange={(value) => setHabit({ ...habit, flossed: value })} /></Field>
        <Field label="Bedroom"><SelectYesNo value={habit.bedroomTidy} onChange={(value) => setHabit({ ...habit, bedroomTidy: value })} /></Field>
        <Field label="Desk"><SelectYesNo value={habit.deskTidy} onChange={(value) => setHabit({ ...habit, deskTidy: value })} /></Field>
        <Field label="Clothes"><SelectYesNo value={habit.clothesAway} onChange={(value) => setHabit({ ...habit, clothesAway: value })} /></Field>
      </EntryPanel>

      <EntryPanel title="Nutrition" onSubmit={saveNutrition}>
        <Field label="Date"><input type="date" value={nutrition.date} onChange={(event) => setNutrition({ ...nutrition, date: event.target.value })} /></Field>
        <Field label="Logged"><select value={nutrition.logged} onChange={(event) => setNutrition({ ...nutrition, logged: event.target.value as NutritionEntry["logged"] })}><option>Yes</option><option>Partial</option><option>No</option></select></Field>
        <Field label="Carbs"><input type="number" value={nutrition.carbs} onChange={(event) => setNutrition({ ...nutrition, carbs: readNumber(event.target.value) })} /></Field>
        <Field label="Protein"><input type="number" value={nutrition.protein} onChange={(event) => setNutrition({ ...nutrition, protein: readNumber(event.target.value) })} /></Field>
        <Field label="Fat"><input type="number" value={nutrition.fat} onChange={(event) => setNutrition({ ...nutrition, fat: readNumber(event.target.value) })} /></Field>
      </EntryPanel>

    </section>
  );
}

function LedgerView({ data, updateData }: { data: LifeDashboardData; updateData: (data: LifeDashboardData) => void }) {
  const [spending, setSpending] = useState<SpendingDraft>({
    date: today,
    category: Object.keys(data.config.budgets)[0] ?? "Others",
    amount: "",
    payment: "credit",
    notes: ""
  });

  function saveSpending(event: FormEvent) {
    event.preventDefault();
    if (spending.amount === "") {
      return;
    }

    const entry: SpendingEntry = {
      id: crypto.randomUUID(),
      date: spending.date,
      category: spending.category,
      credit: spending.payment === "credit" ? spending.amount : "",
      cash: spending.payment === "cash" ? spending.amount : "",
      notes: spending.notes
    };

    updateData({ ...data, spending: [entry, ...data.spending] });
    setSpending({ ...spending, amount: "", notes: "" });
  }

  function updateEntry(next: SpendingEntry) {
    updateData({
      ...data,
      spending: data.spending.map((entry) => (entry.id === next.id ? next : entry))
    });
  }

  function deleteEntry(id: string) {
    updateData({
      ...data,
      spending: data.spending.filter((entry) => entry.id !== id)
    });
  }

  return (
    <section className="ledger-layout">
      <form className="panel ledger-panel" onSubmit={saveSpending}>
        <div className="panel-heading">
          <h2>Ledger</h2>
          <button className="primary-button" type="submit">Add purchase</button>
        </div>
        <div className="ledger-form">
          <Field label="Date"><input type="date" value={spending.date} onChange={(event) => setSpending({ ...spending, date: event.target.value })} /></Field>
          <Field label="Category"><CategorySelect categories={Object.keys(data.config.budgets)} value={spending.category} onChange={(category) => setSpending({ ...spending, category })} /></Field>
          <Field label="Amount"><input autoFocus min="0" step="0.01" type="number" value={spending.amount} onChange={(event) => setSpending({ ...spending, amount: readNumber(event.target.value) })} /></Field>
          <Field label="Payment"><select value={spending.payment} onChange={(event) => setSpending({ ...spending, payment: event.target.value as SpendingDraft["payment"] })}><option value="credit">Credit</option><option value="cash">Cash</option></select></Field>
          <Field label="Notes"><input value={spending.notes} onChange={(event) => setSpending({ ...spending, notes: event.target.value })} /></Field>
        </div>
      </form>

      <div className="panel">
        <div className="panel-heading">
          <h2>Entries</h2>
          <strong>{data.spending.length} purchases</strong>
        </div>
        <div className="ledger-entry-list">
          {sortSpendingByDate(data.spending).map((entry) => (
            <LedgerEntryRow
              categories={Object.keys(data.config.budgets)}
              entry={entry}
              key={entry.id}
              onDelete={() => deleteEntry(entry.id)}
              onSave={updateEntry}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function LogsView({ data }: { data: LifeDashboardData }) {
  return (
    <section className="view-stack">
      <LogTable title="Workout Log" headers={["Date", "Went", "Quality", "Notes"]} rows={data.workouts.map((entry) => [entry.date, entry.went, entry.quality || "-", entry.notes])} />
      <LogTable title="Nutrition Log" headers={["Date", "Logged", "Carbs", "Protein", "Fat"]} rows={data.nutrition.map((entry) => [entry.date, entry.logged, entry.carbs || "-", entry.protein || "-", entry.fat || "-"])} />
    </section>
  );
}

function SettingsView({ data, updateData }: { data: LifeDashboardData; updateData: (data: LifeDashboardData) => void }) {
  const [newCategory, setNewCategory] = useState("");
  const [newBudget, setNewBudget] = useState<number | "">("");

  function addCategory(event: FormEvent) {
    event.preventDefault();

    if (!newCategory.trim() || newBudget === "" || Object.hasOwn(data.config.budgets, newCategory.trim())) {
      return;
    }

    updateData(saveBudgetCategory(data, "__new__", newCategory, newBudget));
    setNewCategory("");
    setNewBudget("");
  }

  return (
    <section className="settings-layout">
      <div className="panel settings-panel">
        <h2>Targets</h2>
        <div className="settings-grid">
          <Field label="Workout days/week">
            <input type="number" value={data.config.workoutTarget} onChange={(event) => updateData({ ...data, config: { ...data.config, workoutTarget: Number(event.target.value) } })} />
          </Field>
          <Field label="Carbs goal">
            <input type="number" value={data.config.macroGoals.carbs} onChange={(event) => updateData({ ...data, config: { ...data.config, macroGoals: { ...data.config.macroGoals, carbs: Number(event.target.value) } } })} />
          </Field>
          <Field label="Protein goal">
            <input type="number" value={data.config.macroGoals.protein} onChange={(event) => updateData({ ...data, config: { ...data.config, macroGoals: { ...data.config.macroGoals, protein: Number(event.target.value) } } })} />
          </Field>
          <Field label="Fat goal">
            <input type="number" value={data.config.macroGoals.fat} onChange={(event) => updateData({ ...data, config: { ...data.config, macroGoals: { ...data.config.macroGoals, fat: Number(event.target.value) } } })} />
          </Field>
        </div>
      </div>

      <div className="panel settings-panel">
        <h2>Budget Categories</h2>
        <div className="budget-category-editor">
          {Object.entries(data.config.budgets).map(([category, budget]) => (
            <BudgetCategoryRow
              budget={budget}
              category={category}
              existingCategories={Object.keys(data.config.budgets)}
              key={category}
              onDelete={() => updateData(deleteBudgetCategory(data, category))}
              onSave={(nextCategory, nextBudget) => updateData(saveBudgetCategory(data, category, nextCategory, nextBudget))}
            />
          ))}
        </div>

        <form className="add-category-row" onSubmit={addCategory}>
          <Field label="New category">
            <input value={newCategory} onChange={(event) => setNewCategory(event.target.value)} />
          </Field>
          <Field label="Budget">
            <input min="0" step="0.01" type="number" value={newBudget} onChange={(event) => setNewBudget(readNumber(event.target.value))} />
          </Field>
          <button className="primary-button" type="submit">Add</button>
        </form>
      </div>
    </section>
  );
}

function BudgetCategoryRow({
  budget,
  category,
  existingCategories,
  onDelete,
  onSave
}: {
  budget: number;
  category: string;
  existingCategories: string[];
  onDelete: () => void;
  onSave: (category: string, budget: number) => void;
}) {
  const [draftCategory, setDraftCategory] = useState(category);
  const [draftBudget, setDraftBudget] = useState<number | "">(budget);
  const trimmedCategory = draftCategory.trim();
  const isDuplicate = trimmedCategory !== category && existingCategories.includes(trimmedCategory);
  const canSave = Boolean(trimmedCategory) && draftBudget !== "" && !isDuplicate;

  return (
    <form className="budget-category-row" onSubmit={(event) => {
      event.preventDefault();
      if (canSave) {
        onSave(trimmedCategory, draftBudget);
      }
    }}>
      <input aria-label={`${category} category name`} value={draftCategory} onChange={(event) => setDraftCategory(event.target.value)} />
      <input aria-label={`${category} budget`} min="0" step="0.01" type="number" value={draftBudget} onChange={(event) => setDraftBudget(readNumber(event.target.value))} />
      <button className="secondary-button" disabled={!canSave} type="submit">Save</button>
      <button className="danger-button" type="button" onClick={onDelete}>Delete</button>
      {isDuplicate && <p className="field-error">Already exists</p>}
    </form>
  );
}

function MetricLogModal({
  data,
  onClose,
  target,
  updateData
}: {
  data: LifeDashboardData;
  onClose: () => void;
  target: LogTarget;
  updateData: (data: LifeDashboardData) => void;
}) {
  const modalRef = useRef<HTMLDivElement>(null);
  const currentHabit = data.habits.find((entry) => entry.date === today);
  const [workout, setWorkout] = useState<WorkoutEntry>(() => data.workouts.find((entry) => entry.date === today) ?? { date: today, went: "No", quality: "", notes: "" });
  const [habit, setHabit] = useState<HabitEntry>(() => currentHabit ?? defaultHabitEntry());
  const [nutrition, setNutrition] = useState<NutritionEntry>(() => data.nutrition.find((entry) => entry.date === today) ?? { date: today, logged: "Yes", carbs: "", protein: "", fat: "" });
  const [spending, setSpending] = useState<SpendingDraft>({
    date: today,
    category: Object.keys(data.config.budgets)[0] ?? "Others",
    amount: "",
    payment: "credit",
    notes: ""
  });

  useEffect(() => {
    const firstControl = modalRef.current?.querySelector("input, select, button");

    if (firstControl instanceof HTMLElement) {
      firstControl.focus();
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  function saveWorkout(event: FormEvent) {
    event.preventDefault();
    updateData({ ...data, workouts: upsertByDate(data.workouts, workout) });
    onClose();
  }

  function saveHabit(event: FormEvent) {
    event.preventDefault();
    updateData({ ...data, habits: upsertByDate(data.habits, habit) });
    onClose();
  }

  function saveAntihistamine(event: FormEvent) {
    event.preventDefault();
    updateData({ ...data, habits: upsertByDate(data.habits, habit) });
    onClose();
  }

  function saveNutrition(event: FormEvent) {
    event.preventDefault();
    updateData({ ...data, nutrition: upsertByDate(data.nutrition, nutrition) });
    onClose();
  }

  function saveSpending(event: FormEvent) {
    event.preventDefault();
    if (spending.amount === "") {
      return;
    }

    const entry: SpendingEntry = {
      id: crypto.randomUUID(),
      date: spending.date,
      category: spending.category,
      credit: spending.payment === "credit" ? spending.amount : "",
      cash: spending.payment === "cash" ? spending.amount : "",
      notes: spending.notes
    };

    updateData({ ...data, spending: [entry, ...data.spending] });
    onClose();
  }

  return (
    <div className="modal-layer" role="presentation" onMouseDown={onClose}>
      <div
        aria-modal="true"
        className="metric-modal panel"
        ref={modalRef}
        role="dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-heading">
          <div>
            <h2>{modalTitle(target)}</h2>
            <p>{today}</p>
          </div>
          <button aria-label="Close popup" className="ghost-button icon-button" type="button" onClick={onClose}>
            X
          </button>
        </div>

        {target === "workout" && (
          <form className="modal-form" onSubmit={saveWorkout}>
            <Field label="Date"><input type="date" value={workout.date} onChange={(event) => setWorkout({ ...workout, date: event.target.value })} /></Field>
            <Field label="Went"><SelectYesNo value={workout.went} onChange={(value) => setWorkout({ ...workout, went: value })} /></Field>
            <Field label="Quality"><input max="10" min="1" type="number" value={workout.quality} onChange={(event) => setWorkout({ ...workout, quality: readNumber(event.target.value) })} /></Field>
            <Field label="Notes"><input value={workout.notes} onChange={(event) => setWorkout({ ...workout, notes: event.target.value })} /></Field>
            <button className="primary-button" type="submit">Save workout</button>
          </form>
        )}

        {target === "habit" && (
          <form className="modal-form" onSubmit={saveHabit}>
            <Field label="Date"><input type="date" value={habit.date} onChange={(event) => setHabit({ ...habit, date: event.target.value })} /></Field>
            <Field label="Brushed"><select value={habit.brushed} onChange={(event) => setHabit({ ...habit, brushed: event.target.value as HabitEntry["brushed"] })}><option>Yes</option><option>Once</option><option>No</option></select></Field>
            <Field label="Flossed"><SelectYesNo value={habit.flossed} onChange={(value) => setHabit({ ...habit, flossed: value })} /></Field>
            <Field label="Bedroom"><SelectYesNo value={habit.bedroomTidy} onChange={(value) => setHabit({ ...habit, bedroomTidy: value })} /></Field>
            <Field label="Desk"><SelectYesNo value={habit.deskTidy} onChange={(value) => setHabit({ ...habit, deskTidy: value })} /></Field>
            <Field label="Clothes"><SelectYesNo value={habit.clothesAway} onChange={(value) => setHabit({ ...habit, clothesAway: value })} /></Field>
            <button className="primary-button" type="submit">Save habits</button>
          </form>
        )}

        {target === "antihistamine" && (
          <form className="modal-form" onSubmit={saveAntihistamine}>
            <Field label="Date"><input type="date" value={habit.date} onChange={(event) => setHabit({ ...habit, date: event.target.value })} /></Field>
            <Field label="Antihistamine"><SelectYesNo value={habit.antihistamine} onChange={(value) => setHabit({ ...habit, antihistamine: value })} /></Field>
            <button className="primary-button" type="submit">Save dose</button>
          </form>
        )}

        {target === "nutrition" && (
          <form className="modal-form" onSubmit={saveNutrition}>
            <Field label="Date"><input type="date" value={nutrition.date} onChange={(event) => setNutrition({ ...nutrition, date: event.target.value })} /></Field>
            <Field label="Logged"><select value={nutrition.logged} onChange={(event) => setNutrition({ ...nutrition, logged: event.target.value as NutritionEntry["logged"] })}><option>Yes</option><option>Partial</option><option>No</option></select></Field>
            <Field label="Carbs"><input type="number" value={nutrition.carbs} onChange={(event) => setNutrition({ ...nutrition, carbs: readNumber(event.target.value) })} /></Field>
            <Field label="Protein"><input type="number" value={nutrition.protein} onChange={(event) => setNutrition({ ...nutrition, protein: readNumber(event.target.value) })} /></Field>
            <Field label="Fat"><input type="number" value={nutrition.fat} onChange={(event) => setNutrition({ ...nutrition, fat: readNumber(event.target.value) })} /></Field>
            <button className="primary-button" type="submit">Save macros</button>
          </form>
        )}

        {target === "ledger" && (
          <form className="modal-form" onSubmit={saveSpending}>
            <Field label="Date"><input type="date" value={spending.date} onChange={(event) => setSpending({ ...spending, date: event.target.value })} /></Field>
            <Field label="Category"><CategorySelect categories={Object.keys(data.config.budgets)} value={spending.category} onChange={(category) => setSpending({ ...spending, category })} /></Field>
            <Field label="Amount"><input min="0" step="0.01" type="number" value={spending.amount} onChange={(event) => setSpending({ ...spending, amount: readNumber(event.target.value) })} /></Field>
            <Field label="Payment"><select value={spending.payment} onChange={(event) => setSpending({ ...spending, payment: event.target.value as SpendingDraft["payment"] })}><option value="credit">Credit</option><option value="cash">Cash</option></select></Field>
            <Field label="Notes"><input value={spending.notes} onChange={(event) => setSpending({ ...spending, notes: event.target.value })} /></Field>
            <button className="primary-button" disabled={spending.amount === ""} type="submit">Add purchase</button>
          </form>
        )}
      </div>
    </div>
  );
}

function defaultHabitEntry(): HabitEntry {
  return {
    date: today,
    antihistamine: "No",
    brushed: "Yes",
    flossed: "Yes",
    bedroomTidy: "Yes",
    deskTidy: "Yes",
    clothesAway: "Yes"
  };
}

function modalTitle(target: LogTarget) {
  const titles: Record<LogTarget, string> = {
    antihistamine: "Log Antihistamine",
    habit: "Log Habit Score",
    ledger: "Log Budget Spend",
    nutrition: "Log Perfect Macros",
    workout: "Log Workout"
  };

  return titles[target];
}

function MetricCard({ detail, label, onClick, progress, tone, value }: { detail: string; label: string; onClick?: () => void; progress?: number; tone?: "good" | "warn" | "bad"; value: string }) {
  return (
    <button aria-label={`Log ${label.toLowerCase()} for today`} className={`metric-card ${tone ? `is-${tone}` : ""}`} type="button" onClick={onClick}>
      <span>{label}</span>
      <strong>{value}</strong>
      {typeof progress === "number" && <ProgressBar value={progress} tone={tone} />}
      <p>{detail}</p>
    </button>
  );
}

function SummaryRow({ label, target, value }: { label: string; target?: number; value: number }) {
  return (
    <div className="summary-row">
      <span>{label}</span>
      <strong>{target ? `${value}/${target}` : value}</strong>
    </div>
  );
}

function BudgetBars({ budgets }: { budgets: ReturnType<typeof summarizeBudgets> }) {
  return (
    <div className="budget-bars">
      {budgets.map((entry) => (
        <div className="budget-row" key={entry.category}>
          <div className="budget-label">
            <strong>{entry.category}</strong>
            <span>{toMoney(entry.spent)} / {toMoney(entry.budget)}</span>
          </div>
          <ProgressBar value={entry.used} tone={entry.status === "Over" ? "bad" : entry.status === "Near" ? "warn" : "good"} />
          <span className={`status status-${entry.status.toLowerCase()}`}>{Math.round(entry.used * 100)}%</span>
        </div>
      ))}
    </div>
  );
}

function LedgerEntryRow({
  categories,
  entry,
  onDelete,
  onSave
}: {
  categories: string[];
  entry: SpendingEntry;
  onDelete: () => void;
  onSave: (entry: SpendingEntry) => void;
}) {
  const payment = entry.credit !== "" ? "credit" : "cash";
  const [draft, setDraft] = useState<SpendingDraft>({
    date: entry.date,
    category: entry.category,
    amount: spendingTotal(entry),
    payment,
    notes: entry.notes
  });
  const canSave = draft.amount !== "";

  function saveEntry(event: FormEvent) {
    event.preventDefault();
    if (draft.amount === "") {
      return;
    }

    onSave({
      id: entry.id,
      date: draft.date,
      category: draft.category,
      credit: draft.payment === "credit" ? draft.amount : "",
      cash: draft.payment === "cash" ? draft.amount : "",
      notes: draft.notes
    });
  }

  return (
    <form className="ledger-entry-row" onSubmit={saveEntry}>
      <input aria-label="Purchase date" type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} />
      <CategorySelect categories={categories} value={draft.category} onChange={(category) => setDraft({ ...draft, category })} />
      <input aria-label="Purchase amount" min="0" step="0.01" type="number" value={draft.amount} onChange={(event) => setDraft({ ...draft, amount: readNumber(event.target.value) })} />
      <select aria-label="Payment method" value={draft.payment} onChange={(event) => setDraft({ ...draft, payment: event.target.value as SpendingDraft["payment"] })}>
        <option value="credit">Credit</option>
        <option value="cash">Cash</option>
      </select>
      <input aria-label="Purchase notes" value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} />
      <button className="secondary-button" disabled={!canSave} type="submit">Save</button>
      <button className="danger-button" type="button" onClick={onDelete}>Delete</button>
    </form>
  );
}

function CategorySelect({
  categories,
  onChange,
  value
}: {
  categories: string[];
  onChange: (category: string) => void;
  value: string;
}) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)}>
      {categories.includes(value) ? null : <option>{value}</option>}
      {categories.map((category) => (
        <option key={category}>{category}</option>
      ))}
    </select>
  );
}

function ProgressBar({ tone, value }: { tone?: "good" | "warn" | "bad"; value: number }) {
  return (
    <div className="progress-track" aria-label={`${Math.round(value * 100)} percent`}>
      <div className={`progress-fill ${tone ? `is-${tone}` : ""}`} style={{ width: `${Math.min(Math.max(value, 0), 1.25) * 100}%` }} />
    </div>
  );
}

function EntryPanel({ children, onSubmit, title }: { children: ReactNode; onSubmit: (event: FormEvent) => void; title: string }) {
  return (
    <form className="panel entry-panel" onSubmit={onSubmit}>
      <h2>{title}</h2>
      {children}
      <button className="primary-button" type="submit">Save</button>
    </form>
  );
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function SelectYesNo({ onChange, value }: { onChange: (value: "Yes" | "No") => void; value: "Yes" | "No" }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value as "Yes" | "No")}>
      <option>Yes</option>
      <option>No</option>
    </select>
  );
}

function LogTable({ headers, rows, title }: { headers: string[]; rows: Array<Array<number | string>>; title: string }) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      <div className="table-wrap">
        <table>
          <thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead>
          <tbody>{rows.map((row, index) => <tr key={`${title}-${index}`}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </section>
  );
}

function upsertByDate<T extends { date: string }>(entries: T[], next: T) {
  const exists = entries.some((entry) => entry.date === next.date);
  return exists ? entries.map((entry) => (entry.date === next.date ? next : entry)) : [next, ...entries];
}

function readNumber(value: string) {
  return value === "" ? "" : Number(value);
}

function saveLocalData(data: LifeDashboardData) {
  localStorage.setItem(storageKey, JSON.stringify(data));
}

function createBlankData(): LifeDashboardData {
  return {
    config: defaultConfig,
    workouts: [],
    habits: [],
    nutrition: [],
    spending: []
  };
}

function currentIsoWeek() {
  return availableWeeks({
    ...createBlankData(),
    workouts: [{ date: today, went: "No", quality: "", notes: "" }]
  })[0] ?? 1;
}

function loadData(): LifeDashboardData {
  const saved = localStorage.getItem(storageKey);
  if (!saved) {
    return initialData;
  }

  try {
    const parsed = JSON.parse(saved) as LifeDashboardData;
    return {
      ...initialData,
      ...parsed,
      habits: (parsed.habits ?? initialData.habits).map((entry) => ({
        ...entry,
        antihistamine: entry.antihistamine ?? "No"
      })),
      config: {
        ...defaultConfig,
        ...parsed.config,
        macroGoals: { ...defaultConfig.macroGoals, ...parsed.config?.macroGoals },
        budgets: { ...defaultConfig.budgets, ...parsed.config?.budgets }
      }
    };
  } catch {
    return initialData;
  }
}

function loadTheme(): Theme {
  const saved = localStorage.getItem(themeStorageKey);
  return saved === "dark" ? "dark" : "light";
}
