import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DynamicFieldRenderer } from "../features/entries/DynamicFieldRenderer";
import { createStarterSeed } from "../seed/starterSeed";

const seed = createStarterSeed({
  userId: "user-1",
  now: "2026-06-01T12:00:00.000Z",
  today: "2026-06-01"
});

describe("DynamicFieldRenderer", () => {
  it("renders enum fields from field options", () => {
    const field = seed.metricFields.find((candidate) => candidate.id === "starter-nutrition-logged-status");

    if (!field) {
      throw new Error("Missing field");
    }

    render(
      <DynamicFieldRenderer
        dimensions={[]}
        field={field}
        value="partial"
        values={{ logged_status: "partial" }}
        onChange={vi.fn()}
      />
    );

    expect(screen.getByLabelText("Logged status *")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Partial" })).toBeInTheDocument();
  });

  it("renders dimension fields from dimension configuration", () => {
    const field = seed.metricFields.find((candidate) => candidate.id === "starter-spending-category");

    if (!field) {
      throw new Error("Missing field");
    }

    render(
      <DynamicFieldRenderer
        dimensions={seed.dimensions}
        field={field}
        value="starter-spending-supermarket"
        values={{ category: "starter-spending-supermarket" }}
        onChange={vi.fn()}
      />
    );

    expect(screen.getByRole("option", { name: "Supermarket" })).toBeInTheDocument();
  });

  it("renders calculated fields as read-only", () => {
    const field = seed.metricFields.find((candidate) => candidate.id === "starter-spending-total-amount");

    if (!field) {
      throw new Error("Missing field");
    }

    render(
      <DynamicFieldRenderer
        calculatedValue={42}
        dimensions={[]}
        field={field}
        value={null}
        values={{}}
        onChange={vi.fn()}
      />
    );

    expect(screen.getByLabelText("Total amount")).toHaveAttribute("readonly");
  });
});
