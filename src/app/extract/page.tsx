
"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";

type PdfJsModule = typeof import("pdfjs-dist");

function destroyPdfSafely(pdf: PDFDocumentProxy | null) {
  if (pdf && typeof (pdf as any).destroy === "function") {
    void (pdf as any).destroy().catch(() => {});
  }
}

function formatPages(pages: number[]) {
  const sorted = [...new Set(pages)].sort((a, b) => a - b);
  if (sorted.length === 0) return "";

  const ranges: string[] = [];
  let start = sorted[0];
  let end = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      ranges.push(start === end ? `${start}` : `${start}-${end}`);
      start = sorted[i];
      end = sorted[i];
    }
  }

  ranges.push(start === end ? `${start}` : `${start}-${end}`);
  return ranges.join(", ");
}

function parsePages(value: string, totalPages: number): number[] {
  if (!value.trim()) {
    throw new Error("Enter at least one page number.");
  }

  const result = new Set<number>();
  const parts = value.split(",");

  for (const rawPart of parts) {
    const part = rawPart.trim();

    if (!part) {
      throw new Error("Check your page numbers. There may be an empty entry.");
    }

    const match = part.match(/^(\d+)(?:\s*-\s*(\d+))?$/);

    if (!match) {
      throw new Error(
        'Use page numbers and ranges like "1, 3, 5-7".'
      );
    }

    const first = Number(match[1]);
    const last = match[2] ? Number(match[2]) : first;

    if (
      first < 1 ||
      last < 1 ||
      first > totalPages ||
      last > totalPages
    ) {
      throw new Error(`Page numbers must be between 1 and ${totalPages}.`);
    }

    if (first > last) {
      throw new Error(
        `The range "${part}" is backwards. Use the smaller number first.`
      );
    }

    for (let page = first; page <= last; page++) {
      result.add(page);
    }
  }

  return [...result].sort((a, b) => a - b);
}

function PageThumbnail({
  pdf,
  pageNumber,
  selected,
  onToggle,
}: {
  pdf: PDFDocumentProxy;
  pageNumber: number;
  selected: boolean;
  onToggle: (pageNumber: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [thumbnailError, setThumbnailError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let renderTask: ReturnType<
      Awaited<ReturnType<PDFDocumentProxy["getPage"]>>["render"]
    > | null = null;

    async function renderThumbnail() {
      try {
        const page = await pdf.getPage(pageNumber);
        if (cancelled || !canvasRef.current) return;

        const baseViewport = page.getViewport({ scale: 1 });
        const scale = Math.min(120 / baseViewport.width, 0.25);
        const viewport = page.getViewport({ scale });

        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");

        if (!context) {
          setThumbnailError(true);
          return;
        }

        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);

        renderTask = page.render({
          canvas,
          canvasContext: context,
          viewport,
        });

        await renderTask.promise;

        if (!cancelled) setThumbnailError(false);
      } catch {
        if (!cancelled) setThumbnailError(true);
      }
    }

    void renderThumbnail();

    return () => {
      cancelled = true;

      try {
        renderTask?.cancel();
      } catch {
        // Ignore a render task that has already finished.
      }
    };
  }, [pdf, pageNumber]);

  return (
    <button
      type="button"
      onClick={() => onToggle(pageNumber)}
      aria-pressed={selected}
      aria-label={`Page ${pageNumber}, ${selected ? "selected" : "not selected"}. Click to toggle.`}
      className={`flex min-w-0 flex-col items-center rounded-lg border-2 p-2 transition ${
        selected
          ? "border-blue-600 bg-blue-50 ring-1 ring-blue-200"
          : "border-gray-200 bg-white hover:border-gray-400"
      }`}
    >
      <div className="flex h-36 w-full items-center justify-center overflow-hidden rounded bg-gray-100">
        {thumbnailError ? (
          <span className="px-2 text-center text-xs text-gray-500">
            Preview unavailable
          </span>
        ) : (
          <canvas
            ref={canvasRef}
            className="block max-h-32 max-w-full bg-white shadow-sm"
          />
        )}
      </div>

      <span className="mt-2 text-xs font-semibold text-gray-800">
        Page {pageNumber}
      </span>

      <span
        className={`mt-1 text-xs font-medium ${
          selected ? "text-blue-700" : "text-gray-500"
        }`}
      >
        {selected ? "✓ Selected" : "Select"}
      </span>
    </button>
  );
}

export default function ExtractPdfPages() {
  const [pdfjs, setPdfjs] = useState<PdfJsModule | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [pageText, setPageText] = useState("");
  const [loadingPages, setLoadingPages] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [selectionOpen, setSelectionOpen] = useState(true);
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [resultName, setResultName] = useState("extracted-pages.pdf");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<PDFDocumentProxy | null>(null);
  const previewUrlRef = useRef("");

  useEffect(() => {
    let cancelled = false;

    async function loadPdfJs() {
      try {
        const module = await import("pdfjs-dist");
        module.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        if (!cancelled) setPdfjs(module);
      } catch {
        if (!cancelled) {
          setError("The PDF viewer could not load. Please refresh the page.");
        }
      }
    }

    void loadPdfJs();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }

      destroyPdfSafely(pdfRef.current);
      pdfRef.current = null;
    };
  }, []);

  function clearResult() {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = "";
    }

    setPreviewUrl("");
    setResultName("extracted-pages.pdf");
  }

  async function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const chosenFile = event.target.files?.[0];
    if (!chosenFile) return;

    setError("");
    setLoadingPages(true);
    clearResult();

    destroyPdfSafely(pdfRef.current);
    pdfRef.current = null;
    setPdf(null);
    setFile(null);
    setPageCount(0);
    setSelectedPages([]);
    setPageText("");
    setSelectionOpen(true);

    if (!chosenFile.name.toLowerCase().endsWith(".pdf")) {
      setError("Please choose a PDF file.");
      setLoadingPages(false);
      event.target.value = "";
      return;
    }

    if (chosenFile.size > 30 * 1024 * 1024) {
      setError("Please choose a PDF smaller than 30 MB.");
      setLoadingPages(false);
      event.target.value = "";
      return;
    }

    if (!pdfjs) {
      setError("The PDF viewer is still loading. Please try again.");
      setLoadingPages(false);
      return;
    }

    try {
      const bytes = await chosenFile.arrayBuffer();
      const loadingTask = pdfjs.getDocument({
        data: new Uint8Array(bytes),
      });
      const document = await loadingTask.promise;

      if (document.numPages > 500) {
        destroyPdfSafely(document);
        setError("This tool supports PDFs with up to 500 pages.");
        return;
      }

      pdfRef.current = document;
      setPdf(document);
      setFile(chosenFile);
      setPageCount(document.numPages);

      const allPages = Array.from(
        { length: document.numPages },
        (_, index) => index + 1
      );

      setSelectedPages(allPages);
      setPageText(formatPages(allPages));
    } catch {
      setError(
        "We couldn't open this PDF. It may be damaged or password-protected."
      );
    } finally {
      setLoadingPages(false);
    }
  }

  function togglePage(pageNumber: number) {
    const next = selectedPages.includes(pageNumber)
      ? selectedPages.filter((page) => page !== pageNumber)
      : [...selectedPages, pageNumber].sort((a, b) => a - b);

    setSelectedPages(next);
    setPageText(formatPages(next));
    setError("");
  }

  function handleSelectAll() {
    const allPages = Array.from(
      { length: pageCount },
      (_, index) => index + 1
    );

    setSelectedPages(allPages);
    setPageText(formatPages(allPages));
    setError("");
  }

  function handleClearSelection() {
    setSelectedPages([]);
    setPageText("");
    setError("");
  }

  function applyPageNumbers() {
    try {
      const pages = parsePages(pageText, pageCount);
      setSelectedPages(pages);
      setPageText(formatPages(pages));
      setError("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Please check your page numbers."
      );
    }
  }

  async function extractPages() {
    if (!file) {
      setError("Please upload a PDF first.");
      return;
    }

    if (selectedPages.length === 0) {
      setError("Please select or enter at least one page.");
      return;
    }

    setError("");
    setExtracting(true);
    clearResult();

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append(
        "pages",
        [...selectedPages].sort((a, b) => a - b).join(",")
      );

      const response = await fetch("/api/extract", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Could not extract the selected pages.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      previewUrlRef.current = url;
      setPreviewUrl(url);
      setResultName(
        `${file.name.replace(/\.pdf$/i, "")}-extracted.pdf`
      );

      // Collapse the selection area after a successful extraction.
      setSelectionOpen(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while extracting pages."
      );
    } finally {
      setExtracting(false);
    }
  }

  function resetTool() {
    clearResult();

    destroyPdfSafely(pdfRef.current);
    pdfRef.current = null;

    setPdf(null);
    setFile(null);
    setPageCount(0);
    setSelectedPages([]);
    setPageText("");
    setError("");
    setLoadingPages(false);
    setExtracting(false);
    setSelectionOpen(true);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 text-gray-900">
      <div className="mx-auto max-w-6xl">
        <a
          href="/"
          className="inline-block text-sm font-medium text-blue-700 hover:underline"
        >
          ← Back to PaperFlow
        </a>

        <header className="mb-8 mt-5">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Extract PDF Pages
          </h1>
          <p className="mt-3 max-w-2xl text-gray-600">
            Choose the pages you need using thumbnails or enter page numbers
            manually. Save your selection as a new PDF.
          </p>
        </header>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
          <label htmlFor="pdf-file" className="block text-sm font-semibold">
            Choose a PDF file
          </label>

          <input
            ref={fileInputRef}
            id="pdf-file"
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileChange}
            disabled={loadingPages || extracting}
            className="mt-3 block w-full rounded-lg border border-gray-300 p-3 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:font-semibold file:text-blue-700"
          />

          <p className="mt-2 text-xs text-gray-500">
            PDF files up to 30 MB and 500 pages are supported.
          </p>

          {!pdfjs && !error && (
            <p className="mt-4 text-sm text-gray-500">
              Preparing the PDF viewer…
            </p>
          )}

          {loadingPages && (
            <p className="mt-4 text-sm text-blue-700">
              Loading your PDF…
            </p>
          )}

          {error && (
            <p
              role="alert"
              className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}
        </section>

        {file && pageCount > 0 && (
          <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold">Your PDF</h2>
                <p className="mt-1 break-all text-sm text-gray-600">
                  {file.name} · {pageCount} pages
                </p>
              </div>

              <button
                type="button"
                onClick={resetTool}
                disabled={extracting}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50"
              >
                Start over
              </button>
            </div>

            {!selectionOpen ? (
              <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4">
                <p className="font-semibold text-blue-900">
                  Extraction complete
                </p>
                <p className="mt-1 text-sm text-blue-800">
                  You can download your current result below or choose more
                  pages from this same PDF.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setSelectionOpen(true);
                    setError("");
                  }}
                  className="mt-4 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
                >
                  Continue extracting from this PDF
                </button>
              </div>
            ) : (
              <>
                <div className="mt-6">
                  <h2 className="text-xl font-bold">Select pages</h2>
                  <p className="mt-1 text-sm text-gray-600">
                    Click any thumbnail to select or deselect that page.
                    All pages start selected; you can change the selection
                    individually.
                  </p>
                </div>

                <div className="mt-5 rounded-xl border border-gray-200 p-4">
                  <label
                    htmlFor="page-numbers"
                    className="block text-sm font-semibold"
                  >
                    Enter page numbers manually
                  </label>

                  <p className="mt-1 text-xs text-gray-500">
                    Examples: 2, 4, 7 or 2, 4-7, 10
                  </p>

                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <input
                      id="page-numbers"
                      type="text"
                      value={pageText}
                      onChange={(event) => setPageText(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") applyPageNumbers();
                      }}
                      placeholder="e.g. 1, 3, 5-7"
                      className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />

                    <button
                      type="button"
                      onClick={applyPageNumbers}
                      className="rounded-lg border border-blue-700 px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                    >
                      Apply page numbers
                    </button>
                  </div>
                </div>

                <div className="mt-5 rounded-xl bg-blue-50 p-4">
                  <p className="text-sm font-semibold text-blue-900">
                    {selectedPages.length} of {pageCount} pages selected
                  </p>
                  <p className="mt-2 break-words text-sm text-blue-800">
                    <span className="font-semibold">Selected pages: </span>
                    {selectedPages.length > 0
                      ? formatPages(selectedPages)
                      : "None"}
                  </p>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold hover:bg-gray-50"
                  >
                    Select all
                  </button>

                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold hover:bg-gray-50"
                  >
                    Clear selection
                  </button>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
                  {pdf &&
                    Array.from({ length: pageCount }, (_, index) => {
                      const pageNumber = index + 1;

                      return (
                        <PageThumbnail
                          key={`${pageNumber}-${file.name}`}
                          pdf={pdf}
                          pageNumber={pageNumber}
                          selected={selectedPages.includes(pageNumber)}
                          onToggle={togglePage}
                        />
                      );
                    })}
                </div>

                <div className="mt-7 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={extractPages}
                    disabled={extracting || selectedPages.length === 0}
                    className="rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {extracting ? "Extracting pages…" : "Extract selected pages"}
                  </button>

                  <button
                    type="button"
                    onClick={resetTool}
                    disabled={extracting}
                    className="rounded-lg border border-gray-300 px-5 py-3 font-semibold hover:bg-gray-50 disabled:opacity-50"
                  >
                    Start over
                  </button>
                </div>
              </>
            )}
          </section>
        )}

        {previewUrl && (
          <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-xl font-bold">Your extracted PDF is ready</h2>
            <p className="mt-2 text-sm text-gray-600">
              Review the result below. Download it when you are ready.
            </p>

            <a
              href={previewUrl}
              download={resultName}
              className="mt-4 inline-flex rounded-lg bg-green-700 px-5 py-3 font-semibold text-white hover:bg-green-800"
            >
              Download extracted PDF
            </a>

            <iframe
              src={previewUrl}
              title="Extracted PDF preview"
              className="mt-5 h-[650px] w-full rounded-lg border border-gray-200"
            />
          </section>
        )}
      </div>
    </main>
  );
}
