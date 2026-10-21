// Tiny external store that lets any surface (sidebar, Sonner toast action,
// error handler) open the global "Connect GitHub" modal without threading a
// provider through every route. The modal host lives in `AppShell`, so the
// store works for every authenticated page.
//
// Deliberately module-scoped and dependency-free so toast actions created
// outside React's tree (e.g. `toast.error(..., { action: { onClick } })`) can
// still open the modal.

import { useSyncExternalStore } from "react";

let isOpen = false;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

/**
 * Subscribe outside React. Exported so imperative code and tests can observe
 * changes; components should use `useConnectGithubModalOpen` instead.
 */
export function subscribeToConnectGithubModal(
  listener: () => void,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Current state without React (useful for guard checks and tests). */
export function isConnectGithubModalOpen(): boolean {
  return isOpen;
}

// The server always renders the modal closed; the first client snapshot then
// reflects the real store value, avoiding an SSR/client hydration mismatch.
function getServerSnapshot() {
  return false;
}

export function openConnectGithubModal(): void {
  if (isOpen) return;
  isOpen = true;
  notify();
}

export function closeConnectGithubModal(): void {
  if (!isOpen) return;
  isOpen = false;
  notify();
}

export function useConnectGithubModalOpen(): boolean {
  return useSyncExternalStore(
    subscribeToConnectGithubModal,
    isConnectGithubModalOpen,
    getServerSnapshot,
  );
}
