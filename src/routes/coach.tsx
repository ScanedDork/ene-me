import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useStore, daysSince } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Send, Bot, User as UserIcon, Cpu } from "lucide-react";
import { chat, isAIReady, type ChatMessage } from "@/lib/ai-client";

export const Route = createFileRoute("/coach")({
  head: () => ({
    meta: [
      { title: "AI Urge Coach — Ene me" },
      { name: "description", content: "A non-judgmental AI sponsor powered by your own provider." },
    ],
  }),
  component: Coach,
});

type Msg = { role: "user" | "assistant"; content: string };

const SYSTEM = `You are "Ene me Coach" — a warm, non-judgmental sponsor for someone breaking a bad habit (smoking, alcohol, drugs, porn, gambling, food, etc.).

Style:
- Brief, human, kind. 2-5 sentences per reply, unless asked for more.
- Never shame, never lecture. Never moralize about the habit.
- Reflect what they said. Validate the feeling first.
- Then offer ONE concrete next move — a coping action, a question, or a reframe.
- Use the user's words. If they're in crisis ("I want to use right now"), suggest 15-minute urge surf, box breathing, or moving locations.
- Never claim to be a therapist. If they mention self-harm or danger, gently suggest professional help / a crisis line.
- No emojis unless the user uses them first.`;

function Coach() {
  const [state] = useStore();
  const ready = isAIReady();
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Hey. I'm your coach. No shame here, no lectures. What's going on right now — craving, slip, doubt, or just want to talk?",
    },
  ]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pending]);

  async function send() {
    const text = input.trim();
    if (!text || pending) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setPending(true);
    try {
      const recentTriggers = Array.from(
        new Set(state.journal.slice(-20).flatMap((j) => j.triggers ?? [])),
      ).slice(0, 8);
      const ctx = `User context — top streak: ${state.habits.reduce((m, h) => Math.max(m, daysSince(h.quitDate)), 0)}d; active habits: ${state.habits.map((h) => h.name).join(", ") || "none"}; recent triggers: ${recentTriggers.join(", ") || "none"}.`;
      const payload: ChatMessage[] = [
        { role: "system", content: SYSTEM + "\n\n" + ctx },
        ...next.map((m) => ({ role: m.role, content: m.content }) as ChatMessage),
      ];
      const reply = await chat(payload);
      setMessages((m) => [...m, { role: "assistant", content: reply || "I'm here — say more?" }]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `Coach unreachable: ${(e as Error).message}` },
      ]);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto h-[calc(100vh-2rem)] flex flex-col">
      <header className="mb-4">
        <div className="flex items-center gap-3">
          <div className="grid place-items-center h-10 w-10 rounded-xl bg-primary text-primary-foreground shadow-glow">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">AI Urge Coach</h1>
            <p className="text-xs text-muted-foreground">Private. Non-judgmental. Powered by your own AI provider.</p>
          </div>
        </div>
      </header>

      {!ready && (
        <Card className="p-4 mb-3 border-amber-500/40 bg-amber-500/5">
          <div className="flex items-start gap-3">
            <Cpu className="h-5 w-5 text-amber-500 mt-0.5" />
            <div className="flex-1 text-sm">
              <p className="font-semibold">No AI provider connected</p>
              <p className="text-muted-foreground">Connect OpenAI, Anthropic, Gemini, Ollama, or LM Studio to enable the coach.</p>
            </div>
            <Link to="/ai-settings"><Button size="sm">Connect</Button></Link>
          </div>
        </Card>
      )}

      <Card className="flex-1 min-h-0 flex flex-col p-4 overflow-hidden">
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              <div
                className={`shrink-0 grid place-items-center h-8 w-8 rounded-full ${
                  m.role === "user" ? "bg-secondary" : "bg-primary text-primary-foreground"
                }`}
              >
                {m.role === "user" ? <UserIcon className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${
                  m.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {pending && (
            <div className="flex gap-3">
              <div className="shrink-0 grid place-items-center h-8 w-8 rounded-full bg-primary text-primary-foreground">
                <Bot className="h-4 w-4" />
              </div>
              <div className="bg-secondary rounded-2xl px-4 py-2.5 text-sm">
                <span className="inline-flex gap-1">
                  <span className="animate-pulse">●</span>
                  <span className="animate-pulse [animation-delay:120ms]">●</span>
                  <span className="animate-pulse [animation-delay:240ms]">●</span>
                </span>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="mt-3 flex gap-2 border-t border-border pt-3">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={ready ? "What's on your mind?" : "Connect an AI provider first…"}
            disabled={!ready}
            className="min-h-[44px] max-h-32 resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          <Button onClick={send} disabled={pending || !input.trim() || !ready} size="lg">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      <p className="text-[11px] text-muted-foreground mt-3 text-center">
        Not a substitute for professional care. In crisis, please contact a local helpline.
      </p>
    </div>
  );
}
