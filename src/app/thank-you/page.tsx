"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Donor = {
  recognition_id: string;
  display_name: string | null;
  organisation_name: string | null;
  website_url: string | null;
  logo_url: string | null;
};
type Sponsor = {
  sponsor_id: string;
  organisation_name: string;
  website_url: string | null;
  logo_url: string | null;
  placement_label: string | null;
  sort_order: number;
};

const FUNCTION_URL =
  "https://auqkmbngftihhxpcwoiu.supabase.co/functions/v1/supporter-workflows";

export default function ThankYouPage() {
  const [donors, setDonors] = useState<Donor[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadBoard() {
      try {
        const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
        if (!publishableKey) throw new Error("The supporter board is not configured yet.");
        const response = await fetch(FUNCTION_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: publishableKey },
          body: JSON.stringify({ action: "public_board" }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Could not load the supporter board.");
        if (active) {
          setDonors(Array.isArray(result.donors) ? result.donors : []);
          setSponsors(Array.isArray(result.sponsors) ? result.sponsors : []);
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Could not load the supporter board.");
      } finally {
        if (active) setLoading(false);
      }
    }
    loadBoard();
    return () => { active = false; };
  }, []);

  const hasSupporters = donors.length > 0 || sponsors.length > 0;

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-12 text-gray-900">
      <div className="mx-auto max-w-5xl">
        <header className="mb-12 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold tracking-tight text-gray-950">PaperFlow</Link>
          <Link href="/" className="text-sm font-medium text-blue-700 hover:underline">Back to home</Link>
        </header>

        <section className="mx-auto max-w-3xl text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-3xl text-blue-700" aria-hidden="true">♥</div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">A community-powered mission</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">Thank you for helping us make useful tools accessible.</h1>
          <p className="mt-5 text-lg leading-8 text-gray-600">
            Every voluntary contribution and every organisation that stands behind
            this mission helps us build and sustain free digital tools while working
            towards better educational opportunities for children in underserved communities.
          </p>
        </section>

        {loading && <p className="mt-16 text-center text-sm text-gray-500">Loading our community of supporters...</p>}
        {error && <p role="alert" className="mt-12 rounded-xl bg-red-50 p-4 text-center text-sm text-red-800">{error}</p>}

        {!loading && !error && (
          <>
            <section className="mt-16">
              <div className="mb-7 text-center">
                <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">Our partners</p>
                <h2 className="mt-2 text-3xl font-bold">Special Thanks to Our Sponsors</h2>
                <p className="mt-3 text-gray-600">Organisations whose sponsorship helps move the mission forward.</p>
              </div>
              {sponsors.length ? (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {sponsors.map((sponsor) => (
                    <article key={sponsor.sponsor_id} className="flex min-h-44 flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
                      {sponsor.logo_url && <img src={sponsor.logo_url} alt="" className="mb-4 max-h-16 max-w-40 object-contain" />}
                      <h3 className="font-semibold">{sponsor.organisation_name}</h3>
                      {sponsor.placement_label && <p className="mt-1 text-sm text-gray-500">{sponsor.placement_label}</p>}
                      {sponsor.website_url && <a href={sponsor.website_url} target="_blank" rel="noreferrer" className="mt-3 text-sm font-medium text-blue-700 hover:underline">Visit website</a>}
                    </article>
                  ))}
                </div>
              ) : (
                <p className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
                  Our sponsor board will appear here as organisations are approved.
                </p>
              )}
            </section>

            <section className="mt-16">
              <div className="mb-7 text-center">
                <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">Community support</p>
                <h2 className="mt-2 text-3xl font-bold">Thank You to Our Donors</h2>
                <p className="mt-3 text-gray-600">We are grateful to everyone who chooses to support this work.</p>
              </div>
              {donors.length ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {donors.map((donor) => (
                    <article key={donor.recognition_id} className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                      {donor.logo_url ? (
                        <img src={donor.logo_url} alt="" className="h-14 w-14 rounded-xl object-contain" />
                      ) : (
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xl font-bold text-blue-700">
                          {(donor.display_name || donor.organisation_name || "D").slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <h3 className="font-semibold">{donor.display_name || donor.organisation_name || "Community supporter"}</h3>
                        {donor.organisation_name && donor.display_name && <p className="text-sm text-gray-500">{donor.organisation_name}</p>}
                        {donor.website_url && <a href={donor.website_url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-sm text-blue-700 hover:underline">Website</a>}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
                  Donors who choose public recognition will be listed here after their donation and recognition have been verified and approved.
                </p>
              )}
            </section>

            {!hasSupporters && (
              <p className="mt-8 text-center text-xs text-gray-500">
                Public recognition is always optional. Private supporters are never listed.
              </p>
            )}
          </>
        )}

        <section className="mt-16 rounded-3xl bg-gray-900 px-6 py-10 text-center text-white sm:px-10">
          <h2 className="text-2xl font-bold">Want to help us keep these tools free?</h2>
          <p className="mx-auto mt-3 max-w-2xl leading-7 text-gray-300">
            Donations are voluntary. Every tool remains available to everyone,
            whether they donate or not.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/donate" className="rounded-xl bg-white px-6 py-3 font-semibold text-gray-900 hover:bg-gray-100">Support the project</Link>
            <Link href="/sponsor-application" className="rounded-xl border border-white/30 px-6 py-3 font-semibold text-white hover:bg-white/10">Become a sponsor</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
