import { NextResponse } from "next/server";
import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFHexString,
  PDFName,
  PDFNumber,
} from "pdf-lib";

export const runtime = "nodejs";

type PdfComment = {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  color: string;
};

const COLORS: Record<string, [number, number, number]> = {
  yellow: [1, 0.85, 0.15],
  green: [0.35, 0.82, 0.48],
  blue: [0.35, 0.65, 1],
  pink: [1, 0.48, 0.7],
  orange: [1, 0.62, 0.25],
};

function numberArray(pdfDoc: PDFDocument, values: number[]): PDFArray {
  const array = PDFArray.withContext(pdfDoc.context);
  for (const value of values) array.push(PDFNumber.of(value));
  return array;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const commentsValue = formData.get("comments");
    const authorValue = formData.get("authorName");
    const authorName =
      typeof authorValue === "string" && authorValue.trim()
        ? authorValue.trim().slice(0, 80)
        : "Anonymous";

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Please upload a PDF file." }, { status: 400 });
    }
    if (file.size === 0 || file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: "Choose a PDF file no larger than 20 MB." }, { status: 400 });
    }
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Please upload a PDF file." }, { status: 400 });
    }
    if (typeof commentsValue !== "string") {
      return NextResponse.json({ error: "Comment data is missing." }, { status: 400 });
    }

    let comments: PdfComment[];
    try {
      comments = JSON.parse(commentsValue) as PdfComment[];
    } catch {
      return NextResponse.json({ error: "The comment data is invalid." }, { status: 400 });
    }
    if (!Array.isArray(comments) || comments.length === 0 || comments.length > 200) {
      return NextResponse.json({ error: "Add between 1 and 200 comments." }, { status: 400 });
    }

    const pdfDoc = await PDFDocument.load(await file.arrayBuffer());
    const pages = pdfDoc.getPages();

    for (const comment of comments) {
      if (
        !comment ||
        !Number.isInteger(comment.page) ||
        comment.page < 1 ||
        comment.page > pages.length ||
        ![comment.x, comment.y, comment.width, comment.height].every(Number.isFinite) ||
        comment.x < 0 || comment.y < 0 || comment.width <= 0 || comment.height <= 0 ||
        typeof comment.text !== "string" || !comment.text.trim() || comment.text.length > 500 ||
        !Object.prototype.hasOwnProperty.call(COLORS, comment.color)
      ) {
        return NextResponse.json({ error: "One or more comments contain invalid data." }, { status: 400 });
      }

      const page = pages[comment.page - 1];
      const pageWidth = page.getWidth();
      const pageHeight = page.getHeight();
      if (comment.x + comment.width > pageWidth + 1 || comment.y + comment.height > pageHeight + 1) {
        return NextResponse.json({ error: "A selected area falls outside its PDF page." }, { status: 400 });
      }

      const x1 = Math.max(0, comment.x);
      const y1 = Math.max(0, comment.y);
      const x2 = Math.min(pageWidth, comment.x + comment.width);
      const y2 = Math.min(pageHeight, comment.y + comment.height);
      const [red, green, blue] = COLORS[comment.color];
      const annotation = PDFDict.withContext(pdfDoc.context);

      annotation.set(PDFName.of("Type"), PDFName.of("Annot"));
      annotation.set(PDFName.of("Subtype"), PDFName.of("Highlight"));
      annotation.set(PDFName.of("Rect"), numberArray(pdfDoc, [x1, y1, x2, y2]));
      annotation.set(PDFName.of("QuadPoints"), numberArray(pdfDoc, [x1, y2, x2, y2, x1, y1, x2, y1]));
      annotation.set(PDFName.of("C"), numberArray(pdfDoc, [red, green, blue]));
      annotation.set(PDFName.of("CA"), PDFNumber.of(0.45));
      annotation.set(PDFName.of("Contents"), PDFHexString.fromText(comment.text.trim()));
      annotation.set(PDFName.of("T"), PDFHexString.fromText(authorName));
      annotation.set(
        PDFName.of("NM"),
        PDFHexString.fromText(`PaperFlow-${comment.page}-${Math.round(x1)}-${Math.round(y1)}`)
      );
      annotation.set(PDFName.of("F"), PDFNumber.of(4));

      const annotationRef = pdfDoc.context.register(annotation);
      page.node.addAnnot(annotationRef);
    }

    const outputBytes = await pdfDoc.save();
    const baseName = file.name.replace(/\.pdf$/i, "") || "document";
    const outputName = `${baseName}-commented.pdf`;
    return new NextResponse(Buffer.from(outputBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${outputName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("PDF comments error:", error);
    return NextResponse.json(
      { error: "Could not annotate this PDF. It may be damaged, encrypted, or use an unsupported PDF feature." },
      { status: 500 }
    );
  }
}
