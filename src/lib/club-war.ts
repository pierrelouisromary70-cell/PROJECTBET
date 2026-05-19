import { prisma } from "./prisma";

const WAR_VIG = 0.05;

// Ajoute des points à un user pour la guerre active de son club (s'il en a une).
// Source vient de : DUEL_WIN, CHALLENGE_WIN, PR_VERIFIED, ACTIVITY_KM.
export async function addWarContribution(args: {
  userId: string;
  points: number;
  source: string;
  sourceRef?: string;
}) {
  const member = await prisma.clubMember.findUnique({ where: { userId: args.userId } });
  if (!member) return;
  const war = await prisma.clubWar.findFirst({
    where: {
      status: "ACTIVE",
      OR: [{ clubAId: member.clubId }, { clubBId: member.clubId }],
      endAt: { gt: new Date() },
    },
  });
  if (!war) return;

  await prisma.$transaction(async (tx) => {
    await tx.clubWarContribution.create({
      data: {
        warId: war.id,
        userId: args.userId,
        clubId: member.clubId,
        source: args.source,
        sourceRef: args.sourceRef,
        points: args.points,
      },
    });
    await tx.clubMember.update({
      where: { id: member.id },
      data: { warPoints: { increment: args.points } },
    });
    if (member.clubId === war.clubAId) {
      await tx.clubWar.update({ where: { id: war.id }, data: { scoreA: { increment: args.points } } });
    } else {
      await tx.clubWar.update({ where: { id: war.id }, data: { scoreB: { increment: args.points } } });
    }
  });
}

// Règle une guerre échue : déclare un vainqueur et distribue le pot.
// Distribution : 50 % au trésor du club gagnant, 50 % réparti aux contributeurs
// du club gagnant au prorata de leurs points.
export async function settleWar(warId: string) {
  const war = await prisma.clubWar.findUnique({
    where: { id: warId },
    include: { contributions: true },
  });
  if (!war || war.status !== "ACTIVE") return null;

  let winnerId: string | null = null;
  if (war.scoreA > war.scoreB) winnerId = war.clubAId;
  else if (war.scoreB > war.scoreA) winnerId = war.clubBId;

  await prisma.$transaction(async (tx) => {
    if (winnerId == null) {
      // Égalité parfaite : on rembourse chaque club.
      await tx.club.update({ where: { id: war.clubAId }, data: { treasury: { increment: war.stakePerSide } } });
      await tx.club.update({ where: { id: war.clubBId }, data: { treasury: { increment: war.stakePerSide } } });
      await tx.clubWar.update({ where: { id: war.id }, data: { status: "RESOLVED", resolvedAt: new Date() } });
      return;
    }
    const netPot = Math.floor(war.pot * (1 - WAR_VIG));
    const treasuryShare = Math.floor(netPot * 0.5);
    const contributorsShare = netPot - treasuryShare;

    await tx.club.update({
      where: { id: winnerId },
      data: { treasury: { increment: treasuryShare } },
    });

    const winContribs = war.contributions.filter((c) => c.clubId === winnerId);
    const totalPoints = winContribs.reduce((acc, c) => acc + c.points, 0);
    if (totalPoints > 0 && contributorsShare > 0) {
      const perUser = new Map<string, number>();
      for (const c of winContribs) perUser.set(c.userId, (perUser.get(c.userId) ?? 0) + c.points);
      for (const [userId, points] of perUser) {
        const share = Math.floor((points / totalPoints) * contributorsShare);
        if (share > 0) {
          await tx.user.update({
            where: { id: userId },
            data: {
              tokens: { increment: share },
              tokenLogs: { create: { delta: share, reason: "WAR_PAYOUT", ref: war.id } },
            },
          });
        }
      }
    }

    await tx.clubWar.update({
      where: { id: war.id },
      data: { status: "RESOLVED", resolvedAt: new Date(), winnerId },
    });
    // Reset des warPoints des membres du club gagnant ET perdant.
    await tx.clubMember.updateMany({
      where: { clubId: { in: [war.clubAId, war.clubBId] } },
      data: { warPoints: 0 },
    });
  });

  return winnerId;
}

export async function settleEndedWars() {
  const ended = await prisma.clubWar.findMany({
    where: { status: "ACTIVE", endAt: { lt: new Date() } },
    select: { id: true },
  });
  for (const w of ended) await settleWar(w.id);
  return ended.length;
}
