import {
  BookOpen,
  Briefcase,
  ClipboardList,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Sparkles,
  Target,
  TrendingUp,
  UserRound,
  Wrench,
} from "lucide-react";

import { cn } from "../../lib/utils";

const iconMap = {
  overview: LayoutDashboard,
  onboarding: UserRound,
  learning: BookOpen,
  quizzes: ClipboardList,
  scorecard: TrendingUp,
  feedback: Sparkles,
  remedial: Wrench,
  placement: Target,
  applications: Briefcase,
  profile: FileText,
};

function StudentSidebar({ items, activeSection, onSelect }) {
  return (
    <aside className="rounded-[28px] bg-[linear-gradient(180deg,#4361ee_0%,#3a0ca3_100%)] p-6 text-white shadow-[0_24px_60px_rgba(67,97,238,0.28)] lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)]">
      <div className="mb-8 flex items-center gap-3 border-b border-white/20 pb-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
          <GraduationCap className="h-6 w-6" />
        </div>
        <div>
          <div className="text-xl font-bold">Learn2Hire</div>
          <div className="text-sm text-white/70">Student Portal</div>
        </div>
      </div>

      <nav className="space-y-2">
        {items.map((item) => {
          const Icon = iconMap[item.id] || LayoutDashboard;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition",
                activeSection === item.id
                  ? "bg-white/18 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

export default StudentSidebar;
