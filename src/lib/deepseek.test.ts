import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_DEEPSEEK_MODEL,
  DeepSeekApiError,
  isDeepSeekUnavailable,
  requestDeepSeekChat,
  resolveDeepSeekModel,
  streamDeepSeekChat,
} from "./deepseek";

describe("requestDeepSeekChat", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("streamDeepSeekChat", () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("parses content deltas across chunk boundaries", async () => {
      const encoder = new TextEncoder();
      const payload =
        'data: {"choices":[{"delta":{"content":"{\\"summary\\":"}}]}\n\n' +
        'data: {"choices":[{"delta":{"content":"\\"Fixed.\\"}"}}]}\n\n' +
        "data: [DONE]\n\n";
      const bytes = encoder.encode(payload);
      const responseBody = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(bytes.slice(0, 17));
          controller.enqueue(bytes.slice(17, 49));
          controller.enqueue(bytes.slice(49));
          controller.close();
        },
      });
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(responseBody, {
          status: 200,
          headers: { "content-type": "text/event-stream" },
        }),
      );
      vi.stubGlobal("fetch", fetchMock);

      const deltas: string[] = [];
      for await (const delta of streamDeepSeekChat(
        "deepseek-secret",
        "deepseek-chat",
        [{ role: "user", content: "Fix this code" }],
        0.2,
      )) {
        deltas.push(delta);
      }

      expect(deltas).toEqual(['{"summary":', '"Fixed."}']);
      expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
        model: "deepseek-chat",
        stream: true,
        response_format: { type: "json_object" },
      });
    });
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

describe("resolveDeepSeekModel", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults to a model id DeepSeek actually publishes", () => {
    vi.stubEnv("DEEPSEEK_MODEL", "");

    expect(resolveDeepSeekModel()).toBe("deepseek-chat");
    expect(DEFAULT_DEEPSEEK_MODEL).toBe("deepseek-chat");
  });

  it("honours a configured model and ignores blank overrides", () => {
    vi.stubEnv("DEEPSEEK_MODEL", "deepseek-reasoner");
    expect(resolveDeepSeekModel()).toBe("deepseek-reasoner");

    vi.stubEnv("DEEPSEEK_MODEL", "   ");
    expect(resolveDeepSeekModel()).toBe(DEFAULT_DEEPSEEK_MODEL);
  });
});
