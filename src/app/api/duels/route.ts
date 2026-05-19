import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { describeDuel, duelOdds, DuelKind } from "@/lib/duel-engine";

const MIN_HOURS = 24;
const MAX_DAYS = 14;
const MIN_STAKE = 50;
const MAX_STAKE = 10000;

const Body = z.object({
  opponentId: z.string(),
  kind: z.enum(["FASTEST_TIME", "LONG_RUN", "VOLUME"]),
  targetDistanceM: z.number().int().positive().optional(),
  deadline: z.string(),
  stakePerSide: z.number().int().min(MIN_STAKE).max(MAX_STAKE),
});

export async function GET(req: NextRequest) {
  const scope = req.nextUrl.searchParams.get("scope") ?? "open";
  const session = await getServerSession(authOptions);

  const where =
    scope === "mine" && session?.user?.id
      ? { OR: [{ challengerId: session.user.id }, { opponentId: session.user.id }] }
      : scope === "all"
      ? {}
      : { status: { in: ["PROPOSED", "OPEN"] } };

  const items = await prisma.duel.findMany({
    where,
    orderBy: { deadline: "asc" },
    take: 100,
    include: {
      challenger: { select: { id: true, displayName: true, profile: { select: { vdot: true } } } },
      opponent: { select: { id: true, displayName: true, profile: { select: { vdot: true } } } },
      _count: { select: { bets: true } },
    },
  });

  return NextResponse.json(items);
}

async function buildDuelistInput(userId: string, targetDistanceM: number | null) {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true, prs: { where: { status: "VERIFIED" }, orderBy: { raceDate: "desc" } } },
  });
  if (!u) return null;
  const latest = u.prs[0];
  return {
    user: u,
    input: {
      vdot: u.profile?.vdot ?? 30,
      trustScore: u.trustScore,
      hasStrava: !!u.stravaId,
      prVerifiedCount: u.prs.length,
      latestPRAgeDays: latest ? (Date.now() - latest.raceDate.getTime()) / 86400000 : null,
      hasPRonDistance: !!targetDistanceM && u.prs.some(
        (p) => Math.abs(p.distanceM - targetDistanceM) / targetDistanceM < 0.25,
      ),
    },
  };
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;

  if (data.opponentId === session.user.id)
    return NextResponse.json({ error: "Tu ne peux pas te défier toi-même." }, { status: 400 });

  if ((data.kind === "FASTEST_TIME" || data.kind === "LONG_RUN") && !data.targetDistanceM)
    return NextResponse.json({ error: "Distance cible requise pour ce type." }, { status: 400 });

  const deadline = new Date(data.deadline);
  const h = (deadline.getTime() - Date.now()) / 3600000;
  if (h < MIN_HOURS) return NextResponse.json({ error: `Délai min ${MIN_HOURS} h.` }, { status: 400 });
  if (h > MAX_DAYS * 24) return NextResponse.json({ error: `Délai max ${MAX_DAYS} jours.` }, { status: 400 });

  const challenger = await buildDuelistInput(session.user.id, data.targetDistanceM ?? null);
  const opponent = await buildDuelistInput(data.opponentId, data.targetDistanceM ?? null);
  if (!challenger || !opponent)
    return NextResponse.json({ error: "Coureur introuvable." }, { status: 404 });

  if (challenger.user.banned || opponent.user.banned)
    return NextResponse.json({ error: "Compte suspendu impliqué." }, { status: 403 });
  if (challenger.input.prVerifiedCount === 0 || opponent.input.prVerifiedCount === 0)
    return NextResponse.json(
      { error: "Les deux coureurs doivent avoir au moins un chrono certifié." },
      { status: 400 },
    );
  if (!challenger.user.phoneVerified || !opponent.user.phoneVerified)
    return NextResponse.json(
      { error: "Téléphone non vérifié sur l'un des comptes (anti-doublon)." },
      { status: 400 },
    );

  // Anti-collusion : pas de duel entre parrain/filleul direct.
  const linked =
    challenger.user.referredById === opponent.user.id ||
    opponent.user.referredById === challenger.user.id;
  if (linked) {
    return NextResponse.json(
      { error: "Duel interdit entre parrain et filleul direct (anti-collusion)." },
      { status: 403 },
    );
  }

  // Solde
  if (challenger.user.tokens < data.stakePerSide)
    return NextResponse.json({ error: "Solde insuffisant." }, { status: 400 });

  const odds = duelOdds(
    data.kind as DuelKind,
    data.targetDistanceM ?? null,
    challenger.input,
    opponent.input,
  );

  // Confiance trop basse : on refuse, sinon les cotes sont du bruit.
  if (odds.confidence < 0.25) {
    return NextResponse.json(
      { error: "Confiance trop basse dans les données des deux coureurs pour un duel équitable." },
      { status: 400 },
    );
  }

  const maxBetStake = Math.max(100, Math.floor(3000 * odds.confidence));

  const duel = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: challenger.user.id },
      data: {
        tokens: { decrement: data.stakePerSide },
        tokenLogs: { create: { delta: -data.stakePerSide, reason: "DUEL_STAKE_PROPOSE" } },
      },
    });
    return tx.duel.create({
      data: {
        challengerId: challenger.user.id,
        opponentId: opponent.user.id,
        kind: data.kind,
        targetDistanceM: data.targetDistanceM,
        deadline,
        confidence: odds.confidence,
        oddsChallengerX100: Math.round(odds.oddsChallenger * 100),
        oddsOpponentX100: Math.round(odds.oddsOpponent * 100),
        maxBetStake,
        stakePerSide: data.stakePerSide,
        pot: data.stakePerSide,
        status: "PROPOSED",
      },
    });
  });

  return NextResponse.json({ duel, description: describeDuel({ kind: data.kind as DuelKind, targetDistanceM: data.targetDistanceM }) });
}
