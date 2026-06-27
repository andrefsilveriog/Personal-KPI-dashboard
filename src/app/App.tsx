import { ChangeEvent, FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { onAuthStateChanged, signInWithPopup, signOut, User } from "firebase/auth";
import { addDays, format, parseISO, startOfISOWeek } from "date-fns";
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
  weekOf,
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
  const [chromeCollapsed, setChromeCollapsed] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(!isFirebaseConfigured);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(isFirebaseConfigured ? "loading" : "local");
  const [syncError, setSyncError] = useState("");
  const [now, setNow] = useState(() => new Date());
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
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

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

  function clearAllData() {
    const confirmed = window.confirm("Clear all dashboard data? This removes logs and resets settings to defaults.");

    if (!confirmed) {
      return;
    }

    const blankData = createBlankData();
    updateData(blankData);
    setSelectedWeek(currentIsoWeek());
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
        {chromeCollapsed ? (
          <header className="topbar topbar-collapsed">
            <div className="collapsed-clock">
              <strong>{format(now, "dd/MM/yyyy")}</strong>
              <span>{format(now, "HH:mm")}</span>
            </div>
            <div className="collapsed-week">
              <span>{formatWeekRange(data, selectedWeek)}</span>
            <button
              aria-label="Show controls"
              className="ghost-button icon-button"
              title="Show controls"
              type="button"
              onClick={() => setChromeCollapsed(false)}
            >
              ▾
            </button>
            </div>
          </header>
        ) : (
          <>
            <header className="topbar">
              <div>
            <h1>Life Dashboard</h1>
              </div>
              <div className="topbar-actions">
                <AuthControls
                  isConfigured={isFirebaseConfigured}
                  onSignIn={signIn}
                  onSignOut={signOutOfFirebase}
                  status={syncStatus}
                  user={user}
                />
                <button
                  aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                  className="ghost-button icon-button"
                  title={theme === "dark" ? "Light mode" : "Dark mode"}
                  type="button"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                >
                  {theme === "dark" ? "☀" : "☾"}
                </button>
                <button className="danger-button" type="button" onClick={clearAllData}>
                  Clear all data
                </button>
                <button
                  aria-label="Hide controls"
                  className="ghost-button icon-button"
                  title="Hide controls"
                  type="button"
                  onClick={() => setChromeCollapsed(true)}
                >
                  ▴
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
          </>
        )}

        {activeTab === "dashboard" && (
          <DashboardView
            budgets={budgets}
            chromeCollapsed={chromeCollapsed}
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
  chromeCollapsed: boolean;
  data: LifeDashboardData;
  onLogMetric: (target: LogTarget) => void;
  selectedWeek: number;
  setSelectedWeek: (value: number) => void;
  weekly: ReturnType<typeof summarizeWeek>;
};

function DashboardView({
  budgets,
  chromeCollapsed,
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
  const monthlySpending = data.spending.filter((entry) => entry.date.startsWith(currentMonth));
  const creditSpent = monthlySpending.reduce((total, entry) => total + Number(entry.credit || 0), 0);
  const cashSpent = monthlySpending.reduce((total, entry) => total + Number(entry.cash || 0), 0);

  return (
    <section className="dashboard-grid">
      {!chromeCollapsed && <div className="dashboard-filterbar">
        <label>
          <span className="sr-only">Week</span>
          <select value={selectedWeek} onChange={(event) => setSelectedWeek(Number(event.target.value))}>
            {(weeks.length ? weeks : [selectedWeek]).map((week) => (
              <option key={week} value={week}>
                {weekLabel(week, data)}
              </option>
            ))}
          </select>
        </label>
        <span className="month-pill">{formatMonth(currentMonth)}</span>
      </div>}

      <section className="metric-grid compact-metrics">
        <MetricCard label="Workout" value={`${weekly.workoutSessions}/${weekly.workoutTarget}`} detail={`Avg quality ${weekly.averageWorkoutQuality?.toFixed(1) ?? "-"} · ${weekly.hitWorkoutTarget ? "Target hit" : "Not yet"}`} progress={weekly.workoutSessions / weekly.workoutTarget} tone={weekly.hitWorkoutTarget ? "good" : "warn"} onClick={() => onLogMetric("workout")} />
        <MetricCard label="Habit score" value={weekly.averageHabitScore.toFixed(1)} detail="Out of 5 daily" progress={weekly.averageHabitScore / 5} onClick={() => onLogMetric("habit")} />
        <MetricCard label="Antihistamine" value={`${weekly.antihistamineTaken}/${weekly.antihistamineTarget}`} detail="Daily dose" progress={weekly.antihistamineTaken / weekly.antihistamineTarget} tone={weekly.antihistamineTaken >= weekly.antihistamineTarget ? "good" : "warn"} onClick={() => onLogMetric("antihistamine")} />
        <MetricCard label="Perfect macros" value={String(weekly.perfectMacroDays)} detail={`${weekly.nutritionFullyLogged} fully logged`} progress={weekly.perfectMacroDays / 7} tone={weekly.perfectMacroDays >= 4 ? "good" : "warn"} onClick={() => onLogMetric("nutrition")} />
        <MetricCard label="Budgets" value={`${overBudget} over`} detail={`${nearBudget} near limit`} tone={overBudget ? "bad" : nearBudget ? "warn" : "good"} onClick={() => onLogMetric("ledger")} />
      </section>

      <section className="dashboard-main">
        <div className="panel">
          <h2>Weekly Breakdown</h2>
          <div className="summary-list">
            {buildHabitProgressRows(data, selectedWeek).map((row) => (
              <HabitProgressRow key={row.label} row={row} />
            ))}
          </div>
        </div>

        <div className="panel budget-panel">
          <div className="panel-heading">
            <h2>Monthly Budgets</h2>
            <strong>{toMoney(totalSpent)} / {toMoney(totalBudget)}</strong>
          </div>
          <div className="budget-totals">
            <span>Credit <strong>{toMoney(creditSpent)}</strong></span>
            <span>Cash <strong>{toMoney(cashSpent)}</strong></span>
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

type LedgerFilters = {
  category: string;
  dateFrom: string;
  dateTo: string;
  payment: "all" | "credit" | "cash";
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
  const [importMessage, setImportMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [isEditingEntries, setIsEditingEntries] = useState(false);
  const [entryDrafts, setEntryDrafts] = useState<Record<string, SpendingDraft>>({});
  const [filters, setFilters] = useState<LedgerFilters>({ category: "all", dateFrom: "", dateTo: "", payment: "all" });
  const [spending, setSpending] = useState<SpendingDraft>({
    date: today,
    category: Object.keys(data.config.budgets)[0] ?? "Others",
    amount: "",
    payment: "credit",
    notes: ""
  });
  const filteredSpending = sortSpendingByDate(data.spending).filter((entry) => matchesLedgerFilters(entry, filters));

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

  function deleteEntry(id: string) {
    updateData({
      ...data,
      spending: data.spending.filter((entry) => entry.id !== id)
    });
    setEntryDrafts(({ [id]: _deleted, ...remaining }) => remaining);
  }

  function startEditingEntries() {
    setEntryDrafts(Object.fromEntries(data.spending.map((entry) => [entry.id, spendingEntryToDraft(entry)])));
    setIsEditingEntries(true);
  }

  function saveEditedEntries() {
    if (Object.values(entryDrafts).some((draft) => draft.amount === "")) {
      setImportMessage({ tone: "error", text: "Every edited purchase needs an amount before saving." });
      return;
    }

    const nextSpending = data.spending.map((entry) => {
      const draft = entryDrafts[entry.id];

      if (!draft || draft.amount === "") {
        return entry;
      }

      return spendingDraftToEntry(entry.id, draft);
    });

    updateData({ ...data, spending: nextSpending });
    setImportMessage({ tone: "success", text: "Saved ledger edits." });
    setIsEditingEntries(false);
  }

  function updateEntryDraft(id: string, draft: SpendingDraft) {
    setEntryDrafts((current) => ({ ...current, [id]: draft }));
  }

  function downloadSampleCsv() {
    const categories = Object.keys(data.config.budgets);
    const sample = buildLedgerSampleCsv(categories);
    const url = URL.createObjectURL(new Blob([sample], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");

    link.href = url;
    link.download = "ledger-import-sample.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const result = parseLedgerCsv(text, Object.keys(data.config.budgets));

      if (result.errors.length) {
        setImportMessage({ tone: "error", text: result.errors.slice(0, 4).join(" ") });
        return;
      }

      if (!result.entries.length) {
        setImportMessage({ tone: "error", text: "No purchases found in the CSV." });
        return;
      }

      updateData({ ...data, spending: [...result.entries, ...data.spending] });
      setImportMessage({ tone: "success", text: `Imported ${result.entries.length} purchase${result.entries.length === 1 ? "" : "s"}.` });
    } catch {
      setImportMessage({ tone: "error", text: "Could not read that CSV file." });
    }
  }

  return (
    <section className="ledger-layout">
      <form className="panel ledger-panel" onSubmit={saveSpending}>
        <div className="panel-heading">
          <h2>Ledger</h2>
          <div className="ledger-actions">
            <button className="secondary-button" type="button" onClick={downloadSampleCsv}>Sample CSV</button>
            <label className="secondary-button file-button">
              Import CSV
              <input accept=".csv,text/csv" type="file" onChange={importCsv} />
            </label>
            <button className="primary-button" type="submit">Add purchase</button>
          </div>
        </div>
        {importMessage && <p className={`import-message is-${importMessage.tone}`}>{importMessage.text}</p>}
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
          <div className="ledger-actions">
            <strong>{filteredSpending.length} / {data.spending.length} purchases</strong>
            <button
              className={isEditingEntries ? "primary-button" : "secondary-button"}
              type="button"
              onClick={isEditingEntries ? saveEditedEntries : startEditingEntries}
            >
              {isEditingEntries ? "Save" : "Edit"}
            </button>
          </div>
        </div>
        <LedgerFilterBar
          categories={Object.keys(data.config.budgets)}
          filters={filters}
          onChange={setFilters}
        />
        <div className="ledger-entry-list">
          {filteredSpending.map((entry) => (
            <LedgerEntryRow
              categories={Object.keys(data.config.budgets)}
              draft={entryDrafts[entry.id] ?? spendingEntryToDraft(entry)}
              entry={entry}
              isEditing={isEditingEntries}
              key={entry.id}
              onDelete={() => deleteEntry(entry.id)}
              onDraftChange={(draft) => updateEntryDraft(entry.id, draft)}
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

type HabitSegmentTone = "good" | "warn" | "bad";

type HabitProgress = {
  label: string;
  segments: Array<{
    date: string;
    label: string;
    tone: HabitSegmentTone;
  }>;
};

function HabitProgressRow({ row }: { row: HabitProgress }) {
  const completed = row.segments.filter((segment) => segment.tone === "good").length;

  return (
    <div className="habit-progress-row">
      <div className="habit-progress-label">
        <span>{row.label}</span>
        <strong>{completed}/7</strong>
      </div>
      <div className="habit-segments">
        {row.segments.map((segment) => (
          <span
            aria-label={`${segment.label}: ${segment.tone}`}
            className={`habit-segment is-${segment.tone}`}
            key={segment.date}
            title={`${segment.label}: ${segment.tone}`}
          />
        ))}
      </div>
    </div>
  );
}

function buildHabitProgressRows(data: LifeDashboardData, selectedWeek: number): HabitProgress[] {
  const habitsByDate = new Map(data.habits.map((entry) => [entry.date, entry]));
  const weekDates = getSelectedWeekDates(data, selectedWeek);

  return [
    {
      label: "Brushed",
      segments: weekDates.map((date) => {
        const brushed = habitsByDate.get(date)?.brushed;
        const tone: HabitSegmentTone = brushed === "Yes" ? "good" : brushed === "Once" ? "warn" : "bad";
        return { date, label: format(parseISO(date), "EEE dd"), tone };
      })
    },
    {
      label: "Flossed",
      segments: weekDates.map((date) => habitYesNoSegment(date, habitsByDate.get(date)?.flossed))
    },
    {
      label: "Bedroom",
      segments: weekDates.map((date) => habitYesNoSegment(date, habitsByDate.get(date)?.bedroomTidy))
    },
    {
      label: "Desk",
      segments: weekDates.map((date) => habitYesNoSegment(date, habitsByDate.get(date)?.deskTidy))
    },
    {
      label: "Clothes",
      segments: weekDates.map((date) => habitYesNoSegment(date, habitsByDate.get(date)?.clothesAway))
    }
  ];
}

function habitYesNoSegment(date: string, value: "Yes" | "No" | undefined) {
  return {
    date,
    label: format(parseISO(date), "EEE dd"),
    tone: value === "Yes" ? "good" as const : "bad" as const
  };
}

function getSelectedWeekDates(data: LifeDashboardData, selectedWeek: number) {
  const match = [...data.workouts, ...data.habits, ...data.nutrition].find((entry) => weekOf(entry.date) === selectedWeek);
  const weekStart = startOfISOWeek(match ? parseISO(match.date) : new Date());

  return Array.from({ length: 7 }, (_item, index) => format(addDays(weekStart, index), "yyyy-MM-dd"));
}

function formatWeekRange(data: LifeDashboardData, selectedWeek: number) {
  const dates = getSelectedWeekDates(data, selectedWeek);
  return `${format(parseISO(dates[0]), "MMM d")} - ${format(parseISO(dates[6]), "MMM d")}`;
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
  draft,
  entry,
  isEditing,
  onDelete,
  onDraftChange
}: {
  categories: string[];
  draft: SpendingDraft;
  entry: SpendingEntry;
  isEditing: boolean;
  onDelete: () => void;
  onDraftChange: (draft: SpendingDraft) => void;
}) {
  const payment = entry.credit !== "" ? "credit" : "cash";

  return (
    <div className={`ledger-entry-row ${isEditing ? "is-editing" : ""}`}>
      {isEditing ? (
        <>
          <input aria-label="Purchase date" type="date" value={draft.date} onChange={(event) => onDraftChange({ ...draft, date: event.target.value })} />
          <input aria-label="Purchase notes" value={draft.notes} onChange={(event) => onDraftChange({ ...draft, notes: event.target.value })} />
          <select aria-label="Payment method" value={draft.payment} onChange={(event) => onDraftChange({ ...draft, payment: event.target.value as SpendingDraft["payment"] })}>
            <option value="credit">Credit</option>
            <option value="cash">Cash</option>
          </select>
          <input aria-label="Purchase amount" min="0" step="0.01" type="number" value={draft.amount} onChange={(event) => onDraftChange({ ...draft, amount: readNumber(event.target.value) })} />
          <CategorySelect categories={categories} value={draft.category} onChange={(category) => onDraftChange({ ...draft, category })} />
        </>
      ) : (
        <>
          <span>{entry.date}</span>
          <strong>{entry.notes || "-"}</strong>
          <span className="payment-pill">{payment}</span>
          <span>{toMoney(spendingTotal(entry))}</span>
          <span>{entry.category}</span>
        </>
      )}
      <button className="danger-button" type="button" onClick={onDelete}>Delete</button>
    </div>
  );
}

function LedgerFilterBar({
  categories,
  filters,
  onChange
}: {
  categories: string[];
  filters: LedgerFilters;
  onChange: (filters: LedgerFilters) => void;
}) {
  const hasFilters = filters.category !== "all" || filters.dateFrom || filters.dateTo || filters.payment !== "all";

  return (
    <div className="ledger-filterbar">
      <Field label="Payment">
        <select value={filters.payment} onChange={(event) => onChange({ ...filters, payment: event.target.value as LedgerFilters["payment"] })}>
          <option value="all">All</option>
          <option value="credit">Credit</option>
          <option value="cash">Cash</option>
        </select>
      </Field>
      <Field label="From">
        <input type="date" value={filters.dateFrom} onChange={(event) => onChange({ ...filters, dateFrom: event.target.value })} />
      </Field>
      <Field label="To">
        <input type="date" value={filters.dateTo} onChange={(event) => onChange({ ...filters, dateTo: event.target.value })} />
      </Field>
      <Field label="Category">
        <select value={filters.category} onChange={(event) => onChange({ ...filters, category: event.target.value })}>
          <option value="all">All</option>
          {categories.map((category) => (
            <option key={category}>{category}</option>
          ))}
        </select>
      </Field>
      <button
        className="secondary-button"
        disabled={!hasFilters}
        type="button"
        onClick={() => onChange({ category: "all", dateFrom: "", dateTo: "", payment: "all" })}
      >
        Clear
      </button>
    </div>
  );
}

function matchesLedgerFilters(entry: SpendingEntry, filters: LedgerFilters) {
  const payment = entry.credit !== "" ? "credit" : "cash";

  if (filters.payment !== "all" && payment !== filters.payment) {
    return false;
  }

  if (filters.category !== "all" && entry.category !== filters.category) {
    return false;
  }

  if (filters.dateFrom && entry.date < filters.dateFrom) {
    return false;
  }

  if (filters.dateTo && entry.date > filters.dateTo) {
    return false;
  }

  return true;
}

function spendingEntryToDraft(entry: SpendingEntry): SpendingDraft {
  return {
    date: entry.date,
    category: entry.category,
    amount: spendingTotal(entry),
    payment: entry.credit !== "" ? "credit" : "cash",
    notes: entry.notes
  };
}

function spendingDraftToEntry(id: string, draft: SpendingDraft): SpendingEntry {
  return {
    id,
    date: draft.date,
    category: draft.category,
    credit: draft.payment === "credit" ? draft.amount : "",
    cash: draft.payment === "cash" ? draft.amount : "",
    notes: draft.notes
  };
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

function buildLedgerSampleCsv(categories: string[]) {
  const primaryCategory = categories[0] ?? "Others";
  const secondaryCategory = categories.find((category) => category !== primaryCategory) ?? primaryCategory;
  const rows = [
    ["date", "category", "amount", "payment", "notes"],
    [today, primaryCategory, "90.64", "credit", "Groceries"],
    [today, secondaryCategory, "45.50", "cash", "Lunch"]
  ];

  return rows.map((row) => row.map(csvEscape).join(",")).join("\n");
}

function parseLedgerCsv(text: string, categories: string[]) {
  const rows = parseCsvRows(text).filter((row) => row.some((cell) => cell.trim()));
  const errors: string[] = [];
  const entries: SpendingEntry[] = [];

  if (rows.length < 2) {
    return { entries, errors: ["CSV must include a header row and at least one purchase row."] };
  }

  const headers = rows[0].map((header) => header.trim().toLowerCase());
  const indexes = {
    amount: headers.indexOf("amount"),
    category: headers.indexOf("category"),
    date: headers.indexOf("date"),
    notes: headers.indexOf("notes"),
    payment: headers.indexOf("payment")
  };
  const missingHeaders = Object.entries(indexes)
    .filter(([, index]) => index === -1)
    .map(([header]) => header);

  if (missingHeaders.length) {
    return { entries, errors: [`Missing CSV columns: ${missingHeaders.join(", ")}.`] };
  }

  rows.slice(1).forEach((row, index) => {
    const rowNumber = index + 2;
    const date = row[indexes.date]?.trim() ?? "";
    const category = row[indexes.category]?.trim() ?? "";
    const amount = parseCsvAmount(row[indexes.amount] ?? "");
    const payment = row[indexes.payment]?.trim().toLowerCase() ?? "";
    const notes = row[indexes.notes]?.trim() ?? "";

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      errors.push(`Row ${rowNumber}: date must be YYYY-MM-DD.`);
    }

    if (!categories.includes(category)) {
      errors.push(`Row ${rowNumber}: category must match one of your budget categories.`);
    }

    if (amount === null || amount <= 0) {
      errors.push(`Row ${rowNumber}: amount must be a positive number.`);
    }

    if (payment !== "credit" && payment !== "cash") {
      errors.push(`Row ${rowNumber}: payment must be credit or cash.`);
    }

    if (!errors.some((error) => error.startsWith(`Row ${rowNumber}:`)) && amount !== null && (payment === "credit" || payment === "cash")) {
      entries.push({
        id: crypto.randomUUID(),
        date,
        category,
        credit: payment === "credit" ? amount : "",
        cash: payment === "cash" ? amount : "",
        notes
      });
    }
  });

  return { entries, errors };
}

function parseCsvRows(text: string) {
  const rows: string[][] = [];
  let currentCell = "";
  let currentRow: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      currentCell += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      currentRow.push(currentCell);
      currentCell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }

      currentRow.push(currentCell);
      rows.push(currentRow);
      currentCell = "";
      currentRow = [];
    } else {
      currentCell += char;
    }
  }

  currentRow.push(currentCell);
  rows.push(currentRow);
  return rows;
}

function parseCsvAmount(value: string) {
  const normalized = value
    .trim()
    .replace(/^R\$\s*/, "")
    .replace(/\s/g, "")
    .replace(",", ".");
  const amount = Number(normalized);

  return Number.isFinite(amount) ? amount : null;
}

function csvEscape(value: string) {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
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

function formatMonth(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);

  if (!year || !monthNumber) {
    return month;
  }

  return new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(new Date(year, monthNumber - 1));
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
