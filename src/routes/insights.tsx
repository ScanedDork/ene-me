import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useStore, daysSince } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, AlertTriangle, Calendar, Activity, Sparkles, Wand2 } from "lucide-react";
import { chat, isAIReady } from "@/lib/ai-client";

export const Route = createFileRoute("/insights")({
  head: () => ({
    meta: [
      { title: "Insights — Ene me" },
      { name: "description", content: "Trigger patterns, risky days, AI weekly reflection." },
    ],
  }),
  component: Insights,
});

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function Insights() {
  const [state] = useStore();

  const analysis = useMemo(() => {
    const triggerCount = new Map<string, number>();
    const dayCravings: number[][] = Array.from({ length: 7 }, () => []);
    const dayMoods: number[][] = Array.from({ length: 7 }, () => []);
    const relapsesByDay = Array.from({ length: 7 }, () => 0);

    for (const j of state.journal) {
      const d = new Date(j.date + "T12:00:00").getDay();
      dayCravings[d].push(j.craving);
      dayMoods[d].push(j.mood);
      for (const t of j.triggers ?? []) triggerCount.set(t, (triggerCount.get(t) ?? 0) + 1);
    }
    for (const r of state.relapses) {
      const d = new Date(r.date).getDay();
      relapsesByDay[d]++;
    }

    const topTriggers = [...triggerCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
    const dayStats = DAY_NAMES.map((label, i) => ({
      label,
      craving: avg(dayCravings[i]),
      mood: avg(dayMoods[i]),
      relapses: relapsesByDay[i],
      samples: dayCravings[i].length,
    }));

    const riskiestDay = [...dayStats].sort((a, b) => b.craving + b.relapses * 2 - (a.craving + a.relapses * 2))[0];
    const safestDay = [...dayStats].filter((d) => d.samples > 0).sort((a, b) => a.craving - b.craving)[0];

    // Streak velocity
    const recent14 = state.journal
      .filter((j) => Date.now() - new Date(j.date).getTime() < 14 * 86_400_000);
    const prev14 = state.journal
      .filter((j) => {
        const age = Date.now() - new Date(j.date).getTime();
        return age >= 14 * 86_400_000 && age < 28 * 86_400_000;
      });
    const cravingTrend = avg(recent14.map((j) => j.craving)) - avg(prev14.map((j) => j.craving));
    const moodTrend = avg(recent14.map((j) => j.mood)) - avg(prev14.map((j) => j.mood));

    // CBT distortion frequency
    const distortions = new Map<string, number>();
    for (const s of state.cbtSessions ?? []) {
      for (const d of s.distortions) distortions.set(d, (distortions.get(d) ?? 0) + 1);
    }
    const topDistortions = [...distortions.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

    return { topTriggers, dayStats, riskiestDay, safestDay, cravingTrend, moodTrend, topDistortions };
  }, [state]);

  const hasData = state.journal.length > 0 || state.relapses.length > 0;

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Insights</h1>
        <p className="text-muted-foreground mt-1">Patterns the data sees — so you can see your enemy clearly.</p>
      </header>

      {!hasData ? (
        <Card className="p-12 text-center border-dashed border-2">
          <Activity className="h-10 w-10 text-muted-foreground mx-auto" />
          <h3 className="text-xl font-semibold mt-3">No data yet</h3>
          <p className="text-muted-foreground">Log a few journal entries to start seeing your patterns.</p>
        </Card>
      ) : (
        <>
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="p-5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertTriangle className="h-4 w-4 text-danger" /> Riskiest day
              </div>
              <div className="mt-2 text-3xl font-bold">
                {analysis.riskiestDay?.label ?? "—"}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {analysis.riskiestDay?.samples
                  ? `Avg craving ${analysis.riskiestDay.craving.toFixed(1)}/10 · ${analysis.riskiestDay.relapses} relapse(s) recorded`
                  : "Need more data"}
              </p>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4 text-accent" /> Safest day
              </div>
              <div className="mt-2 text-3xl font-bold">{analysis.safestDay?.label ?? "—"}</div>
              <p className="text-sm text-muted-foreground mt-1">
                {analysis.safestDay
                  ? `Avg craving ${analysis.safestDay.craving.toFixed(1)}/10`
                  : "Need more data"}
              </p>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="font-semibold flex items-center gap-2"><Calendar className="h-4 w-4" /> Week-by-day patterns</h3>
            <div className="mt-4 grid grid-cols-7 gap-2">
              {analysis.dayStats.map((d) => {
                const intensity = d.samples ? Math.min(1, d.craving / 10) : 0;
                return (
                  <div key={d.label} className="text-center">
                    <div className="text-xs text-muted-foreground">{d.label}</div>
                    <div
                      className="mt-1 h-16 rounded-lg border border-border grid place-items-center text-sm font-medium"
                      style={{
                        background: `color-mix(in oklab, var(--danger) ${intensity * 70}%, transparent)`,
                      }}
                      title={`${d.samples} entries`}
                    >
                      {d.samples ? d.craving.toFixed(1) : "—"}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1">{d.relapses} R</div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-3">Avg craving intensity by day of week. "R" = relapses logged.</p>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            <Card className="p-5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4" /> 14-day trends
              </div>
              <div className="mt-3 space-y-2 text-sm">
                <Trend label="Cravings" delta={analysis.cravingTrend} good="down" />
                <Trend label="Mood" delta={analysis.moodTrend} good="up" />
              </div>
            </Card>
            <Card className="p-5">
              <h3 className="font-semibold text-sm text-muted-foreground">Top triggers</h3>
              <ul className="mt-3 space-y-1.5">
                {analysis.topTriggers.length === 0 && <li className="text-sm text-muted-foreground">No triggers logged yet.</li>}
                {analysis.topTriggers.map(([t, n]) => (
                  <li key={t} className="flex items-center justify-between text-sm">
                    <span>{t}</span>
                    <span className="px-2 py-0.5 rounded-full bg-secondary text-xs">{n}×</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          {analysis.topDistortions.length > 0 && (
            <Card className="p-5">
              <h3 className="font-semibold text-sm text-muted-foreground">Your top cognitive distortions</h3>
              <ul className="mt-3 space-y-1.5">
                {analysis.topDistortions.map(([d, n]) => (
                  <li key={d} className="flex items-center justify-between text-sm">
                    <span className="capitalize">{d.replace(/-/g, " ")}</span>
                    <span className="px-2 py-0.5 rounded-full bg-secondary text-xs">{n}×</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <AIReflection />
        </>
      )}
    </div>
  );
}

function AIReflection() {
  const [state] = useStore();
  const [text, setText] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const run = async () => {
    setBusy(true); setErr(null); setText("");
    try {
      const recentJournal = state.journal.slice(0, 14).map((j) => ({
        date: j.date, mood: j.mood, craving: j.craving, energy: j.energy,
        triggers: j.triggers, note: (j.note ?? "").slice(0, 240),
      }));
      const recentRelapses = state.relapses.slice(0, 5).map((r) => ({ date: r.date, trigger: r.trigger, lesson: r.lesson }));
      const habits = state.habits.map((h) => ({ name: h.name, days: daysSince(h.quitDate) }));
      const reply = await chat([
        { role: "system", content: "You are a recovery coach reviewing the user's own data. Write a private, honest weekly reflection (markdown, 5-8 short bullets). Surface 1) the clearest pattern (day/trigger/mood), 2) a win they may not have noticed, 3) the riskiest moment ahead this week, 4) ONE specific micro-experiment to try. No shaming, no toxic positivity, use their words where possible." },
        { role: "user", content: JSON.stringify({ habits, recentJournal, recentRelapses }) },
      ]);
      setText(reply);
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wand2 className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">AI weekly reflection</h3>
        </div>
        {isAIReady() ? (
          <Button size="sm" onClick={run} disabled={busy}>{busy ? "Thinking…" : text ? "Regenerate" : "Generate"}</Button>
        ) : (
          <Link to="/ai-settings"><Button size="sm" variant="outline">Connect AI</Button></Link>
        )}
      </div>
      {err && <p className="text-sm text-danger mt-3">{err}</p>}
      {text && (
        <pre className="mt-4 whitespace-pre-wrap text-sm leading-relaxed font-sans">{text}</pre>
      )}
      {!text && !err && (
        <p className="text-sm text-muted-foreground mt-2">
          Send your last 14 days of journal + relapse data to your configured AI to get a private, honest weekly reflection.
        </p>
      )}
    </Card>
  );
}

function Trend({ label, delta, good }: { label: string; delta: number; good: "up" | "down" }) {
  const isGood = good === "up" ? delta > 0 : delta < 0;
  const flat = Math.abs(delta) < 0.2;
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      <span className={`text-sm font-semibold ${flat ? "text-muted-foreground" : isGood ? "text-accent" : "text-danger"}`}>
        {delta > 0 ? "+" : ""}
        {delta.toFixed(1)} {flat ? "(steady)" : isGood ? "✓" : "↑ watch"}
      </span>
    </div>
  );
}
