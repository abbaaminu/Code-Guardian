// Single entry point for the local (non-AI) SAST pass. Dispatches to the real
// AST + taint engine for JS/TS/JSX/TSX, and falls back to the line-based
// heuristic engine for everything else. See ast-sast-engine.ts and
// heuristic-sast-engine.ts for the implementations and the reasoning.

import { runAstSAST, isAstSupported, type LocalVuln } from "./ast-sast-engine";
import { runHeuristicSAST } from "./heuristic-sast-engine";

export type { LocalVuln } from "./ast-sast-engine";

export function runLocalSAST(sourceCode: string, fileType = ""): LocalVuln[] {
  if (isAstSupported(fileType)) {
    try {
      return runAstSAST(sourceCode, fileType);
    } catch {
      // Malformed/partial source (e.g. a fragment pulled from a larger repo scan)
      // shouldn't take down the whole scan — fall back to heuristics for this file.
      return runHeuristicSAST(sourceCode);
    }
  }
  return runHeuristicSAST(sourceCode);
}
