
"use client";

import { useEffect, useState } from "react";

export default function PdfToWordPage() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [downloadName, setDownloadName] = useState("");

  useEffect(() => {
    return () => {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    };
  }, [downloadUrl]);

  function handleFile(nextFile?: File) {
    setError("");

    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl("");
    setDownloadName("");

    if (!nextFile) {
      setFile(null);
      return;
    }

    if (
      !nextFile.name.toLowerCase().endsWith(".pdf") &&
      nextFile.type !== "application/pdf"
    ) {
      setFile(null);
      setError("Please choose a PDF file.");
      return;
    }

    if (nextFile.size > 30 * 1024 * 1024) {
      setFile(null);
      setError("Your PDF must be smaller than 30 MB.");
      return;
    }

    setFile(nextFile);
  }

  async function convert() {
    if (!file) {
      setError("Choose a PDF file first.");
      return;
    }

    setBusy(true);
    setError("");
    setDownloadUrl("");
    setDownloadName("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/pdf-to-word", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(
          result?.error || "Conversion failed. Please try another PDF."
        );
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      setDownloadUrl(url);
      setDownloadName(
        `${file.name.replace(/\.pdf$/i, "") || "converted-document"}.docx`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong during conversion."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <a href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-lg font-bold text-white">
              P
            </span>
            <span className="text-xl font-bold tracking-tight">
              PaperFlow
            </span>
          </a>

          <a
            href="/"
            className="text-sm font-medium text-slate-600 hover:text-blue-700"
          >
            ← All tools
          </a>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-5 py-12 sm:py-16">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-2xl">
            📝
          </div>

          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
            PDF converter
          </p>

          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            PDF to Word Converter
          </h1>

          <p className="mt-4 text-base leading-7 text-slate-600">
            Convert your PDF into an editable Microsoft Word document.
            Upload your file, convert it, and download your document when
            it is ready.
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <label
            htmlFor="pdf-file"
            className="flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center transition hover:border-blue-400 hover:bg-blue-50/50"
          >
            <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white text-2xl shadow-sm">
              📄
            </span>

            <span className="text-base font-semibold">
              {file ? file.name : "Choose a PDF to convert"}
            </span>

            <span className="mt-2 text-sm text-slate-500">
              {file
                ? `${(file.size / (1024 * 1024)).toFixed(2)} MB · PDF document`
                : "Browse your device · Maximum 30 MB"}
            </span>

            <span className="mt-4 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white">
              Browse files
            </span>

            <input
              id="pdf-file"
              type="file"
              accept="application/pdf,.pdf"
              className="sr-only"
              onChange={(event) =>
                handleFile(event.target.files?.[0])
              }
            />
          </label>

          {error && (
            <div
              role="alert"
              className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={convert}
            disabled={!file || busy}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {busy ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Converting PDF…
              </>
            ) : (
              "Convert to Word"
            )}
          </button>

          {downloadUrl && (
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <p className="font-semibold text-emerald-900">
                Your Word document is ready!
              </p>

              <p className="mt-1 break-all text-sm text-emerald-800">
                {downloadName}
              </p>

              <a
                href={downloadUrl}
                download={downloadName}
                className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white transition hover:bg-emerald-800 sm:w-auto"
              >
                Download Word document
              </a>
            </div>
          )}
        </div>

        <div className="mx-auto mt-7 max-w-2xl rounded-2xl bg-blue-50 p-5 text-sm leading-6 text-slate-700">
          <p className="font-semibold text-slate-900">
            About conversion quality
          </p>
          <p className="mt-1">
            Complex layouts, tables, and columns may not convert perfectly.
            Scanned PDFs may need OCR before their text becomes editable.
          </p>
        </div>
      </section>
    </main>
  );
}
