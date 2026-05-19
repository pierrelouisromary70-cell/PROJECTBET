import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const Body = z.object({ pickedId: z.string(), stake: z.number().int().min(10).max(50000) });

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad" }, { status: 400 });

  const d = await prisma.duel.findUnique({
    where: { id: params.id },
    include: {
      challenger: { select: { id: true, referredById: true, referrals: { select: { id: true } } } },
      opponent:   { select: { id: true, referredById: true, referrals: { select: { id: true } } } },
    },
  });
  if (!d) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (d.status !== "OPEN")
    return NextResponse.json({ error: "Pari indisponible (duel non actif)." }, { status: 400 });
  if (d.deadline.getTime() <= Date.now())
    return NextResponse.json({ error: "deadline passée" }, { status: 400 });

  if (session.user.id === d.challengerId || session.user.id === d.opponentId)
    return NextResponse.json({ error: "Les duellistes ne peuvent pas miser sur leur propre duel." }, { status: 400 });

  // Anti-collusion : interdire le pari entre filleul/parrain direct d'un des duellistes.
  const linkedAny = [d.challenger, d.opponent].some(
    (u) => u.referredById === session.user.id || u.referrals.some((r) => r.id === session.user.id),
  );
  if (linkedAny) {
    return NextResponse.json(
      { error: "Tu es lié à un des duellistes par parrainage (anti-collusion)." },
      { status: 403 },
    );
  }

  if (parsed.data.pickedId !== d.challengerId && parsed.data.pickedId !== d.opponentId)
    return NextResponse.json({ error: "Pick invalide." }, { status: 400 });

  const myExisting = await prisma.duelBet.aggregate({
    where: { duelId: d.id, bettorId: session.user.id },
    _sum: { stake: true },
  });
  if ((myExisting._sum.stake ?? 0) + parsed.data.stake > d.maxBetStake) {
    return NextResponse.json(
      { error: `Plafond de mise cumulée : ${d.maxBetStake} 🪙 sur ce duel.` },
      { status: 400 },
    );
  }

  const me = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!me || me.banned) return NextResponse.json({ error: "Compte non habilité." }, { status: 403 });
  if (me.tokens < parsed.data.stake)
    return NextResponse.json({ error: "Solde insuffisant." }, { status: 400 });

  const oddsX100 = parsed.data.pickedId === d.challengerId ? d.oddsChallengerX100 : d.oddsOpponentX100;

  const bet = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: me.id },
      data: {
        tokens: { decrement: parsed.data.stake },
        tokenLogs: { create: { delta: -parsed.data.stake, reason: "DUEL_BET", ref: d.id } },
      },
    });
    return tx.duelBet.create({
      data: {
        duelId: d.id,
        bettorId: me.id,
        pickedId: parsed.data.pickedId,
        stake: parsed.data.stake,
        oddsX100,
      },
    });
  });
  return NextResponse.json(bet);
}
