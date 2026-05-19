import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// L'opposant accepte le duel : il bloque sa mise égale, le pot devient 2x.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const d = await prisma.duel.findUnique({ where: { id: params.id } });
  if (!d) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (d.opponentId !== session.user.id)
    return NextResponse.json({ error: "Tu n'es pas l'opposant désigné." }, { status: 403 });
  if (d.status !== "PROPOSED")
    return NextResponse.json({ error: "Duel non acceptable." }, { status: 400 });

  const me = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!me || me.banned) return NextResponse.json({ error: "Compte non habilité." }, { status: 403 });
  if (me.tokens < d.stakePerSide)
    return NextResponse.json({ error: "Solde insuffisant." }, { status: 400 });

  await prisma.$transaction([
    prisma.user.update({
      where: { id: me.id },
      data: {
        tokens: { decrement: d.stakePerSide },
        tokenLogs: { create: { delta: -d.stakePerSide, reason: "DUEL_STAKE_ACCEPT", ref: d.id } },
      },
    }),
    prisma.duel.update({
      where: { id: d.id },
      data: { status: "OPEN", acceptedAt: new Date(), pot: { increment: d.stakePerSide } },
    }),
  ]);
  return NextResponse.json({ ok: true });
}
