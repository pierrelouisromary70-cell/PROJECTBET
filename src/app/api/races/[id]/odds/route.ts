import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeMatchupOdds } from "@/lib/odds";

// Pour une course, renvoie pour chaque paire de coureurs (A, B) les cotes calculées.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const race = await prisma.race.findUnique({
    where: { id: params.id },
    include: {
      entries: {
        include: {
          runner: {
            include: {
              profile: true,
              prs: {
                where: { status: "VERIFIED" },
                orderBy: { raceDate: "desc" },
                take: 1,
              },
            },
          },
        },
      },
    },
  });
  if (!race) return NextResponse.json({ error: "not found" }, { status: 404 });

  const runners = race.entries.map((e) => {
    const lastPR = e.runner.prs[0];
    const ageDays = lastPR
      ? Math.floor((Date.now() - lastPR.raceDate.getTime()) / (24 * 3600 * 1000))
      : 9999;
    return {
      id: e.runner.id,
      name: e.runner.displayName,
      vdot: e.runner.profile?.vdot ?? 30,
      trustScore: e.runner.trustScore,
      prAgeDays: ageDays,
    };
  });

  const matchups: Array<{
    aId: string; bId: string; aName: string; bName: string;
    oddsA: number; oddsB: number; probA: number; probB: number;
    predictedTimeA: number; predictedTimeB: number; confidence: number;
  }> = [];

  for (let i = 0; i < runners.length; i++) {
    for (let j = i + 1; j < runners.length; j++) {
      const a = runners[i], b = runners[j];
      const m = computeMatchupOdds(race.distanceM, a, b);
      matchups.push({
        aId: a.id, bId: b.id, aName: a.name, bName: b.name,
        ...m,
      });
    }
  }

  return NextResponse.json({ race: { id: race.id, name: race.name, distanceM: race.distanceM, scheduledAt: race.scheduledAt, status: race.status }, runners, matchups });
}
