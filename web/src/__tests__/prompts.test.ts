import { parseCoachResponse, detectImmediateDanger } from "@/lib/prompts";

describe("parseCoachResponse", () => {
  it("returns raw message when no JSON block is present", () => {
    const raw = "Hello, I understand your situation. Let me help.";
    const result = parseCoachResponse(raw);
    expect(result.message).toBe(raw);
    expect(result.metadata.next_questions).toEqual([]);
    expect(result.metadata.extracted_facts).toEqual({});
    expect(result.metadata.progress_percent).toBe(0);
  });

  it("extracts JSON metadata block from response", () => {
    const raw = `Here is my response.

\`\`\`json
{
  "next_questions": ["When did this happen?", "Do you have evidence?"],
  "extracted_facts": { "petitionerName": "Jane" },
  "missing_fields": ["respondentName"],
  "progress_percent": 25,
  "safety_flags": [
    { "severity": "info", "message": "Educational only", "category": "legal_limit" }
  ],
  "timeline_events": [],
  "suggested_artifacts": []
}
\`\`\``;

    const result = parseCoachResponse(raw);
    expect(result.message).toBe("Here is my response.");
    expect(result.metadata.next_questions).toHaveLength(2);
    expect(result.metadata.next_questions[0]).toBe("When did this happen?");
    expect(result.metadata.extracted_facts).toEqual({ petitionerName: "Jane" });
    expect(result.metadata.missing_fields).toEqual(["respondentName"]);
    expect(result.metadata.progress_percent).toBe(25);
    expect(result.metadata.safety_flags).toHaveLength(1);
    expect(result.metadata.safety_flags[0].severity).toBe("info");
  });

  it("handles malformed JSON gracefully", () => {
    const raw = `Response text.

\`\`\`json
{ broken json here
\`\`\``;

    const result = parseCoachResponse(raw);
    expect(result.message).toBe(raw.trim());
    expect(result.metadata.next_questions).toEqual([]);
  });

  it("uses defaults for missing fields in JSON", () => {
    const raw = `Response.

\`\`\`json
{
  "next_questions": ["Q1"],
  "progress_percent": 50
}
\`\`\``;

    const result = parseCoachResponse(raw);
    expect(result.metadata.next_questions).toEqual(["Q1"]);
    expect(result.metadata.progress_percent).toBe(50);
    expect(result.metadata.extracted_facts).toEqual({});
    expect(result.metadata.missing_fields).toEqual([]);
    expect(result.metadata.safety_flags).toEqual([]);
    expect(result.metadata.timeline_events).toEqual([]);
    expect(result.metadata.suggested_artifacts).toEqual([]);
  });
});

describe("detectImmediateDanger", () => {
  it("detects danger phrases", () => {
    expect(detectImmediateDanger("he is here right now")).toBe(true);
    expect(detectImmediateDanger("I am being attacked now")).toBe(true);
    expect(detectImmediateDanger("he's going to kill me")).toBe(true);
    expect(detectImmediateDanger("he has a gun")).toBe(true);
    expect(detectImmediateDanger("help me now")).toBe(true);
    expect(detectImmediateDanger("I'm in immediate danger")).toBe(true);
    expect(detectImmediateDanger("this is an emergency")).toBe(true);
  });

  it("does not false-positive on safe messages", () => {
    expect(detectImmediateDanger("He yelled at me last week")).toBe(false);
    expect(detectImmediateDanger("I want to file for an order of protection")).toBe(false);
    expect(detectImmediateDanger("My ex sent threatening texts")).toBe(false);
    expect(detectImmediateDanger("I have photos of my injuries")).toBe(false);
  });
});
