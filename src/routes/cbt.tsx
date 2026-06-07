import { createFileRoute } from "@tanstack/react-router";
import { useStore, COGNITIVE_DISTORTIONS, uid, todayKey, type CBTSession } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Brain, ArrowRight, ArrowLeft, Check, History, Wand2 } from "lucide-react";
import { useState } from "react";
import { chat, isAIReady } from "@/lib/ai-client";

export const Route = createFileRoute("/cbt")({
  head: () => ({ meta: [{ title: "CBT — Resurge" }, { name: "description", content: "Guided cognitive reframe: map the urge, name the distortion, rewrite the thought." }] }),
  component: CBT,
});

const STEPS = ["Urge", "Thought", "Distortions", "Evidence", "Reframe", "Action"] as const;

function CBT() {
  const [state, update] = useStore();
  const [step, setStep] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [draft, setDraft] = useState<CBTSession>({
    id: uid(),
    date: todayKey(),
    urge: "",
    thought: "",
    distortions: [],
    evidenceFor: "",
    evidenceAgainst: "",
    reframe: "",
    action: "",
    intensityBefore: 5,
    intensityAfter: 5,
  });

  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const prev = () => setStep((s) => Math.max(0, s - 1));

  const save = () => {
    update((s) => ({ ...s, cbtSessions: [draft, ...s.cbtSessions] }));
    setDraft({ ...draft, id: uid() });
    setStep(0);
    setShowHistory(true);
  };

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto space-y-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Brain className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Guided CBT</h1>
            <p className="text-muted-foreground">Catch the thought. Challenge it. Rewrite it.</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowHistory((v) => !v)}>
          <History className="mr-2 h-4 w-4" /> {showHistory ? "New session" : `History (${state.cbtSessions.length})`}
        </Button>
      </header>

      {showHistory ? (
        <HistoryView sessions={state.cbtSessions} onNew={() => setShowHistory(false)} />
      ) : (
        <>
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => (
              <div key={s} className="flex-1">
                <div className={`h-2 rounded-full ${i <= step ? "bg-primary" : "bg-secondary"}`} />
                <div className={`text-xs mt-1 text-center ${i === step ? "text-primary font-semibold" : "text-muted-foreground"}`}>{s}</div>
              </div>
            ))}
          </div>

          <Card className="p-6 md:p-8 min-h-[300px]">
            {step === 0 && (
              <StepUrge draft={draft} setDraft={setDraft} />
            )}
            {step === 1 && (
              <div>
                <Label className="text-lg">What's the automatic thought behind that urge?</Label>
                <p className="text-sm text-muted-foreground mt-1">e.g. "I've had a hard day, I deserve this", "I can't handle this feeling".</p>
                <Textarea value={draft.thought} onChange={(e) => setDraft({ ...draft, thought: e.target.value })} className="mt-3 min-h-[140px]" />
              </div>
            )}
            {step === 2 && (
              <div>
                <Label className="text-lg">Which distortions is the thought using?</Label>
                <p className="text-sm text-muted-foreground mt-1">Tap any that fit.</p>
                <div className="grid sm:grid-cols-2 gap-2 mt-3">
                  {COGNITIVE_DISTORTIONS.map((d) => {
                    const active = draft.distortions.includes(d.key);
                    return (
                      <button
                        key={d.key}
                        onClick={() => setDraft({
                          ...draft,
                          distortions: active
                            ? draft.distortions.filter((x) => x !== d.key)
                            : [...draft.distortions, d.key],
                        })}
                        className={`text-left p-3 rounded-lg border transition ${active ? "border-primary bg-primary/10" : "border-border hover:bg-secondary"}`}
                      >
                        <div className="font-semibold text-sm">{d.label}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{d.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {step === 3 && (
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-lg">Evidence FOR the thought</Label>
                  <Textarea value={draft.evidenceFor} onChange={(e) => setDraft({ ...draft, evidenceFor: e.target.value })} className="mt-2 min-h-[160px]" placeholder="What makes it feel true?" />
                </div>
                <div>
                  <Label className="text-lg">Evidence AGAINST</Label>
                  <Textarea value={draft.evidenceAgainst} onChange={(e) => setDraft({ ...draft, evidenceAgainst: e.target.value })} className="mt-2 min-h-[160px]" placeholder="When has it been wrong before?" />
                </div>
              </div>
            )}
            {step === 4 && (
              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-lg">Write a balanced, truer reframe</Label>
                  <AIReframeButton draft={draft} onSuggest={(text) => setDraft({ ...draft, reframe: text })} />
                </div>
                <p className="text-sm text-muted-foreground mt-1">Not toxic positivity — something you actually believe.</p>
                <Textarea value={draft.reframe} onChange={(e) => setDraft({ ...draft, reframe: e.target.value })} className="mt-3 min-h-[140px]" placeholder='e.g. "Today was hard, AND I can handle hard feelings without using."' />
              </div>
            )}
            {step === 5 && (
              <div className="space-y-4">
                <div>
                  <Label className="text-lg">One concrete action right now</Label>
                  <Textarea value={draft.action} onChange={(e) => setDraft({ ...draft, action: e.target.value })} className="mt-2" placeholder="Go for a walk, call X, drink water, etc." />
                </div>
                <div>
                  <Label>Urge intensity now (0-10): <strong>{draft.intensityAfter}</strong></Label>
                  <input type="range" min={0} max={10} value={draft.intensityAfter} onChange={(e) => setDraft({ ...draft, intensityAfter: Number(e.target.value) })} className="w-full mt-2 accent-primary" />
                  <div className="text-sm text-muted-foreground mt-1">Started at {draft.intensityBefore}/10 · {draft.intensityBefore - draft.intensityAfter > 0 ? `down ${draft.intensityBefore - draft.intensityAfter}` : "no drop yet"}</div>
                </div>
              </div>
            )}
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={prev} disabled={step === 0}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={next}>Next <ArrowRight className="ml-2 h-4 w-4" /></Button>
            ) : (
              <Button onClick={save}><Check className="mr-2 h-4 w-4" /> Save session</Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StepUrge({ draft, setDraft }: { draft: CBTSession; setDraft: (d: CBTSession) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-lg">What's the urge right now?</Label>
        <p className="text-sm text-muted-foreground mt-1">Name it specifically. What, when, where.</p>
        <Textarea value={draft.urge} onChange={(e) => setDraft({ ...draft, urge: e.target.value })} className="mt-3 min-h-[120px]" />
      </div>
      <div>
        <Label>Intensity (0-10): <strong>{draft.intensityBefore}</strong></Label>
        <input type="range" min={0} max={10} value={draft.intensityBefore} onChange={(e) => setDraft({ ...draft, intensityBefore: Number(e.target.value), intensityAfter: Number(e.target.value) })} className="w-full mt-2 accent-primary" />
      </div>
    </div>
  );
}

function AIReframeButton({ draft, onSuggest }: { draft: CBTSession; onSuggest: (text: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (!isAIReady()) return null;
  const run = async () => {
    setBusy(true); setErr(null);
    try {
      const distortionLabels = draft.distortions
        .map((k) => COGNITIVE_DISTORTIONS.find((d) => d.key === k)?.label)
        .filter(Boolean)
        .join(", ");
      const reply = await chat([
        { role: "system", content: "You are a CBT coach. Given a user's urge, automatic thought, distortions, and evidence, write ONE balanced, believable reframe in 1-2 sentences. Avoid toxic positivity. Use the user's voice. Output ONLY the reframe sentence, no preamble." },
        { role: "user", content: `Urge: ${draft.urge}\nThought: ${draft.thought}\nDistortions: ${distortionLabels}\nEvidence for: ${draft.evidenceFor}\nEvidence against: ${draft.evidenceAgainst}` },
      ]);
      onSuggest(reply.replace(/^["']|["']$/g, ""));
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  };
  return (
    <div className="flex items-center gap-2">
      {err && <span className="text-[11px] text-danger max-w-[200px] truncate">{err}</span>}
      <Button type="button" size="sm" variant="outline" onClick={run} disabled={busy}>
        <Wand2 className="h-4 w-4 mr-1" /> {busy ? "Thinking…" : "AI reframe"}
      </Button>
    </div>
  );
}

function HistoryView({ sessions, onNew }: { sessions: CBTSession[]; onNew: () => void }) {
  if (sessions.length === 0) {
    return (
      <Card className="p-10 text-center">
        <p className="text-muted-foreground">No sessions yet.</p>
        <Button className="mt-4" onClick={onNew}>Start one</Button>
      </Card>
    );
  }
  return (
    <div className="space-y-3">
      {sessions.map((s) => (
        <Card key={s.id} className="p-5">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">{new Date(s.date).toLocaleDateString()}</div>
            <div className="text-xs text-muted-foreground">{s.intensityBefore} → {s.intensityAfter} /10</div>
          </div>
          {s.thought && <div className="mt-2 text-sm"><span className="text-muted-foreground">Thought:</span> {s.thought}</div>}
          {s.reframe && <div className="mt-1 text-sm text-primary">Reframe: {s.reframe}</div>}
          {s.distortions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {s.distortions.map((d) => {
                const meta = COGNITIVE_DISTORTIONS.find((x) => x.key === d);
                return <span key={d} className="text-xs px-2 py-0.5 rounded-full bg-secondary">{meta?.label ?? d}</span>;
              })}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
