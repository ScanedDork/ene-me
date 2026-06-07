import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Target,
  ShieldAlert,
  BookHeart,
  Trophy,
  Wrench,
  Sunrise,
  Brain,
  FileText,
  Settings as SettingsIcon,
  Sparkles,
  Activity,
  Wind,
  Share2,
  UserCircle,
  Stethoscope,
  Cpu,
  Database,
  Github,
} from "lucide-react";
import { useStore, daysSince } from "@/lib/store";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; emphasis?: boolean };
const baseNav: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/habits", label: "My Habits", icon: Target },
  { to: "/panic", label: "Panic Button", icon: ShieldAlert, emphasis: true },
  { to: "/coach", label: "AI Coach", icon: Sparkles },
  { to: "/journal", label: "Journal", icon: BookHeart },
  { to: "/cbt", label: "CBT", icon: Brain },
  { to: "/identity", label: "Identity", icon: UserCircle },
  { to: "/meditate", label: "Meditate", icon: Wind },
  { to: "/insights", label: "Insights", icon: Activity },
  { to: "/milestones", label: "Milestones", icon: Trophy },
  { to: "/toolkit", label: "Toolkit", icon: Wrench },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/therapist", label: "Therapist Pack", icon: Stethoscope },
  { to: "/share", label: "Share", icon: Share2 },
  { to: "/ai-settings", label: "AI Provider", icon: Cpu },
  { to: "/storage", label: "Storage", icon: Database },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

const mobileNav = baseNav.filter((n) => ["/", "/habits", "/panic", "/coach", "/journal"].includes(n.to));

export function AppSidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [state] = useStore();
  const topStreak = state.habits.reduce(
    (max, h) => Math.max(max, daysSince(h.quitDate)),
    0,
  );

  const nav: NavItem[] = baseNav;

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col bg-sidebar border-r border-sidebar-border">
      <Link to="/" className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
        <div className="grid place-items-center h-10 w-10 rounded-xl bg-primary text-primary-foreground shadow-glow">
          <Sunrise className="h-5 w-5" />
        </div>
        <div>
          <div className="font-bold text-sidebar-foreground tracking-tight">
            Ene <span className="text-primary">me</span>
          </div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Reclaim yourself</div>
        </div>
      </Link>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {nav.map(({ to, label, icon: Icon, emphasis }) => {
          const active = path === to || (to !== "/" && path.startsWith(to));
          return (
            <Link
              key={to}
              to={to as any}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-card"
                  : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                emphasis && !active && "text-danger",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      {state.habits.length > 0 && (
        <div className="m-3 p-4 rounded-xl gradient-streak text-accent-foreground">
          <div className="text-xs uppercase tracking-wider opacity-80">Top streak</div>
          <div className="text-3xl font-bold mt-1">{topStreak}d</div>
          <div className="text-xs opacity-80 mt-1">Keep going. Today counts.</div>
        </div>
      )}

      <div className="px-4 py-3 border-t border-sidebar-border text-[11px] text-muted-foreground space-y-1">
        <div>
          Built by{" "}
          <a href="https://ranjeetskanda.com" target="_blank" rel="noreferrer" className="text-foreground hover:underline">
            Ramar Ranjeet Skanda
          </a>
        </div>
        <a
          href="https://github.com/ScanedDork"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 hover:text-foreground"
        >
          <Github className="h-3 w-3" /> ScanedDork · Open source (MIT)
        </a>
      </div>
    </aside>
  );
}

export function MobileNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-sidebar border-t border-sidebar-border flex justify-around py-2">
      {mobileNav.map(({ to, label, icon: Icon, emphasis }) => {
        const active = path === to;
        return (
          <Link
            key={to}
            to={to as any}
            className={cn(
              "flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-medium",
              active ? "text-primary" : "text-sidebar-foreground/70",
              emphasis && !active && "text-danger",
            )}
          >
            <Icon className="h-5 w-5" />
            {label.split(" ")[0]}
          </Link>
        );
      })}
    </nav>
  );
}
