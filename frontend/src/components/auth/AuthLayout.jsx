import { CheckCircle2, Sparkles } from "lucide-react";

const defaultHighlights = [
  "Learning, assessments, and placements in one place.",
  "Clear progress from profile to applications.",
  "Built for students, faculty, and campus teams.",
];

function AuthLayout({
  badge,
  title,
  subtitle,
  footer,
  children,
  sidePanelImage,
  sidePanelImageAlt = "",
  sidePanelEyebrow,
  sidePanelHeading,
  sidePanelDescription,
  formMaxWidthClass = "max-w-md",
  sidePanelBullets,
  sidePanelExtraParagraphs,
}) {
  const hasSideImage = Boolean(sidePanelImage);
  const panelBullets =
    Array.isArray(sidePanelBullets) && sidePanelBullets.length > 0
      ? sidePanelBullets
      : defaultHighlights;
  const extraParagraphs = Array.isArray(sidePanelExtraParagraphs)
    ? sidePanelExtraParagraphs.filter((p) => typeof p === "string" && p.trim())
    : [];
  const panelEyebrow = sidePanelEyebrow ?? "Learn2Hire";
  const panelHeading =
    sidePanelHeading ?? "Everything you need for campus hiring readiness.";
  const panelDescription =
    sidePanelDescription ??
    "One workspace for study materials, assessments, and placement workflows.";

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,#312e81_0%,#0f172a_45%,#020617_100%)] px-4 py-6 text-slate-900 sm:px-6 sm:py-8 lg:px-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-10 top-10 h-48 w-48 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="absolute bottom-0 right-10 h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl items-start justify-center pt-6 sm:pt-10">
        <div className="grid w-full overflow-hidden rounded-[28px] border border-white/15 bg-white shadow-[0_28px_70px_rgba(2,6,23,0.55)] lg:min-h-[560px] lg:grid-cols-2 lg:items-stretch">
          {/* Form column — solid white for contrast on dark page */}
          <div className="flex flex-col justify-center bg-white px-6 py-10 sm:px-10 sm:py-12 lg:rounded-l-[28px] lg:py-14">
            <div className={`mx-auto w-full ${formMaxWidthClass}`}>
              <div className="mb-8 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
                  <Sparkles className="h-5 w-5" aria-hidden />
                </div>
                <div>
                  <p className="text-base font-semibold text-slate-900">Learn2Hire</p>
                  <p className="text-sm text-slate-500">Career &amp; campus platform</p>
                </div>
              </div>

              {badge ? (
                <p className="mb-3 text-xs font-medium uppercase tracking-wider text-indigo-600">
                  {badge}
                </p>
              ) : null}

              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-[1.75rem] sm:leading-snug">
                {title}
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">{subtitle}</p>

              <div className="mt-8">{children}</div>

              <div className="mt-8 border-t border-slate-100 pt-6 text-sm text-slate-600">
                {footer}
              </div>
            </div>
          </div>

          {/* Brand column — hidden on small screens */}
          <div className="relative hidden flex-col justify-between border-t border-white/10 bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 text-white lg:flex lg:border-l lg:border-t-0 lg:rounded-r-[28px]">
            {hasSideImage ? (
              <div className="flex h-full flex-col p-8 sm:p-10">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-cyan-100/80">
                    {panelEyebrow}
                  </p>
                  <h2 className="mt-4 text-xl font-semibold leading-snug text-white sm:text-2xl">
                    {panelHeading}
                  </h2>
                  <p className="mt-3 max-w-sm text-sm leading-relaxed text-indigo-100/90">
                    {panelDescription}
                  </p>
                </div>

                <div className="my-8 overflow-hidden rounded-2xl border border-white/20 bg-slate-900/40 shadow-[0_16px_40px_rgba(0,0,0,0.35)] ring-1 ring-white/10">
                  <div className="relative aspect-[16/10] w-full sm:aspect-[5/3]">
                    <img
                      src={sidePanelImage}
                      alt={sidePanelImageAlt}
                      width={800}
                      height={480}
                      decoding="async"
                      className="absolute inset-0 h-full w-full object-cover"
                      style={{ objectPosition: "center 25%" }}
                    />
                    <div
                      className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/50 via-transparent to-white/5"
                      aria-hidden
                    />
                  </div>
                </div>

                {extraParagraphs.length ? (
                  <div className="mb-6 max-w-sm space-y-2 text-sm leading-relaxed text-indigo-100/85">
                    {extraParagraphs.map((para, idx) => (
                      <p key={idx}>{para}</p>
                    ))}
                  </div>
                ) : null}

                <ul className="mt-auto space-y-3">
                  {panelBullets.map((item) => (
                    <li
                      key={item}
                      className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-sm leading-snug text-white/95 backdrop-blur-sm"
                    >
                      <CheckCircle2
                        className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200"
                        aria-hidden
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="flex h-full flex-col justify-between p-8 sm:p-10">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-indigo-200/90">
                    Welcome
                  </p>
                  <h2 className="mt-4 text-xl font-semibold leading-snug text-white sm:text-2xl">
                    {panelHeading}
                  </h2>
                  <p className="mt-3 max-w-sm text-sm leading-relaxed text-indigo-100/90">
                    {panelDescription}
                  </p>
                </div>
                <ul className="mt-12 space-y-3">
                  {defaultHighlights.map((item) => (
                    <li
                      key={item}
                      className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-sm leading-snug text-white/95 backdrop-blur-sm"
                    >
                      <CheckCircle2
                        className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200"
                        aria-hidden
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthLayout;
