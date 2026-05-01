import Link from "next/link";

export const metadata = { title: "Terms · JobHub" };

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight mb-2">
        Terms of Service
      </h1>
      <p className="text-sm opacity-60 mb-8">
        Last updated: {new Date().toLocaleDateString("en-US", { dateStyle: "long" })}
      </p>

      <div className="space-y-6 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-medium mb-2">What JobHub is</h2>
          <p className="opacity-80">
            JobHub is a personal job-search organizer. You add the career
            pages of companies you&apos;re interested in; we aggregate the
            postings from those companies&apos; public APIs and let you
            search, track, and apply.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium mb-2">Your account</h2>
          <p className="opacity-80">
            You&apos;re responsible for your password and any activity under
            your account. Don&apos;t share credentials. We&apos;ll never ask
            for your password by email or any other channel.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium mb-2">Acceptable use</h2>
          <p className="opacity-80">
            Don&apos;t abuse the service, attempt to disrupt it, scrape it
            beyond normal use, or use it to harass others. Don&apos;t add
            companies to circumvent any source&apos;s terms of service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium mb-2">Job content disclaimer</h2>
          <p className="opacity-80">
            Job postings are sourced from third parties and shown
            as-is. We don&apos;t endorse any employer or guarantee a posting
            is current, accurate, or legitimate. Always verify on the
            original posting (the &ldquo;Apply&rdquo; button takes you
            there).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium mb-2">No warranty</h2>
          <p className="opacity-80">
            JobHub is provided &ldquo;as is.&rdquo; To the maximum extent
            permitted by law, we disclaim all warranties — including fitness
            for a particular purpose, accuracy of search results, and
            uninterrupted availability.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium mb-2">Termination</h2>
          <p className="opacity-80">
            You can delete your account at any time. We reserve the right to
            suspend accounts that violate these terms or harm the service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium mb-2">Changes</h2>
          <p className="opacity-80">
            We may update these terms. Continued use after a change means you
            accept the updated terms.
          </p>
        </section>

        <p className="opacity-60 text-xs pt-4 border-t border-black/10 dark:border-white/10">
          This is a placeholder ToS template. If you charge users, have a
          lawyer customize it for your jurisdiction and add specifics on
          payment, cancellations, refunds, and dispute resolution.
        </p>
      </div>

      <div className="mt-8">
        <Link href="/" className="text-sm underline opacity-70">
          ← Back to home
        </Link>
      </div>
    </div>
  );
}
