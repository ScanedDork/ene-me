// Local-first AI client. All providers are called directly from the browser
// using the user's own API key / local endpoint. No data leaves the device
// except to the provider the user configured.

export type AIProvider =
  | "openai"
  | "anthropic"
  | "gemini"
  | "ollama"
  | "lmstudio"
  | "openai-compatible";

export type AIConfig = {
  provider: AIProvider;
  baseUrl: string; // user-overridable
  apiKey: string; // not required for ollama/lmstudio
  model: string;
};

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

const KEY = "ene-ai-config-v1";

export const PROVIDER_DEFAULTS: Record<AIProvider, { baseUrl: string; model: string; needsKey: boolean; label: string }> = {
  openai: { baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini", needsKey: true, label: "OpenAI" },
  anthropic: { baseUrl: "https://api.anthropic.com/v1", model: "claude-3-5-sonnet-latest", needsKey: true, label: "Anthropic Claude" },
  gemini: { baseUrl: "https://generativelanguage.googleapis.com/v1beta", model: "gemini-1.5-flash", needsKey: true, label: "Google Gemini" },
  ollama: { baseUrl: "http://localhost:11434", model: "llama3.1", needsKey: false, label: "Ollama (local)" },
  lmstudio: { baseUrl: "http://localhost:1234/v1", model: "local-model", needsKey: false, label: "LM Studio (local)" },
  "openai-compatible": { baseUrl: "http://localhost:8080/v1", model: "local-model", needsKey: false, label: "OpenAI-compatible" },
};

export function getAIConfig(): AIConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AIConfig;
  } catch {
    return null;
  }
}

export function saveAIConfig(cfg: AIConfig) {
  localStorage.setItem(KEY, JSON.stringify(cfg));
  window.dispatchEvent(new CustomEvent("ene-ai-config-change"));
}

export function clearAIConfig() {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent("ene-ai-config-change"));
}

export function isAIReady(cfg = getAIConfig()): boolean {
  if (!cfg) return false;
  const needs = PROVIDER_DEFAULTS[cfg.provider].needsKey;
  return !!cfg.model && !!cfg.baseUrl && (!needs || !!cfg.apiKey);
}

class AIError extends Error {}

async function chatOpenAICompat(cfg: AIConfig, messages: ChatMessage[], json: boolean): Promise<string> {
  const res = await fetch(`${cfg.baseUrl.replace(/\/+$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: cfg.model,
      messages,
      ...(json ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!res.ok) throw new AIError(`${res.status}: ${(await res.text()).slice(0, 300)}`);
  const j = await res.json();
  return j.choices?.[0]?.message?.content?.trim() ?? "";
}

async function chatAnthropic(cfg: AIConfig, messages: ChatMessage[]): Promise<string> {
  const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
  const convo = messages.filter((m) => m.role !== "system");
  const res = await fetch(`${cfg.baseUrl.replace(/\/+$/, "")}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": cfg.apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: cfg.model,
      max_tokens: 1024,
      system: system || undefined,
      messages: convo.map((m) => ({ role: m.role, content: m.content })),
    }),
  });
  if (!res.ok) throw new AIError(`${res.status}: ${(await res.text()).slice(0, 300)}`);
  const j = await res.json();
  return (j.content?.[0]?.text ?? "").trim();
}

async function chatGemini(cfg: AIConfig, messages: ChatMessage[], json: boolean): Promise<string> {
  const sys = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
  const url = `${cfg.baseUrl.replace(/\/+$/, "")}/models/${encodeURIComponent(cfg.model)}:generateContent?key=${encodeURIComponent(cfg.apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      systemInstruction: sys ? { parts: [{ text: sys }] } : undefined,
      generationConfig: json ? { responseMimeType: "application/json" } : undefined,
    }),
  });
  if (!res.ok) throw new AIError(`${res.status}: ${(await res.text()).slice(0, 300)}`);
  const j = await res.json();
  return (j.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim();
}

async function chatOllama(cfg: AIConfig, messages: ChatMessage[], json: boolean): Promise<string> {
  const res = await fetch(`${cfg.baseUrl.replace(/\/+$/, "")}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: cfg.model,
      messages,
      stream: false,
      ...(json ? { format: "json" } : {}),
    }),
  });
  if (!res.ok) throw new AIError(`${res.status}: ${(await res.text()).slice(0, 300)}`);
  const j = await res.json();
  return (j.message?.content ?? "").trim();
}

export async function chat(
  messages: ChatMessage[],
  opts: { json?: boolean } = {},
): Promise<string> {
  const cfg = getAIConfig();
  if (!cfg) throw new AIError("No AI provider configured. Open Settings → AI to connect one.");
  if (!isAIReady(cfg)) throw new AIError("AI config incomplete. Open Settings → AI.");

  switch (cfg.provider) {
    case "anthropic":
      return chatAnthropic(cfg, messages);
    case "gemini":
      return chatGemini(cfg, messages, !!opts.json);
    case "ollama":
      return chatOllama(cfg, messages, !!opts.json);
    case "openai":
    case "lmstudio":
    case "openai-compatible":
    default:
      return chatOpenAICompat(cfg, messages, !!opts.json);
  }
}

export async function chatJSON<T = unknown>(messages: ChatMessage[]): Promise<T> {
  const raw = await chat(messages, { json: true });
  // Strip code fences if the model wrapped output
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  return JSON.parse(cleaned) as T;
}

export async function testConnection(cfg: AIConfig): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const prev = getAIConfig();
    saveAIConfig(cfg);
    try {
      const reply = await chat([
        { role: "system", content: "Reply with exactly: OK" },
        { role: "user", content: "ping" },
      ]);
      if (prev) saveAIConfig(prev);
      else clearAIConfig();
      return reply.length > 0 ? { ok: true } : { ok: false, error: "Empty response" };
    } catch (e) {
      if (prev) saveAIConfig(prev);
      else clearAIConfig();
      throw e;
    }
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
