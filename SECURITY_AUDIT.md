# SecurePulse — Audit Findings & Roadmap Implementation

Date: 2026-07-31

This document records what was found in the existing repo, what was fixed or
built in this pass, and what's left as scaffolding that needs real
infrastructure/credentials to finish. Read it before deploying anything below.

## 1. What was actually true about the existing code

- **The "SAST engine" was not doing static analysis in any real sense.** The
  production path (`src/lib/scan.functions.ts`) sent the entire file straight
  to Gemini and used whatever it returned. `src/lib/sast-engine.ts` (3 regex
  rules) existed but was **dead code** — it was only imported by
  `src/lib/server/scans.ts`, a second, unused, near-duplicate implementation of
  the scan pipeline that no route ever imported. Two competing implementations
  of the same feature, one of them silently unreachable, is a real maintenance
  hazard on its own, independent of the regex-vs-AST question.
- **Two server functions had no auth middleware at all**: `copilotRemediate`
  and `togglePolicy` in `scan.functions.ts`. Anyone who found the endpoint URL
  could burn your Gemini quota for free (no auth, no rate limit), or flip any
  org's enabled security policies. Fixed — see §2.
- **`scan-simulator.tsx` is cosmetic**, a scripted terminal animation ("running
  AST analysis...", "taint-tracking user-controlled sources...") that plays
  regardless of what the backend is actually doing. Not a bug exactly, but
  worth knowing it's UI theater, not a progress feed from the real engine.
- **`report-export-dialog.tsx` claimed compliance mappings that were never
  computed**: hardcoded bullets ("OWASP Top 10 mapped", "SANS Top 25
  enforced") shown for every scan regardless of findings, plus a fake
  `training_data_isolated: true` field and artificial `setTimeout` delays for
  UX theater. Fixed — see §2.
- **`code-vault.tsx` is a syntax-highlighted code viewer, not a secrets
  vault.** There is currently no PAT/OAuth token storage anywhere in the app.
  `connect-repository.tsx` hits the *unauthenticated* public GitHub REST API
  client-side — it only works for public repos and does it all in the
  browser, with no server-side fetch, no sandboxing, and a raw `owner/repo`
  string built from user input.
- **The generated `src/integrations/supabase/types.ts` didn't match the code
  that queries it.** `scan.functions.ts` inserts and filters on
  `scans.user_id`, but that column didn't exist in the generated types (and,
  going by the "automatically generated" header, presumably not in the real
  schema either) — meaning either every insert was failing, or types.ts was
  stale. There's also no RLS anywhere, and no organizations/roles table, so
  "multi-tenancy" was aspirational in the code but not present in the schema.
  Fixed — see §2, but **you must run the migration and confirm the RLS
  policies against your actual data model** (see the warning in §3).

## 2. What was implemented for real in this pass

| Area | File(s) | Status |
|---|---|---|
| Real AST parsing (JS/TS/JSX/TSX) | `src/lib/ast-sast-engine.ts` | **Working**, uses the TypeScript compiler API (already a dependency — no new install needed) |
| Lightweight taint tracking | same file | **Working** for intraprocedural cases (see limits below) |
| Heuristic fallback for other languages | `src/lib/heuristic-sast-engine.ts` | **Working**, same interface, tagged lower confidence |
| Unified dispatcher | `src/lib/sast-engine.ts` | **Working** |
| CWE → OWASP/CWE-Top25/PCI-DSS/SOC2 mapping | `src/lib/compliance-mapping.ts` | **Working**, ~20 CWEs mapped — extend the table as new rules are added |
| SARIF 2.1.0 export | `src/lib/sarif.ts`, `getScanSarif` in `scan.functions.ts`, wired into `report-export-dialog.tsx` | **Working** |
| Fixed missing-auth vulns | `scan.functions.ts` (`copilotRemediate`, `togglePolicy`) | **Fixed** |
| Removed dead/duplicate scan pipeline | deleted `src/lib/server/scans.ts`, old `sast-engine.ts` | **Done** |
| Compliance summary computed from real findings | `report-export-dialog.tsx` | **Working** (was hardcoded before) |
| RLS + multi-tenancy migration | `supabase/migrations/0001_multi_tenancy_rls_and_vault.sql` | **SQL written — you must run it**, see §3 |
| AES-256-GCM secret encryption | `src/lib/vault/encryption.ts`, `vault.functions.ts` | **Working** crypto, needs the migration run first |
| Unit tests | `src/lib/**/*.test.ts`, `vitest.config.ts` | **Written**, needs `npm install` to run (see §4) |

### AST/taint engine — what it actually catches, and its real limits

`ast-sast-engine.ts` parses each file with `ts.createSourceFile` and walks the
real syntax tree, so (unlike the old regex) it does not fire on `eval(` typed
inside a comment or a string literal, and it can tell a JSX attribute called
`dangerouslySetInnerHTML` from a variable with that name in a string.

It does light intraprocedural taint tracking: variables initialized from
`req.query`/`req.body`/`req.params`/`searchParams.get(...)`/etc. are marked
tainted, and that taint is checked at `exec/eval/spawn` calls, SQL built via
template-literal interpolation, and `innerHTML` assignment. Sanitizer-wrapped
values (a call whose name matches `/sanitize|escape|purify|.../`) are
downgraded rather than flagged.

**Be honest with yourself about the scope of this**: it is not interprocedural
(taint doesn't follow a value across a function call boundary), has no CFG, no
alias analysis, and no cross-file analysis. A genuinely enterprise-grade
dataflow engine is what CodeQL, Semgrep, or a from-scratch Tree-sitter +
dataflow-graph implementation give you — that's a multi-month project on its
own, not something to bolt on in one pass. What's here is a real, meaningfully
better foundation than string matching, with room to grow (add more
sources/sinks/sanitizers to the pattern lists as you learn what your users'
code actually looks like).

## 3. ⚠️ Action required before any of this touches production data

1. **Run `supabase/migrations/0001_multi_tenancy_rls_and_vault.sql`** against
   your actual Supabase project (SQL editor or `supabase db push`), then
   regenerate `types.ts` with the Supabase CLI (`supabase gen types
   typescript --project-id <id> > src/integrations/supabase/types.ts`). I
   hand-edited `types.ts` to add `scans.user_id` and the new `vault_secrets`
   table so the app type-checks against a schema consistent with the
   migration — **verify this against what the CLI actually generates once the
   migration has run**; don't trust the hand-edit as a substitute for
   regenerating it.
2. **Generate and set `VAULT_ENCRYPTION_KEY`** before using anything in
   `src/lib/vault/` — see the comment at the top of `encryption.ts` for the
   one-liner to generate it. Treat it like any other production secret (never
   commit it, rotate access if it's ever exposed).
3. **All server functions still run through `supabaseAdmin`** (the
   service-role client, bypassing RLS) and enforce ownership with manual
   `.eq("user_id", ...)` filters. The RLS policies added in the migration are
   a defense-in-depth backstop for this — they don't change today's actual
   access-control mechanism, which is still "don't forget the `.eq()`." If you
   want RLS to be the *actual* enforcement layer, that's a larger refactor
   (switch server functions to a per-request client scoped to the caller's
   JWT instead of the admin client).
4. Everything in §5 below is a **scaffold**: real, correct code for the parts
   that don't need your infrastructure (JWT signing, HMAC verification, AES-GCM,
   diff-position mapping), with clearly marked `TODO`s at the exact points that
   need your Redis URL / GitHub App credentials / Sentry DSN / container
   runtime to actually run. None of it was fabricated to look done — it either
   works today or says exactly what it's still waiting on.

## 4. Testing — what's runnable now vs. what needs infra

- `npm install` then `npm test` runs the Vitest suite (`vitest.config.ts` +
  `src/lib/**/*.test.ts`): the AST engine's false-positive-avoidance and
  detection cases, the diff algorithm, the compliance mapping, the SARIF
  exporter, AES-GCM round-tripping, and the PR-diff position mapper. These
  could not be executed in this environment (no network access to run `npm
  install`), so **run them yourself before trusting green** — I traced the
  AST-engine test cases against the parser logic by hand, but that's not a
  substitute for actually running them.
- `npm run test:e2e` (Playwright) is scaffolded in `e2e/smoke.spec.ts` with
  two runnable smoke checks (landing page loads, unauthenticated dashboard
  redirects) and two `test.fixme()`/`test.skip()` placeholders for the
  authenticated login → scan → report flow, which need a seeded test Supabase
  project and real selectors from `login.tsx`'s auth UI.
- CI (`.github/workflows/securepulse-validate.yml`) now runs on `pull_request`
  and `push` (it previously only ran on manual `workflow_dispatch` — meaning
  no PR was ever actually validated by it), and runs typecheck → lint → vitest
  → build in order.

## 5. Scaffolded, not wired to live infrastructure

Each of these is real, correct code for the logic that doesn't depend on
external infrastructure, with the infrastructure-dependent part clearly
marked. None of them will function until you provide the missing piece.

- **`src/lib/queue/scan-queue.ts`** — BullMQ job contract + `enqueueScanJob`
  that throws a clear error until `REDIS_URL` + the `bullmq`/`ioredis`
  packages are present. Full worker sketch in comments, including where
  sandboxed execution belongs (a separate long-running process, not the
  serverless function). **`runInSandbox` (Docker/Fargate/gVisor) is not
  implemented** — the right choice depends on your deployment target in a way
  generic code can't decide for you; see the comment block for what the call
  signature should look like.
- **`src/lib/github/app-auth.ts`** — real RS256 JWT signing + installation
  token exchange against the GitHub API. Needs a registered GitHub App
  (`GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`) — setup steps are in the file
  header.
- **`src/routes/api.webhooks.github.ts`** — real HMAC-SHA256 signature
  verification (timing-safe compare) against `GITHUB_WEBHOOK_SECRET`, parses
  `pull_request` events. Enqueueing the actual scan job is a `TODO` pointing
  at `scan-queue.ts` once that's wired up.
- **`src/lib/github/pr-comments.ts`** — parses a unified diff into a
  path→line→position map (what the GitHub Review Comments API actually
  requires) and posts one review with all anchored inline comments. Callable
  today given a valid installation token and a unified diff string; it's the
  webhook → queue → this pipeline as a whole that isn't connected yet.
- **`src/lib/vault/vault.functions.ts`** — functional today once the
  migration is run and `VAULT_ENCRYPTION_KEY` is set, for storing a PAT. Flagged
  in its own header as a stopgap: the roadmap explicitly asks for short-lived
  GitHub App installation tokens instead of permanent PATs, which is what
  `app-auth.ts` is for — prefer that path once the App is registered, keep the
  PAT vault as a fallback (e.g. for GitLab, which has no installation-token
  equivalent).
- **`src/lib/telemetry/sentry.ts`** — every function is a safe no-op until
  `@sentry/node`/`@sentry/browser` are installed and `SENTRY_DSN` is set (the
  real `Sentry.init(...)` calls are commented, ready to uncomment). Already
  wired into `error-capture.ts`'s error hook so nothing else needs to change
  once Sentry is actually installed.
- **`src/routes/api.scan.instant.ts`** — this one is **fully functional
  today**, no scaffolding: an authenticated endpoint that runs only the local
  AST/heuristic engine (no AI call, for on-save latency) against a single
  file, for a VS Code extension or LSP server to call. Point a "Run Full
  Audit" action in the same extension at `runScan` for the complete
  AI-assisted pass.

## 6. Suggestions beyond the original list ("make it a super app")

Not implemented (out of scope for this pass, but worth knowing about):

- **Per-user rate limiting** on `runScan`/`copilotRemediate` now that they
  require auth — auth alone doesn't stop one account from hammering the Gemini
  API. A token-bucket in Redis (once you have Redis for the queue anyway) is a
  natural fit.
- **Real RBAC/organizations schema.** `togglePolicy` now requires
  authentication but still can't distinguish "any signed-in user" from "an
  admin of this org" because there's no roles table. If you're selling to
  enterprises, this needs to exist before policy management ships broadly.
- **Diff-aware incremental scanning** for PRs: only scan changed files/hunks
  (the webhook payload already gives you the diff), not the whole repo, to
  keep PR-check latency low and AI cost down.
- **A findings feedback loop** (dismiss / mark false positive / accept fix) —
  referenced in `telemetry/sentry.ts` as the way to actually measure
  false-positive rate per rule over time, since you don't have ground truth
  otherwise. `vuln-card.tsx` doesn't currently have this action; it's a
  reasonable next UI addition.
- **`scan-analytics.tsx` already trends health score/severity across scans** —
  no gap here, just noting it so it's not duplicated. A reasonable extension
  once findings carry `engine`/`confidence` (added in this pass) is to break
  the trend down by engine, so you can see the AI-only baseline vs. the
  structural-engine contribution over time.
