import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "../app/App";

describe("App routes", () => {
  it("renders the dashboard route from the root redirect", async () => {
    window.history.pushState({}, "", "/");

    render(<App />);

    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
  });

  it("renders kiosk route with the full-screen placeholder", async () => {
    window.history.pushState({}, "", "/kiosk");

    render(<App />);

    expect(await screen.findByRole("heading", { name: "Kiosk" })).toBeInTheDocument();
  });

  it("renders the settings seed action", async () => {
    window.history.pushState({}, "", "/settings");

    render(<App />);

    expect(await screen.findByRole("button", { name: "Seed starter metrics" })).toBeInTheDocument();
  });
});
