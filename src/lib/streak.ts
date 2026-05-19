import { prisma } from "./prisma";

// Bonus quotidien progressif avec streak.
// On crédite au plus une fois par jour calendaire (UTC).

export const STREAK_REWARDS = [5, 8, 12, 18, 25, 35, 50]; // jours 1..7
export const STREAK_BONUS_AT_30 = 200;

function sameDayUTC(a: Date, b: Date) {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

function consecutiveDayUTC(prev: Date, now: Date) {
  const prevDay = new Date(Date.UTC(prev.getUTCFullYear(), prev.getUTCMonth(), prev.getUTCDate()));
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return today.getTime() - prevDay.getTime() === 86400000;
}

export async function claimDailyBonus(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { granted: false };

  const now = new Date();
  if (user.lastDailyBonusAt && sameDayUTC(user.lastDailyBonusAt, now)) {
    return { granted: false, alreadyClaimed: true, streak: user.loginStreak };
  }

  const continued = user.lastDailyBonusAt && consecutiveDayUTC(user.lastDailyBonusAt, now);
  const newStreak = continued ? user.loginStreak + 1 : 1;

  let reward = STREAK_REWARDS[Math.min(newStreak, STREAK_REWARDS.length) - 1];
  if (newStreak % 30 === 0) reward += STREAK_BONUS_AT_30;

  await prisma.user.update({
    where: { id: userId },
    data: {
      tokens: { increment: reward },
      loginStreak: newStreak,
      lastDailyBonusAt: now,
      tokenLogs: { create: { delta: reward, reason: "DAILY_STREAK", ref: String(newStreak) } },
    },
  });

  return { granted: true, reward, streak: newStreak };
}
