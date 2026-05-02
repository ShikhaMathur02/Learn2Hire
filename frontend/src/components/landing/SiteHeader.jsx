import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, LogIn, LogOut, Menu, UserPlus, Users } from "lucide-react";

import { Button } from "../ui/button";
import { NavDropdown } from "../ui/nav-dropdown";
import { clearAuthSession, useAuthSession } from "../../lib/authSession";

const navItems = [
  { key: "learning", label: "Learning", to: "/learning" },
  { key: "features", label: "Features", href: "#features" },
  { key: "roles", label: "For You", href: "#roles" },
  { key: "how-it-works", label: "How It Works", href: "#how-it-works" },
  { key: "testimonials", label: "Testimonials", href: "#testimonials" },
  { key: "about", label: "About", href: "#about" },
  { key: "help", label: "Help", href: "#help" },
  { key: "contact", label: "Contact", href: "#contact" },
];

function SiteHeader() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, learningPath } = useAuthSession();
  const isLandingHome = pathname === "/";
  const isLearningRoute =
    pathname.startsWith("/learning") || pathname.startsWith("/dashboard/learning");

  const handleLogout = () => {
    clearAuthSession();
    navigate("/login");
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-[var(--border)] bg-[var(--bg-card)]/95 pt-[env(safe-area-inset-top,0px)] shadow-[0_8px_30px_-18px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="l2h-container flex w-full items-center justify-between py-3 sm:py-4">
        <Link
          to="/"
          className="flex items-center gap-3 text-2xl font-bold text-[var(--primary)] transition-opacity hover:opacity-90"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-blue-500/10 shadow-sm shadow-blue-900/5">
            <Users className="h-5 w-5" />
          </div>
          <span>Learn2Hire</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navItems.map((item) => (
            item.to ? (
              <Link
                key={item.key}
                to={item.key === "learning" ? learningPath : item.to}
                className={`text-sm font-medium transition-colors ${
                  item.key === "learning" && isLearningRoute
                    ? "text-[var(--primary)]"
                    : "text-slate-700 hover:text-[var(--primary)]"
                }`}
              >
                {item.label}
              </Link>
            ) : (
              <a
                key={item.key}
                href={isLandingHome ? item.href : `/${item.href}`}
                className="text-sm font-medium text-slate-700 transition-colors hover:text-[var(--primary)]"
              >
                {item.label}
              </a>
            )
          ))}
        </nav>

        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
          <div className="md:hidden">
            <NavDropdown
              theme="light"
              align="right"
              icon={Menu}
              label="Explore"
              menuClassName="max-h-[70vh] overflow-y-auto"
              items={navItems.map((item) =>
                item.to
                  ? {
                      key: item.key,
                      label: item.label,
                      to: item.key === "learning" ? learningPath : item.to,
                    }
                  : {
                      key: item.key,
                      label: item.label,
                      to: `/#${String(item.href || "").replace(/^#/, "")}`,
                    }
              )}
            />
          </div>
          {isLandingHome ? (
            <>
              <Button asChild variant="default" className="min-w-[7rem]">
                <Link to="/login">
                  <LogIn className="h-4 w-4 shrink-0" aria-hidden />
                  Login
                </Link>
              </Button>
              <Button asChild variant="default" className="min-w-[7.5rem]">
                <Link to="/signup">
                  <UserPlus className="h-4 w-4 shrink-0" aria-hidden />
                  Register
                </Link>
              </Button>
            </>
          ) : isAuthenticated ? (
            <>
              <Button asChild variant="default" className="min-w-[7.5rem]">
                <Link to="/dashboard">
                  <LayoutDashboard className="h-4 w-4 shrink-0" aria-hidden />
                  Dashboard
                </Link>
              </Button>
              <Button variant="default" className="min-w-[7rem]" onClick={handleLogout}>
                <LogOut className="h-4 w-4 shrink-0" aria-hidden />
                Logout
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="default" className="min-w-[7rem]">
                <Link to="/login">
                  <LogIn className="h-4 w-4 shrink-0" aria-hidden />
                  Login
                </Link>
              </Button>
              <Button asChild variant="default" className="min-w-[7.5rem]">
                <Link to="/signup">
                  <UserPlus className="h-4 w-4 shrink-0" aria-hidden />
                  Register
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default SiteHeader;
