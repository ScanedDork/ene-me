import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore, uid, URGE_TIPS } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Wind, Timer, Phone, ChevronLeft, CheckCircle2, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/panic")({
  head: () => ({ meta: [{ title: "Panic Button — Ene me" }, { name: "description", content: "Emergency tools to ride out an urge: breathing, urge-surfing timer, distractions." }] }),
  component: Panic,
});

type Tool = "menu" | "breathe" | "timer" | "surf" | "tips";

function Panic() {
  const [tool, setTool] = useState<Tool>("menu");
  const [craving, setCraving] = useState(7);
  const [, update] = useStore();

  const logOutcome = (outcome: "resisted" | "relapsed", technique: string) => {
    update((s) => ({
      ...s,
      panicLogs: [...s.panicLogs, { id: uid(), date: new Date().toISOString(), craving, technique, outcome }],
    }));
  };

  if (tool !== "menu") {
    return (
      <div className="min-h-screen gradient-panic flex flex-col">
        <div className="p-4">
          <Button variant="ghost" onClick={() => setTool("menu")} className="text-white">
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          {tool === "breathe" && <BreathingTool onDone={(o) => { logOutcome(o, "breathing"); setTool("menu"); }} />}
          {tool === "timer" && <UrgeTimer onDone={(o) => { logOutcome(o, "urge-timer"); setTool("menu"); }} />}
          {tool === "surf" && <UrgeSurf onDone={(o) => { logOutcome(o, "urge-surf"); setTool("menu"); }} />}
          {tool === "tips" && <TipsCard onDone={(o) => { logOutcome(o, "tips"); setTool("menu"); }} />}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-panic">
      <div className="max-w-3xl mx-auto p-6 md:p-10 text-white">
        <div className="flex items-center gap-3">
          <div className="grid place-items-center h-12 w-12 rounded-2xl bg-white/20 backdrop-blur">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">You're stronger than this urge.</h1>
            <p className="opacity-90">Urges peak in 15-20 minutes, then fade. Let's get through this.</p>
          </div>
        </div>

        <div className="mt-8 bg-white/10 backdrop-blur p-5 rounded-2xl">
          <div className="flex justify-between text-sm font-medium">
            <span>How intense is the craving?</span>
            <span className="tabular-nums">{craving}/10</span>
          </div>
          <input
            type="range"
            min={1}
            max={10}
            value={craving}
            onChange={(e) => setCraving(Number(e.target.value))}
            className="w-full mt-3 accent-white"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4 mt-6">
          <PanicTool icon={<Wind />} title="Box Breathing" desc="Calm your nervous system in 60 seconds." onClick={() => setTool("breathe")} />
          <PanicTool icon={<Timer />} title="Urge Timer" desc="Watch the wave pass. Just 15 minutes." onClick={() => setTool("timer")} />
          <PanicTool icon={<ShieldAlert />} title="Urge Surfing" desc="Observe the craving without acting." onClick={() => setTool("surf")} />
          <PanicTool icon={<Phone />} title="Distractions" desc="Tactical moves to break the pattern." onClick={() => setTool("tips")} />
        </div>

        <div className="mt-8 text-center text-sm opacity-90">
          <Link to="/journal" className="underline">Write it out in your journal →</Link>
        </div>
      </div>
    </div>
  );
}

function PanicTool({ icon, title, desc, onClick }: { icon: React.ReactNode; title: string; desc: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-left p-6 rounded-2xl bg-white/10 backdrop-blur hover:bg-white/20 transition border border-white/20"
    >
      <div className="h-10 w-10 grid place-items-center rounded-xl bg-white/20 mb-3">{icon}</div>
      <div className="font-bold text-lg">{title}</div>
      <div className="text-sm opacity-90 mt-1">{desc}</div>
    </button>
  );
}

function OutcomeButtons({ onDone }: { onDone: (o: "resisted" | "relapsed") => void }) {
  return (
    <div className="flex gap-3 mt-6">
      <Button size="lg" className="flex-1 bg-primary text-primary-foreground" onClick={() => onDone("resisted")}>
        <CheckCircle2 className="mr-2 h-5 w-5" /> I resisted
      </Button>
      <Button size="lg" variant="outline" className="flex-1 bg-white/10 text-white border-white/30" onClick={() => onDone("relapsed")}>
        <XCircle className="mr-2 h-5 w-5" /> I slipped
      </Button>
    </div>
  );
}

function BreathingTool({ onDone }: { onDone: (o: "resisted" | "relapsed") => void }) {
  const [phase, setPhase] = useState<"in" | "hold" | "out" | "hold2">("in");
  const [count, setCount] = useState(4);
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setCount((c) => {
        if (c > 1) return c - 1;
        setPhase((p) => {
          const order: typeof p[] = ["in", "hold", "out", "hold2"];
          const next = order[(order.indexOf(p) + 1) % 4];
          if (next === "in") setCycle((x) => x + 1);
          return next;
        });
        return 4;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const label = phase === "in" ? "Breathe in" : phase === "out" ? "Breathe out" : "Hold";

  return (
    <Card className="bg-white/10 backdrop-blur border-white/20 p-10 text-center text-white max-w-md w-full">
      <div className="text-sm uppercase tracking-wider opacity-80">Box breathing · cycle {cycle + 1}</div>
      <div className="my-10 grid place-items-center h-64">
        <div className="h-48 w-48 rounded-full bg-white/20 animate-breathe grid place-items-center">
          <div className="text-center">
            <div className="text-5xl font-bold tabular-nums">{count}</div>
            <div className="text-sm mt-1">{label}</div>
          </div>
        </div>
      </div>
      <p className="text-sm opacity-90">In through nose. Hold. Out through mouth. Hold. Repeat.</p>
      <OutcomeButtons onDone={onDone} />
    </Card>
  );
}

function UrgeTimer({ onDone }: { onDone: (o: "resisted" | "relapsed") => void }) {
  const [seconds, setSeconds] = useState(15 * 60);
  const ref = useRef<number | null>(null);
  useEffect(() => {
    ref.current = window.setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, []);
  const mm = Math.floor(seconds / 60).toString().padStart(2, "0");
  const ss = (seconds % 60).toString().padStart(2, "0");
  const pct = ((15 * 60 - seconds) / (15 * 60)) * 100;

  return (
    <Card className="bg-white/10 backdrop-blur border-white/20 p-10 text-center text-white max-w-md w-full">
      <h2 className="text-2xl font-bold">Ride the wave</h2>
      <p className="text-sm opacity-90 mt-1">The urge will peak and then fall. Stay until the timer ends.</p>
      <div className="my-8 text-6xl font-bold tabular-nums">{mm}:{ss}</div>
      <div className="h-2 bg-white/20 rounded-full overflow-hidden">
        <div className="h-full bg-white transition-all" style={{ width: `${pct}%` }} />
      </div>
      {seconds === 0 && <div className="mt-4 text-2xl">🌊 You did it.</div>}
      <OutcomeButtons onDone={onDone} />
    </Card>
  );
}

function UrgeSurf({ onDone }: { onDone: (o: "resisted" | "relapsed") => void }) {
  const steps = [
    "Notice where you feel the urge in your body. Is it tightness? Heat? Restlessness?",
    "Don't push it away. Don't act on it. Just observe — like a scientist.",
    "Breathe into that exact location. Watch it.",
    "Name the feeling: 'This is a craving for ___. It is not me. It will pass.'",
    "Watch the wave rise. Now watch it slowly fall. You are the ocean, not the wave.",
  ];
  const [i, setI] = useState(0);
  return (
    <Card className="bg-white/10 backdrop-blur border-white/20 p-10 text-white max-w-md w-full">
      <div className="text-sm uppercase tracking-wider opacity-80">Step {i + 1} of {steps.length}</div>
      <p className="text-xl leading-relaxed mt-4 min-h-[150px]">{steps[i]}</p>
      <div className="flex gap-2 mt-6">
        {i > 0 && <Button variant="outline" className="bg-white/10 text-white border-white/30" onClick={() => setI(i - 1)}>Back</Button>}
        {i < steps.length - 1 ? (
          <Button className="flex-1" onClick={() => setI(i + 1)}>Next</Button>
        ) : (
          <div className="flex-1"><OutcomeButtons onDone={onDone} /></div>
        )}
      </div>
    </Card>
  );
}

function TipsCard({ onDone }: { onDone: (o: "resisted" | "relapsed") => void }) {
  return (
    <Card className="bg-white/10 backdrop-blur border-white/20 p-8 text-white max-w-md w-full">
      <h2 className="text-2xl font-bold">Break the pattern. Right now.</h2>
      <ul className="mt-4 space-y-3">
        {URGE_TIPS.map((t, i) => (
          <li key={i} className="flex gap-3 p-3 bg-white/10 rounded-lg">
            <span className="font-bold opacity-70">{i + 1}.</span>
            <span className="text-sm">{t}</span>
          </li>
        ))}
      </ul>
      <OutcomeButtons onDone={onDone} />
    </Card>
  );
}
