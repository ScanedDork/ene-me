import { createFileRoute } from "@tanstack/react-router";
import { useStore, daysSince, earnedMilestones } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FileText, Download } from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Monthly Report — Resurge" }, { name: "description", content: "Download a beautiful monthly progress PDF." }] }),
  component: Reports,
});

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function Reports() {
  const [state] = useStore();
  const now = new Date();
  const [month, setMonth] = useState(monthKey(now));

  const data = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    const monthStart = new Date(y, m - 1, 1);
    const monthEnd = new Date(y, m, 0);

    const journalThisMonth = state.journal.filter((j) => j.date.startsWith(month));
    const bestDays = [...journalThisMonth].sort((a, b) => b.mood - a.mood).slice(0, 3);
    const hardestDays = [...journalThisMonth].sort((a, b) => b.craving - a.craving).slice(0, 3);

    const triggerCount: Record<string, number> = {};
    journalThisMonth.forEach((j) => j.triggers.forEach((t) => { triggerCount[t] = (triggerCount[t] ?? 0) + 1; }));
    const topTriggers = Object.entries(triggerCount).sort((a, b) => b[1] - a[1]).slice(0, 5);

    const habitStats = state.habits.map((h) => {
      const startMs = new Date(h.quitDate).getTime();
      const daysAtStart = Math.max(0, Math.floor((monthStart.getTime() - startMs) / 86_400_000));
      const daysAtEnd = Math.max(0, Math.floor((Math.min(monthEnd.getTime(), Date.now()) - startMs) / 86_400_000));
      const cleanThisMonth = Math.max(0, daysAtEnd - daysAtStart);
      const relapses = state.relapses.filter((r) => r.habitId === h.id && r.date.startsWith(month));
      return {
        habit: h,
        cleanThisMonth,
        currentStreak: daysSince(h.quitDate),
        savedThisMonth: cleanThisMonth * h.costPerDay,
        relapses: relapses.length,
      };
    });

    const milestonesThisMonth = state.habits.flatMap((h) => {
      const startMs = new Date(h.quitDate).getTime();
      const daysAtStart = Math.max(0, Math.floor((monthStart.getTime() - startMs) / 86_400_000));
      const daysAtEnd = Math.max(0, Math.floor((Math.min(monthEnd.getTime(), Date.now()) - startMs) / 86_400_000));
      return earnedMilestones(daysAtEnd)
        .filter((m) => m.days > daysAtStart && m.days <= daysAtEnd)
        .map((m) => ({ habit: h, milestone: m }));
    });

    const cbtCount = state.cbtSessions.filter((s) => s.date.startsWith(month)).length;

    return { habitStats, bestDays, hardestDays, topTriggers, milestonesThisMonth, journalCount: journalThisMonth.length, cbtCount, monthStart, monthEnd };
  }, [month, state]);

  const download = async () => {
    const { default: jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF();
    const PRIMARY: [number, number, number] = [99, 102, 241];
    const monthLabel = data.monthStart.toLocaleDateString(undefined, { month: "long", year: "numeric" });

    // Cover
    doc.setFillColor(...PRIMARY);
    doc.rect(0, 0, 210, 60, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.text("Resurge — Monthly Report", 14, 30);
    doc.setFontSize(14);
    doc.text(monthLabel, 14, 42);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text(`For: ${state.userName || "Friend"}`, 14, 75);
    doc.text(`Active battles: ${state.habits.length}`, 14, 85);
    doc.text(`Journal entries this month: ${data.journalCount}`, 14, 95);
    doc.text(`CBT sessions this month: ${data.cbtCount}`, 14, 105);
    doc.text(`Milestones earned this month: ${data.milestonesThisMonth.length}`, 14, 115);

    // Habits table
    doc.setFontSize(16);
    doc.text("Habit progress", 14, 135);
    autoTable(doc, {
      startY: 140,
      head: [["Habit", "Clean this month", "Current streak", "Saved", "Relapses"]],
      body: data.habitStats.map((s) => [
        `${s.habit.emoji} ${s.habit.name}`,
        `${s.cleanThisMonth}d`,
        `${s.currentStreak}d`,
        `$${s.savedThisMonth.toLocaleString()}`,
        s.relapses.toString(),
      ]),
      headStyles: { fillColor: PRIMARY },
    });

    // Milestones
    let y = (doc as any).lastAutoTable.finalY + 15;
    if (data.milestonesThisMonth.length > 0) {
      doc.setFontSize(16);
      doc.text("Milestones earned", 14, y);
      autoTable(doc, {
        startY: y + 5,
        head: [["Habit", "Milestone"]],
        body: data.milestonesThisMonth.map((m) => [`${m.habit.emoji} ${m.habit.name}`, `${m.milestone.badge} ${m.milestone.title} (${m.milestone.days} days)`]),
        headStyles: { fillColor: PRIMARY },
      });
      y = (doc as any).lastAutoTable.finalY + 15;
    }

    // Journal highlights
    if (data.bestDays.length || data.hardestDays.length) {
      if (y > 230) { doc.addPage(); y = 20; }
      doc.setFontSize(16);
      doc.text("Journal highlights", 14, y);
      y += 8;
      doc.setFontSize(11);
      doc.text("Best mood days:", 14, y); y += 6;
      data.bestDays.forEach((j) => {
        doc.text(`• ${j.date} — mood ${j.mood}/5 ${j.gratitude ? `· grateful for: ${j.gratitude.slice(0, 70)}` : ""}`, 16, y);
        y += 6;
      });
      y += 4;
      doc.text("Hardest days:", 14, y); y += 6;
      data.hardestDays.forEach((j) => {
        doc.text(`• ${j.date} — craving ${j.craving}/10 ${j.note ? `· ${j.note.slice(0, 70)}` : ""}`, 16, y);
        y += 6;
      });
    }

    // Triggers
    if (data.topTriggers.length > 0) {
      if (y > 240) { doc.addPage(); y = 20; }
      y += 8;
      doc.setFontSize(16);
      doc.text("Most frequent triggers", 14, y);
      autoTable(doc, {
        startY: y + 5,
        head: [["Trigger", "Count"]],
        body: data.topTriggers.map(([t, c]) => [t, c.toString()]),
        headStyles: { fillColor: PRIMARY },
      });
    }

    // Closing
    doc.addPage();
    doc.setFillColor(...PRIMARY);
    doc.rect(0, 80, 210, 80, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text("Keep going.", 14, 115);
    doc.setFontSize(14);
    doc.text("Every clean day is a vote for the person you're becoming.", 14, 130);

    doc.save(`resurge-report-${month}.pdf`);
  };

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto space-y-6">
      <header className="flex items-center gap-3">
        <FileText className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Monthly progress report</h1>
          <p className="text-muted-foreground">Generate a downloadable PDF of your month.</p>
        </div>
      </header>

      <Card className="p-6 flex flex-wrap items-end gap-4">
        <div>
          <Label>Month</Label>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="mt-1 h-10 px-3 rounded-md bg-input border border-border" />
        </div>
        <Button size="lg" onClick={download} disabled={state.habits.length === 0}>
          <Download className="mr-2 h-4 w-4" /> Download PDF
        </Button>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Preview</h2>
        <div className="grid md:grid-cols-3 gap-3">
          <Stat label="Journal entries" value={data.journalCount} />
          <Stat label="CBT sessions" value={data.cbtCount} />
          <Stat label="Milestones earned" value={data.milestonesThisMonth.length} />
        </div>
        <div className="mt-6 space-y-2">
          {data.habitStats.map((s) => (
            <div key={s.habit.id} className="flex items-center justify-between p-3 bg-secondary/60 rounded-lg">
              <div className="font-medium">{s.habit.emoji} {s.habit.name}</div>
              <div className="text-sm text-muted-foreground">{s.cleanThisMonth}d clean · ${s.savedThisMonth.toLocaleString()} saved · {s.relapses} relapses</div>
            </div>
          ))}
          {state.habits.length === 0 && <p className="text-sm text-muted-foreground">Add a habit to generate a report.</p>}
        </div>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-4 rounded-xl bg-secondary text-center">
      <div className="text-xs text-muted-foreground uppercase">{label}</div>
      <div className="text-3xl font-bold mt-1">{value}</div>
    </div>
  );
}
