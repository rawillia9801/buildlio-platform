export const metadata = {
  title: "Contact • Buildlio",
  description: "Get in touch about Buildlio, templates, or partnerships.",
};

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur">
          <p className="text-xs font-semibold tracking-widest text-slate-300">
            GET IN TOUCH
          </p>

          <h1 className="mt-3 text-4xl font-semibold tracking-tight">Contact</h1>

          <p className="mt-5 max-w-3xl text-slate-300 leading-relaxed">
            This page is here so your deployed Buildlio app feels complete. Next
            step (after routes): we’ll wire a real contact form to Supabase (or
            email) and keep it spam-resistant.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-5">
              <h3 className="font-semibold">Email</h3>
              <p className="mt-2 text-sm text-slate-300">
                Add your support email here when you’re ready.
              </p>
              <p className="mt-2 text-sm text-slate-400">
                Example: support@buildlio.site
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-5">
              <h3 className="font-semibold">Hours</h3>
              <p className="mt-2 text-sm text-slate-300">
                Add a simple schedule (or “by appointment”) so it feels premium.
              </p>
              <p className="mt-2 text-sm text-slate-400">
                Example: Mon–Fri • 9a–5p
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
              Services
            </a>
            <a
              href="/about"
              className="inline-flex items-center justify-center rounded-xl bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/15"
            >
              About
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}