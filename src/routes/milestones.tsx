import { createFileRoute } from "@tanstack/react-router";
import { useStore, daysSince, MILESTONES, earnedMilestones, nextMilestone } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Trophy } from "lucide-react";

export const Route = createFileRoute("/milestones")({
  head: () => ({ meta: [{ title: "Milestones — Ene me" }, { name: "description", content: "Badges and achievements as you progress." }] }),
  component: Milestones,
});

function Milestones() {
  const [state] = useStore();

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-8">
      <header className="flex items-center gap-3">
        <Trophy className="h-7 w-7 text-accent" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Milestones</h1>
          <p className="text-muted-foreground mt-1">Earn a badge for every battle, every threshold crossed.</p>
        </div>
      </header>

      {state.habits.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-2">
          <div className="text-5xl">🏆</div>
          <p className="mt-3 text-muted-foreground">Add a habit to start earning milestones.</p>
        </Card>
      ) : (
        state.habits.map((h) => {
          const d = daysSince(h.quitDate);
          const earned = earnedMilestones(d);
          const next = nextMilestone(d);
          return (
            <section key={h.id}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{h.emoji}</span>
                  <div>
                    <h2 className="text-xl font-semibold">{h.name}</h2>
                    <div className="text-sm text-muted-foreground">{d} days clean · {earned.length}/{MILESTONES.length} badges</div>
                  </div>
                </div>
              </div>
              <Card className="p-5 mb-3">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span>Next: <strong>{next.badge} {next.title}</strong></span>
                  <span className="text-muted-foreground">{Math.max(0, next.days - d)} days to go</span>
                </div>
                <Progress value={Math.min(100, (d / next.days) * 100)} className="h-3" />
              </Card>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {MILESTONES.map((m) => {
                  const got = d >= m.days;
                  return (
                    <div
                      key={m.days}
                      className={`p-4 rounded-2xl text-center border transition ${
                        got ? "bg-card border-primary/50 shadow-glow" : "bg-card/40 border-border opacity-50"
                      }`}
                    >
                      <div className={`text-4xl ${got ? "" : "grayscale"}`}>{m.badge}</div>
                      <div className="font-bold text-sm mt-2">{m.title}</div>
                      <div className="text-xs text-muted-foreground mt-1">{m.days}d</div>
                      {got && <div className="text-[10px] text-primary mt-2 font-medium">UNLOCKED</div>}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
