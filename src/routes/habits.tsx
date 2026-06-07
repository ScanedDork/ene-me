import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useStore, daysSince, HABIT_PRESETS, uid, type Habit } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, RotateCcw, Target, ChevronRight } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/habits")({
  head: () => ({ meta: [{ title: "My Habits — Ene me" }, { name: "description", content: "Track every habit you're breaking." }] }),
  component: Habits,
});

function Habits() {
  const [state, update] = useStore();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Your habits</h1>
          <p className="text-muted-foreground mt-1">Every battle deserves a name. And a why.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Add habit</Button>
          </DialogTrigger>
          <NewHabitDialog onClose={() => setOpen(false)} />
        </Dialog>
      </header>

      {state.habits.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-2">
          <Target className="h-10 w-10 text-muted-foreground mx-auto" />
          <h3 className="text-xl font-semibold mt-3">No habits yet</h3>
          <p className="text-muted-foreground">Click "Add habit" to choose your first battle.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {state.habits.map((h) => (
            <HabitCard
              key={h.id}
              habit={h}
              onUpdate={(next) =>
                update((s) => ({ ...s, habits: s.habits.map((x) => (x.id === h.id ? next : x)) }))
              }
              onDelete={() =>
                update((s) => ({ ...s, habits: s.habits.filter((x) => x.id !== h.id) }))
              }
              onRelapse={() => navigate({ to: "/relapse/$habitId", params: { habitId: h.id } })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function HabitCard({
  habit,
  onUpdate,
  onDelete,
  onRelapse,
}: {
  habit: Habit;
  onUpdate: (h: Habit) => void;
  onDelete: () => void;
  onRelapse: () => void;
}) {
  const [newReason, setNewReason] = useState("");
  const d = daysSince(habit.quitDate);

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="text-4xl">{habit.emoji}</div>
          <div>
            <h3 className="text-xl font-bold">{habit.name}</h3>
            <div className="text-sm text-muted-foreground">{habit.category} · since {new Date(habit.quitDate).toLocaleDateString()}</div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-primary tabular-nums">{d}</span>
              <span className="text-sm text-muted-foreground">days clean</span>
              {habit.costPerDay > 0 && (
                <span className="ml-3 text-sm text-accent">· ${(d * habit.costPerDay).toLocaleString()} saved</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link to="/habits/$habitId" params={{ habitId: habit.id }}>
            <Button variant="outline" size="sm" title="Open detail page">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={onRelapse} title="Reset streak (relapse)">
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-danger" />
          </Button>
        </div>
      </div>

      <div className="mt-5">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Why I'm quitting</Label>
        <ul className="mt-2 space-y-1">
          {habit.whyReasons.map((r, i) => (
            <li key={i} className="flex items-center justify-between bg-secondary/60 px-3 py-2 rounded-lg text-sm">
              <span>→ {r}</span>
              <button
                onClick={() => onUpdate({ ...habit, whyReasons: habit.whyReasons.filter((_, ix) => ix !== i) })}
                className="text-muted-foreground hover:text-danger text-xs"
              >
                remove
              </button>
            </li>
          ))}
        </ul>
        <div className="flex gap-2 mt-2">
          <Input
            value={newReason}
            onChange={(e) => setNewReason(e.target.value)}
            placeholder="Add a reason — your future self will thank you"
            onKeyDown={(e) => {
              if (e.key === "Enter" && newReason.trim()) {
                onUpdate({ ...habit, whyReasons: [...habit.whyReasons, newReason.trim()] });
                setNewReason("");
              }
            }}
          />
          <Button
            variant="outline"
            onClick={() => {
              if (newReason.trim()) {
                onUpdate({ ...habit, whyReasons: [...habit.whyReasons, newReason.trim()] });
                setNewReason("");
              }
            }}
          >
            Add
          </Button>
        </div>
      </div>
    </Card>
  );
}

function NewHabitDialog({ onClose }: { onClose: () => void }) {
  const [, update] = useStore();
  const [preset, setPreset] = useState<(typeof HABIT_PRESETS)[number] | null>(null);
  const [custom, setCustom] = useState({ name: "", emoji: "🎯", costPerDay: 0 });
  const [reason, setReason] = useState("");

  const add = (h: Omit<Habit, "id" | "createdAt" | "quitDate" | "whyReasons">) => {
    update((s) => ({
      ...s,
      habits: [
        ...s.habits,
        {
          ...h,
          id: uid(),
          createdAt: new Date().toISOString(),
          quitDate: new Date().toISOString(),
          whyReasons: reason.trim() ? [reason.trim()] : [],
        },
      ],
    }));
    onClose();
  };

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>Choose your battle</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Presets</Label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {HABIT_PRESETS.map((p) => (
              <button
                key={p.name}
                onClick={() => setPreset(p)}
                className={`text-left p-3 rounded-lg border transition ${
                  preset?.name === p.name ? "border-primary bg-primary/10" : "border-border hover:bg-secondary"
                }`}
              >
                <div className="text-xl">{p.emoji}</div>
                <div className="text-sm font-medium mt-1">{p.name}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Or custom</Label>
          <div className="grid grid-cols-[60px_1fr_100px] gap-2 mt-2">
            <Input value={custom.emoji} onChange={(e) => setCustom({ ...custom, emoji: e.target.value })} />
            <Input placeholder="Habit name" value={custom.name} onChange={(e) => setCustom({ ...custom, name: e.target.value })} />
            <Input type="number" placeholder="$/day" value={custom.costPerDay || ""} onChange={(e) => setCustom({ ...custom, costPerDay: Number(e.target.value) || 0 })} />
          </div>
        </div>

        <div>
          <Label>First reason (optional)</Label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why are you quitting?"
            className="mt-1"
          />
        </div>

        <Button
          className="w-full"
          size="lg"
          disabled={!preset && !custom.name.trim()}
          onClick={() => {
            if (preset) {
              add({ name: preset.name, emoji: preset.emoji, category: preset.category, costPerDay: preset.costPerDay, unit: preset.unit, unitsPerDay: preset.unitsPerDay });
            } else {
              add({ name: custom.name.trim(), emoji: custom.emoji, category: "Custom", costPerDay: custom.costPerDay });
            }
          }}
        >
          Start the clock
        </Button>
      </div>
    </DialogContent>
  );
}
