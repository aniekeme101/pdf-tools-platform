
"use client";

import { useEffect, useRef, useState } from "react";

export default function WatermarkPage() {
  const [file, setFile] = useState<File | null>(null);
  const [watermarkText, setWatermarkText] =
    useState("CONFIDENTIAL");
  const [opacity, setOpacity] = useState(0.25);
  const [fontSize, setFontSize] = useState(40);
  const [color, setColor] = useState("gray");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resultUrl, setResultUrl] = useState("");
  const [resultName, setResultName] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (resultUrl) {
        URL.revokeObjectURL(resultUrl);
      }
    };
  }, [resultUrl]);

  function chooseFile(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];

    setError("");
    setFile(null);

    if (!selected) return;

    if (!selected.name.toLowerCase().endsWith(".pdf")) {
      setError("Please choose a PDF file.");
      event.target.value = "";
      return;
    }

    if (selected.size === 0 || selected.size > 20 * 1024 * 1024) {
      setError("Choose a PDF under 20 MB.");
      event.target.value = "";
      return;
    }

    setFile(selected);
  }

  async function addWatermark() {
    if (!file) {
      setError("Please choose a PDF first.");
      return;
    }

    if (!watermarkText.trim()) {
      setError("Please enter your watermark text.");
      return;
    }

    if (watermarkText.trim().length > 80) {
      setError("Watermark text must be 80 characters or fewer.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = new FormData();
      data.append("file", file);
      data.append("text", watermarkText.trim());
      data.append("opacity", String(opacity));
      data.append("fontSize", String(fontSize));
      data.append("color", color);

      const response = await fetch("/api/watermark", {
        method: "POST",
        body: data,
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(
          result.error || "Unable to add the watermark."
        );
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const disposition = response.headers.get(
        "Content-Disposition"
      );

      const match = disposition?.match(/filename="([^"]+)"/);

      const name =
        match?.[1] ||
        file.name.replace(/\.pdf$/i, "") + "-watermarked.pdf";

      setResultUrl((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return url;
      });

      setResultName(name);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  function downloadPdf() {
    if (!resultUrl) return;

    const link = document.createElement("a");
    link.href = resultUrl;
    link.download = resultName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function startOver() {
    setFile(null);
    setError("");
    setResultUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return "";
    });
    setResultName("");

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <a href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-xl font-bold text-white">
              P
            </span>
            <span className="text-xl font-bold">
              Paper<span className="text-blue-600">Flow</span>
            </span>
          </a>

          <a
            href="/"
            className="text-sm font-semibold text-slate-600 hover:text-blue-600"
          >
            ← Back home
          </a>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-5 py-12 sm:py-16">
        <div className="text-center">
          <span className="text-sm font-bold uppercase tracking-widest text-blue-600">
            PDF tools
          </span>

          <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">
            Add a watermark to PDF
          </h1>

          <p className="mx-auto mt-4 max-w-2xl leading-7 text-slate-600">
            Stamp your PDF pages with text such as CONFIDENTIAL,
            DRAFT, or your business name. Preview the result before
            downloading.
          </p>
        </div>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          {!resultUrl ? (
            <>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex w-full flex-col items-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center transition hover:border-blue-400 hover:bg-blue-50/50"
              >
                <span className="text-4xl">📄</span>

                <span className="mt-4 font-bold">
                  {file ? file.name : "Choose your PDF"}
                </span>

                <span className="mt-2 text-sm text-slate-500">
                  {file
                    ? "Click to select another file"
                    : "PDF files up to 20 MB"}
                </span>

                <span className="mt-4 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold">
                  Browse files
                </span>
              </button>

              <input
                ref={inputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={chooseFile}
                className="hidden"
              />

              <div className="mt-7 space-y-6">
                <div>
                  <label
                    htmlFor="watermark"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Watermark text
                  </label>

                  <input
                    id="watermark"
                    value={watermarkText}
                    maxLength={80}
                    onChange={(event) =>
                      setWatermarkText(event.target.value)
                    }
                    placeholder="e.g. CONFIDENTIAL"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Up to 80 characters.
                  </p>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label
                      htmlFor="opacity"
                      className="text-sm font-semibold"
                    >
                      Transparency
                    </label>
                    <span className="text-sm text-slate-500">
                      {Math.round(opacity * 100)}%
                    </span>
                  </div>

                  <input
                    id="opacity"
                    type="range"
                    min="0.05"
                    max="0.8"
                    step="0.05"
                    value={opacity}
                    onChange={(event) =>
                      setOpacity(Number(event.target.value))
                    }
                    className="w-full accent-blue-600"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Lower values create a lighter watermark.
                  </p>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label
                      htmlFor="fontSize"
                      className="text-sm font-semibold"
                    >
                      Text size
                    </label>
                    <span className="text-sm text-slate-500">
                      {fontSize}
                    </span>
                  </div>

                  <input
                    id="fontSize"
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={fontSize}
                    onChange={(event) =>
                      setFontSize(Number(event.target.value))
                    }
                    className="w-full accent-blue-600"
                  />
                </div>

                <div>
                  <label
                    htmlFor="color"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Watermark color
                  </label>

                  <select
                    id="color"
                    value={color}
                    onChange={(event) => setColor(event.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="gray">Gray</option>
                    <option value="black">Black</option>
                    <option value="blue">Blue</option>
                    <option value="red">Red</option>
                  </select>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Text style preview
                  </p>

                  <div className="flex min-h-36 items-center justify-center overflow-hidden">
                    <span
                      className="break-all text-center font-extrabold"
                      style={{
                        color: {
                          gray: "#595959",
                          black: "#000000",
                          blue: "#1a4dcc",
                          red: "#cc1a1a",
                        }[color],
                        opacity,
                        fontSize: `${Math.min(fontSize, 48)}px`,
                        transform: "rotate(-15deg)",
                      }}
                    >
                      {watermarkText || "YOUR WATERMARK"}
                    </span>
                  </div>

                  <p className="text-center text-xs text-slate-500">
                    This is a style preview, not your actual PDF.
                  </p>
                </div>
              </div>

              {error && (
                <p
                  role="alert"
                  className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700"
                >
                  {error}
                </p>
              )}

              <button
                type="button"
                onClick={addWatermark}
                disabled={!file || loading || !watermarkText.trim()}
                className="mt-7 w-full rounded-xl bg-blue-600 px-5 py-4 font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {loading ? "Adding watermark..." : "Add watermark to PDF"}
              </button>
            </>
          ) : (
            <div>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-bold text-green-700">
                    ✓ Watermark added successfully
                  </p>
                  <p className="mt-2 break-all text-sm text-slate-600">
                    {resultName}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={downloadPdf}
                  className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
                >
                  ↓ Download PDF
                </button>
              </div>

              <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                <iframe
                  title="Watermarked PDF preview"
                  src={resultUrl}
                  className="h-[600px] w-full"
                />
              </div>

              <button
                type="button"
                onClick={startOver}
                className="mt-5 rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Watermark another PDF
              </button>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs leading-5 text-slate-500">
          This tool adds a visible text watermark to each page. It does
          not prevent copying or editing, and it is not a digital
          signature or a security feature.
        </p>
      </section>

      <footer className="border-t border-slate-200 bg-white px-5 py-6 text-center text-sm text-slate-500">
        PaperFlow · Simple document tools, all in one place.
      </footer>
    </main>
  );
}
