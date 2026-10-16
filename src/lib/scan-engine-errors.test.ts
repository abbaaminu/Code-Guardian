import { afterEach, describe, expect, it, vi } from "vitest";
import {
  NETWORK_CONNECTION_ERROR,
  withScanEngineError,
} from "./scan-engine-errors";

describe("withScanEngineError", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("formats failed fetch errors and logs the endpoint", async () => {
    const error = new TypeError("Failed to fetch");
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      withScanEngineError("DeepSeek chat completions (deepseek-chat)", () =>
        Promise.reject(error),
      ),
    ).rejects.toThrow(NETWORK_CONNECTION_ERROR);
    expect(log).toHaveBeenCalledWith("[Scan Engine Error]", error, {
      endpoint: "DeepSeek chat completions (deepseek-chat)",
    });
  });

  it("rethrows non-network errors unchanged", async () => {
    const error = new Error("Upstream returned an error");
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      withScanEngineError("Supabase RPC increment_audit_usage", () =>
        Promise.reject(error),
      ),
    ).rejects.toBe(error);
  });
});
