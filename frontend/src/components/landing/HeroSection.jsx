import { Link } from "react-router-dom";
import { Rocket } from "lucide-react";

import { Button } from "../ui/button";
import heroLandingImg from "../../assets/illustrations/hero-landing.png";

function HeroSection() {
  return (
    <section className="relative isolate overflow-hidden border-b border-[var(--border)] bg-[var(--bg-app)] pb-14 pt-24 sm:pb-16 sm:pt-28 lg:pb-20 lg:pt-32">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -right-[12%] -top-[30%] h-[min(28rem,80vw)] w-[min(28rem,80vw)] rounded-full bg-[rgba(59,130,246,0.12)] blur-3xl" />
        <div className="absolute -bottom-[35%] -left-[8%] h-[22rem] w-[22rem] rounded-full bg-[rgba(16,185,129,0.08)] blur-3xl" />
      </div>

      <div className="relative l2h-container grid w-full items-center gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-14">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-4 py-1.5 text-xs font-semibold text-[var(--primary)] shadow-sm sm:text-sm">
            <Rocket className="h-4 w-4" aria-hidden />
            Learn. Build. Get Hired.
          </span>
          <h1 className="mt-5 text-[1.75rem] font-extrabold leading-[1.12] tracking-tight text-[var(--text)] sm:text-4xl lg:text-[2.75rem]">
            Bridging the gap between education &amp; employment
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-[15px] leading-relaxed text-slate-600 sm:mx-0 sm:max-w-none sm:text-lg">
            Learning paths, credible assessments, and hiring workflows in one cohesive workspace—for
            students, campuses, and employers.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:gap-4">
            <Button asChild size="lg" variant="primary" className="min-h-11 px-8 shadow-md">
              <Link to="/signup">Get started free</Link>
            </Button>
            <Button asChild size="lg" variant="soft" className="min-h-11 px-8">
              <a href="#how-it-works">See how it works</a>
            </Button>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
            <span className="inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
              Free for students
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)]" aria-hidden />
              Campus &amp; recruiter portals
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-500" aria-hidden />
              Progress that travels with learners
            </span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-lg lg:mr-0 lg:max-w-none">
          <div className="l2h-surface-card overflow-hidden rounded-[14px]">
            <img
              src={heroLandingImg}
              alt="Learn2Hire platform preview"
              className="aspect-[16/11] w-full object-cover lg:aspect-[16/10]"
              loading="eager"
            />
          </div>
          <p className="mt-4 text-center text-xs text-slate-500 lg:text-left">
            Calm dashboards, sharper signals — built for placements at scale.
          </p>
        </div>
      </div>
    </section>
  );
}

export default HeroSection;
