
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import * as pdfjsLib from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";

type Highlight = {
  id: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

type Rectangle = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export default function HighlightPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const pdfRef = useRef<PDFDocumentProxy | null>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [dragRect, setDragRect] = useState<Rectangle | null>(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [resultUrl, setResultUrl] = useState("");
  const [resultName, setResultName] = useState("");

  const destroyPdfSafely = useCallback(async () => {
    if (renderTaskRef.current) {
      try {
        renderTaskRef.current.cancel();
      } catch {
        // Rendering may already have finished.
      }
      renderTaskRef.current = null;
    }

    const pdf = pdfRef.current;
    pdfRef.current = null;

    if (pdf) {
      try {
        pdf.cleanup();
      } catch {
        // Ignore cleanup errors.
      }
    }
  }, []);

  useEffect(() => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

    return () => {
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // Ignore cleanup errors.
        }
      }

      const pdf = pdfRef.current;
      if (pdf) {
        try {
          pdf.cleanup();
        } catch {
          // Ignore cleanup errors.
        }
      }
    };
  }, []);

  useEffect(() => {
    if (!resultUrl) return;

    return () => {
      URL.revokeObjectURL(resultUrl);
    };
  }, [resultUrl]);

  // Render the current PDF page in the editor.
  useEffect(() => {
    let cancelled = false;

    async function renderPage() {
      const pdf = pdfRef.current;
      const canvas = canvasRef.current;

      if (!pdf || !canvas || !file || resultUrl) return;

      try {
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch {
            // Ignore an already completed task.
          }
          renderTaskRef.current = null;
        }

        const page = await pdf.getPage(pageNumber);
        if (cancelled) return;

        const scale = 1.5;
        const viewport = page.getViewport({ scale });
        const context = canvas.getContext("2d");

        if (!context) {
          setError("Your browser could not display this PDF page.");
          return;
        }

        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);

        const task = page.render({
          canvas,
          canvasContext: context,
          viewport,
        });

        renderTaskRef.current = task;
        await task.promise;

        if (!cancelled) {
          renderTaskRef.current = null;
        }
      } catch (err) {
        if (
          !cancelled &&
          !(err instanceof Error &&
            err.name === "RenderingCancelledException")
        ) {
          setError("Unable to display this PDF page. Please try again.");
        }
      }
    }

    void renderPage();

    return () => {
      cancelled = true;
    };
  }, [file, pageNumber, resultUrl]);

  async function selectFile(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const selected = event.target.files?.[0];
    event.target.value = "";

    if (!selected) return;

    setError("");

    if (
      selected.type !== "application/pdf" &&
      !selected.name.toLowerCase().endsWith(".pdf")
    ) {
      setError("Please choose a PDF file.");
      return;
    }

    if (selected.size > 20 * 1024 * 1024) {
      setError("Your PDF must be 20 MB or smaller.");
      return;
    }

    setLoading(true);

    try {
      await destroyPdfSafely();

      setFile(null);
      setPageCount(0);
      setPageNumber(1);
      setHighlights([]);
      setDragRect(null);
      setResultUrl("");
      setResultName("");

      const bytes = await selected.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: bytes });
      const pdf = await loadingTask.promise;

      pdfRef.current = pdf;
      setFile(selected);
      setPageCount(pdf.numPages);
    } catch {
      setError("We couldn't open that PDF. Please try another file.");
      await destroyPdfSafely();
    } finally {
      setLoading(false);
    }
  }

  function getPointerPosition(
    event: React.PointerEvent<HTMLDivElement>
  ) {
    const wrapper = wrapperRef.current;
    if (!wrapper) return null;

    const bounds = wrapper.getBoundingClientRect();

    if (!bounds.width || !bounds.height) return null;

    return {
      x: Math.max(0, Math.min(event.clientX - bounds.left, bounds.width)),
      y: Math.max(0, Math.min(event.clientY - bounds.top, bounds.height)),
      width: bounds.width,
      height: bounds.height,
    };
  }

  function handlePointerDown(
    event: React.PointerEvent<HTMLDivElement>
  ) {
    if (!file || processing || resultUrl) return;

    const position = getPointerPosition(event);
    if (!position) return;

    event.currentTarget.setPointerCapture(event.pointerId);

    dragStartRef.current = {
      x: position.x,
      y: position.y,
    };

    setDragRect({
      left: position.x,
      top: position.y,
      width: 0,
      height: 0,
    });
  }

  function handlePointerMove(
    event: React.PointerEvent<HTMLDivElement>
  ) {
    if (!dragStartRef.current) return;

    const position = getPointerPosition(event);
    if (!position) return;

    const start = dragStartRef.current;

    setDragRect({
      left: Math.min(start.x, position.x),
      top: Math.min(start.y, position.y),
      width: Math.abs(position.x - start.x),
      height: Math.abs(position.y - start.y),
    });
  }

  function handlePointerUp(
    event: React.PointerEvent<HTMLDivElement>
  ) {
    const start = dragStartRef.current;
    const position = getPointerPosition(event);
    const canvas = canvasRef.current;

    dragStartRef.current = null;
    setDragRect(null);

    if (!start || !position || !canvas) return;

    const left = Math.min(start.x, position.x);
    const top = Math.min(start.y, position.y);
    const width = Math.abs(position.x - start.x);
    const height = Math.abs(position.y - start.y);

    if (width < 5 || height < 5) return;

    const scaleX = canvas.width / position.width;
    const scaleY = canvas.height / position.height;
    const pdfScale = 1.5;

    const newHighlight: Highlight = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      page: pageNumber,
      x: (left * scaleX) / pdfScale,
      y: (canvas.height - (top + height) * scaleY) / pdfScale,
      width: (width * scaleX) / pdfScale,
      height: (height * scaleY) / pdfScale,
    };

    setHighlights((previous) => [...previous, newHighlight]);
  }

  function removeHighlight(id: string) {
    setHighlights((previous) =>
      previous.filter((item) => item.id !== id)
    );
  }

  // Generate the PDF with every highlight selected so far.
  async function createHighlightedPdf() {
    if (!file || highlights.length === 0) {
      setError("Select at least one area to highlight first.");
      return;
    }

    setProcessing(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append(
        "highlights",
        JSON.stringify(
          highlights.map(({ page, x, y, width, height }) => ({
            page,
            x,
            y,
            width,
            height,
          }))
        )
      );

      const response = await fetch("/api/highlight", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);

        throw new Error(
          data?.error || "Unable to highlight this PDF. Please try again."
        );
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      setResultName(
        `${file.name.replace(/\.pdf$/i, "")}-highlighted.pdf`
      );
      setResultUrl(url);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while highlighting your PDF."
      );
    } finally {
      setProcessing(false);
    }
  }

  // Return to editing without removing existing highlights.
  function continueHighlighting() {
    setResultUrl("");
    setResultName("");
    setError("");
    setPageNumber(1);
  }

  async function startOver() {
    await destroyPdfSafely();

    setFile(null);
    setPageCount(0);
    setPageNumber(1);
    setHighlights([]);
    setDragRect(null);
    setError("");
    setResultUrl("");
    setResultName("");

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  const currentPageHighlights = highlights.filter(
    (item) => item.page === pageNumber
  );

  const canvas = canvasRef.current;
  const displayWidth =
    wrapperRef.current?.getBoundingClientRect().width ?? 0;

  const displayHeight =
    canvas && canvas.width
      ? (canvas.height / canvas.width) * displayWidth
      : 0;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link
            href="/"
            className="text-xl font-extrabold tracking-tight"
          >
            <span className="text-blue-600">P</span> PaperFlow
          </Link>

          <Link
            href="/"
            className="text-sm font-semibold text-slate-600 hover:text-blue-600"
          >
            ← Back to home
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto mb-8 max-w-2xl text-center">
          <div className="mb-3 text-4xl">🖍️</div>

          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Highlight PDF
          </h1>

          <p className="mt-3 text-slate-600">
            Highlight important passages, preview your changes, and download
            the finished document.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {!file ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={loading}
              className="flex w-full flex-col items-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-5 py-12 text-center transition hover:border-blue-400 hover:bg-blue-50/50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="text-4xl">📄</span>
              <span className="mt-4 font-bold">
                {loading ? "Opening PDF..." : "Choose your PDF"}
              </span>
              <span className="mt-2 text-sm text-slate-500">
                PDF files up to 20 MB
              </span>
              <span className="mt-4 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold">
                Browse files
              </span>
            </button>

            <input
              ref={inputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={selectFile}
              className="hidden"
            />

            <p className="mt-4 text-center text-xs text-slate-500">
              Your original document stays unchanged.
            </p>
          </div>
        ) : resultUrl ? (
          // PREVIEW MODE
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 font-bold text-green-700">
                    ✓
                  </span>
                  <h2 className="text-lg font-bold">
                    Your highlighted PDF is ready
                  </h2>
                </div>

                <p className="mt-2 break-all text-sm text-slate-500">
                  {resultName}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  {highlights.length} highlighted{" "}
                  {highlights.length === 1 ? "area" : "areas"}
                </p>
              </div>

              <a
                href={resultUrl}
                download={resultName}
                className="inline-flex shrink-0 items-center justify-center rounded-xl bg-blue-600 px-5 py-3 font-bold text-white transition hover:bg-blue-700"
              >
                ↓ Download PDF
              </a>
            </div>

            <div className="bg-slate-100 p-3 sm:p-5">
              <iframe
                src={resultUrl}
                title="Highlighted PDF preview"
                className="h-[65vh] min-h-[400px] w-full rounded-lg border border-slate-200 bg-white sm:h-[750px]"
              />
            </div>

            <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div>
                <p className="font-semibold">Want to make more changes?</p>
                <p className="mt-1 text-sm text-slate-500">
                  Continue editing your document. Your existing highlights
                  will be kept.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={continueHighlighting}
                  className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"
                >
                  Continue highlighting
                </button>

                <button
                  type="button"
                  onClick={startOver}
                  className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold hover:bg-slate-50"
                >
                  Start over
                </button>
              </div>
            </div>
          </section>
        ) : (
          // EDITING MODE
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
              <div className="min-w-0">
                <p className="truncate font-semibold">{file.name}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {pageCount} {pageCount === 1 ? "page" : "pages"} ·{" "}
                  {highlights.length}{" "}
                  {highlights.length === 1 ? "highlight" : "highlights"}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  disabled={processing}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
                >
                  Change PDF
                </button>

                <button
                  type="button"
                  onClick={startOver}
                  disabled={processing}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
                >
                  Start over
                </button>
              </div>

              <input
                ref={inputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={selectFile}
                className="hidden"
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    disabled={pageNumber <= 1 || processing}
                    onClick={() =>
                      setPageNumber((n) => Math.max(1, n - 1))
                    }
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    ← Previous
                  </button>

                  <span className="text-sm font-semibold">
                    Page {pageNumber} of {pageCount}
                  </span>

                  <button
                    type="button"
                    disabled={pageNumber >= pageCount || processing}
                    onClick={() =>
                      setPageNumber((n) => Math.min(pageCount, n + 1))
                    }
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next →
                  </button>
                </div>

                <p className="mb-3 text-center text-xs text-slate-500">
                  Click and drag over an area to highlight it.
                </p>

                <div
                  ref={wrapperRef}
                  className="relative mx-auto w-full overflow-hidden bg-white shadow-sm"
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={() => {
                    dragStartRef.current = null;
                    setDragRect(null);
                  }}
                >
                  <canvas
                    ref={canvasRef}
                    className="block h-auto w-full"
                  />

                  {currentPageHighlights.map((highlight) => {
                    if (!canvas || !displayWidth || !displayHeight) {
                      return null;
                    }

                    const scaleX = displayWidth / (canvas.width / 1.5);
                    const scaleY = displayHeight / (canvas.height / 1.5);

                    return (
                      <div
                        key={highlight.id}
                        className="pointer-events-none absolute bg-yellow-300/50 ring-1 ring-yellow-500/70"
                        style={{
                          left: highlight.x * scaleX,
                          top:
                            (canvas.height / 1.5 -
                              highlight.y -
                              highlight.height) *
                            scaleY,
                          width: highlight.width * scaleX,
                          height: highlight.height * scaleY,
                        }}
                      />
                    );
                  })}

                  {dragRect && (
                    <div
                      className="pointer-events-none absolute border-2 border-yellow-500 bg-yellow-300/40"
                      style={{
                        left: dragRect.left,
                        top: dragRect.top,
                        width: dragRect.width,
                        height: dragRect.height,
                      }}
                    />
                  )}
                </div>
              </div>

              <aside className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="font-bold">Your highlights</h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Highlights on page {pageNumber}.
                  </p>

                  {currentPageHighlights.length === 0 ? (
                    <p className="mt-5 rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
                      No highlights on this page yet. Drag over an area
                      in the document to add one.
                    </p>
                  ) : (
                    <ul className="mt-4 space-y-2">
                      {currentPageHighlights.map((highlight, index) => (
                        <li
                          key={highlight.id}
                          className="flex items-center justify-between gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm"
                        >
                          <span>Highlight {index + 1}</span>

                          <button
                            type="button"
                            onClick={() => removeHighlight(highlight.id)}
                            className="font-semibold text-red-600 hover:text-red-700"
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  <p className="mt-4 text-xs text-slate-500">
                    Total across all pages: {highlights.length}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="font-bold">Finish your PDF</h2>

                  <p className="mt-2 text-sm text-slate-600">
                    You can preview the result and return to this editor
                    whenever you need to add more highlights.
                  </p>

                  <button
                    type="button"
                    onClick={createHighlightedPdf}
                    disabled={processing || highlights.length === 0}
                    className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-3 font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {processing ? "Creating PDF..." : "Apply highlights"}
                  </button>
                </div>
              </aside>
            </div>
          </div>
        )}

        <p className="mt-8 text-center text-xs text-slate-500">
          PaperFlow · Simple PDF tools, all in one place.
        </p>
      </section>
    </main>
  );
}
