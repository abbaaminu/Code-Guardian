import { describe, expect, it } from "vitest";
import { hasRepositoryWritePermissions } from "./app-auth";

describe("GitHub App repository write permissions", () => {
  it("requires write access to contents and pull requests", () => {
    expect(
      hasRepositoryWritePermissions({
        contents: "write",
        pull_requests: "write",
      }),
    ).toBe(true);
    expect(
      hasRepositoryWritePermissions({
        contents: "admin",
        pull_requests: "admin",
      }),
    ).toBe(true);
  });

  it("rejects missing, read-only, and malformed permissions", () => {
    expect(hasRepositoryWritePermissions({ contents: "write" })).toBe(false);
    expect(
      hasRepositoryWritePermissions({
        contents: "read",
        pull_requests: "write",
      }),
    ).toBe(false);
    expect(hasRepositoryWritePermissions(null)).toBe(false);
    expect(hasRepositoryWritePermissions(["write"])).toBe(false);
  });
});
