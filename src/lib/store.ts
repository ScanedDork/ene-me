// Local-first store. The actual persistence backend (memory / localStorage /
// custom server) is pluggable — see src/lib/storage.ts.
import { useEffect, useState, useCallback } from "react";
import { readRaw, writeRaw, onStorageChange } from "./storage";

export type IfThen = { id: string; trigger: string; action: string };
export type CopingStrategy = {
  id: string;
  text: string;
  category: "Physical" | "Cognitive" | "Social" | "Spiritual";
  uses: number;
};
export type RecoveryPlan = {
  goalDate?: string;
  ifThens: IfThen[];
  supportName?: string;
  supportContact?: string;
  reward?: string;
};

export type HabitReplacement = {
  name: string;
  emoji: string;
  cadence: "daily" | "weekly";
  doneDates: string[]; // YYYY-MM-DD
};

export type Habit = {
  id: string;
  name: string;
  emoji: string;
  category: string;
  quitDate: string; // ISO
  whyReasons: string[];
  costPerDay: number;
  unit?: string;
  unitsPerDay?: number;
  createdAt: string;
  plan?: RecoveryPlan;
  copingStrategies?: CopingStrategy[];
  longestStreak?: number;
  replacement?: HabitReplacement;
};

export type JournalEntry = {
  id: string;
  date: string;
  mood: number;
  craving: number;
  energy: number;
  note: string;
  gratitude: string;
  triggers: string[];
  createdAt: string;
};

export type Relapse = {
  id: string;
  habitId: string;
  date: string;
  trigger: string;
  lesson: string;
  streakLength?: number;
  postMortem?: {
    feeling: string;
    location: string;
    whatHappened: string;
    couldHaveDone: string;
    nextTimePlan: string;
  };
};

export type PanicLog = {
  id: string;
  date: string;
  craving: number;
  technique: string;
  outcome: "resisted" | "relapsed";
};

export type CBTSession = {
  id: string;
  date: string;
  urge: string;
  thought: string;
  distortions: string[];
  evidenceFor: string;
  evidenceAgainst: string;
  reframe: string;
  action: string;
  intensityBefore: number;
  intensityAfter: number;
};

export type Reminder = {
  id: string;
  label: string;
  time: string; // HH:MM
  enabled: boolean;
  route?: string;
};

export type Settings = {
  reminders: Reminder[];
  graceDaysPerMonth: number;
  sickDays: string[]; // YYYY-MM-DD
  dayBoundaryHour: number; // 0-23
  currency: string;
};

export type IdentityCheckIn = {
  date: string; // YYYY-MM-DD
  acted: "yes" | "partial" | "no";
  note?: string;
};

export type AppState = {
  habits: Habit[];
  journal: JournalEntry[];
  relapses: Relapse[];
  panicLogs: PanicLog[];
  cbtSessions: CBTSession[];
  settings: Settings;
  userName: string;
  onboarded: boolean;
  identityStatements: string[];
  identityCheckIns: IdentityCheckIn[];
};

const defaultSettings: Settings = {
  reminders: [
    { id: "morning", label: "Morning check-in", time: "08:00", enabled: false, route: "/journal" },
    { id: "evening", label: "Evening journal", time: "21:00", enabled: false, route: "/journal" },
  ],
  graceDaysPerMonth: 2,
  sickDays: [],
  dayBoundaryHour: 4,
  currency: "$",
};

const initial: AppState = {
  habits: [],
  journal: [],
  relapses: [],
  panicLogs: [],
  cbtSessions: [],
  settings: defaultSettings,
  userName: "",
  onboarded: false,
  identityStatements: [],
  identityCheckIns: [],
};

function read(): AppState {
  if (typeof window === "undefined") return initial;
  try {
    const raw = readRaw();
    if (!raw) return initial;
    const parsed = JSON.parse(raw);
    return {
      ...initial,
      ...parsed,
      settings: { ...defaultSettings, ...(parsed.settings ?? {}) },
    };
  } catch {
    return initial;
  }
}

function write(state: AppState) {
  if (typeof window === "undefined") return;
  writeRaw(JSON.stringify(state));
}

export function useStore(): [AppState, (updater: (s: AppState) => AppState) => void] {
  const [state, setState] = useState<AppState>(initial);

  useEffect(() => {
    setState(read());
    return onStorageChange(() => setState(read()));
  }, []);

  const update = useCallback((updater: (s: AppState) => AppState) => {
    const next = updater(read());
    write(next);
    setState(next);
  }, []);

  return [state, update];
}

export function daysSince(iso: string): number {
  const start = new Date(iso).getTime();
  const now = Date.now();
  return Math.max(0, Math.floor((now - start) / 86_400_000));
}

export function hoursSince(iso: string): number {
  const start = new Date(iso).getTime();
  const now = Date.now();
  return Math.max(0, Math.floor((now - start) / 3_600_000));
}

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export type Milestone = {
  days: number;
  title: string;
  badge: string;
  description: string;
};

export const MILESTONES: Milestone[] = [
  { days: 1, title: "First Day", badge: "🌱", description: "The hardest step. You started." },
  { days: 3, title: "72 Hours", badge: "⚡", description: "Acute withdrawal fading." },
  { days: 7, title: "One Week", badge: "🔥", description: "Neural rewiring begins." },
  { days: 14, title: "Two Weeks", badge: "💪", description: "Energy returning." },
  { days: 30, title: "One Month", badge: "🏆", description: "New baseline forming." },
  { days: 60, title: "Two Months", badge: "🚀", description: "Habits cementing." },
  { days: 90, title: "90 Day Reboot", badge: "👑", description: "Brain chemistry reset." },
  { days: 180, title: "Half Year", badge: "💎", description: "A different person." },
  { days: 365, title: "One Year", badge: "🌟", description: "Identity transformed." },
  { days: 730, title: "Two Years", badge: "🦅", description: "Freedom integrated." },
];

export function nextMilestone(days: number): Milestone {
  return MILESTONES.find((m) => m.days > days) ?? MILESTONES[MILESTONES.length - 1];
}

export function earnedMilestones(days: number): Milestone[] {
  return MILESTONES.filter((m) => m.days <= days);
}

export const HABIT_PRESETS = [
  { name: "Nicotine / Smoking", emoji: "🚬", category: "Substance", costPerDay: 10, unit: "cigarettes", unitsPerDay: 15 },
  { name: "Alcohol", emoji: "🍺", category: "Substance", costPerDay: 15, unit: "drinks", unitsPerDay: 4 },
  { name: "Drugs", emoji: "💊", category: "Substance", costPerDay: 25, unit: "uses", unitsPerDay: 1 },
  { name: "Pornography", emoji: "🔞", category: "Behavioral", costPerDay: 0, unit: "sessions", unitsPerDay: 1 },
  { name: "Masturbation", emoji: "✋", category: "Behavioral", costPerDay: 0, unit: "times", unitsPerDay: 1 },
  { name: "Sugar", emoji: "🍬", category: "Food", costPerDay: 5, unit: "grams", unitsPerDay: 80 },
  { name: "Social Media", emoji: "📱", category: "Digital", costPerDay: 0, unit: "hours", unitsPerDay: 3 },
  { name: "Gambling", emoji: "🎰", category: "Behavioral", costPerDay: 30, unit: "bets", unitsPerDay: 5 },
  { name: "Junk Food", emoji: "🍔", category: "Food", costPerDay: 12, unit: "meals", unitsPerDay: 2 },
  { name: "Caffeine", emoji: "☕", category: "Substance", costPerDay: 4, unit: "cups", unitsPerDay: 4 },
];

export const URGE_TIPS = [
  "Urges are like waves — they peak in 15-20 minutes and fall. Ride it.",
  "HALT: Are you Hungry, Angry, Lonely, or Tired? Address the root.",
  "Change your environment. Stand up. Walk outside. Splash cold water.",
  "Call or text someone. Connection is the opposite of addiction.",
  "Drink a full glass of cold water — slowly.",
  "Do 20 pushups or jumping jacks. Burn the energy.",
  "Remember why you started. Re-read your reasons.",
  "Picture your future self thanking you for this exact moment.",
  "The urge is not you. It's old wiring firing. You are the witness.",
  "Box breathing: 4 in, 4 hold, 4 out, 4 hold. Five rounds.",
];

export const COGNITIVE_DISTORTIONS = [
  { key: "all-or-nothing", label: "All-or-Nothing", desc: "One slip means total failure." },
  { key: "catastrophizing", label: "Catastrophizing", desc: "Expecting the worst possible outcome." },
  { key: "mind-reading", label: "Mind Reading", desc: "Assuming you know what others think." },
  { key: "overgeneralizing", label: "Overgeneralizing", desc: "One event becomes a never-ending pattern." },
  { key: "emotional-reasoning", label: "Emotional Reasoning", desc: "I feel it, so it must be true." },
  { key: "shoulds", label: "Shoulds & Musts", desc: "Rigid rules that fuel shame." },
  { key: "labeling", label: "Labeling", desc: "I'm an addict / failure / weak." },
  { key: "filtering", label: "Mental Filter", desc: "Only seeing the negatives." },
  { key: "personalization", label: "Personalization", desc: "Blaming yourself for things outside your control." },
  { key: "fortune-telling", label: "Fortune Telling", desc: "Predicting a bad future without evidence." },
];

export const COPING_PRESETS: { text: string; category: CopingStrategy["category"] }[] = [
  { text: "20 pushups or a brisk 10-min walk", category: "Physical" },
  { text: "Cold shower / splash face with cold water", category: "Physical" },
  { text: "Box breathing 5 rounds", category: "Physical" },
  { text: "Re-read my list of reasons", category: "Cognitive" },
  { text: "Urge surf — watch the wave for 15 min", category: "Cognitive" },
  { text: "Reframe with CBT module", category: "Cognitive" },
  { text: "Call my accountability partner", category: "Social" },
  { text: "Leave the environment, go to a public place", category: "Social" },
  { text: "Meditate for 10 minutes", category: "Spiritual" },
  { text: "Pray or read something meaningful", category: "Spiritual" },
];

// Streak helpers respecting sick days and day boundary
export function effectiveDaysSince(quitDateIso: string, settings: Settings): number {
  const boundaryMs = settings.dayBoundaryHour * 3_600_000;
  const start = new Date(quitDateIso).getTime();
  const now = Date.now() - boundaryMs;
  const raw = Math.max(0, Math.floor((now - (start - boundaryMs)) / 86_400_000));
  // Subtract sick days that fall within the window (don't count, don't break)
  const startDay = new Date(quitDateIso).toISOString().slice(0, 10);
  const sick = settings.sickDays.filter((d) => d >= startDay).length;
  return Math.max(0, raw - sick);
}

export type MeditationSession = {
  id: string;
  title: string;
  durationMin: number;
  category: "Breath" | "Body" | "Mind" | "Sleep";
  description: string;
  steps: { label: string; seconds: number }[];
};

export const MEDITATIONS: MeditationSession[] = [
  {
    id: "box-4",
    title: "Box Breathing",
    durationMin: 4,
    category: "Breath",
    description: "Navy SEAL technique to calm the nervous system fast.",
    steps: [
      { label: "Inhale", seconds: 4 },
      { label: "Hold", seconds: 4 },
      { label: "Exhale", seconds: 4 },
      { label: "Hold", seconds: 4 },
    ],
  },
  {
    id: "478",
    title: "4-7-8 Breath",
    durationMin: 5,
    category: "Breath",
    description: "Dr. Andrew Weil's relaxant breath — sleep aid + urge killer.",
    steps: [
      { label: "Inhale", seconds: 4 },
      { label: "Hold", seconds: 7 },
      { label: "Exhale", seconds: 8 },
    ],
  },
  {
    id: "coherent",
    title: "Coherent Breathing",
    durationMin: 6,
    category: "Breath",
    description: "5-second in, 5-second out — heart-rate variability boost.",
    steps: [
      { label: "Inhale", seconds: 5 },
      { label: "Exhale", seconds: 5 },
    ],
  },
  {
    id: "body-scan",
    title: "Body Scan",
    durationMin: 10,
    category: "Body",
    description: "Move attention head-to-toe. Drop tension. Re-inhabit yourself.",
    steps: [
      { label: "Crown of head", seconds: 60 },
      { label: "Face & jaw", seconds: 60 },
      { label: "Shoulders & arms", seconds: 60 },
      { label: "Chest & belly", seconds: 60 },
      { label: "Back", seconds: 60 },
      { label: "Hips & pelvis", seconds: 60 },
      { label: "Legs", seconds: 60 },
      { label: "Feet", seconds: 60 },
      { label: "Whole body", seconds: 120 },
    ],
  },
  {
    id: "urge-surf",
    title: "Urge Surfing",
    durationMin: 8,
    category: "Mind",
    description: "Watch the urge like a wave. Don't fight. Don't feed. Just witness.",
    steps: [
      { label: "Notice the urge", seconds: 60 },
      { label: "Where is it in the body?", seconds: 90 },
      { label: "Rate intensity 1-10", seconds: 30 },
      { label: "Breathe into the sensation", seconds: 120 },
      { label: "Watch it rise", seconds: 90 },
      { label: "Watch it peak", seconds: 60 },
      { label: "Watch it fall", seconds: 60 },
      { label: "You are still here", seconds: 30 },
    ],
  },
  {
    id: "sleep-wind",
    title: "Sleep Wind-Down",
    durationMin: 12,
    category: "Sleep",
    description: "Slow breath + body release to let go of the day.",
    steps: [
      { label: "Settle in", seconds: 120 },
      { label: "Slow inhale", seconds: 6 },
      { label: "Slow exhale", seconds: 8 },
      { label: "Release jaw", seconds: 60 },
      { label: "Release shoulders", seconds: 60 },
      { label: "Release belly", seconds: 60 },
      { label: "Drift", seconds: 300 },
    ],
  },
  {
    id: "gratitude-3",
    title: "Three Gratitudes",
    durationMin: 3,
    category: "Mind",
    description: "Anchor the moment in what's already good.",
    steps: [
      { label: "Person you're grateful for", seconds: 60 },
      { label: "Something your body can do", seconds: 60 },
      { label: "A small win today", seconds: 60 },
    ],
  },
];
