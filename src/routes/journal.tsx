import { createFileRoute } from "@tanstack/react-router";
import { useStore, uid, todayKey, type JournalEntry } from "@/lib/store";
import { chatJSON, isAIReady } from "@/lib/ai-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useEffect, useMemo, useRef, useState } from "react";
import { BookHeart, Sparkles, Mic, MicOff, Wand2 } from "lucide-react";

export const Route = createFileRoute("/journal")({
  head: () => ({ meta: [{ title: "Journal — Ene me" }, { name: "description", content: "Daily mood, craving, and reflection log." }] }),
  component: Journal,
});

const MOODS = ["😞", "😕", "😐", "🙂", "😄"];
const TRIGGER_OPTIONS = ["Stress", "Boredom", "Loneliness", "Anger", "Tired", "Social", "Hungry", "Habit cue"];

function Journal() {
  const [state, update] = useStore();
  const today = todayKey();
  const existing = state.journal.find((j) => j.date === today);

  const [draft, setDraft] = useState<JournalEntry>(
    existing ?? {
      id: uid(),
      date: today,
      mood: 3,
      craving: 3,
      energy: 3,
      note: "",
      gratitude: "",
      triggers: [],
      createdAt: new Date().toISOString(),
    },
  );

  // Voice input via Web Speech API
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [aiPending, setAiPending] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const recogRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setVoiceSupported(!!SR);
  }, []);

  const toggleListen = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    if (listening) { recogRef.current?.stop(); return; }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = navigator.language || "en-US";
    let finalSoFar = draft.note;
    rec.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalSoFar += (finalSoFar ? " " : "") + t;
        else interim += t;
      }
      setDraft((d) => ({ ...d, note: (finalSoFar + (interim ? " " + interim : "")).trimStart() }));
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recogRef.current = rec;
    rec.start();
    setListening(true);
  };

  const runSummarize = async () => {
    if (!draft.note.trim()) return;
    if (!isAIReady()) { setAiError("Connect an AI provider in AI Provider settings first."); return; }
    setAiPending(true);
    setAiError(null);
    try {
      const res = await chatJSON<{ mood: number; craving: number; energy: number; triggers: string[]; gratitude?: string; summary: string }>([
        {
          role: "system",
          content:
            "You convert a spoken recovery-journal transcript into structured JSON. Be honest, not optimistic. Use the user's own words for the summary. Trigger tags must be short (1-3 words). Output ONLY JSON matching this schema: {\"mood\":1-5 integer,\"craving\":0-10 integer,\"energy\":1-5 integer,\"triggers\":string[<=6],\"gratitude\":string<=280,\"summary\":string<=600}.",
        },
        { role: "user", content: draft.note.slice(0, 8000) },
      ]);
      const merged: JournalEntry = {
        ...draft,
        mood: Math.max(1, Math.min(5, Math.round(res.mood ?? draft.mood))),
        craving: Math.max(0, Math.min(10, Math.round(res.craving ?? draft.craving))),
        energy: Math.max(1, Math.min(5, Math.round(res.energy ?? draft.energy))),
        triggers: Array.from(new Set([...(draft.triggers ?? []), ...(res.triggers ?? [])])).slice(0, 8),
        gratitude: res.gratitude || draft.gratitude,
        note: res.summary || draft.note,
      };
      setDraft(merged);
    } catch (e) {
      setAiError((e as Error).message);
    } finally {
      setAiPending(false);
    }
  };

  const save = () => {
    update((s) => ({
      ...s,
      journal: existing
        ? s.journal.map((j) => (j.date === today ? draft : j))
        : [draft, ...s.journal],
    }));
  };

  const past = useMemo(() => state.journal.filter((j) => j.date !== today).slice(0, 30), [state.journal, today]);
  const avg = useMemo(() => {
    if (state.journal.length === 0) return null;
    const m = state.journal.reduce((s, j) => s + j.mood, 0) / state.journal.length;
    const c = state.journal.reduce((s, j) => s + j.craving, 0) / state.journal.length;
    return { mood: m.toFixed(1), craving: c.toFixed(1), count: state.journal.length };
  }, [state.journal]);

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto space-y-8">
      <header>
        <div className="flex items-center gap-3">
          <BookHeart className="h-7 w-7 text-accent" />
          <h1 className="text-3xl font-bold tracking-tight">Daily check-in</h1>
        </div>
        <p className="text-muted-foreground mt-1">Awareness is the first move. What's true today?</p>
      </header>

      <Card className="p-6 space-y-6">
        <Slider label="Mood" emoji={MOODS[draft.mood - 1]} value={draft.mood} min={1} max={5} onChange={(v) => setDraft({ ...draft, mood: v })} />
        <Slider label="Energy" emoji={"⚡".repeat(draft.energy)} value={draft.energy} min={1} max={5} onChange={(v) => setDraft({ ...draft, energy: v })} />
        <Slider label="Cravings" emoji={draft.craving > 7 ? "🔥" : draft.craving > 4 ? "💨" : "🌊"} value={draft.craving} min={0} max={10} onChange={(v) => setDraft({ ...draft, craving: v })} />

        <div>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Triggers today</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {TRIGGER_OPTIONS.map((t) => {
              const active = draft.triggers.includes(t);
              return (
                <button
                  key={t}
                  onClick={() =>
                    setDraft({
                      ...draft,
                      triggers: active ? draft.triggers.filter((x) => x !== t) : [...draft.triggers, t],
                    })
                  }
                  className={`px-3 py-1.5 rounded-full text-sm border transition ${
                    active ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-secondary"
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <Label>Reflection</Label>
            <div className="flex gap-2">
              {voiceSupported && (
                <Button type="button" variant={listening ? "default" : "outline"} size="sm" onClick={toggleListen} title="Voice input">
                  {listening ? <><MicOff className="h-4 w-4 mr-1" /> Stop</> : <><Mic className="h-4 w-4 mr-1" /> Speak</>}
                </Button>
              )}
              <Button type="button" variant="outline" size="sm" onClick={runSummarize} disabled={aiPending || !draft.note.trim()} title="AI summarize and fill fields">
                <Wand2 className="h-4 w-4 mr-1" /> {aiPending ? "Thinking…" : "AI summarize"}
              </Button>
            </div>
          </div>
          <Textarea
            value={draft.note}
            onChange={(e) => setDraft({ ...draft, note: e.target.value })}
            placeholder="How did today go? What worked? What was hard? — or tap Speak."
            className="mt-1 min-h-[100px]"
          />
          {listening && <p className="text-xs text-accent mt-1">Listening… speak freely.</p>}
          {aiError && <p className="text-xs text-danger mt-1">{aiError}</p>}
        </div>

        <div>
          <Label className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-accent" /> One thing I'm grateful for</Label>
          <Textarea
            value={draft.gratitude}
            onChange={(e) => setDraft({ ...draft, gratitude: e.target.value })}
            placeholder="Even the smallest thing counts."
            className="mt-1"
          />
        </div>

        <Button size="lg" className="w-full" onClick={save}>
          {existing ? "Update today's entry" : "Save today's entry"}
        </Button>
      </Card>

      {avg && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4 text-center">
            <div className="text-xs text-muted-foreground uppercase">Entries</div>
            <div className="text-3xl font-bold">{avg.count}</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-xs text-muted-foreground uppercase">Avg mood</div>
            <div className="text-3xl font-bold">{avg.mood}/5</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-xs text-muted-foreground uppercase">Avg craving</div>
            <div className="text-3xl font-bold">{avg.craving}/10</div>
          </Card>
        </div>
      )}

      {past.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4">Recent entries</h2>
          <div className="space-y-3">
            {past.map((j) => (
              <Card key={j.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">{new Date(j.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</div>
                  <div className="text-sm text-muted-foreground">
                    {MOODS[j.mood - 1]} · craving {j.craving}/10
                  </div>
                </div>
                {j.note && <p className="text-sm mt-2 text-muted-foreground">{j.note}</p>}
                {j.triggers.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {j.triggers.map((t) => (
                      <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-secondary">{t}</span>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Slider({ label, emoji, value, min, max, onChange }: { label: string; emoji: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <span className="text-2xl">{emoji}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full mt-2 accent-primary"
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{min}</span><span className="font-bold text-foreground tabular-nums">{value}</span><span>{max}</span>
      </div>
    </div>
  );
}
