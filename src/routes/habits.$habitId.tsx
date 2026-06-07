import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useStore, daysSince, uid, todayKey, COPING_PRESETS, type IfThen, type CopingStrategy, type Habit, type HabitReplacement } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Plus, Trash2, Calendar, Phone, Gift, Trophy, Flame, Sprout, Check } from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/habits/$habitId")({
  head: () => ({ meta: [{ title: "Habit detail — Ene me" }, { name: "description", content: "Your personal recovery plan, coping strategies, and streak history." }] }),
  component: HabitDetail,
});

function HabitDetail() {
  const { habitId } = Route.useParams();
  const [state, update] = useStore();
  const navigate = useNavigate();
  const habit = state.habits.find((h) => h.id === habitId);

  if (!habit) {
    return (
      <div className="p-10 max-w-3xl mx-auto">
        <p className="text-muted-foreground">Habit not found.</p>
        <Link to="/habits"><Button variant="outline" className="mt-4"><ArrowLeft className="mr-2 h-4 w-4" /> Back to habits</Button></Link>
      </div>
    );
  }

  const days = daysSince(habit.quitDate);
  const relapses = state.relapses.filter((r) => r.habitId === habit.id);
  const longest = Math.max(habit.longestStreak ?? 0, days);

  const patch = (next: Partial<Habit>) =>
    update((s) => ({ ...s, habits: s.habits.map((h) => (h.id === habit.id ? { ...h, ...next } : h)) }));

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/habits" })}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
      </div>

      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="text-5xl">{habit.emoji}</div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">{habit.name}</h1>
              <div className="text-sm text-muted-foreground">{habit.category} · since {new Date(habit.quitDate).toLocaleDateString()}</div>
            </div>
          </div>
          <div className="flex gap-6">
            <Stat label="Current" value={`${days}d`} icon={<Flame className="h-4 w-4 text-primary" />} />
            <Stat label="Longest" value={`${longest}d`} icon={<Trophy className="h-4 w-4 text-accent" />} />
            <Stat label="Relapses" value={relapses.length.toString()} icon={<></>} />
          </div>
        </div>
      </Card>

      <Tabs defaultValue="plan">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="plan">Recovery Plan</TabsTrigger>
          <TabsTrigger value="coping">Coping</TabsTrigger>
          <TabsTrigger value="replacement">Replacement</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="plan" className="mt-4">
          <PlanTab habit={habit} patch={patch} />
        </TabsContent>
        <TabsContent value="coping" className="mt-4">
          <CopingTab habit={habit} patch={patch} />
        </TabsContent>
        <TabsContent value="replacement" className="mt-4">
          <ReplacementTab habit={habit} patch={patch} />
        </TabsContent>
        <TabsContent value="history" className="mt-4">
          <HistoryTab habit={habit} relapses={relapses} days={days} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground uppercase">{icon} {label}</div>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
    </div>
  );
}

function PlanTab({ habit, patch }: { habit: Habit; patch: (n: Partial<Habit>) => void }) {
  const plan = habit.plan ?? { ifThens: [] };
  const setPlan = (p: typeof plan) => patch({ plan: p });
  const [trigger, setTrigger] = useState("");
  const [action, setAction] = useState("");

  return (
    <Card className="p-6 space-y-6">
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label className="flex items-center gap-2"><Calendar className="h-4 w-4" /> Goal date</Label>
          <Input type="date" value={plan.goalDate ?? ""} onChange={(e) => setPlan({ ...plan, goalDate: e.target.value })} className="mt-1" />
        </div>
        <div>
          <Label className="flex items-center gap-2"><Gift className="h-4 w-4" /> Reward when reached</Label>
          <Input value={plan.reward ?? ""} onChange={(e) => setPlan({ ...plan, reward: e.target.value })} placeholder="e.g. Weekend trip" className="mt-1" />
        </div>
        <div>
          <Label className="flex items-center gap-2"><Phone className="h-4 w-4" /> Support person name</Label>
          <Input value={plan.supportName ?? ""} onChange={(e) => setPlan({ ...plan, supportName: e.target.value })} placeholder="Who do you call?" className="mt-1" />
        </div>
        <div>
          <Label>Contact (phone / handle)</Label>
          <Input value={plan.supportContact ?? ""} onChange={(e) => setPlan({ ...plan, supportContact: e.target.value })} placeholder="+1 555…" className="mt-1" />
        </div>
      </div>

      <div>
        <Label className="text-base font-semibold">If / Then plans</Label>
        <p className="text-sm text-muted-foreground mt-1">Pre-decide your response so you don't have to think during a crisis.</p>
        <div className="space-y-2 mt-3">
          {plan.ifThens.map((ift) => (
            <div key={ift.id} className="flex items-center gap-2 bg-secondary/60 rounded-lg p-3">
              <div className="flex-1 text-sm"><span className="text-muted-foreground">If</span> {ift.trigger} <span className="text-muted-foreground">→ then</span> {ift.action}</div>
              <Button variant="ghost" size="sm" onClick={() => setPlan({ ...plan, ifThens: plan.ifThens.filter((x) => x.id !== ift.id) })}>
                <Trash2 className="h-4 w-4 text-danger" />
              </Button>
            </div>
          ))}
        </div>
        <div className="grid md:grid-cols-[1fr_1fr_auto] gap-2 mt-3">
          <Input placeholder="When I feel… (trigger)" value={trigger} onChange={(e) => setTrigger(e.target.value)} />
          <Input placeholder="I will… (action)" value={action} onChange={(e) => setAction(e.target.value)} />
          <Button onClick={() => {
            if (!trigger.trim() || !action.trim()) return;
            const next: IfThen = { id: uid(), trigger: trigger.trim(), action: action.trim() };
            setPlan({ ...plan, ifThens: [...plan.ifThens, next] });
            setTrigger(""); setAction("");
          }}><Plus className="h-4 w-4" /></Button>
        </div>
      </div>
    </Card>
  );
}

function CopingTab({ habit, patch }: { habit: Habit; patch: (n: Partial<Habit>) => void }) {
  const list = habit.copingStrategies ?? [];
  const setList = (l: CopingStrategy[]) => patch({ copingStrategies: l });
  const [text, setText] = useState("");
  const [cat, setCat] = useState<CopingStrategy["category"]>("Physical");

  const cats: CopingStrategy["category"][] = ["Physical", "Cognitive", "Social", "Spiritual"];

  return (
    <Card className="p-6 space-y-6">
      <div>
        <Label className="text-base font-semibold">My strategies</Label>
        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground mt-2">No strategies yet. Add a few from the presets below or write your own.</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-2 mt-3">
            {list.map((s) => (
              <div key={s.id} className="flex items-center gap-2 bg-secondary/60 rounded-lg p-3">
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">{s.category}</span>
                <span className="flex-1 text-sm">{s.text}</span>
                <button onClick={() => setList(list.map((x) => x.id === s.id ? { ...x, uses: x.uses + 1 } : x))} className="text-xs text-muted-foreground hover:text-primary">used ({s.uses})</button>
                <Button variant="ghost" size="sm" onClick={() => setList(list.filter((x) => x.id !== s.id))}>
                  <Trash2 className="h-4 w-4 text-danger" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <Label>Add your own</Label>
        <div className="grid md:grid-cols-[140px_1fr_auto] gap-2 mt-2">
          <select className="h-10 px-3 rounded-md bg-input border border-border text-sm" value={cat} onChange={(e) => setCat(e.target.value as any)}>
            {cats.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <Input placeholder="What works for you?" value={text} onChange={(e) => setText(e.target.value)} />
          <Button onClick={() => {
            if (!text.trim()) return;
            setList([...list, { id: uid(), text: text.trim(), category: cat, uses: 0 }]);
            setText("");
          }}><Plus className="h-4 w-4" /></Button>
        </div>
      </div>

      <div>
        <Label>Quick add from presets</Label>
        <div className="flex flex-wrap gap-2 mt-2">
          {COPING_PRESETS.map((p, i) => (
            <button
              key={i}
              onClick={() => setList([...list, { id: uid(), text: p.text, category: p.category, uses: 0 }])}
              className="px-3 py-1.5 rounded-full text-xs border border-border hover:bg-secondary"
            >
              + {p.text}
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
}

function ReplacementTab({ habit, patch }: { habit: Habit; patch: (n: Partial<Habit>) => void }) {
  const r = habit.replacement;
  const today = todayKey();
  const [draft, setDraft] = useState<HabitReplacement>(r ?? { name: "", emoji: "🌱", cadence: "daily", doneDates: [] });
  const setReplacement = (next: HabitReplacement) => { setDraft(next); patch({ replacement: next }); };

  if (!r || !r.name) {
    return (
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2 text-base font-semibold">
          <Sprout className="h-5 w-5 text-accent" /> Pair this with a build-habit
        </div>
        <p className="text-sm text-muted-foreground">
          Quitting alone is half the work. Pick a positive habit to grow in the gap — e.g. "quit smoking → 10-min walk daily".
        </p>
        <div className="grid md:grid-cols-[60px_1fr_140px] gap-2">
          <Input value={draft.emoji} maxLength={2} onChange={(e) => setDraft({ ...draft, emoji: e.target.value })} />
          <Input placeholder="Build-habit name (e.g. 10-min walk)" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <select className="h-10 px-3 rounded-md bg-input border border-border text-sm" value={draft.cadence} onChange={(e) => setDraft({ ...draft, cadence: e.target.value as any })}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
        </div>
        <Button onClick={() => { if (draft.name.trim()) setReplacement(draft); }} disabled={!draft.name.trim()}>
          Start build-habit
        </Button>
      </Card>
    );
  }

  const doneToday = r.doneDates.includes(today);
  const last30 = Array.from({ length: 30 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    const k = d.toISOString().slice(0, 10);
    return { k, done: r.doneDates.includes(k) };
  });
  const completed = r.doneDates.length;

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-4xl">{r.emoji}</div>
          <div>
            <div className="text-xl font-bold">{r.name}</div>
            <div className="text-xs text-muted-foreground">{r.cadence} build-habit · {completed} check-ins</div>
          </div>
        </div>
        <Button
          variant={doneToday ? "outline" : "default"}
          onClick={() => setReplacement({ ...r, doneDates: doneToday ? r.doneDates.filter((d) => d !== today) : [...r.doneDates, today] })}
        >
          <Check className="h-4 w-4 mr-1" /> {doneToday ? "Done today ✓" : "Mark done today"}
        </Button>
      </div>

      <div>
        <Label className="text-xs uppercase text-muted-foreground">Last 30 days</Label>
        <div className="mt-2 grid grid-cols-15 gap-1" style={{ gridTemplateColumns: "repeat(15, minmax(0, 1fr))" }}>
          {last30.map((c) => (
            <div key={c.k} title={c.k} className={`aspect-square rounded ${c.done ? "bg-accent" : "bg-secondary"}`} />
          ))}
        </div>
      </div>

      <Button variant="ghost" size="sm" onClick={() => patch({ replacement: undefined })}>
        Remove build-habit
      </Button>
    </Card>
  );
}

function HistoryTab({ habit, relapses, days }: { habit: Habit; relapses: any[]; days: number }) {
  // Build a 12-week calendar heatmap of clean days
  const cells = useMemo(() => {
    const start = new Date(habit.quitDate);
    start.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const totalDays = 84; // 12 weeks
    const arr: { date: Date; clean: boolean; today: boolean }[] = [];
    for (let i = totalDays - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      arr.push({
        date: d,
        clean: d >= start,
        today: d.getTime() === today.getTime(),
      });
    }
    return arr;
  }, [habit.quitDate]);

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <Label className="text-base font-semibold">Last 12 weeks</Label>
        <div className="mt-3 grid grid-cols-[repeat(12,minmax(0,1fr))] gap-1">
          {cells.map((c, i) => (
            <div
              key={i}
              title={`${c.date.toDateString()} — ${c.clean ? "clean" : "before start"}`}
              className={`aspect-square rounded ${c.clean ? "bg-primary/70" : "bg-secondary"} ${c.today ? "ring-2 ring-accent" : ""}`}
            />
          ))}
        </div>
        <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
          <span className="inline-block h-3 w-3 rounded bg-secondary" /> before
          <span className="inline-block h-3 w-3 rounded bg-primary/70" /> clean
          <span>· {days} clean days total</span>
        </div>
      </Card>

      <Card className="p-6">
        <Label className="text-base font-semibold">Relapse log</Label>
        {relapses.length === 0 ? (
          <p className="text-sm text-muted-foreground mt-2">No relapses logged. Every honest reset is data, not failure.</p>
        ) : (
          <div className="space-y-2 mt-3">
            {relapses.map((r) => (
              <div key={r.id} className="p-3 bg-secondary/60 rounded-lg text-sm">
                <div className="font-medium">{new Date(r.date).toLocaleString()}</div>
                {r.trigger && <div className="text-muted-foreground mt-1">Trigger: {r.trigger}</div>}
                {r.lesson && <div className="text-muted-foreground">Lesson: {r.lesson}</div>}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
