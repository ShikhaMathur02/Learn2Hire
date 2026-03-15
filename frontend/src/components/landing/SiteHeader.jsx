import { Link } from "react-router-dom";
import { BriefcaseBusiness, Users } from "lucide-react";

import { Button } from "../ui/button";

const navItems = [
  { label: "Features", href: "#features" },
  { label: "For You", href: "#roles" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Testimonials", href: "#testimonials" },
  { label: "Contact", href: "#contact" },
];

function SiteHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/70 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
        <Link
          to="/"
          className="flex items-center gap-3 text-2xl font-bold text-[var(--primary)]"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color:rgba(79,70,229,0.1)]">
            <Users className="h-5 w-5" />
          </div>
          <span>Learn2Hire</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-slate-600 transition-colors hover:text-[var(--primary)]"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Button asChild variant="outline">
            <Link to="/login">Login</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/signup">
              Register
              <BriefcaseBusiness className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

export default SiteHeader;
