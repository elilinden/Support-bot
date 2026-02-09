/**
 * Gemini API integration layer.
 * Adapted from the extension's index.js server, refocused for Pro Se coaching.
 *
 * Supports:
 * - Real Gemini API calls
 * - Mock mode (MOCK_LLM=1) for development without API key
 * - Streaming-ready interface (non-streaming MVP with easy upgrade path)
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const MOCK_LLM = process.env.MOCK_LLM === "1";

let genAI: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI | null {
  if (MOCK_LLM) return null;
  if (!GEMINI_API_KEY) return null;
  if (!genAI) {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  }
  return genAI;
}

/**
 * Abstract interface for LLM calls — makes it easy to swap in streaming later.
 */
export interface LLMCallOptions {
  systemPrompt: string;
  userMessage: string;
  conversationHistory?: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }>;
  maxTokens?: number;
  temperature?: number;
}

export interface LLMResponse {
  text: string;
  model: string;
  mock: boolean;
}

/**
 * Mock response for development — OP-specific
 */
function getMockResponse(userMessage: string): string {
  const desc = userMessage.substring(0, 100).replace(/"/g, '\\"');
  return `Thank you for sharing that. I want to help you understand the NY Family Court Order of Protection process.

**What I Understand So Far:**
Based on what you've told me, it sounds like you may be dealing with a family offense situation in New York. An Order of Protection (OP) under Article 8 of the Family Court Act can provide legal protections such as stay-away orders, no-contact orders, and exclusive occupancy of a shared residence.

**Key Questions to Help Me Understand Your Situation:**
1. What is your relationship with the person you need protection from? (This is important because Family Court OPs only cover specific relationships under FCA §812.)
2. When did the most recent incident occur? Please include the date, approximate time, and location.
3. Were there any physical injuries, threats of violence, or use of weapons?
4. Are there children who witnessed or were affected by any incidents?
5. Do you have any evidence such as text messages, photos of injuries, police reports, or medical records?
6. Are you currently safe, or do you have concerns about your immediate safety?

**What You Should Know:**
- In NY Family Court, you can file for an Order of Protection if the respondent is a spouse, former spouse, intimate partner, family member, or someone you share a child with.
- A Temporary Order of Protection (TOP) can often be issued the same day you file your petition.
- You do NOT need a lawyer to file, though legal aid organizations can help.

This is educational information only, not legal advice.
Jurisdiction: NY Family Court — procedures may vary by county.

\`\`\`json
{
  "next_questions": [
    "What is your relationship with the person you need protection from?",
    "When and where did the most recent incident occur?",
    "Were there injuries, threats, or weapons involved?",
    "Are children involved or did they witness any incidents?",
    "What evidence do you have (texts, photos, police reports, medical records)?",
    "Are you currently safe?"
  ],
  "extracted_facts": {
    "additionalNotes": "${desc}"
  },
  "missing_fields": [
    "relationship",
    "mostRecentIncidentDate",
    "respondentName",
    "livingSituation",
    "safety.safeNow",
    "children.childrenInvolved",
    "evidence"
  ],
  "progress_percent": 10,
  "safety_flags": [
    { "severity": "info", "message": "This is educational information only, not legal advice.", "category": "legal_limit" },
    { "severity": "info", "message": "NY Family Court — procedures may vary by county.", "category": "jurisdiction" }
  ],
  "timeline_events": [],
  "suggested_artifacts": []
}
\`\`\``;
}

/**
 * Call the LLM (Gemini or mock)
 */
export async function callLLM(options: LLMCallOptions): Promise<LLMResponse> {
  if (MOCK_LLM) {
    // Simulate a small delay for realism
    await new Promise((r) => setTimeout(r, 500));
    return {
      text: getMockResponse(options.userMessage),
      model: "mock",
      mock: true,
    };
  }

  const client = getClient();
  if (!client) {
    throw new Error("Gemini API key not configured. Set GEMINI_API_KEY or enable MOCK_LLM=1.");
  }

  const model = client.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: options.systemPrompt,
  });

  const chat = model.startChat({
    history: options.conversationHistory || [],
    generationConfig: {
      maxOutputTokens: options.maxTokens || 4096,
      temperature: options.temperature || 0.7,
    },
  });

  // Retry logic (adapted from extension's service_worker.js)
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const result = await chat.sendMessage(options.userMessage);
      const response = result.response;
      return {
        text: response.text(),
        model: GEMINI_MODEL,
        mock: false,
      };
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
      }
    }
  }

  throw lastError || new Error("Failed to get response from Gemini after 3 attempts");
}

/**
 * Check if Gemini is properly configured
 */
export function checkGeminiHealth(): { status: "ok" | "missing_key" | "mock"; model: string } {
  if (MOCK_LLM) return { status: "mock", model: "mock" };
  if (!GEMINI_API_KEY) return { status: "missing_key", model: GEMINI_MODEL };
  return { status: "ok", model: GEMINI_MODEL };
}
