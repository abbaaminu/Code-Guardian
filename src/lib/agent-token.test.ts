import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const agentSource = readFileSync(
  path.join(repoRoot, "src", "lib", "agent.functions.ts"),
  "utf8",
);

describe("runAgentTask GitHub authorization", () => {
  it("requires the caller's vault token before running any task work", () => {
    const handlerStart = agentSource.indexOf(
      ".handler(async ({ data, context }) => {",
      agentSource.indexOf("export const runAgentTask"),
    );
    const handler = agentSource.slice(handlerStart);
    const userTokenCheck = handler.indexOf(
      "getUserGithubToken(context.userId)",
    );

    expect(handlerStart).toBeGreaterThanOrEqual(0);
    expect(userTokenCheck).toBeGreaterThanOrEqual(0);
    expect(userTokenCheck).toBeLessThan(
      handler.indexOf("geminiApiRateLimiter.tryTake(context.userId)"),
    );
    expect(handler.slice(0, handler.indexOf("// Step 1"))).toContain(
      "personal GitHub token is required",
    );
    expect(handler).not.toContain("getGithubToken()");
  });

  it("resolves the token only from the signed-in user's vault", () => {
    const helperStart = agentSource.indexOf(
      "async function getUserGithubToken",
    );
    const helperEnd = agentSource.indexOf("\n}", helperStart);
    const helper = agentSource.slice(helperStart, helperEnd);

    expect(helper).toContain(
      'getDecryptedRepoTokenServerOnly(userId, "github")',
    );
    expect(helper).not.toContain("GITHUB_TOKEN");
    expect(agentSource).not.toContain("@/lib/github/token.server");
  });
});
