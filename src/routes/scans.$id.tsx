import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CodeVault } from "@/components/code-vault";
import { VulnCard, type VulnCardData } from "@/components/vuln-card";
import { WorkspaceActionBar } from "@/components/workspace-action-bar";
import { CopilotChat } from "@/components/copilot-chat";
import type {
  CopilotApplyResult,
  CopilotBatchApplyResult,
  CopilotBatchPatch,
  CopilotFindingTarget,
  CopilotFixAllFinding,
} from "@/components/copilot-chat";
import {
  RouteErrorFallback,
  RoutePendingFallback,
} from "@/components/route-boundaries";
import { RequireAuth } from "@/components/require-auth";
import { useScanReportQuery } from "@/hooks/use-scan-queries";
import { toast } from "sonner";
import {
  ArrowLeft,
  GitPullRequest,
  Loader2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { SEVERITIES } from "@/lib/severity";
import { applyVulnerabilityPatch } from "@/lib/scan-patch";
import {
  authorizeGithubRepository,
  createRemediationPullRequest,
} from "@/lib/github/patch.functions";
import { openConnectGithubModal } from "@/lib/github/connect-modal-store";
import { isMissingGithubCredentialError } from "@/lib/github/connect-error";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";

export interface ScanReportLoaderData {
  scanId: string;
}

/** One patch applied to the live workspace, anchored to original line numbers. */
type AppliedPatchRecord = {
  startLine: number;
  endLine: number;
  replacementLineCount: number;
};

/**
 * In-memory workspace used to thread a batch of patches through one commit.
 * Every patch shifts later line numbers, so sequential applies must share the
 * same code + ledger instead of re-reading React state (which lags a render).
 */
interface EditorDraft {
  code: string;
  patches: Record<string, AppliedPatchRecord>;
}

/** Result of writing a finding's suggested fix into the live workspace code. */
type PatchApplication =
  | {
      ok: true;
      startLine: number;
      endLine: number;
      replacementLineCount: number;
      /** Workspace state after this patch, for the next patch in a batch. */
      draft: EditorDraft;
    }
  | { ok: false; reason: string };

export const Route = createFileRoute("/scans/$id")({
  head: ({ params }: { params: { id: string } }) => ({
    meta: [
      { title: `Audit ${params.id.slice(0, 8)} · SecurePulse` },
      {
        name: "description",
        content:
          "Interactive code audit workspace with AI-suggested patches and side-by-side diffs.",
      },
    ],
  }),
  // Reject malformed scan ids before any fetch.
  params: {
    parse: ({ id }) => {
      const parsedId = z.string().uuid().safeParse(id);
      if (!parsedId.success) throw notFound();
      return { id: parsedId.data };
    },
  },
  loader: async ({ params }): Promise<ScanReportLoaderData> => ({
    scanId: params.id,
  }),
  component: ScanReport,
  errorComponent: RouteErrorFallback,
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-bold text-primary">Scan not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This audit doesn't exist or may have been deleted.
        </p>
        <div className="mt-6">
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  ),
  pendingComponent: RoutePendingFallback,
  pendingMs: 300,
});

function ScanReport() {
  const { scanId } = Route.useLoaderData();
  const authorizeRepository = useServerFn(authorizeGithubRepository);
  const createGithubPullRequest = useServerFn(createRemediationPullRequest);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [applied, setApplied] = useState<Record<string, boolean>>({});
  const [appliedPatches, setAppliedPatches] = useState<
    Record<string, AppliedPatchRecord>
  >({});
  const [flashLines, setFlashLines] = useState<Set<number>>(new Set());
  const [liveCode, setLiveCode] = useState<string | null>(null);
  const [creatingPullRequest, setCreatingPullRequest] = useState(false);
  const [submittedPatchIds, setSubmittedPatchIds] = useState<Set<string>>(
    new Set(),
  );
  const [pullRequestUrl, setPullRequestUrl] = useState<string | null>(null);
  // "Fix with Copilot" target + signal (re-clicking the same card scrolls and
  // refocuses the composer) live here so the card and panel stay decoupled.
  const [copilotFinding, setCopilotFinding] =
    useState<CopilotFindingTarget | null>(null);
  const [copilotFocusSignal, setCopilotFocusSignal] = useState(0);
  // Header "Fix All Findings with AI" trigger for the panel.
  const [copilotFixAllSignal, setCopilotFixAllSignal] = useState(0);
  const copilotSectionRef = useRef<HTMLElement>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const { data, isLoading, isError, refetch } = useScanReportQuery(scanId);

  const highlights = useMemo(() => {
    if (!data) return [];
    return data.vulns.flatMap((v) => {
      if (!v.line_start || !v.line_end) return [];

      const ownPatch = appliedPatches[v.id];
      const overlappingPatch = Object.entries(appliedPatches).some(
        ([id, patch]) =>
          id !== v.id &&
          patch.startLine <= v.line_end! &&
          patch.endLine >= v.line_start!,
      );
      if (overlappingPatch) return [];

      const precedingPatches = Object.entries(appliedPatches)
        .filter(([id, patch]) => id !== v.id && patch.endLine < v.line_start!)
        .reduce(
          (lines, [, patch]) =>
            lines +
            patch.replacementLineCount -
            (patch.endLine - patch.startLine + 1),
          0,
        );
      const start = v.line_start + precedingPatches;
      return [
        {
          start,
          end: ownPatch
            ? start + ownPatch.replacementLineCount - 1
            : v.line_end + precedingPatches,
          severity: v.severity,
          vulnId: v.id,
        },
      ];
    });
  }, [appliedPatches, data]);

  const patchedLines = useMemo(() => {
    const lines = new Set<number>();
    for (const patch of Object.values(appliedPatches)) {
      const precedingPatches = Object.values(appliedPatches)
        .filter((other) => other !== patch && other.endLine < patch.startLine)
        .reduce(
          (count, other) =>
            count +
            other.replacementLineCount -
            (other.endLine - other.startLine + 1),
          0,
        );
      const start = patch.startLine + precedingPatches;
      for (
        let line = start;
        line < start + patch.replacementLineCount;
        line++
      ) {
        lines.add(line);
      }
    }
    return lines;
  }, [appliedPatches]);

  /**
   * Every unpatched finding in the scan, in report order. Copilot's "Fix All
   * Findings with AI" sends this entire array so one batch covers the workspace
   * instead of only the currently selected card.
   */
  const copilotFindings = useMemo<CopilotFixAllFinding[]>(() => {
    if (!data) return [];
    return data.vulns
      .filter((finding) => !applied[finding.id])
      .map((finding) => ({
        vulnerabilityId: finding.id,
        title: finding.title,
        severity: finding.severity,
        cwe: finding.cwe_id,
        filePath: finding.file_path,
        vulnerableCode: finding.vulnerable_code_block,
        fixedCode: finding.fixed_code_block,
        startLine: finding.line_start,
        endLine: finding.line_end,
        remediation: finding.remediation_steps,
      }));
  }, [applied, data]);

  if (isLoading || !data) {
    // Keep the shell frame consistent while the report loads; hard failures get
    // a retry action instead of a perpetual spinner.
    if (isError && !data) {
      return (
        <RequireAuth>
          <AppShell title="Audit workspace">
            <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-10 text-center">
              <p className="text-sm font-medium">
                Couldn't load this scan report.
              </p>
              <p className="text-xs text-muted-foreground">
                The scan may have been removed, or your session expired.
              </p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Try again
              </Button>
            </div>
          </AppShell>
        </RequireAuth>
      );
    }
    return (
      <RequireAuth>
        <AppShell title="Audit workspace">
          <div className="p-10 text-sm text-muted-foreground">
            Loading report…
          </div>
        </AppShell>
      </RequireAuth>
    );
  }

  const { scan, vulns } = data;
  const displayedCode = liveCode ?? scan.source_code ?? "";

  const handleLineClick = (vulnId: string) => {
    setActiveId(vulnId);
    requestAnimationFrame(() => {
      cardRefs.current[vulnId]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  };

  const handleToggle = (vulnId: string) => {
    setActiveId((cur) => (cur === vulnId ? null : vulnId));
  };

  /**
   * Writes a finding's suggested fix into the live source and records the
   * applied patch, so highlights, the pending-PR batch and the Copilot panel
   * stay in sync. Shared by "Apply Patch", Copilot's "Apply Fix & Resolve" and
   * the batch "Fix All & Apply Patches" turn.
   *
   * `draft` is passed by the batch handler: it applies every patch against one
   * evolving copy and commits once at the end, because line offsets change with
   * each patch and React state would still hold the pre-batch values.
   */
  const applyFindingToEditor = (
    v: VulnCardData,
    draft?: EditorDraft,
  ): PatchApplication => {
    const sourceCode = draft?.code ?? displayedCode;
    const patches = draft?.patches ?? appliedPatches;

    if (!v.line_start || !v.line_end) {
      return {
        ok: false,
        reason: "No valid line range is available for this finding.",
      };
    }

    if (
      Object.values(patches).some(
        (patch) =>
          patch.startLine <= v.line_end! && patch.endLine >= v.line_start!,
      )
    ) {
      return {
        ok: false,
        reason:
          "This finding overlaps a patch already applied. Start again from the original source to avoid overwriting changes.",
      };
    }

    const precedingPatches = Object.values(patches)
      .filter((patch) => patch.endLine < v.line_start!)
      .reduce(
        (lines, patch) =>
          lines +
          patch.replacementLineCount -
          (patch.endLine - patch.startLine + 1),
        0,
      );
    const startLine = v.line_start + precedingPatches;
    const endLine = v.line_end + precedingPatches;
    const result = applyVulnerabilityPatch(
      sourceCode,
      v.vulnerable_code_block,
      v.fixed_code_block,
      startLine,
      endLine,
    );
    if (!result.success) return { ok: false, reason: result.reason };

    const nextDraft: EditorDraft = {
      code: result.code,
      patches: {
        ...patches,
        [v.id]: {
          startLine: v.line_start,
          endLine: v.line_end,
          replacementLineCount: result.replacementLineCount,
        },
      },
    };

    if (!draft) {
      setLiveCode(result.code);
      setAppliedPatches(nextDraft.patches);
      setApplied((prev) => ({ ...prev, [v.id]: true }));
      const flash = new Set<number>();
      for (
        let line = startLine;
        line < startLine + result.replacementLineCount;
        line++
      ) {
        flash.add(line);
      }
      setFlashLines(flash);
      setTimeout(() => setFlashLines(new Set()), 1500);
    }

    return {
      ok: true,
      startLine,
      endLine,
      replacementLineCount: result.replacementLineCount,
      draft: nextDraft,
    };
  };

  // Findings staged for the next remediation PR. Declared before the handlers
  // that report the queued count so their closures read a settled value.
  const pendingPatchIds = Object.keys(appliedPatches).filter(
    (id) => !submittedPatchIds.has(id),
  );

  const handleApply = async (v: VulnCardData) => {
    const outcome = applyFindingToEditor(v);
    if (!outcome.ok) {
      toast.error("Patch not applied", { description: outcome.reason });
      return;
    }
    toast.success(
      data.scan.repo_owner && data.scan.repo_name
        ? "Patch staged for GitHub"
        : "Patch applied to displayed source",
      {
        description: `Replaced the vulnerable snippet at lines ${outcome.startLine}-${outcome.endLine}.`,
      },
    );
  };

  /**
   * "Fix with Copilot": preload the chat panel with this finding, expand the
   * card and bring the panel into view. Repeat clicks re-focus the composer
   * through `copilotFocusSignal` even though the target didn't change.
   */
  const handleFixWithCopilot = (v: VulnCardData) => {
    setCopilotFinding({
      vulnerabilityId: v.id,
      title: v.title,
      severity: v.severity,
      filePath: v.file_path,
      vulnerableCode: v.vulnerable_code_block,
      fixedCode: v.fixed_code_block,
      startLine: v.line_start,
      endLine: v.line_end,
    });
    setActiveId(v.id);
    setCopilotFocusSignal((signal) => signal + 1);
    requestAnimationFrame(() => {
      copilotSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    });
  };

  /**
   * "Apply Fix & Resolve" from the Copilot panel. Applies the same validated
   * patch path as the card (overlap + anchor checks included) and reports the
   * queued count so the panel can confirm the pending remediation PR batch.
   */
  const handleApplyFindingFromCopilot = (
    target: CopilotFindingTarget,
  ): CopilotApplyResult => {
    const finding = vulns.find((v) => v.id === target.vulnerabilityId);
    if (!finding) {
      return {
        ok: false,
        description:
          "This finding is no longer part of the loaded report. Refresh the workspace and try again.",
      };
    }
    if (applied[finding.id]) {
      return {
        ok: true,
        description: `${finding.title} is already patched.`,
        pendingCount: pendingPatchIds.length,
      };
    }
    const outcome = applyFindingToEditor(finding);
    if (!outcome.ok) return { ok: false, description: outcome.reason };

    const appliedMessage = `Lines ${outcome.startLine}-${outcome.endLine} replaced in the live code.`;
    // A finding that was already part of a submitted PR doesn't add to the next
    // batch — `pendingPatchIds` deliberately excludes submitted findings.
    const pendingCount = submittedPatchIds.has(finding.id)
      ? pendingPatchIds.length
      : pendingPatchIds.length + 1;
    return {
      ok: true,
      description: appliedMessage,
      pendingCount,
    };
  };

  /**
   * "Fix All & Apply Patches" from Copilot. Applies every AI patch through the
   * same validated patch path as a single finding, carrying one draft forward so
   * earlier patches shift the anchors for later ones, then marks all applied
   * findings patched and stages them for the remediation PR.
   */
  const handleApplyAllFixesFromCopilot = (
    patches: CopilotBatchPatch[],
  ): CopilotBatchApplyResult => {
    const failures: CopilotBatchApplyResult["failures"] = [];
    const ordered: { patch: CopilotBatchPatch; finding: VulnCardData }[] = [];
    const seen = new Set<string>();

    for (const patch of patches) {
      const id = patch.vulnerabilityId;
      if (!id || seen.has(id)) continue;
      seen.add(id);

      const finding = vulns.find((v) => v.id === id);
      if (!finding) {
        failures.push({
          vulnerabilityId: id,
          reason:
            "This finding is no longer part of the loaded report. Refresh the workspace and try again.",
        });
        continue;
      }
      ordered.push({ patch, finding });
    }

    // Apply top-down so each finding's original line range is still valid once
    // the preceding (already applied) patches have shifted it.
    ordered.sort(
      (a, b) => (a.finding.line_start ?? 0) - (b.finding.line_start ?? 0),
    );

    let draft: EditorDraft = {
      code: displayedCode,
      patches: { ...appliedPatches },
    };
    const appliedIds: string[] = [];
    const skippedIds: string[] = [];
    const flash = new Set<number>();

    for (const { patch, finding } of ordered) {
      if (draft.patches[finding.id]) {
        skippedIds.push(finding.id);
        continue;
      }

      const aiFix = patch.fixedCode?.trim();
      let outcome: PatchApplication = aiFix
        ? applyFindingToEditor(
            { ...finding, fixed_code_block: patch.fixedCode },
            draft,
          )
        : {
            ok: false,
            reason: "DeepSeek returned no replacement code.",
          };

      // The AI replacement can miss the anchor (e.g. it re-indented the block).
      // The finding's own scan-validated remediation is the safe fallback.
      if (!outcome.ok && patch.fixedCode !== finding.fixed_code_block) {
        const fallback = applyFindingToEditor(finding, draft);
        if (fallback.ok) outcome = fallback;
      }

      if (!outcome.ok) {
        failures.push({
          vulnerabilityId: finding.id,
          title: finding.title,
          reason: outcome.reason,
        });
        continue;
      }

      appliedIds.push(finding.id);
      draft = outcome.draft;
      for (
        let line = outcome.startLine;
        line < outcome.startLine + outcome.replacementLineCount;
        line++
      ) {
        flash.add(line);
      }
    }

    if (appliedIds.length > 0) {
      setLiveCode(draft.code);
      setAppliedPatches(draft.patches);
      setApplied((prev) => {
        const next = { ...prev };
        for (const id of appliedIds) next[id] = true;
        return next;
      });
      if (flash.size > 0) {
        setFlashLines(new Set(flash));
        setTimeout(() => setFlashLines(new Set()), 1500);
      }
    }

    const newlyStaged = appliedIds.filter((id) => !submittedPatchIds.has(id));
    const pendingCount = new Set([...pendingPatchIds, ...newlyStaged]).size;
    const skippedNote =
      skippedIds.length > 0
        ? ` ${skippedIds.length} finding${skippedIds.length === 1 ? " was" : "s were"} already patched.`
        : "";

    return {
      ok: appliedIds.length > 0,
      applied: appliedIds.length,
      failed: failures.length,
      total: patches.length,
      pendingCount,
      description:
        appliedIds.length > 0
          ? `${appliedIds.length} of ${patches.length} patch${
              patches.length === 1 ? "" : "es"
            } applied to the live workspace.${skippedNote}`
          : (failures[0]?.reason ??
            "No unpatched findings were available to patch."),
      ...(failures.length > 0 ? { failures } : {}),
    };
  };

  /**
   * Header "Fix All Findings with AI": clears any single-finding target, asks
   * the panel to start the batch turn with the entire unpatched set, and brings
   * the panel into view.
   */
  const handleFixAllWithCopilot = () => {
    if (copilotFindings.length === 0) {
      toast.info("No unpatched findings", {
        description: "Every finding in this scan is already patched.",
      });
      return;
    }
    setCopilotFinding(null);
    setCopilotFixAllSignal((signal) => signal + 1);
    requestAnimationFrame(() => {
      copilotSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    });
  };

  const appliedCount = Object.values(applied).filter(Boolean).length;
  const isRepositoryScan = Boolean(data.scan.repo_owner && data.scan.repo_name);

  const handleCreateRemediationPullRequest = async () => {
    if (
      !data.scan.repo_owner ||
      !data.scan.repo_name ||
      pendingPatchIds.length === 0 ||
      creatingPullRequest
    ) {
      return;
    }

    setCreatingPullRequest(true);
    const toastId = toast.loading("Preparing GitHub remediation PR…");
    try {
      await authorizeRepository({
        data: {
          scanId,
          owner: data.scan.repo_owner,
          repo: data.scan.repo_name,
        },
      });
      const result = await createGithubPullRequest({
        data: {
          scanId,
          owner: data.scan.repo_owner,
          repo: data.scan.repo_name,
          vulnerabilityIds: pendingPatchIds,
        },
      });
      setSubmittedPatchIds((previous) => {
        const updated = new Set(previous);
        for (const id of result.vulnerabilityIds) updated.add(id);
        return updated;
      });
      setPullRequestUrl(result.pullRequestUrl);
      toast.success("Remediation pull request created", {
        id: toastId,
        description: `${result.files.length} file${result.files.length === 1 ? "" : "s"} committed on ${result.branchName}.`,
        ...(result.pullRequestUrl
          ? {
              action: {
                label: "View PR",
                onClick: () =>
                  window.open(
                    result.pullRequestUrl,
                    "_blank",
                    "noopener,noreferrer",
                  ),
              },
            }
          : {}),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Please try again.";
      // Missing/expired vault credentials are user-fixable: offer the inline
      // Connect GitHub flow instead of a dead-end error.
      const needsGithubCredential = isMissingGithubCredentialError(message);
      toast.error(
        needsGithubCredential
          ? "Connect GitHub to create remediation PRs"
          : "Could not create remediation pull request",
        {
          id: toastId,
          description: message,
          ...(needsGithubCredential
            ? {
                action: {
                  label: "Connect GitHub",
                  onClick: () => openConnectGithubModal(),
                },
                duration: 12000,
              }
            : {}),
        },
      );
    } finally {
      setCreatingPullRequest(false);
    }
  };
  const selectedVulnerability = vulns.find((v) => v.id === activeId);
  const copilotContext = selectedVulnerability
    ? [
        `Selected finding: ${selectedVulnerability.title}`,
        `Severity: ${selectedVulnerability.severity}`,
        selectedVulnerability.cwe_id
          ? `CWE: ${selectedVulnerability.cwe_id}`
          : "",
        selectedVulnerability.file_path
          ? `File: ${selectedVulnerability.file_path}`
          : "",
        selectedVulnerability.line_start && selectedVulnerability.line_end
          ? `Lines: ${selectedVulnerability.line_start}-${selectedVulnerability.line_end}`
          : "",
        `Remediation guidance: ${selectedVulnerability.remediation_steps}`,
        `Vulnerable code:\n${selectedVulnerability.vulnerable_code_block}`,
        `Suggested fix:\n${selectedVulnerability.fixed_code_block}`,
      ]
        .filter(Boolean)
        .join("\n")
        .slice(0, 12000)
    : undefined;

  return (
    <RequireAuth>
      <AppShell
        title={scan.project_name}
        subtitle={`${scan.file_type} · ${new Date(scan.created_at).toLocaleString()} · ${vulns.length} findings`}
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link to="/dashboard">
              <ArrowLeft className="mr-1 h-3.5 w-3.5" />
              Dashboard
            </Link>
          </Button>
        }
      >
        <div className="grid gap-3 p-3 xl:grid-cols-[minmax(0,1fr)_minmax(340px,380px)_minmax(380px,440px)] lg:grid-cols-[minmax(0,1fr)_minmax(380px,440px)]">
          {/* LEFT — Code Vault */}
          <section className="min-w-0">
            <CodeVault
              code={displayedCode || "// (no source available)"}
              highlights={highlights}
              activeVulnId={activeId}
              patchedLines={new Set([...patchedLines, ...flashLines])}
              onLineClick={handleLineClick}
            />
          </section>

          {/* MIDDLE — AI Copilot Chat */}
          <section
            ref={copilotSectionRef}
            className="min-w-0 h-[calc(100vh-3.5rem)]"
          >
            <CopilotChat
              sourceCode={displayedCode}
              fileType={scan.file_type}
              context={copilotContext}
              activeFinding={copilotFinding}
              activeFindingApplied={
                copilotFinding
                  ? !!applied[copilotFinding.vulnerabilityId]
                  : false
              }
              pendingPatchCount={pendingPatchIds.length}
              focusSignal={copilotFocusSignal}
              findings={copilotFindings}
              fixAllSignal={copilotFixAllSignal}
              onClearFinding={() => setCopilotFinding(null)}
              onApplyFindingFix={handleApplyFindingFromCopilot}
              onApplyAllFixes={handleApplyAllFixesFromCopilot}
              onApplyCode={(code) => {
                setLiveCode(code);
                setApplied({});
                setAppliedPatches({});
                setSubmittedPatchIds(new Set());
                setPullRequestUrl(null);
                setFlashLines(new Set());
              }}
            />
          </section>

          {/* RIGHT — Actionable Audit Panel */}
          <aside className="flex min-h-0 flex-col gap-3">
            <Card className="border-primary/30 bg-gradient-to-br from-card to-card/50 p-4 glow-primary">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Integrity Score
                  </div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-3xl font-bold tabular-nums text-primary">
                      {scan.health_score}
                    </span>
                    <span className="text-xs text-muted-foreground">/ 100</span>
                  </div>
                </div>
                <ShieldCheck className="h-8 w-8 text-primary" />
              </div>
              <div className="mt-3 grid grid-cols-4 gap-1.5 text-center">
                {SEVERITIES.map((s) => (
                  <div
                    key={s}
                    className="rounded-md border border-border/60 bg-muted/20 py-1.5"
                  >
                    <div className="text-sm font-bold tabular-nums">
                      {scan.vulnerabilities_count?.[s] ?? 0}
                    </div>
                    <div className="text-[9px] uppercase tracking-widest text-muted-foreground">
                      {s}
                    </div>
                  </div>
                ))}
              </div>
              {appliedCount > 0 && (
                <div className="mt-3 flex items-center gap-2 rounded-md border border-low/40 bg-low/10 px-2.5 py-1.5 text-[11px] text-low animate-fade-in">
                  <Sparkles className="h-3.5 w-3.5" />
                  {appliedCount} patch{appliedCount === 1 ? "" : "es"} applied
                </div>
              )}
            </Card>

            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <div>
                <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Findings ({vulns.length})
                </h2>
                <span className="text-[10px] text-muted-foreground">
                  click a line to inspect
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary"
                  disabled={copilotFindings.length === 0}
                  onClick={handleFixAllWithCopilot}
                  title={
                    copilotFindings.length === 0
                      ? "Every finding in this scan is already patched"
                      : "Generate and apply AI patches for every unpatched finding"
                  }
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Fix All Findings with AI ({copilotFindings.length})
                </Button>
                {isRepositoryScan && (
                  <div className="flex items-center gap-2">
                    {pullRequestUrl && pendingPatchIds.length === 0 && (
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="h-8"
                      >
                        <a
                          href={pullRequestUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <GitPullRequest className="mr-1.5 h-3.5 w-3.5" />
                          View PR
                        </a>
                      </Button>
                    )}
                    <Button
                      size="sm"
                      className="h-8 gap-1.5"
                      disabled={
                        pendingPatchIds.length === 0 || creatingPullRequest
                      }
                      onClick={() => void handleCreateRemediationPullRequest()}
                    >
                      {creatingPullRequest ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <GitPullRequest className="h-3.5 w-3.5" />
                      )}
                      {creatingPullRequest
                        ? "Creating PR…"
                        : `Create Remediation PR (${pendingPatchIds.length})`}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 space-y-3 overflow-auto pb-6 pr-1">
              {vulns.length === 0 ? (
                <Card className="border-low/40 bg-low/5 p-8 text-center">
                  <ShieldCheck className="mx-auto h-12 w-12 text-low" />
                  <div className="mt-3 text-sm font-medium">All clear</div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    No vulnerabilities detected.
                  </p>
                </Card>
              ) : (
                vulns.map((v) => (
                  <VulnCard
                    key={v.id}
                    ref={(el) => {
                      cardRefs.current[v.id] = el;
                    }}
                    vuln={v}
                    expanded={activeId === v.id}
                    applied={!!applied[v.id]}
                    onToggle={() => handleToggle(v.id)}
                    onApply={() => handleApply(v)}
                    onFixWithCopilot={handleFixWithCopilot}
                  />
                ))
              )}
            </div>
          </aside>
        </div>
        <WorkspaceActionBar
          scanId={scan.id}
          projectName={scan.project_name}
          appliedCount={appliedCount}
          totalFindings={vulns.length}
          onRefresh={refetch}
        />
      </AppShell>
    </RequireAuth>
  );
}
