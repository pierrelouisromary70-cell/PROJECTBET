import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkChallengeFromActivities, StravaActivity } from "@/lib/challenge-engine";
import { settleChallenge } from "@/lib/challenge-settle";

// Vérifie via Strava si le défi de l'owner est rempli, et règle YES si oui.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const c = await prisma.challenge.findUnique({ where: { id: params.id } });
  if (!c) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (c.ownerId !== session.user.id)
    return NextResponse.json({ error: "Seul le créateur peut vérifier." }, { status: 403 });
  if (c.status !== "OPEN") return NextResponse.json({ error: "Défi clos." }, { status: 400 });

  const owner = await prisma.user.findUnique({ where: { id: c.ownerId } });
  if (!owner?.stravaAccessToken)
    return NextResponse.json({ error: "Strava non connecté." }, { status: 400 });

  const after = Math.floor(c.startAt.getTime() / 1000);
  const r = await fetch(
    `https://www.strava.com/api/v3/athlete/activities?per_page=100&after=${after}`,
    { headers: { Authorization: `Bearer ${owner.stravaAccessToken}` } },
  );
  if (!r.ok) return NextResponse.json({ error: "Strava API error" }, { status: 502 });
  const acts = (await r.json()) as StravaActivity[];

  const check = checkChallengeFromActivities(
    {
      kind: c.kind,
      targetDistanceM: c.targetDistanceM,
      targetTimeSec: c.targetTimeSec,
      targetTotalKm: c.targetTotalKm,
      targetDays: c.targetDays,
      startAt: c.startAt,
      deadline: c.deadline,
    },
    acts,
  );

  if (!check.satisfied) {
    return NextResponse.json({ satisfied: false });
  }
  await settleChallenge(c.id, "YES", check.evidenceUrl);
  return NextResponse.json({ satisfied: true, evidenceUrl: check.evidenceUrl });
}
