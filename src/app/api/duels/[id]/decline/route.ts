import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// L'opposant décline le duel : la mise du challenger est restituée.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const d = await prisma.duel.findUnique({ where: { id: params.id } });
  if (!d) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (d.opponentId !== session.user.id && d.challengerId !== session.user.id)
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (d.status !== "PROPOSED")
    return NextResponse.json({ error: "Duel déjà engagé." }, { status: 400 });

  await prisma.$transaction([
    prisma.user.update({
      where: { id: d.challengerId },
      data: {
        tokens: { increment: d.stakePerSide },
        tokenLogs: { create: { delta: d.stakePerSide, reason: "DUEL_REFUND", ref: d.id } },
      },
    }),
    prisma.duel.update({ where: { id: d.id }, data: { status: "CANCELED", pot: 0 } }),
  ]);
  return NextResponse.json({ ok: true });
}
