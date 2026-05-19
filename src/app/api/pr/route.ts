import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validatePRSubmission } from "@/lib/anti-cheat";
import { vdotFromPerf } from "@/lib/vdot";

const Body = z.object({
  distanceM: z.number().int().positive(),
  timeSec: z.number().int().positive(),
  raceDate: z.string(),
  source: z.enum(["MANUAL", "OFFICIAL"]),
  evidenceUrl: z.string().url().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;

  const profile = await prisma.runnerProfile.findUnique({ where: { userId: session.user.id } });
  const currentVdot = profile?.vdot ?? 30;

  const check = validatePRSubmission({
    distanceM: data.distanceM,
    timeSec: data.timeSec,
    source: data.source,
    hasEvidence: !!data.evidenceUrl,
    currentVdot,
  });
  if (!check.ok) return NextResponse.json({ error: check.reason }, { status: 400 });

  // Cooldown 24h par distance
  const last = await prisma.personalRecord.findFirst({
    where: {
      userId: session.user.id,
      distanceM: data.distanceM,
      status: "VERIFIED",
      verifiedAt: { gte: new Date(Date.now() - 24 * 3600 * 1000) },
    },
  });
  if (last) {
    return NextResponse.json(
      { error: "Un PR a déjà été vérifié sur cette distance dans les dernières 24h." },
      { status: 429 },
    );
  }

  const status = check.needsCommunityReview ? "PENDING" : "VERIFIED";

  const pr = await prisma.personalRecord.create({
    data: {
      userId: session.user.id,
      distanceM: data.distanceM,
      timeSec: data.timeSec,
      raceDate: new Date(data.raceDate),
      source: data.source,
      evidenceUrl: data.evidenceUrl,
      status,
      verifiedAt: status === "VERIFIED" ? new Date() : null,
    },
  });

  if (status === "VERIFIED") {
    const newVdot = Math.max(currentVdot, vdotFromPerf(data.distanceM, data.timeSec));
    await prisma.runnerProfile.update({
      where: { userId: session.user.id },
      data: { vdot: newVdot },
    });
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        tokens: { increment: 25 },
        tokenLogs: { create: { delta: 25, reason: "PR_VERIFIED_BONUS", ref: pr.id } },
      },
    });
  }

  return NextResponse.json({ pr, status, needsReview: !!check.needsCommunityReview });
}
