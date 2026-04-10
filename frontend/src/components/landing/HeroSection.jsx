import { Link } from "react-router-dom";
import { Button } from "../ui/button";
import heroLandingImg from "../../assets/illustrations/hero-landing.png";

function HeroSection() {
  return (
    <section className="relative overflow-hidden pb-12 pt-28 text-white sm:pb-14 sm:pt-32">
      <img
        src={heroLandingImg}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-[linear-gradient(135deg,#4f46e5ee_0%,#7c3aedcc_50%,#1e1b4b_100%)]" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-8 px-5 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:gap-10">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium text-cyan-100 backdrop-blur">
            AI-Powered Placement Platform
          </span>
          <h1 className="mt-5 text-5xl font-extrabold leading-tight sm:text-6xl">
            Bridging the gap between Education &amp; Employment
          </h1>
          <p className="mt-6 text-lg text-white/85 sm:text-xl">
            An end-to-end platform connecting students, colleges, and
            recruiters with AI-powered learning, performance tracking, and
            placement solutions.
          </p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <Button asChild size="lg" variant="default" className="shadow-md">
              <Link to="/signup">Get Started Free</Link>
            </Button>
            <Button asChild size="lg" variant="default" className="shadow-md">
              <a href="#how-it-works">See How It Works</a>
            </Button>
          </div>
          <div className="mt-6 flex flex-wrap gap-4 text-sm text-white/70 sm:gap-6">
            <span>✓ Free for students</span>
            <span>✓ College & recruiter portal</span>
            <span>✓ Saved learning progress</span>
          </div>
        </div>

        <div className="relative hidden lg:flex lg:justify-end">
          <div className="overflow-hidden rounded-[28px] shadow-[0_40px_80px_rgba(0,0,0,0.4)] ring-1 ring-white/10">
            <img
              src={heroLandingImg}
              alt="Learn2Hire platform"
              className="w-full max-w-[480px] object-cover"
            />
            <div className="absolute inset-0 rounded-[28px] bg-gradient-to-t from-indigo-900/60 to-transparent" />
          </div>
        </div>
      </div>
    </section>
  );
}

export default HeroSection;
