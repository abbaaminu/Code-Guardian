import { describe, expect, it } from "vitest";
import {
  isSafeRepoPath,
  validateAgentEdit,
  validateAgentEdits,
  MAX_EDIT_COUNT,
  MAX_FILE_PATH_LENGTH,
} from "./agent-safety";

describe("isSafeRepoPath", () => {
  it("accepts normal relative repo paths", () => {
    expect(isSafeRepoPath("src/lib/utils.ts")).toBe(true);
    expect(isSafeRepoPath("README.md")).toBe(true);
    expect(isSafeRepoPath("packages/core/src/index.ts")).toBe(true);
    expect(isSafeRepoPath(".prettierrc")).toBe(true);
  });

  it("rejects path traversal and empty segments", () => {
    expect(isSafeRepoPath("../etc/passwd")).toBe(false);
    expect(isSafeRepoPath("src/../../secrets.txt")).toBe(false);
    expect(isSafeRepoPath("src/./utils.ts")).toBe(false);
    expect(isSafeRepoPath("src//utils.ts")).toBe(false);
  });

  it("rejects absolute and Windows-style paths", () => {
    expect(isSafeRepoPath("/etc/passwd")).toBe(false);
    expect(isSafeRepoPath("C:\\Windows\\system32\\cmd.exe")).toBe(false);
    expect(isSafeRepoPath("\\\\server\\share\\file.txt")).toBe(false);
    expect(isSafeRepoPath("src\\utils.ts")).toBe(false);
  });

  it("rejects control characters and null bytes", () => {
    expect(isSafeRepoPath("src/evil\u0000.ts")).toBe(false);
    expect(isSafeRepoPath("src/\u001f.ts")).toBe(false);
  });

  it("rejects sensitive files the agent must never touch", () => {
    expect(isSafeRepoPath(".env")).toBe(false);
    expect(isSafeRepoPath("config/.env.production")).toBe(false);
    expect(isSafeRepoPath(".github/workflows/ci.yml")).toBe(false);
    expect(isSafeRepoPath(".git/config")).toBe(false);
    expect(isSafeRepoPath("node_modules/lodash/index.js")).toBe(false);
    expect(isSafeRepoPath("keys/private.pem")).toBe(false);
    expect(isSafeRepoPath(".ssh/id_rsa")).toBe(false);
    expect(isSafeRepoPath(".npmrc")).toBe(false);
  });
});

describe("validateAgentEdit", () => {
  it("accepts a valid update/edit/create/delete", () => {
    expect(
      validateAgentEdit({
        file_path: "src/a.ts",
        action: "update",
        new_content: "x",
      }),
    ).toEqual({
      valid: true,
    });
    expect(
      validateAgentEdit({
        file_path: "src/a.ts",
        action: "create",
        new_content: "x",
      }),
    ).toEqual({
      valid: true,
    });
    expect(
      validateAgentEdit({ file_path: "src/legacy.ts", action: "delete" }),
    ).toEqual({
      valid: true,
    });
  });

  it("rejects unknown / unsafe actions (allow-list)", () => {
    const bad = validateAgentEdit({
      file_path: "a.ts",
      action: "rm -rf /",
      new_content: "x",
    });
    expect(bad.valid).toBe(false);
    if (!bad.valid) expect(bad.reason).toContain("allow-listed");
  });

  it("rejects non-string or empty file paths", () => {
    expect(
      validateAgentEdit({ file_path: "", action: "update", new_content: "x" })
        .valid,
    ).toBe(false);
    expect(
      validateAgentEdit({ file_path: 42, action: "update", new_content: "x" })
        .valid,
    ).toBe(false);
    expect(
      validateAgentEdit({ action: "update", new_content: "x" }).valid,
    ).toBe(false);
  });

  it("rejects dangerous paths even with a valid action", () => {
    expect(
      validateAgentEdit({
        file_path: "../../.env",
        action: "update",
        new_content: "x",
      }).valid,
    ).toBe(false);
    expect(
      validateAgentEdit({
        file_path: ".env",
        action: "create",
        new_content: "x",
      }).valid,
    ).toBe(false);
    expect(
      validateAgentEdit({
        file_path: "C:\\boot.ini",
        action: "update",
        new_content: "x",
      }).valid,
    ).toBe(false);
  });

  it("requires new_content for create/update, not for delete", () => {
    expect(
      validateAgentEdit({
        file_path: "a.ts",
        action: "update",
        new_content: "",
      }).valid,
    ).toBe(false);
    expect(
      validateAgentEdit({
        file_path: "a.ts",
        action: "create",
        new_content: "  ",
      }).valid,
    ).toBe(false);
    expect(
      validateAgentEdit({ file_path: "a.ts", action: "delete" }).valid,
    ).toBe(true);
  });

  it("rejects oversized content", () => {
    expect(
      validateAgentEdit({
        file_path: "a.ts",
        action: "update",
        new_content: "x".repeat(500_001),
      }).valid,
    ).toBe(false);
  });

  it("rejects paths longer than the cap", () => {
    expect(
      validateAgentEdit({
        file_path: `${"a".repeat(MAX_FILE_PATH_LENGTH + 1)}.ts`,
        action: "update",
        new_content: "x",
      }).valid,
    ).toBe(false);
  });
});

describe("validateAgentEdits", () => {
  it("passes through only safe edits and reports the rest", () => {
    const { edits, rejected } = validateAgentEdits([
      { file_path: "src/ok.ts", action: "update", new_content: "fine" },
      { file_path: "../../etc/passwd", action: "update", new_content: "pwned" },
      { file_path: ".env", action: "create", new_content: "SECRET=1" },
      { file_path: "src/legacy.ts", action: "delete" },
      "not-an-object",
    ]);

    expect(edits.map((e) => e.file_path)).toEqual([
      "src/ok.ts",
      "src/legacy.ts",
    ]);
    expect(rejected.map((r) => r.path)).toContain("../../etc/passwd");
    expect(rejected.map((r) => r.path)).toContain(".env");
  });

  it("caps the number of valid edits per plan", () => {
    const many = Array.from({ length: MAX_EDIT_COUNT + 20 }, (_, i) => ({
      file_path: `src/file-${i}.ts`,
      action: "update",
      new_content: "x",
    }));
    const { edits } = validateAgentEdits(many);
    expect(edits.length).toBe(MAX_EDIT_COUNT);
  });

  it("handles a non-array plan gracefully", () => {
    expect(validateAgentEdits(undefined)).toEqual({ edits: [], rejected: [] });
    expect(validateAgentEdits("junk")).toEqual({ edits: [], rejected: [] });
  });
});
