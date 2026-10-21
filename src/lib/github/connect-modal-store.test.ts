import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  closeConnectGithubModal,
  isConnectGithubModalOpen,
  openConnectGithubModal,
  subscribeToConnectGithubModal,
} from "./connect-modal-store";

// The store is module-scoped, so every test starts from the closed state to
// avoid leaking `isOpen`/listeners between cases.
beforeEach(() => {
  closeConnectGithubModal();
});

describe("connect modal store", () => {
  it("starts closed", () => {
    expect(isConnectGithubModalOpen()).toBe(false);
  });

  it("opens and notifies subscribers exactly once", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToConnectGithubModal(listener);

    openConnectGithubModal();

    expect(isConnectGithubModalOpen()).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);

    // Re-opening an already-open modal is a no-op (no extra renders).
    openConnectGithubModal();
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
  });

  it("closes and notifies subscribers exactly once", () => {
    openConnectGithubModal();

    const listener = vi.fn();
    const unsubscribe = subscribeToConnectGithubModal(listener);

    closeConnectGithubModal();
    expect(isConnectGithubModalOpen()).toBe(false);
    expect(listener).toHaveBeenCalledTimes(1);

    // Closing an already-closed modal is a no-op.
    closeConnectGithubModal();
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
  });

  it("stops notifying after unsubscribe", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToConnectGithubModal(listener);
    unsubscribe();

    openConnectGithubModal();
    closeConnectGithubModal();

    expect(listener).not.toHaveBeenCalled();
    expect(isConnectGithubModalOpen()).toBe(false);
  });

  it("supports multiple independent subscribers", () => {
    const first = vi.fn();
    const second = vi.fn();
    const unsubscribeFirst = subscribeToConnectGithubModal(first);
    const unsubscribeSecond = subscribeToConnectGithubModal(second);

    openConnectGithubModal();
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);

    unsubscribeFirst();
    closeConnectGithubModal();
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(2);

    unsubscribeSecond();
  });
});
