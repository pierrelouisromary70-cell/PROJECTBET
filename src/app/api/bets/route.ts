import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeMatchupOdds, oddsToInt } from "@/lib/odds";
import { maybeRewardReferrerOnFirstBet } from "@/lib/referral-hooks";
import { checkProfileAchievements } from "@/lib/achievements";

const Body = z.object({
  raceId: z.string(),
  runnerAId: z.string(),
  runnerBId: z.string(),
  pickedId: z.string(),
  stake: z.number().int().min(10).max(100000),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const d = parsed.data;
  if (d.pickedId !== d.runnerAId && d.pickedId !== d.runnerBId) {
    return NextResponse.json({ error: "Pick invalide." }, { status: 400 });
  }
  if (d.runnerAId === d.runnerBId) {
    return NextResponse.json({ error: "Coureurs identiques." }, { status: 400 });
  }

  const race = await prisma.race.findUnique({
    where: { id: d.raceId },
    include: { entries: true },
  });
  if (!race) return NextResponse.json({ error: "course inconnue" }, { status: 404 });
  if (race.status !== "OPEN")
    return NextResponse.json({ error: "Paris fermés." }, { status: 400 });
  if (race.scheduledAt.getTime() <= Date.now())
    return NextResponse.json({ error: "Course déjà commencée." }, { status: 400 });

  const ids = new Set(race.entries.map((e) => e.runnerId));
  if (!ids.has(d.runnerAId) || !ids.has(d.runnerBId))
    return NextResponse.json({ error: "Coureurs hors course." }, { status: 400 });
  if (d.runnerAId === session.user.id || d.runnerBId === session.user.id) {
    // Interdire de parier sur soi pour éviter l'auto-sandbagging.
    return NextResponse.json({ error: "Tu ne peux pas parier sur une course où tu cours." }, { status: 400 });
  }

  // Recalcule la cote au moment du pari (et la fige sur le ticket).
  const [a, b] = await Promise.all([
    prisma.user.findUnique({
      where: { id: d.runnerAId },
      include: {
        profile: true,
        prs: { where: { status: "VERIFIED" }, orderBy: { raceDate: "desc" }, take: 1 },
      },
    }),
    prisma.user.findUnique({
      where: { id: d.runnerBId },
      include: {
        profile: true,
        prs: { where: { status: "VERIFIED" }, orderBy: { raceDate: "desc" }, take: 1 },
      },
    }),
  ]);
  if (!a || !b) return NextResponse.json({ error: "runners introuvables" }, { status: 404 });

  const ageDays = (u: NonNullable<typeof a>) =>
    u.prs[0] ? Math.floor((Date.now() - u.prs[0].raceDate.getTime()) / 86400000) : 9999;

  const odds = computeMatchupOdds(
    race.distanceM,
    { vdot: a.profile?.vdot ?? 30, trustScore: a.trustScore, prAgeDays: ageDays(a) },
    { vdot: b.profile?.vdot ?? 30, trustScore: b.trustScore, prAgeDays: ageDays(b) },
  );
  const pickedOdds = d.pickedId === d.runnerAId ? odds.oddsA : odds.oddsB;

  const bettor = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!bettor || bettor.tokens < d.stake)
    return NextResponse.json({ error: "Solde insuffisant." }, { status: 400 });

  const bet = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: bettor.id },
      data: {
        tokens: { decrement: d.stake },
        tokenLogs: { create: { delta: -d.stake, reason: "BET_STAKE" } },
      },
    });
    return tx.bet.create({
      data: {
        raceId: race.id,
        bettorId: bettor.id,
        runnerAId: d.runnerAId,
        runnerBId: d.runnerBId,
        pickedId: d.pickedId,
        stake: d.stake,
        oddsX100: oddsToInt(pickedOdds),
      },
    });
  });

  await maybeRewardReferrerOnFirstBet(bettor.id);
  await checkProfileAchievements(bettor.id);

  return NextResponse.json({ bet, oddsAtTime: pickedOdds });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });
  const bets = await prisma.bet.findMany({
    where: { bettorId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { race: true },
  });
  return NextResponse.json(bets);
}
