// Lovable error reporting has been removed from this project.
//
// These exports are intentionally kept as safe no-ops so that any existing
// call sites (route boundaries, error handlers) keep compiling and running
// without throwing. The global `window.__lovableEvents` bridge this module used
// to talk to no longer exists — and should never be reintroduced.

export function reportLovableError(
  _error?: unknown,
  _context?: Record<string, unknown>,
) {}

export function captureException(
  _error?: unknown,
  _context?: Record<string, unknown>,
) {}

export function initLovableErrorReporting() {}
