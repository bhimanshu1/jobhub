import Link from "next/link";

export const metadata = { title: "Privacy · JobHub" };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 prose-zinc">
      <h1 className="text-3xl font-semibold tracking-tight mb-2">
        Privacy Policy
      </h1>
      <p className="text-sm opacity-60 mb-8">
        Last updated: {new Date().toLocaleDateString("en-US", { dateStyle: "long" })}
      </p>

      <div className="space-y-6 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-medium mb-2">What we collect</h2>
          <p className="opacity-80">
            JobHub stores only the minimum data needed to run your account:
            your username, hashed password, and the list of career pages you
            choose to track. We do not collect your real name, email, IP
            address, or browsing data outside this app.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium mb-2">Job data</h2>
          <p className="opacity-80">
            Job postings shown in JobHub are fetched from the public APIs of
            Applicant Tracking Systems (Greenhouse, Lever, Ashby) when you add
            a company. We cache them in our database so search and filtering
            are fast. We do not modify or claim ownership of this content.
            All &ldquo;Apply&rdquo; links go directly to the original posting.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium mb-2">AI features</h2>
          <p className="opacity-80">
            When you use AI search or AI summarization, your query (or the job
            description being summarized) is sent to a third-party LLM
            provider (currently Cerebras / Google Gemini, depending on
            configuration) for processing. We don&apos;t share your username
            or any account data with these providers.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium mb-2">Cookies</h2>
          <p className="opacity-80">
            We set one cookie (<code>jh_session</code>) to keep you signed in.
            It contains a random session token only — no personal data. The
            cookie is HTTP-only, SameSite=Lax, and marked Secure in
            production.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium mb-2">Your data, your control</h2>
          <p className="opacity-80">
            You can delete your account at any time, which permanently removes
            all of your data including tracked companies, jobs, and statuses.
            Email <em>(your-support-email@example.com)</em> to request deletion
            until self-serve account deletion is added.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium mb-2">Changes</h2>
          <p className="opacity-80">
            We&apos;ll update this page if anything material changes. Major
            changes will be announced in the app on next sign-in.
          </p>
        </section>

        <p className="opacity-60 text-xs pt-4 border-t border-black/10 dark:border-white/10">
          This is a placeholder policy intended for an early-stage product. If
          you charge users or operate in regulated regions (EU, California,
          etc.), have a lawyer review and finalize before launch.
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
