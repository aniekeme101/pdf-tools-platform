
import { NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 30 * 1024 * 1024;
const MAX_PAGES = 500;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const pagesInput = formData.get("pages");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Please upload a PDF file." },
        { status: 400 }
      );
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        { error: "Please choose a PDF file." },
        { status: 400 }
      );
    }

    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "The PDF must be smaller than 30 MB." },
        { status: 400 }
      );
    }

    if (typeof pagesInput !== "string" || !pagesInput.trim()) {
      return NextResponse.json(
        { error: "Enter the page numbers you want to extract." },
        { status: 400 }
      );
    }

    const sourceBytes = new Uint8Array(await file.arrayBuffer());
    const sourcePdf = await PDFDocument.load(sourceBytes, {
      ignoreEncryption: false,
    });

    const pageCount = sourcePdf.getPageCount();

    if (pageCount === 0 || pageCount > MAX_PAGES) {
      return NextResponse.json(
        { error: "The PDF must contain between 1 and 500 pages." },
        { status: 400 }
      );
    }

    // Accept input such as "1, 3, 5-7".
    const pageNumbers = new Set<number>();
    const parts = pagesInput.split(",").map((part) => part.trim());

    for (const part of parts) {
      if (!part) {
        return NextResponse.json(
          { error: "Check your page selection. Remove empty entries." },
          { status: 400 }
        );
      }

      const rangeMatch = part.match(/^(\d+)\s*-\s*(\d+)$/);
      const singleMatch = part.match(/^\d+$/);

      if (rangeMatch) {
        const start = Number(rangeMatch[1]);
        const end = Number(rangeMatch[2]);

        if (
          start < 1 ||
          end < start ||
          end > pageCount
        ) {
          return NextResponse.json(
            {
              error: `Page range "${part}" is invalid. This PDF has ${pageCount} pages.`,
            },
            { status: 400 }
          );
        }

        for (let page = start; page <= end; page++) {
          pageNumbers.add(page);
        }
      } else if (singleMatch) {
        const page = Number(part);

        if (page < 1 || page > pageCount) {
          return NextResponse.json(
            {
              error: `Page ${page} is invalid. This PDF has ${pageCount} pages.`,
            },
            { status: 400 }
          );
        }

        pageNumbers.add(page);
      } else {
        return NextResponse.json(
          {
            error: `Invalid page selection "${part}". Use numbers and ranges, such as 1, 3, 5-7.`,
          },
          { status: 400 }
        );
      }
    }

    if (pageNumbers.size === 0) {
      return NextResponse.json(
        { error: "Select at least one page." },
        { status: 400 }
      );
    }

    // Preserve the order entered by the user, without duplicate pages.
    const orderedPages = Array.from(pageNumbers);
    const extractedPdf = await PDFDocument.create();

    const copiedPages = await extractedPdf.copyPages(
      sourcePdf,
      orderedPages.map((page) => page - 1)
    );

    for (const page of copiedPages) {
      extractedPdf.addPage(page);
    }

    const outputBytes = await extractedPdf.save();

    const safeBaseName = file.name
      .replace(/\.pdf$/i, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "document";

    return new Response(new Uint8Array(outputBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeBaseName}-extracted.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("PDF extraction error:", error);

    return NextResponse.json(
      {
        error:
          "Could not extract those pages. The PDF may be damaged or password-protected.",
      },
      { status: 500 }
    );
  }
}
