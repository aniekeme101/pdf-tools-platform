
import { NextResponse } from "next/server";
import {
  PDFDocument,
  StandardFonts,
  rgb,
  degrees,
} from "pdf-lib";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const file = formData.get("file");
    const watermarkText = String(
      formData.get("text") ?? ""
    ).trim();

    const opacityValue = Number(
      formData.get("opacity") ?? "0.25"
    );

    const fontSizeValue = Number(
      formData.get("fontSize") ?? "40"
    );

    const colorValue = String(
      formData.get("color") ?? "gray"
    );

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

    if (!watermarkText || watermarkText.length > 80) {
      return NextResponse.json(
        { error: "Enter watermark text of 1–80 characters." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(opacityValue) ||
        opacityValue < 0.05 ||
        opacityValue > 0.8) {
      return NextResponse.json(
        { error: "Opacity must be between 0.05 and 0.8." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(fontSizeValue) ||
        fontSizeValue < 10 ||
        fontSizeValue > 100) {
      return NextResponse.json(
        { error: "Font size must be between 10 and 100." },
        { status: 400 }
      );
    }

    const colors: Record<
      string,
      ReturnType<typeof rgb>
    > = {
      gray: rgb(0.35, 0.35, 0.35),
      black: rgb(0, 0, 0),
      blue: rgb(0.1, 0.3, 0.8),
      red: rgb(0.8, 0.1, 0.1),
    };

    if (!colors[colorValue]) {
      return NextResponse.json(
        { error: "Please select a valid watermark color." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();

    let pdf: PDFDocument;

    try {
      pdf = await PDFDocument.load(bytes);
    } catch {
      return NextResponse.json(
        {
          error:
            "This PDF could not be opened. It may be damaged or password-protected.",
        },
        { status: 400 }
      );
    }

    const pages = pdf.getPages();

    if (pages.length === 0) {
      return NextResponse.json(
        { error: "This PDF does not contain any pages." },
        { status: 400 }
      );
    }

    if (pages.length > 500) {
      return NextResponse.json(
        { error: "This tool currently supports up to 500 pages per PDF." },
        { status: 400 }
      );
    }

    const font = await pdf.embedFont(
      StandardFonts.HelveticaBold
    );

    for (const page of pages) {
      const { width, height } = page.getSize();

      // Keep the watermark sized appropriately for each page.
      const fittedSize = Math.min(
        fontSizeValue,
        Math.max(10, width * 0.12)
      );

      const textWidth = font.widthOfTextAtSize(
        watermarkText,
        fittedSize
      );

      // Center the rotated watermark on the page.
      const radians = (45 * Math.PI) / 180;
      const rotatedWidth =
        Math.abs(textWidth * Math.cos(radians)) +
        Math.abs(fittedSize * Math.sin(radians));

      const rotatedHeight =
        Math.abs(textWidth * Math.sin(radians)) +
        Math.abs(fittedSize * Math.cos(radians));

      page.drawText(watermarkText, {
        x: (width - rotatedWidth) / 2,
        y: (height - rotatedHeight) / 2,
        size: fittedSize,
        font,
        color: colors[colorValue],
        opacity: opacityValue,
        rotate: degrees(45),
      });
    }

    const output = await pdf.save();

    const outputName =
      file.name.replace(/\.pdf$/i, "") + "-watermarked.pdf";

    return new Response(new Uint8Array(output), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${outputName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Watermark PDF error:", error);

    return NextResponse.json(
      {
        error:
          "Something went wrong while adding the watermark. Please try another PDF.",
      },
      { status: 500 }
    );
  }
}
