/**
 * @jest-environment jsdom
 */

import { useSessionStore } from "@/lib/store";
import { createDefaultOPFacts } from "@/lib/types";

// Reset store between tests
beforeEach(() => {
  useSessionStore.setState({ sessions: [], activeSessionId: null });
});

describe("Session Store", () => {
  it("creates a new session with defaults", () => {
    const id = useSessionStore.getState().createSession();
    const session = useSessionStore.getState().getSession(id);

    expect(session).toBeDefined();
    expect(session!.id).toBe(id);
    expect(session!.jurisdiction.state).toBe("NY");
    expect(session!.jurisdiction.courtLevel).toBe("family");
    expect(session!.intakeCompleted).toBe(false);
    expect(session!.intakeStep).toBe(0);
    expect(session!.opFacts.petitionerName).toBe("");
    expect(session!.conversation).toEqual([]);
    expect(session!.generatedArtifacts).toEqual([]);
    expect(useSessionStore.getState().activeSessionId).toBe(id);
  });

  it("creates a session with partial data", () => {
    const id = useSessionStore.getState().createSession({
      title: "Test Case",
      jurisdiction: { system: "state", state: "NY", courtLevel: "family", county: "Queens" },
    });
    const session = useSessionStore.getState().getSession(id);

    expect(session!.title).toBe("Test Case");
    expect(session!.jurisdiction.county).toBe("Queens");
  });

  it("updates OP facts with deep merge", () => {
    const id = useSessionStore.getState().createSession();

    useSessionStore.getState().updateOPFacts(id, {
      petitionerName: "Jane Doe",
      respondentName: "John Doe",
      relationship: "spouse",
    });

    const session = useSessionStore.getState().getSession(id);
    expect(session!.opFacts.petitionerName).toBe("Jane Doe");
    expect(session!.opFacts.respondentName).toBe("John Doe");
    expect(session!.opFacts.relationship).toBe("spouse");
    // Other fields should remain default
    expect(session!.opFacts.livingSituation).toBe("");
    expect(session!.opFacts.safety.safeNow).toBeNull();
  });

  it("deep merges nested safety fields", () => {
    const id = useSessionStore.getState().createSession();

    useSessionStore.getState().updateOPFacts(id, {
      safety: { ...createDefaultOPFacts().safety, safeNow: true, firearmsPresent: false },
    });

    const session = useSessionStore.getState().getSession(id);
    expect(session!.opFacts.safety.safeNow).toBe(true);
    expect(session!.opFacts.safety.firearmsPresent).toBe(false);
    // Other safety fields should be merged from defaults
    expect(session!.opFacts.safety.strangulation).toBeNull();
  });

  it("adds messages to conversation", () => {
    const id = useSessionStore.getState().createSession();

    useSessionStore.getState().addMessage(id, {
      role: "user",
      content: "Hello",
    });

    useSessionStore.getState().addMessage(id, {
      role: "assistant",
      content: "Hi there, how can I help?",
    });

    const session = useSessionStore.getState().getSession(id);
    expect(session!.conversation).toHaveLength(2);
    expect(session!.conversation[0].role).toBe("user");
    expect(session!.conversation[1].role).toBe("assistant");
    expect(session!.conversation[0].id).toBeTruthy();
    expect(session!.conversation[0].timestamp).toBeTruthy();
  });

  it("adds and removes timeline events", () => {
    const id = useSessionStore.getState().createSession();

    useSessionStore.getState().addTimelineEvent(id, {
      date: "2024-01-15",
      title: "Incident",
      description: "First incident",
      isDeadline: false,
    });

    useSessionStore.getState().addTimelineEvent(id, {
      date: "2024-01-10",
      title: "Earlier incident",
      description: "Earlier",
      isDeadline: false,
    });

    let session = useSessionStore.getState().getSession(id);
    expect(session!.timeline).toHaveLength(2);
    // Should be sorted by date
    expect(session!.timeline[0].title).toBe("Earlier incident");
    expect(session!.timeline[1].title).toBe("Incident");

    // Remove
    const eventId = session!.timeline[0].id;
    useSessionStore.getState().removeTimelineEvent(id, eventId);
    session = useSessionStore.getState().getSession(id);
    expect(session!.timeline).toHaveLength(1);
  });

  it("adds artifacts", () => {
    const id = useSessionStore.getState().createSession();

    useSessionStore.getState().addArtifact(id, {
      type: "two_minute_script",
      title: "Your 2-Minute Script",
      content: "Your Honor, I am here to request...",
    });

    const session = useSessionStore.getState().getSession(id);
    expect(session!.generatedArtifacts).toHaveLength(1);
    expect(session!.generatedArtifacts[0].type).toBe("two_minute_script");
    expect(session!.generatedArtifacts[0].version).toBe(1);
  });

  it("adds safety flags", () => {
    const id = useSessionStore.getState().createSession();

    useSessionStore.getState().addSafetyFlags(id, [
      { severity: "critical", message: "Immediate danger", category: "safety" },
      { severity: "info", message: "Educational only", category: "legal_limit" },
    ]);

    const session = useSessionStore.getState().getSession(id);
    expect(session!.safetyFlags).toHaveLength(2);
    expect(session!.safetyFlags[0].severity).toBe("critical");
  });

  it("deletes a session", () => {
    const id = useSessionStore.getState().createSession();
    expect(useSessionStore.getState().sessions).toHaveLength(1);

    useSessionStore.getState().deleteSession(id);
    expect(useSessionStore.getState().sessions).toHaveLength(0);
    expect(useSessionStore.getState().activeSessionId).toBeNull();
  });
});
