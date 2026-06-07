import { createFileRoute } from "@tanstack/react-router";
import { useStore, COGNITIVE_DISTORTIONS } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Stethoscope, Download } from "lucide-react";
import { useMemo } from "react";

export const Route = createFileRoute("/therapist")({
  head: () => ({
    meta: [
      { title: "Therapist Export — Resurge" },
      { name: "description", content: "One-page PDF pack of your last 4 weeks for a clinician." },
    ],
  }),
  component: TherapistExport,
});

function TherapistExport() {
  const [state] = useStore();

  const data = useMemo(() => {
    const cutoff = Date.now() - 28 * 86_400_000;
    const journal = state.journal.filter((j) => new Date(j.date).getTime() >= cutoff);
    const cbt = state.cbtSessions.filter((s) => new Date(s.date).getTime() >= cutoff);
    const relapses = state.relapses.filter((r) => new Date(r.date).getTime() >= cutoff);
    const moodSeries = journal.map((j) => ({ date: j.date, mood: j.mood, craving: j.craving }));
    const distortionMap = new Map<string, number>();
    cbt.forEach((s) => s.distortions.forEach((d) => distortionMap.set(d, (distortionMap.get(d) ?? 0) + 1)));
    return { journal, cbt, relapses, moodSeries, distortions: [...distortionMap.entries()].sort((a, b) => b[1] - a[1]) };
  }, [state]);

  const download = async () => {
    const { default: jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF();
    const PRIMARY: [number, number, number] = [99, 102, 241];

    doc.setFillColor(...PRIMARY);
    doc.rect(0, 0, 210, 30, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text("Resurge — Therapist Pack", 14, 18);
    doc.setFontSize(10);
    doc.text(`Last 28 days · Generated ${new Date().toLocaleDateString()}`, 14, 25);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    let y = 42;
    doc.text(`Patient (self-reported): ${state.userName || "—"}`, 14, y); y += 6;
    doc.text(`Active habits being addressed: ${state.habits.map((h) => h.name).join(", ") || "—"}`, 14, y); y += 6;
    doc.text(`Journal entries: ${data.journal.length} · CBT sessions: ${data.cbt.length} · Relapses: ${data.relapses.length}`, 14, y); y += 10;

    // Mood/craving table
    doc.setFontSize(13);
    doc.text("Daily mood & craving (1-5 / 0-10)", 14, y); y += 4;
    autoTable(doc, {
      startY: y,
      head: [["Date", "Mood", "Craving", "Note"]],
      body: data.moodSeries.slice(-28).map((j) => {
        const note = data.journal.find((x) => x.date === j.date)?.note ?? "";
        return [j.date, `${j.mood}/5`, `${j.craving}/10`, note.slice(0, 60)];
      }),
      headStyles: { fillColor: PRIMARY },
      styles: { fontSize: 8 },
    });
    y = (doc as any).lastAutoTable.finalY + 8;

    // Distortions
    if (data.distortions.length) {
      if (y > 240) { doc.addPage(); y = 20; }
      doc.setFontSize(13);
      doc.text("Top cognitive distortions", 14, y); y += 4;
      autoTable(doc, {
        startY: y,
        head: [["Distortion", "Frequency"]],
        body: data.distortions.map(([d, n]) => {
          const lbl = COGNITIVE_DISTORTIONS.find((x) => x.key === d)?.label ?? d;
          return [lbl, n.toString()];
        }),
        headStyles: { fillColor: PRIMARY },
        styles: { fontSize: 9 },
      });
      y = (doc as any).lastAutoTable.finalY + 8;
    }

    // CBT sessions
    if (data.cbt.length) {
      doc.addPage(); y = 20;
      doc.setFontSize(14);
      doc.text("CBT session log", 14, y); y += 8;
      data.cbt.forEach((s) => {
        if (y > 260) { doc.addPage(); y = 20; }
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(`${s.date.slice(0, 10)} — intensity ${s.intensityBefore} → ${s.intensityAfter}`, 14, y); y += 5;
        doc.setFont("helvetica", "normal");
        const lines = [
          `Urge: ${s.urge}`,
          `Automatic thought: ${s.thought}`,
          `Reframe: ${s.reframe}`,
          `Committed action: ${s.action}`,
        ];
        lines.forEach((ln) => {
          const wrapped = doc.splitTextToSize(ln, 180);
          doc.text(wrapped, 14, y);
          y += wrapped.length * 5;
        });
        y += 4;
      });
    }

    // Relapse post-mortems
    if (data.relapses.length) {
      doc.addPage(); y = 20;
      doc.setFontSize(14);
      doc.text("Relapse debriefs", 14, y); y += 8;
      data.relapses.forEach((r) => {
        if (y > 260) { doc.addPage(); y = 20; }
        const habit = state.habits.find((h) => h.id === r.habitId);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(`${new Date(r.date).toLocaleDateString()} — ${habit?.name ?? "habit"} (${r.streakLength ?? "?"}d streak)`, 14, y); y += 5;
        doc.setFont("helvetica", "normal");
        const pm = r.postMortem;
        const lines = [
          `Trigger: ${r.trigger || "—"}`,
          pm ? `Feeling: ${pm.feeling}` : "",
          pm ? `Context: ${pm.location}` : "",
          pm ? `What happened: ${pm.whatHappened}` : "",
          pm ? `Could have done: ${pm.couldHaveDone}` : "",
          pm ? `Next-time plan: ${pm.nextTimePlan}` : "",
        ].filter(Boolean);
        lines.forEach((ln) => {
          const wrapped = doc.splitTextToSize(ln, 180);
          doc.text(wrapped, 14, y);
          y += wrapped.length * 5;
        });
        y += 4;
      });
    }

    doc.save(`resurge-therapist-pack-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto space-y-6">
      <header className="flex items-center gap-3">
        <Stethoscope className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Therapist export pack</h1>
          <p className="text-muted-foreground">One PDF a clinician can absorb in 5 minutes.</p>
        </div>
      </header>

      <Card className="p-6">
        <div className="grid sm:grid-cols-3 gap-3">
          <Mini label="Journal entries" value={data.journal.length} />
          <Mini label="CBT sessions" value={data.cbt.length} />
          <Mini label="Relapses logged" value={data.relapses.length} />
        </div>
        <Button size="lg" className="mt-6" onClick={download}>
          <Download className="mr-2 h-4 w-4" /> Download 4-week pack
        </Button>
        <p className="text-xs text-muted-foreground mt-3">
          Includes mood/craving series, top cognitive distortions, every CBT session and every relapse debrief from the last 28 days. Generated locally — nothing leaves your device.
        </p>
      </Card>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-4 rounded-xl bg-secondary text-center">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="text-3xl font-bold mt-1">{value}</div>
    </div>
  );
}
