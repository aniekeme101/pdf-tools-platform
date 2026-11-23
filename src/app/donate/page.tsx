import Link from "next/link";

const benefits = [
  { title: "A digital appreciation certificate", description: "A simple certificate acknowledging your voluntary support." },
  { title: "Optional public recognition", description: "Choose whether your name or organisation may appear on our supporter page. Private support remains private." },
  { title: "Project and impact updates", description: "Receive occasional updates about the tools being built and verified progress on the education-support mission." },
  { title: "A community of supporters", description: "Be part of a community helping keep practical digital tools accessible." },
];

export default function DonatePage() {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-12 text-gray-900">
      <div className="mx-auto max-w-4xl">
        <header className="mb-12 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold tracking-tight text-gray-950">PaperFlow</Link>
          <Link href="/" className="text-sm font-medium text-blue-700 hover:underline">Back to home</Link>
        </header>
        <section className="rounded-3xl border border-gray-200 bg-white p-7 shadow-sm sm:p-12">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">Voluntary support</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">Help us keep useful tools free.</h1>
          <p className="mt-6 text-lg leading-8 text-gray-600">Your voluntary contribution helps us maintain and improve free, practical digital tools. Our wider mission is to support better education and schooling conditions for children in underserved communities around the world.</p>
          <div className="mt-8 rounded-2xl bg-blue-50 p-5 text-sm leading-6 text-blue-950"><strong>Every tool remains free.</strong> Donating is entirely optional. You do not need to donate, register, or become a sponsor to use any PaperFlow feature. Donations never unlock premium features or give donors preferential access.</div>
          <h2 className="mt-12 text-2xl font-bold">How we appreciate supporters</h2>
          <p className="mt-3 leading-7 text-gray-600">These are recognition and communication benefits only, not paid features or financial returns.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">{benefits.map(benefit => <article key={benefit.title} className="rounded-2xl border border-gray-200 p-5"><h3 className="font-semibold">{benefit.title}</h3><p className="mt-2 text-sm leading-6 text-gray-600">{benefit.description}</p></article>)}</div>
          <h2 className="mt-12 text-2xl font-bold">Your privacy and choice</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-gray-600">
            <li>• You may donate without creating an account.</li>
            <li>• You can choose private or public recognition.</li>
            <li>• We will not publish your name, organisation, logo or website without your explicit consent and approval.</li>
            <li>• Donation amounts will not be displayed publicly by default.</li>
            <li>• Sponsors are handled separately from ordinary donors.</li>
          </ul>
          <div className="mt-8 rounded-2xl border border-gray-200 p-5">
            <h3 className="font-semibold">Set your donor recognition preference</h3>
            <p className="mt-2 text-sm leading-6 text-gray-600">Registered users can save a private or public recognition preference now. Public recognition remains subject to a successful donation and moderation approval.</p>
            <Link href="/donor-recognition" className="mt-4 inline-flex rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50">Manage recognition preferences</Link>
          </div>
          <div className="mt-10 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <h3 className="font-semibold text-amber-950">Donation checkout is being prepared</h3>
            <p className="mt-2 text-sm leading-6 text-amber-900">We are completing the secure payment setup before accepting online donations. Please check back soon. We will never ask you to send money to a personal account as a substitute for the official checkout.</p>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/thank-you" className="rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800">Meet our supporters</Link>
            <Link href="/sponsor-application" className="rounded-xl border border-gray-300 px-5 py-3 font-semibold text-gray-700 hover:bg-gray-50">Sponsor the project</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
