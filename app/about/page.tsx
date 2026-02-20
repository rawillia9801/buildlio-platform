export const metadata = {
  title: "About • Buildlio",
  description:
    "Buildlio is a high-end, curated website builder that generates beautiful websites fast—without the usual mess.",
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur">
          <p className="text-xs font-semibold tracking-widest text-slate-300">
            CURATED • HIGH-END • FAST
          </p>

          <h1 className="mt-3 text-4xl font-semibold tracking-tight">
            About Buildlio
          </h1>

          <p className="mt-5 max-w-3xl text-slate-300 leading-relaxed">
            Buildlio is built for people who want results that look like they
            came from a real studio — not a “template dump.” You choose a
            curated design system, answer a few questions, and Buildlio
            generates a clean Home, About, Services, and Contact site you can
            preview instantly and publish when you’re ready.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-5">
              <h3 className="font-semibold">Curated designs</h3>
              <p className="mt-2 text-sm text-slate-300">
                Fewer choices, better results. Every template is designed to look
                premium.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-5">
              <h3 className="font-semibold">Preview without an account</h3>
              <p className="mt-2 text-sm text-slate-300">
                Share a clean preview link and get approval before you publish.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-5">
              <h3 className="font-semibold">Publish-ready pages</h3>
              <p className="mt-2 text-sm text-slate-300">
                Professional structure: navigation, sections, and spacing that
                stays consistent.
              </p>
            </div>
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <a
              href="/"
              className="inline-flex items-center justify-center rounded-xl bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/15"
            >
              Back to Home
            </a>
            <a
              href="/services"
              className="inline-flex items-center justify-center rounded-xl bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/15"
            >
              View Services
            </a>
            <a
              href="/contact"
              className="inline-flex items-center justify-center rounded-xl bg-sky-500/90 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
            >
              Contact
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}