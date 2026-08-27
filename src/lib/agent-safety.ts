// Safety validation for AI-proposed repository mutations (H1).
//
// The autonomous agent (agent.functions.ts) takes an instruction, asks Gemini
// for a remediation plan, and then writes the plan's edits to a real GitHub
// repository through the Git Trees API. That is a lot of trust to put in an
// LLM's free-text output, so every edit is validated *before* any blob, tree,
// or ref is created:
//
//   - `action` must come from a strict allow-list (update / create / delete).
//   - `file_path` must be a safe relative repo path (no traversal, no absolute
//     paths, no Windows separators, no control characters, no sensitive files).
//   - `new_content` must be present and size-capped for create/update edits.
//   - The number of edits per plan is capped.
//
// These are pure functions so they can be unit-tested without a server runtime.

export type AgentFileAction = "update" | "create" | "delete";

export interface SafeAgentEdit {
  file_path: string;
  new_content: string;
  action: AgentFileAction;
}

export const ALLOWED_ACTIONS: readonly AgentFileAction[] = [
  "update",
  "create",
  "delete",
];

/** Hard cap on the number of edits applied per agent run. */
export const MAX_EDIT_COUNT = 50;
/** Hard cap on a single file path length (GitHub's own limit is ~4096 bytes). */
export const MAX_FILE_PATH_LENGTH = 512;
/** Hard cap on the content of a single new/modified file (GitHub blobs are ≤100MB; keep AI writes sane). */
export const MAX_NEW_CONTENT_LENGTH = 500_000;

/**
 * Files the agent must never create/update/delete. These are secrets,
 * credentials, git internals, CI definitions, and generated dependency trees —
 * mutating them (or being tricked into doing so) is exactly the "unsafe repo
 * mutation" class the audit flagged.
 */
const SENSITIVE_PATH_PATTERNS: RegExp[] = [
  /(^|\/)\.git($|\/)/,
  /(^|\/)\.github($|\/)/,
  /(^|\/)node_modules($|\/)/,
  /(^|\/)\.env(\.[a-zA-Z0-9_]+)?$/,
  /(^|\/)\.npmrc$/,
  /(^|\/)\.yarnrc$/,
  /(^|\/)\.pypirc$/,
  /(^|\/)\.htpasswd$/,
  /(^|\/)\.netrc$/,
  /(^|\/)\.gitconfig$/,
  /(^|\/)\.git-credentials$/,
  /(^|\/)\.ssh($|\/)/,
  /(^|\/)\.aws($|\/)/,
  /(^|\/)\.azure($|\/)/,
  /(^|\/)\.config\/gcloud($|\/)/,
  /(^|\/)id_rsa$|id_ed25519$|id_dsa$/,
  /(^|\/)[^/]*\.(pem|key|p12|pfx|jks|keystore|ppk)$/i,
];

/**
 * Returns true only for paths that are safe to write through the Git Trees API:
 * relative, forward-slash separated, no traversal segments, no absolute /
 * drive-letter / UNC paths, no control characters, and not on the sensitive
 * block-list.
 */
export function isSafeRepoPath(filePath: string): boolean {
  if (!filePath || filePath.length > MAX_FILE_PATH_LENGTH) return false;
  if (filePath.includes("\0")) return false;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f]/.test(filePath)) return false;
  // Backslashes are a Windows separator and ambiguous for the Trees API —
  // reject rather than normalize.
  if (filePath.includes("\\")) return false;
  if (filePath.startsWith("/")) return false; // absolute POSIX path
  if (/^[a-zA-Z]:[\\/]/.test(filePath)) return false; // Windows drive letter / UNC
  if (filePath.includes("//")) return false; // empty path segments

  const segments = filePath.split("/");
  for (const segment of segments) {
    if (segment === "" || segment === "." || segment === "..") return false;
  }

  for (const pattern of SENSITIVE_PATH_PATTERNS) {
    if (pattern.test(filePath)) return false;
  }
  return true;
}

export type AgentEditValidation =
  { valid: true } | { valid: false; reason: string };

/**
 * Validates one raw AI-proposed edit. `file_path`/`action`/`new_content` are
 * typed as unknown because they come straight from an LLM's JSON output.
 */
export function validateAgentEdit(edit: unknown): AgentEditValidation {
  if (typeof edit !== "object" || edit === null) {
    return { valid: false, reason: "edit is not an object" };
  }
  const { file_path, action, new_content } = edit as {
    file_path?: unknown;
    action?: unknown;
    new_content?: unknown;
  };

  if (typeof file_path !== "string" || !file_path.trim()) {
    return { valid: false, reason: "missing or invalid file_path" };
  }
  const path = file_path.trim();

  if (
    typeof action !== "string" ||
    !(ALLOWED_ACTIONS as readonly string[]).includes(action)
  ) {
    return {
      valid: false,
      reason: `action '${String(action)}' is not allow-listed`,
    };
  }

  if (path.length > MAX_FILE_PATH_LENGTH) {
    return { valid: false, reason: "file_path exceeds length cap" };
  }
  if (!isSafeRepoPath(path)) {
    return {
      valid: false,
      reason: `file_path '${path}' failed repo safety checks`,
    };
  }

  if (action !== "delete") {
    if (typeof new_content !== "string" || new_content.trim().length === 0) {
      return {
        valid: false,
        reason: "new_content is required for create/update edits",
      };
    }
    if (new_content.length > MAX_NEW_CONTENT_LENGTH) {
      return { valid: false, reason: "new_content exceeds size cap" };
    }
  }

  return { valid: true };
}

export interface RejectedEdit {
  path: string;
  reason: string;
}

export interface AgentEditsValidation {
  /** Validated edits, ready to be applied — capped at MAX_EDIT_COUNT. */
  edits: SafeAgentEdit[];
  /** Edits that were rejected (and why) for logging/visibility. */
  rejected: RejectedEdit[];
}

/**
 * Validates a full plan's edit list. Returns only the safe subset plus a record
 * of what was rejected. Call this BEFORE any GitHub API mutation so a single
 * malicious edit can't create blobs/trees/refs.
 */
export function validateAgentEdits(edits: unknown): AgentEditsValidation {
  const list = Array.isArray(edits) ? edits : [];
  const valid: SafeAgentEdit[] = [];
  const rejected: RejectedEdit[] = [];

  for (const raw of list) {
    if (valid.length >= MAX_EDIT_COUNT) break;

    const result = validateAgentEdit(raw);
    if (result.valid) {
      const e = raw as {
        file_path: string;
        new_content: string;
        action: AgentFileAction;
      };
      valid.push({
        file_path: e.file_path.trim(),
        new_content: e.action === "delete" ? "" : e.new_content,
        action: e.action,
      });
    } else {
      const path =
        typeof raw === "object" &&
        raw !== null &&
        typeof (raw as { file_path?: unknown }).file_path === "string"
          ? (raw as { file_path: string }).file_path.trim()
          : "(unknown)";
      rejected.push({ path, reason: result.reason });
    }
  }

  return { edits: valid, rejected };
}
