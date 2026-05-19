import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const Body = z.object({
  side: z.enum(["YES", "NO"]),
  stake: z.number().int().min(10).max(50000),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad" }, { status: 400 });
  const data = parsed.data;

  const c = await prisma.challenge.findUnique({
    where: { id: params.id },
    include: { owner: { select: { id: true, referredById: true, referrals: { select: { id: true } } } } },
  });
  if (!c) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (c.status !== "OPEN") return NextResponse.json({ error: "défi clos" }, { status: 400 });
  if (c.deadline.getTime() <= Date.now())
    return NextResponse.json({ error: "deadline passée" }, { status: 400 });
  if (c.ownerId === session.user.id)
    return NextResponse.json({ error: "Le créateur ne peut pas reparier (sa mise YES est figée)." }, { status: 400 });

  // Anti-collusion : un parrain et son filleul direct ne peuvent pas parier
  // l'un contre l'autre sur un défi (vecteur de redirection de jetons).
  const linkedToOwner =
    c.owner.referredById === session.user.id ||
    c.owner.referrals.some((r) => r.id === session.user.id);
  if (linkedToOwner) {
    return NextResponse.json(
      { error: "Tu es lié au créateur par parrainage : pari interdit (anti-collusion)." },
      { status: 403 },
    );
  }

  const bettor = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!bettor || bettor.banned)
    return NextResponse.json({ error: "Compte non habilité." }, { status: 403 });

  // Plafond par parieur = maxBetStake. Cumul des paris du même user contrôlé.
  const myExisting = await prisma.challengeBet.aggregate({
    where: { challengeId: c.id, bettorId: session.user.id },
    _sum: { stake: true },
  });
  const alreadyStaked = myExisting._sum.stake ?? 0;
  if (alreadyStaked + data.stake > c.maxBetStake) {
    return NextResponse.json(
      {
        error: `Mise cumulée plafonnée à ${c.maxBetStake} 🪙 sur ce défi (déjà engagé : ${alreadyStaked}). Plafond lié à la confiance dans les données du coureur.`,
      },
      { status: 400 },
    );
  }

  if (bettor.tokens < data.stake)
    return NextResponse.json({ error: "Solde insuffisant." }, { status: 400 });

  const oddsX100 = data.side === "YES" ? c.oddsYesX100 : c.oddsNoX100;

  const bet = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: bettor.id },
      data: {
        tokens: { decrement: data.stake },
        tokenLogs: { create: { delta: -data.stake, reason: "CHALLENGE_BET", ref: c.id } },
      },
    });
    return tx.challengeBet.create({
      data: {
        challengeId: c.id,
        bettorId: bettor.id,
        side: data.side,
        stake: data.stake,
        oddsX100,
      },
    });
  });
  return NextResponse.json(bet);
}
