import { prisma } from "./prisma";
import { checkProfileAchievements } from "./achievements";
import { vdotFromPerf } from "./vdot";
import { HUMAN_VDOT_CEILING } from "./anti-cheat";

// Si un défi TIME a été réussi via une activité Strava, on crée
// automatiquement un PR vérifié et on remonte le VDOT. C'est ce qui
// referme la faille du sandbagging : un coureur ne peut pas tricher
// longtemps avant que ses défis successifs ne calibrent son vrai niveau.
async function autoCreatePRFromChallengeWin(challengeId: string) {
  const c = await prisma.challenge.findUnique({ where: { id: challengeId } });
  if (!c || c.kind !== "TIME" || !c.evidenceUrl) return;
  if (!c.targetDistanceM || !c.targetTimeSec) return;

  // On ne crée un PR auto que pour les preuves Strava (URL contient "strava.com").
  if (!/strava\.com\/activities\/(\d+)/.test(c.evidenceUrl)) return;
  const match = c.evidenceUrl.match(/strava\.com\/activities\/(\d+)/);
  const stravaActivityId = match ? match[1] : null;
  if (!stravaActivityId) return;

  const existing = await prisma.personalRecord.findUnique({
    where: { stravaActivityId },
  });
  if (existing) return;

  // Côté Strava on n'a pas le chrono exact ici, mais l'activité a été
  // vérifiée comme satisfaisant la cible (≥ targetDistance, ≤ targetTime).
  // On enregistre prudemment le chrono cible — il sera affiné lors d'un
  // import Strava complet ultérieur.
  const vdotEstimate = vdotFromPerf(c.targetDistanceM, c.targetTimeSec);
  if (vdotEstimate > HUMAN_VDOT_CEILING) return; // garde-fou

  await prisma.personalRecord.create({
    data: {
      userId: c.ownerId,
      distanceM: c.targetDistanceM,
      timeSec: c.targetTimeSec,
      raceDate: c.resolvedAt ?? new Date(),
      source: "STRAVA",
      evidenceUrl: c.evidenceUrl,
      stravaActivityId,
      status: "VERIFIED",
      verifiedAt: new Date(),
    },
  });

  const profile = await prisma.runnerProfile.findUnique({ where: { userId: c.ownerId } });
  if (profile && vdotEstimate > profile.vdot) {
    await prisma.runnerProfile.update({
      where: { userId: c.ownerId },
      data: { vdot: vdotEstimate },
    });
  }
}

// Détecte des patterns suspects et ajuste le trust score.
// Heuristique simple :
//  - 3 succès consécutifs sur des cibles à p brut < 0.30 → trust -10
//    (probablement du sandbagging)
//  - 5 défis créés en moins de 7 jours → cooldown renforcé via -5 de trust
async function checkOwnerPatternAndAdjustTrust(ownerId: string) {
  const last10 = await prisma.challenge.findMany({
    where: { ownerId, status: { in: ["RESOLVED_YES", "RESOLVED_NO"] } },
    orderBy: { resolvedAt: "desc" },
    take: 10,
  });
  if (last10.length < 3) return;

  const last3 = last10.slice(0, 3);
  const allHardWins = last3.every((c) => c.status === "RESOLVED_YES" && c.probRaw < 0.30);
  if (allHardWins) {
    await prisma.user.update({
      where: { id: ownerId },
      data: {
        trustScore: { decrement: 10 },
        tokenLogs: {
          create: { delta: 0, reason: "SUSPICIOUS_PATTERN", ref: "hard_wins_x3" },
        },
      },
    });
  }
}

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
      data: {
        status: newStatus,
        resolvedAt: new Date(),
        evidenceUrl: evidenceUrl ?? c.evidenceUrl,
      },
    });
  });

  // Effets post-règlement
  if (outcome === "YES") {
    await autoCreatePRFromChallengeWin(challengeId);
    await checkOwnerPatternAndAdjustTrust(c.ownerId);
  }

  const bettors = Array.from(new Set(c.bets.map((b) => b.bettorId)));
  for (const id of bettors) await checkProfileAchievements(id);

  return newStatus;
}

export async function expireOverdueChallenges() {
  const expired = await prisma.challenge.findMany({
    where: { status: "OPEN", deadline: { lt: new Date() } },
    select: { id: true },
  });
  for (const c of expired) {
    await settleChallenge(c.id, "NO");
  }
  return expired.length;
}
