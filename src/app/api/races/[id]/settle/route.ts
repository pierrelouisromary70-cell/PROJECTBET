import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkProfileAchievements } from "@/lib/achievements";

// Règle une course : chronos finaux pour chaque participant.
// Distribue ensuite les gains des paris.
const Body = z.object({
  results: z.array(z.object({ runnerId: z.string(), finishSec: z.number().int().positive() })),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const race = await prisma.race.findUnique({
    where: { id: params.id },
    include: { entries: true, bets: true },
  });
  if (!race) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (race.creatorId !== session.user.id)
    return NextResponse.json({ error: "Seul le créateur peut clôturer." }, { status: 403 });
  if (race.status === "SETTLED")
    return NextResponse.json({ error: "déjà réglée" }, { status: 400 });

  // Tri pour position
  const sorted = [...parsed.data.results].sort((a, b) => a.finishSec - b.finishSec);
  const posByRunner = new Map(sorted.map((r, i) => [r.runnerId, i + 1]));

  await prisma.$transaction(async (tx) => {
    for (const r of parsed.data.results) {
      await tx.raceEntry.updateMany({
        where: { raceId: race.id, runnerId: r.runnerId },
        data: { finishSec: r.finishSec, position: posByRunner.get(r.runnerId) },
      });
    }

    for (const bet of race.bets) {
      const a = parsed.data.results.find((r) => r.runnerId === bet.runnerAId);
      const b = parsed.data.results.find((r) => r.runnerId === bet.runnerBId);
      if (!a || !b) {
        // Coureur absent : pari annulé, mise rendue.
        await tx.bet.update({
          where: { id: bet.id },
          data: { status: "VOID", settledAt: new Date() },
        });
        await tx.user.update({
          where: { id: bet.bettorId },
          data: {
            tokens: { increment: bet.stake },
            tokenLogs: { create: { delta: bet.stake, reason: "BET_VOID_REFUND", ref: bet.id } },
          },
        });
        continue;
      }
      const winnerId = a.finishSec <= b.finishSec ? bet.runnerAId : bet.runnerBId;
      const won = winnerId === bet.pickedId;
      const payout = won ? Math.floor((bet.stake * bet.oddsX100) / 100) : 0;
      await tx.bet.update({
        where: { id: bet.id },
        data: { status: won ? "WON" : "LOST", payout, settledAt: new Date() },
      });
      if (won) {
        await tx.user.update({
          where: { id: bet.bettorId },
          data: {
            tokens: { increment: payout },
            tokenLogs: { create: { delta: payout, reason: "BET_PAYOUT", ref: bet.id } },
          },
        });
      }
    }
    await tx.race.update({ where: { id: race.id }, data: { status: "SETTLED" } });
  });

  // Vérifie achievements sur les parieurs (FIRST_WIN, BIG_WIN).
  const bettors = Array.from(new Set(race.bets.map((b) => b.bettorId)));
  for (const id of bettors) await checkProfileAchievements(id);

  return NextResponse.json({ ok: true });
}
