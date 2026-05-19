import { prisma } from "./prisma";
import { DuelKind, decideWinner } from "./duel-engine";
import { checkProfileAchievements } from "./achievements";
import { addWarContribution } from "./club-war";

const HOUSE_VIG = 0.07; // sur le pot direct des duellistes

export async function settleDuelIfReady(duelId: string, force = false) {
  const d = await prisma.duel.findUnique({
    where: { id: duelId },
    include: { bets: true },
  });
  if (!d || d.status !== "OPEN") return null;

  const ready =
    force ||
    (d.challengerResult != null && d.opponentResult != null) ||
    d.deadline.getTime() <= Date.now();
  if (!ready) return null;

  const winnerKey = decideWinner(d.kind as DuelKind, d.challengerResult, d.opponentResult);
  const winnerId =
    winnerKey === "CHALLENGER" ? d.challengerId :
    winnerKey === "OPPONENT" ? d.opponentId : null;

  await prisma.$transaction(async (tx) => {
    if (winnerId == null) {
      // Match nul : on rend les mises des duellistes et on annule les paris.
      await tx.user.update({
        where: { id: d.challengerId },
        data: {
          tokens: { increment: d.stakePerSide },
          tokenLogs: { create: { delta: d.stakePerSide, reason: "DUEL_DRAW_REFUND", ref: d.id } },
        },
      });
      await tx.user.update({
        where: { id: d.opponentId },
        data: {
          tokens: { increment: d.stakePerSide },
          tokenLogs: { create: { delta: d.stakePerSide, reason: "DUEL_DRAW_REFUND", ref: d.id } },
        },
      });
      for (const b of d.bets) {
        await tx.challengeBet; // noop pour typage
        await tx.duelBet.update({
          where: { id: b.id },
          data: { status: "VOID", payout: b.stake, settledAt: new Date() },
        });
        await tx.user.update({
          where: { id: b.bettorId },
          data: {
            tokens: { increment: b.stake },
            tokenLogs: { create: { delta: b.stake, reason: "DUEL_VOID_REFUND", ref: d.id } },
          },
        });
      }
      await tx.duel.update({
        where: { id: d.id },
        data: { status: "DRAW", resolvedAt: new Date() },
      });
      return;
    }

    // Pot duelliste : vig prélevée, le reste va au gagnant.
    const winnerShare = Math.floor(d.pot * (1 - HOUSE_VIG));
    await tx.user.update({
      where: { id: winnerId },
      data: {
        tokens: { increment: winnerShare },
        tokenLogs: { create: { delta: winnerShare, reason: "DUEL_WIN", ref: d.id } },
      },
    });

    // Paris spectateurs
    for (const b of d.bets) {
      const won = b.pickedId === winnerId;
      const payout = won ? Math.floor((b.stake * b.oddsX100) / 100) : 0;
      await tx.duelBet.update({
        where: { id: b.id },
        data: { status: won ? "WON" : "LOST", payout, settledAt: new Date() },
      });
      if (won) {
        await tx.user.update({
          where: { id: b.bettorId },
          data: {
            tokens: { increment: payout },
            tokenLogs: { create: { delta: payout, reason: "DUEL_BET_PAYOUT", ref: d.id } },
          },
        });
      }
    }

    await tx.duel.update({
      where: { id: d.id },
      data: {
        status: winnerKey === "CHALLENGER" ? "RESOLVED_CHALLENGER" : "RESOLVED_OPPONENT",
        resolvedAt: new Date(),
      },
    });
  });

  // Effets post-règlement
  if (winnerId) {
    await addWarContribution({
      userId: winnerId,
      points: 150,
      source: "DUEL_WIN",
      sourceRef: d.id,
    });
    await checkProfileAchievements(winnerId);
  }
  const bettors = Array.from(new Set(d.bets.map((b) => b.bettorId)));
  for (const id of bettors) await checkProfileAchievements(id);

  return winnerKey;
}

export async function expireOverdueDuels() {
  const expired = await prisma.duel.findMany({
    where: { status: "OPEN", deadline: { lt: new Date() } },
    select: { id: true },
  });
  for (const c of expired) await settleDuelIfReady(c.id, true);
  // Annule aussi les PROPOSED dont la deadline est passée.
  const stale = await prisma.duel.findMany({
    where: { status: "PROPOSED", deadline: { lt: new Date() } },
  });
  for (const d of stale) {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: d.challengerId },
        data: {
          tokens: { increment: d.stakePerSide },
          tokenLogs: { create: { delta: d.stakePerSide, reason: "DUEL_REFUND_STALE", ref: d.id } },
        },
      }),
      prisma.duel.update({ where: { id: d.id }, data: { status: "EXPIRED", pot: 0 } }),
    ]);
  }
  return expired.length + stale.length;
}
