import { createFileRoute } from "@tanstack/react-router";
import { useStore, daysSince } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { Brain, Calculator, Quote, Heart, Wrench, ListChecks } from "lucide-react";

export const Route = createFileRoute("/toolkit")({
  head: () => ({ meta: [{ title: "Toolkit — Resurge" }, { name: "description", content: "CBT exercises, cost calculator, future-self letter, and more recovery tools." }] }),
  component: Toolkit,
});

function Toolkit() {
  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-8">
      <header className="flex items-center gap-3">
        <Wrench className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recovery toolkit</h1>
          <p className="text-muted-foreground mt-1">Battle-tested tools for the long game.</p>
        </div>
      </header>

      <CostCalculator />
      <CBTReframe />
      <FutureSelfLetter />
      <HALTCheck />
      <DailyAffirmations />
    </div>
  );
}

function CostCalculator() {
  const [state] = useStore();
  const habit = state.habits[0];
  const [years, setYears] = useState(10);

  if (!habit) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 font-semibold"><Calculator className="h-5 w-5 text-accent" /> Cost calculator</div>
        <p className="text-sm text-muted-foreground mt-2">Add a habit with daily cost to see lifetime savings.</p>
      </Card>
    );
  }

  const daysClean = daysSince(habit.quitDate);
  const saved = daysClean * habit.costPerDay;
  const projected = years * 365 * habit.costPerDay;

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 font-semibold"><Calculator className="h-5 w-5 text-accent" /> Cost calculator</div>
      <p className="text-sm text-muted-foreground mt-1">Tracking <strong>{habit.emoji} {habit.name}</strong> at ${habit.costPerDay}/day.</p>
      <div className="grid md:grid-cols-3 gap-4 mt-5">
        <div className="p-4 rounded-xl bg-secondary text-center">
          <div className="text-xs text-muted-foreground uppercase">Saved so far</div>
          <div className="text-2xl font-bold text-primary mt-1">${saved.toLocaleString()}</div>
        </div>
        <div className="p-4 rounded-xl bg-secondary text-center">
          <div className="text-xs text-muted-foreground uppercase">Per year</div>
          <div className="text-2xl font-bold mt-1">${(habit.costPerDay * 365).toLocaleString()}</div>
        </div>
        <div className="p-4 rounded-xl gradient-streak text-accent-foreground text-center">
          <div className="text-xs uppercase opacity-80">In {years} years</div>
          <div className="text-2xl font-bold mt-1">${projected.toLocaleString()}</div>
        </div>
      </div>
      <div className="mt-4">
        <Label className="text-xs">Project forward: {years} years</Label>
        <input type="range" min={1} max={40} value={years} onChange={(e) => setYears(Number(e.target.value))} className="w-full accent-primary" />
      </div>
    </Card>
  );
}

function CBTReframe() {
  const [thought, setThought] = useState("");
  const [evidence, setEvidence] = useState("");
  const [reframe, setReframe] = useState("");

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 font-semibold"><Brain className="h-5 w-5 text-primary" /> CBT thought reframe</div>
      <p className="text-sm text-muted-foreground mt-1">Catch the lie. Challenge it. Rewrite it.</p>
      <div className="space-y-3 mt-4">
        <div>
          <Label>1. The thought ("I'll never beat this", "Just one won't hurt")</Label>
          <Textarea value={thought} onChange={(e) => setThought(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label>2. Evidence against it</Label>
          <Textarea value={evidence} onChange={(e) => setEvidence(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label>3. The truer, kinder reframe</Label>
          <Textarea value={reframe} onChange={(e) => setReframe(e.target.value)} className="mt-1" />
        </div>
      </div>
    </Card>
  );
}

function FutureSelfLetter() {
  const [text, setText] = useState(() => (typeof window !== "undefined" ? localStorage.getItem("future-letter") || "" : ""));
  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 font-semibold"><Quote className="h-5 w-5 text-accent" /> Letter to your future self</div>
      <p className="text-sm text-muted-foreground mt-1">Write to the version of you 1 year clean. What do they look like? Feel? Have?</p>
      <Textarea
        value={text}
        onChange={(e) => { setText(e.target.value); localStorage.setItem("future-letter", e.target.value); }}
        placeholder="Dear future me..."
        className="mt-3 min-h-[160px]"
      />
      <p className="text-xs text-muted-foreground mt-2">Auto-saved locally.</p>
    </Card>
  );
}

function HALTCheck() {
  const items = [
    { k: "H", label: "Hungry?", desc: "Eat something nourishing." },
    { k: "A", label: "Angry?", desc: "Move it out — walk, punch a pillow, journal." },
    { k: "L", label: "Lonely?", desc: "Reach out to one person." },
    { k: "T", label: "Tired?", desc: "Sleep is non-negotiable. Rest." },
  ];
  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 font-semibold"><ListChecks className="h-5 w-5 text-primary" /> HALT check</div>
      <p className="text-sm text-muted-foreground mt-1">Before reacting to an urge, check the basics.</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
        {items.map((i) => (
          <div key={i.k} className="p-4 rounded-xl bg-secondary text-center">
            <div className="text-4xl font-bold text-primary">{i.k}</div>
            <div className="font-semibold mt-1">{i.label}</div>
            <div className="text-xs text-muted-foreground mt-1">{i.desc}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function DailyAffirmations() {
  const list = [
    "I am not my urges. I am the witness.",
    "Every clean hour is a vote for the person I'm becoming.",
    "Discomfort is the price of freedom. I can pay it.",
    "I have already survived 100% of my worst days.",
    "My future self is built by today's hard choices.",
    "Cravings are guests, not residents. They leave.",
    "I choose myself over the habit. Again. And again.",
  ];
  const [i, setI] = useState(() => Math.floor(Math.random() * list.length));
  return (
    <Card className="p-8 gradient-hero border-primary/30">
      <div className="flex items-center gap-2 font-semibold text-primary"><Heart className="h-5 w-5" /> Affirmation</div>
      <blockquote className="text-2xl md:text-3xl font-bold mt-4 leading-snug">"{list[i]}"</blockquote>
      <Button variant="outline" className="mt-5" onClick={() => setI((i + 1) % list.length)}>Next →</Button>
    </Card>
  );
}
