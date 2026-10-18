import { withScanEngineError } from "@/lib/scan-engine-errors";

export interface DeepSeekMessage {
  role: "system" | "user";
  content: string;
}

export class DeepSeekApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "DeepSeekApiError";
  }
}

export function isDeepSeekUnavailable(
  error: unknown,
): error is DeepSeekApiError {
  return (
    error instanceof DeepSeekApiError &&
    (error.status === 429 || error.status === 503)
  );
}

export async function requestDeepSeekChat(
  apiKey: string,
  model: string,
  messages: DeepSeekMessage[],
  temperature: number,
): Promise<string> {
  const response = await withScanEngineError(
    `DeepSeek chat completions (${model})`,
    () =>
      fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          response_format: { type: "json_object" },
          temperature,
        }),
      }),
  );

  if (!response.ok) {
    const body = await response.text();
    const message =
      response.status === 401 || response.status === 403
        ? `DeepSeek rejected the configured API key (HTTP ${response.status}). Check DEEPSEEK_API_KEY.`
        : `DeepSeek API error [${response.status}]: ${body.slice(0, 300)}`;
    const error = new DeepSeekApiError(response.status, message);
    console.error("[Scan Engine Error]", error, {
      endpoint: `DeepSeek chat completions (${model})`,
      status: response.status,
    });
    throw error;
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.length === 0) {
    throw new Error("DeepSeek returned an empty chat completion.");
  }
  return content;
}

export async function* streamDeepSeekChat(
  apiKey: string,
  model: string,
  messages: DeepSeekMessage[],
  temperature: number,
): AsyncGenerator<string> {
  const response = await withScanEngineError(
    `DeepSeek streaming chat completions (${model})`,
    () =>
      fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          response_format: { type: "json_object" },
          temperature,
          stream: true,
        }),
      }),
  );

  if (!response.ok) {
    const body = await response.text();
    const message =
      response.status === 401 || response.status === 403
        ? `DeepSeek rejected the configured API key (HTTP ${response.status}). Check DEEPSEEK_API_KEY.`
        : `DeepSeek API error [${response.status}]: ${body.slice(0, 300)}`;
    const error = new DeepSeekApiError(response.status, message);
    console.error("[Scan Engine Error]", error, {
      endpoint: `DeepSeek streaming chat completions (${model})`,
      status: response.status,
    });
    throw error;
  }

  if (!response.body) {
    throw new Error("DeepSeek did not return a streaming response body.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const data = trimmed.slice("data:".length).trim();
        if (!data || data === "[DONE]") continue;

        let event: {
          choices?: Array<{ delta?: { content?: string | null } }>;
          error?: { message?: string };
        };
        try {
          event = JSON.parse(data);
        } catch {
          throw new Error("DeepSeek returned an invalid streaming response.");
        }
        if (event.error) {
          throw new Error(
            event.error.message || "DeepSeek streaming request failed.",
          );
        }
        const content = event.choices?.[0]?.delta?.content;
        if (typeof content === "string" && content.length > 0) yield content;
      }

      if (done) break;
    }

    if (buffer.trim().startsWith("data:")) {
      const data = buffer.trim().slice("data:".length).trim();
      if (data && data !== "[DONE]") {
        let event: {
          choices?: Array<{ delta?: { content?: string | null } }>;
          error?: { message?: string };
        };
        try {
          event = JSON.parse(data);
        } catch {
          throw new Error("DeepSeek returned an invalid streaming response.");
        }
        if (event.error) {
          throw new Error(
            event.error.message || "DeepSeek streaming request failed.",
          );
        }
        const content = event.choices?.[0]?.delta?.content;
        if (typeof content === "string" && content.length > 0) yield content;
      }
    }
  } finally {
    reader.releaseLock();
  }
}
