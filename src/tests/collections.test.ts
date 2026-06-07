import { describe, expect, it } from "vitest";
import { userCollectionPath, userDocumentPath } from "../lib/firebase/collections";

describe("Firestore user paths", () => {
  it("scopes collection paths to a user", () => {
    expect(userCollectionPath("user-1", "metrics")).toBe("users/user-1/metrics");
  });

  it("scopes document paths to a user collection", () => {
    expect(userDocumentPath("user-1", "dashboards", "dashboard-1")).toBe("users/user-1/dashboards/dashboard-1");
  });
});
