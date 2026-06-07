export type TimestampString = string;

export type Cadence = "daily" | "weekly" | "monthly" | "transaction" | "event" | "custom";

export type MetricFieldType =
  | "text"
  | "longText"
  | "number"
  | "currency"
  | "percentage"
  | "boolean"
  | "enum"
  | "multiSelect"
  | "rating"
  | "date"
  | "time"
  | "duration"
  | "category"
  | "dimension"
  | "paymentMethod"
  | "checklist"
  | "calculated"
  | "tags";

export type GoalPeriod = "daily" | "weekly" | "monthly" | "custom";
export type DashboardType = "default" | "kiosk" | "mobile" | "weeklyReview" | "monthlyReview" | "custom";
export type BudgetPeriod = "monthly";

export type Aggregation = "sum" | "average" | "min" | "max" | "count" | "latest" | "custom";
export type ComparisonOperator = "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "between";
export type GoalDirection = "increase" | "decrease" | "maintain";
export type ToleranceType = "absolute" | "percentage";

export type FieldOption = {
  label: string;
  value: string;
  color?: string;
  archived?: boolean;
};

export type FieldValidation = {
  pattern?: string;
  message?: string;
};

export type FieldValue = string | number | boolean | string[] | number[] | null;
export type EntryValues = Record<string, FieldValue>;

export type RuleCondition = {
  fieldKey: string;
  operator: ComparisonOperator;
  value: FieldValue;
};

export type AggregationConfig = {
  conditions?: RuleCondition[];
};

export type CalculationDefinition =
  | {
      type: "sumFields";
      fieldKeys: string[];
    }
  | {
      type: "score";
      maxScore: number;
      components: Array<
        | {
            type: "enumValue";
            fieldKey: string;
            scores: Record<string, number>;
          }
        | {
            type: "booleanTrue";
            fieldKey: string;
            score: number;
          }
      >;
    };

export type Metric = {
  id: string;
  userId: string;
  name: string;
  description: string;
  groupId: string;
  icon: string;
  color: string;
  cadence: Cadence;
  allowMultipleEntriesPerPeriod: boolean;
  quickEntryEnabled: boolean;
  dashboardEnabled: boolean;
  archived: boolean;
  createdAt: TimestampString;
  updatedAt: TimestampString;
};

export type MetricField = {
  id: string;
  metricId: string;
  key: string;
  label: string;
  description: string;
  type: MetricFieldType;
  required: boolean;
  defaultValue: FieldValue;
  placeholder: string;
  min?: number;
  max?: number;
  step?: number;
  options: FieldOption[];
  validation?: FieldValidation;
  calculation?: CalculationDefinition;
  displayOrder: number;
  showInQuickEntry: boolean;
  showInFullEntry: boolean;
  showInLogs: boolean;
  usableInRules: boolean;
  usableInDashboard: boolean;
  archived: boolean;
  createdAt: TimestampString;
  updatedAt: TimestampString;
};

export type MetricEntry = {
  id: string;
  userId: string;
  metricId: string;
  entryDate: TimestampString;
  periodStart: TimestampString;
  periodEnd: TimestampString;
  values: EntryValues;
  calculatedValues: EntryValues;
  createdAt: TimestampString;
  updatedAt: TimestampString;
  archived: boolean;
};

export type GoalVersion = {
  id: string;
  userId: string;
  metricId: string;
  fieldKey?: string;
  name: string;
  period: GoalPeriod;
  aggregation: Aggregation;
  aggregationConfig?: AggregationConfig;
  comparisonOperator: ComparisonOperator;
  targetValue: FieldValue;
  toleranceType?: ToleranceType;
  toleranceValue?: number;
  direction: GoalDirection;
  effectiveFrom: TimestampString;
  effectiveTo: TimestampString | null;
  versionNote: string;
  createdAt: TimestampString;
  updatedAt: TimestampString;
};

export type DashboardSettings = Record<string, string | number | boolean | null>;
export type VisualizationSettings = Record<string, string | number | boolean | null>;

export type WidgetLayout = {
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
};

export type Dashboard = {
  id: string;
  userId: string;
  name: string;
  type: DashboardType;
  isDefault: boolean;
  settings: DashboardSettings;
  createdAt: TimestampString;
  updatedAt: TimestampString;
};

export type DashboardWidget = {
  id: string;
  userId: string;
  dashboardId: string;
  title: string;
  subtitle: string;
  metricId?: string;
  widgetType: string;
  period: GoalPeriod;
  aggregation: Aggregation;
  fieldKey?: string;
  goalVersionId?: string;
  visualizationSettings: VisualizationSettings;
  layout: WidgetLayout;
  visible: boolean;
  visibleInKiosk: boolean;
  displayOrder: number;
  createdAt: TimestampString;
  updatedAt: TimestampString;
};

export type Dimension = {
  id: string;
  userId: string;
  type: string;
  name: string;
  description: string;
  parentId?: string;
  icon: string;
  color: string;
  archived: boolean;
  displayOrder: number;
};

export type BudgetVersion = {
  id: string;
  userId: string;
  dimensionId: string;
  amount: number;
  currency: string;
  period: BudgetPeriod;
  effectiveFrom: TimestampString;
  effectiveTo: TimestampString | null;
  versionNote: string;
  createdAt: TimestampString;
  updatedAt: TimestampString;
};

export type AppSettings = {
  id: string;
  userId: string;
  theme: "dark" | "light" | "system";
  createdAt: TimestampString;
  updatedAt: TimestampString;
};
