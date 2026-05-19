import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const member = await prisma.clubMember.findUnique({ where: { userId: session.user.id } });
  if (!member || member.role !== "CAPTAIN")
    return NextResponse.json({ error: "Seul le capitaine peut accepter." }, { status: 403 });

  const war = await prisma.clubWar.findUnique({
    where: { id: params.id },
    include: { clubB: true },
  });
  if (!war || war.status !== "PROPOSED")
    return NextResponse.json({ error: "Guerre non acceptable." }, { status: 400 });
  if (war.clubBId !== member.clubId)
    return NextResponse.json({ error: "Ton club n'est pas le défenseur." }, { status: 403 });
  if (war.clubB.treasury < war.stakePerSide)
    return NextResponse.json({ error: "Trésor de ton club insuffisant pour matcher." }, { status: 400 });

  await prisma.$transaction([
    prisma.club.update({ where: { id: member.clubId }, data: { treasury: { decrement: war.stakePerSide } } }),
    prisma.clubWar.update({
      where: { id: war.id },
      data: { status: "ACTIVE", acceptedAt: new Date(), pot: { increment: war.stakePerSide } },
    }),
  ]);
  return NextResponse.json({ ok: true });
}
