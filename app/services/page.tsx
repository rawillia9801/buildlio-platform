export const metadata = {
  title: "Services • Buildlio",
  description:
    "What Buildlio generates out of the box: a clean website with a high-end layout system and curated designs.",
};

export default function ServicesPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur">
          <p className="text-xs font-semibold tracking-widest text-slate-300">
            WHAT YOU GET
          </p>

          <h1 className="mt-3 text-4xl font-semibold tracking-tight">
            Services & Features
          </h1>

          <p className="mt-5 max-w-3xl text-slate-300 leading-relaxed">
            Buildlio focuses on the pieces that actually matter: clean structure,
            great spacing, solid typography, and publish-ready pages — without
            letting users wreck the layout.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-5">
              <h3 className="font-semibold">Auto-generated pages</h3>
              <p className="mt-2 text-sm text-slate-300">
                Home, About, Services, Contact — generated instantly with a
                consistent layout system.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-5">
              <h3 className="font-semibold">Curated design systems</h3>
              <p className="mt-2 text-sm text-slate-300">
                High-end templates designed to look like professional agency work.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-5">
              <h3 className="font-semibold">Public preview links</h3>
              <p className="mt-2 text-sm text-slate-300">
                Preview without login, share a link, then publish when approved.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-5">
              <h3 className="font-semibold">Safe content editing</h3>
              <p className="mt-2 text-sm text-slate-300">
                Users edit content, images, and a few brand choices — not the
                core layout rules.
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
              href="/about"
              className="inline-flex items-center justify-center rounded-xl bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/15"
            >
              About
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