import { prisma } from "./prisma";

export type AchievementDef = {
  code: string;
  title: string;
  description: string;
  reward: number;
  emoji: string;
};

export const ACHIEVEMENTS: AchievementDef[] = [
  { code: "FIRST_PR", title: "Premier chrono", description: "Valide ton premier PR.", reward: 50, emoji: "⏱️" },
  { code: "FIRST_BET", title: "Premier pari", description: "Place ton premier pari.", reward: 30, emoji: "🎟️" },
  { code: "FIRST_WIN", title: "Première victoire", description: "Gagne un pari.", reward: 100, emoji: "🏆" },
  { code: "BIG_WIN", title: "Outsider", description: "Gagne un pari à cote ≥ 5.00.", reward: 250, emoji: "💥" },
  { code: "STREAK_7", title: "Régulier", description: "7 jours de connexion consécutifs.", reward: 100, emoji: "🔥" },
  { code: "STREAK_30", title: "Discipliné", description: "30 jours de connexion consécutifs.", reward: 500, emoji: "🧘" },
  { code: "CARBON_OWNER", title: "Carbone unlocked", description: "Possède une paire carbone.", reward: 500, emoji: "🚀" },
  { code: "FULL_OUTFIT", title: "Look complet", description: "Équipe-toi des 6 catégories.", reward: 200, emoji: "👗" },
  { code: "REFERRER_1", title: "Bouche-à-oreille", description: "Parraine 1 coureur.", reward: 100, emoji: "🤝" },
  { code: "REFERRER_5", title: "Ambassadeur", description: "Parraine 5 coureurs.", reward: 500, emoji: "📣" },
  { code: "REFERRER_25", title: "Légende du club", description: "Parraine 25 coureurs.", reward: 2500, emoji: "👑" },
  { code: "VDOT_50", title: "VDOT 50+", description: "Atteins un VDOT de 50.", reward: 200, emoji: "📈" },
  { code: "VDOT_60", title: "VDOT 60+", description: "Atteins un VDOT de 60 (compétiteur).", reward: 500, emoji: "📈" },
  { code: "VDOT_70", title: "VDOT 70+", description: "Élite régional.", reward: 1500, emoji: "📈" },
  { code: "MARATHON_FINISHER", title: "Marathonien", description: "Valide un chrono sur marathon.", reward: 300, emoji: "🥇" },
];

export const ACH_BY_CODE: Record<string, AchievementDef> =
  Object.fromEntries(ACHIEVEMENTS.map((a) => [a.code, a]));

// Débloque l'achievement si pas déjà fait, et crédite la récompense.
export async function unlockAchievement(userId: string, code: string) {
  const def = ACH_BY_CODE[code];
  if (!def) return null;
  const exists = await prisma.achievement.findUnique({
    where: { userId_code: { userId, code } },
  });
  if (exists) return null;

  await prisma.$transaction([
    prisma.achievement.create({ data: { userId, code } }),
    prisma.user.update({
      where: { id: userId },
      data: {
        tokens: { increment: def.reward },
        tokenLogs: { create: { delta: def.reward, reason: "ACHIEVEMENT", ref: code } },
      },
    }),
  ]);
  return def;
}

// Évalue plusieurs achievements liés à l'état courant de l'utilisateur.
// Appelé après des actions clés (vérif PR, pari gagné, achat, etc.).
export async function checkProfileAchievements(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
      prs: { where: { status: "VERIFIED" } },
      bets: true,
      inventory: { include: { item: true } },
      referrals: true,
    },
  });
  if (!user) return [];

  const unlocked: AchievementDef[] = [];
  const tryUnlock = async (code: string) => {
    const def = await unlockAchievement(userId, code);
    if (def) unlocked.push(def);
  };

  if (user.prs.length >= 1) await tryUnlock("FIRST_PR");
  if (user.bets.length >= 1) await tryUnlock("FIRST_BET");
  if (user.bets.some((b) => b.status === "WON")) await tryUnlock("FIRST_WIN");
  if (user.bets.some((b) => b.status === "WON" && b.oddsX100 >= 500)) await tryUnlock("BIG_WIN");
  if (user.loginStreak >= 7) await tryUnlock("STREAK_7");
  if (user.loginStreak >= 30) await tryUnlock("STREAK_30");
  if (user.inventory.some((i) => i.item.tier === "carbon")) await tryUnlock("CARBON_OWNER");

  const cats = new Set(user.inventory.map((i) => i.item.category));
  if (cats.size >= 6) await tryUnlock("FULL_OUTFIT");

  const refCount = user.referrals.length;
  if (refCount >= 1) await tryUnlock("REFERRER_1");
  if (refCount >= 5) await tryUnlock("REFERRER_5");
  if (refCount >= 25) await tryUnlock("REFERRER_25");

  const vdot = user.profile?.vdot ?? 0;
  if (vdot >= 50) await tryUnlock("VDOT_50");
  if (vdot >= 60) await tryUnlock("VDOT_60");
  if (vdot >= 70) await tryUnlock("VDOT_70");

  if (user.prs.some((p) => p.distanceM === 42195)) await tryUnlock("MARATHON_FINISHER");

  return unlocked;
}
