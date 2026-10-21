import { describe, expect, it } from "vitest";
import { isMissingGithubCredentialError } from "./connect-error";

describe("isMissingGithubCredentialError", () => {
  it.each([
    "Connect your GitHub account first: save a GitHub token in your token vault so SecurePulse can verify your App installation.",
    "A personal GitHub token is required to create a branch or pull request. Save one in your token vault; the deployment GITHUB_TOKEN is not used for repository writes.",
    "Your saved GitHub token is invalid or expired. Update it in your token vault, then try again.",
    "No GitHub token is stored for this account.",
  ])("detects a missing vault credential (%#)", (message) => {
    expect(isMissingGithubCredentialError(message)).toBe(true);
  });

  it.each([
    "GitHub API rate limit reached while creating the remediation pull request.",
    "The GitHub App is not installed for this repository, or your GitHub account cannot access it.",
    "Forbidden: the GitHub App installation lacks repository write permissions.",
    "Unauthorized: No authorization header provided",
    "",
    "   ",
    null,
    undefined,
    42,
  ])("ignores unrelated or missing messages (%#)", (message) => {
    expect(isMissingGithubCredentialError(message)).toBe(false);
  });
});
