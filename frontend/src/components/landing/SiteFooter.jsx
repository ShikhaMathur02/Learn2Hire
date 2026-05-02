import { ArrowRight, ExternalLink, Mail, Phone, Shield, Star } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "../ui/button";
import {
  SITE_CONTACT_EMAIL,
  SITE_PHONE_DISPLAY,
  SITE_PHONE_TEL,
  SITE_SOCIAL_LINKS,
  mailtoLearn2hire,
} from "../../config/siteMarketing";

/** One style for internal anchors, tel, mailto, and outbound social — visually consistent */
const footerLinkClass =
  "flex min-h-[40px] items-center gap-2.5 rounded-lg px-2.5 text-sm leading-snug text-slate-600 transition-colors hover:bg-slate-50 hover:text-[var(--primary)]";

const footerLinkLeadClass =
  "flex h-4 w-4 shrink-0 items-center justify-center text-[var(--primary)] [&>svg]:h-4 [&>svg]:w-4";

const footerMutedClass = "block px-2.5 text-xs uppercase tracking-wide text-slate-500";

/** Same gutter as footer links (`px-2.5`) so titles line up with list rows */
const footerColHeading =
  "px-2.5 text-sm font-semibold tracking-tight text-[var(--text)] leading-snug";

/** Marketing link grid sits on one elevated surface instead of separate mismatched mini-cards */
const footerBandClass =
  "rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)] sm:px-6 sm:py-7";

/** Link column blocks inside the footer band — vertical rules only between groups on xl */
const footerInnerColClass =
  "flex min-h-0 min-w-0 flex-col xl:border-r xl:border-slate-100 xl:pr-6 last:xl:border-r-0 last:xl:pr-0";

function SiteFooter({ variant = "full" }) {
  const currentYear = new Date().getFullYear();

  const reachUsLinks = (
    <ul className="mt-3 flex flex-col gap-px">
      <li>
        <span className={footerMutedClass}>Phone</span>
        <a href={`tel:${SITE_PHONE_TEL}`} className={footerLinkClass}>
          <span className={footerLinkLeadClass}>
            <Phone aria-hidden />
          </span>
          <span className="min-w-0 break-words">{SITE_PHONE_DISPLAY}</span>
        </a>
      </li>
      <li className="pt-2">
        <span className={footerMutedClass}>Email</span>
        <a href={mailtoLearn2hire("Learn2Hire inquiry")} className={footerLinkClass}>
          <span className={footerLinkLeadClass}>
            <Mail aria-hidden />
          </span>
          <span className="min-w-0 break-words leading-snug">{SITE_CONTACT_EMAIL}</span>
        </a>
      </li>
    </ul>
  );

  if (variant === "simple") {
    return (
      <footer
        className="border-t border-[var(--border)] bg-[var(--bg-card)]"
        aria-label="Site footer"
      >
        <div className="l2h-container py-8 text-center text-sm text-slate-600 sm:text-left">
          <p>
            © {currentYear}{" "}
            <Link to="/" className="font-semibold text-slate-800 hover:text-[var(--primary)]">
              Learn2Hire
            </Link>
            . All rights reserved.
          </p>
          <div className={`${footerBandClass} mt-5 max-w-md`}>
            <p className={footerColHeading}>Reach us</p>
            <div className="mt-3 space-y-1">
              <a href={`tel:${SITE_PHONE_TEL}`} className={footerLinkClass}>
                <span className={footerLinkLeadClass}>
                  <Phone aria-hidden />
                </span>
                {SITE_PHONE_DISPLAY}
              </a>
              <a
                href={mailtoLearn2hire("Learn2Hire inquiry")}
                className={footerLinkClass}
              >
                <span className={footerLinkLeadClass}>
                  <Mail aria-hidden />
                </span>
                <span className="break-words leading-snug">{SITE_CONTACT_EMAIL}</span>
              </a>
            </div>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer id="learn2hire-footer" className="relative overflow-hidden" aria-label="Marketing footer">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[var(--bg-app)] opacity-95"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-[20%] top-[-20%] h-[520px] w-[520px] rounded-full bg-[rgba(147,51,234,0.08)] blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-[10%] top-[35%] h-[460px] w-[460px] rounded-full bg-[rgba(59,130,246,0.12)] blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-[30%] h-[340px] w-[340px] rounded-full bg-[rgba(16,185,129,0.06)] blur-3xl"
      />

      <div className="relative l2h-container pb-12 pt-10 sm:pb-14 sm:pt-12 lg:pb-16">
        <div className="mx-auto mb-10 max-w-4xl px-4 sm:mb-12 sm:px-0">
          <div className="rounded-[26px] border border-[var(--border)] bg-[var(--bg-card)] px-6 py-9 text-center shadow-[0_20px_50px_-20px_rgba(15,23,42,0.12)] sm:rounded-[28px] sm:px-10 sm:py-10">
            <div className="relative mx-auto mb-5 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#172554] text-[#dbeafe] shadow-lg shadow-slate-900/15 ring-4 ring-[rgba(37,99,235,0.12)]">
              <Shield className="relative h-[2.875rem] w-[2.875rem]" strokeWidth={1.45} aria-hidden />
              <Star
                className="pointer-events-none absolute left-1/2 top-[53%] h-[1.125rem] w-[1.125rem] -translate-x-1/2 -translate-y-1/2 fill-amber-200 text-amber-100 shadow-sm"
                strokeWidth={0}
                aria-hidden
              />
              <span className="sr-only">Learn2Hire mark</span>
            </div>
            <h2 className="text-[1.625rem] font-bold leading-snug tracking-tight text-[var(--text)] sm:text-3xl md:text-[2rem]">
              Start learning and hiring smarter today
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
              Bring learning, assessments, and placements onto one runway—for students ready to work,
              campuses shaping outcomes, and employers hiring with confidence.
            </p>
            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <Button asChild variant="primary" size="lg" className="rounded-full px-8 text-[15px] shadow-md">
                <Link to="/signup" className="inline-flex items-center gap-2">
                  Get started free
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </Button>
              <Button asChild variant="soft" size="lg" className="rounded-full px-6">
                <a href="#learn2hire-footer-contact">Phone &amp; email</a>
              </Button>
            </div>
          </div>
        </div>

        <div className={footerBandClass}>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-x-10">
            <div
              id="learn2hire-footer-contact"
              className="scroll-mt-28 lg:col-span-3 xl:border-r xl:border-slate-100 xl:pr-8"
            >
              <p className={footerColHeading}>Reach us</p>
              {reachUsLinks}
            </div>

            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:col-span-9 lg:grid-cols-4 lg:gap-y-10">
              <div className={footerInnerColClass}>
                <p className={footerColHeading}>Navigate</p>
                <ul className="mt-3 flex flex-col gap-px">
                  <li>
                    <a href="#features" className={footerLinkClass}>
                      Features
                    </a>
                  </li>
                  <li>
                    <a href="#roles" className={footerLinkClass}>
                      For every role
                    </a>
                  </li>
                  <li>
                    <a href="#how-it-works" className={footerLinkClass}>
                      How it works
                    </a>
                  </li>
                  <li>
                    <a href="#testimonials" className={footerLinkClass}>
                      Testimonials
                    </a>
                  </li>
                </ul>
              </div>

              <div className={footerInnerColClass}>
                <p className={footerColHeading}>Platform</p>
                <ul className="mt-3 flex flex-col gap-px">
                  <li>
                    <Link to="/login" className={footerLinkClass}>
                      Sign in
                    </Link>
                  </li>
                  <li>
                    <Link to="/signup" className={footerLinkClass}>
                      Register
                    </Link>
                  </li>
                  <li>
                    <Link to="/learning" className={footerLinkClass}>
                      Browse subjects
                    </Link>
                  </li>
                  <li>
                    <a href="#help" className={footerLinkClass}>
                      Help centre
                    </a>
                  </li>
                </ul>
              </div>

              <div className={footerInnerColClass}>
                <p className={footerColHeading}>Company</p>
                <ul className="mt-3 flex flex-col gap-px">
                  <li>
                    <a href="#about" className={footerLinkClass}>
                      About Learn2Hire
                    </a>
                  </li>
                  <li>
                    <a href="#how-it-works" className={footerLinkClass}>
                      How placements flow
                    </a>
                  </li>
                  <li>
                    <Link to="/forgot-password" className={footerLinkClass}>
                      Account recovery
                    </Link>
                  </li>
                </ul>
              </div>

              <div className={footerInnerColClass}>
                <p className={footerColHeading}>Follow us</p>
                <ul className="mt-3 flex flex-col gap-px">
                  {SITE_SOCIAL_LINKS.map(({ key, label, href, Icon }) => (
                    <li key={key}>
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={footerLinkClass}
                      >
                        <span className={footerLinkLeadClass}>
                          <Icon aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">{label}</span>
                        <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-45" aria-hidden />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-[var(--border)] pt-7 sm:mt-12 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:pt-8 lg:mt-14">
          <p className="text-xs leading-relaxed text-slate-500 sm:text-sm">
            © {currentYear} Learn2Hire. All rights reserved.
          </p>
          <nav
            aria-label="Legal"
            className="flex flex-wrap items-center gap-5 text-xs text-slate-500 sm:justify-end sm:text-sm"
          >
            <a
              href="#privacy"
              className="text-xs text-slate-500 underline-offset-2 transition-colors hover:text-[var(--primary)] sm:text-sm"
            >
              Privacy &amp; Policy
            </a>
            <a
              href="#terms"
              className="text-xs text-slate-500 underline-offset-2 transition-colors hover:text-[var(--primary)] sm:text-sm"
            >
              Terms &amp; Conditions
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}

export default SiteFooter;
