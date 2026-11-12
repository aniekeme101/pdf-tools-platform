

"use client";



import {

  useCallback,

  useEffect,

  useRef,

  useState,

} from "react";

import type {

  ChangeEvent,

  PointerEvent as ReactPointerEvent,

} from "react";

import type { PDFDocumentProxy } from "pdfjs-dist";



type CommentColor = "yellow" | "green" | "blue" | "pink" | "orange";



type PdfComment = {

  id: string;

  page: number;

  x: number;

  y: number;

  width: number;

  height: number;

  text: string;

  color: CommentColor;

};



type Selection = {

  left: number;

  top: number;

  width: number;

  height: number;

};



type PdfPage = {

  getViewport: (options: { scale: number }) => {

    width: number;

    height: number;

  };

  render: (options: unknown) => {

    promise: Promise<void>;

    cancel: () => void;

  };

};



type PdfLoadingTask = {

  promise: Promise<PDFDocumentProxy>;

  destroy: () => Promise<void>;

};



type PdfJsModule = {

  GlobalWorkerOptions: {

    workerSrc: string;

  };

  getDocument: (options: { data: Uint8Array }) => PdfLoadingTask;

};



const SCALE = 1.5;

const MAX_FILE_SIZE = 20 * 1024 * 1024;



const COLORS: {

  value: CommentColor;

  label: string;

  hex: string;

  rgb: [number, number, number];

}[] = [

  {

    value: "yellow",

    label: "Yellow",

    hex: "#FACC15",

    rgb: [1, 0.85, 0.1],

  },

  {

    value: "green",

    label: "Green",

    hex: "#4ADE80",

    rgb: [0.2, 0.85, 0.4],

  },

  {

    value: "blue",

    label: "Blue",

    hex: "#60A5FA",

    rgb: [0.2, 0.5, 1],

  },

  {

    value: "pink",

    label: "Pink",

    hex: "#F472B6",

    rgb: [1, 0.3, 0.65],

  },

  {

    value: "orange",

    label: "Orange",

    hex: "#FB923C",

    rgb: [1, 0.45, 0.1],

  },

];



function getColor(color: CommentColor) {

  return COLORS.find((item) => item.value === color) ?? COLORS[0];

}



function makeId() {

  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

}



export default function CommentsPage() {

  const fileInputRef = useRef<HTMLInputElement>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);



  // Keep the PDF document separate from its loading task.

  const pdfRef = useRef<PDFDocumentProxy | null>(null);

  const loadingTaskRef = useRef<PdfLoadingTask | null>(null);

  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);

  const pdfJsRef = useRef<PdfJsModule | null>(null);

  const fileRef = useRef<File | null>(null);

  const renderIdRef = useRef(0);



  const [file, setFile] = useState<File | null>(null);

  const [pageNumber, setPageNumber] = useState(1);

  const [pageCount, setPageCount] = useState(0);

  const [comments, setComments] = useState<PdfComment[]>([]);
  const [authorName, setAuthorName] = useState("PaperFlow");

  const [selectedColor, setSelectedColor] =

    useState<CommentColor>("yellow");



  const [selection, setSelection] = useState<Selection | null>(null);

  const [isSelecting, setIsSelecting] = useState(false);

  const [selectionStart, setSelectionStart] = useState<{

    x: number;

    y: number;

  } | null>(null);



  const [showCommentEditor, setShowCommentEditor] = useState(false);

  const [commentText, setCommentText] = useState("");

  const [activeCommentId, setActiveCommentId] = useState<string | null>(

    null

  );



  const [loading, setLoading] = useState(false);

  const [processing, setProcessing] = useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");



  const [showResult, setShowResult] = useState(false);

  const [resultUrl, setResultUrl] = useState("");

  const [resultName, setResultName] = useState("");



  const [canvasSize, setCanvasSize] = useState({

    width: 0,

    height: 0,

  });



  const commentsOnPage = comments.filter(

    (comment) => comment.page === pageNumber

  );



  const releasePdf = useCallback(async () => {

    renderIdRef.current += 1;



    if (renderTaskRef.current) {

      try {

        renderTaskRef.current.cancel();

      } catch {

        // The render may already have completed.

      }

      renderTaskRef.current = null;

    }



    const loadingTask = loadingTaskRef.current;



    // Clear refs before cleanup to prevent duplicate destruction.

    loadingTaskRef.current = null;

    pdfRef.current = null;



    if (loadingTask) {

      try {

        await loadingTask.destroy();

      } catch {

        // Ignore errors from an already-cancelled loading task.

      }

    }

  }, []);



  // Initialize PDF.js.

  useEffect(() => {

    let cancelled = false;



    async function initializePdfJs() {

      try {

        const pdfjs = (await import("pdfjs-dist")) as unknown as PdfJsModule;



        if (cancelled) return;



        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        pdfJsRef.current = pdfjs;

      } catch {

        if (!cancelled) {

          setError(

            "The PDF viewer could not be initialized. Check that pdfjs-dist is installed and public/pdf.worker.min.mjs exists."

          );

        }

      }

    }



    void initializePdfJs();



    return () => {

      cancelled = true;



      if (renderTaskRef.current) {

        try {

          renderTaskRef.current.cancel();

        } catch {

          // Ignore completed renders.

        }

      }



      const task = loadingTaskRef.current;

      loadingTaskRef.current = null;

      pdfRef.current = null;



      if (task) {

        void task.destroy().catch(() => {});

      }

    };

  }, []);



  // Render the current PDF page.

  useEffect(() => {

    let cancelled = false;

    const renderId = ++renderIdRef.current;



    async function renderPage() {

      const pdf = pdfRef.current;

      const canvas = canvasRef.current;



      if (!pdf || !canvas) return;



      setError("");



      if (renderTaskRef.current) {

        try {

          renderTaskRef.current.cancel();

        } catch {

          // Ignore cancelled renders.

        }

        renderTaskRef.current = null;

      }



      try {

        const page = (await pdf.getPage(pageNumber)) as unknown as PdfPage;



        if (cancelled || renderId !== renderIdRef.current) return;



        const viewport = page.getViewport({ scale: SCALE });

        const context = canvas.getContext("2d");



        if (!context) {

          throw new Error("Could not create the PDF canvas.");

        }



        canvas.width = Math.ceil(viewport.width);

        canvas.height = Math.ceil(viewport.height);



        setCanvasSize({

          width: canvas.width,

          height: canvas.height,

        });



        const renderTask = page.render({

          canvasContext: context,

          viewport,

        });



        renderTaskRef.current = renderTask;



        await renderTask.promise;



        if (renderTaskRef.current === renderTask) {

          renderTaskRef.current = null;

        }



        if (cancelled || renderId !== renderIdRef.current) return;

      } catch (err) {

        const message =

          err instanceof Error ? err.message : String(err);



        if (

          !cancelled &&

          !message.toLowerCase().includes("cancel")

        ) {

          setError(`Could not render this PDF page: ${message}`);

        }

      }

    }



    void renderPage();



    return () => {

      cancelled = true;



      if (renderTaskRef.current) {

        try {

          renderTaskRef.current.cancel();

        } catch {

          // Ignore completed renders.

        }

        renderTaskRef.current = null;

      }

    };

  }, [pageNumber, file]);



  async function handleFileChange(

    event: ChangeEvent<HTMLInputElement>

  ) {

    const selectedFile = event.target.files?.[0];

    event.target.value = "";



    if (!selectedFile) return;



    setError("");

    setSuccess("");



    if (

      selectedFile.type !== "application/pdf" &&

      !selectedFile.name.toLowerCase().endsWith(".pdf")

    ) {

      setError("Please select a PDF file.");

      return;

    }



    if (selectedFile.size > MAX_FILE_SIZE) {

      setError("Your PDF must be 20 MB or smaller.");

      return;

    }



    setLoading(true);



    try {

      await releasePdf();



      if (resultUrl) {

        URL.revokeObjectURL(resultUrl);

      }



      setResultUrl("");

      setResultName("");

      setShowResult(false);

      setComments([]);

      setSelection(null);

      setShowCommentEditor(false);

      setCommentText("");

      setActiveCommentId(null);

      setPageNumber(1);

      setPageCount(0);

      setCanvasSize({ width: 0, height: 0 });



      const pdfjs = pdfJsRef.current;



      if (!pdfjs) {

        throw new Error(

          "The PDF viewer is still initializing. Please try again."

        );

      }



      const bytes = new Uint8Array(await selectedFile.arrayBuffer());

      const loadingTask = pdfjs.getDocument({ data: bytes });



      loadingTaskRef.current = loadingTask;



      const pdf = await loadingTask.promise;



      if (loadingTaskRef.current !== loadingTask) {

        return;

      }



      pdfRef.current = pdf;

      fileRef.current = selectedFile;



      setFile(selectedFile);

      setPageCount(pdf.numPages);

      setPageNumber(1);

      setSuccess("PDF loaded. Select an area to add a comment.");

    } catch (err) {

      const message =

        err instanceof Error ? err.message : "Unknown error";



      setError(`Could not open the PDF: ${message}`);

      await releasePdf();

      setFile(null);

      fileRef.current = null;

    } finally {

      setLoading(false);

    }

  }



  function getCanvasPoint(

    event: ReactPointerEvent<HTMLCanvasElement>

  ) {

    const canvas = canvasRef.current;



    if (!canvas) return null;



    const rect = canvas.getBoundingClientRect();



    if (!rect.width || !rect.height) return null;



    return {

      x: Math.max(

        0,

        Math.min(rect.width, event.clientX - rect.left)

      ),

      y: Math.max(

        0,

        Math.min(rect.height, event.clientY - rect.top)

      ),

    };

  }



  function handlePointerDown(

    event: ReactPointerEvent<HTMLCanvasElement>

  ) {

    if (!file || showResult || showCommentEditor) return;



    const point = getCanvasPoint(event);

    if (!point) return;



    event.currentTarget.setPointerCapture(event.pointerId);



    setSelectionStart(point);

    setSelection({

      left: point.x,

      top: point.y,

      width: 0,

      height: 0,

    });

    setIsSelecting(true);

    setActiveCommentId(null);

    setError("");

  }



  function handlePointerMove(

    event: ReactPointerEvent<HTMLCanvasElement>

  ) {

    if (!isSelecting || !selectionStart) return;



    const point = getCanvasPoint(event);

    if (!point) return;



    setSelection({

      left: Math.min(selectionStart.x, point.x),

      top: Math.min(selectionStart.y, point.y),

      width: Math.abs(point.x - selectionStart.x),

      height: Math.abs(point.y - selectionStart.y),

    });

  }



  function handlePointerUp(

    event: ReactPointerEvent<HTMLCanvasElement>

  ) {

    if (!isSelecting || !selectionStart) return;



    const point = getCanvasPoint(event);



    setIsSelecting(false);

    setSelectionStart(null);



    if (!point) {

      setSelection(null);

      return;

    }



    const nextSelection = {

      left: Math.min(selectionStart.x, point.x),

      top: Math.min(selectionStart.y, point.y),

      width: Math.abs(point.x - selectionStart.x),

      height: Math.abs(point.y - selectionStart.y),

    };



    if (nextSelection.width < 6 || nextSelection.height < 6) {

      setSelection(null);

      return;

    }



    setSelection(nextSelection);

    setCommentText("");

    setShowCommentEditor(true);

  }



  function addComment() {

    if (!file || !selection || !canvasRef.current) return;



    const text = commentText.trim();



    if (!text) {

      setError("Please enter a comment before saving.");

      return;

    }



    if (text.length > 500) {

      setError("Comments must be 500 characters or fewer.");

      return;

    }



    const canvas = canvasRef.current;

    const rect = canvas.getBoundingClientRect();



    if (!rect.width || !rect.height) {

      setError("The PDF page is not ready. Please try again.");

      return;

    }



    const scaleX = canvas.width / rect.width / SCALE;

    const scaleY = canvas.height / rect.height / SCALE;



    const x = selection.left * scaleX;

    const width = selection.width * scaleX;

    const height = selection.height * scaleY;



    const y =

      (canvas.height -

        (selection.top + selection.height) *

          (canvas.height / rect.height)) /

      SCALE;



    const comment: PdfComment = {

      id: makeId(),

      page: pageNumber,

      x,

      y,

      width,

      height,

      text,

      color: selectedColor,

    };



    setComments((previous) => [...previous, comment]);

    setShowCommentEditor(false);

    setCommentText("");

    setSelection(null);

    setActiveCommentId(comment.id);

    setError("");

    setSuccess("Comment added. You can select another area.");

  }



  function removeComment(id: string) {

    setComments((previous) =>

      previous.filter((comment) => comment.id !== id)

    );



    if (activeCommentId === id) {

      setActiveCommentId(null);

    }



    setSuccess("Comment removed.");

  }



  function jumpToComment(comment: PdfComment) {

    setActiveCommentId(comment.id);



    if (comment.page !== pageNumber) {

      setPageNumber(comment.page);

    }

  }



  function clearResult() {

    if (resultUrl) {

      URL.revokeObjectURL(resultUrl);

    }



    setResultUrl("");

    setResultName("");

    setShowResult(false);

  }



  async function applyComments() {

    const originalFile = fileRef.current;



    if (!originalFile) {

      setError("Please upload a PDF first.");

      return;

    }



    if (comments.length === 0) {

      setError("Add at least one comment before creating the PDF.");

      return;

    }



    setProcessing(true);

    setError("");

    setSuccess("");



    try {

      const formData = new FormData();



      formData.append("file", originalFile);
      formData.append("authorName", authorName.trim() || "Anonymous");

      formData.append(

        "comments",

        JSON.stringify(

          comments.map(({ id: _id, ...comment }) => comment)

        )

      );



      const response = await fetch("/api/comments", {

        method: "POST",

        body: formData,

      });



      if (!response.ok) {

        const message = await response.text();

        throw new Error(

          message || "Could not add comments to the PDF."

        );

      }



      const blob = await response.blob();



      if (!blob.size) {

        throw new Error("The server returned an empty PDF.");

      }



      clearResult();



      const nextUrl = URL.createObjectURL(blob);

      const baseName = originalFile.name.replace(/\.pdf$/i, "");



      setResultUrl(nextUrl);

      setResultName(`${baseName}-commented.pdf`);

      setShowResult(true);

      setSuccess("Your commented PDF is ready to preview.");

    } catch (err) {

      const message =

        err instanceof Error ? err.message : "Unknown error";



      setError(message);

    } finally {

      setProcessing(false);

    }

  }



  function downloadResult() {

    if (!resultUrl || !resultName) return;



    const link = document.createElement("a");

    link.href = resultUrl;

    link.download = resultName;

    document.body.appendChild(link);

    link.click();

    link.remove();

  }



  async function startOver() {

    await releasePdf();



    clearResult();



    fileRef.current = null;

    setFile(null);

    setPageNumber(1);

    setPageCount(0);

    setComments([]);

    setSelection(null);

    setSelectionStart(null);

    setIsSelecting(false);

    setShowCommentEditor(false);

    setCommentText("");

    setActiveCommentId(null);

    setCanvasSize({ width: 0, height: 0 });

    setError("");

    setSuccess("");



    if (fileInputRef.current) {

      fileInputRef.current.value = "";

    }

  }



  const overlayStyle = (comment: PdfComment) => {

    const canvas = canvasRef.current;



    if (!canvas || !canvasSize.width || !canvasSize.height) {

      return {};

    }



    const rect = canvas.getBoundingClientRect();

    const scaleX = rect.width / (canvasSize.width / SCALE);

    const scaleY = rect.height / (canvasSize.height / SCALE);



    return {

      left: `${comment.x * scaleX}px`,

      top: `${

        (canvasSize.height / SCALE - comment.y - comment.height) *

        scaleY

      }px`,

      width: `${comment.width * scaleX}px`,

      height: `${comment.height * scaleY}px`,

    };

  };



  return (

    <main className="min-h-screen bg-slate-50 text-slate-900">

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div>

            <a

              href="/"

              className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"

            >

              <span aria-hidden="true">←</span>

              Back to PaperFlow

            </a>



            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">

              Add comments to PDF

            </h1>



            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">

              Select an area, choose a color, and attach a comment.

              Review the finished PDF before downloading it.

            </p>

          </div>



          {file && !showResult && (

            <button

              type="button"

              onClick={startOver}

              className="self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 sm:self-auto"

            >

              Start over

            </button>

          )}

        </header>



        {error && (

          <div

            role="alert"

            className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"

          >

            {error}

          </div>

        )}



        {success && !error && (

          <div

            role="status"

            className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"

          >

            {success}

          </div>

        )}



        {!file && !showResult && (

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">

            <div className="mx-auto max-w-xl text-center">

              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-3xl">

                💬

              </div>



              <h2 className="text-xl font-bold">Upload your PDF</h2>



              <p className="mt-2 text-sm leading-6 text-slate-500">

                Select a PDF from your device. Files can be up to 20 MB.

              </p>



              <input

                ref={fileInputRef}

                type="file"

                accept=".pdf,application/pdf"

                onChange={handleFileChange}

                className="hidden"

              />



              <button

                type="button"

                disabled={loading}

                onClick={() => fileInputRef.current?.click()}

                className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"

              >

                {loading ? "Opening PDF..." : "Choose PDF file"}

              </button>



              <p className="mt-4 text-xs text-slate-400">

                Your original file is not overwritten.

              </p>

            </div>

          </section>

        )}



        {file && !showResult && (

          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">

            <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">

                <div className="min-w-0">

                  <p className="truncate font-semibold">{file.name}</p>

                  <p className="mt-1 text-xs text-slate-500">

                    {pageCount} {pageCount === 1 ? "page" : "pages"} ·{" "}

                    {(file.size / (1024 * 1024)).toFixed(2)} MB

                  </p>

                </div>



                <div className="flex items-center gap-2">

                  <button

                    type="button"

                    disabled={pageNumber <= 1 || loading}

                    onClick={() =>

                      setPageNumber((page) => Math.max(1, page - 1))

                    }

                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-40"

                  >

                    ←

                  </button>



                  <span className="whitespace-nowrap text-sm text-slate-600">

                    Page {pageNumber} of {pageCount}

                  </span>



                  <button

                    type="button"

                    disabled={pageNumber >= pageCount || loading}

                    onClick={() =>

                      setPageNumber((page) =>

                        Math.min(pageCount, page + 1)

                      )

                    }

                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-40"

                  >

                    →

                  </button>

                </div>

              </div>



              <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">

                <p className="text-sm text-slate-600">

                  <span className="mr-2 inline-block h-2 w-2 rounded-full bg-blue-500" />

                  Drag over the text or area you want to comment on.

                </p>

              </div>



              <div className="overflow-auto bg-slate-100 p-3 sm:p-6">

                <div className="relative mx-auto w-fit max-w-full">

                  <canvas

                    ref={canvasRef}

                    onPointerDown={handlePointerDown}

                    onPointerMove={handlePointerMove}

                    onPointerUp={handlePointerUp}

                    onPointerCancel={handlePointerUp}

                    className="block h-auto max-w-full bg-white shadow-md"

                    style={{

                      maxHeight: "none",

                      cursor: showCommentEditor ? "default" : "crosshair",

                      touchAction: "none",

                    }}

                  />



                  {commentsOnPage.map((comment, index) => {

                    const color = getColor(comment.color);

                    const isActive = activeCommentId === comment.id;



                    return (

                      <div

                        key={comment.id}

                        className="group absolute"

                        style={overlayStyle(comment)}

                      >

                        <button

                          type="button"

                          title={`Comment ${index + 1}: ${comment.text}`}

                          aria-label={`Show comment ${index + 1}`}

                          onClick={() =>

                            setActiveCommentId(

                              isActive ? null : comment.id

                            )

                          }

                          className="absolute inset-0 block h-full w-full border-2"

                          style={{

                            borderColor: color.hex,

                            backgroundColor: `${color.hex}35`,

                          }}

                        />



                        <button

                          type="button"

                          onClick={() =>

                            setActiveCommentId(

                              isActive ? null : comment.id

                            )

                          }

                          className="absolute -right-3 -top-3 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-xs font-bold text-slate-900 shadow"

                          style={{ backgroundColor: color.hex }}

                          aria-label={`Toggle comment ${index + 1}`}

                        >

                          {index + 1}

                        </button>



                        {/* Modern, translucent, text-sized comment popup */}

                        <div

                          className={`absolute left-0 top-full z-20 mt-2 w-fit min-w-36 max-w-[min(24rem,80vw)] rounded-xl border border-white/20 bg-slate-700/75 p-3 text-left shadow-xl backdrop-blur-md transition-all duration-150 ${

                            isActive

                              ? "block"

                              : "hidden group-hover:block group-focus-within:block"

                          }`}

                        >

                          <div className="mb-2 flex items-center gap-2">

                            <span className="text-xs font-semibold tracking-wide text-white/70">

                              Comment

                            </span>



                            <span

                              className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white/20"

                              style={{ backgroundColor: color.hex }}

                            />

                          </div>



                          <p

                            className="w-fit whitespace-pre-wrap break-words text-sm font-medium leading-relaxed"

                            style={{

                              color: color.hex,

                              overflowWrap: "anywhere",

                            }}

                          >

                            {comment.text}

                          </p>



                          <div className="mt-3 border-t border-white/15 pt-2">

                            <button

                              type="button"

                              onClick={() => removeComment(comment.id)}

                              className="text-xs font-medium text-white/70 transition hover:text-white"

                            >

                              Remove comment

                            </button>

                          </div>

                        </div>

                      </div>

                    );

                  })}



                  {selection && !showCommentEditor && (

                    <div

                      className="pointer-events-none absolute border-2 border-blue-500 bg-blue-300/30"

                      style={{

                        left: selection.left,

                        top: selection.top,

                        width: selection.width,

                        height: selection.height,

                      }}

                    />

                  )}

                </div>

              </div>



              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-4">

                <p className="text-xs text-slate-500">

                  {comments.length}{" "}

                  {comments.length === 1 ? "comment" : "comments"} added

                </p>



                <button

                  type="button"

                  disabled={processing || comments.length === 0}

                  onClick={applyComments}

                  className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"

                >

                  {processing ? "Creating PDF..." : "Preview commented PDF"}

                </button>

              </div>

            </section>



            <aside className="space-y-5">

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <label htmlFor="comment-author" className="block font-bold">Author name</label>
                <p className="mt-1 text-sm leading-5 text-slate-500">This name will appear as the author of your PDF comments.</p>
                <input
                  id="comment-author"
                  type="text"
                  value={authorName}
                  onChange={(event) => setAuthorName(event.target.value)}
                  maxLength={80}
                  placeholder="Enter your name"
                  className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

                <h2 className="font-bold">Comment color</h2>

                <p className="mt-1 text-sm leading-5 text-slate-500">

                  Choose a color for your next comment.

                </p>



                <div className="mt-4 flex flex-wrap gap-3">

                  {COLORS.map((color) => (

                    <button

                      key={color.value}

                      type="button"

                      title={color.label}

                      aria-label={color.label}

                      aria-pressed={selectedColor === color.value}

                      onClick={() => setSelectedColor(color.value)}

                      className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition ${

                        selectedColor === color.value

                          ? "border-slate-900 ring-2 ring-slate-300 ring-offset-2"

                          : "border-white shadow hover:scale-105"

                      }`}

                      style={{ backgroundColor: color.hex }}

                    >

                      {selectedColor === color.value && (

                        <span className="font-bold text-slate-900">✓</span>

                      )}

                    </button>

                  ))}

                </div>



                <p className="mt-3 text-xs text-slate-500">

                  Selected: {getColor(selectedColor).label}

                </p>

              </section>



              {showCommentEditor && selection && (

                <section className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm">

                  <div className="mb-3 flex items-center justify-between gap-2">

                    <h2 className="font-bold">New comment</h2>

                    <span

                      className="h-4 w-4 rounded-full"

                      style={{

                        backgroundColor: getColor(selectedColor).hex,

                      }}

                    />

                  </div>



                  <p className="mb-3 text-sm text-slate-500">

                    Add a note to the selected area on page {pageNumber}.

                  </p>



                  <textarea

                    value={commentText}

                    onChange={(event) =>

                      setCommentText(event.target.value)

                    }

                    maxLength={500}

                    rows={5}

                    autoFocus

                    placeholder="Write your comment here..."

                    className="w-full resize-y rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"

                  />



                  <p className="mt-1 text-right text-xs text-slate-400">

                    {commentText.length}/500

                  </p>



                  <div className="mt-4 flex gap-2">

                    <button

                      type="button"

                      onClick={addComment}

                      className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"

                    >

                      Save comment

                    </button>



                    <button

                      type="button"

                      onClick={() => {

                        setShowCommentEditor(false);

                        setSelection(null);

                        setCommentText("");

                      }}

                      className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"

                    >

                      Cancel

                    </button>

                  </div>

                </section>

              )}



              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

                <div className="flex items-center justify-between gap-2">

                  <h2 className="font-bold">Your comments</h2>

                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">

                    {comments.length}

                  </span>

                </div>



                {comments.length === 0 ? (

                  <div className="py-8 text-center">

                    <div className="mb-3 text-3xl">📝</div>

                    <p className="text-sm font-medium text-slate-700">

                      No comments yet

                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-500">

                      Drag over an area in the PDF to add your first comment.

                    </p>

                  </div>

                ) : (

                  <div className="mt-4 max-h-[480px] space-y-3 overflow-y-auto pr-1">

                    {comments.map((comment, index) => {

                      const color = getColor(comment.color);

                      const isActive = activeCommentId === comment.id;



                      return (

                        <div

                          key={comment.id}

                          className={`rounded-xl border p-3 transition ${

                            isActive

                              ? "border-blue-300 bg-blue-50/50"

                              : "border-slate-100 bg-slate-50"

                          }`}

                        >

                          <button

                            type="button"

                            onClick={() => jumpToComment(comment)}

                            className="flex w-full items-start gap-3 text-left"

                          >

                            <span

                              className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-slate-900"

                              style={{ backgroundColor: color.hex }}

                            >

                              {index + 1}

                            </span>



                            <span className="min-w-0 flex-1">

                              <span className="mb-1 block text-xs font-semibold text-slate-500">

                                Page {comment.page} · {color.label}

                              </span>

                              <span className="block whitespace-pre-wrap break-words text-sm leading-5 text-slate-800">

                                {comment.text}

                              </span>

                            </span>

                          </button>



                          <div className="mt-3 flex justify-end">

                            <button

                              type="button"

                              onClick={() => removeComment(comment.id)}

                              className="text-xs font-medium text-red-600 hover:text-red-700"

                            >

                              Remove

                            </button>

                          </div>

                        </div>

                      );

                    })}

                  </div>

                )}

              </section>



              <section className="rounded-2xl border border-blue-100 bg-blue-50 p-4">

                <h3 className="text-sm font-bold text-blue-900">

                  How it works

                </h3>

                <ol className="mt-2 list-inside list-decimal space-y-1.5 text-xs leading-5 text-blue-800">

                  <li>Drag over the area you want to comment on.</li>

                  <li>Choose a color and write your note.</li>

                  <li>Repeat for any additional areas.</li>

                  <li>Preview the completed PDF and download it.</li>

                </ol>

              </section>

            </aside>

          </div>

        )}



        {showResult && resultUrl && (

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

            <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">

              <div>

                <div className="flex items-center gap-2">

                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">

                    ✓

                  </span>

                  <h2 className="text-xl font-bold">

                    Your commented PDF is ready

                  </h2>

                </div>



                <p className="mt-2 text-sm text-slate-500">

                  {resultName} · {comments.length}{" "}

                  {comments.length === 1 ? "comment" : "comments"}

                </p>

              </div>



              <div className="flex flex-wrap gap-2">

                <button

                  type="button"

                  onClick={downloadResult}

                  className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"

                >

                  ↓ Download PDF

                </button>



                <button

                  type="button"

                  onClick={() => {

                    clearResult();

                    setSuccess("");

                  }}

                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"

                >

                  Continue editing

                </button>

              </div>

            </div>



            <div className="bg-slate-100 p-3 sm:p-6">

              <iframe

                title="Preview commented PDF"

                src={resultUrl}

                className="h-[70vh] min-h-[480px] w-full rounded-xl border border-slate-200 bg-white"

              />

            </div>



            <div className="flex flex-wrap items-center justify-between gap-3 p-5">

              <p className="text-sm text-slate-500">

                Check your document before downloading. Some PDF viewers

                display annotation popups differently.

              </p>



              <button

                type="button"

                onClick={startOver}

                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"

              >

                Start with another PDF

              </button>

            </div>

          </section>

        )}



        <footer className="mt-10 border-t border-slate-200 pt-5 text-center text-xs leading-5 text-slate-400">

          PaperFlow · Free PDF tools

        </footer>

      </div>

    </main>

  );

}
