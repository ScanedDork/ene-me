import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore, daysSince, hoursSince, nextMilestone, todayKey, URGE_TIPS, HABIT_PRESETS, uid } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ShieldAlert, Sparkles, TrendingUp, Wallet, BookHeart, Plus, Flame } from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Ene me" },
      { name: "description", content: "Your recovery dashboard: streaks, savings, milestones, and quick actions." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const [state, update] = useStore();
  const [name, setName] = useState("");

  const stats = useMemo(() => {
    const totalDays = state.habits.reduce((s, h) => s + daysSince(h.quitDate), 0);
    const totalSaved = state.habits.reduce((s, h) => s + daysSince(h.quitDate) * h.costPerDay, 0);
    const longest = state.habits.reduce((m, h) => Math.max(m, daysSince(h.quitDate)), 0);
    return { totalDays, totalSaved, longest };
  }, [state.habits]);

  const todayEntry = state.journal.find((j) => j.date === todayKey());
  const tip = URGE_TIPS[new Date().getDate() % URGE_TIPS.length];

  if (!state.onboarded) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <Card className="max-w-lg w-full p-8 shadow-card border-border/50">
          <div className="grid place-items-center h-14 w-14 rounded-2xl bg-primary text-primary-foreground mx-auto shadow-glow">
            <Flame className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-bold text-center mt-5">Welcome to Ene me</h1>
          <p className="text-center text-muted-foreground mt-2">
            Your private companion to break free from any bad habit. No accounts. No tracking. Just you, your data, and your comeback.
          </p>
          <div className="mt-6 space-y-3">
            <label className="text-sm font-medium">What should we call you?</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name or alias"
              className="w-full h-11 px-4 rounded-lg bg-input border border-border focus:border-primary outline-none"
            />
            <Button
              size="lg"
              className="w-full"
              disabled={!name.trim()}
              onClick={() => update((s) => ({ ...s, userName: name.trim(), onboarded: true }))}
            >
              Begin my comeback
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-sm text-muted-foreground">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mt-1">
            Welcome back, {state.userName} <span className="text-primary">.</span>
          </h1>
          <p className="text-muted-foreground mt-1">You're choosing yourself, one moment at a time.</p>
        </div>
        <Link to="/panic">
          <Button size="lg" variant="destructive" className="shadow-glow animate-pulse-glow">
            <ShieldAlert className="mr-2 h-5 w-5" /> I need help now
          </Button>
        </Link>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Flame className="h-5 w-5" />} label="Longest streak" value={`${stats.longest}d`} />
        <StatCard icon={<TrendingUp className="h-5 w-5" />} label="Total clean days" value={stats.totalDays.toString()} />
        <StatCard icon={<Wallet className="h-5 w-5" />} label="Money saved" value={`$${stats.totalSaved.toLocaleString()}`} />
        <StatCard icon={<Sparkles className="h-5 w-5" />} label="Active battles" value={state.habits.length.toString()} />
      </div>

      {/* Habits or empty */}
      {state.habits.length === 0 ? (
        <Card className="p-8 text-center border-dashed border-2 border-border/60">
          <h3 className="text-xl font-semibold">Choose your first battle</h3>
          <p className="text-muted-foreground mt-1">Pick a habit to break. You can add more later.</p>
          <div className="flex flex-wrap gap-2 justify-center mt-6">
            {HABIT_PRESETS.slice(0, 6).map((p) => (
              <button
                key={p.name}
                onClick={() =>
                  update((s) => ({
                    ...s,
                    habits: [
                      ...s.habits,
                      {
                        id: uid(),
                        name: p.name,
                        emoji: p.emoji,
                        category: p.category,
                        quitDate: new Date().toISOString(),
                        whyReasons: [],
                        costPerDay: p.costPerDay,
                        unit: p.unit,
                        unitsPerDay: p.unitsPerDay,
                        createdAt: new Date().toISOString(),
                      },
                    ],
                  }))
                }
                className="px-4 py-2 rounded-full bg-secondary hover:bg-accent/30 transition border border-border text-sm"
              >
                {p.emoji} {p.name}
              </button>
            ))}
          </div>
          <Link to="/habits">
            <Button variant="outline" className="mt-6"><Plus className="mr-2 h-4 w-4" /> Custom habit</Button>
          </Link>
        </Card>
      ) : (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Your battles</h2>
            <Link to="/habits"><Button variant="ghost" size="sm">Manage</Button></Link>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {state.habits.map((h) => {
              const d = daysSince(h.quitDate);
              const hrs = hoursSince(h.quitDate);
              const next = nextMilestone(d);
              const pct = Math.min(100, (d / next.days) * 100);
              return (
                <Card key={h.id} className="p-5 hover:shadow-glow transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{h.emoji}</div>
                      <div>
                        <div className="font-semibold">{h.name}</div>
                        <div className="text-xs text-muted-foreground">{h.category}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold tabular-nums">{d}</div>
                      <div className="text-xs text-muted-foreground">{d === 0 ? `${hrs}h clean` : "days clean"}</div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>Next: {next.badge} {next.title}</span>
                      <span>{next.days - d}d to go</span>
                    </div>
                    <Progress value={pct} className="h-2" />
                  </div>
                  {h.costPerDay > 0 && (
                    <div className="mt-3 text-sm text-primary font-medium">
                      💰 ${(d * h.costPerDay).toLocaleString()} saved
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </section>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-6 gradient-hero border-primary/30">
          <div className="flex items-center gap-2 text-primary font-semibold">
            <Sparkles className="h-4 w-4" /> Today's reminder
          </div>
          <p className="mt-3 text-lg leading-relaxed">{tip}</p>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold">
              <BookHeart className="h-4 w-4 text-accent" /> Daily check-in
            </div>
            {todayEntry && <span className="text-xs text-primary">✓ Done today</span>}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {todayEntry
              ? "You've checked in today. Reflection is rewiring."
              : "Take 60 seconds to log your mood, cravings, and energy."}
          </p>
          <Link to="/journal">
            <Button className="mt-4" variant={todayEntry ? "outline" : "default"}>
              {todayEntry ? "View journal" : "Check in now"}
            </Button>
          </Link>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="p-4 shadow-card animate-float-up">
      <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider">
        {icon} {label}
      </div>
      <div className="text-2xl md:text-3xl font-bold mt-2 tabular-nums">{value}</div>
    </Card>
  );
}
