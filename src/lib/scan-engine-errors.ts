export const NETWORK_CONNECTION_ERROR =
  "Network connection failed: Unable to reach upstream service (Supabase / DeepSeek). Verify server-side network settings and environment variables.";

export async function withScanEngineError<T>(
  endpoint: string,
  request: () => Promise<T>,
): Promise<T> {
  try {
    return await request();
  } catch (error) {
    console.error("[Scan Engine Error]", error, { endpoint });
    if (error instanceof TypeError && error.message === "Failed to fetch") {
      throw new Error(NETWORK_CONNECTION_ERROR);
    }
    throw error;
  }
}
