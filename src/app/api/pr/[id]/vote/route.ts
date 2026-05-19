import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { APPROVAL_THRESHOLD } from "@/lib/anti-cheat";
import { vdotFromPerf } from "@/lib/vdot";
import { maybeRewardReferrerOnFirstPR } from "@/lib/referral-hooks";
import { checkProfileAchievements } from "@/lib/achievements";

const Body = z.object({ approve: z.boolean() });

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad" }, { status: 400 });

  const pr = await prisma.personalRecord.findUnique({ where: { id: params.id } });
  if (!pr) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (pr.userId === session.user.id)
    return NextResponse.json({ error: "Tu ne peux pas voter ton propre PR." }, { status: 400 });
  if (pr.status !== "PENDING")
    return NextResponse.json({ error: "PR déjà tranché." }, { status: 400 });

  await prisma.pRVote.upsert({
    where: { prId_voterId: { prId: pr.id, voterId: session.user.id } },
    update: { approve: parsed.data.approve },
    create: { prId: pr.id, voterId: session.user.id, approve: parsed.data.approve },
  });

  const votes = await prisma.pRVote.findMany({ where: { prId: pr.id } });
  const score = votes.reduce((acc, v) => acc + (v.approve ? 1 : -1), 0);

  if (score >= APPROVAL_THRESHOLD) {
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
  } else if (score <= -APPROVAL_THRESHOLD) {
    await prisma.personalRecord.update({ where: { id: pr.id }, data: { status: "REJECTED" } });
  }

  return NextResponse.json({ score });
}
