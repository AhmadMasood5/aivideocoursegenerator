export function parseAiJson<T = unknown>(raw: string): T {
  if (typeof raw !== "string" || !raw.trim()) {
    throw new Error("Empty AI response");
  }

  // Remove markdown code fences like ```json ... ```
  let text = raw.replace(/```(?:json)?/gi, "").trim();

  // Keep only the outermost JSON object or array
  const firstObj = text.indexOf("{");
  const firstArr = text.indexOf("[");
  const start =
    firstObj === -1 ? firstArr : firstArr === -1 ? firstObj : Math.min(firstObj, firstArr);
  const end = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));

  if (start === -1 || end === -1 || end < start) {
    throw new Error("No JSON found in AI response");
  }
  text = text.slice(start, end + 1);

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Malformed JSON in AI response");
  }
}

export function hasRequiredFields(obj: unknown, fields: string[]): boolean {
  if (typeof obj !== "object" || obj === null) return false;
  return fields.every((f) => f in (obj as Record<string, unknown>));
}
