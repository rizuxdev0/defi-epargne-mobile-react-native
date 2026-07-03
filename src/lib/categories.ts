export interface Category {
  id: string;
  label: string;
  emoji: string;
}

export const CATEGORIES: Category[] = [
  { id: "travel",     label: "Voyage",       emoji: "✈️" },
  { id: "emergency",  label: "Urgence",      emoji: "🛡️" },
  { id: "tech",       label: "Tech / Phone", emoji: "📱" },
  { id: "education",  label: "Éducation",    emoji: "🎓" },
  { id: "family",     label: "Famille",      emoji: "👨‍👩‍👧" },
  { id: "wedding",    label: "Mariage",      emoji: "💍" },
  { id: "vehicle",    label: "Véhicule",     emoji: "🚗" },
  { id: "home",       label: "Logement",     emoji: "🏠" },
  { id: "business",   label: "Business",     emoji: "💼" },
  { id: "gift",       label: "Cadeau",       emoji: "🎁" },
  { id: "other",      label: "Autre",        emoji: "🎯" },
];

export function getCategory(id: string | null | undefined): Category | undefined {
  if (!id) return undefined;
  return CATEGORIES.find((c) => c.id === id);
}
