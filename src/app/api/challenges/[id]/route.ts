import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const c = await prisma.challenge.findUnique({
    where: { id: params.id },
    include: {
      owner: { select: { id: true, displayName: true, profile: { select: { vdot: true } } } },
      bets: {
        orderBy: { createdAt: "desc" },
        include: { bettor: { select: { id: true, displayName: true } } },
      },
    },
  });
  if (!c) return NextResponse.json({ error: "not found" }, { status: 404 });
  const yesPool = c.bets.filter((b) => b.side === "YES").reduce((a, b) => a + b.stake, 0);
  const noPool = c.bets.filter((b) => b.side === "NO").reduce((a, b) => a + b.stake, 0);
  return NextResponse.json({ ...c, yesPool, noPool });
}
