import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { describeDuel, DuelKind } from "@/lib/duel-engine";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const d = await prisma.duel.findUnique({
    where: { id: params.id },
    include: {
      challenger: { select: { id: true, displayName: true, profile: { select: { vdot: true } } } },
      opponent: { select: { id: true, displayName: true, profile: { select: { vdot: true } } } },
      bets: {
        orderBy: { createdAt: "desc" },
        include: { bettor: { select: { id: true, displayName: true } } },
      },
    },
  });
  if (!d) return NextResponse.json({ error: "not found" }, { status: 404 });
  const challengerPool = d.bets.filter((b) => b.pickedId === d.challengerId).reduce((a, b) => a + b.stake, 0);
  const opponentPool = d.bets.filter((b) => b.pickedId === d.opponentId).reduce((a, b) => a + b.stake, 0);
  return NextResponse.json({
    ...d,
    description: describeDuel({ kind: d.kind as DuelKind, targetDistanceM: d.targetDistanceM }),
    challengerPool,
    opponentPool,
  });
}
