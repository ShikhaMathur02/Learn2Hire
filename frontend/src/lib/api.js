export async function readApiResponse(
  response,
  htmlFallbackMessage = "API returned HTML instead of JSON. Restart the backend server and refresh the page."
) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  const trimmed = text.trim();
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(trimmed);
    } catch {
      throw new Error("Server returned invalid JSON.");
    }
  }

  if (
    trimmed.startsWith("<!DOCTYPE") ||
    trimmed.startsWith("<html") ||
    trimmed.startsWith("<!doctype")
  ) {
    throw new Error(htmlFallbackMessage);
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    throw new Error("Server returned an unexpected response.");
  }
}
