import {
  BarChart3,
  BookOpen,
  Bot,
  Briefcase,
  CheckCircle2,
  Cog,
  GraduationCap,
  PieChart,
  School,
  Star,
  TrendingUp,
  RefreshCcw,
} from "lucide-react";
import { Link } from "react-router-dom";

import HeroSection from "../components/landing/HeroSection";
import SectionHeading from "../components/landing/SectionHeading";
import SiteHeader from "../components/landing/SiteHeader";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";

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
    gradient: "from-[#ff7e5f] to-[#ff9966]",
    buttonClass:
      "border-2 border-[#ff7e5f] bg-white !text-[#ff7e5f] shadow-sm hover:bg-[#ff7e5f] hover:!text-white hover:border-[#ff7e5f]",
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
    gradient: "from-[#8a4fff] to-[#a97cff]",
    buttonClass:
      "border-2 border-[#8a4fff] bg-white !text-[#8a4fff] shadow-sm hover:bg-[#8a4fff] hover:!text-white hover:border-[#8a4fff]",
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
    gradient: "from-[#2dd4bf] to-[#34d399]",
    buttonClass:
      "border-2 border-[#2dd4bf] bg-white !text-slate-900 shadow-sm hover:bg-[#2dd4bf] hover:!text-slate-900 hover:border-[#2dd4bf]",
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
  },
  {
    title: "Skill Development",
    description:
      "Access learning materials, practice tests, and coding challenges tailored to individual skill levels and goals.",
  },
  {
    title: "Performance Tracking",
    description:
      "Colleges monitor student progress, identify areas for improvement, and provide targeted support.",
  },
  {
    title: "Job Matching",
    description:
      "Companies post opportunities and AI matches eligible candidates based on skills, preferences, and culture fit.",
  },
  {
    title: "Placement Process",
    description:
      "Streamlined interview scheduling, selection, and hiring with automated workflows and communication.",
  },
  {
    title: "Analytics & Feedback",
    description:
      "Continuous improvement loop with detailed reports and insights for all stakeholders.",
  },
];

const testimonials = [
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
    name: "Ananya Gupta",
    role: "HR Manager",
    image:
      "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=200&q=80",
    text:
      "The automated shortlisting saves us countless hours. The detailed skill reports help us make better hiring decisions with confidence.",
  },
];

function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--light)] text-[var(--text)]">
      <SiteHeader />
      <main>
        <HeroSection />

        <section id="features" className="px-5 py-12 sm:py-14">
          <div className="mx-auto max-w-7xl lg:px-8">
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
                      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[color:rgba(79,70,229,0.1)] text-[var(--primary)]">
                        <Icon className="h-7 w-7" />
                      </div>
                      <h3 className="text-2xl font-semibold text-slate-900">
                        {feature.title}
                      </h3>
                      <p className="mt-3 text-slate-600">
                        {feature.description}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        <section id="roles" className="bg-slate-100 px-5 py-12 sm:py-14">
          <div className="mx-auto max-w-7xl lg:px-8">
            <SectionHeading
              title="Tailored solutions for every role"
              description="Learn2Hire provides customized experiences for each stakeholder in the placement process"
            />

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {roles.map((role) => {
                const Icon = role.icon;
                return (
                  <Card key={role.title} className="overflow-hidden border-0">
                    <div
                      className={`bg-gradient-to-br ${role.gradient} p-8 text-center text-white`}
                    >
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
                      <Button asChild variant="custom" className={`mt-4 w-full justify-center shadow-sm ${role.buttonClass}`}>
                        <Link to={role.to}>{role.buttonLabel}</Link>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="px-5 py-12 sm:py-14">
          <div className="mx-auto max-w-5xl lg:px-8">
            <SectionHeading
              title="How Learn2Hire Works"
              description="A seamless workflow connecting all stakeholders in the placement ecosystem"
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
                    <h3 className="text-2xl font-semibold text-slate-900">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-slate-600">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="testimonials" className="bg-slate-100 px-5 py-12 sm:py-14">
          <div className="mx-auto max-w-7xl lg:px-8">
            <SectionHeading
              title="What our users say"
              description="Hear from students, colleges, and companies who have benefited from Learn2Hire"
            />

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {testimonials.map((testimonial) => (
                <Card key={testimonial.name}>
                  <CardContent>
                    <div className="mb-5 flex items-center gap-4">
                      <img
                        src={testimonial.image}
                        alt={testimonial.name}
                        className="h-16 w-16 rounded-full object-cover"
                      />
                      <div>
                        <h4 className="text-lg font-semibold text-slate-900">
                          {testimonial.name}
                        </h4>
                        <p className="text-slate-500">{testimonial.role}</p>
                      </div>
                    </div>
                    <p className="italic text-slate-600">
                      "{testimonial.text}"
                    </p>
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
          id="contact"
          className="bg-[linear-gradient(135deg,var(--primary),var(--primary-dark))] px-5 py-12 text-center text-white sm:py-14"
        >
          <div className="mx-auto max-w-4xl lg:px-8">
            <h2 className="text-4xl font-bold sm:text-5xl">
              Ready to transform your placement process?
            </h2>
            <p className="mx-auto mt-5 max-w-3xl text-lg text-white/90">
              Join hundreds of institutions and companies already benefiting
              from Learn2Hire.
            </p>
            <Button asChild size="lg" variant="default" className="mt-8 shadow-md">
              <Link to="/signup">Request Demo</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="bg-[var(--dark)] px-5 pb-6 pt-10 text-white sm:pb-8 sm:pt-12">
        <div className="mx-auto max-w-7xl lg:px-8">
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <div className="mb-5 text-2xl font-bold">Learn2Hire</div>
              <p className="mb-5 text-slate-300">
                Bridging the gap between education and employment through
                technology.
              </p>
              <div className="flex gap-3">
                {["f", "t", "i", "in"].map((item) => (
                  <div
                    key={item}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-sm font-semibold"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-5 text-xl font-semibold">Solutions</h3>
              <ul className="space-y-3 text-slate-300">
                <li>For Students</li>
                <li>For Colleges</li>
                <li>For Companies</li>
              </ul>
            </div>

            <div>
              <h3 className="mb-5 text-xl font-semibold">Support</h3>
              <ul className="space-y-3 text-slate-300">
                <li>Help Center</li>
                <li>Documentation</li>
                <li>Community</li>
              </ul>
            </div>

            <div>
              <h3 className="mb-5 text-xl font-semibold">Company</h3>
              <ul className="space-y-3 text-slate-300">
                <li>About</li>
                <li>Careers</li>
                <li>Blog</li>
                <li>Contact</li>
              </ul>
            </div>
          </div>

          <div className="mt-8 border-t border-white/10 pt-6 text-center text-slate-400">
            <p>&copy; 2026 Learn2Hire. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
