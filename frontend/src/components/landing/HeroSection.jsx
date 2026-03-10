import { Link } from "react-router-dom";
import { Button } from "../ui/button";

function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-[linear-gradient(135deg,#4f46e5_0%,#7c3aed_50%,#a855f7_100%)] px-5 pb-24 pt-40 text-white">
      <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-5xl font-extrabold leading-tight sm:text-6xl">
            Bridging the gap between Education &amp; Employment
          </h1>
          <p className="mt-6 text-lg text-white/90 sm:text-xl">
            An end-to-end platform connecting students, colleges, and
            recruiters with AI-powered learning, performance tracking, and
            placement solutions.
          </p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="hover:bg-slate-100 text-black"
            >
              <Link to="/signup">Get Started</Link>
            </Button>
            <Button asChild variant="secondary" size="lg" className="border border-white/60">
              <a href="#how-it-works">Learn More</a>
            </Button>
          </div>
        </div>

        <div className="relative hidden lg:block">
          <img
            src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1000&q=80"
            alt="Learn2Hire platform"
            className="rounded-l-2xl shadow-[-20px_20px_60px_rgba(0,0,0,0.2)]"
          />
        </div>
      </div>
    </section>
  );
}

export default HeroSection;
