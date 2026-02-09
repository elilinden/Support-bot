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
 * Mock response for development — OP-specific, mode-aware
 */
function getMockInterviewResponse(userMessage: string): string {
  const desc = userMessage.substring(0, 100).replace(/"/g, '\\"');
  return `Thank you for sharing that. I've reviewed the intake data you provided. Let me ask a few follow-up questions to fill in the gaps.

**What I Understand So Far:**
Based on your intake, I can see some details about your situation. To build the strongest possible case for your Order of Protection, I need a few more specific details.

**Follow-Up Questions:**
1. Can you provide the exact date (month/day/year) of the most recent incident? Specific dates are critical for the petition.
2. Were there any weapons or firearms involved in any incident? This affects the type of order the court may issue.
3. Are there children who witnessed or were directly affected by any of the incidents you described?

Each answer helps us fill in the critical fields needed for your Family Court petition under FCA Article 8.

This is educational information only, not legal advice.

\`\`\`json
{
  "next_questions": [
    "What is the exact date of the most recent incident?",
    "Were any weapons or firearms involved?",
    "Did children witness or were they affected by any incidents?"
  ],
  "extracted_facts": {
    "additionalNotes": "${desc}"
  },
  "missing_fields": [
    "relationship",
    "mostRecentIncidentDate",
    "safety.safeNow",
    "safety.firearmsPresent",
    "children.childrenInvolved"
  ],
  "progress_percent": 25,
  "safety_flags": [
    { "severity": "info", "message": "This is educational information only, not legal advice.", "category": "legal_limit" }
  ],
  "timeline_events": [],
  "suggested_artifacts": []
}
\`\`\``;
}

function getMockRoadmapUpdateResponse(userMessage: string): string {
  const desc = userMessage.substring(0, 100).replace(/"/g, '\\"');
  return `Got it. I've recorded that update to your case facts.

**Updated:** ${desc}

Your roadmap has been refreshed with this new information.

\`\`\`json
{
  "next_questions": [],
  "extracted_facts": {
    "additionalNotes": "${desc}"
  },
  "missing_fields": [],
  "progress_percent": 60,
  "safety_flags": [],
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
    const isRoadmap = options.systemPrompt.includes("fact updater");
    return {
      text: isRoadmap
        ? getMockRoadmapUpdateResponse(options.userMessage)
        : getMockInterviewResponse(options.userMessage),
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
