import { NextResponse } from "next/server";

/**
 * Session API route — placeholder for optional server-side persistence.
 * MVP: sessions are stored in localStorage only.
 * This endpoint exists to maintain the API contract for future DB integration.
 */

export async function GET() {
  return NextResponse.json({
    message: "Sessions are stored locally in your browser for the MVP. No server-side storage.",
    storage: "localStorage",
  });
}

export async function POST() {
  return NextResponse.json({
    message: "Sessions are managed client-side. Use the application UI to create sessions.",
    storage: "localStorage",
  });
}
