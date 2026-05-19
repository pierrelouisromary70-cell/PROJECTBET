import { prisma } from "./prisma";
import { REFERRAL_REWARDS } from "./referral";

// Crédite le parrain lors du 1er chrono vérifié du filleul.
export async function maybeRewardReferrerOnFirstPR(refereeId: string) {
  const u = await prisma.user.findUnique({
    where: { id: refereeId },
    select: { referredById: true, referralFirstPRDone: true },
  });
  if (!u || !u.referredById || u.referralFirstPRDone) return;

  await prisma.$transaction([
    prisma.user.update({
      where: { id: refereeId },
      data: { referralFirstPRDone: true },
    }),
    prisma.user.update({
      where: { id: u.referredById },
      data: {
        tokens: { increment: REFERRAL_REWARDS.REFERRER_FIRST_PR },
        tokenLogs: {
          create: {
            delta: REFERRAL_REWARDS.REFERRER_FIRST_PR,
            reason: "REFERRAL_FIRST_PR",
            ref: refereeId,
          },
        },
      },
    }),
  ]);
}

// Crédite le parrain au 1er pari du filleul.
export async function maybeRewardReferrerOnFirstBet(refereeId: string) {
  const u = await prisma.user.findUnique({
    where: { id: refereeId },
    select: { referredById: true, referralFirstBetDone: true },
  });
  if (!u || !u.referredById || u.referralFirstBetDone) return;

  await prisma.$transaction([
    prisma.user.update({
      where: { id: refereeId },
      data: { referralFirstBetDone: true },
    }),
    prisma.user.update({
      where: { id: u.referredById },
      data: {
        tokens: { increment: REFERRAL_REWARDS.REFERRER_FIRST_BET },
        tokenLogs: {
          create: {
            delta: REFERRAL_REWARDS.REFERRER_FIRST_BET,
            reason: "REFERRAL_FIRST_BET",
            ref: refereeId,
          },
        },
      },
    }),
  ]);
}
