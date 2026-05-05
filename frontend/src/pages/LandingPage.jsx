import {
  ArrowRight,
  BookOpen,
  Bot,
  Briefcase,
  CheckCircle2,
  Cog,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  PieChart,
  School,
  Star,
  TrendingUp,
  RefreshCcw,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

import { readApiResponse } from "../lib/api";
import HeroSection from "../components/landing/HeroSection";
import SectionHeading from "../components/landing/SectionHeading";
import SiteHeader from "../components/landing/SiteHeader";
import SiteFooter from "../components/landing/SiteFooter";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import {
  SITE_ADDRESS_LINES,
  SITE_CONTACT_EMAIL,
  SITE_PHONE_DISPLAY,
  SITE_PHONE_TEL,
  mailtoLearn2hire as mailto,
} from "../config/siteMarketing";

import aboutDashboardImg from "../assets/illustrations/hero-dashboard.png";
import aboutLearningImg from "../assets/illustrations/hero-learning.png";
import aboutProgressImg from "../assets/illustrations/progress-banner.png";

const helpTopics = [
  {
    title: "Accounts & sign-in",
    body:
      "Register with a valid email and strong password. Pick the role that fits you—student, faculty, college, company, or admin flows may differ: some accounts need campus or platform approval before full access. If you are locked out, use Forgot password on the login page or write to us with your registered email.",
  },
  {
    title: "Learning & assessments",
    body:
      "Browse the public learning hub for materials by subject; signed-in students track progress and can take assessments their faculty or college assigns. Keep your profile and class details up to date so recommendations and cohort visibility stay accurate.",
  },
  {
    title: "Campuses, rosters & jobs",
    body:
      "College and approved faculty accounts can manage rosters, imports, and pending approvals. Companies post roles and manage applications according to visibility rules on the platform. If something looks wrong with a cohort or posting, contact your campus admin or email us with a short description and screenshots if possible.",
  },
  {
    title: "Still need help?",
    body:
      "For demos or partnerships, use the email shown in Contact on this page. For lockouts and credentials, email from your registered address so we verify you safely. Messages on Instagram, Facebook, or X may get slower replies—email is best for account issues.",
  },
];

const features = [
  {
    title: "Comprehensive Learning",
    description:
      "Access to core CS subjects, aptitude training, coding challenges, and soft skills development.",
    icon: BookOpen,
  },
  {
    title: "Dynamic Scorecards",
    description:
      "Real-time performance tracking with personalized feedback and improvement recommendations.",
    icon: TrendingUp,
  },
  {
    title: "AI-Powered Matching",
    description:
      "Intelligent algorithms match students with suitable opportunities based on skills and preferences.",
    icon: Bot,
  },
  {
    title: "Automated Workflows",
    description:
      "Streamlined processes for job applications, shortlisting, interview scheduling, and placements.",
    icon: Cog,
  },
  {
    title: "Advanced Analytics",
    description:
      "Detailed insights and reports for students, colleges, and companies to track progress and outcomes.",
    icon: PieChart,
  },
  {
    title: "Continuous Improvement",
    description:
      "Feedback loops and remedial support to help students continuously improve their skills.",
    icon: RefreshCcw,
  },
];

const roles = [
  {
    title: "Students",
    icon: GraduationCap,
    gradient: "from-emerald-500 to-teal-600",
    buttonClass:
      "border-2 border-emerald-500 bg-white !text-emerald-600 shadow-sm hover:bg-emerald-500 hover:!text-white hover:border-emerald-500",
    buttonLabel: "Student Portal",
    to: "/signup",
    items: [
      "Personalized learning paths",
      "Skill assessment & feedback",
      "Job matching & applications",
      "Performance tracking",
    ],
  },
  {
    title: "Colleges",
    icon: School,
    gradient: "from-slate-500 to-slate-700",
    buttonClass:
      "border-2 border-slate-500 bg-white !text-slate-700 shadow-sm hover:bg-slate-600 hover:!text-white hover:border-slate-600",
    buttonLabel: "College Portal",
    to: "/signup",
    items: [
      "Student performance monitoring",
      "Remedial program planning",
      "Placement coordination",
      "Analytics & reporting",
    ],
  },
  {
    title: "Companies",
    icon: Briefcase,
    gradient: "from-[#2563EB] to-cyan-500",
    buttonClass:
      "border-2 border-[var(--primary)] bg-white !text-[var(--primary)] shadow-sm hover:bg-[var(--primary)] hover:!text-white hover:border-[var(--primary)]",
    buttonLabel: "Recruiter Portal",
    to: "/signup",
    items: [
      "Candidate shortlisting",
      "Skill reports & analytics",
      "Interview scheduling",
      "Talent pipeline management",
    ],
  },
];

const steps = [
  {
    title: "Student Onboarding",
    description:
      "Students complete profiles with skills, interests, and career goals to create a comprehensive digital portfolio.",
    detail:
      "Many learners join through campus roster or bulk import with a preset class (course, branch, year). Self-service signups attach to a selected college and may wait for campus approval before using the full platform.",
  },
  {
    title: "Skill Development",
    description:
      "Access learning materials, practice tests, and coding challenges tailored to individual skill levels and goals.",
    detail:
      "Materials are organized by subject and audience; progress saves to your account so you can resume anytime. Faculty and colleges can align content with syllabus or placement calendar.",
  },
  {
    title: "Performance Tracking",
    description:
      "Colleges monitor student progress, identify areas for improvement, and provide targeted support.",
    detail:
      "Dashboards and reports highlight cohort trends, assessment outcomes, and gaps—so coordinators can schedule remedial sessions or extra drills where they matter most.",
  },
  {
    title: "Job Matching",
    description:
      "Companies post opportunities and AI matches eligible candidates based on skills, preferences, and culture fit.",
    detail:
      "Roles can be scoped by program, year, or campus partnerships. Students see positions they are eligible for; recruiters get structured applicant pipelines instead of scattered spreadsheets.",
  },
  {
    title: "Placement Process",
    description:
      "Streamlined interview scheduling, selection, and hiring with automated workflows and communication.",
    detail:
      "Notifications and status updates keep students, colleges, and employers aligned—from application and shortlist through final selection—reducing manual follow-ups.",
  },
  {
    title: "Analytics & Feedback",
    description:
      "Continuous improvement loop with detailed reports and insights for all stakeholders.",
    detail:
      "Leaders review placement funnel health, skill benchmarks over time, and engagement with learning content to refine programs each term or hiring cycle.",
  },
];

/** Shown if the API is unreachable; replace by saved stories once MongoDB is seeded. */
const FALLBACK_LANDING_TESTIMONIALS = [
  {
    name: "Rahul Sharma",
    role: "Computer Science Student",
    image:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
    text:
      "Learn2Hire helped me identify my weak areas and provided targeted practice material. The personalized feedback was invaluable in my preparation.",
  },
  {
    name: "Dr. Priya Patel",
    role: "Placement Officer",
    image:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80",
    text:
      "The analytics dashboard gives us real-time insights into student performance, allowing us to plan targeted interventions and improve placement outcomes.",
  },
  {
    name: "Gupta jee",
    role: "HR Manager",
    image:
      "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=200&q=80",
    text:
      "The automated shortlisting saves us countless hours. The detailed skill reports help us make better hiring decisions with confidence.",
  },
];

function testimonialInitials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function LandingPage() {
  const [landingTestimonials, setLandingTestimonials] = useState(FALLBACK_LANDING_TESTIMONIALS);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/landing/testimonials");
        const data = await readApiResponse(res);
        if (cancelled || !res.ok || !data?.success || !Array.isArray(data.data)) return;
        if (data.data.length > 0) setLandingTestimonials(data.data);
      } catch {
        /* offline API: keep fallback */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text)]">
      <SiteHeader />
      <main>
        <HeroSection />

        <section
          id="features"
          className="scroll-mt-28 py-12 sm:py-14"
        >
          <div className="l2h-container">
          <SectionHeading
            title="Everything you need to succeed"
            description="Learn2Hire provides comprehensive tools and features for all stakeholders in the placement ecosystem"
          />

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={feature.title}
                  className="transition-transform duration-300 hover:-translate-y-1"
                >
                  <CardContent>
                    <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-[10px] bg-blue-500/10 text-[var(--primary)]">
                      <Icon className="h-7 w-7" />
                    </div>
                    <h3 className="text-2xl font-semibold text-slate-900">{feature.title}</h3>
                    <p className="mt-3 text-slate-700">{feature.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          </div>
        </section>

        <section
          id="roles"
          className="scroll-mt-28 bg-slate-100 py-12 sm:py-14"
        >
          <div className="l2h-container">
          <SectionHeading
            title="Tailored solutions for every role"
            description="Learn2Hire provides customized experiences for each stakeholder in the placement process"
          />

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {roles.map((role) => {
              const Icon = role.icon;
              const anchorId =
                role.title === "Students"
                  ? "solution-students"
                  : role.title === "Colleges"
                    ? "solution-colleges"
                    : "solution-companies";
              return (
                <Card key={role.title} id={anchorId} className="scroll-mt-28 overflow-hidden border-0">
                  <div className={`bg-gradient-to-br ${role.gradient} p-8 text-center text-white`}>
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/15">
                      <Icon className="h-8 w-8" />
                    </div>
                    <h3 className="text-3xl font-bold">{role.title}</h3>
                  </div>
                  <CardContent className="space-y-4">
                    {role.items.map((item) => (
                      <div key={item} className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-[var(--primary)]" />
                        <p>{item}</p>
                      </div>
                    ))}
                    <Button
                      asChild
                      variant="custom"
                      className={`mt-4 w-full justify-center shadow-sm ${role.buttonClass}`}
                    >
                      <Link to={role.to}>{role.buttonLabel}</Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          </div>
        </section>

        <section
          id="how-it-works"
          className="scroll-mt-28 py-12 sm:py-14"
        >
          <div className="l2h-container">
          <SectionHeading
            title="How Learn2Hire Works"
            description="From first login to placement outcomes, this is the typical journey on the platform. Your college or company may enable specific steps first (for example roster import or job posts), but the flow below shows how learning, visibility, and hiring stay connected end to end."
          />

          <div className="space-y-6">
            {steps.map((step, index) => (
              <div
                key={step.title}
                className="flex flex-col gap-5 sm:flex-row sm:items-start"
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-lg font-bold text-white">
                  {index + 1}
                </div>
                <div>
                  <h3 className="text-2xl font-semibold text-slate-900">{step.title}</h3>
                  <p className="mt-2 text-slate-700">{step.description}</p>
                  {step.detail ? (
                    <p className="mt-3 text-base leading-relaxed text-slate-600">{step.detail}</p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
          </div>
        </section>

        <section
          id="testimonials"
          className="scroll-mt-28 bg-slate-100 py-12 sm:py-14"
        >
          <div className="l2h-container">
          <SectionHeading
            title="What our users say"
            description="Short quotes from students, campuses, and employers using the platform."
          />

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {landingTestimonials.map((testimonial) => (
              <Card key={testimonial._id || `${testimonial.name}-${testimonial.role}`}>
                <CardContent>
                  <div className="mb-5 flex items-center gap-4">
                    {testimonial.image ? (
                      <img
                        src={testimonial.image}
                        alt=""
                        className="h-16 w-16 rounded-full object-cover"
                      />
                    ) : (
                      <div
                        className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-600"
                        aria-hidden
                      >
                        {testimonialInitials(testimonial.name)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h4 className="text-lg font-semibold text-slate-900">{testimonial.name}</h4>
                      <p className="text-slate-600">{testimonial.role}</p>
                    </div>
                  </div>
                  <p className="italic text-slate-700">"{testimonial.text}"</p>
                  <div className="mt-5 flex gap-1 text-amber-500">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <Star key={idx} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          </div>
        </section>

        <section
          id="about"
          className="scroll-mt-28 border-t border-[var(--border)] bg-gradient-to-b from-white via-[#f8fafc] to-[#eef2ff]/60 py-16 sm:py-20"
        >
          <div className="l2h-container">
            <div className="w-full text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--primary)] shadow-sm">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                About Learn2Hire
              </span>
              <h2 className="mx-auto mt-5 max-w-6xl text-3xl font-bold leading-tight tracking-tight text-[var(--text)] sm:text-[2.125rem] md:text-[2.35rem]">
                From syllabus energy to recruiter-ready signal—without the handoff chaos.
              </h2>
              <p className="mx-auto mt-4 max-w-6xl text-pretty text-base leading-relaxed text-slate-600 sm:text-lg">
                Learn2Hire is the placement cockpit for ambitious campuses in India: one calm surface
                where students practise, coordinators see cohort truth, and employers trust what they
                see—because assessment, learning trails, and applications share the same story.
              </p>
            </div>

            <div className="mt-14 grid w-full items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-14">
              <div className="order-2 min-w-0 space-y-7 lg:order-1">
                <div className="space-y-4 text-[15px] leading-relaxed text-slate-700 sm:text-[17px] sm:leading-8">
                  <p className="text-slate-800">
                    <strong className="font-semibold text-slate-900">Our promise:</strong> replace
                    scattered spreadsheets with a cohesive runway—from first login to shortlisted
                    shortlists—without dumbing things down for any role.
                  </p>
                  <p>
                    Students get structured materials plus honest feedback loops. Colleges steer
                    rosters and approvals without losing oversight. Employers stop guessing and start
                    shortlisting candidates whose skills actually match role rubrics—all while your
                    brand voice stays unmistakably yours.
                  </p>
                  <p>
                    We obsess over fairness: approvals you can defend, timelines you can rehearse,
                    and analytics that spotlight who needs uplift—not punishment.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    {
                      icon: BookOpen,
                      title: "Teach · drill · certify",
                      blurb:
                        "Blended journeys that turn notes into repeatable confidence before interview day arrives.",
                      ring: "from-emerald-400/70 to-teal-500/70",
                    },
                    {
                      icon: School,
                      title: "Command for campuses",
                      blurb:
                        "Roster mastery, placements ops, cohort stories—readable in minutes, actionable all week.",
                      ring: "from-slate-500/70 to-slate-700/70",
                    },
                    {
                      icon: Briefcase,
                      title: "Talent you can vet fast",
                      blurb:
                        "Skill graphs, timelines, pipelines—fewer pings, bolder hiring decisions backed by receipts.",
                      ring: "from-[#2563EB]/75 to-sky-500/70",
                    },
                    {
                      icon: PieChart,
                      title: "Proof, not vibes",
                      blurb:
                        "Dashboards that speak boardroom polish while staying honest enough for coordinators to trust overnight.",
                      ring: "from-violet-500/70 to-fuchsia-500/70",
                    },
                  ].map(({ icon: Icon, title, blurb, ring }) => (
                    <Card
                      key={title}
                      className={`border-[var(--border)] bg-[var(--bg-card)] shadow-[var(--surface-elevated)] ring-1 ring-transparent`}
                    >
                      <CardContent className="relative overflow-hidden p-4 sm:p-5">
                        <div
                          className={`pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br ${ring} blur-2xl opacity-35`}
                          aria-hidden
                        />
                        <Icon className="relative h-5 w-5 text-[var(--primary)]" aria-hidden />
                        <h3 className="relative mt-3 text-base font-semibold text-slate-900">{title}</h3>
                        <p className="relative mt-2 text-xs leading-relaxed text-slate-600 sm:text-sm">
                          {blurb}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button asChild size="lg" variant="primary" className="rounded-full px-6 shadow-md">
                    <Link to="/signup" className="inline-flex items-center gap-2">
                      Join the rollout
                      <ArrowRight className="h-4 w-4" aria-hidden />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="soft" className="rounded-full px-6">
                    <a href="#contact">Plan a campus walk-through</a>
                  </Button>
                </div>
              </div>

              <div className="order-1 min-w-0 lg:order-2">
                <div className="grid grid-cols-6 gap-3 sm:gap-4">
                  <div className="col-span-6 overflow-hidden rounded-2xl border border-[var(--border)] shadow-[var(--surface-elevated)]">
                    <img
                      src={aboutDashboardImg}
                      alt="Operations dashboard illustrating cohort readiness and placement signals inside Learn2Hire."
                      loading="lazy"
                      className="aspect-[16/11] h-full w-full object-cover md:aspect-[4/3]"
                      width={960}
                      height={720}
                      decoding="async"
                    />
                  </div>
                  <div className="col-span-6 grid grid-cols-2 gap-3 sm:col-span-6 sm:grid-cols-2 sm:gap-4 md:gap-4">
                    <div className="overflow-hidden rounded-2xl border border-[var(--border)] shadow-sm">
                      <img
                        src={aboutLearningImg}
                        alt="Student learning journeys with contextual skill guidance inside Learn2Hire."
                        loading="lazy"
                        className="aspect-[4/3] h-full w-full object-cover"
                        width={480}
                        height={360}
                        decoding="async"
                      />
                    </div>
                    <div className="overflow-hidden rounded-2xl border border-[var(--border)] shadow-sm">
                      <img
                        src={aboutProgressImg}
                        alt="Progress overview highlighting mastery momentum for learners."
                        loading="lazy"
                        className="aspect-[4/3] h-full w-full object-cover"
                        width={480}
                        height={360}
                        decoding="async"
                      />
                    </div>
                  </div>
                </div>
                <p className="mt-4 text-center text-xs text-slate-500 sm:text-left">
                  Screens use the same in-product artwork as your workspace—students, coordinators, and
                  recruiters recognise the rhythms before credentials go live.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section
          id="help"
          className="scroll-mt-28 bg-slate-100 py-12 sm:py-14"
        >
          <div className="l2h-container">
            <SectionHeading
              title="Help & resources"
              description="Quick guidance for signing in, learning, campus tools, and getting support. For account-specific issues, email us so we can verify and assist safely."
            />
            <div className="grid w-full gap-6 md:grid-cols-2 xl:grid-cols-4">
            {helpTopics.map((topic) => (
              <Card key={topic.title} className="border border-slate-200/80 shadow-sm">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-slate-900">{topic.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-700 sm:text-base">
                    {topic.body}
                  </p>
                </CardContent>
              </Card>
            ))}
            </div>
            <div className="mt-8 w-full rounded-2xl border border-slate-200 bg-white px-6 py-5 text-center text-sm leading-relaxed text-slate-700 sm:px-8 sm:text-left sm:text-base">
              <p className="mx-auto max-w-6xl">
                Social channels and direct contact options are listed together in{" "}
                <a href="#contact" className="font-semibold text-[var(--primary)] hover:underline">
                  Contact
                </a>
                . Prefer email first when you need us to verify an account.
              </p>
            </div>
          </div>
        </section>

        <section
          id="contact"
          className="scroll-mt-28 border-t border-[var(--border)] bg-[var(--bg-app)] py-14 text-[var(--text)] sm:py-16"
        >
          <div className="l2h-container">
            <div className="w-full text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">
                Talk to Learn2Hire
              </p>
              <h2 className="mx-auto mt-3 max-w-6xl text-3xl font-bold leading-tight sm:text-4xl md:text-[2.25rem]">
                Ready to transform your placement workflow?
              </h2>
              <p className="mx-auto mt-4 max-w-6xl text-pretty text-base leading-relaxed text-slate-600 sm:mt-5 sm:text-lg">
                Prefer self-serve help first? Open{" "}
                <a
                  href="#help"
                  className="font-semibold text-[var(--primary)] underline-offset-4 hover:underline"
                >
                  Help &amp; resources
                </a>
                . We aim to reply to email and WhatsApp messages within{" "}
                <span className="font-semibold text-slate-800">one to two business days</span>.
              </p>
            </div>

            <div className="mt-11 grid w-full gap-4 md:grid-cols-3">
              <Card className="border-[var(--border)] shadow-[var(--surface-elevated)]">
                <CardContent className="flex flex-col gap-4 p-7 text-center sm:p-8">
                  <Mail className="mx-auto h-9 w-9 text-[var(--primary)]" aria-hidden />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</p>
                    <a
                      href={mailto("Learn2Hire inquiry")}
                      className="mt-2 inline-block max-w-full break-all text-sm font-semibold text-[var(--primary)] underline-offset-4 hover:underline sm:text-[15px]"
                    >
                      {SITE_CONTACT_EMAIL}
                    </a>
                  </div>
                  <Button asChild size="sm" variant="primary" className="w-full sm:w-auto sm:self-center">
                    <a href={mailto("Learn2Hire inquiry")}>Open mail app</a>
                  </Button>
                </CardContent>
              </Card>
              <Card className="border-[var(--border)] shadow-[var(--surface-elevated)]">
                <CardContent className="flex flex-col gap-4 p-7 text-center sm:p-8">
                  <Phone className="mx-auto h-9 w-9 text-[var(--primary)]" aria-hidden />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Phone</p>
                    <a
                      href={`tel:${SITE_PHONE_TEL}`}
                      className="mt-2 block text-lg font-bold tracking-tight text-slate-900 hover:text-[var(--primary)]"
                    >
                      {SITE_PHONE_DISPLAY}
                    </a>
                    <p className="mt-2 text-xs text-slate-500">Voice or WhatsApp</p>
                  </div>
                  <Button asChild size="sm" variant="default" className="w-full sm:w-auto sm:self-center">
                    <a href={`tel:${SITE_PHONE_TEL}`}>Call now</a>
                  </Button>
                </CardContent>
              </Card>
              <Card className="border-[var(--border)] shadow-[var(--surface-elevated)] md:col-span-1">
                <CardContent className="flex flex-col gap-4 p-7 text-center sm:p-8">
                  <MapPin className="mx-auto h-9 w-9 text-[var(--primary)]" aria-hidden />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Coverage</p>
                    {SITE_ADDRESS_LINES.map((line) => (
                      <p key={line} className="mt-2 text-sm font-semibold text-slate-800">
                        {line}
                      </p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button asChild size="lg" variant="primary">
                <Link to="/signup">Create an account</Link>
              </Button>
              <Button asChild size="lg" variant="default">
                <a href={mailto("Schedule a Learn2Hire demo")}>Schedule a demo</a>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

export default LandingPage;
