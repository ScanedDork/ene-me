import { createFileRoute } from "@tanstack/react-router";
import { useStore, uid, todayKey, type Reminder } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings as SettingsIcon, Bell, Shield, Trash2, Plus, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — Ene me" }, { name: "description", content: "Configure reminders and streak protection." }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const [state, update] = useStore();
  const s = state.settings;
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");

  useEffect(() => {
    if (typeof Notification === "undefined") {
      setPermission("unsupported");
    } else {
      setPermission(Notification.permission);
    }
  }, []);

  // Local reminder dispatcher: shows a notification when current time matches an enabled reminder
  useEffect(() => {
    if (typeof window === "undefined") return;
    const interval = setInterval(() => {
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      s.reminders.forEach((r) => {
        if (!r.enabled || r.time !== hhmm) return;
        const firedKey = `reminder-fired-${r.id}-${todayKey()}-${hhmm}`;
        if (localStorage.getItem(firedKey)) return;
        localStorage.setItem(firedKey, "1");
        if (permission === "granted") {
          new Notification("Ene me", { body: r.label });
        }
      });
    }, 30_000);
    return () => clearInterval(interval);
  }, [s.reminders, permission]);

  const setSettings = (next: Partial<typeof s>) => update((x) => ({ ...x, settings: { ...x.settings, ...next } }));

  const requestPermission = async () => {
    if (typeof Notification === "undefined") return;
    const p = await Notification.requestPermission();
    setPermission(p);
  };

  const today = todayKey();
  const sickToday = s.sickDays.includes(today);

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto space-y-6">
      <header className="flex items-center gap-3">
        <SettingsIcon className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Reminders and streak protection.</p>
        </div>
      </header>

      <Card className="p-6">
        <div className="flex items-center gap-2 font-semibold"><Bell className="h-5 w-5 text-accent" /> Daily reminders</div>
        <p className="text-sm text-muted-foreground mt-1">Gentle nudges throughout your day. Browser notifications work while the tab is open.</p>

        {permission !== "granted" && permission !== "unsupported" && (
          <Button size="sm" variant="outline" className="mt-3" onClick={requestPermission}>Enable browser notifications</Button>
        )}
        {permission === "unsupported" && (
          <p className="text-xs text-muted-foreground mt-3">Browser notifications aren't supported here. Reminders will show as in-app banners.</p>
        )}
        {permission === "denied" && (
          <p className="text-xs text-danger mt-3">Notifications blocked. Enable them in your browser settings to receive reminders.</p>
        )}

        <div className="space-y-3 mt-5">
          {s.reminders.map((r) => (
            <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/60">
              <Switch checked={r.enabled} onCheckedChange={(v) => setSettings({ reminders: s.reminders.map((x) => x.id === r.id ? { ...x, enabled: v } : x) })} />
              <Input value={r.label} onChange={(e) => setSettings({ reminders: s.reminders.map((x) => x.id === r.id ? { ...x, label: e.target.value } : x) })} className="flex-1" />
              <Input type="time" value={r.time} onChange={(e) => setSettings({ reminders: s.reminders.map((x) => x.id === r.id ? { ...x, time: e.target.value } : x) })} className="w-32" />
              <Button variant="ghost" size="sm" onClick={() => setSettings({ reminders: s.reminders.filter((x) => x.id !== r.id) })}>
                <Trash2 className="h-4 w-4 text-danger" />
              </Button>
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => {
          const r: Reminder = { id: uid(), label: "New reminder", time: "12:00", enabled: true };
          setSettings({ reminders: [...s.reminders, r] });
        }}><Plus className="mr-1 h-4 w-4" /> Add reminder</Button>

        <SmartSuggestions />
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-2 font-semibold"><Shield className="h-5 w-5 text-primary" /> Streak protection</div>
        <p className="text-sm text-muted-foreground mt-1">Protect against <strong>missed check-ins</strong>, not relapses. Honesty still matters — relapses reset the clock.</p>

        <div className="grid md:grid-cols-2 gap-6 mt-5">
          <div>
            <Label>Day boundary hour</Label>
            <Input type="number" min={0} max={23} value={s.dayBoundaryHour} onChange={(e) => setSettings({ dayBoundaryHour: Math.max(0, Math.min(23, Number(e.target.value) || 0)) })} className="mt-1" />
            <p className="text-xs text-muted-foreground mt-1">"Day" rolls over at this hour. Night owls: try 4 instead of 0.</p>
          </div>
          <div>
            <Label>Grace days per month</Label>
            <Input type="number" min={0} max={10} value={s.graceDaysPerMonth} onChange={(e) => setSettings({ graceDaysPerMonth: Math.max(0, Number(e.target.value) || 0) })} className="mt-1" />
            <p className="text-xs text-muted-foreground mt-1">Missed journal days inside grace don't break your check-in streak.</p>
          </div>
        </div>

        <div className="mt-6 p-4 rounded-lg bg-secondary/60 flex items-center justify-between">
          <div>
            <div className="font-medium">Mark today as a sick / paused day</div>
            <div className="text-xs text-muted-foreground">Streak counter freezes — no increment, no reset.</div>
          </div>
          <Switch checked={sickToday} onCheckedChange={(v) => setSettings({ sickDays: v ? [...s.sickDays, today] : s.sickDays.filter((d) => d !== today) })} />
        </div>

        {s.sickDays.length > 0 && (
          <div className="mt-3">
            <Label className="text-xs">Sick days logged ({s.sickDays.length})</Label>
            <div className="flex flex-wrap gap-1 mt-1">
              {s.sickDays.slice(-10).map((d) => (
                <span key={d} className="text-xs px-2 py-0.5 rounded-full bg-secondary">{d}</span>
              ))}
            </div>
          </div>
        )}
      </Card>

      <Card className="p-6">
        <div className="font-semibold">Currency</div>
        <Input value={s.currency} onChange={(e) => setSettings({ currency: e.target.value.slice(0, 3) })} className="w-24 mt-2" />
      </Card>

      <Card className="p-6">
        <div className="font-semibold">Export your data</div>
        <p className="text-sm text-muted-foreground mt-1">Download everything as JSON or journal/relapses as CSV. Your data lives only on this device.</p>
        <div className="flex flex-wrap gap-2 mt-4">
          <Button variant="outline" onClick={() => downloadJSON(state)}>Download JSON</Button>
          <Button variant="outline" onClick={() => downloadCSV("journal", state.journal)}>Journal CSV</Button>
          <Button variant="outline" onClick={() => downloadCSV("relapses", state.relapses)}>Relapses CSV</Button>
        </div>
      </Card>
    </div>
  );
}

function downloadBlob(name: string, type: string, content: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
function downloadJSON(state: unknown) {
  downloadBlob(`resurge-${new Date().toISOString().slice(0, 10)}.json`, "application/json", JSON.stringify(state, null, 2));
}
function downloadCSV(name: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) { downloadBlob(`${name}.csv`, "text/csv", ""); return; }
  const keys = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const esc = (v: unknown) => {
    const s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [keys.join(","), ...rows.map((r) => keys.map((k) => esc(r[k])).join(","))].join("\n");
  downloadBlob(`resurge-${name}-${new Date().toISOString().slice(0, 10)}.csv`, "text/csv", csv);
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function SmartSuggestions() {
  const [state, update] = useStore();

  const suggestions = useMemo(() => {
    const out: { id: string; label: string; reason: string; time: string }[] = [];

    // 1. Riskiest day of week — schedule a noon nudge that day
    const dayCravings: number[][] = Array.from({ length: 7 }, () => []);
    for (const j of state.journal) dayCravings[new Date(j.date + "T12:00:00").getDay()].push(j.craving);
    const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
    const days = dayCravings.map((arr, i) => ({ i, label: DAY_NAMES[i], craving: avg(arr), samples: arr.length }));
    const riskiest = [...days].filter((d) => d.samples >= 2).sort((a, b) => b.craving - a.craving)[0];
    if (riskiest && riskiest.craving > 4) {
      out.push({
        id: `smart-risky-${riskiest.i}`,
        label: `Heads up — ${riskiest.label} is your hardest day`,
        reason: `Avg craving ${riskiest.craving.toFixed(1)}/10 on ${riskiest.label}s.`,
        time: "10:00",
      });
    }

    // 2. No journal yesterday → morning nudge
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const yKey = yesterday.toISOString().slice(0, 10);
    if (state.journal.length > 0 && !state.journal.some((j) => j.date === yKey)) {
      out.push({
        id: "smart-no-journal",
        label: "Skipped yesterday — quick check-in?",
        reason: "No journal logged in the last 24h.",
        time: "08:30",
      });
    }

    // 3. Recent CBT distortion → afternoon reframe nudge
    const recent = state.cbtSessions.slice(-5);
    if (recent.length >= 3) {
      out.push({
        id: "smart-reframe",
        label: "Mid-day reframe — open CBT",
        reason: "You've been using CBT actively; an afternoon check helps lock it in.",
        time: "15:00",
      });
    }

    return out.filter((s) => !state.settings.reminders.some((r) => r.id === s.id));
  }, [state]);

  if (suggestions.length === 0) return null;

  return (
    <div className="mt-6 border-t border-border pt-5">
      <Label className="flex items-center gap-2 text-base font-semibold">
        <Sparkles className="h-4 w-4 text-accent" /> Smart suggestions
      </Label>
      <p className="text-xs text-muted-foreground mt-1">
        Reminders tailored to your data. Tap to add.
      </p>
      <div className="space-y-2 mt-3">
        {suggestions.map((sg) => (
          <div key={sg.id} className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-border">
            <div className="flex-1">
              <div className="text-sm font-medium">{sg.label}</div>
              <div className="text-xs text-muted-foreground">{sg.reason} · suggested {sg.time}</div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                update((x) => ({
                  ...x,
                  settings: {
                    ...x.settings,
                    reminders: [
                      ...x.settings.reminders,
                      { id: sg.id, label: sg.label, time: sg.time, enabled: true, route: "/journal" },
                    ],
                  },
                }))
              }
            >
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
