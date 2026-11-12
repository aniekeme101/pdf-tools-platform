
"use client";

import { useEffect, useMemo, useState } from "react";
import AccountControls from "./AccountControls";

type ToolCategory = "All tools" | "Convert" | "Organize" | "Edit & annotate" | "Security";

type Tool = {
  title: string;
  description: string;
  icon: string;
  href?: string;
  category: Exclude<ToolCategory, "All tools">;
  color: string;
  featured?: boolean;
  comingSoon?: boolean;
};

const tools: Tool[] = [
  {
    title: "Word to PDF",
    description: "Turn Word documents into shareable PDFs.",
    icon: "📝",
    href: "/",
    category: "Convert",
    color: "bg-blue-50",
    featured: true,
  },
  {
    title: "PDF to Word",
    description: "Convert PDFs into editable Word documents.",
    icon: "📃",
    href: "/pdf-to-word",
    category: "Convert",
    color: "bg-indigo-50",
    featured: true,
  },
  {
    title: "Merge PDF",
    description: "Combine multiple PDFs into one file.",
    icon: "📚",
    href: "/merge",
    category: "Organize",
    color: "bg-violet-50",
  },
  {
    title: "Extract PDF pages",
    description: "Keep only the pages you need.",
    icon: "✂️",
    href: "/extract",
    category: "Organize",
    color: "bg-amber-50",
  },
  {
    title: "PDF Editor",
    description: "Split, rotate, number, annotate, and optimize PDFs.",
    icon: "🛠️",
    href: "/editor",
    category: "Edit & annotate",
    color: "bg-cyan-50",
    featured: true,
  },
  {
    title: "Highlight PDF",
    description: "Highlight important passages and details.",
    icon: "🖍️",
    href: "/highlight",
    category: "Edit & annotate",
    color: "bg-yellow-50",
  },
  {
    title: "Add comments",
    description: "Place notes and comments on PDF pages.",
    icon: "💬",
    href: "/comments",
    category: "Edit & annotate",
    color: "bg-pink-50",
  },
  {
    title: "Watermark PDF",
    description: "Add a text watermark to your document.",
    icon: "💧",
    href: "/watermark",
    category: "Edit & annotate",
    color: "bg-sky-50",
  },
  {
    title: "Lock PDF",
    description: "Protect a PDF with a password.",
    icon: "🔒",
    href: "/lock-pdf",
    category: "Security",
    color: "bg-emerald-50",
  },
  {
    title: "Sign PDF",
    description: "Add your signature to a document.",
    icon: "✍️",
    category: "Edit & annotate",
    color: "bg-orange-50",
    href: "/sign-pdf",
  },
];

const categories: ToolCategory[] = [
  "All tools",
  "Convert",
  "Organize",
  "Edit & annotate",
  "Security",
];

const RECENT_KEY = "paperflow-dashboard-recent";
const FAVORITES_KEY = "paperflow-dashboard-favorites";

export default function DashboardPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ToolCategory>("All tools");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  useEffect(() => {
    try {
      const savedFavorites = localStorage.getItem(FAVORITES_KEY);
      const savedRecent = localStorage.getItem(RECENT_KEY);

      if (savedFavorites) setFavorites(JSON.parse(savedFavorites));
      if (savedRecent) setRecent(JSON.parse(savedRecent));
    } catch {
      // The dashboard remains usable if browser storage is unavailable.
    }
  }, []);

  const visibleTools = useMemo(() => {
    const search = query.trim().toLowerCase();

    return tools.filter((tool) => {
      const matchesSearch =
        !search ||
        tool.title.toLowerCase().includes(search) ||
        tool.description.toLowerCase().includes(search) ||
        tool.category.toLowerCase().includes(search);

      const matchesCategory =
        category === "All tools" || tool.category === category;

      const matchesFavorites =
        !favoritesOnly || favorites.includes(tool.title);

      return matchesSearch && matchesCategory && matchesFavorites;
    });
  }, [query, category, favoritesOnly, favorites]);

  function toggleFavorite(title: string) {
    setFavorites((current) => {
      const updated = current.includes(title)
        ? current.filter((item) => item !== title)
        : [...current, title];

      try {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
      } catch {
        // Favorites still work for the current session.
      }

      return updated;
    });
  }

  function openTool(tool: Tool) {
    if (!tool.href || tool.comingSoon) return;

    const updated = [
      tool.title,
      ...recent.filter((item) => item !== tool.title),
    ].slice(0, 5);

    setRecent(updated);

    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
    } catch {
      // Recent tools still work for the current session.
    }

    window.location.href = tool.href;
  }

  const recentTools = recent
    .map((title) => tools.find((tool) => tool.title === title))
    .filter((tool): tool is Tool => Boolean(tool && !tool.comingSoon));

  return (
    <main className="min-h-screen bg-[#f7f8fc] text-slate-900">
      <div className="flex min-h-screen">
        {/* Desktop sidebar */}
        <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white px-5 py-7 lg:flex lg:flex-col">
          <a href="/dashboard" className="flex items-center gap-3 px-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-xl font-bold text-white shadow-sm">
              P
            </span>
            <span className="text-xl font-extrabold tracking-tight">
              Paper<span className="text-blue-600">Flow</span>
            </span>
          </a>

          <p className="mb-3 mt-10 px-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
            Workspace
          </p>

          <button
            onClick={() => {
              setCategory("All tools");
              setFavoritesOnly(false);
            }}
            className={`flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${
              category === "All tools" && !favoritesOnly
                ? "bg-blue-50 text-blue-700"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <span>▦</span> All tools
            <span className="ml-auto rounded-lg bg-white px-2 py-0.5 text-xs text-slate-500">
              {tools.filter((tool) => !tool.comingSoon).length}
            </span>
          </button>

          {categories.slice(1).map((item) => (
            <button
              key={item}
              onClick={() => {
                setCategory(item);
                setFavoritesOnly(false);
              }}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition ${
                category === item
                  ? "bg-blue-50 font-semibold text-blue-700"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span>
                {item === "Convert"
                  ? "⇄"
                  : item === "Organize"
                    ? "▤"
                    : item === "Security"
                      ? "♢"
                      : "✎"}
              </span>
              {item}
            </button>
          ))}

          <div className="my-6 border-t border-slate-100" />

          <button
            onClick={() => {
              setFavoritesOnly(true);
              setCategory("All tools");
            }}
            className={`flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition ${
              favoritesOnly
                ? "bg-blue-50 font-semibold text-blue-700"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <span>♡</span> Favourites
          </button>

          <div className="mt-auto rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 p-5 text-white">
            <span className="text-2xl">✨</span>
            <p className="mt-3 font-bold">Less busywork.</p>
            <p className="mt-1 text-sm leading-6 text-blue-100">
              Simple tools to make working with documents easier.
            </p>
            <a
              href="/"
              className="mt-4 inline-flex rounded-lg bg-white px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
            >
              Try a tool →
            </a>
          </div>

          <p className="mt-5 px-2 text-xs text-slate-400">
            PaperFlow · Document workspace
          </p>
        </aside>

        {/* Main area */}
        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
              <a href="/dashboard" className="flex items-center gap-2 lg:hidden">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 font-bold text-white">
                  P
                </span>
                <span className="text-lg font-extrabold">
                  Paper<span className="text-blue-600">Flow</span>
                </span>
              </a>

              <div className="hidden lg:block">
                <p className="text-sm text-slate-500">Workspace</p>
                <p className="font-semibold">Your document toolkit</p>
              </div>

              <div className="ml-auto flex items-center gap-3">
                <a
                  href="/"
                  className="hidden rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:text-blue-700 sm:inline-flex"
                >
                  Word to PDF
                </a>
                <AccountControls />
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
            {/* Welcome banner */}
            <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 px-6 py-8 text-white shadow-lg shadow-blue-900/10 sm:px-9 sm:py-10">
              <div className="pointer-events-none absolute -right-8 -top-16 h-64 w-64 rounded-full border-[36px] border-white/10" />
              <div className="pointer-events-none absolute right-36 top-20 h-24 w-24 rounded-full bg-cyan-300/10 blur-2xl" />

              <div className="relative max-w-2xl">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-blue-50">
                  <span className="h-2 w-2 rounded-full bg-emerald-300" />
                  YOUR ALL-IN-ONE DOCUMENT SPACE
                </span>

                <h1 className="mt-5 text-3xl font-extrabold tracking-tight sm:text-4xl">
                  Make room for the work that matters.
                </h1>

                <p className="mt-3 max-w-xl leading-7 text-blue-100">
                  Everything you need to convert, organize, edit, and protect
                  your documents — all in one place.
                </p>

                <button
                  onClick={() => {
                    setCategory("All tools");
                    setFavoritesOnly(false);
                    document.getElementById("tool-library")?.scrollIntoView({
                      behavior: "smooth",
                    });
                  }}
                  className="mt-6 rounded-xl bg-white px-5 py-3 text-sm font-bold text-blue-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-50"
                >
                  Explore all tools <span aria-hidden="true">→</span>
                </button>
              </div>
            </section>

            {/* Search */}
            <section className="mt-8">
              <label htmlFor="tool-search" className="sr-only">
                Search tools
              </label>
              <div className="relative max-w-2xl">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-slate-400">
                  ⌕
                </span>
                <input
                  id="tool-search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search tools, e.g. merge, convert, password..."
                  className="w-full rounded-2xl border border-slate-200 bg-white py-4 pl-12 pr-4 text-sm shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />
                <span className="absolute right-4 top-1/2 hidden -translate-y-1/2 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-400 sm:block">
                  Search
                </span>
              </div>
            </section>

            {/* Recent tools */}
            {!query && !favoritesOnly && category === "All tools" && recentTools.length > 0 && (
              <section className="mt-9">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-bold tracking-tight">
                    Pick up where you left off
                  </h2>
                  <span className="text-xs font-medium text-slate-400">
                    Recently opened
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {recentTools.slice(0, 3).map((tool) => (
                    <button
                      key={tool.title}
                      onClick={() => openTool(tool)}
                      className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-blue-200 hover:shadow-sm"
                    >
                      <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${tool.color} text-xl`}>
                        {tool.icon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold">{tool.title}</span>
                        <span className="mt-1 block text-xs text-slate-500">
                          Open tool →
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Tool library */}
            <section id="tool-library" className="scroll-mt-28 mt-10">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-blue-700">
                    TOOL LIBRARY
                  </p>
                  <h2 className="mt-1 text-2xl font-extrabold tracking-tight">
                    {favoritesOnly
                      ? "Your favourites"
                      : category === "All tools"
                        ? "Everything you need"
                        : category}
                  </h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Choose a tool to get started.
                  </p>
                </div>

                <span className="text-sm text-slate-500">
                  {visibleTools.length} {visibleTools.length === 1 ? "tool" : "tools"}
                </span>
              </div>

              <div className="mt-5 flex gap-2 overflow-x-auto pb-2">
                {categories.map((item) => (
                  <button
                    key={item}
                    onClick={() => {
                      setCategory(item);
                      setFavoritesOnly(false);
                    }}
                    className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                      category === item && !favoritesOnly
                        ? "bg-blue-600 text-white shadow-sm"
                        : "border border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-700"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>

              {visibleTools.length === 0 ? (
                <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
                  <span className="text-3xl">🔎</span>
                  <h3 className="mt-3 font-bold">No tools found</h3>
                  <p className="mt-2 text-sm text-slate-500">
                    Try another search or choose a different category.
                  </p>
                  <button
                    onClick={() => {
                      setQuery("");
                      setCategory("All tools");
                      setFavoritesOnly(false);
                    }}
                    className="mt-4 text-sm font-semibold text-blue-700 hover:text-blue-800"
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {visibleTools.map((tool) => (
                    <article
                      key={tool.title}
                      className={`group flex min-h-56 flex-col rounded-2xl border bg-white p-5 transition duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-200/70 ${
                        tool.featured
                          ? "border-blue-100"
                          : "border-slate-200"
                      } ${tool.comingSoon ? "opacity-80" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tool.color} text-2xl transition group-hover:scale-105`}>
                          {tool.icon}
                        </span>

                        <div className="flex items-center gap-2">
                          {tool.featured && (
                            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                              Popular
                            </span>
                          )}
                          {tool.comingSoon && (
                            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700">
                              Coming soon
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => toggleFavorite(tool.title)}
                            aria-label={
                              favorites.includes(tool.title)
                                ? `Remove ${tool.title} from favourites`
                                : `Add ${tool.title} to favourites`
                            }
                            title={
                              favorites.includes(tool.title)
                                ? "Remove from favourites"
                                : "Add to favourites"
                            }
                            className={`flex h-8 w-8 items-center justify-center rounded-full text-xl transition hover:bg-slate-100 ${
                              favorites.includes(tool.title)
                                ? "text-rose-500"
                                : "text-slate-300 hover:text-rose-400"
                            }`}
                          >
                            {favorites.includes(tool.title) ? "♥" : "♡"}
                          </button>
                        </div>
                      </div>

                      <h3 className="mt-5 text-base font-bold tracking-tight">
                        {tool.title}
                      </h3>

                      <p className="mt-2 flex-1 text-sm leading-6 text-slate-500">
                        {tool.description}
                      </p>

                      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                        <span className="text-xs font-medium text-slate-400">
                          {tool.category}
                        </span>

                        {tool.comingSoon ? (
                          <span className="text-sm font-semibold text-slate-400">
                            In the works
                          </span>
                        ) : (
                          <button
                            onClick={() => openTool(tool)}
                            className="inline-flex items-center gap-2 text-sm font-bold text-blue-700 transition group-hover:gap-3 hover:text-blue-800"
                          >
                            Open tool <span aria-hidden="true">→</span>
                          </button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <footer className="mt-14 flex flex-col gap-3 border-t border-slate-200 py-6 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
              <p>© {new Date().getFullYear()} PaperFlow. Your documents, made simpler.</p>
              <p>Simple tools. Better documents.</p>
            </footer>
          </div>
        </div>
      </div>
    </main>
  );
}
