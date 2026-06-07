import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useStore, daysSince } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check, Flame, Trophy, Heart, Share2 } from "lucide-react";

export const Route = createFileRoute("/share")({
  head: () => ({
    meta: [
      { title: "Share your progress — Resurge" },
      { name: "description", content: "Generate a read-only link to share your recovery streak with an accountability partner." },
    ],
  }),
  component: SharePage,
});

type Payload = {
  name: string;
  habits: { name: string; emoji: string; days: number }[];
  generatedAt: string;
};

function encode(p: Payload): string {
  try {
    return btoa(unescape(encodeURIComponent(JSON.stringify(p))));
  } catch {
    return "";
  }
}
function decode(s: string): Payload | null {
  try {
    return JSON.parse(decodeURIComponent(escape(atob(s)))) as Payload;
  } catch {
    return null;
  }
}

function SharePage() {
  const [state] = useStore();
  const [copied, setCopied] = useState(false);
  const [incoming, setIncoming] = useState<Payload | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.replace(/^#/, "");
    if (hash) setIncoming(decode(hash));
  }, []);

  const payload: Payload = useMemo(
    () => ({
      name: state.userName || "Someone in recovery",
      habits: state.habits.map((h) => ({ name: h.name, emoji: h.emoji, days: daysSince(h.quitDate) })),
      generatedAt: new Date().toISOString(),
    }),
    [state],
  );

  const url = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/share#${encode(payload)}`;
  }, [payload]);

  if (incoming) return <ReadOnlyView p={incoming} />;

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Share2 className="h-6 w-6 text-primary" /> Share your progress
        </h1>
        <p className="text-muted-foreground mt-1">
          Generate a private, read-only link. Your accountability partner sees your streaks — and nothing else.
        </p>
      </header>

      <Card className="p-5">
        <Preview p={payload} />
      </Card>

      <Card className="p-5 space-y-3">
        <label className="text-xs uppercase tracking-wider text-muted-foreground">Shareable link</label>
        <div className="flex gap-2">
          <input readOnly value={url} className="flex-1 h-10 px-3 rounded-md bg-input border border-border text-xs font-mono" />
          <Button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(url);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              } catch {
                /* ignore */
              }
            }}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          The link encodes a snapshot of your streaks in the URL. No server stores it. Regenerate any time.
        </p>
      </Card>
    </div>
  );
}

function Preview({ p }: { p: Payload }) {
  const top = p.habits.reduce((m, h) => Math.max(m, h.days), 0);
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">In recovery</div>
          <div className="text-xl font-bold">{p.name}</div>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Top streak</div>
          <div className="text-2xl font-bold text-primary">{top}d</div>
        </div>
      </div>
      <div className="mt-4 grid sm:grid-cols-2 gap-2">
        {p.habits.map((h, i) => (
          <div key={i} className="flex items-center gap-3 bg-secondary/60 px-3 py-2 rounded-lg">
            <span className="text-2xl">{h.emoji}</span>
            <div className="flex-1">
              <div className="text-sm font-medium">{h.name}</div>
              <div className="text-xs text-muted-foreground">{h.days} days clean</div>
            </div>
            <Flame className="h-4 w-4 text-primary" />
          </div>
        ))}
        {p.habits.length === 0 && <div className="text-sm text-muted-foreground">No habits tracked yet.</div>}
      </div>
    </div>
  );
}

function ReadOnlyView({ p }: { p: Payload }) {
  return (
    <div className="p-6 md:p-10 max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <div className="grid place-items-center h-14 w-14 rounded-2xl gradient-streak text-accent-foreground mx-auto">
          <Trophy className="h-7 w-7" />
        </div>
        <h1 className="text-3xl font-bold mt-4">{p.name} is in recovery</h1>
        <p className="text-muted-foreground mt-1">A read-only snapshot. Send them encouragement.</p>
      </div>

      <Card className="p-6">
        <Preview p={p} />
      </Card>

      <Card className="p-5 text-center">
        <Heart className="h-6 w-6 mx-auto text-danger" />
        <p className="mt-2 font-medium">Send them a message</p>
        <p className="text-sm text-muted-foreground mt-1">
          A "proud of you" text right now might mean more than you know.
        </p>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        Snapshot generated {new Date(p.generatedAt).toLocaleString()}.
      </p>
    </div>
  );
}
