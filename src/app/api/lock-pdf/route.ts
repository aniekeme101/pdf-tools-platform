
import { NextRequest, NextResponse } from "next/server";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
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

function encryptPdf(
  inputPath: string,
  outputPath: string,
  userPassword: string,
  ownerPassword: string
): Promise<void> {
  const python = path.join(
    process.cwd(),
    ".venv",
    "bin",
    "python"
  );

  const script = [
    "import sys",
    "import pikepdf",
    "src, dst, user_password, owner_password = sys.argv[1:5]",
    "with pikepdf.open(src) as pdf:",
    "    encryption = pikepdf.Encryption(",
    "        user=user_password,",
    "        owner=owner_password,",
    "        R=6,",
    "    )",
    "    pdf.save(dst, encryption=encryption)",
  ].join("\n");

  return new Promise((resolve, reject) => {
    const child = spawn(
      python,
      [
        "-c",
        script,
        inputPath,
        outputPath,
        userPassword,
        ownerPassword,
      ],
      {
        stdio: ["ignore", "ignore", "pipe"],
      }
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
              `PDF encryption exited with code ${code}`
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
    const password = formData.get("password");

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

    if (
      typeof password !== "string" ||
      password.length < 8 ||
      password.length > 128
    ) {
      return NextResponse.json(
        { error: "Use a password between 8 and 128 characters." },
        { status: 400 }
      );
    }

    tempDir = await mkdtemp(
      path.join(os.tmpdir(), "paperflow-lock-pdf-")
    );

    const inputPath = path.join(tempDir, "input.pdf");
    const outputPath = path.join(tempDir, "protected.pdf");

    await writeFile(
      inputPath,
      Buffer.from(await file.arrayBuffer())
    );

    const ownerPassword = randomBytes(32).toString("base64url");

    await encryptPdf(
      inputPath,
      outputPath,
      password,
      ownerPassword
    );

    const output = await readFile(outputPath);

    const baseName =
      path
        .basename(file.name, path.extname(file.name))
        .replace(/[\r\n"]/g, "_") || "document";

    return new NextResponse(new Uint8Array(output), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition":
          `attachment; filename="${baseName}-locked.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const details =
      error instanceof Error ? error.message : "";

    console.error("Lock PDF failed:", details);

    if (details.includes("No module named 'pikepdf'")) {
      return NextResponse.json(
        {
          error:
            "The PDF encryption engine is not installed. Activate .venv and run: python -m pip install pikepdf",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error:
          "Could not protect this PDF. It may be damaged or already password-protected. Try an unlocked PDF and try again.",
      },
      { status: 400 }
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
