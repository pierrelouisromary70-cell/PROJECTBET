import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { vdotFromPerf } from "@/lib/vdot";
import { stravaActivityLooksLegit, StravaActivityForCheck } from "@/lib/anti-cheat";
import { maybeRewardReferrerOnFirstPR } from "@/lib/referral-hooks";
import { checkProfileAchievements } from "@/lib/achievements";

type StravaActivity = StravaActivityForCheck & {
  id: number;
  start_date: string;
};

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.stravaAccessToken)
    return NextResponse.json({ error: "Strava non connecté." }, { status: 400 });
  if (user.banned)
    return NextResponse.json({ error: "Compte suspendu." }, { status: 403 });

  const r = await fetch("https://www.strava.com/api/v3/athlete/activities?per_page=100", {
    headers: { Authorization: `Bearer ${user.stravaAccessToken}` },
  });
  if (!r.ok) return NextResponse.json({ error: "Strava API error" }, { status: 502 });
  const acts = (await r.json()) as StravaActivity[];

  let created = 0;
  let skipped = 0;
  for (const a of acts) {
    const sanity = stravaActivityLooksLegit(a);
    if (!sanity.ok) { skipped++; continue; }

    const targets = [5000, 10000, 21097, 42195];
    const match = targets.find((t) => Math.abs(a.distance - t) / t < 0.02);
    if (!match) continue;

    const stravaActivityId = String(a.id);
    const exists = await prisma.personalRecord.findUnique({ where: { stravaActivityId } });
    if (exists) continue;

    await prisma.personalRecord.create({
      data: {
        userId: user.id,
        distanceM: match,
        timeSec: a.moving_time,
        raceDate: new Date(a.start_date),
        source: "STRAVA",
        stravaActivityId,
        status: "VERIFIED",
        verifiedAt: new Date(),
      },
    });
    created++;
  }

  const allPRs = await prisma.personalRecord.findMany({
    where: { userId: user.id, status: "VERIFIED" },
  });
  const bestVdot = allPRs.reduce(
    (m, p) => Math.max(m, vdotFromPerf(p.distanceM, p.timeSec)),
    0,
  );
  if (bestVdot > 0) {
    await prisma.runnerProfile.update({
      where: { userId: user.id },
      data: { vdot: bestVdot },
    });
  }

  if (created > 0) {
    await maybeRewardReferrerOnFirstPR(user.id);
    await checkProfileAchievements(user.id);
  }

  return NextResponse.json({ created, skipped });
}
