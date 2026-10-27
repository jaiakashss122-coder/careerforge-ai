import {
  Bot,
  BriefcaseBusiness,
  ChartColumn,
  ClipboardCheck,
  Compass,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Radar,
  Route,
  Settings,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export type NavStatus = "available" | "preview" | "planned";

export type NavItem = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  status: NavStatus;
  phase: number;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const NAV_GROUPS: readonly NavGroup[] = [
  {
    label: "Learn",
    items: [
      {
        href: "/dashboard",
        label: "Dashboard",
        description: "Today's focus and next best step",
        icon: LayoutDashboard,
        status: "available",
        phase: 1,
      },
      {
        href: "/assessment",
        label: "Skills Assessment",
        description: "Adaptive knowledge and preference check",
        icon: ClipboardCheck,
        status: "available",
        phase: 2,
      },
      {
        href: "/roadmap",
        label: "Learning Roadmap",
        description: "Your personalized 13-week plan",
        icon: Route,
        status: "available",
        phase: 2,
      },
      {
        href: "/tutor",
        label: "AI Tutor",
        description: "Personalized teaching, hints, and review",
        icon: Bot,
        status: "available",
        phase: 3,
      },
      {
        href: "/prompts",
        label: "Prompt Studio",
        description: "Reusable prompts for your goals",
        icon: Sparkles,
        status: "available",
        phase: 3,
      },
    ],
  },
  {
    label: "Practice",
    items: [
      {
        href: "/projects",
        label: "Project Lab",
        description: "Portfolio projects and milestones",
        icon: FolderKanban,
        status: "available",
        phase: 4,
      },
      {
        href: "/progress",
        label: "Progress",
        description: "Evidence-based skill analytics",
        icon: ChartColumn,
        status: "available",
        phase: 4,
      },
    ],
  },
  {
    label: "Career",
    items: [
      {
        href: "/careers",
        label: "Career Explorer",
        description: "Compare roles and run experiments",
        icon: Compass,
        status: "available",
        phase: 5,
      },
      {
        href: "/intelligence",
        label: "Industry Intelligence",
        description: "What changed, with the source that says so",
        icon: Radar,
        status: "available",
        phase: 5,
      },
      {
        href: "/interview",
        label: "Interview Preparation",
        description: "Practise answers and compare postings",
        icon: BriefcaseBusiness,
        status: "available",
        phase: 5,
      },
      {
        href: "/materials",
        label: "Application Materials",
        description: "Résumé, LinkedIn and portfolio from your records",
        icon: FileText,
        status: "available",
        phase: 6,
      },
    ],
  },
  {
    label: "Account",
    items: [
      {
        href: "/settings",
        label: "Settings",
        description: "Profile, environment, and account",
        icon: Settings,
        status: "available",
        phase: 1,
      },
    ],
  },
] as const;

export const NAV_ITEMS = NAV_GROUPS.flatMap((group) => group.items);

export function getNavItem(pathname: string) {
  return NAV_ITEMS.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
}
