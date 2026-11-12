
import { NextRequest, NextResponse } from "next/server";
import { spawn } from "node:child_process";
import {
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_FILE_SIZE = 30 * 1024 * 1024;

function convertPdfToDocx(
  inputPath: string,
  outputPath: string
): Promise<void> {
  const python = path.join(
    process.cwd(),
    ".venv",
    "bin",
    "python"
  );

  const script = [
    "import sys",
    "from pdf2docx import Converter",
    "src, dst = sys.argv[1], sys.argv[2]",
    "cv = Converter(src)",
    "try:",
    "    cv.convert(dst, start=0, end=None)",
    "finally:",
    "    cv.close()",
  ].join("\n");

  return new Promise((resolve, reject) => {
    const child = spawn(
      python,
      ["-c", script, inputPath, outputPath],
      { stdio: ["ignore", "ignore", "pipe"] }
    );

    let stderr = "";

    child.stderr.setEncoding("utf8");

    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;

      if (stderr.length > 6000) {
        stderr = stderr.slice(-6000);
      }
    });

    child.on("error", reject);

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(
            stderr.trim() ||
              `Conversion process exited with code ${code}`
          )
        );
      }
    });
  });
}

export async function POST(request: NextRequest) {
  let tempDir = "";

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Please upload a PDF file." },
        { status: 400 }
      );
    }

    if (
      !file.name.toLowerCase().endsWith(".pdf") &&
      file.type !== "application/pdf"
    ) {
      return NextResponse.json(
        { error: "The uploaded file must be a PDF." },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { error: "The selected PDF is empty." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "The file exceeds the 30 MB limit." },
        { status: 413 }
      );
    }

    tempDir = await mkdtemp(
      path.join(os.tmpdir(), "paperflow-pdf-to-word-")
    );

    const inputPath = path.join(tempDir, "input.pdf");
    const outputPath = path.join(tempDir, "converted.docx");

    await writeFile(
      inputPath,
      Buffer.from(await file.arrayBuffer())
    );

    await convertPdfToDocx(inputPath, outputPath);

    const output = await readFile(outputPath);

    const baseName =
      path
        .basename(file.name, path.extname(file.name))
        .replace(/[\r\n"]/g, "_") || "converted-document";

    return new NextResponse(output, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition":
          `attachment; filename="${baseName}.docx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const details =
      error instanceof Error ? error.message : "";

    console.error("PDF to Word conversion failed:", details);

    if (details.includes("No module named 'pdf2docx'")) {
      return NextResponse.json(
        {
          error:
            "The conversion engine is missing. Activate the project virtual environment and install pdf2docx.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error:
          "Conversion failed. The PDF may be damaged, password-protected, scanned, or too complex.",
      },
      { status: 500 }
    );
  } finally {
    if (tempDir) {
      await rm(tempDir, {
        recursive: true,
        force: true,
      }).catch(() => {});
    }
  }
}
