import {
  BarChart3,
  BookOpenCheck,
  ClipboardList,
  LayoutDashboard,
  UserRound,
} from "lucide-react";

export const facultyNavItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  {
    id: "learning",
    label: "Manage learning",
    icon: BookOpenCheck,
    path: "/dashboard/learning/manage",
  },
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "assessments", label: "Assessments", icon: ClipboardList },
  { id: "progress", label: "Progress", icon: BarChart3 },
];
