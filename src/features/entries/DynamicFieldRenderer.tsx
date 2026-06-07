import type { Dimension, EntryValues, FieldValue, MetricField } from "../../types/kpi";

type DynamicFieldRendererProps = {
  field: MetricField;
  value: FieldValue | undefined;
  values: EntryValues;
  dimensions: Dimension[];
  error?: string;
  calculatedValue?: FieldValue;
  onChange: (fieldKey: string, value: FieldValue) => void;
};

function valueAsString(value: FieldValue | undefined): string {
  if (value === null || value === undefined || Array.isArray(value)) {
    return "";
  }

  return String(value);
}

function valueAsNumber(value: FieldValue | undefined): string {
  return typeof value === "number" ? String(value) : "";
}

export function DynamicFieldRenderer({
  field,
  value,
  dimensions,
  error,
  calculatedValue,
  onChange
}: DynamicFieldRendererProps) {
  const fieldId = `field-${field.id}`;
  const commonProps = {
    id: fieldId,
    name: field.key,
    disabled: field.type === "calculated",
    "aria-invalid": error ? true : undefined
  };

  function renderInput() {
    switch (field.type) {
      case "longText":
        return (
          <textarea
            {...commonProps}
            placeholder={field.placeholder}
            value={valueAsString(value)}
            onChange={(event) => onChange(field.key, event.target.value)}
          />
        );
      case "number":
      case "currency":
      case "percentage":
      case "duration":
        return (
          <input
            {...commonProps}
            inputMode="decimal"
            min={field.min}
            max={field.max}
            placeholder={field.placeholder}
            step={field.step ?? (field.type === "currency" ? 0.01 : 1)}
            type="number"
            value={valueAsNumber(value)}
            onChange={(event) => onChange(field.key, event.target.value === "" ? null : Number(event.target.value))}
          />
        );
      case "boolean":
        return (
          <label className="checkbox-field">
            <input
              {...commonProps}
              checked={value === true}
              type="checkbox"
              onChange={(event) => onChange(field.key, event.target.checked)}
            />
            <span>{field.placeholder || field.label}</span>
          </label>
        );
      case "enum":
        return (
          <select {...commonProps} value={valueAsString(value)} onChange={(event) => onChange(field.key, event.target.value)}>
            <option value="">Choose</option>
            {field.options
              .filter((option) => !option.archived)
              .map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
          </select>
        );
      case "rating":
        return (
          <input
            {...commonProps}
            max={field.max ?? 10}
            min={field.min ?? 1}
            step={field.step ?? 1}
            type="range"
            value={typeof value === "number" ? value : field.min ?? 1}
            onChange={(event) => onChange(field.key, Number(event.target.value))}
          />
        );
      case "date":
        return (
          <input
            {...commonProps}
            type="date"
            value={valueAsString(value)}
            onChange={(event) => onChange(field.key, event.target.value)}
          />
        );
      case "category":
      case "dimension":
        return (
          <select {...commonProps} value={valueAsString(value)} onChange={(event) => onChange(field.key, event.target.value)}>
            <option value="">Choose</option>
            {dimensions.map((dimension) => (
              <option key={dimension.id} value={dimension.id}>
                {dimension.name}
              </option>
            ))}
          </select>
        );
      case "calculated":
        return <input {...commonProps} readOnly type="text" value={valueAsString(calculatedValue ?? value)} />;
      case "text":
      default:
        return (
          <input
            {...commonProps}
            placeholder={field.placeholder}
            type="text"
            value={valueAsString(value)}
            onChange={(event) => onChange(field.key, event.target.value)}
          />
        );
    }
  }

  return (
    <div className="dynamic-field">
      {field.type !== "boolean" && (
        <label htmlFor={fieldId}>
          {field.label}
          {field.required && <span aria-label="required"> *</span>}
        </label>
      )}
      {renderInput()}
      {field.type === "rating" && <span className="field-hint">{valueAsNumber(value) || field.min || 1}</span>}
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}
