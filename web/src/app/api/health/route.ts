import { NextResponse } from "next/server";
import { checkGeminiHealth } from "@/lib/gemini";

export async function GET() {
  const health = checkGeminiHealth();
  return NextResponse.json({
    gemini: health.status,
    model: health.model,
    mock: health.status === "mock",
  });
}
