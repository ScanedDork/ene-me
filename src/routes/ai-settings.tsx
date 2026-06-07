import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  type AIConfig,
  type AIProvider,
  PROVIDER_DEFAULTS,
  getAIConfig,
  saveAIConfig,
  clearAIConfig,
  testConnection,
} from "@/lib/ai-client";
import { Cpu, CheckCircle2, XCircle, ExternalLink, Loader2, Trash2 } from "lucide-react";

export const Route = createFileRoute("/ai-settings")({
  head: () => ({
    meta: [
      { title: "AI Provider — Ene me" },
      { name: "description", content: "Connect your own AI provider — OpenAI, Anthropic, Gemini, Ollama, LM Studio." },
    ],
  }),
  component: AISettings,
});

const PROVIDER_OPTIONS: { id: AIProvider; help: string; modelHint: string }[] = [
  { id: "openai", help: "Get a key at platform.openai.com", modelHint: "e.g. gpt-4o-mini, gpt-4o, gpt-5-mini" },
  { id: "anthropic", help: "Get a key at console.anthropic.com", modelHint: "e.g. claude-3-5-sonnet-latest, claude-3-5-haiku-latest" },
  { id: "gemini", help: "Get a key at aistudio.google.com/apikey", modelHint: "e.g. gemini-1.5-flash, gemini-1.5-pro, gemini-2.0-flash" },
  { id: "ollama", help: "Run ollama locally. No key needed.", modelHint: "e.g. llama3.1, mistral, qwen2.5" },
  { id: "lmstudio", help: "Run LM Studio local server. No key needed.", modelHint: "Pick a loaded model in LM Studio" },
  { id: "openai-compatible", help: "Any OpenAI-compatible endpoint (vLLM, llama.cpp, OpenRouter, Groq, Together, etc.).", modelHint: "Model name your endpoint expects" },
];

function AISettings() {
  const [cfg, setCfg] = useState<AIConfig>(() => {
    const saved = getAIConfig();
    if (saved) return saved;
    return { provider: "openai", ...PROVIDER_DEFAULTS.openai, apiKey: "" };
  });
  const [savedCfg, setSavedCfg] = useState<AIConfig | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    setSavedCfg(getAIConfig());
  }, []);

  const meta = PROVIDER_OPTIONS.find((p) => p.id === cfg.provider)!;
  const defaults = PROVIDER_DEFAULTS[cfg.provider];

  function switchProvider(p: AIProvider) {
    const d = PROVIDER_DEFAULTS[p];
    setCfg({ provider: p, baseUrl: d.baseUrl, model: d.model, apiKey: "" });
    setTestResult(null);
  }

  function save() {
    saveAIConfig(cfg);
    setSavedCfg(cfg);
  }

  function disconnect() {
    clearAIConfig();
    setSavedCfg(null);
    setTestResult(null);
  }

  async function runTest() {
    setTesting(true);
    setTestResult(null);
    const res = await testConnection(cfg);
    setTesting(false);
    if (res.ok) setTestResult({ ok: true, msg: "Connection successful." });
    else setTestResult({ ok: false, msg: res.error });
  }

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto space-y-6">
      <header>
        <div className="flex items-center gap-3">
          <div className="grid place-items-center h-10 w-10 rounded-xl bg-primary text-primary-foreground">
            <Cpu className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">AI Provider</h1>
            <p className="text-sm text-muted-foreground">Bring your own AI. Your keys stay in this browser — calls go directly from your device to the provider.</p>
          </div>
        </div>
      </header>

      <Card className="p-5">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Provider</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
          {PROVIDER_OPTIONS.map((p) => {
            const active = cfg.provider === p.id;
            return (
              <button
                key={p.id}
                onClick={() => switchProvider(p.id)}
                className={`text-left px-3 py-2.5 rounded-lg border transition ${
                  active ? "border-primary bg-primary/10" : "border-border hover:bg-secondary"
                }`}
              >
                <div className="text-sm font-semibold">{PROVIDER_DEFAULTS[p.id].label}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{p.help}</div>
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <div>
          <Label>Base URL</Label>
          <Input value={cfg.baseUrl} onChange={(e) => setCfg({ ...cfg, baseUrl: e.target.value })} placeholder={defaults.baseUrl} />
          <p className="text-[11px] text-muted-foreground mt-1">Override if you self-host or use a proxy.</p>
        </div>

        {defaults.needsKey && (
          <div>
            <Label>API Key</Label>
            <Input
              type="password"
              value={cfg.apiKey}
              onChange={(e) => setCfg({ ...cfg, apiKey: e.target.value })}
              placeholder="sk-…"
              autoComplete="off"
            />
            <p className="text-[11px] text-muted-foreground mt-1">Stored only in this browser's localStorage.</p>
          </div>
        )}

        <div>
          <Label>Model</Label>
          <Input value={cfg.model} onChange={(e) => setCfg({ ...cfg, model: e.target.value })} placeholder={defaults.model} />
          <p className="text-[11px] text-muted-foreground mt-1">{meta.modelHint}</p>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <Button onClick={save}>Save</Button>
          <Button variant="outline" onClick={runTest} disabled={testing}>
            {testing ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Testing…</> : "Test connection"}
          </Button>
          {savedCfg && (
            <Button variant="ghost" onClick={disconnect} className="text-danger">
              <Trash2 className="h-4 w-4 mr-1" /> Disconnect
            </Button>
          )}
        </div>

        {testResult && (
          <div className={`flex items-center gap-2 text-sm ${testResult.ok ? "text-accent" : "text-danger"}`}>
            {testResult.ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            <span className="break-all">{testResult.msg}</span>
          </div>
        )}
      </Card>

      {(cfg.provider === "ollama" || cfg.provider === "lmstudio") && (
        <Card className="p-5 bg-secondary/40">
          <h3 className="font-semibold text-sm">Local server tips</h3>
          <ul className="text-sm text-muted-foreground space-y-1 mt-2 list-disc pl-5">
            {cfg.provider === "ollama" && (
              <>
                <li>Install from <a className="underline inline-flex items-center gap-0.5" href="https://ollama.com" target="_blank" rel="noreferrer">ollama.com <ExternalLink className="h-3 w-3" /></a> then run <code className="bg-secondary px-1 rounded">ollama pull llama3.1</code>.</li>
                <li>For browser access, run with <code className="bg-secondary px-1 rounded">OLLAMA_ORIGINS=* ollama serve</code>.</li>
              </>
            )}
            {cfg.provider === "lmstudio" && (
              <>
                <li>Open LM Studio → Developer → Start Server.</li>
                <li>Enable "Cross-Origin Resource Sharing (CORS)" in the server settings.</li>
              </>
            )}
          </ul>
        </Card>
      )}

      <Card className="p-5">
        <h3 className="font-semibold text-sm">Privacy</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Ene me is local-first. Your habits, journal, and CBT data live only in your browser. AI requests are sent directly from your device to the provider you choose — Ene me has no server in the loop.
        </p>
      </Card>
    </div>
  );
}
