import { NextRequest, NextResponse } from "next/server";
import { callLLM } from "@/lib/gemini";
import {
  buildCoachSystemPrompt,
  buildExtractionSuffix,
  parseCoachResponse,
  detectImmediateDanger,
  getSafetyInterruptMessage,
} from "@/lib/prompts";
import type { CoachRequest, CoachResponse } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body: CoachRequest = await req.json();

    // Default mode to "interview" if not specified
    if (!body.mode) {
      body.mode = "interview";
    }

    // Validate required fields
    if (!body.sessionId || !body.userMessage) {
      return NextResponse.json(
        { error: "Missing sessionId or userMessage" },
        { status: 400 }
      );
    }

    // Safety interrupt: check for immediate danger
    if (detectImmediateDanger(body.userMessage)) {
      const safetyResponse: CoachResponse = {
        assistant_message: getSafetyInterruptMessage(),
        next_questions: [],
        extracted_facts: {},
        missing_fields: [],
        progress_percent: body.conversationHistory?.length > 0 ? 5 : 0,
        safety_flags: [
          {
            severity: "critical",
            message:
              "Possible immediate danger detected. Emergency resources provided.",
            category: "safety",
          },
        ],
        timeline_events: [],
        suggested_artifacts: [],
      };
      return NextResponse.json(safetyResponse);
    }

    // Build prompts
    const systemPrompt = buildCoachSystemPrompt(body);
    const userMessageWithSuffix = body.userMessage + buildExtractionSuffix();

    // Convert conversation history to Gemini format
    const conversationHistory = (body.conversationHistory || [])
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "user" ? ("user" as const) : ("model" as const),
        parts: [{ text: m.content }],
      }));

    // Call LLM
    const llmResponse = await callLLM({
      systemPrompt,
      userMessage: userMessageWithSuffix,
      conversationHistory,
      temperature: 0.7,
      maxTokens: 4096,
    });

    // Parse response
    const { message, metadata } = parseCoachResponse(llmResponse.text);

    const response: CoachResponse = {
      assistant_message: message,
      next_questions: metadata.next_questions,
      extracted_facts: metadata.extracted_facts as CoachResponse["extracted_facts"],
      missing_fields: metadata.missing_fields,
      progress_percent: metadata.progress_percent,
      safety_flags: metadata.safety_flags.map((f) => ({
        severity: f.severity as CoachResponse["safety_flags"][0]["severity"],
        message: f.message,
        category: f.category as CoachResponse["safety_flags"][0]["category"],
      })),
      timeline_events: metadata.timeline_events,
      suggested_artifacts: metadata.suggested_artifacts.map((a) => ({
        type: a.type as CoachResponse["suggested_artifacts"][0]["type"],
        title: a.title,
        content: a.content,
      })),
    };

    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error("Coach API error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
