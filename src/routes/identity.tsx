import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useStore, todayKey, type IdentityCheckIn } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { UserCircle, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/identity")({
  head: () => ({
    meta: [
      { title: "Identity — Resurge" },
      { name: "description", content: "Reframe streaks around who you're becoming." },
    ],
  }),
  component: Identity,
});

const PRESETS = [
  "I'm someone who keeps promises to themselves.",
  "I'm someone who feels feelings without numbing them.",
  "I'm someone who chooses my future self over my present urge.",
  "I'm someone who is becoming free.",
  "I'm someone who takes care of my body.",
];

function Identity() {
  const [state, update] = useStore();
  const today = todayKey();
  const todays = state.identityCheckIns.find((c) => c.date === today);
  const [draftNote, setDraftNote] = useState(todays?.note ?? "");
  const [newStatement, setNewStatement] = useState("");

  const statements = state.identityStatements;

  const checkIn = (acted: IdentityCheckIn["acted"]) => {
    update((s) => ({
      ...s,
      identityCheckIns: [
        ...s.identityCheckIns.filter((c) => c.date !== today),
        { date: today, acted, note: draftNote.trim() || undefined },
      ],
    }));
  };

  const addStatement = (text: string) => {
    if (!text.trim()) return;
    update((s) => ({ ...s, identityStatements: [...s.identityStatements, text.trim()] }));
    setNewStatement("");
  };

  const removeStatement = (idx: number) =>
    update((s) => ({ ...s, identityStatements: s.identityStatements.filter((_, i) => i !== idx) }));

  const stats = useMemo(() => {
    const last30 = state.identityCheckIns.slice(-30);
    const yes = last30.filter((c) => c.acted === "yes").length;
    const partial = last30.filter((c) => c.acted === "partial").length;
    const ratio = last30.length ? (yes + partial * 0.5) / last30.length : 0;
    // Identity streak: consecutive days ending today with yes or partial
    const sorted = [...state.identityCheckIns].sort((a, b) => (a.date < b.date ? 1 : -1));
    let streak = 0;
    const cursor = new Date(today + "T12:00:00");
    for (let i = 0; i < 365; i++) {
      const k = cursor.toISOString().slice(0, 10);
      const c = sorted.find((x) => x.date === k);
      if (c && c.acted !== "no") streak++;
      else if (i === 0) break;
      else break;
      cursor.setDate(cursor.getDate() - 1);
    }
    return { yes, partial, total: last30.length, ratio, streak };
  }, [state.identityCheckIns, today]);

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto space-y-6">
      <header className="flex items-center gap-3">
        <UserCircle className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Identity</h1>
          <p className="text-muted-foreground">Stop fighting the habit. Become someone the habit doesn't fit.</p>
        </div>
      </header>

      <div className="grid sm:grid-cols-3 gap-3">
        <Stat label="Identity streak" value={`${stats.streak}d`} />
        <Stat label="Aligned (30d)" value={`${stats.yes + stats.partial}/${stats.total || 0}`} />
        <Stat label="Alignment score" value={`${Math.round(stats.ratio * 100)}%`} />
      </div>

      <Card className="p-6 space-y-4">
        <Label className="text-base font-semibold">Who am I becoming?</Label>
        {statements.length === 0 ? (
          <p className="text-sm text-muted-foreground">No statements yet. Pick a preset or write your own.</p>
        ) : (
          <ul className="space-y-2">
            {statements.map((s, i) => (
              <li key={i} className="flex items-center justify-between p-3 bg-secondary/60 rounded-lg text-sm">
                <span>→ {s}</span>
                <Button variant="ghost" size="sm" onClick={() => removeStatement(i)}>
                  <Trash2 className="h-4 w-4 text-danger" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex gap-2">
          <Input
            value={newStatement}
            onChange={(e) => setNewStatement(e.target.value)}
            placeholder="I'm someone who…"
            onKeyDown={(e) => { if (e.key === "Enter") addStatement(newStatement); }}
          />
          <Button onClick={() => addStatement(newStatement)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          {PRESETS.filter((p) => !statements.includes(p)).map((p) => (
            <button
              key={p}
              onClick={() => addStatement(p)}
              className="px-3 py-1.5 rounded-full text-xs border border-border hover:bg-secondary"
            >
              + {p}
            </button>
          ))}
        </div>
      </Card>

      {statements.length > 0 && (
        <Card className="p-6 space-y-4">
          <div>
            <Label className="text-base font-semibold">Today's check-in</Label>
            <p className="text-sm text-muted-foreground mt-1">Did I act like that person today?</p>
          </div>

          <Textarea
            value={draftNote}
            onChange={(e) => setDraftNote(e.target.value)}
            placeholder="One moment that proves it (or one place I missed)…"
            className="min-h-[80px]"
          />

          <div className="grid grid-cols-3 gap-2">
            <Button
              variant={todays?.acted === "yes" ? "default" : "outline"}
              onClick={() => checkIn("yes")}
            >
              Yes
            </Button>
            <Button
              variant={todays?.acted === "partial" ? "default" : "outline"}
              onClick={() => checkIn("partial")}
            >
              Partly
            </Button>
            <Button
              variant={todays?.acted === "no" ? "default" : "outline"}
              onClick={() => checkIn("no")}
            >
              Not today
            </Button>
          </div>
          {todays && (
            <p className="text-xs text-muted-foreground text-center">Saved. Come back tomorrow.</p>
          )}
        </Card>
      )}

      {state.identityCheckIns.length > 0 && (
        <Card className="p-6">
          <Label className="text-base font-semibold">Last 14 days</Label>
          <div className="mt-3 grid grid-cols-14 gap-1" style={{ gridTemplateColumns: "repeat(14, minmax(0, 1fr))" }}>
            {Array.from({ length: 14 }).map((_, i) => {
              const d = new Date();
              d.setDate(d.getDate() - (13 - i));
              const k = d.toISOString().slice(0, 10);
              const c = state.identityCheckIns.find((x) => x.date === k);
              const color =
                c?.acted === "yes" ? "bg-primary" :
                c?.acted === "partial" ? "bg-primary/50" :
                c?.acted === "no" ? "bg-danger/60" : "bg-secondary";
              return <div key={k} title={`${k}: ${c?.acted ?? "—"}`} className={`aspect-square rounded ${color}`} />;
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4 text-center">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold mt-1 tabular-nums">{value}</div>
    </Card>
  );
}
