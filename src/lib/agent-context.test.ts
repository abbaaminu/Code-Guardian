import { afterEach, describe, expect, it, vi } from "vitest";
import { retrieveRepoContext } from "./agent.functions";

describe("retrieveRepoContext", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reads supported GitHub source files but excludes environment files", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            tree: [
              { path: ".env", type: "blob", size: 80 },
              { path: "src/app.ts", type: "blob", size: 200 },
              { path: "README.md", type: "blob", size: 100 },
            ],
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response("export const app = true;", { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const context = await retrieveRepoContext(
      "owner",
      "repo",
      "main",
      "github-token",
    );

    expect(context).toEqual([
      { file_path: "src/app.ts", content: "export const app = true;" },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1][0])).toContain(
      "/contents/src/app.ts",
    );
  });
});
