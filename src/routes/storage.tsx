import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  type StorageConfig,
  type StorageMode,
  STORAGE_DEFAULTS,
  getStorageConfig,
  saveStorageConfig,
  testServerConfig,
  eraseLocalData,
} from "@/lib/storage";
import { Database, HardDrive, Server, Cpu, CheckCircle2, XCircle, Loader2, Trash2 } from "lucide-react";

export const Route = createFileRoute("/storage")({
  head: () => ({
    meta: [
      { title: "Storage — Ene me" },
      { name: "description", content: "Choose where Ene me keeps your data: in-memory, browser localStorage, or your own server." },
    ],
  }),
  component: StorageSettings,
});

const MODES: { id: StorageMode; label: string; icon: typeof HardDrive; help: string }[] = [
  { id: "memory", label: "In-memory", icon: Cpu, help: "Nothing is saved. Data clears when you close the tab. Maximum privacy." },
  { id: "local", label: "This browser", icon: HardDrive, help: "Saved in localStorage on this device. Default. No network calls." },
  { id: "server", label: "My server", icon: Server, help: "Sync to any HTTPS endpoint you control. See README for the contract." },
];

function StorageSettings() {
  const [cfg, setCfg] = useState<StorageConfig>(() => getStorageConfig());
  const [savedCfg, setSavedCfg] = useState<StorageConfig>(STORAGE_DEFAULTS);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    setSavedCfg(getStorageConfig());
  }, []);

  function save() {
    saveStorageConfig(cfg);
    setSavedCfg(cfg);
  }

  async function runTest() {
    setTesting(true);
    setTestResult(null);
    const r = await testServerConfig(cfg);
    setTesting(false);
    setTestResult(r.ok ? { ok: true, msg: "Endpoint reachable." } : { ok: false, msg: r.error });
  }

  function wipe() {
    if (!confirm("Erase all local data on this device? Server data (if any) is not touched.")) return;
    eraseLocalData();
    location.reload();
  }

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto space-y-6">
      <header>
        <div className="flex items-center gap-3">
          <div className="grid place-items-center h-10 w-10 rounded-xl bg-primary text-primary-foreground">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Storage</h1>
            <p className="text-sm text-muted-foreground">Decide where your data lives. You own it end-to-end.</p>
          </div>
        </div>
      </header>

      <Card className="p-5">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Mode</Label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
          {MODES.map((m) => {
            const active = cfg.mode === m.id;
            const Icon = m.icon;
            return (
              <button
                key={m.id}
                onClick={() => { setCfg({ ...cfg, mode: m.id }); setTestResult(null); }}
                className={`text-left px-3 py-3 rounded-lg border transition ${active ? "border-primary bg-primary/10" : "border-border hover:bg-secondary"}`}
              >
                <div className="flex items-center gap-2"><Icon className="h-4 w-4" /><span className="font-semibold text-sm">{m.label}</span></div>
                <p className="text-[11px] text-muted-foreground mt-1.5 leading-snug">{m.help}</p>
              </button>
            );
          })}
        </div>
      </Card>

      {cfg.mode === "server" && (
        <Card className="p-5 space-y-4">
          <div>
            <Label>Server URL</Label>
            <Input value={cfg.serverUrl} onChange={(e) => setCfg({ ...cfg, serverUrl: e.target.value })} placeholder="https://my-ene-server.example.com" />
            <p className="text-[11px] text-muted-foreground mt-1">Your HTTPS endpoint. CORS must allow this origin.</p>
          </div>
          <div>
            <Label>Path</Label>
            <Input value={cfg.serverPath} onChange={(e) => setCfg({ ...cfg, serverPath: e.target.value })} placeholder="state" />
            <p className="text-[11px] text-muted-foreground mt-1">Final URL: {cfg.serverUrl.replace(/\/+$/, "") + "/" + cfg.serverPath.replace(/^\/+/, "")}</p>
          </div>
          <div>
            <Label>Bearer token (optional)</Label>
            <Input type="password" value={cfg.serverToken} onChange={(e) => setCfg({ ...cfg, serverToken: e.target.value })} placeholder="••••••••" autoComplete="off" />
          </div>
          <div className="text-[11px] text-muted-foreground bg-secondary/40 rounded-lg p-3">
            <strong>Server contract:</strong> <code>GET</code> returns the saved JSON blob (or 404 if none). <code>PUT</code> with the JSON body persists it. A reference Node implementation lives in <code>/server</code> of the repo.
          </div>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        <Button onClick={save}>Save</Button>
        {cfg.mode === "server" && (
          <Button variant="outline" onClick={runTest} disabled={testing || !cfg.serverUrl}>
            {testing ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Testing…</> : "Test endpoint"}
          </Button>
        )}
        <Button variant="ghost" onClick={wipe} className="text-danger ml-auto">
          <Trash2 className="h-4 w-4 mr-1" /> Erase local data
        </Button>
      </div>

      {testResult && (
        <div className={`flex items-center gap-2 text-sm ${testResult.ok ? "text-accent" : "text-danger"}`}>
          {testResult.ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          <span className="break-all">{testResult.msg}</span>
        </div>
      )}

      <Card className="p-5">
        <h3 className="font-semibold text-sm">Currently active</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Mode: <strong className="text-foreground">{savedCfg.mode}</strong>
          {savedCfg.mode === "server" && savedCfg.serverUrl && <> · <code>{savedCfg.serverUrl}</code></>}
        </p>
      </Card>
    </div>
  );
}
