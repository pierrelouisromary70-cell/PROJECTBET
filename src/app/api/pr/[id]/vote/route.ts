import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computePRVoteOutcome, MIN_DISTINCT_VOTERS } from "@/lib/anti-cheat";
import { vdotFromPerf } from "@/lib/vdot";
import { maybeRewardReferrerOnFirstPR } from "@/lib/referral-hooks";
import { checkProfileAchievements } from "@/lib/achievements";

const Body = z.object({ approve: z.boolean() });

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad" }, { status: 400 });

  const voter = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!voter || voter.banned)
    return NextResponse.json({ error: "Compte non habilité." }, { status: 403 });

  // Anti-collusion : un votant doit avoir un PR vérifié pour voter.
  const voterVerifiedCount = await prisma.personalRecord.count({
    where: { userId: voter.id, status: "VERIFIED" },
  });
  if (voterVerifiedCount === 0)
    return NextResponse.json(
      { error: "Pour voter, tu dois avoir au moins un chrono vérifié." },
      { status: 403 },
    );

  const pr = await prisma.personalRecord.findUnique({ where: { id: params.id } });
  if (!pr) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (pr.userId === voter.id)
    return NextResponse.json({ error: "Tu ne peux pas voter ton propre PR." }, { status: 400 });
  if (pr.status !== "PENDING")
    return NextResponse.json({ error: "PR déjà tranché." }, { status: 400 });

  await prisma.pRVote.upsert({
    where: { prId_voterId: { prId: pr.id, voterId: voter.id } },
    update: { approve: parsed.data.approve },
    create: { prId: pr.id, voterId: voter.id, approve: parsed.data.approve },
  });

  // Récupère tous les votes avec trust score des votants.
  const votes = await prisma.pRVote.findMany({
    where: { prId: pr.id },
    include: { voter: { select: { trustScore: true } } },
  });
  const outcome = computePRVoteOutcome(
    votes.map((v) => ({ voterId: v.voterId, approve: v.approve, voterTrust: v.voter.trustScore })),
  );

  if (outcome.decision === "APPROVE") {
    await prisma.personalRecord.update({
      where: { id: pr.id },
      data: { status: "VERIFIED", verifiedAt: new Date() },
    });
    const profile = await prisma.runnerProfile.findUnique({ where: { userId: pr.userId } });
    if (profile) {
      const newVdot = Math.max(profile.vdot, vdotFromPerf(pr.distanceM, pr.timeSec));
      await prisma.runnerProfile.update({ where: { userId: pr.userId }, data: { vdot: newVdot } });
    }
    await maybeRewardReferrerOnFirstPR(pr.userId);
    await checkProfileAchievements(pr.userId);
  } else if (outcome.decision === "REJECT") {
    // Sanction : -5 trust pour l'auteur d'un PR rejeté.
    await prisma.personalRecord.update({ where: { id: pr.id }, data: { status: "REJECTED" } });
    await prisma.user.update({
      where: { id: pr.userId },
      data: { trustScore: { decrement: 5 } },
    });
  }

  return NextResponse.json({
    score: outcome.score.toFixed(2),
    decision: outcome.decision,
    distinctVoters: new Set(votes.map((v) => v.voterId)).size,
    minVoters: MIN_DISTINCT_VOTERS,
  });
}
