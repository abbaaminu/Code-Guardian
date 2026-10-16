import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DeepSeekApiError,
  isDeepSeekUnavailable,
  requestDeepSeekChat,
} from "./deepseek";

describe("requestDeepSeekChat", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses the OpenAI-compatible chat endpoint and parses the first choice", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: '{"vulnerabilities":[]}' } }],
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      requestDeepSeekChat(
        "deepseek-secret",
        "deepseek-chat",
        [
          { role: "system", content: "System prompt" },
          { role: "user", content: "User prompt" },
        ],
        0.2,
      ),
    ).resolves.toBe('{"vulnerabilities":[]}');

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.deepseek.com/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer deepseek-secret",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            { role: "system", content: "System prompt" },
            { role: "user", content: "User prompt" },
          ],
          response_format: { type: "json_object" },
          temperature: 0.2,
        }),
      }),
    );
  });

  it.each([429, 503])(
    "identifies HTTP %s as a graceful audit fallback condition",
    async (status) => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(
            new Response("temporarily unavailable", { status }),
          ),
      );
      vi.spyOn(console, "error").mockImplementation(() => {});

      const request = requestDeepSeekChat(
        "deepseek-secret",
        "deepseek-chat",
        [{ role: "user", content: "Run audit" }],
        0.2,
      );
      await expect(request).rejects.toBeInstanceOf(DeepSeekApiError);
      await expect(request).rejects.toSatisfy(isDeepSeekUnavailable);
    },
  );

  it("does not classify unrelated errors as rate limits or outages", () => {
    expect(
      isDeepSeekUnavailable(new DeepSeekApiError(500, "server error")),
    ).toBe(false);
    expect(isDeepSeekUnavailable(new Error("network error"))).toBe(false);
  });
});
