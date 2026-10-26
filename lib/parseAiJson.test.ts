import { describe, it, expect } from "vitest";
import { hasRequiredFields, parseAiJson } from "./parseAiJson";

describe("parseAiJson", () => {
  it("parses valid JSON", () => {
    expect(parseAiJson('{"title":"Intro"}')).toEqual({ title: "Intro" });
  });

  it("parses JSON wrapped in markdown fences", () => {
    expect(parseAiJson('```json\n{"title":"Intro"}\n```')).toEqual({
      title: "Intro",
    });
  });

  it("ignores text before and after JSON", () => {
    expect(parseAiJson('Here is the result: {"title":"Intro"} Done.')).toEqual({
      title: "Intro",
    });
  });

  it("parses a JSON array", () => {
    expect(parseAiJson('[{"id":1},{"id":2}]')).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it("throws on an empty response", () => {
    expect(() => parseAiJson("")).toThrow("Empty AI response");
  });

  it("throws when no JSON is present", () => {
    expect(() => parseAiJson("Sorry, I cannot help")).toThrow("No JSON found");
  });

  it("throws on truncated JSON", () => {
    expect(() => parseAiJson('{"title":"Intro",')).toThrow();
  });
});

describe("hasRequiredFields", () => {
  it("returns true when all fields exist", () => {
    expect(hasRequiredFields({ title: "Intro", id: 1 }, ["title", "id"])).toBe(
      true
    );
  });

  it("returns false when a field is missing", () => {
    expect(hasRequiredFields({ title: "Intro" }, ["title", "id"])).toBe(false);
  });

  it("returns false for null", () => {
    expect(hasRequiredFields(null, ["title"])).toBe(false);
  });

  it("returns false for a string", () => {
    expect(hasRequiredFields("Intro", ["title"])).toBe(false);
  });
});
