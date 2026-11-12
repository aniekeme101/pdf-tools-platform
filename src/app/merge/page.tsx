
"use client";

import { useEffect, useRef, useState } from "react";

type SelectedPdf = {
  id: string;
  file: File;
};

export default function MergePage() {
  const [files, setFiles] = useState<SelectedPdf[]>([]);
  const [isMerging, setIsMerging] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [mergedUrl, setMergedUrl] = useState("");
  const [mergedName, setMergedName] = useState("paperflow-merged.pdf");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (mergedUrl) URL.revokeObjectURL(mergedUrl);
    };
  }, [mergedUrl]);

  function addFiles(fileList: FileList | null) {
    if (!fileList) return;

    const incoming = Array.from(fileList);
    const next = [...files];
    let warning = "";

    for (const file of incoming) {
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        warning = "Only PDF files can be selected.";
        continue;
      }

      if (file.size === 0 || file.size > 10 * 1024 * 1024) {
        warning = "Each PDF must be smaller than 10 MB.";
        continue;
      }

      if (next.some((item) => item.file.name === file.name &&
        item.file.size === file.size &&
        item.file.lastModified === file.lastModified)) {
        continue;
      }

      next.push({
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
        file,
      });
    }

    if (next.length > 10) {
      setError("You can merge up to 10 PDF files at a time.");
      return;
    }

    setFiles(next);
    setError(warning);
    setMessage("");
    setMergedUrl("");
  }

  function removeFile(id: string) {
    setFiles((current) => current.filter((item) => item.id !== id));
    setError("");
    setMessage("");
    setMergedUrl("");
  }

  function moveFile(index: number, direction: -1 | 1) {
    const destination = index + direction;
    if (destination < 0 || destination >= files.length) return;

    setFiles((current) => {
      const updated = [...current];
      [updated[index], updated[destination]] = [
        updated[destination],
        updated[index],
      ];
      return updated;
    });

    setMergedUrl("");
    setMessage("");
  }

  async function mergePdfs() {
    if (files.length < 2) {
      setError("Please select at least two PDF files.");
      return;
    }

    const totalSize = files.reduce(
      (total, item) => total + item.file.size,
      0
    );

    if (totalSize > 30 * 1024 * 1024) {
      setError("The combined file size must not exceed 30 MB.");
      return;
    }

    setIsMerging(true);
    setError("");
    setMessage("Merging your PDFs...");
    setMergedUrl("");

    try {
      const formData = new FormData();

      files.forEach((item) => {
        formData.append("files", item.file);
      });

      const response = await fetch("/api/merge", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.error || "Unable to merge the PDFs.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      setMergedName("paperflow-merged.pdf");
      setMergedUrl(url);
      setMessage("Your PDFs have been merged successfully.");
    } catch (err) {
      setMessage("");
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setIsMerging(false);
    }
  }

  function downloadPdf() {
    if (!mergedUrl) return;

    const link = document.createElement("a");
    link.href = mergedUrl;
    link.download = mergedName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function resetAll() {
    setFiles([]);
    setError("");
    setMessage("");
    setMergedUrl("");
    if (inputRef.current) inputRef.current.value = "";
  }

  const totalSize = files.reduce(
    (total, item) => total + item.file.size,
    0
  );

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
          <a href="/" className="text-2xl font-bold tracking-tight text-blue-700">
            PaperFlow
          </a>
          <a href="/" className="text-sm font-medium text-slate-600 hover:text-blue-700">
            ← Back to home
          </a>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
        <div className="mb-8 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-blue-700">
            Free PDF tool
          </p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Merge PDF files
          </h1>
          <p className="mx-auto mt-4 max-w-xl leading-7 text-slate-600">
            Combine multiple PDFs into one document. Arrange the files in the
            order you want before merging.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <label
            htmlFor="pdf-files"
            className="flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/60 px-5 py-10 text-center transition hover:border-blue-400"
          >
            <span className="mb-3 text-4xl" aria-hidden="true">📄</span>
            <span className="font-semibold">Choose PDF files</span>
            <span className="mt-2 text-sm text-slate-500">
              Select multiple files · Up to 10 PDFs · 10 MB per file
            </span>
            <span className="mt-4 rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white">
              Select files
            </span>
          </label>

          <input
            ref={inputRef}
            id="pdf-files"
            type="file"
            accept=".pdf,application/pdf"
            multiple
            className="sr-only"
            onChange={(event) => {
              addFiles(event.target.files);
              event.target.value = "";
            }}
          />

          {files.length > 0 && (
            <div className="mt-7">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="font-semibold">
                  Selected files ({files.length})
                </h2>
                <span className="text-xs text-slate-500">
                  {(totalSize / (1024 * 1024)).toFixed(1)} MB total
                </span>
              </div>

              <p className="mb-4 text-sm text-slate-500">
                Use the arrows to change the order of the merged document.
              </p>

              <ul className="space-y-3">
                {files.map((item, index) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 p-3"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 font-semibold text-blue-700">
                      {index + 1}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {item.file.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {(item.file.size / 1024).toFixed(0)} KB
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label={`Move ${item.file.name} up`}
                        disabled={index === 0 || isMerging}
                        onClick={() => moveFile(index, -1)}
                        className="rounded-lg border px-2 py-2 text-sm disabled:opacity-30"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        aria-label={`Move ${item.file.name} down`}
                        disabled={index === files.length - 1 || isMerging}
                        onClick={() => moveFile(index, 1)}
                        className="rounded-lg border px-2 py-2 text-sm disabled:opacity-30"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        aria-label={`Remove ${item.file.name}`}
                        disabled={isMerging}
                        onClick={() => removeFile(item.id)}
                        className="rounded-lg px-2 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-30"
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={mergePdfs}
                  disabled={isMerging || files.length < 2 || totalSize > 30 * 1024 * 1024}
                  className="flex-1 rounded-xl bg-blue-700 px-5 py-3.5 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isMerging ? "Merging PDFs..." : "Merge PDF files"}
                </button>

                <button
                  type="button"
                  onClick={resetAll}
                  disabled={isMerging}
                  className="rounded-xl border border-slate-300 px-5 py-3.5 font-semibold hover:bg-slate-50 disabled:opacity-50"
                >
                  Clear all
                </button>
              </div>
            </div>
          )}

          {message && (
            <div
              role="status"
              className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800"
            >
              {message}
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {mergedUrl && (
            <div className="mt-7 border-t border-slate-200 pt-6">
              <h2 className="text-xl font-bold">Your merged PDF is ready</h2>
              <p className="mt-2 text-sm text-slate-600">
                Preview the document below, then download it when you're ready.
              </p>

              <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
                <iframe
                  src={mergedUrl}
                  title="Merged PDF preview"
                  className="h-[520px] w-full"
                />
              </div>

              <button
                type="button"
                onClick={downloadPdf}
                className="mt-5 w-full rounded-xl bg-emerald-600 px-5 py-3.5 font-semibold text-white hover:bg-emerald-700"
              >
                Download merged PDF
              </button>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          Your selected files are processed by your local PaperFlow server.
        </p>
      </section>
    </main>
  );
}
