export interface ChallengeTemplate {
  id: string;
  name: string;
  emoji: string;
  category: string;
  badge: string;
  description: string;
  mode: "random" | "regular" | "free";
  recommendedDays: number;
  getTargetAmount: (currencyCode: string) => number;
  generateInstallments: (target: number, currencyCode: string) => number[];
}

/**
 * Multiplier helper for currencies where numbers are large (like XOF/XAF Franc CFA)
 * versus EUR/USD/GBP.
 */
function isHighDenomination(currencyCode: string): boolean {
  const high = ["XOF", "XAF", "GNF", "JPY", "CLP", "KRW", "VND"];
  return high.includes(currencyCode.toUpperCase());
}

export const CHALLENGE_TEMPLATES: ChallengeTemplate[] = [
  {
    id: "52_weeks",
    name: "Défi des 52 Semaines",
    emoji: "📈",
    category: "other",
    badge: "Le plus populaire",
    description: "Chaque semaine, épargne un montant qui augmente progressivement (+1€ ou +500 F chaque semaine).",
    mode: "regular",
    recommendedDays: 365,
    getTargetAmount: (curr) => {
      // In EUR: 1 + 2 + ... + 52 = 1 378 €
      // In XOF: 500 + 1000 + ... + 26000 = 689 000 F CFA
      return isHighDenomination(curr) ? 689000 : 1378;
    },
    generateInstallments: (target, curr) => {
      const isHigh = isHighDenomination(curr);
      const step = isHigh ? 500 : 1;
      const arr: number[] = [];
      for (let i = 1; i <= 52; i++) {
        arr.push(i * step);
      }
      return arr;
    },
  },
  {
    id: "100_envelopes",
    name: "Défi des 100 Enveloppes",
    emoji: "✉️",
    category: "other",
    badge: "Ludique & Addictif",
    description: "100 montants mélangés de 1 à 100 (ou 100 à 10 000 F). Tire au sort et coche au rythme de ton choix !",
    mode: "random",
    recommendedDays: 180,
    getTargetAmount: (curr) => {
      // In EUR: 1..100 sum = 5 050 €
      // In XOF: 100..10000 step 100 sum = 505 000 F CFA
      return isHighDenomination(curr) ? 505000 : 5050;
    },
    generateInstallments: (target, curr) => {
      const isHigh = isHighDenomination(curr);
      const step = isHigh ? 100 : 1;
      const arr: number[] = [];
      for (let i = 1; i <= 100; i++) {
        arr.push(i * step);
      }
      // Shuffle envelopes
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    },
  },
  {
    id: "emergency_30d",
    name: "Fonds d'Urgence Express",
    emoji: "🛡️",
    category: "emergency",
    badge: "Sécurité d'abord",
    description: "Construis un coussin de sécurité en 30 jours intensifs pour parer aux imprévus de la vie.",
    mode: "regular",
    recommendedDays: 30,
    getTargetAmount: (curr) => {
      return isHighDenomination(curr) ? 150000 : 300;
    },
    generateInstallments: (target) => {
      const count = 30;
      const base = Math.floor(target / count);
      const arr = Array(count).fill(base);
      const remainder = target - base * count;
      if (remainder > 0) arr[arr.length - 1] += remainder;
      return arr;
    },
  },
  {
    id: "micro_habits",
    name: "Micro-Épargne Café / Taxi",
    emoji: "☕",
    category: "other",
    badge: "Zéro effort",
    description: "60 petites coupures (le prix d'un café ou d'une course) pour économiser sans jamais s'en apercevoir.",
    mode: "regular",
    recommendedDays: 60,
    getTargetAmount: (curr) => {
      return isHighDenomination(curr) ? 60000 : 120;
    },
    generateInstallments: (target) => {
      const count = 60;
      const base = Math.floor(target / count);
      const arr = Array(count).fill(base);
      const remainder = target - base * count;
      if (remainder > 0) arr[arr.length - 1] += remainder;
      return arr;
    },
  },
];
