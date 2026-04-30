import {
  BarChart3,
  BookOpen,
  BriefcaseBusiness,
  ClipboardList,
  LayoutDashboard,
  UserRound,
} from "lucide-react";

/** Student left-nav destinations (dashboard sections + routes). */
export const studentNavItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "assessments", label: "Assessments", icon: ClipboardList },
  { id: "jobs", label: "Jobs", icon: BriefcaseBusiness, path: "/jobs" },
  { id: "learning", label: "Learning", icon: BookOpen },
  { id: "progress", label: "Progress", icon: BarChart3 },
];
