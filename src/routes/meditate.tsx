import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { MEDITATIONS, type MeditationSession } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, Wind } from "lucide-react";

export const Route = createFileRoute("/meditate")({
  head: () => ({
    meta: [
      { title: "Meditate — Resurge" },
      { name: "description", content: "Guided breathing and meditation sessions to ride out urges and calm the mind." },
    ],
  }),
  component: Meditate,
});

function Meditate() {
  const [active, setActive] = useState<MeditationSession | null>(null);

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Wind className="h-7 w-7 text-primary" /> Meditation library
        </h1>
        <p className="text-muted-foreground mt-1">A handful of practices — pick one and start. The body comes first.</p>
      </header>

      {active ? (
        <Player session={active} onExit={() => setActive(null)} />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {MEDITATIONS.map((m) => (
            <Card key={m.id} className="p-5 hover:border-primary/50 transition cursor-pointer" onClick={() => setActive(m)}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">{m.category}</div>
                  <h3 className="text-xl font-bold mt-1">{m.title}</h3>
                </div>
                <span className="text-sm text-muted-foreground">{m.durationMin} min</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">{m.description}</p>
              <Button size="sm" className="mt-4">
                <Play className="h-4 w-4 mr-1" /> Begin
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Player({ session, onExit }: { session: MeditationSession; onExit: () => void }) {
  const [stepIdx, setStepIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(true);
  const timerRef = useRef<number | null>(null);

  const isCycle = session.id === "box-4" || session.id === "478" || session.id === "coherent";
  const totalSeconds = isCycle
    ? session.durationMin * 60
    : session.steps.reduce((s, st) => s + st.seconds, 0);

  useEffect(() => {
    if (!playing) return;
    timerRef.current = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [playing]);

  useEffect(() => {
    if (isCycle) {
      // Cycle through steps repeatedly
      const cycle = session.steps.reduce((s, st) => s + st.seconds, 0);
      const within = elapsed % cycle;
      let acc = 0;
      for (let i = 0; i < session.steps.length; i++) {
        acc += session.steps[i].seconds;
        if (within < acc) {
          setStepIdx(i);
          break;
        }
      }
      if (elapsed >= totalSeconds) setPlaying(false);
    } else {
      let acc = 0;
      for (let i = 0; i < session.steps.length; i++) {
        acc += session.steps[i].seconds;
        if (elapsed < acc) {
          setStepIdx(i);
          return;
        }
      }
      setPlaying(false);
    }
  }, [elapsed, session, isCycle, totalSeconds]);

  const current = session.steps[stepIdx];
  const remaining = Math.max(0, totalSeconds - elapsed);
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  const ringSize = 220;
  const stepProgress = (() => {
    const cycle = session.steps.reduce((s, st) => s + st.seconds, 0);
    const within = isCycle ? elapsed % cycle : elapsed;
    let before = 0;
    for (let i = 0; i < stepIdx; i++) before += session.steps[i].seconds;
    return (within - before) / current.seconds;
  })();

  return (
    <Card className="p-8 text-center">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{session.title}</div>
      <h2 className="text-2xl font-bold mt-1">{current.label}</h2>

      <div className="mx-auto mt-8 relative" style={{ width: ringSize, height: ringSize }}>
        <div
          className="absolute inset-0 rounded-full gradient-streak"
          style={{
            transform: `scale(${0.55 + stepProgress * 0.45})`,
            transition: "transform 1s linear",
            opacity: 0.85,
          }}
        />
        <div className="absolute inset-0 grid place-items-center">
          <div className="text-5xl font-bold tabular-nums">
            {mm}:{ss}
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-center gap-2">
        <Button variant="outline" onClick={() => setPlaying((p) => !p)}>
          {playing ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
          {playing ? "Pause" : "Resume"}
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setElapsed(0);
            setStepIdx(0);
            setPlaying(true);
          }}
        >
          <RotateCcw className="h-4 w-4 mr-1" /> Restart
        </Button>
        <Button variant="ghost" onClick={onExit}>
          End
        </Button>
      </div>
    </Card>
  );
}
