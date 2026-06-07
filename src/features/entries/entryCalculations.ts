import type { EntryValues, FieldValue, MetricField } from "../../types/kpi";

export function getDefaultValue(field: MetricField): FieldValue {
  if (field.defaultValue !== null) {
    return field.defaultValue;
  }

  switch (field.type) {
    case "boolean":
      return false;
    case "number":
    case "currency":
    case "percentage":
    case "rating":
    case "duration":
      return null;
    case "multiSelect":
    case "checklist":
    case "tags":
      return [];
    default:
      return "";
  }
}

function toNumber(value: FieldValue | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function computeCalculatedValues(fields: MetricField[], values: EntryValues): EntryValues {
  const calculatedValues: EntryValues = {};

  for (const field of fields) {
    if (!field.calculation) {
      continue;
    }

    if (field.calculation.type === "sumFields") {
      calculatedValues[field.key] = field.calculation.fieldKeys.reduce((sum, key) => sum + toNumber(values[key]), 0);
      continue;
    }

    calculatedValues[field.key] = field.calculation.components.reduce((score, component) => {
      const value = values[component.fieldKey];

      if (component.type === "booleanTrue") {
        return score + (value === true ? component.score : 0);
      }

      return score + (typeof value === "string" ? component.scores[value] ?? 0 : 0);
    }, 0);
  }

  return calculatedValues;
}

export function buildInitialValues(fields: MetricField[], existingValues?: EntryValues): EntryValues {
  return fields.reduce<EntryValues>((values, field) => {
    values[field.key] = existingValues && field.key in existingValues ? existingValues[field.key] : getDefaultValue(field);
    return values;
  }, {});
}

export function validateEntryValues(fields: MetricField[], values: EntryValues): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const field of fields) {
    if (field.type === "calculated" || field.archived) {
      continue;
    }

    const value = values[field.key];

    if (field.required) {
      const isEmpty =
        value === null || value === undefined || value === "" || (Array.isArray(value) && value.length === 0);

      if (isEmpty) {
        errors[field.key] = "Required";
        continue;
      }
    }

    if (typeof value === "number") {
      if (field.min !== undefined && value < field.min) {
        errors[field.key] = `Minimum is ${field.min}`;
      }

      if (field.max !== undefined && value > field.max) {
        errors[field.key] = `Maximum is ${field.max}`;
      }
    }

    if (field.type === "enum" && typeof value === "string" && field.options.length > 0) {
      const allowedValues = field.options.filter((option) => !option.archived).map((option) => option.value);
      if (value !== "" && !allowedValues.includes(value)) {
        errors[field.key] = "Choose a valid option";
      }
    }
  }

  return errors;
}
