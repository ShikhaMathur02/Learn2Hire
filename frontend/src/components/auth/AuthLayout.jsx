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
    <div className="relative min-h-screen overflow-hidden bg-[var(--bg-app)] py-6 text-[var(--text)] sm:py-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-10 top-10 h-48 w-48 rounded-full bg-[rgba(37,99,235,0.12)] blur-3xl" />
        <div className="absolute bottom-0 right-10 h-64 w-64 rounded-full bg-[rgba(99,102,241,0.1)] blur-3xl" />
      </div>

      <div className="relative l2h-container flex min-h-[calc(100vh-3rem)] w-full items-start justify-center pt-6 sm:min-h-[calc(100vh-4rem)] sm:pt-10">
        <div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--bg-card)] shadow-[var(--surface-elevated)] lg:min-h-[560px] lg:grid-cols-2 lg:items-stretch">
          {/* Form column — solid white for contrast on dark page */}
          <div className="flex flex-col justify-center bg-white px-6 py-10 sm:px-10 sm:py-12 lg:rounded-l-[14px] lg:py-14">
            <div className={`mx-auto w-full ${formMaxWidthClass}`}>
              <div className="mb-8 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[var(--primary)] text-white shadow-md shadow-blue-600/25">
                  <Sparkles className="h-5 w-5" aria-hidden />
                </div>
                <div>
                  <p className="text-base font-semibold text-slate-900">Learn2Hire</p>
                  <p className="text-sm text-slate-600">Career &amp; campus platform</p>
                </div>
              </div>

              {badge ? (
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">
                  {badge}
                </p>
              ) : null}

              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-[1.75rem] sm:leading-snug">
                {title}
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-700">{subtitle}</p>

              <div className="mt-8">{children}</div>

              <div className="mt-8 border-t border-slate-100 pt-6 text-sm text-slate-700">
                {footer}
              </div>
            </div>
          </div>

          {/* Brand column — hidden on small screens */}
          <div className="relative hidden flex-col justify-between border-t border-[var(--border)] bg-gradient-to-br from-[#eef2ff] via-white to-[#f8fafc] text-[var(--text)] lg:flex lg:border-l lg:border-t-0 lg:rounded-r-[14px]">
            {hasSideImage ? (
              <div className="flex h-full flex-col p-8 sm:p-10">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-[var(--primary)]">
                    {panelEyebrow}
                  </p>
                  <h2 className="mt-4 text-xl font-semibold leading-snug text-slate-900 sm:text-2xl">
                    {panelHeading}
                  </h2>
                  <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-600">
                    {panelDescription}
                  </p>
                </div>

                <div className="my-8 overflow-hidden rounded-[10px] border border-[var(--border)] bg-slate-50 shadow-inner">
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
                      className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-900/25 via-transparent to-transparent"
                      aria-hidden
                    />
                  </div>
                </div>

                {extraParagraphs.length ? (
                  <div className="mb-6 max-w-sm space-y-2 text-sm leading-relaxed text-slate-600">
                    {extraParagraphs.map((para, idx) => (
                      <p key={idx}>{para}</p>
                    ))}
                  </div>
                ) : null}

                <ul className="mt-auto space-y-3">
                  {panelBullets.map((item) => (
                    <li
                      key={item}
                      className="flex gap-3 rounded-[10px] border border-[var(--border)] bg-white px-3 py-2.5 text-sm leading-snug text-slate-700 shadow-sm"
                    >
                      <CheckCircle2
                        className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]"
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
                  <p className="text-xs font-semibold uppercase tracking-widest text-[var(--primary)]">
                    Welcome
                  </p>
                  <h2 className="mt-4 text-xl font-semibold leading-snug text-slate-900 sm:text-2xl">
                    {panelHeading}
                  </h2>
                  <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-600">
                    {panelDescription}
                  </p>
                </div>
                <ul className="mt-12 space-y-3">
                  {defaultHighlights.map((item) => (
                    <li
                      key={item}
                      className="flex gap-3 rounded-[10px] border border-[var(--border)] bg-white px-3 py-2.5 text-sm leading-snug text-slate-700 shadow-sm"
                    >
                      <CheckCircle2
                        className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]"
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

