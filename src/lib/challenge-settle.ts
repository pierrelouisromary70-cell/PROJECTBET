import { prisma } from "./prisma";
import { checkProfileAchievements } from "./achievements";

// Règle un défi en distribuant les paris.
//  - YES wins  → side YES gagne, payout = stake × oddsYesX100 / 100
//  - NO wins   → side NO gagne, payout = stake × oddsNoX100 / 100
//  - VOID      → mises rendues
export async function settleChallenge(
  challengeId: string,
  outcome: "YES" | "NO" | "VOID",
  evidenceUrl?: string,
) {
  const c = await prisma.challenge.findUnique({
    where: { id: challengeId },
    include: { bets: true },
  });
  if (!c || c.status !== "OPEN") return null;

  const newStatus =
    outcome === "YES" ? "RESOLVED_YES" : outcome === "NO" ? "RESOLVED_NO" : "VOID";

  await prisma.$transaction(async (tx) => {
    for (const b of c.bets) {
      if (outcome === "VOID") {
        await tx.challengeBet.update({
          where: { id: b.id },
          data: { status: "VOID", payout: b.stake, settledAt: new Date() },
        });
        await tx.user.update({
          where: { id: b.bettorId },
          data: {
            tokens: { increment: b.stake },
            tokenLogs: {
              create: { delta: b.stake, reason: "CHALLENGE_VOID_REFUND", ref: c.id },
            },
          },
        });
        continue;
      }
      const won = b.side === outcome;
      const payout = won ? Math.floor((b.stake * b.oddsX100) / 100) : 0;
      await tx.challengeBet.update({
        where: { id: b.id },
        data: { status: won ? "WON" : "LOST", payout, settledAt: new Date() },
      });
      if (won) {
        await tx.user.update({
          where: { id: b.bettorId },
          data: {
            tokens: { increment: payout },
            tokenLogs: {
              create: { delta: payout, reason: "CHALLENGE_PAYOUT", ref: c.id },
            },
          },
        });
      }
    }
    await tx.challenge.update({
      where: { id: c.id },
      data: { status: newStatus, resolvedAt: new Date(), evidenceUrl: evidenceUrl ?? c.evidenceUrl },
    });
  });

  // Achievements possibles pour les parieurs.
  const bettors = Array.from(new Set(c.bets.map((b) => b.bettorId)));
  for (const id of bettors) await checkProfileAchievements(id);

  return newStatus;
}

// Expire automatiquement les défis dont la deadline est passée.
export async function expireOverdueChallenges() {
  const expired = await prisma.challenge.findMany({
    where: { status: "OPEN", deadline: { lt: new Date() } },
    select: { id: true },
  });
  for (const c of expired) {
    await settleChallenge(c.id, "NO"); // pas de preuve = échec
  }
  return expired.length;
}
