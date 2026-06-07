import type {
  BudgetVersion,
  Dashboard,
  DashboardWidget,
  Dimension,
  GoalVersion,
  Metric,
  MetricField,
  TimestampString
} from "../types/kpi";

type SeedContext = {
  userId: string;
  now: TimestampString;
  today: TimestampString;
};

type SeedCollections = {
  metrics: Metric[];
  metricFields: MetricField[];
  goalVersions: GoalVersion[];
  dimensions: Dimension[];
  budgetVersions: BudgetVersion[];
  dashboards: Dashboard[];
  dashboardWidgets: DashboardWidget[];
};

const yesNoOptions = [
  { label: "Yes", value: "yes" },
  { label: "No", value: "no" }
];

function baseMetricField(
  context: SeedContext,
  field: Omit<MetricField, "userId" | "createdAt" | "updatedAt" | "archived">
): MetricField {
  return {
    ...field,
    archived: false,
    createdAt: context.now,
    updatedAt: context.now
  };
}

function metric(context: SeedContext, metricConfig: Omit<Metric, "userId" | "createdAt" | "updatedAt" | "archived">): Metric {
  return {
    ...metricConfig,
    userId: context.userId,
    archived: false,
    createdAt: context.now,
    updatedAt: context.now
  };
}

function goal(context: SeedContext, goalConfig: Omit<GoalVersion, "userId" | "createdAt" | "updatedAt">): GoalVersion {
  return {
    ...goalConfig,
    userId: context.userId,
    createdAt: context.now,
    updatedAt: context.now
  };
}

function dimension(context: SeedContext, dimensionConfig: Omit<Dimension, "userId" | "archived">): Dimension {
  return {
    ...dimensionConfig,
    userId: context.userId,
    archived: false
  };
}

function budget(context: SeedContext, budgetConfig: Omit<BudgetVersion, "userId" | "createdAt" | "updatedAt">): BudgetVersion {
  return {
    ...budgetConfig,
    userId: context.userId,
    createdAt: context.now,
    updatedAt: context.now
  };
}

function dashboard(context: SeedContext, dashboardConfig: Omit<Dashboard, "userId" | "createdAt" | "updatedAt">): Dashboard {
  return {
    ...dashboardConfig,
    userId: context.userId,
    createdAt: context.now,
    updatedAt: context.now
  };
}

function widget(context: SeedContext, widgetConfig: Omit<DashboardWidget, "userId" | "createdAt" | "updatedAt">): DashboardWidget {
  return {
    ...widgetConfig,
    userId: context.userId,
    createdAt: context.now,
    updatedAt: context.now
  };
}

export function createStarterSeed(context: SeedContext): SeedCollections {
  const metrics = [
    metric(context, {
      id: "starter-workout",
      name: "Workout",
      description: "Daily workout completion and session notes.",
      groupId: "starter-health",
      icon: "dumbbell",
      color: "#4ade80",
      cadence: "daily",
      allowMultipleEntriesPerPeriod: false,
      quickEntryEnabled: true,
      dashboardEnabled: true
    }),
    metric(context, {
      id: "starter-nutrition",
      name: "Nutrition",
      description: "Daily nutrition status and macro targets.",
      groupId: "starter-health",
      icon: "utensils",
      color: "#38bdf8",
      cadence: "daily",
      allowMultipleEntriesPerPeriod: false,
      quickEntryEnabled: true,
      dashboardEnabled: true
    }),
    metric(context, {
      id: "starter-daily-habits",
      name: "Daily Habits",
      description: "Daily household and self-care habit score.",
      groupId: "starter-habits",
      icon: "check-circle",
      color: "#facc15",
      cadence: "daily",
      allowMultipleEntriesPerPeriod: false,
      quickEntryEnabled: true,
      dashboardEnabled: true
    }),
    metric(context, {
      id: "starter-spending",
      name: "Spending",
      description: "Transaction spending split by payment source and category.",
      groupId: "starter-finance",
      icon: "wallet",
      color: "#fb7185",
      cadence: "transaction",
      allowMultipleEntriesPerPeriod: true,
      quickEntryEnabled: false,
      dashboardEnabled: true
    })
  ];

  const metricFields = [
    baseMetricField(context, {
      id: "starter-workout-completed",
      metricId: "starter-workout",
      key: "completed",
      label: "Completed",
      description: "Whether the workout session was completed.",
      type: "boolean",
      required: true,
      defaultValue: false,
      placeholder: "",
      options: yesNoOptions,
      displayOrder: 10,
      showInQuickEntry: true,
      showInFullEntry: true,
      showInLogs: true,
      usableInRules: true,
      usableInDashboard: true
    }),
    baseMetricField(context, {
      id: "starter-workout-session-quality",
      metricId: "starter-workout",
      key: "session_quality",
      label: "Session quality",
      description: "Subjective session quality from 1 to 10.",
      type: "rating",
      required: false,
      defaultValue: null,
      placeholder: "",
      min: 1,
      max: 10,
      step: 1,
      options: [],
      displayOrder: 20,
      showInQuickEntry: true,
      showInFullEntry: true,
      showInLogs: true,
      usableInRules: true,
      usableInDashboard: true
    }),
    baseMetricField(context, {
      id: "starter-workout-notes",
      metricId: "starter-workout",
      key: "notes",
      label: "Notes",
      description: "Workout notes.",
      type: "longText",
      required: false,
      defaultValue: "",
      placeholder: "Add notes",
      options: [],
      displayOrder: 30,
      showInQuickEntry: false,
      showInFullEntry: true,
      showInLogs: true,
      usableInRules: false,
      usableInDashboard: false
    }),
    baseMetricField(context, {
      id: "starter-nutrition-logged-status",
      metricId: "starter-nutrition",
      key: "logged_status",
      label: "Logged status",
      description: "How complete the nutrition log is for the day.",
      type: "enum",
      required: true,
      defaultValue: "no",
      placeholder: "",
      options: [
        { label: "Yes", value: "yes" },
        { label: "Partial", value: "partial" },
        { label: "No", value: "no" }
      ],
      displayOrder: 10,
      showInQuickEntry: true,
      showInFullEntry: true,
      showInLogs: true,
      usableInRules: true,
      usableInDashboard: true
    }),
    ...["carbs_g", "protein_g", "fat_g"].map((key, index) =>
      baseMetricField(context, {
        id: `starter-nutrition-${key}`,
        metricId: "starter-nutrition",
        key,
        label: key.replace("_g", " g").replace("_", " "),
        description: "Daily macro amount in grams.",
        type: "number",
        required: false,
        defaultValue: null,
        placeholder: "0",
        min: 0,
        step: 1,
        options: [],
        displayOrder: 20 + index * 10,
        showInQuickEntry: true,
        showInFullEntry: true,
        showInLogs: true,
        usableInRules: true,
        usableInDashboard: true
      })
    ),
    baseMetricField(context, {
      id: "starter-nutrition-notes",
      metricId: "starter-nutrition",
      key: "notes",
      label: "Notes",
      description: "Nutrition notes.",
      type: "longText",
      required: false,
      defaultValue: "",
      placeholder: "Add notes",
      options: [],
      displayOrder: 50,
      showInQuickEntry: false,
      showInFullEntry: true,
      showInLogs: true,
      usableInRules: false,
      usableInDashboard: false
    }),
    baseMetricField(context, {
      id: "starter-daily-habits-brushed",
      metricId: "starter-daily-habits",
      key: "brushed",
      label: "Brushed",
      description: "Brushing completion level.",
      type: "enum",
      required: true,
      defaultValue: "no",
      placeholder: "",
      options: [
        { label: "Yes", value: "yes" },
        { label: "Once", value: "once" },
        { label: "No", value: "no" }
      ],
      displayOrder: 10,
      showInQuickEntry: true,
      showInFullEntry: true,
      showInLogs: true,
      usableInRules: true,
      usableInDashboard: true
    }),
    ...["flossed", "bedroom_tidy", "desk_tidy", "clothes_put_away"].map((key, index) =>
      baseMetricField(context, {
        id: `starter-daily-habits-${key}`,
        metricId: "starter-daily-habits",
        key,
        label: key.replaceAll("_", " "),
        description: "Boolean daily habit completion.",
        type: "boolean",
        required: false,
        defaultValue: false,
        placeholder: "",
        options: yesNoOptions,
        displayOrder: 20 + index * 10,
        showInQuickEntry: true,
        showInFullEntry: true,
        showInLogs: true,
        usableInRules: true,
        usableInDashboard: true
      })
    ),
    baseMetricField(context, {
      id: "starter-daily-habits-notes",
      metricId: "starter-daily-habits",
      key: "notes",
      label: "Notes",
      description: "Daily habit notes.",
      type: "longText",
      required: false,
      defaultValue: "",
      placeholder: "Add notes",
      options: [],
      displayOrder: 60,
      showInQuickEntry: false,
      showInFullEntry: true,
      showInLogs: true,
      usableInRules: false,
      usableInDashboard: false
    }),
    baseMetricField(context, {
      id: "starter-daily-habits-score",
      metricId: "starter-daily-habits",
      key: "score",
      label: "Score",
      description: "Calculated daily habit score out of 5.",
      type: "calculated",
      required: false,
      defaultValue: null,
      placeholder: "",
      options: [],
      calculation: {
        type: "score",
        maxScore: 5,
        components: [
          { type: "enumValue", fieldKey: "brushed", scores: { yes: 1, once: 0.5, no: 0 } },
          { type: "booleanTrue", fieldKey: "flossed", score: 1 },
          { type: "booleanTrue", fieldKey: "bedroom_tidy", score: 1 },
          { type: "booleanTrue", fieldKey: "desk_tidy", score: 1 },
          { type: "booleanTrue", fieldKey: "clothes_put_away", score: 1 }
        ]
      },
      displayOrder: 70,
      showInQuickEntry: false,
      showInFullEntry: false,
      showInLogs: true,
      usableInRules: true,
      usableInDashboard: true
    }),
    baseMetricField(context, {
      id: "starter-spending-category",
      metricId: "starter-spending",
      key: "category",
      label: "Category",
      description: "Spending dimension or category.",
      type: "dimension",
      required: true,
      defaultValue: null,
      placeholder: "Choose category",
      options: [],
      displayOrder: 10,
      showInQuickEntry: false,
      showInFullEntry: true,
      showInLogs: true,
      usableInRules: true,
      usableInDashboard: true
    }),
    ...["credit_card_amount", "cash_amount"].map((key, index) =>
      baseMetricField(context, {
        id: `starter-spending-${key}`,
        metricId: "starter-spending",
        key,
        label: key.replaceAll("_", " "),
        description: "Transaction amount.",
        type: "currency",
        required: false,
        defaultValue: 0,
        placeholder: "0.00",
        min: 0,
        step: 0.01,
        options: [],
        displayOrder: 20 + index * 10,
        showInQuickEntry: false,
        showInFullEntry: true,
        showInLogs: true,
        usableInRules: true,
        usableInDashboard: true
      })
    ),
    baseMetricField(context, {
      id: "starter-spending-total-amount",
      metricId: "starter-spending",
      key: "total_amount",
      label: "Total amount",
      description: "Calculated currency total from payment amounts.",
      type: "calculated",
      required: false,
      defaultValue: 0,
      placeholder: "",
      options: [],
      calculation: {
        type: "sumFields",
        fieldKeys: ["credit_card_amount", "cash_amount"]
      },
      displayOrder: 40,
      showInQuickEntry: false,
      showInFullEntry: false,
      showInLogs: true,
      usableInRules: true,
      usableInDashboard: true
    }),
    baseMetricField(context, {
      id: "starter-spending-notes",
      metricId: "starter-spending",
      key: "notes",
      label: "Notes",
      description: "Transaction notes.",
      type: "longText",
      required: false,
      defaultValue: "",
      placeholder: "Add notes",
      options: [],
      displayOrder: 50,
      showInQuickEntry: false,
      showInFullEntry: true,
      showInLogs: true,
      usableInRules: false,
      usableInDashboard: false
    })
  ];

  const goals = [
    goal(context, {
      id: "starter-goal-workout-weekly-completed",
      metricId: "starter-workout",
      fieldKey: "completed",
      name: "Weekly completed workouts",
      period: "weekly",
      aggregation: "countWhere",
      aggregationConfig: {
        conditions: [{ fieldKey: "completed", operator: "eq", value: true }]
      },
      comparisonOperator: "gte",
      targetValue: 4,
      direction: "increase",
      effectiveFrom: context.today,
      effectiveTo: null,
      versionNote: "Starter weekly workout completion target."
    }),
    ...[
      { key: "carbs_g", target: 250 },
      { key: "protein_g", target: 180 },
      { key: "fat_g", target: 70 }
    ].map(({ key, target }) =>
      goal(context, {
        id: `starter-goal-nutrition-${key}-daily`,
        metricId: "starter-nutrition",
        fieldKey: key,
        name: `Daily ${key.replace("_g", "")} target`,
      period: "daily",
        aggregation: "latestValue",
        comparisonOperator: "eq",
        targetValue: target,
        toleranceType: "percentage",
        toleranceValue: 5,
        direction: "maintain",
        effectiveFrom: context.today,
        effectiveTo: null,
        versionNote: "Starter daily nutrition macro target."
      })
    )
  ];

  const budgetConfigs = [
    ["supermarket", "Supermarket", 800],
    ["restaurants", "Restaurants", 400],
    ["car", "Car", 300],
    ["online-shopping", "Online Shopping", 200],
    ["gym-membership", "Gym Membership", 120],
    ["health", "Health", 200],
    ["tobacco", "Tobacco", 150],
    ["subscriptions", "Subscriptions", 100],
    ["phone-bill", "Phone Bill", 80],
    ["utilities", "Utilities", 250],
    ["others", "Others", 200]
  ] as const;

  const dimensions = budgetConfigs.map(([id, name], index) =>
    dimension(context, {
      id: `starter-spending-${id}`,
      type: "spendingCategory",
      name,
      description: `${name} spending category.`,
      icon: "tag",
      color: "#94a3b8",
      displayOrder: (index + 1) * 10
    })
  );

  const budgetVersions = budgetConfigs.map(([id, name, amount]) =>
    budget(context, {
      id: `starter-budget-${id}-monthly`,
      dimensionId: `starter-spending-${id}`,
      amount,
      currency: "BRL",
      period: "monthly",
      effectiveFrom: context.today,
      effectiveTo: null,
      versionNote: `Starter monthly budget for ${name}.`
    })
  );

  const dashboards = [
    dashboard(context, {
      id: "starter-default-dashboard",
      name: "Default Dashboard",
      type: "default",
      isDefault: true,
      settings: { columns: 12 }
    }),
    dashboard(context, {
      id: "starter-kiosk-dashboard",
      name: "Kiosk Dashboard",
      type: "kiosk",
      isDefault: false,
      settings: { columns: 12, fullScreen: true }
    })
  ];

  const dashboardWidgets = [
    widget(context, {
      id: "starter-widget-default-workout",
      dashboardId: "starter-default-dashboard",
      title: "Weekly workouts",
      subtitle: "Completed sessions",
      metricId: "starter-workout",
      widgetType: "goalProgress",
      period: "weekly",
      aggregation: "count",
      fieldKey: "completed",
      goalVersionId: "starter-goal-workout-weekly-completed",
      visualizationSettings: { display: "progress" },
      layout: { x: 0, y: 0, w: 4, h: 3 },
      visible: true,
      visibleInKiosk: true,
      displayOrder: 10
    }),
    widget(context, {
      id: "starter-widget-default-nutrition",
      dashboardId: "starter-default-dashboard",
      title: "Nutrition targets",
      subtitle: "Daily macro status",
      metricId: "starter-nutrition",
      widgetType: "multiGoalSummary",
      period: "daily",
      aggregation: "latest",
      visualizationSettings: { display: "compactList" },
      layout: { x: 4, y: 0, w: 4, h: 3 },
      visible: true,
      visibleInKiosk: true,
      displayOrder: 20
    }),
    widget(context, {
      id: "starter-widget-default-habits",
      dashboardId: "starter-default-dashboard",
      title: "Habit score",
      subtitle: "Daily score out of 5",
      metricId: "starter-daily-habits",
      widgetType: "latestValue",
      period: "daily",
      aggregation: "latest",
      fieldKey: "score",
      visualizationSettings: { display: "score" },
      layout: { x: 8, y: 0, w: 4, h: 3 },
      visible: true,
      visibleInKiosk: true,
      displayOrder: 30
    }),
    widget(context, {
      id: "starter-widget-default-spending",
      dashboardId: "starter-default-dashboard",
      title: "Spending",
      subtitle: "Monthly total by category",
      metricId: "starter-spending",
      widgetType: "categoryBudgetSummary",
      period: "monthly",
      aggregation: "sum",
      fieldKey: "total_amount",
      visualizationSettings: { display: "barList", currency: "BRL" },
      layout: { x: 0, y: 3, w: 8, h: 4 },
      visible: true,
      visibleInKiosk: false,
      displayOrder: 40
    }),
    widget(context, {
      id: "starter-widget-kiosk-workout",
      dashboardId: "starter-kiosk-dashboard",
      title: "Weekly workouts",
      subtitle: "Completed sessions",
      metricId: "starter-workout",
      widgetType: "goalProgress",
      period: "weekly",
      aggregation: "count",
      fieldKey: "completed",
      goalVersionId: "starter-goal-workout-weekly-completed",
      visualizationSettings: { display: "largeProgress" },
      layout: { x: 0, y: 0, w: 6, h: 4 },
      visible: true,
      visibleInKiosk: true,
      displayOrder: 10
    }),
    widget(context, {
      id: "starter-widget-kiosk-habits",
      dashboardId: "starter-kiosk-dashboard",
      title: "Habit score",
      subtitle: "Daily score out of 5",
      metricId: "starter-daily-habits",
      widgetType: "latestValue",
      period: "daily",
      aggregation: "latest",
      fieldKey: "score",
      visualizationSettings: { display: "largeScore" },
      layout: { x: 6, y: 0, w: 6, h: 4 },
      visible: true,
      visibleInKiosk: true,
      displayOrder: 20
    }),
    widget(context, {
      id: "starter-widget-kiosk-nutrition",
      dashboardId: "starter-kiosk-dashboard",
      title: "Nutrition targets",
      subtitle: "Daily macro status",
      metricId: "starter-nutrition",
      widgetType: "multiGoalSummary",
      period: "daily",
      aggregation: "latest",
      visualizationSettings: { display: "largeList" },
      layout: { x: 0, y: 4, w: 6, h: 4 },
      visible: true,
      visibleInKiosk: true,
      displayOrder: 30
    })
  ];

  return {
    metrics,
    metricFields,
    goalVersions: goals,
    dimensions,
    budgetVersions,
    dashboards,
    dashboardWidgets
  };
}
