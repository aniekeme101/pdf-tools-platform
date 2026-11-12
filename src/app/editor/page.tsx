 "use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";

type Action = "annotate" | "split" | "rotate" | "page-numbers" | "compress";
type ResultFile = { url: string; name: string; size: number };

const actions: { id: Action; label: string; icon: string; description: string }[] = [
  { id: "annotate", label: "Edit & annotate", icon: "✎", description: "Add a text note or highlight a selected area." },
  { id: "split", label: "Split PDF", icon: "✂", description: "Export only the page range you need." },
  { id: "rotate", label: "Rotate pages", icon: "↻", description: "Rotate selected pages or the entire document." },
  { id: "page-numbers", label: "Page numbers", icon: "№", description: "Add page numbers with your preferred placement." },
  { id: "compress", label: "Compress PDF", icon: "⇩", description: "Resave and optimize the PDF structure where possible." },
];

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export default function PdfEditorPage() {
  const [file, setFile] = useState<File | null>(null);
  const [activeAction, setActiveAction] = useState<Action>("annotate");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [result, setResult] = useState<ResultFile | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [originalUrl, setOriginalUrl] = useState("");

  const [page, setPage] = useState("1");
  const [pageRange, setPageRange] = useState("1-3");
  const [rotation, setRotation] = useState("90");
  const [rotateScope, setRotateScope] = useState("all");
  const [numberPosition, setNumberPosition] = useState("bottom-center");
  const [numberStart, setNumberStart] = useState("1");
  const [noteText, setNoteText] = useState("");
  const [annotationKind, setAnnotationKind] = useState("text");
  const [author, setAuthor] = useState("PaperFlow");
  const [x, setX] = useState("50");
  const [y, setY] = useState("50");
  const [width, setWidth] = useState("220");
  const [height, setHeight] = useState("28");
  const [highlightColor, setHighlightColor] = useState("yellow");

  useEffect(() => () => {
    if (result?.url) URL.revokeObjectURL(result.url);
  }, [result]);

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setError("");
    setNotice("");
    setResult((old) => {
      if (old?.url) URL.revokeObjectURL(old.url);
      return null;
    });
    if (!selected) { setFile(null); return; }
    if (!selected.name.toLowerCase().endsWith(".pdf")) {
      setError("Please select a PDF file.");
      event.target.value = "";
      setFile(null);
      return;
    }
    if (selected.size > 30 * 1024 * 1024) {
      setError("This tool currently supports PDFs up to 30 MB.");
      event.target.value = "";
      setFile(null);
      return;
    }
    setFile(selected);
    setOriginalUrl((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(selected); });
    setPage("1");
    setPageRange("1-3");
  }

  async function processPdf() {
    if (!file) { setError("Upload a PDF first."); return; }
    setBusy(true);
    setError("");
    setNotice("");
    setResult((old) => {
      if (old?.url) URL.revokeObjectURL(old.url);
      return null;
    });
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("action", activeAction);
      form.append("settings", JSON.stringify({
        page: Number(page),
        pageRange,
        rotation: Number(rotation),
        rotateScope,
        numberPosition,
        numberStart: Number(numberStart),
        noteText,
        annotationKind,
        author,
        x: Number(x),
        y: Number(y),
        width: Number(width),
        height: Number(height),
        highlightColor,
      }));
      const response = await fetch("/api/editor", { method: "POST", body: form });
      if (!response.ok) {
        let message = "Could not process this PDF. Please check the settings and try again.";
        try { const data = await response.json(); if (data.error) message = data.error; } catch {}
        throw new Error(message);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const contentDisposition = response.headers.get("Content-Disposition") ?? "";
      const match = contentDisposition.match(/filename="([^"]+)"/i);
      const name = match?.[1] || `${file.name.replace(/\.pdf$/i, "")}-paperflow.pdf`;
      setResult({ url, name, size: blob.size });
      setNotice("Your processed PDF is ready. Review the preview, then download it when you're satisfied.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  function downloadResult() {
    if (!result) return;
    const anchor = document.createElement("a");
    anchor.href = result.url;
    anchor.download = result.name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }

  function resetWorkspace() {
    if (result?.url) URL.revokeObjectURL(result.url);
    setResult(null);
    setFile(null);
    setOriginalUrl((old) => { if (old) URL.revokeObjectURL(old); return ""; });
    setError("");
    setNotice("");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <a href="/" className="flex items-center gap-3" aria-label="PaperFlow home">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-xl font-bold text-white shadow-sm">P</span>
            <span className="text-xl font-bold tracking-tight">Paper<span className="text-blue-600">Flow</span><span className="ml-2 hidden rounded-full bg-blue-50 px-2.5 py-1 align-middle text-xs font-semibold text-blue-700 sm:inline">PDF Editor</span></span>
          </a>
          <nav className="flex items-center gap-3 sm:gap-5">
            <a href="/" className="text-sm font-medium text-slate-600 transition hover:text-blue-600">Home</a>
            <a href="/#tools" className="hidden text-sm font-medium text-slate-600 transition hover:text-blue-600 sm:inline">All tools</a>
            <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">Free workspace</span>
          </nav>
        </div>
      </header>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1500px] px-4 py-7 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-600">Your document workspace</p>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">PDF Editor</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">Make practical changes to a PDF in one simple place. Upload a file, choose a tool, preview the result, and download when ready.</p>
            </div>
            <button type="button" onClick={() => inputRef.current?.click()} className="inline-flex items-center justify-center gap-2 self-start rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 md:self-auto">
              <span aria-hidden="true">＋</span> {file ? "Replace PDF" : "Upload PDF"}
            </button>
            <input ref={inputRef} type="file" accept=".pdf,application/pdf" onChange={chooseFile} className="hidden" />
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-[1500px] gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:px-8 lg:py-8">
        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <p className="px-3 pb-3 pt-2 text-xs font-bold uppercase tracking-widest text-slate-400">Editor tools</p>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
              {actions.map((action) => (
                <button key={action.id} type="button" onClick={() => { setActiveAction(action.id); setError(""); setNotice(""); }}
                  className={`flex items-center gap-3 rounded-xl px-3 py-3 text-left transition ${activeAction === action.id ? "bg-blue-50 text-blue-700 ring-1 ring-blue-100" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}>
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg ${activeAction === action.id ? "bg-white shadow-sm" : "bg-slate-100"}`}>{action.icon}</span>
                  <span className="min-w-0"><span className="block text-sm font-semibold">{action.label}</span><span className="hidden text-xs text-slate-500 lg:block">{action.description}</span></span>
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-lg">🔒</span>
              <div><p className="text-sm font-bold text-slate-800">Your file, your workflow</p><p className="mt-1 text-xs leading-5 text-slate-600">Files are processed by this PaperFlow server request. This tool does not save them to a user account or cloud library.</p></div>
            </div>
          </div>
        </aside>

        <section className="min-w-0 space-y-5">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
            <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div className="min-w-0"><p className="font-bold">Document preview</p><p className="mt-1 truncate text-sm text-slate-500">{result?.name || file?.name || "Upload a PDF to get started"}</p></div>
                {file && <span className="self-start rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{formatBytes(file.size)} · PDF</span>}
              </div>
              {result ? (
                <iframe title="Processed PDF preview" src={result.url} className="h-[520px] w-full bg-slate-100 sm:h-[680px]" />
              ) : file ? (
                <iframe title="Original PDF preview" src={originalUrl} className="h-[520px] w-full bg-slate-100 sm:h-[680px]" />
              ) : (
                <button type="button" onClick={() => inputRef.current?.click()} className="flex h-[420px] w-full flex-col items-center justify-center bg-slate-50 px-6 text-center transition hover:bg-blue-50/40 sm:h-[600px]">
                  <span className="flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-100 text-4xl">📄</span>
                  <span className="mt-5 text-lg font-bold">Your PDF will appear here</span>
                  <span className="mt-2 max-w-sm text-sm leading-6 text-slate-500">Upload a document to preview it and choose from the five tools in the sidebar.</span>
                  <span className="mt-5 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white">Choose a PDF</span>
                </button>
              )}
            </div>

            <div className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-xl">{actions.find((a) => a.id === activeAction)?.icon}</span>
                <div><h2 className="font-bold">{actions.find((a) => a.id === activeAction)?.label}</h2><p className="mt-0.5 text-xs text-slate-500">Tool settings</p></div>
              </div>

              <div className="mt-5 space-y-4">
                {activeAction === "annotate" && <>
                  <div><label className="mb-1.5 block text-sm font-semibold text-slate-700">Annotation type</label><div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setAnnotationKind("text")} className={`rounded-lg border px-3 py-2 text-sm font-semibold ${annotationKind === "text" ? "border-blue-300 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600"}`}>Text note</button><button type="button" onClick={() => setAnnotationKind("highlight")} className={`rounded-lg border px-3 py-2 text-sm font-semibold ${annotationKind === "highlight" ? "border-blue-300 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600"}`}>Highlight area</button></div></div>
                  <div><label className="mb-1.5 block text-sm font-semibold text-slate-700">Page number</label><input type="number" min="1" value={page} onChange={(e) => setPage(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></div>
                  {annotationKind === "text" && <><div><label className="mb-1.5 block text-sm font-semibold text-slate-700">Note text</label><textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} maxLength={500} rows={3} placeholder="Type your note…" className="w-full resize-y rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></div><div><label className="mb-1.5 block text-sm font-semibold text-slate-700">Author name</label><input value={author} onChange={(e) => setAuthor(e.target.value)} maxLength={80} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></div></>}
                  {annotationKind === "highlight" && <div><label className="mb-1.5 block text-sm font-semibold text-slate-700">Highlight color</label><select value={highlightColor} onChange={(e) => setHighlightColor(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5"><option value="yellow">Yellow</option><option value="green">Green</option><option value="blue">Blue</option><option value="pink">Pink</option></select></div>}
                  <p className="rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-800">Coordinates are measured from the PDF page’s lower-left corner in points. The default places content near the lower-left; adjust the area to suit your page.</p>
                  <div className="grid grid-cols-2 gap-3">{[["X position", x, setX], ["Y position", y, setY], ["Width", width, setWidth], ["Height", height, setHeight]].map(([label, value, setter]) => <div key={label as string}><label className="mb-1 block text-xs font-semibold text-slate-600">{label as string}</label><input type="number" min="0" value={value as string} onChange={(e) => (setter as (v: string) => void)(e.target.value)} className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm outline-none focus:border-blue-500" /></div>)}</div>
                </>}

                {activeAction === "split" && <><div><label className="mb-1.5 block text-sm font-semibold text-slate-700">Pages to export</label><input value={pageRange} onChange={(e) => setPageRange(e.target.value)} placeholder="e.g. 1-3, 5, 8-10" className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /><p className="mt-2 text-xs leading-5 text-slate-500">Use commas and ranges, such as 1-3, 5, 8-10. The selected pages will be saved into one new PDF in that order.</p></div></>}

                {activeAction === "rotate" && <><div><label className="mb-1.5 block text-sm font-semibold text-slate-700">Rotation</label><select value={rotation} onChange={(e) => setRotation(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5"><option value="90">Rotate 90° clockwise</option><option value="180">Rotate 180°</option><option value="270">Rotate 90° counterclockwise</option></select></div><div><label className="mb-1.5 block text-sm font-semibold text-slate-700">Apply to</label><select value={rotateScope} onChange={(e) => setRotateScope(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5"><option value="all">All pages</option><option value="selected">Selected page only</option></select></div>{rotateScope === "selected" && <div><label className="mb-1.5 block text-sm font-semibold text-slate-700">Page number</label><input type="number" min="1" value={page} onChange={(e) => setPage(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" /></div>}</>}

                {activeAction === "page-numbers" && <><div><label className="mb-1.5 block text-sm font-semibold text-slate-700">Position</label><select value={numberPosition} onChange={(e) => setNumberPosition(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5"><option value="bottom-center">Bottom center</option><option value="bottom-left">Bottom left</option><option value="bottom-right">Bottom right</option><option value="top-center">Top center</option><option value="top-left">Top left</option><option value="top-right">Top right</option></select></div><div><label className="mb-1.5 block text-sm font-semibold text-slate-700">Starting number</label><input type="number" min="1" value={numberStart} onChange={(e) => setNumberStart(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" /></div><p className="rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-500">Numbers are added to every page. They are new printed labels, separate from any existing page numbers.</p></>}

                {activeAction === "compress" && <div className="rounded-xl bg-blue-50 p-4"><p className="text-sm font-bold text-blue-900">PDF optimization</p><p className="mt-2 text-xs leading-5 text-blue-800">PaperFlow will resave the PDF with a compact object structure. This can reduce some files, but PDFs containing large images may not shrink much without image recompression.</p></div>}

                {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm leading-5 text-red-700">{error}</p>}
                {notice && <p role="status" className="rounded-xl bg-green-50 p-3 text-sm leading-5 text-green-800">{notice}{result && <span className="mt-1 block font-semibold">Output size: {formatBytes(result.size)}{file ? ` (original ${formatBytes(file.size)})` : ""}</span>}</p>}

                <button type="button" onClick={processPdf} disabled={!file || busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300">
                  {busy ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> Processing PDF…</> : <>Process PDF <span aria-hidden="true">→</span></>}
                </button>
                {result && <button type="button" onClick={downloadResult} className="w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm font-bold text-blue-700 transition hover:bg-blue-50">↓ Download processed PDF</button>}
                <p className="text-center text-xs leading-5 text-slate-400">PDF limit: 30 MB. Always review the output before using it.</p>
              </div>
            </div>
          </div>
          {result && <div className="flex flex-col gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><span className="text-xl">✓</span><div><p className="font-bold text-green-900">Your PDF is ready</p><p className="mt-1 text-sm text-green-800">{result.name} · {formatBytes(result.size)}</p></div></div><div className="flex flex-wrap gap-2"><button type="button" onClick={downloadResult} className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700">Download PDF</button><button type="button" onClick={resetWorkspace} className="rounded-lg border border-green-300 bg-white px-4 py-2.5 text-sm font-semibold text-green-800 hover:bg-green-100">Start over</button></div></div>}
        </section>
      </div>
      <footer className="border-t border-slate-200 bg-white"><div className="mx-auto flex max-w-[1500px] flex-col gap-3 px-4 py-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8"><a href="/" className="flex items-center gap-2 font-bold text-slate-800"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">P</span>Paper<span className="text-blue-600">Flow</span></a><span>Simple document tools, all in one place.</span><a href="/#tools" className="font-semibold text-blue-600 hover:text-blue-800">Explore all tools →</a></div></footer>
    </main>
  );
}
