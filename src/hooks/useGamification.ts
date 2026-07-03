import { useApp } from "../services/AppContext";

export interface Badge {
  id: string;
  label: string;
  emoji: string;
  desc: string;
  unlocked: boolean;
}

export interface Gamification {
  totalSaved: number;
  totalChecks: number;
  streak: number;
  longestStreak: number;
  level: number;
  levelLabel: string;
  xp: number;
  xpForNext: number;
  progressToNext: number;
  badges: Badge[];
  completedChallenges: number;
}

const LEVEL_LABELS = [
  "Débutant", "Apprenti", "Économe", "Persévérant", "Stratège",
  "Expert", "Maître", "Champion", "Légende", "Mythique",
];

const LEVEL_THRESHOLDS = [0, 5, 15, 30, 50, 75, 105, 140, 180, 225, 275, 330, 400, 480, 570];

function computeStreak(dates: string[]): { current: number; longest: number } {
  if (!dates.length) return { current: 0, longest: 0 };
  const days = Array.from(new Set(dates.map((d) => d.slice(0, 10)))).sort();
  let longest = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1]).getTime();
    const cur = new Date(days[i]).getTime();
    const diff = Math.round((cur - prev) / 86400000);
    if (diff === 1) run++;
    else if (diff > 1) run = 1;
    if (run > longest) longest = run;
  }
  
  // current streak (must end today or yesterday)
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const last = new Date(days[days.length - 1]);
  const gap = Math.round((today.getTime() - last.getTime()) / 86400000);
  let current = 0;
  if (gap <= 1) {
    current = 1;
    for (let i = days.length - 1; i > 0; i--) {
      const a = new Date(days[i]).getTime();
      const b = new Date(days[i - 1]).getTime();
      if (Math.round((a - b) / 86400000) === 1) current++;
      else break;
    }
  }
  return { current, longest };
}

export function useGamification(): { gamification: Gamification | null; loading: boolean } {
  const { state, loading } = useApp();

  if (loading || !state) {
    return { gamification: null, loading: true };
  }

  const checked = state.installments.filter((i) => i.is_checked && i.checked_at);
  const totalSaved = checked.reduce((s, i) => s + i.amount, 0);
  const totalChecks = checked.length;
  
  const { current: streak, longest: longestStreak } = computeStreak(
    checked.map((i) => i.checked_at as string),
  );
  
  const completedChallenges = state.challenges.filter((c) => c.status === "completed").length;

  const xp = totalChecks;
  let level = 0;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) level = i;
  }
  const xpStart = LEVEL_THRESHOLDS[level] ?? 0;
  const xpForNext = LEVEL_THRESHOLDS[level + 1] ?? xpStart + 50;
  const progressToNext = Math.min(100, Math.round(((xp - xpStart) / (xpForNext - xpStart)) * 100));

  const badges: Badge[] = [
    { id: "first", emoji: "🌱", label: "Premier pas", desc: "1er versement coché", unlocked: totalChecks >= 1 },
    { id: "ten", emoji: "💪", label: "Régulier", desc: "10 versements", unlocked: totalChecks >= 10 },
    { id: "fifty", emoji: "🔥", label: "En feu", desc: "50 versements", unlocked: totalChecks >= 50 },
    { id: "streak3", emoji: "⚡", label: "Élan", desc: "3 jours d'affilée", unlocked: longestStreak >= 3 },
    { id: "streak7", emoji: "🚀", label: "Une semaine", desc: "7 jours d'affilée", unlocked: longestStreak >= 7 },
    { id: "streak30", emoji: "🏔️", label: "Inarrêtable", desc: "30 jours d'affilée", unlocked: longestStreak >= 30 },
    { id: "champ", emoji: "🏆", label: "Champion", desc: "1 défi terminé", unlocked: completedChallenges >= 1 },
    { id: "champ5", emoji: "👑", label: "Roi de l'épargne", desc: "5 défis terminés", unlocked: completedChallenges >= 5 },
  ];

  const gamification: Gamification = {
    totalSaved,
    totalChecks,
    streak,
    longestStreak,
    level: level + 1,
    levelLabel: LEVEL_LABELS[Math.min(level, LEVEL_LABELS.length - 1)],
    xp,
    xpForNext,
    progressToNext,
    badges,
    completedChallenges,
  };

  return { gamification, loading: false };
}
