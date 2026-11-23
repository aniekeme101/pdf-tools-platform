"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

const FUNCTION_URL =
  "https://auqkmbngftihhxpcwoiu.supabase.co/functions/v1/supporter-workflows";

export default function SponsorApplicationPage() {
  const [form, setForm] = useState({
    organisation_name: "",
    legal_name: "",
    website_url: "",
    contact_name: "",
    contact_email: "",
    description: "",
    public_display_consent: false,
    website: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function update(field: keyof typeof form, value: string | boolean) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      if (!publishableKey) {
        throw new Error("The application is not configured yet. Please contact the website administrator.");
      }

      const response = await fetch(FUNCTION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: publishableKey,
        },
        body: JSON.stringify({ action: "apply_sponsor", ...form }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "We could not submit your application.");

      setMessage(result.message || "Your application has been received.");
      setForm({
        organisation_name: "",
        legal_name: "",
        website_url: "",
        contact_name: "",
        contact_email: "",
        description: "",
        public_display_consent: false,
        website: "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const fieldClass =
    "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 text-gray-900">
      <div className="mx-auto max-w-3xl">
        <header className="mb-10 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold tracking-tight text-gray-950">
            PaperFlow
          </Link>
          <Link href="/" className="text-sm font-medium text-blue-700 hover:underline">
            Back to home
          </Link>
        </header>

        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-10">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-blue-700">
            Support the mission
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Apply to become a sponsor
          </h1>
          <p className="mt-4 leading-7 text-gray-600">
            We welcome organisations interested in supporting accessible digital
            tools and our wider education-support mission. Sponsor applications
            are reviewed before any organisation is listed publicly.
          </p>

          <div className="mt-6 rounded-2xl bg-blue-50 p-5 text-sm leading-6 text-blue-950">
            Sponsorship is separate from ordinary donations. Submitting this
            application does not guarantee approval, a placement, or a particular
            promotional benefit. All tools remain free for everyone.
          </div>

          {message && (
            <div role="status" className="mt-6 rounded-xl bg-green-50 p-4 text-sm text-green-800">
              {message}
            </div>
          )}
          {error && (
            <div role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-800">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="organisation_name" className="mb-2 block text-sm font-semibold">
                Organisation / business name *
              </label>
              <input id="organisation_name" required maxLength={120} className={fieldClass}
                value={form.organisation_name}
                onChange={(e) => update("organisation_name", e.target.value)}
                placeholder="Your organisation's public name" />
            </div>

            <div>
              <label htmlFor="legal_name" className="mb-2 block text-sm font-semibold">
                Registered legal name <span className="font-normal text-gray-500">(optional)</span>
              </label>
              <input id="legal_name" maxLength={160} className={fieldClass}
                value={form.legal_name}
                onChange={(e) => update("legal_name", e.target.value)}
                placeholder="Legal entity name, if different" />
            </div>

            <div>
              <label htmlFor="website_url" className="mb-2 block text-sm font-semibold">
                Website URL <span className="font-normal text-gray-500">(optional)</span>
              </label>
              <input id="website_url" type="url" maxLength={300} className={fieldClass}
                value={form.website_url}
                onChange={(e) => update("website_url", e.target.value)}
                placeholder="https://example.com" />
              <p className="mt-1 text-xs text-gray-500">Use a secure https:// link.</p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="contact_name" className="mb-2 block text-sm font-semibold">
                  Contact person's name *
                </label>
                <input id="contact_name" required maxLength={120} className={fieldClass}
                  value={form.contact_name}
                  onChange={(e) => update("contact_name", e.target.value)} />
              </div>
              <div>
                <label htmlFor="contact_email" className="mb-2 block text-sm font-semibold">
                  Contact email *
                </label>
                <input id="contact_email" type="email" required maxLength={254} className={fieldClass}
                  value={form.contact_email}
                  onChange={(e) => update("contact_email", e.target.value)} />
              </div>
            </div>

            <div>
              <label htmlFor="description" className="mb-2 block text-sm font-semibold">
                Tell us about your organisation and proposed support
              </label>
              <textarea id="description" rows={5} maxLength={1200} className={fieldClass}
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                placeholder="Briefly describe your organisation and the kind of sponsorship you would like to discuss." />
            </div>

            <div className="rounded-2xl border border-gray-200 p-5">
              <label className="flex items-start gap-3 text-sm leading-6">
                <input type="checkbox" className="mt-1 h-4 w-4 rounded border-gray-300"
                  checked={form.public_display_consent}
                  onChange={(e) => update("public_display_consent", e.target.checked)} />
                <span>
                  I give permission for the organisation's name, website and (if
                  later supplied and approved) logo to appear on the public sponsor
                  board if our sponsorship is approved. This is optional and can be
                  changed before publication.
                </span>
              </label>
              <p className="mt-3 text-xs leading-5 text-gray-500">
                Leaving this unchecked does not prevent you from applying. Your
                contact details will not appear on the public sponsor board.
              </p>
            </div>

            <div className="hidden" aria-hidden="true">
              <label htmlFor="website">Leave this field empty</label>
              <input id="website" tabIndex={-1} autoComplete="off"
                value={form.website}
                onChange={(e) => update("website", e.target.value)} />
            </div>

            <button type="submit" disabled={loading}
              className="w-full rounded-xl bg-blue-700 px-6 py-3.5 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? "Submitting application..." : "Submit sponsor application"}
            </button>
            <p className="text-center text-xs leading-5 text-gray-500">
              Your information is used to review this application and contact you
              about sponsorship. It is not published automatically.
            </p>
          </form>
        </section>
      </div>
    </main>
  );
}
