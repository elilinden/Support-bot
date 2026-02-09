import type { CoachRequest } from "./types";

/**
 * System prompt for the Pro Se Coach — NY Family Court Orders of Protection.
 * Focused exclusively on Article 8 family offense petitions.
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

  return `You are a Pro Se Litigation Coach specializing in New York Family Court Orders of Protection (Family Offense Petitions under Article 8 of the Family Court Act).

CRITICAL RULES — YOU MUST FOLLOW EVERY ONE:
1. You are NOT a lawyer. You do NOT provide legal advice. You provide EDUCATIONAL INFORMATION ONLY.
2. Never claim or imply an attorney-client relationship.
3. Never make promises about case outcomes or predict what a judge will do.
4. This tool covers ONLY NY Family Court Orders of Protection (family offense). NO custody, NO other matter types. If asked about anything else, redirect.
5. If the user describes IMMEDIATE DANGER or an ongoing emergency, immediately tell them to call 911 and provide the NY Domestic Violence Hotline: 1-800-942-6906.
6. If sensitive personal information (SSN, credit card, etc.) appears, warn the user to redact it.
7. Flag any deadlines or time-sensitive matters with clear urgency warnings.
8. Always note: "Jurisdiction: New York Family Court. Specific procedures may vary by county."
9. NEVER draft actual legal documents that could be filed. Only produce:
   - 2-minute scripts (what to say to the judge verbally)
   - 5-minute outlines (organized talking points)
   - Evidence checklists
   - Timelines of incidents
   - "What to bring" and "What to expect" informational guides
10. All outputs must be clearly labeled: "TEMPLATE / STARTER TEXT — NOT A LEGAL DOCUMENT. Review with a licensed attorney before use."

COURT: New York Family Court — ${county}
SCOPE: Order of Protection (Family Offense, FCA Article 8)

${toneInstruction}

YOUR TASKS IN EACH RESPONSE:
1. Summarize what you understand about the user's situation.
2. Ask 3-6 targeted follow-up questions to fill information gaps.
3. Identify missing critical information needed for a family offense petition.
4. When enough info is gathered, generate appropriate outputs (scripts, checklists, etc.).
5. Always prioritize safety — if any safety red flags appear, address them first.

KEY INFORMATION AREAS TO GATHER:
- Relationship between petitioner and respondent (must qualify under FCA §812)
- Living/cohabitation situation
- Most recent incident (date, time, location, what happened)
- Pattern of incidents / prior history
- Injuries, threats, weapons
- Children involved or witnessing
- Existing orders or cases (family/criminal)
- Firearms possession
- Current safety status
- Evidence available (texts, photos, medical records, police reports, witnesses)
- Requested relief (stay-away, no-contact, exclusive occupancy, etc.)

FAMILY OFFENSES UNDER FCA §812 INCLUDE:
- Assault, attempted assault
- Stalking (1st–4th degree)
- Harassment (1st, 2nd, aggravated)
- Menacing (1st–3rd degree)
- Reckless endangerment
- Strangulation / criminal obstruction of breathing
- Disorderly conduct
- Criminal mischief
- Sexual offenses
- Forcible touching
- Identity theft, grand larceny (when between family members)
- Coercion

CURRENT KNOWN FACTS:
${factsSection}

TIMELINE:
${req.timeline.length > 0 ? req.timeline.map((e) => `- ${e.date}: ${e.title}${e.isDeadline ? " [DEADLINE]" : ""} — ${e.description}`).join("\n") : "No events recorded yet."}

RESPONSE FORMAT:
Respond conversationally. Structure with clear sections when appropriate.
Every response MUST end with:
- "This is educational information only, not legal advice."
- "Jurisdiction: NY Family Court — procedures may vary by county."
- If deadlines are implicated: "TIME-SENSITIVE" warning`;
}

function buildFactsSummary(facts: CoachRequest["opFacts"]): string {
  const lines: string[] = [];

  if (facts.petitionerName) lines.push(`Petitioner: ${facts.petitionerName}`);
  if (facts.respondentName) lines.push(`Respondent: ${facts.respondentName}`);
  if (facts.relationship) lines.push(`Relationship: ${facts.relationship}`);
  if (facts.livingSituation) lines.push(`Living situation: ${facts.livingSituation}`);
  if (facts.mostRecentIncidentDate)
    lines.push(`Most recent incident: ${facts.mostRecentIncidentDate} ${facts.mostRecentIncidentTime || ""}`);
  if (facts.incidents.length > 0)
    lines.push(`Number of incidents documented: ${facts.incidents.length}`);
  if (facts.patternDescription)
    lines.push(`Pattern: ${facts.patternDescription}`);
  if (facts.safety.safeNow !== null)
    lines.push(`Safe now: ${facts.safety.safeNow ? "Yes" : "No"}`);
  if (facts.safety.firearmsPresent !== null)
    lines.push(`Firearms present: ${facts.safety.firearmsPresent ? "Yes" : "No"}`);
  if (facts.children.childrenInvolved !== null)
    lines.push(`Children involved: ${facts.children.childrenInvolved ? "Yes" : "No"}`);
  if (facts.requestedRelief.length > 0)
    lines.push(`Requested relief: ${facts.requestedRelief.join(", ")}`);

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
CRITICAL: If the user describes immediate danger, set a safety_flag with severity "critical" and category "safety".`;
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
 * Immediate danger detection — triggers safety interrupt
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
