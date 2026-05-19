import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  ChallengeKind,
  challengeOdds,
  describeChallenge,
  probabilityOfSuccess,
} from "@/lib/challenge-engine";

const MAX_OPEN_PER_USER = 3;
const MIN_HOURS = 12;
const MAX_DAYS = 14;

const Body = z.object({
  kind: z.enum(["TIME", "LONG_RUN", "VOLUME", "STREAK"]),
  targetDistanceM: z.number().int().positive().optional(),
  targetTimeSec: z.number().int().positive().optional(),
  targetTotalKm: z.number().positive().optional(),
  targetDays: z.number().int().positive().max(30).optional(),
  deadline: z.string(),
  ownerStake: z.number().int().min(10).max(50000),
});

export async function GET(req: NextRequest) {
  const scope = req.nextUrl.searchParams.get("scope") ?? "open";
  const where =
    scope === "mine"
      ? {}
      : scope === "all"
      ? {}
      : { status: "OPEN" as const };

  const session = await getServerSession(authOptions);
  const filter =
    scope === "mine" && session?.user?.id
      ? { ...where, ownerId: session.user.id }
      : where;

  const items = await prisma.challenge.findMany({
    where: filter,
    orderBy: { deadline: "asc" },
    take: 100,
    include: {
      owner: { select: { id: true, displayName: true, profile: { select: { vdot: true } } } },
      _count: { select: { bets: true } },
      bets: { select: { side: true, stake: true } },
    },
  });

  // Pools pour chaque side
  const enriched = items.map((c) => {
    const yesPool = c.bets.filter((b) => b.side === "YES").reduce((a, b) => a + b.stake, 0);
    const noPool = c.bets.filter((b) => b.side === "NO").reduce((a, b) => a + b.stake, 0);
    const { bets, ...rest } = c;
    void bets;
    return { ...rest, yesPool, noPool };
  });

  return NextResponse.json(enriched);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;

  // Validation des champs requis par kind
  if (data.kind === "TIME" && (!data.targetDistanceM || !data.targetTimeSec))
    return NextResponse.json({ error: "TIME : distance + chrono requis." }, { status: 400 });
  if (data.kind === "LONG_RUN" && !data.targetDistanceM)
    return NextResponse.json({ error: "LONG_RUN : distance requise." }, { status: 400 });
  if (data.kind === "VOLUME" && (!data.targetTotalKm || !data.targetDays))
    return NextResponse.json({ error: "VOLUME : km totaux + jours requis." }, { status: 400 });
  if (data.kind === "STREAK" && !data.targetDays)
    return NextResponse.json({ error: "STREAK : jours requis." }, { status: 400 });

  const deadline = new Date(data.deadline);
  const now = new Date();
  const hoursAhead = (deadline.getTime() - now.getTime()) / 3600000;
  if (hoursAhead < MIN_HOURS) {
    return NextResponse.json({ error: `Délai minimum : ${MIN_HOURS} h.` }, { status: 400 });
  }
  if (hoursAhead > MAX_DAYS * 24) {
    return NextResponse.json({ error: `Délai maximum : ${MAX_DAYS} jours.` }, { status: 400 });
  }

  const openCount = await prisma.challenge.count({
    where: { ownerId: session.user.id, status: "OPEN" },
  });
  if (openCount >= MAX_OPEN_PER_USER) {
    return NextResponse.json(
      { error: `Tu as déjà ${MAX_OPEN_PER_USER} défis ouverts. Clôture-les d'abord.` },
      { status: 429 },
    );
  }

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { profile: true },
  });
  if (!me) return NextResponse.json({ error: "no user" }, { status: 404 });
  if (me.tokens < data.ownerStake)
    return NextResponse.json({ error: "Solde insuffisant pour la mise." }, { status: 400 });

  const vdot = me.profile?.vdot ?? 30;
  const p = probabilityOfSuccess({
    kind: data.kind as ChallengeKind,
    vdot,
    targetDistanceM: data.targetDistanceM,
    targetTimeSec: data.targetTimeSec,
    targetTotalKm: data.targetTotalKm,
    targetDays: data.targetDays,
  });
  const { pYes, oddsYes, oddsNo } = challengeOdds(p);

  const description = describeChallenge({
    kind: data.kind as ChallengeKind,
    targetDistanceM: data.targetDistanceM,
    targetTimeSec: data.targetTimeSec,
    targetTotalKm: data.targetTotalKm,
    targetDays: data.targetDays,
  });

  const challenge = await prisma.$transaction(async (tx) => {
    // Débite la mise de l'owner et crée son pari YES automatique.
    await tx.user.update({
      where: { id: me.id },
      data: {
        tokens: { decrement: data.ownerStake },
        tokenLogs: { create: { delta: -data.ownerStake, reason: "CHALLENGE_STAKE" } },
      },
    });
    const c = await tx.challenge.create({
      data: {
        ownerId: me.id,
        kind: data.kind,
        description,
        targetDistanceM: data.targetDistanceM,
        targetTimeSec: data.targetTimeSec,
        targetTotalKm: data.targetTotalKm,
        targetDays: data.targetDays,
        deadline,
        probSuccess: pYes,
        oddsYesX100: Math.round(oddsYes * 100),
        oddsNoX100: Math.round(oddsNo * 100),
        ownerStake: data.ownerStake,
      },
    });
    await tx.challengeBet.create({
      data: {
        challengeId: c.id,
        bettorId: me.id,
        side: "YES",
        stake: data.ownerStake,
        oddsX100: Math.round(oddsYes * 100),
        isOwner: true,
      },
    });
    return c;
  });

  return NextResponse.json(challenge);
}
