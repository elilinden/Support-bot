import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const allowedTypes = [
      "text/plain",
      "application/pdf",
      "text/csv",
      "text/markdown",
    ];

    if (!allowedTypes.includes(file.type) && !file.name.endsWith(".txt")) {
      return NextResponse.json(
        { error: "Unsupported file type. Please upload PDF or text files." },
        { status: 400 }
      );
    }

    let extractedText = "";

    if (file.type === "application/pdf") {
      // PDF extraction using pdf-parse
      try {
        const pdfParse = (await import("pdf-parse")).default;
        const buffer = Buffer.from(await file.arrayBuffer());
        const data = await pdfParse(buffer);
        extractedText = data.text;
      } catch {
        return NextResponse.json(
          { error: "Failed to parse PDF. The file may be corrupted or encrypted." },
          { status: 422 }
        );
      }
    } else {
      // Text file
      extractedText = await file.text();
    }

    // Truncate very long documents
    const maxLength = 50000;
    if (extractedText.length > maxLength) {
      extractedText = extractedText.substring(0, maxLength) + "\n\n[... truncated]";
    }

    return NextResponse.json({
      name: file.name,
      type: file.type,
      extractedText,
      charCount: extractedText.length,
    });
  } catch (error: unknown) {
    console.error("Upload API error:", error);
    return NextResponse.json(
      { error: "Failed to process upload" },
      { status: 500 }
    );
  }
}
