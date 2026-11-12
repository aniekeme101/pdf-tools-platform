import { NextResponse } from "next/server";
import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";

export const runtime = "nodejs";

type Settings = {
  page?: number;
  pageRange?: string;
  rotation?: number;
  rotateScope?: string;
  numberPosition?: string;
  numberStart?: number;
  noteText?: string;
  annotationKind?: string;
  author?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  highlightColor?: string;
};

const HIGHLIGHT_COLORS: Record<string, [number, number, number]> = {
  yellow: [1, 0.86, 0.15],
  green: [0.35, 0.82, 0.48],
  blue: [0.35, 0.65, 1],
  pink: [1, 0.48, 0.7],
};

function parsePageRanges(input: string, totalPages: number): number[] {
  const pieces = input.split(",").map((part) => part.trim()).filter(Boolean);
  if (!pieces.length) throw new Error("Enter the page numbers or ranges to export.");
  const pages = new Set<number>();
  for (const piece of pieces) {
    const match = piece.match(/^(\d+)\s*(?:-\s*(\d+))?$/);
    if (!match) throw new Error(`Invalid page range "${piece}". Use a format such as 1-3, 5, 8-10.`);
    const start = Number(match[1]);
    const end = Number(match[2] ?? match[1]);
    if (start < 1 || end < start || end > totalPages) {
      throw new Error(`Page range "${piece}" is outside this document. It contains ${totalPages} pages.`);
    }
    for (let page = start; page <= end; page++) pages.add(page - 1);
  }
  return [...pages].sort((a, b) => a - b);
}

function safeName(name: string, suffix: string) {
  const base = name.replace(/\.pdf$/i, "").replace(/[^\w.-]+/g, "-").slice(0, 100) || "document";
  return `${base}-${suffix}.pdf`;
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    const action = form.get("action");
    const settingsValue = form.get("settings");
    if (!(file instanceof File)) return NextResponse.json({ error: "Please upload a PDF file." }, { status: 400 });
    if (!file.name.toLowerCase().endsWith(".pdf") || file.size === 0) return NextResponse.json({ error: "Please upload a valid PDF file." }, { status: 400 });
    if (file.size > 30 * 1024 * 1024) return NextResponse.json({ error: "PDFs must be 30 MB or smaller." }, { status: 413 });
    if (typeof action !== "string" || !["annotate", "split", "rotate", "page-numbers", "compress"].includes(action)) {
      return NextResponse.json({ error: "Choose a valid PDF tool." }, { status: 400 });
    }
    let settings: Settings = {};
    try { settings = typeof settingsValue === "string" ? JSON.parse(settingsValue) as Settings : {}; }
    catch { return NextResponse.json({ error: "The tool settings are invalid." }, { status: 400 }); }

    const originalBytes = await file.arrayBuffer();
    const pdf = await PDFDocument.load(originalBytes);
    const pages = pdf.getPages();
    if (!pages.length) return NextResponse.json({ error: "This PDF does not contain any pages." }, { status: 400 });

    let outputDoc = pdf;
    let suffix = "edited";

    if (action === "split") {
      const selectedIndexes = parsePageRanges(settings.pageRange ?? "", pages.length);
      outputDoc = await PDFDocument.create();
      const copied = await outputDoc.copyPages(pdf, selectedIndexes);
      copied.forEach((page) => outputDoc.addPage(page));
      suffix = "split";
    } else if (action === "rotate") {
      const rotation = Number(settings.rotation ?? 90);
      if (![90, 180, 270].includes(rotation)) return NextResponse.json({ error: "Choose a rotation of 90, 180, or 270 degrees." }, { status: 400 });
      const targetPage = Number(settings.page ?? 1);
      if (settings.rotateScope === "selected" && (!Number.isInteger(targetPage) || targetPage < 1 || targetPage > pages.length)) {
        return NextResponse.json({ error: `Choose a page between 1 and ${pages.length}.` }, { status: 400 });
      }
      pages.forEach((page, index) => {
        if (settings.rotateScope !== "selected" || index === targetPage - 1) {
          const current = page.getRotation().angle;
          page.setRotation(degrees((current + rotation) % 360));
        }
      });
      suffix = "rotated";
    } else if (action === "page-numbers") {
      const font = await pdf.embedFont(StandardFonts.Helvetica);
      const start = Number(settings.numberStart ?? 1);
      if (!Number.isInteger(start) || start < 1 || start > 1000000) return NextResponse.json({ error: "The starting page number must be a positive whole number." }, { status: 400 });
      const position = settings.numberPosition ?? "bottom-center";
      for (let index = 0; index < pages.length; index++) {
        const page = pages[index];
        const { width, height } = page.getSize();
        const label = String(start + index);
        const fontSize = 10;
        const textWidth = font.widthOfTextAtSize(label, fontSize);
        const margin = 28;
        let x = (width - textWidth) / 2;
        let y = margin;
        if (position.includes("left")) x = margin;
        if (position.includes("right")) x = width - textWidth - margin;
        if (position.startsWith("top")) y = height - margin - fontSize;
        page.drawText(label, { x, y, size: fontSize, font, color: rgb(0.25, 0.29, 0.35) });
      }
      suffix = "numbered";
    } else if (action === "annotate") {
      const targetPage = Number(settings.page ?? 1);
      if (!Number.isInteger(targetPage) || targetPage < 1 || targetPage > pages.length) return NextResponse.json({ error: `Choose a page between 1 and ${pages.length}.` }, { status: 400 });
      const page = pages[targetPage - 1];
      const { width: pageWidth, height: pageHeight } = page.getSize();
      const x = Number(settings.x ?? 50);
      const y = Number(settings.y ?? 50);
      const boxWidth = Number(settings.width ?? 220);
      const boxHeight = Number(settings.height ?? 28);
      if (![x, y, boxWidth, boxHeight].every(Number.isFinite) || x < 0 || y < 0 || boxWidth <= 0 || boxHeight <= 0 || x + boxWidth > pageWidth || y + boxHeight > pageHeight) {
        return NextResponse.json({ error: `The annotation area must fit within page ${targetPage} (${Math.round(pageWidth)} × ${Math.round(pageHeight)} points). Adjust X, Y, width, or height.` }, { status: 400 });
      }
      if (settings.annotationKind === "highlight") {
        const color = HIGHLIGHT_COLORS[settings.highlightColor ?? "yellow"] ?? HIGHLIGHT_COLORS.yellow;
        page.drawRectangle({ x, y, width: boxWidth, height: boxHeight, color: rgb(...color), opacity: 0.42, borderWidth: 0 });
      } else {
        const text = String(settings.noteText ?? "").trim();
        if (!text) return NextResponse.json({ error: "Enter the text you want to add to the PDF." }, { status: 400 });
        if (text.length > 500) return NextResponse.json({ error: "Keep the note to 500 characters or fewer." }, { status: 400 });
        const font = await pdf.embedFont(StandardFonts.Helvetica);
        const fontSize = Math.max(8, Math.min(18, boxHeight * 0.55));
        const author = String(settings.author ?? "PaperFlow").trim().slice(0, 80) || "PaperFlow";
        page.drawRectangle({ x, y, width: boxWidth, height: boxHeight, color: rgb(1, 1, 0.88), opacity: 0.92, borderColor: rgb(0.9, 0.78, 0.35), borderWidth: 0.7 });
        const content = `${author}: ${text}`.slice(0, 160);
        page.drawText(content, { x: x + 5, y: y + Math.max(4, (boxHeight - fontSize) / 2), size: fontSize, font, color: rgb(0.15, 0.17, 0.2), maxWidth: Math.max(10, boxWidth - 10) });
      }
      suffix = "annotated";
    } else if (action === "compress") {
      // pdf-lib rewrites the document structure. It does not recompress embedded images.
      suffix = "optimized";
    }

    const outputBytes = await outputDoc.save({ useObjectStreams: true });
    const outputName = safeName(file.name, suffix);
    return new NextResponse(Buffer.from(outputBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${outputName}"`,
        "Cache-Control": "no-store",
        "X-PaperFlow-Original-Size": String(file.size),
        "X-PaperFlow-Output-Size": String(outputBytes.byteLength),
      },
    });
  } catch (error) {
    console.error("PaperFlow PDF editor error:", error);
    const message = error instanceof Error ? error.message : "";
    if (message.includes("encrypted") || message.toLowerCase().includes("password")) {
      return NextResponse.json({ error: "This PDF may be password-protected. Remove its password first, then try again." }, { status: 400 });
    }
    return NextResponse.json({ error: message || "Could not process this PDF. It may be damaged, encrypted, or use an unsupported PDF feature." }, { status: 500 });
  }
}
