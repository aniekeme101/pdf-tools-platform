"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Donation = { status: string; amount_minor: number; currency: string; paid_at: string | null };
type DonorProfile = { email: string | null; donations?: Donation[] };
type DonorRow = {
  id: string; display_name: string | null; organisation_name: string | null; website_url: string | null;
  consent_to_public_display: boolean; review_status: string; rejection_reason: string | null;
  donors: DonorProfile | DonorProfile[] | null;
};
type SponsorRow = {
  id: string; organisation_name: string; legal_name: string | null; website_url: string | null;
  contact_name: string | null; contact_email: string | null; description: string | null;
  status: string; public_display_consent: boolean; rejection_reason: string | null;
};

export default function SupporterAdminPage() {
  const router = useRouter();
  const [donors, setDonors] = useState<DonorRow[]>([]);
  const [sponsors, setSponsors] = useState<SponsorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const invoke = useCallback(async (action: string, extra: Record<string, unknown> = {}) => {
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { router.replace("/login"); throw new Error("Please sign in again."); }
    const { data, error } = await supabase.functions.invoke("supporter-workflows", { body: { action, ...extra } });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  }, [router]);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [d, s] = await Promise.all([invoke("admin_list_donors"), invoke("admin_list_sponsors")]);
      setDonors(Array.isArray(d.data) ? d.data as DonorRow[] : []);
      setSponsors(Array.isArray(s.data) ? s.data as SponsorRow[] : []);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to load moderation queues."); }
    finally { setLoading(false); }
  }, [invoke]);

  useEffect(() => { void load(); }, [load]);

  async function act(key: string, action: string, payload: Record<string, unknown>) {
    setBusy(key); setError(""); setNotice("");
    try { const result = await invoke(action, payload); setNotice(result?.message || "Action completed."); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "The action could not be completed."); }
    finally { setBusy(""); }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 text-gray-900">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div><Link href="/" className="text-xl font-bold">PaperFlow</Link><p className="mt-1 text-sm text-gray-500">Administrator · Supporter moderation</p></div>
          <nav className="flex gap-4 text-sm"><Link href="/thank-you" className="text-blue-700 hover:underline">Public board</Link><Link href="/dashboard" className="text-blue-700 hover:underline">Dashboard</Link></nav>
        </header>
        <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">Restricted moderation area. Donor recognition and commercial sponsorship are separate processes. Approval never unlocks premium features or changes access to tools.</div>
        {notice && <p role="status" className="mb-5 rounded-xl bg-green-50 p-4 text-sm text-green-800">{notice}</p>}
        {error && <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
        {loading ? <p className="py-12 text-center text-gray-500">Loading moderation queues...</p> : (
          <div className="space-y-12">
            <section>
              <div className="mb-5"><p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Community supporters</p><h1 className="mt-1 text-2xl font-bold">Donor recognition requests</h1></div>
              {!donors.length ? <p className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">No donor recognition requests yet.</p> : <div className="grid gap-4 lg:grid-cols-2">
                {donors.map(row => {
                  const donor = Array.isArray(row.donors) ? row.donors[0] : row.donors;
                  const payments = donor?.donations || [];
                  const paid = payments.filter(p => p.status === "succeeded");
                  return <article key={row.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">{row.display_name || row.organisation_name || "Unnamed supporter"}</h2><p className="mt-1 text-xs text-gray-500">{donor?.email || "No email"}</p></div><span className="rounded-full bg-gray-100 px-3 py-1 text-xs">{row.review_status}</span></div>
                    {row.organisation_name && <p className="mt-2 text-sm">{row.organisation_name}</p>}
                    {row.website_url && <a href={row.website_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-blue-700 hover:underline">Website</a>}
                    <p className="mt-3 text-xs text-gray-600">Public consent: {row.consent_to_public_display ? "Yes" : "No"} · Successful donations: {paid.length}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button disabled={!!busy} onClick={() => act(row.id, "admin_review_donor", { recognition_id: row.id, status: "approved", publish: false })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50">Approve privately</button>
                      <button disabled={!!busy || !row.consent_to_public_display || !paid.length} onClick={() => act(row.id, "admin_review_donor", { recognition_id: row.id, status: "approved", publish: true })} className="rounded-lg bg-blue-700 px-3 py-2 text-sm text-white hover:bg-blue-800 disabled:opacity-40">Approve & publish</button>
                    </div>
                    <div className="mt-4 flex gap-2"><input aria-label="Donor rejection reason" value={reasons[row.id] || ""} onChange={e => setReasons(v => ({ ...v, [row.id]: e.target.value }))} placeholder="Reason if rejecting" className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm" /><button disabled={!!busy || (reasons[row.id] || "").trim().length < 3} onClick={() => act(row.id, "admin_review_donor", { recognition_id: row.id, status: "rejected", rejection_reason: reasons[row.id] })} className="rounded-lg border border-red-300 px-3 py-2 text-sm text-red-700 disabled:opacity-40">Reject</button></div>
                    {row.rejection_reason && <p className="mt-2 text-xs text-red-700">Previous reason: {row.rejection_reason}</p>}
                  </article>;
                })}
              </div>}
            </section>
            <section>
              <div className="mb-5"><p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Commercial / organisational partners</p><h2 className="mt-1 text-2xl font-bold">Sponsor applications</h2></div>
              {!sponsors.length ? <p className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">No sponsor applications yet.</p> : <div className="grid gap-4 lg:grid-cols-2">
                {sponsors.map(row => <article key={row.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{row.organisation_name}</h3><p className="mt-1 text-xs text-gray-500">{row.contact_name} · {row.contact_email}</p></div><span className="rounded-full bg-gray-100 px-3 py-1 text-xs">{row.status}</span></div>
                  {row.legal_name && <p className="mt-2 text-sm text-gray-600">Legal name: {row.legal_name}</p>}
                  {row.website_url && <a href={row.website_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-blue-700 hover:underline">Website</a>}
                  {row.description && <p className="mt-3 text-sm leading-6 text-gray-600">{row.description}</p>}
                  <p className="mt-3 text-xs text-gray-600">Public recognition consent: {row.public_display_consent ? "Yes" : "No"}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button disabled={!!busy} onClick={() => act(row.id, "admin_review_sponsor", { sponsor_id: row.id, status: "approved" })} className="rounded-lg bg-blue-700 px-3 py-2 text-sm text-white hover:bg-blue-800 disabled:opacity-50">Approve application</button>
                    <button disabled={!!busy} onClick={() => act(row.id, "admin_review_sponsor", { sponsor_id: row.id, status: "paused" })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50">Pause</button>
                    <button disabled={!!busy || (reasons[row.id] || "").trim().length < 3} onClick={() => act(row.id, "admin_review_sponsor", { sponsor_id: row.id, status: "rejected", rejection_reason: reasons[row.id] })} className="rounded-lg border border-red-300 px-3 py-2 text-sm text-red-700 disabled:opacity-40">Reject</button>
                  </div>
                  <input aria-label="Sponsor rejection reason" value={reasons[row.id] || ""} onChange={e => setReasons(v => ({ ...v, [row.id]: e.target.value }))} placeholder="Reason if rejecting" className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                  {row.rejection_reason && <p className="mt-2 text-xs text-red-700">Previous reason: {row.rejection_reason}</p>}
                </article>)}
              </div>}
            </section>
          </div>
        )}
        <div className="mt-10 flex justify-end"><button onClick={() => void load()} className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50">Refresh queues</button></div>
      </div>
    </main>
  );
}
