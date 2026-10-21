/** Pass credentials per request: concurrent configurations must never share SDK defaults. */
export function immichRequest(baseUrl: string, apiKey: string) {
  if (!baseUrl || !apiKey) throw new Error("Immich URL and API key are required.");
  return {
    baseUrl: baseUrl.replace(/\/$/, ""),
    headers: { "x-api-key": apiKey },
    // Use a fresh timeout for each call: an expired signal cannot be reused for a later request.
    signal: AbortSignal.timeout(60_000),
  };
}
