
import { NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const runtime = "nodejs";
export const maxDuration = 90;

const execFileAsync = promisify(execFile);
const LIBREOFFICE =
  "/Applications/LibreOffice.app/Contents/MacOS/soffice";
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: Request) {
  let tempDir: string | undefined;

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Please upload a Word document." },
        { status: 400 }
      );
    }

    const extension = path.extname(file.name).toLowerCase();

    if (![".doc", ".docx"].includes(extension)) {
      return NextResponse.json(
        { error: "Only .doc and .docx files are supported." },
        { status: 400 }
      );
    }

    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Your file must be smaller than 10 MB and not empty." },
        { status: 400 }
      );
    }

    tempDir = await mkdtemp(path.join(tmpdir(), "paperflow-"));

    const inputPath = path.join(tempDir, `input${extension}`);
    const outputPath = path.join(tempDir, "input.pdf");
    const profilePath = path.join(tempDir, "lo-profile");

    await writeFile(inputPath, Buffer.from(await file.arrayBuffer()));

    await execFileAsync(
      LIBREOFFICE,
      [
        "--headless",
        `-env:UserInstallation=${pathToFileURL(profilePath).href}`,
        "--convert-to",
        "pdf",
        "--outdir",
        tempDir,
        inputPath,
      ],
      {
        timeout: 60_000,
        maxBuffer: 2 * 1024 * 1024,
      }
    );

    const pdf = await readFile(outputPath);

    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="paperflow-converted.pdf"',
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("PaperFlow conversion failed:", error);

    return NextResponse.json(
      { error: "Conversion failed. Please try another Word document." },
      { status: 500 }
    );
  } finally {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true }).catch(
        (error) => console.error("Temporary file cleanup failed:", error)
      );
    }
  }
}
