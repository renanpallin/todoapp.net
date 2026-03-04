/**
 * Parse ASP.NET validation error responses into readable messages.
 * Handles both `{ errors: { Field: ["msg"] } }` and `{ error: "msg" }` formats.
 */
export async function parseApiError(response: Response): Promise<string> {
  const data = await response.json().catch(() => null);

  if (data?.errors && typeof data.errors === "object") {
    const messages = Object.values(data.errors as Record<string, string[]>)
      .flat();
    if (messages.length > 0) {
      return messages.join(" ");
    }
  }

  if (data?.error) {
    return data.error;
  }

  return `Something went wrong (${response.status})`;
}
