"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import { PDFDocument } from "pdf-lib";

type SignatureMode = "typed" | "drawn";

type SignatureItem = {
  id: string;
  page: number;
  dataUrl: string;
  x: number;
  y: number;
  width: number;
  aspectRatio: number;
  pageAspect: number;
};

type DragState = {
  id: string;
  mode: "move" | "resize";
  startX: number;
  startY: number;
  originalX: number;
  originalY: number;
  originalWidth: number;
  pageAspect: number;
  aspectRatio: number;
};

const SIGNATURE_FONTS = [
  {
    label: "Elegant Script",
    value: '"Brush Script MT", "Segoe Script", cursive',
  },
  {
    label: "Handwriting",
    value: '"Lucida Handwriting", "Comic Sans MS", cursive',
  },
  {
    label: "Classic Cursive",
    value: '"URW Chancery L", "Apple Chancery", cursive',
  },
  {
    label: "Casual",
    value: '"Comic Sans MS", "Segoe Print", cursive',
  },
  {
    label: "Formal",
    value: '"Georgia", "Times New Roman", serif',
  },
];

// Premium-ready configuration.
// null means signature placements are currently unlimited.
const SIGNATURE_PLAN_CONFIG = {
  maxPlacements: null as number | null,
};

const INITIAL_PLACEMENT = {
  x: 35,
  y: 70,
  width: 27,
};

function signatureHeightPercent(
  width: number,
  imageAspectRatio: number,
  pageAspect: number
) {
  if (!pageAspect) return 0;
  return (width * imageAspectRatio) / pageAspect;
}

export default function SignPDFPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [pageAspect, setPageAspect] = useState(0.7);

  const [mode, setMode] = useState<SignatureMode>("typed");
  const [signatureText, setSignatureText] = useState("");
  const [font, setFont] = useState(SIGNATURE_FONTS[0].value);
  const [signatureDataUrl, setSignatureDataUrl] = useState("");

  const [signatures, setSignatures] = useState<SignatureItem[]>([]);
  const [selectedSignatureId, setSelectedSignatureId] = useState<
    string | null
  >(null);

  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [signedUrl, setSignedUrl] = useState("");

  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const pageContainerRef = useRef<HTMLDivElement>(null);
  const signedUrlRef = useRef("");
  const dragRef = useRef<DragState | null>(null);

  const clearSignedResult = useCallback(() => {
    if (signedUrlRef.current) {
      URL.revokeObjectURL(signedUrlRef.current);
      signedUrlRef.current = "";
    }

    setSignedUrl("");
    setSuccess("");
  }, []);

  useEffect(() => {
    return () => {
      if (signedUrlRef.current) {
        URL.revokeObjectURL(signedUrlRef.current);
        signedUrlRef.current = "";
      }
    };
  }, []);

  // Render the current PDF page in the preview canvas.
  useEffect(() => {
    if (!file || !pdfCanvasRef.current) return;

    let cancelled = false;
    let loadingTask: { destroy: () => Promise<void> } | null = null;
    let renderTask: {
      cancel: () => void;
      promise: Promise<void>;
    } | null = null;

    async function renderPDFPage() {
      setLoading(true);
      setError("");

      try {
        const pdfjs = await import("pdfjs-dist");

        if (cancelled) return;

        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        const bytes = await file!.arrayBuffer();

        if (cancelled) return;

        const task = pdfjs.getDocument({ data: bytes });
        loadingTask = task;

        const pdf = await task.promise;

        if (cancelled) return;

        setPageCount(pdf.numPages);

        const safePage = Math.max(
          1,
          Math.min(pageNumber, pdf.numPages)
        );

        const page = await pdf.getPage(safePage);

        if (cancelled) return;

        const viewport = page.getViewport({ scale: 1.35 });
        const canvas = pdfCanvasRef.current;
        const context = canvas?.getContext("2d");

        if (!canvas || !context) {
          throw new Error("Could not create the PDF preview canvas.");
        }

        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);

        setPageAspect(viewport.width / viewport.height);

        /*
         * Explicitly type the render parameters using the installed
         * PDF.js version. This helps avoid TypeScript inference conflicts
         * around the canvas rendering context.
         */
        const renderParameters: Parameters<typeof page.render>[0] = {
          canvas,
          canvasContext: context,
          viewport,
        };

        const currentRenderTask = page.render(renderParameters);

        renderTask = currentRenderTask;

        await currentRenderTask.promise;
      } catch (err) {
        if (!cancelled) {
          console.error("PDF preview error:", err);

          setError(
            "Could not preview this PDF. Try another PDF or check that it is not damaged."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void renderPDFPage();

    return () => {
      cancelled = true;

      try {
        renderTask?.cancel();
      } catch {
        // The rendering task may already have finished.
      }

      if (loadingTask) {
        void loadingTask.destroy().catch(() => {});
      }
    };
  }, [file, pageNumber]);

  // Generate a transparent PNG for the typed signature.
  useEffect(() => {
    if (mode !== "typed") return;

    const name = signatureText.trim();

    if (!name) {
      setSignatureDataUrl("");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 300;

    const context = canvas.getContext("2d");

    if (!context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#172554";
    context.textAlign = "center";
    context.textBaseline = "middle";

    let fontSize = 150;
    context.font = `${fontSize}px ${font}`;

    while (
      context.measureText(name).width > canvas.width - 60 &&
      fontSize > 35
    ) {
      fontSize -= 5;
      context.font = `${fontSize}px ${font}`;
    }

    context.fillText(name, canvas.width / 2, canvas.height / 2);

    setSignatureDataUrl(canvas.toDataURL("image/png"));
  }, [signatureText, font, mode]);

  const updateSignature = (
    id: string,
    updates: Partial<SignatureItem>
  ) => {
    // Clear the old result only when the signature is actually changed.
    setSignatures((current) =>
      current.map((signature) =>
        signature.id === id
          ? { ...signature, ...updates }
          : signature
      )
    );
  };

  const handleFileChange = (selectedFile?: File) => {
    if (!selectedFile) return;

    if (
      selectedFile.type !== "application/pdf" &&
      !selectedFile.name.toLowerCase().endsWith(".pdf")
    ) {
      setError("Please select a PDF file.");
      return;
    }

    if (selectedFile.size > 25 * 1024 * 1024) {
      setError("The maximum PDF file size is 25 MB.");
      return;
    }

    clearSignedResult();

    setError("");
    setSuccess("");
    setFile(selectedFile);
    setPageNumber(1);
    setPageCount(0);
    setPageAspect(0.7);
    setSignatures([]);
    setSelectedSignatureId(null);
    setSignatureDataUrl("");
    setSignatureText("");
    dragRef.current = null;
  };

  const startDrawing = (
    event: PointerEvent<HTMLCanvasElement>
  ) => {
    const canvas = drawCanvasRef.current;

    if (!canvas) return;

    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);

    const context = canvas.getContext("2d");

    if (!context) return;

    const rect = canvas.getBoundingClientRect();
    const x =
      ((event.clientX - rect.left) / rect.width) * canvas.width;
    const y =
      ((event.clientY - rect.top) / rect.height) * canvas.height;

    context.beginPath();
    context.moveTo(x, y);
    context.lineWidth = 7;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#172554";
  };

  const continueDrawing = (
    event: PointerEvent<HTMLCanvasElement>
  ) => {
    const canvas = drawCanvasRef.current;

    if (!canvas || !event.buttons) return;

    const context = canvas.getContext("2d");

    if (!context) return;

    const rect = canvas.getBoundingClientRect();
    const x =
      ((event.clientX - rect.left) / rect.width) * canvas.width;
    const y =
      ((event.clientY - rect.top) / rect.height) * canvas.height;

    context.lineTo(x, y);
    context.stroke();
  };

  const finishDrawing = () => {
    const canvas = drawCanvasRef.current;

    if (!canvas) return;

    setSignatureDataUrl(canvas.toDataURL("image/png"));
  };

  const clearDrawing = () => {
    const canvas = drawCanvasRef.current;

    if (!canvas) return;

    canvas
      .getContext("2d")
      ?.clearRect(0, 0, canvas.width, canvas.height);

    setSignatureDataUrl("");
  };

  const addSignature = () => {
    if (!file) {
      setError("Upload a PDF before adding a signature.");
      return;
    }

    if (!signatureDataUrl) {
      setError("Type your name or draw a signature first.");
      return;
    }

    if (
      SIGNATURE_PLAN_CONFIG.maxPlacements !== null &&
      signatures.length >= SIGNATURE_PLAN_CONFIG.maxPlacements
    ) {
      setError(
        "You have reached the signature placement limit for this plan."
      );
      return;
    }

    clearSignedResult();

    const id = crypto.randomUUID();
    const aspectRatio = mode === "typed" ? 300 / 1200 : 180 / 600;
    const width = INITIAL_PLACEMENT.width;

    const height = signatureHeightPercent(
      width,
      aspectRatio,
      pageAspect
    );

    const y = Math.min(INITIAL_PLACEMENT.y, 100 - height);

    const signature: SignatureItem = {
      id,
      page: pageNumber,
      dataUrl: signatureDataUrl,
      x: INITIAL_PLACEMENT.x,
      y,
      width,
      aspectRatio,
      pageAspect,
    };

    setSignatures((current) => [...current, signature]);
    setSelectedSignatureId(id);
    setError("");
    setSuccess("");
  };

  const deleteSignature = (id: string) => {
    clearSignedResult();

    setSignatures((current) =>
      current.filter((signature) => signature.id !== id)
    );

    setSelectedSignatureId((current) =>
      current === id ? null : current
    );

    dragRef.current = null;
  };

  const deleteSelectedSignature = () => {
    if (!selectedSignatureId) return;
    deleteSignature(selectedSignatureId);
  };

  const startMove = (
    event: PointerEvent<HTMLDivElement>,
    signature: SignatureItem
  ) => {
    if (
      (event.target as HTMLElement).closest("[data-resize-handle]")
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    event.currentTarget.setPointerCapture(event.pointerId);

    clearSignedResult();
    setSelectedSignatureId(signature.id);

    dragRef.current = {
      id: signature.id,
      mode: "move",
      startX: event.clientX,
      startY: event.clientY,
      originalX: signature.x,
      originalY: signature.y,
      originalWidth: signature.width,
      pageAspect: signature.pageAspect,
      aspectRatio: signature.aspectRatio,
    };
  };

  const startResize = (
    event: PointerEvent<HTMLButtonElement>,
    signature: SignatureItem
  ) => {
    event.preventDefault();
    event.stopPropagation();

    event.currentTarget.setPointerCapture(event.pointerId);

    clearSignedResult();
    setSelectedSignatureId(signature.id);

    dragRef.current = {
      id: signature.id,
      mode: "resize",
      startX: event.clientX,
      startY: event.clientY,
      originalX: signature.x,
      originalY: signature.y,
      originalWidth: signature.width,
      pageAspect: signature.pageAspect,
      aspectRatio: signature.aspectRatio,
    };
  };

  const handlePointerMove = (
    event: PointerEvent<HTMLDivElement>
  ) => {
    const drag = dragRef.current;
    const container = pageContainerRef.current;

    if (!drag || !container) return;

    const rect = container.getBoundingClientRect();

    if (!rect.width || !rect.height) return;

    const dx = ((event.clientX - drag.startX) / rect.width) * 100;
    const dy = ((event.clientY - drag.startY) / rect.height) * 100;

    if (drag.mode === "move") {
      const height = signatureHeightPercent(
        drag.originalWidth,
        drag.aspectRatio,
        drag.pageAspect
      );

      updateSignature(drag.id, {
        x: Math.max(
          0,
          Math.min(
            100 - drag.originalWidth,
            drag.originalX + dx
          )
        ),
        y: Math.max(
          0,
          Math.min(100 - height, drag.originalY + dy)
        ),
      });
    } else {
      const nextWidth = Math.max(
        8,
        Math.min(70, drag.originalWidth + dx)
      );

      const height = signatureHeightPercent(
        nextWidth,
        drag.aspectRatio,
        drag.pageAspect
      );

      updateSignature(drag.id, {
        width: nextWidth,
        x: Math.max(
          0,
          Math.min(drag.originalX, 100 - nextWidth)
        ),
        y: Math.max(
          0,
          Math.min(drag.originalY, 100 - height)
        ),
      });
    }
  };

  const stopDragging = () => {
    dragRef.current = null;
  };

  // Pass an optional signature ID to preserve selection during navigation.
  const goToPage = (
    nextPage: number,
    selectedId: string | null = null
  ) => {
    dragRef.current = null;
    setSelectedSignatureId(selectedId);
    setPageNumber(nextPage);
  };

  const createSignedPDF = async () => {
    if (!file) {
      setError("Please upload a PDF first.");
      return;
    }

    if (signatures.length === 0) {
      setError(
        "Add at least one signature before creating the signed PDF."
      );
      return;
    }

    setApplying(true);
    setError("");
    clearSignedResult();

    try {
      const sourceBytes = new Uint8Array(
        await file.arrayBuffer()
      );

      const pdf = await PDFDocument.load(sourceBytes);
      const pages = pdf.getPages();

      const embeddedImages = new Map<
        string,
        Awaited<ReturnType<typeof pdf.embedPng>>
      >();

      for (const item of signatures) {
        if (item.page < 1 || item.page > pages.length) {
          throw new Error(
            `A signature refers to missing page ${item.page}.`
          );
        }

        let image = embeddedImages.get(item.dataUrl);

        if (!image) {
          const imageResponse = await fetch(item.dataUrl);
          const imageBlob = await imageResponse.blob();

          const imageBytes = new Uint8Array(
            await imageBlob.arrayBuffer()
          );

          image = await pdf.embedPng(imageBytes);
          embeddedImages.set(item.dataUrl, image);
        }

        const page = pages[item.page - 1];
        const pageWidth = page.getWidth();
        const pageHeight = page.getHeight();

        const drawWidth = (item.width / 100) * pageWidth;
        const drawHeight = drawWidth * item.aspectRatio;
        const drawX = (item.x / 100) * pageWidth;

        const drawY =
          pageHeight -
          (item.y / 100) * pageHeight -
          drawHeight;

        if (
          !Number.isFinite(drawHeight) ||
          drawWidth <= 0 ||
          drawHeight <= 0 ||
          drawX < 0 ||
          drawY < 0 ||
          drawX + drawWidth > pageWidth ||
          drawY + drawHeight > pageHeight
        ) {
          throw new Error(
            `A signature on page ${item.page} extends outside the page. Reposition or resize it.`
          );
        }

        page.drawImage(image, {
          x: drawX,
          y: drawY,
          width: drawWidth,
          height: drawHeight,
        });
      }

      const signedBytes = await pdf.save();

      /*
       * Convert the saved PDF bytes to an ArrayBuffer before passing
       * them to Blob. This avoids common TypeScript BlobPart errors
       * involving Uint8Array<ArrayBufferLike>.
       */
      const pdfBuffer = new Uint8Array(signedBytes).buffer as ArrayBuffer;

      const blob = new Blob([pdfBuffer], {
        type: "application/pdf",
      });

      const url = URL.createObjectURL(blob);

      signedUrlRef.current = url;
      setSignedUrl(url);

      setSuccess(
        `Created a signed PDF with ${signatures.length} signature placement${
          signatures.length === 1 ? "" : "s"
        }.`
      );
    } catch (err) {
      console.error("Sign PDF error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Could not sign this PDF. It may be damaged or password-protected."
      );
    } finally {
      setApplying(false);
    }
  };

  const currentPageSignatures = signatures.filter(
    (signature) => signature.page === pageNumber
  );

  const selectedSignature = signatures.find(
    (signature) => signature.id === selectedSignatureId
  );

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-5 py-4">
          <a href="/" className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-xl font-bold text-white">
              P
            </span>
            <span className="text-xl font-bold tracking-tight">
              PaperFlow
            </span>
          </a>

          <span className="ml-2 rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
            Sign PDF
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8">
        <div className="mb-7">
          <h1 className="text-3xl font-bold tracking-tight">
            Sign your PDF
          </h1>
          <p className="mt-2 text-slate-600">
            Add multiple signatures, place them on different pages,
            and edit them before downloading.
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

        {success && (
          <div className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            {success}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[350px_minmax(0,1fr)]">
          {/* LEFT: signature tools */}
          <aside className="h-fit space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <section>
              <h2 className="font-semibold">1. Create a signature</h2>

              <div className="mt-3 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => {
                    setMode("typed");
                    setSignatureDataUrl("");
                  }}
                  className={`rounded-lg px-3 py-2 text-sm font-medium ${
                    mode === "typed"
                      ? "bg-white text-blue-700 shadow-sm"
                      : "text-slate-600"
                  }`}
                >
                  Type name
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode("drawn");
                    setSignatureDataUrl("");
                  }}
                  className={`rounded-lg px-3 py-2 text-sm font-medium ${
                    mode === "drawn"
                      ? "bg-white text-blue-700 shadow-sm"
                      : "text-slate-600"
                  }`}
                >
                  Draw
                </button>
              </div>

              {mode === "typed" ? (
                <div className="mt-4 space-y-3">
                  <label
                    className="block text-sm font-medium"
                    htmlFor="signature-name"
                  >
                    Name to sign
                  </label>

                  <input
                    id="signature-name"
                    value={signatureText}
                    onChange={(event) =>
                      setSignatureText(event.target.value)
                    }
                    placeholder="Enter your full name"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />

                  <label
                    className="block text-sm font-medium"
                    htmlFor="signature-font"
                  >
                    Signature font
                  </label>

                  <select
                    id="signature-font"
                    value={font}
                    onChange={(event) => setFont(event.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-blue-500"
                  >
                    {SIGNATURE_FONTS.map((item) => (
                      <option key={item.label} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="mt-4">
                  <p className="mb-2 text-sm text-slate-600">
                    Draw with your mouse, trackpad, or touchscreen.
                  </p>

                  <canvas
                    ref={drawCanvasRef}
                    width={600}
                    height={180}
                    className="w-full touch-none rounded-xl border border-slate-300 bg-white"
                    onPointerDown={startDrawing}
                    onPointerMove={continueDrawing}
                    onPointerUp={finishDrawing}
                    onPointerCancel={finishDrawing}
                  />

                  <button
                    type="button"
                    onClick={clearDrawing}
                    className="mt-2 text-sm font-medium text-blue-700 hover:underline"
                  >
                    Clear drawing
                  </button>
                </div>
              )}

              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="mb-2 text-xs text-slate-500">
                  Signature draft
                </p>

                {signatureDataUrl ? (
                  <img
                    src={signatureDataUrl}
                    alt="Signature draft"
                    className="h-16 w-full object-contain"
                  />
                ) : (
                  <div className="flex h-16 items-center justify-center text-sm text-slate-400">
                    Enter a name or draw a signature
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={addSignature}
                disabled={!file || !signatureDataUrl || loading}
                className="mt-3 w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                + Add signature to this page
              </button>

              {!file && (
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Upload a PDF from the central preview area before
                  placing signatures.
                </p>
              )}

              <p className="mt-2 text-xs leading-5 text-slate-500">
                Each placement is separate. You can reuse a signature
                or create another one.
              </p>
            </section>

            <div className="border-t border-slate-100" />

            <section>
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-semibold">2. Page signatures</h2>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                  {currentPageSignatures.length} on this page
                </span>
              </div>

              {currentPageSignatures.length === 0 ? (
                <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
                  No signatures on this page yet.
                </p>
              ) : (
                <div className="mt-3 space-y-2">
                  {currentPageSignatures.map((signature, index) => (
                    <button
                      type="button"
                      key={signature.id}
                      onClick={() =>
                        setSelectedSignatureId(signature.id)
                      }
                      className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left ${
                        selectedSignatureId === signature.id
                          ? "border-blue-500 bg-blue-50"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <img
                        src={signature.dataUrl}
                        alt=""
                        className="h-9 w-16 object-contain"
                      />

                      <span className="flex-1 text-sm font-medium">
                        Signature {index + 1}
                      </span>

                      <span className="text-xs text-slate-500">
                        {selectedSignatureId === signature.id
                          ? "Selected"
                          : "Select"}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {selectedSignature &&
                selectedSignature.page === pageNumber && (
                  <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/60 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold">
                        Edit selected signature
                      </p>

                      <button
                        type="button"
                        onClick={() => setSelectedSignatureId(null)}
                        className="text-xs font-medium text-slate-600 hover:underline"
                      >
                        Deselect
                      </button>
                    </div>

                    <label
                      className="mt-4 block text-sm font-medium"
                      htmlFor="selected-signature-size"
                    >
                      Size
                    </label>

                    <input
                      id="selected-signature-size"
                      type="range"
                      min="8"
                      max="70"
                      value={selectedSignature.width}
                      onChange={(event) => {
                        const nextWidth = Number(event.target.value);

                        const nextHeight = signatureHeightPercent(
                          nextWidth,
                          selectedSignature.aspectRatio,
                          selectedSignature.pageAspect
                        );

                        clearSignedResult();

                        updateSignature(selectedSignature.id, {
                          width: nextWidth,
                          x: Math.min(
                            selectedSignature.x,
                            100 - nextWidth
                          ),
                          y: Math.min(
                            selectedSignature.y,
                            100 - nextHeight
                          ),
                        });
                      }}
                      className="mt-2 w-full accent-blue-600"
                    />

                    <button
                      type="button"
                      onClick={deleteSelectedSignature}
                      className="mt-4 w-full rounded-xl border border-red-200 bg-white px-3 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50"
                    >
                      Delete selected signature
                    </button>
                  </div>
                )}
            </section>

            <div className="border-t border-slate-100" />

            <section>
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-semibold">All placements</h2>
                <span className="text-xs text-slate-500">
                  {signatures.length} total
                </span>
              </div>

              {signatures.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">
                  Your placed signatures will appear here.
                </p>
              ) : (
                <div className="mt-3 max-h-52 space-y-2 overflow-y-auto">
                  {signatures.map((signature, index) => (
                    <div
                      key={signature.id}
                      className="flex items-center gap-2 rounded-lg border border-slate-200 p-2"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          goToPage(signature.page, signature.id)
                        }
                        className="min-w-0 flex-1 text-left text-sm hover:text-blue-700"
                      >
                        Signature {index + 1}
                        <span className="ml-1 text-xs text-slate-500">
                          · Page {signature.page}
                        </span>
                      </button>

                      <button
                        type="button"
                        aria-label={`Delete signature ${index + 1}`}
                        title="Delete signature"
                        onClick={() => deleteSignature(signature.id)}
                        className="rounded-lg px-2 py-1 text-sm text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <button
              type="button"
              onClick={createSignedPDF}
              disabled={!file || signatures.length === 0 || applying}
              className="w-full rounded-xl bg-blue-700 px-4 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {applying ? "Creating signed PDF…" : "Create signed PDF"}
            </button>

            {signedUrl && (
              <a
                href={signedUrl}
                download={`signed-${file?.name || "document.pdf"}`}
                className="block w-full rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-center font-semibold text-blue-700 hover:bg-blue-100"
              >
                Download signed PDF
              </a>
            )}

            <p className="text-xs leading-5 text-slate-500">
              Signatures remain editable in this session until you
              create the final PDF. The downloaded PDF contains
              signature images, not certificate-backed digital
              signatures.
            </p>
          </aside>

          {/* CENTRE: PDF preview and upload */}
          <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-semibold">Document preview</h2>
                <p className="mt-1 break-all text-sm text-slate-500">
                  {file ? file.name : "Upload a PDF to get started"}
                </p>
              </div>

              {file && (
                <label className="inline-flex cursor-pointer items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-400 hover:bg-blue-50">
                  Choose another PDF
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    className="hidden"
                    onChange={(event) =>
                      handleFileChange(event.target.files?.[0])
                    }
                  />
                </label>
              )}

              {file && pageCount > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={pageNumber <= 1 || loading}
                    onClick={() =>
                      goToPage(Math.max(1, pageNumber - 1))
                    }
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-40"
                  >
                    Previous
                  </button>

                  <span className="text-sm tabular-nums">
                    {pageNumber} / {pageCount}
                  </span>

                  <button
                    type="button"
                    disabled={pageNumber >= pageCount || loading}
                    onClick={() =>
                      goToPage(Math.min(pageCount, pageNumber + 1))
                    }
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>

            {!file ? (
              <div className="flex min-h-[520px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center transition hover:border-blue-400">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-100 text-4xl">
                  📄
                </div>

                <h3 className="mt-5 text-xl font-semibold">
                  Upload your PDF
                </h3>

                <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                  Select the document you want to sign. Your PDF
                  preview will appear here, and you can place signatures
                  directly on its pages.
                </p>

                <label className="mt-6 inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-7 py-3.5 font-semibold text-white shadow-sm transition hover:bg-blue-700">
                  <span aria-hidden="true">↑</span>
                  Upload PDF
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    className="hidden"
                    onChange={(event) =>
                      handleFileChange(event.target.files?.[0])
                    }
                  />
                </label>

                <p className="mt-3 text-xs text-slate-500">
                  PDF files only · Maximum file size: 25 MB
                </p>
              </div>
            ) : (
              <div className="overflow-auto rounded-xl bg-slate-100 p-3 sm:p-5">
                {loading && (
                  <p className="mb-3 text-center text-sm text-slate-500">
                    Loading PDF preview…
                  </p>
                )}

                <div
                  ref={pageContainerRef}
                  onPointerMove={handlePointerMove}
                  onPointerUp={stopDragging}
                  onPointerCancel={stopDragging}
                  onPointerDown={(event) => {
                    if (event.target === event.currentTarget) {
                      setSelectedSignatureId(null);
                    }
                  }}
                  className="relative mx-auto w-full max-w-[850px] select-none bg-white shadow-lg"
                  style={{ touchAction: "none" }}
                >
                  <canvas
                    ref={pdfCanvasRef}
                    className="block h-auto w-full bg-white"
                  />

                  {currentPageSignatures.map((signature) => {
                    const isSelected =
                      selectedSignatureId === signature.id;

                    return (
                      <div
                        key={signature.id}
                        onPointerDown={(event) =>
                          startMove(event, signature)
                        }
                        className={`absolute cursor-move ${
                          isSelected
                            ? "border-2 border-blue-500"
                            : "border border-dashed border-slate-400 hover:border-blue-400"
                        }`}
                        style={{
                          left: `${signature.x}%`,
                          top: `${signature.y}%`,
                          width: `${signature.width}%`,
                          touchAction: "none",
                        }}
                        title="Click to select and drag to move"
                      >
                        <img
                          src={signature.dataUrl}
                          alt={`Signature on page ${signature.page}`}
                          draggable={false}
                          className="pointer-events-none block h-auto w-full"
                        />

                        {isSelected && (
                          <>
                            <button
                              type="button"
                              aria-label="Resize selected signature"
                              data-resize-handle
                              onPointerDown={(event) =>
                                startResize(event, signature)
                              }
                              className="absolute -bottom-2 -right-2 h-5 w-5 rounded-full border-2 border-white bg-blue-600 shadow"
                              title="Drag to resize"
                            />

                            <button
                              type="button"
                              aria-label="Delete selected signature"
                              onPointerDown={(event) =>
                                event.stopPropagation()
                              }
                              onClick={(event) => {
                                event.stopPropagation();
                                deleteSignature(signature.id);
                              }}
                              className="absolute -right-3 -top-3 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-sm font-bold text-white shadow hover:bg-red-700"
                              title="Delete signature"
                            >
                              ×
                            </button>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
              <p>
                Page {pageNumber}: {currentPageSignatures.length}{" "}
                signature{currentPageSignatures.length === 1 ? "" : "s"}
              </p>

              <p>
                Click a signature to select it. Click empty space to
                deselect.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}