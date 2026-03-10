import { CheckCircle2, Sparkles } from "lucide-react";

const defaultHighlights = [
  "Track learning, assessments, and placements in one workspace.",
  "Get a polished dashboard experience with clear progress visibility.",
  "Keep your career prep organized from profile to applications.",
];

function AuthLayout({ badge, title, subtitle, footer, children }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,#312e81_0%,#0f172a_45%,#020617_100%)] px-4 py-10 text-slate-900 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-10 top-10 h-48 w-48 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="absolute bottom-0 right-10 h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[32px] border border-white/10 bg-white/5 shadow-[0_30px_80px_rgba(2,6,23,0.45)] backdrop-blur-xl lg:grid-cols-[1fr_0.92fr]">
          <div className="bg-white/95 p-6 sm:p-8 lg:p-12">
            <div className="mx-auto max-w-md">
              <div className="mb-8 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-slate-900">Learn2Hire</p>
                  <p className="text-sm text-slate-500">Career acceleration platform</p>
                </div>
              </div>

              {badge ? (
                <div className="mb-4 inline-flex items-center rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-700">
                  {badge}
                </div>
              ) : null}

              <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                {title}
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
                {subtitle}
              </p>

              <div className="mt-8">{children}</div>

              <div className="mt-6 text-sm text-slate-600">{footer}</div>
            </div>
          </div>

          <div className="hidden bg-[linear-gradient(160deg,rgba(79,70,229,0.92),rgba(14,116,144,0.88))] p-8 text-white lg:flex lg:flex-col lg:justify-between">
            <div>
              <div className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-medium tracking-wide text-white/90">
                Production-ready UI
              </div>
              <h2 className="mt-6 text-3xl font-bold leading-tight">
                A cleaner, faster way to manage hiring readiness.
              </h2>
              <p className="mt-4 max-w-md text-sm leading-7 text-white/85">
                Learn2Hire brings learning, assessment, and placement workflows
                together in one modern workspace for students and faculty.
              </p>
            </div>

            <div className="space-y-4">
              {defaultHighlights.map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-2xl bg-white/10 p-4">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-cyan-200" />
                  <p className="text-sm leading-6 text-white/90">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthLayout;
