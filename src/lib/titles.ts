// Titres affichés à côté du pseudo. Débloqués par un achievement.
// L'utilisateur choisit lequel afficher via /api/profile/title.

export const TITLES_BY_ACHIEVEMENT: Record<string, string> = {
  FIRST_PR: "Coureur certifié",
  FIRST_BET: "Parieur",
  FIRST_WIN: "Gagnant",
  BIG_WIN: "Outsider",
  STREAK_7: "Régulier",
  STREAK_30: "Discipliné",
  CARBON_OWNER: "Carbone",
  FULL_OUTFIT: "Stylé",
  REFERRER_1: "Recruteur",
  REFERRER_5: "Ambassadeur",
  REFERRER_25: "Légende du club",
  VDOT_50: "VDOT 50+",
  VDOT_60: "Compétiteur",
  VDOT_70: "Élite",
  MARATHON_FINISHER: "Marathonien",
};

export function titleFor(code: string | null | undefined): string | null {
  if (!code) return null;
  return TITLES_BY_ACHIEVEMENT[code] ?? null;
}
