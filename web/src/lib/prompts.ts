import type { CoachRequest } from "./types";

/**
 * Build system prompt based on mode: "interview" or "roadmap_update"
 */
export function buildCoachSystemPrompt(req: CoachRequest): string {
  const county = req.jurisdiction.county
    ? `${req.jurisdiction.county} County`
    : "County not specified";

  const toneInstruction =
    req.tone === "formal"
      ? "Use formal, precise language appropriate for court proceedings."
      : "Use plain, accessible language that a non-lawyer can easily understand.";

  const factsSection = buildFactsSummary(req.opFacts);

  const baseRules = `CRITICAL RULES — YOU MUST FOLLOW EVERY ONE:
1. You are NOT a lawyer. You do NOT provide legal advice. You provide EDUCATIONAL INFORMATION ONLY.
2. Never claim or imply an attorney-client relationship.
3. Never make promises about case outcomes or predict what a judge will do.
4. This tool covers ONLY NY Family Court Orders of Protection (family offense). If asked about anything else, redirect.
5. If the user describes IMMEDIATE DANGER, immediately tell them to call 911 and NY DV Hotline: 1-800-942-6906.
6. If sensitive personal information (SSN, credit card) appears, warn the user to redact it.
7. All outputs labeled: "TEMPLATE / STARTER TEXT — NOT A LEGAL DOCUMENT."

COURT: New York Family Court — ${county}
SCOPE: Order of Protection (Family Offense, FCA Article 8)
${toneInstruction}`;

  if (req.mode === "roadmap_update") {
    return `You are a fact updater for a NY Family Court Order of Protection case.

${baseRules}

YOUR ROLE: The user is providing a new fact or correction about their case. Your job is to:
1. Extract the new information and map it to the correct fields.
2. If the fact implies a timeline event, include it in timeline_events.
3. If the fact has safety implications (firearms, strangulation, threats), flag it.
4. Be brief. Acknowledge what you understood. Do NOT ask follow-up questions unless the new fact is genuinely ambiguous.
5. End with one sentence confirming what was updated.

CURRENT KNOWN FACTS:
${factsSection}

TIMELINE:
${req.timeline.length > 0 ? req.timeline.map((e) => `- ${e.date}: ${e.title}${e.isDeadline ? " [DEADLINE]" : ""} — ${e.description}`).join("\n") : "No events recorded yet."}`;
  }

  // Interview mode (default)
  return `You are an investigator for a NY Family Court Order of Protection case. Your goal is to fill in missing critical details through concise, targeted questions.

${baseRules}

YOUR ROLE: Review the intake data below and identify what's missing. Then ask 2-4 specific, focused questions to fill the gaps. Prioritize:
- Exact dates (month/year minimum) for incidents
- Specific descriptions of what happened (exact words said, physical actions)
- Whether weapons or firearms were involved
- Whether children witnessed or were harmed
- What evidence exists (texts, photos, police reports, medical records)
- Current safety status

Be conversational but efficient. Each question should target ONE specific missing piece of information.

FAMILY OFFENSES UNDER FCA §812 INCLUDE:
Assault, stalking, harassment, menacing, reckless endangerment, strangulation, disorderly conduct, criminal mischief, sexual offenses, forcible touching, coercion.

CURRENT KNOWN FACTS:
${factsSection}

TIMELINE:
${req.timeline.length > 0 ? req.timeline.map((e) => `- ${e.date}: ${e.title}${e.isDeadline ? " [DEADLINE]" : ""} — ${e.description}`).join("\n") : "No events recorded yet."}`;
}

function buildFactsSummary(facts: CoachRequest["opFacts"]): string {
  const lines: string[] = [];

  if (facts.petitionerName) lines.push(`Petitioner: ${facts.petitionerName}`);
  if (facts.respondentName) lines.push(`Respondent: ${facts.respondentName}`);
  if (facts.relationship) lines.push(`Relationship: ${facts.relationship}`);
  if (facts.livingSituation) lines.push(`Living situation: ${facts.livingSituation}`);
  if (facts.mostRecentIncidentDate)
    lines.push(`Most recent incident: ${facts.mostRecentIncidentDate} ${facts.mostRecentIncidentTime || ""}`);
  if (facts.incidents.length > 0) {
    lines.push(`Number of incidents documented: ${facts.incidents.length}`);
    for (const inc of facts.incidents) {
      lines.push(`  - ${inc.date}: ${inc.whatHappened.substring(0, 100)}`);
    }
  }
  if (facts.patternDescription)
    lines.push(`Pattern: ${facts.patternDescription}`);
  if (facts.safety.safeNow !== null)
    lines.push(`Safe now: ${facts.safety.safeNow ? "Yes" : "No"}`);
  if (facts.safety.firearmsPresent !== null)
    lines.push(`Firearms present: ${facts.safety.firearmsPresent ? "Yes" : "No"}`);
  if (facts.safety.strangulation !== null)
    lines.push(`Strangulation history: ${facts.safety.strangulation ? "Yes" : "No"}`);
  if (facts.children.childrenInvolved !== null)
    lines.push(`Children involved: ${facts.children.childrenInvolved ? "Yes" : "No"}`);
  if (facts.existingCases.existingOrderOfProtection !== null)
    lines.push(`Existing OP: ${facts.existingCases.existingOrderOfProtection ? "Yes" : "No"}`);
  if (facts.requestedRelief.length > 0)
    lines.push(`Requested relief: ${facts.requestedRelief.join(", ")}`);
  if (facts.desiredOutcome)
    lines.push(`Desired outcome: ${facts.desiredOutcome}`);

  return lines.length > 0 ? lines.join("\n") : "None gathered yet.";
}

/**
 * Build the structured extraction suffix appended to user messages
 */
export function buildExtractionSuffix(): string {
  return `

After your conversational response, output a JSON block wrapped in \`\`\`json ... \`\`\` with this structure:
{
  "next_questions": ["question 1", ...],
  "extracted_facts": { ... partial OPFacts fields to merge ... },
  "missing_fields": ["field1", ...],
  "progress_percent": 0-100,
  "safety_flags": [
    { "severity": "info|warning|critical", "message": "...", "category": "deadline|jurisdiction|sensitive|legal_limit|safety|general" }
  ],
  "timeline_events": [
    { "date": "YYYY-MM-DD", "title": "...", "description": "...", "isDeadline": false }
  ],
  "suggested_artifacts": [
    { "type": "two_minute_script|five_minute_outline|evidence_checklist|timeline|what_to_bring|what_to_expect|general", "title": "...", "content": "..." }
  ]
}

Only include fields with new data. Use empty arrays/objects for no updates.
CRITICAL: If the user describes immediate danger, set a safety_flag with severity "critical" and category "safety".
For extracted_facts, use the exact OPFacts field names. For nested fields use dot notation in the JSON keys (e.g. "safety.firearmsPresent": true).`;
}

/**
 * Parse the coach response to extract the JSON metadata block
 */
export function parseCoachResponse(raw: string): {
  message: string;
  metadata: {
    next_questions: string[];
    extracted_facts: Record<string, unknown>;
    missing_fields: string[];
    progress_percent: number;
    safety_flags: Array<{
      severity: "info" | "warning" | "critical";
      message: string;
      category: string;
    }>;
    timeline_events: Array<{
      date: string;
      title: string;
      description: string;
      isDeadline: boolean;
    }>;
    suggested_artifacts: Array<{
      type: string;
      title: string;
      content: string;
    }>;
  };
} {
  const defaults = {
    next_questions: [],
    extracted_facts: {},
    missing_fields: [],
    progress_percent: 0,
    safety_flags: [],
    timeline_events: [],
    suggested_artifacts: [],
  };

  const jsonMatch = raw.match(/```json\s*([\s\S]*?)\s*```/);
  if (!jsonMatch) {
    return { message: raw.trim(), metadata: defaults };
  }

  const message = raw.replace(/```json\s*[\s\S]*?\s*```/, "").trim();

  try {
    const parsed = JSON.parse(jsonMatch[1]);
    return {
      message,
      metadata: { ...defaults, ...parsed },
    };
  } catch {
    return { message: raw.trim(), metadata: defaults };
  }
}

/**
 * Immediate danger detection
 */
export function detectImmediateDanger(text: string): boolean {
  const patterns = [
    /he('s| is) (here|outside|coming|at the door)/i,
    /being (attacked|hit|beaten|hurt) (right )?now/i,
    /i('m| am) (scared|afraid) (for my life|he('ll| will) kill)/i,
    /call (the )?police/i,
    /going to kill/i,
    /has a (gun|knife|weapon)/i,
    /help me (now|please|immediately)/i,
    /emergency/i,
    /i('m| am) in (immediate )?danger/i,
  ];
  return patterns.some((p) => p.test(text));
}

/**
 * Safety interrupt message
 */
export function getSafetyInterruptMessage(): string {
  return `**If you are in immediate danger, please:**

1. **Call 911** immediately
2. **NY Domestic Violence Hotline:** 1-800-942-6906 (24/7)
3. **National DV Hotline:** 1-800-799-7233
4. **Text "START" to 88788** for text-based help

Your safety is the top priority. This tool cannot help in an emergency — please contact emergency services right away.

Once you are safe, I'm here to help you understand the Order of Protection process.

---
*This is educational information only, not legal advice.*`;
}
