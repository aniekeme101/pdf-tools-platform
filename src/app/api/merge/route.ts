
import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_FILES = 10;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_TOTAL_SIZE = 30 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const uploadedFiles = formData.getAll("files");

    if (uploadedFiles.length < 2) {
      return NextResponse.json(
        { error: "Please select at least two PDF files." },
        { status: 400 }
      );
    }

    if (uploadedFiles.length > MAX_FILES) {
      return NextResponse.json(
        { error: "You can merge up to 10 PDF files at a time." },
        { status: 400 }
      );
    }

    const files = uploadedFiles.filter(
      (item): item is File => item instanceof File
    );

    if (files.length !== uploadedFiles.length) {
      return NextResponse.json(
        { error: "Invalid file upload." },
        { status: 400 }
      );
    }

    let totalSize = 0;

    for (const file of files) {
      if (file.size === 0 || file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: "Each PDF must be smaller than 10 MB and cannot be empty." },
          { status: 400 }
        );
      }

      if (!file.name.toLowerCase().endsWith(".pdf")) {
        return NextResponse.json(
          { error: "Only PDF files are allowed." },
          { status: 400 }
        );
      }

      totalSize += file.size;
    }

    if (totalSize > MAX_TOTAL_SIZE) {
      return NextResponse.json(
        { error: "The combined upload size must not exceed 30 MB." },
        { status: 400 }
      );
    }

    const mergedPdf = await PDFDocument.create();

    for (const file of files) {
      const bytes = await file.arrayBuffer();

      let sourcePdf: PDFDocument;

      try {
        sourcePdf = await PDFDocument.load(bytes);
      } catch {
        return NextResponse.json(
          { error: `"${file.name}" is not a valid or supported PDF.` },
          { status: 400 }
        );
      }

      const pages = await mergedPdf.copyPages(
        sourcePdf,
        sourcePdf.getPageIndices()
      );

      for (const page of pages) {
        mergedPdf.addPage(page);
      }
    }

    const mergedBytes = await mergedPdf.save();

    return new NextResponse(Buffer.from(mergedBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="paperflow-merged.pdf"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("PDF merge error:", error);

    return NextResponse.json(
      { error: "Something went wrong while merging your PDFs." },
      { status: 500 }
    );
  }
}
