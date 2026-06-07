import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { useStore, uid, daysSince } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Heart, ArrowRight, ArrowLeft, RotateCcw, AlertTriangle, Volume2 } from "lucide-react";

export const Route = createFileRoute("/relapse/$habitId")({
  head: () => ({
    meta: [
      { title: "Relapse post-mortem — Resurge" },
      { name: "description", content: "Honest, non-shaming wizard to learn from a slip and update your recovery plan." },
    ],
  }),
  component: RelapsePostMortem,
});

const STEPS = [
  { key: "feeling", q: "What were you feeling just before?", hint: "Anger, loneliness, boredom, sadness, joy?" },
  { key: "location", q: "Where were you? Who was around?", hint: "Place and context." },
  { key: "whatHappened", q: "What happened, exactly?", hint: "Tell it like a story. No judgment." },
  { key: "couldHaveDone", q: "Looking back — what could you have done differently?", hint: "Be specific. One concrete thing." },
  { key: "nextTimePlan", q: "Next time this trigger appears, my plan is…", hint: "Write the If/Then. This becomes your new rule." },
] as const;

const CRISIS_SECONDS = 60;

function RelapsePostMortem() {
  const { habitId } = Route.useParams();
  const [state, update] = useStore();
  const navigate = useNavigate();
  const habit = state.habits.find((h) => h.id === habitId);

  // Phase: 'crisis' (mandatory pause) → 'wizard' (debrief) → 'done'
  const [phase, setPhase] = useState<"crisis" | "wizard" | "done">("crisis");
  const [step, setStep] = useState(0);
  const [data, setData] = useState({
    feeling: "", location: "", whatHappened: "", couldHaveDone: "", nextTimePlan: "", trigger: "",
  });

  // Crisis-mode countdown + hold-to-confirm
  const [remaining, setRemaining] = useState(CRISIS_SECONDS);
  const [holdProgress, setHoldProgress] = useState(0);
  const holdRef = useRef<number | null>(null);

  useEffect(() => {
    if (phase !== "crisis") return;
    const t = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(t);
  }, [phase]);

  const speakReasons = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window) || !habit) return;
    window.speechSynthesis.cancel();
    const reasons = habit.whyReasons.length ? habit.whyReasons : ["I started this for a reason."];
    const utterance = new SpeechSynthesisUtterance(
      `These are your reasons. ${reasons.join(". ")}. You are still in control.`,
    );
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  const startHold = () => {
    if (remaining > 0) return;
    if (holdRef.current) return;
    const startedAt = Date.now();
    holdRef.current = window.setInterval(() => {
      const pct = Math.min(100, ((Date.now() - startedAt) / 2000) * 100);
      setHoldProgress(pct);
      if (pct >= 100) {
        stopHold();
        setPhase("wizard");
      }
    }, 50);
  };
  const stopHold = () => {
    if (holdRef.current) { clearInterval(holdRef.current); holdRef.current = null; }
    setHoldProgress(0);
  };

  if (!habit) {
    return (
      <div className="p-10 max-w-2xl mx-auto">
        <p className="text-muted-foreground">Habit not found.</p>
        <Link to="/habits"><Button variant="outline" className="mt-4"><ArrowLeft className="mr-2 h-4 w-4" /> Back to habits</Button></Link>
      </div>
    );
  }

  if (phase === "crisis") {
    const days = daysSince(habit.quitDate);
    const longest = Math.max(habit.longestStreak ?? 0, days);
    return (
      <div className="p-6 md:p-10 max-w-2xl mx-auto space-y-6">
        <Card className="p-8 border-danger/40">
          <div className="flex items-center gap-3 text-danger">
            <AlertTriangle className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Pause. Read this first.</h1>
          </div>
          <p className="text-muted-foreground mt-3">
            Before resetting the clock — sit with this for 60 seconds. The urge is loudest right before it fades.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-secondary text-center">
              <div className="text-xs uppercase text-muted-foreground">Current streak</div>
              <div className="text-4xl font-bold tabular-nums mt-1">{days}<span className="text-lg">d</span></div>
            </div>
            <div className="p-4 rounded-xl bg-secondary text-center">
              <div className="text-xs uppercase text-muted-foreground">Longest ever</div>
              <div className="text-4xl font-bold tabular-nums mt-1">{longest}<span className="text-lg">d</span></div>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Why you started</Label>
              <Button variant="ghost" size="sm" onClick={speakReasons} title="Read aloud">
                <Volume2 className="h-4 w-4 mr-1" /> Read aloud
              </Button>
            </div>
            {habit.whyReasons.length === 0 ? (
              <p className="text-sm text-muted-foreground mt-2">No reasons logged. Edit this habit and add some — your future self will use them.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {habit.whyReasons.map((r, i) => (
                  <li key={i} className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-sm">→ {r}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <Button variant="outline" size="lg" onClick={() => navigate({ to: "/panic" })}>
              I'm still fighting — take me to the panic toolkit
            </Button>
            <Button variant="outline" onClick={() => navigate({ to: "/coach" })}>
              Talk to the coach instead
            </Button>
          </div>

          <div className="mt-8 border-t border-border pt-6">
            <div className="text-xs uppercase tracking-wider text-muted-foreground text-center">
              If you truly slipped — be honest
            </div>
            <div className="relative mt-4">
              <button
                disabled={remaining > 0}
                onMouseDown={startHold}
                onMouseUp={stopHold}
                onMouseLeave={stopHold}
                onTouchStart={startHold}
                onTouchEnd={stopHold}
                className={`w-full h-14 rounded-xl font-semibold relative overflow-hidden transition ${
                  remaining > 0
                    ? "bg-secondary text-muted-foreground cursor-not-allowed"
                    : "bg-danger text-danger-foreground hover:opacity-90"
                }`}
              >
                <span
                  className="absolute inset-y-0 left-0 bg-danger-foreground/20 transition-[width] duration-75"
                  style={{ width: `${holdProgress}%` }}
                />
                <span className="relative">
                  {remaining > 0 ? `Wait ${remaining}s…` : "Hold to admit a relapse"}
                </span>
              </button>
              <p className="text-xs text-muted-foreground text-center mt-2">
                {remaining > 0 ? "The button unlocks when the pause ends." : "Press and hold for 2 seconds."}
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="p-6 md:p-10 max-w-2xl mx-auto">
        <Card className="p-8 text-center">
          <Heart className="h-10 w-10 text-danger mx-auto" />
          <h1 className="text-2xl font-bold mt-3">A slip is not a fall.</h1>
          <p className="text-muted-foreground mt-2">
            You showed up to be honest with yourself. That matters more than the streak number. The clock starts again — wiser this time.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Button onClick={() => navigate({ to: "/habits/$habitId", params: { habitId: habit.id } })}>
              Open recovery plan
            </Button>
            <Button variant="outline" onClick={() => navigate({ to: "/habits" })}>
              Back to habits
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // wizard
  const cur = STEPS[step];
  const value = data[cur.key];

  const commit = () => {
    const priorDays = daysSince(habit.quitDate);
    update((s) => ({
      ...s,
      habits: s.habits.map((x) =>
        x.id === habit.id
          ? { ...x, quitDate: new Date().toISOString(), longestStreak: Math.max(x.longestStreak ?? 0, priorDays) }
          : x,
      ),
      relapses: [
        ...s.relapses,
        {
          id: uid(),
          habitId: habit.id,
          date: new Date().toISOString(),
          trigger: data.trigger || data.feeling,
          lesson: data.couldHaveDone,
          streakLength: priorDays,
          postMortem: {
            feeling: data.feeling,
            location: data.location,
            whatHappened: data.whatHappened,
            couldHaveDone: data.couldHaveDone,
            nextTimePlan: data.nextTimePlan,
          },
        },
      ],
    }));
    setPhase("done");
  };

  return (
    <div className="p-6 md:p-10 max-w-2xl mx-auto space-y-6">
      <header>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Post-mortem — {habit.name}</div>
        <h1 className="text-2xl font-bold mt-1 flex items-center gap-2">
          <RotateCcw className="h-5 w-5 text-danger" /> Step {step + 1} of {STEPS.length}
        </h1>
        <div className="mt-3 h-1.5 rounded-full bg-secondary overflow-hidden">
          <div className="h-full gradient-streak" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>
      </header>

      <Card className="p-6 space-y-4">
        <div>
          <Label className="text-base">{cur.q}</Label>
          <p className="text-xs text-muted-foreground mt-1">{cur.hint}</p>
          <Textarea
            autoFocus
            className="mt-3 min-h-[120px]"
            value={value}
            onChange={(e) => setData({ ...data, [cur.key]: e.target.value })}
            placeholder="Write honestly. This is for you."
          />
        </div>

        {step === 0 && (
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Quick tag (optional)</Label>
            <Input
              value={data.trigger}
              onChange={(e) => setData({ ...data, trigger: e.target.value })}
              placeholder="e.g. work stress, party, loneliness"
              className="mt-2"
            />
          </div>
        )}

        <div className="flex justify-between pt-2">
          <Button
            variant="ghost"
            onClick={() => (step === 0 ? setPhase("crisis") : setStep((s) => s - 1))}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!value.trim()}>
              Next <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={commit} disabled={!value.trim()}>
              Save & reset clock
            </Button>
          )}
        </div>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        Honesty &gt; perfection. Every slip is data for the next streak.
      </p>
    </div>
  );
}
