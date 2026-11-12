
"use client";

import { useRef, useState } from "react";

type Tool = {
  icon: string;
  title: string;
  description: string;
  href?: string;
  featured?: boolean;
};

const tools: Tool[] = [
  {
    icon: "📝",
    title: "Word to PDF",
    description:
      "Convert Word documents into professional PDFs in just a few clicks.",
    href: "/",
    featured: true,
  },
  {
    icon: "📚",
    title: "Merge PDFs",
    description:
      "Combine multiple PDF files into one organized document.",
    href: "/merge",
  },
  {
    icon: "✂️",
    title: "Extract PDF Pages",
    description:
      "Select and save only the pages you need from a PDF.",
    href: "/extract",
  },
  {
    icon: "✏️",
    title: "Edit PDF",
    description:
      "Edit, annotate, split, rotate, number, and optimize PDF documents.",
    href: "/editor",
    featured: true,
  },
  {
    icon: "📝",
    title: "PDF to Word",
    description: "Convert PDF documents into editable Word files.",
    href: "/pdf-to-word",
  },
  {
    icon: "🖍️",
    title: "Highlight PDF",
    description:
      "Highlight important information in your documents.",
    href: "/highlight",
  },
  {
    icon: "💬",
    title: "Add Comments",
    description: "Place notes and comments directly onto PDF pages.",
    href: "/comments",
  },
  {
    icon: "🔒",
    title: "Protect PDF",
    description: "Protect PDF documents with a password.",
    href: "/lock-pdf",
  },
  {
  title: "Sign PDF",
  description: "Add your signature to a document.",
  icon: "✍️",
  href: "/sign-pdf",
},
  {
    icon: "💧",
    title: "Watermark PDF",
    description:
      "Add custom text watermarks to your PDF documents.",
    href: "/watermark",
  },
];

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [pdfName, setPdfName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function scrollToTools() {
    document.getElementById("tools")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function scrollToConverter() {
    document.getElementById("converter")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const selectedFile = event.target.files?.[0];

    setError("");
    setMessage("");

    if (!selectedFile) {
      setFile(null);
      return;
    }

    const extension = selectedFile.name
      .split(".")
      .pop()
      ?.toLowerCase();

    if (!extension || !["doc", "docx"].includes(extension)) {
      setError("Please select a Word document (.doc or .docx).");
      setFile(null);
      event.target.value = "";
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setError("Your file is too large. The maximum file size is 10 MB.");
      setFile(null);
      event.target.value = "";
      return;
    }

    setFile(selectedFile);
  }

  async function handleConvert() {
    if (!file) {
      setError("Please choose a Word document first.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");
    setPdfUrl("");
    setPdfName("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/convert", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        let errorMessage = "Conversion failed. Please try again.";

        try {
          const result = await response.json();

          if (result.error) {
            errorMessage = result.error;
          }
        } catch {
          // Keep the default error message.
        }

        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const outputName =
        file.name.replace(/\.(docx?|DOCX?)$/i, "") + ".pdf";

      setPdfUrl(url);
      setPdfName(outputName);
      setMessage("Your PDF is ready to preview and download.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong during conversion."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleDownload() {
    if (!pdfUrl || !pdfName) return;

    const link = document.createElement("a");
    link.href = pdfUrl;
    link.download = pdfName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function handleStartOver() {
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
    }

    setFile(null);
    setPdfUrl("");
    setPdfName("");
    setMessage("");
    setError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <a href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-xl font-bold text-white">
              P
            </span>

            <span className="text-xl font-bold tracking-tight">
              Paper<span className="text-blue-600">Flow</span>
            </span>
          </a>

          <nav className="flex items-center gap-4 sm:gap-7">
            <button
              type="button"
              onClick={scrollToTools}
              className="text-sm font-medium text-slate-600 transition hover:text-blue-600"
            >
              All tools
            </button>

            {/* ADJUSTMENT: Added the Dashboard navigation link for quick access to /dashboard. */}
            <a
              href="/dashboard"
              className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
            >
              Dashboard
            </a>
            {/* END OF DASHBOARD NAVIGATION ADDITION */}

            <button
              type="button"
              onClick={scrollToConverter}
              className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              Get started
            </button>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden bg-white">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-blue-100/70 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-indigo-100/60 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-2 lg:py-28">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700">
              <span className="h-2 w-2 rounded-full bg-blue-600" />
              Simple tools. Better documents.
            </span>

            <h1 className="mt-6 max-w-2xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Your documents,
              <span className="block text-blue-600">
                made effortless.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
              Convert Word documents to PDF and manage your files with
              simple, practical tools. No complicated software required.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <button
                type="button"
                onClick={scrollToConverter}
                className="rounded-xl bg-blue-600 px-6 py-3.5 font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:bg-blue-700"
              >
                Convert Word to PDF{" "}
                <span aria-hidden="true">→</span>
              </button>

              <button
                type="button"
                onClick={scrollToTools}
                className="rounded-xl border border-slate-300 bg-white px-6 py-3.5 font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
              >
                Explore tools
              </button>
            </div>

            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-500">
              <span>✓ Easy to use</span>
              <span>✓ Quick conversion</span>
              <span>✓ Preview before download</span>
            </div>
          </div>

          <div className="mx-auto w-full max-w-lg">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-200/70 sm:p-7">
              <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                <div>
                  <p className="font-bold">Document workspace</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Your files, made simpler
                  </p>
                </div>

                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
                  📄
                </span>
              </div>

              <div className="mt-6 space-y-4">
                <div className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-2xl">
                    📝
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">Word document</p>
                    <p className="text-sm text-slate-500">
                      Upload your DOC or DOCX
                    </p>
                  </div>

                  <span className="text-slate-400">→</span>
                </div>

                <div className="flex justify-center text-xl text-blue-600">
                  ↓
                </div>

                <div className="flex items-center gap-4 rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-2xl shadow-sm">
                    📕
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">PDF document</p>
                    <p className="text-sm text-slate-500">
                      Preview and download when ready
                    </p>
                  </div>

                  <span className="text-sm font-semibold text-blue-700">
                    Ready
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={scrollToConverter}
                className="mt-6 w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
              >
                Try the converter
              </button>
            </div>
          </div>
        </div>
      </section>

      <section
        id="converter"
        className="scroll-mt-24 mx-auto max-w-5xl px-5 py-16 sm:px-8 sm:py-20"
      >
        <div className="mx-auto max-w-3xl text-center">
          <span className="text-sm font-bold uppercase tracking-widest text-blue-600">
            Featured tool
          </span>

          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Word to PDF converter
          </h2>

          <p className="mt-4 leading-7 text-slate-600">
            Upload a Word document, convert it, preview your PDF, and
            download it when you are ready.
          </p>
        </div>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          {!pdfUrl ? (
            <>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-5 py-12 text-center transition hover:border-blue-400 hover:bg-blue-50/50 sm:py-16"
              >
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-3xl">
                  📤
                </span>

                <span className="mt-5 text-lg font-bold">
                  {file ? file.name : "Choose a Word document"}
                </span>

                <span className="mt-2 text-sm text-slate-500">
                  {file
                    ? "Click to choose a different file"
                    : "Click to browse files on your device"}
                </span>

                <span className="mt-4 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold">
                  Browse files
                </span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileChange}
                className="hidden"
              />

              <p className="mt-4 text-center text-xs text-slate-500">
                Supported formats: DOC and DOCX · Maximum size: 10 MB
              </p>

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
                onClick={handleConvert}
                disabled={!file || loading}
                className="mt-6 w-full rounded-xl bg-blue-600 px-5 py-4 font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {loading ? "Converting your document..." : "Convert to PDF"}
              </button>
            </>
          ) : (
            <div>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-green-700">
                    <span>✓</span> Conversion complete
                  </div>

                  <h3 className="mt-2 break-all text-lg font-bold">
                    {pdfName}
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Preview your PDF below before downloading it.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleDownload}
                  className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
                >
                  ↓ Download PDF
                </button>
              </div>

              <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                <iframe
                  title="Converted PDF preview"
                  src={pdfUrl}
                  className="h-[550px] w-full"
                />
              </div>

              {message && (
                <p className="mt-4 text-sm text-green-700">{message}</p>
              )}

              <button
                type="button"
                onClick={handleStartOver}
                className="mt-5 rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Convert another document
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white py-14">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 sm:grid-cols-3 sm:px-8">
          <div className="text-center">
            <span className="text-3xl">⚡</span>
            <h3 className="mt-3 font-bold">Simple workflow</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Upload, process, preview, and download in a few steps.
            </p>
          </div>

          <div className="text-center">
            <span className="text-3xl">📄</span>
            <h3 className="mt-3 font-bold">Useful PDF tools</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Handle common document tasks from one place.
            </p>
          </div>

          <div className="text-center">
            <span className="text-3xl">💻</span>
            <h3 className="mt-3 font-bold">Works in your browser</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Use PaperFlow on your computer or mobile device.
            </p>
          </div>
        </div>
      </section>

      <section
        id="tools"
        className="scroll-mt-24 mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="text-sm font-bold uppercase tracking-widest text-blue-600">
              The PaperFlow toolkit
            </span>

            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              All the tools you need
            </h2>

            <p className="mt-4 max-w-2xl leading-7 text-slate-600">
              Choose a tool for your next document task. More tools will be
              added as PaperFlow grows.
            </p>
          </div>

          <button
            type="button"
            onClick={scrollToTools}
            className="hidden rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600 sm:inline-flex"
          >
            All tools ↓
          </button>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => (
            <div
              key={tool.title}
              className={`flex flex-col rounded-2xl border p-6 transition hover:-translate-y-1 hover:shadow-lg ${
                tool.featured
                  ? "border-blue-200 bg-blue-50/60"
                  : "border-slate-200 bg-white hover:border-blue-200"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-2xl shadow-sm">
                  {tool.icon}
                </span>

                {tool.featured ? (
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                    Featured
                  </span>
                ) : tool.href ? (
                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                    Available
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                    Coming soon
                  </span>
                )}
              </div>

              <h3 className="mt-5 text-lg font-bold">{tool.title}</h3>

              <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">
                {tool.description}
              </p>

              {tool.href ? (
                <a
                  href={tool.href}
                  className="mt-5 inline-flex items-center gap-2 font-semibold text-blue-600 transition hover:text-blue-800"
                >
                  Open tool <span aria-hidden="true">→</span>
                </a>
              ) : (
                <span className="mt-5 text-sm font-medium text-slate-400">
                  Available in a future update
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="px-5 pb-16 sm:px-8 sm:pb-20">
        <div className="mx-auto max-w-7xl rounded-3xl bg-blue-600 px-6 py-12 text-center text-white sm:px-12 sm:py-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to simplify your documents?
          </h2>

          <p className="mx-auto mt-4 max-w-2xl leading-7 text-blue-100">
            Start with our Word-to-PDF converter, then explore the tools
            available in PaperFlow.
          </p>

          <button
            type="button"
            onClick={scrollToConverter}
            className="mt-7 rounded-xl bg-white px-6 py-3.5 font-bold text-blue-700 transition hover:bg-blue-50"
          >
            Get started for free
          </button>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <a href="/" className="flex items-center gap-2 font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm text-white">
              P
            </span>

            <span>
              Paper<span className="text-blue-600">Flow</span>
            </span>
          </a>

          <p className="text-sm text-slate-500">
            Simple document tools, all in one place.
          </p>

          <p className="text-sm text-slate-400">
            © {new Date().getFullYear()} PaperFlow
          </p>
        </div>
      </footer>
    </main>
  );
}
