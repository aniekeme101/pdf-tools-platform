
import { NextResponse } from "next/server";
import { PDFDocument, rgb } from "pdf-lib";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const rawHighlights = formData.get("highlights");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Please upload a PDF file." },
        { status: 400 }
      );
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        { error: "Only PDF files are supported." },
        { status: 400 }
      );
    }

    if (file.size === 0 || file.size > 20 * 1024 * 1024) {
      return NextResponse.json(
        { error: "The PDF must be under 20 MB and cannot be empty." },
        { status: 400 }
      );
    }

    if (typeof rawHighlights !== "string") {
      return NextResponse.json(
        { error: "Please highlight at least one area." },
        { status: 400 }
      );
    }

    let highlights: {
      page: number;
      x: number;
      y: number;
      width: number;
      height: number;
    }[];

    try {
      highlights = JSON.parse(rawHighlights);
    } catch {
      return NextResponse.json(
        { error: "The highlight data is invalid." },
        { status: 400 }
      );
    }

    if (
      !Array.isArray(highlights) ||
      highlights.length === 0 ||
      highlights.length > 500
    ) {
      return NextResponse.json(
        { error: "Add between 1 and 500 highlight areas." },
        { status: 400 }
      );
    }

    const pdf = await PDFDocument.load(
      await file.arrayBuffer()
    );

    const pages = pdf.getPages();

    for (const highlight of highlights) {
      const { page, x, y, width, height } = highlight;

      if (
        !Number.isInteger(page) ||
        page < 0 ||
        page >= pages.length ||
        ![x, y, width, height].every(Number.isFinite) ||
        x < 0 ||
        y < 0 ||
        width <= 0 ||
        height <= 0
      ) {
        return NextResponse.json(
          { error: "One or more highlight areas are invalid." },
          { status: 400 }
        );
      }

      const target = pages[page];
      const pageSize = target.getSize();

      if (
        x + width > pageSize.width + 1 ||
        y + height > pageSize.height + 1
      ) {
        return NextResponse.json(
          { error: "A highlight area is outside its page." },
          { status: 400 }
        );
      }

      target.drawRectangle({
        x,
        y,
        width,
        height,
        color: rgb(1, 0.9, 0.1),
        opacity: 0.38,
        borderOpacity: 0,
      });
    }

    const output = await pdf.save();
    const outputName =
      file.name.replace(/\.pdf$/i, "") + "-highlighted.pdf";

    return new Response(new Uint8Array(output), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${outputName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Highlight PDF error:", error);

    return NextResponse.json(
      {
        error:
          "Could not highlight this PDF. It may be damaged or password-protected.",
      },
      { status: 500 }
    );
  }
}
