import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createGitHubOAuthState,
  verifyGitHubOAuthState,
} from "./oauth-state.server";

describe("GitHub OAuth state", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("authenticates the state and returns the initiating user", () => {
    const { state, cookieValue } = createGitHubOAuthState(
      "user-123",
      "oauth-client-secret",
    );

    expect(
      verifyGitHubOAuthState(cookieValue, state, "oauth-client-secret"),
    ).toBe("user-123");
  });

  it("rejects mismatched state and tampered cookies", () => {
    const { state, cookieValue } = createGitHubOAuthState(
      "user-123",
      "oauth-client-secret",
    );

    expect(
      verifyGitHubOAuthState(
        cookieValue,
        "another-state",
        "oauth-client-secret",
      ),
    ).toBeNull();
    expect(
      verifyGitHubOAuthState(`${cookieValue}x`, state, "oauth-client-secret"),
    ).toBeNull();
  });

  it("rejects expired state", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const { state, cookieValue } = createGitHubOAuthState(
      "user-123",
      "oauth-client-secret",
    );

    vi.advanceTimersByTime(10 * 60 * 1000);

    expect(
      verifyGitHubOAuthState(cookieValue, state, "oauth-client-secret"),
    ).toBeNull();
  });
});
