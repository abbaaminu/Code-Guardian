// Single entry point for the local (non-AI) SAST pass. Dispatches to the real
// AST + taint engine for JS/TS/JSX/TSX, and falls back to the line-based
// heuristic engine for everything else. See ast-sast-engine.ts and
// heuristic-sast-engine.ts for the implementations and the reasoning.

import { runAstSAST, isAstSupported, type LocalVuln } from "./ast-sast-engine";
import { runHeuristicSAST } from "./heuristic-sast-engine";
import { withEngineTiming } from "./telemetry/sentry";

export type { LocalVuln } from "./ast-sast-engine";

// Async because the AST engine lazily `import()`s the TypeScript compiler — see
// the loading note in ast-sast-engine.ts for why the specifier has to stay
// statically visible to the bundler.
export async function runLocalSAST(
  sourceCode: string,
  fileType = "",
): Promise<LocalVuln[]> {
  if (isAstSupported(fileType)) {
    try {
      return await withEngineTiming("ast", () =>
        runAstSAST(sourceCode, fileType),
      );
    } catch {
      // Malformed/partial source (e.g. a fragment pulled from a larger repo scan)
      // shouldn't take down the whole scan — fall back to heuristics for this file.
      return withEngineTiming("heuristic", () => runHeuristicSAST(sourceCode));
    }
  }
  return withEngineTiming("heuristic", () => runHeuristicSAST(sourceCode));
}
