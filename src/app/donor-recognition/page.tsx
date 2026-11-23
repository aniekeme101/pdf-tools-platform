"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function DonorRecognitionPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [organisationName, setOrganisationName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.replace("/login?next=/donor-recognition");
      setChecking(false);
    });
  }, [router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true); setMessage(""); setError("");
    try {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { router.replace("/login?next=/donor-recognition"); return; }
      const { data, error: invokeError } = await supabase.functions.invoke("supporter-workflows", {
        body: { action: "save_donor_recognition", display_name: displayName, organisation_name: organisationName, website_url: websiteUrl, consent_to_public_display: consent },
      });
      if (invokeError) throw invokeError;
      if (data?.error) throw new Error(data.error);
      setMessage(data?.message || "Your preferences have been saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "We could not save your preferences.");
    } finally { setLoading(false); }
  }

  const field = "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100";
  if (checking) return <main className="min-h-screen bg-gray-50 p-10 text-center text-gray-600">Checking your account...</main>;

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-12 text-gray-900">
      <div className="mx-auto max-w-2xl">
        <header className="mb-10 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold">PaperFlow</Link>
          <Link href="/dashboard" className="text-sm font-medium text-blue-700 hover:underline">Dashboard</Link>
        </header>
        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">Your choice matters</p>
          <h1 className="mt-2 text-3xl font-bold">Donor recognition preferences</h1>
          <p className="mt-4 leading-7 text-gray-600">Choose whether you would like to be recognised publicly if you make a successful donation. You can keep your support private. Recognition does not unlock features or change access to any tool.</p>
          {message && <p role="status" className="mt-6 rounded-xl bg-green-50 p-4 text-sm text-green-800">{message}</p>}
          {error && <p role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
          <form onSubmit={submit} className="mt-8 space-y-5">
            <div><label htmlFor="displayName" className="mb-2 block text-sm font-semibold">Name to display (optional)</label><input id="displayName" maxLength={100} className={field} value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Your preferred public name" /></div>
            <div><label htmlFor="organisationName" className="mb-2 block text-sm font-semibold">Business or organisation (optional)</label><input id="organisationName" maxLength={120} className={field} value={organisationName} onChange={e => setOrganisationName(e.target.value)} placeholder="Organisation name" /></div>
            <div><label htmlFor="websiteUrl" className="mb-2 block text-sm font-semibold">Website (optional)</label><input id="websiteUrl" type="url" maxLength={300} className={field} value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} placeholder="https://example.com" /></div>
            <div className="rounded-2xl border border-gray-200 p-5">
              <label className="flex items-start gap-3 text-sm leading-6"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-1 h-4 w-4" /><span>I explicitly consent to the display of the name, organisation and website details I entered above on the public donor recognition page, if approved.</span></label>
              <p className="mt-3 text-xs leading-5 text-gray-500">Leave this unchecked to keep your recognition private. Public listing requires your consent, moderation approval and at least one successful donation made with public recognition selected at checkout.</p>
            </div>
            <button disabled={loading} className="w-full rounded-xl bg-blue-700 px-5 py-3.5 font-semibold text-white hover:bg-blue-800 disabled:opacity-60">{loading ? "Saving..." : "Save recognition preferences"}</button>
          </form>
          <p className="mt-6 text-xs leading-5 text-gray-500">This form records your preference; it does not collect a donation or activate a payment. You may change your preference later.</p>
        </section>
      </div>
    </main>
  );
}
