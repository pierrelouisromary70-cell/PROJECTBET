import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const member = await prisma.clubMember.findUnique({ where: { userId: session.user.id } });
  if (!member || member.role !== "CAPTAIN")
    return NextResponse.json({ error: "Seul le capitaine peut refuser." }, { status: 403 });

  const war = await prisma.clubWar.findUnique({ where: { id: params.id } });
  if (!war || war.status !== "PROPOSED")
    return NextResponse.json({ error: "Pas refusable." }, { status: 400 });
  if (war.clubBId !== member.clubId && war.clubAId !== member.clubId)
    return NextResponse.json({ error: "Pas concerné." }, { status: 403 });

  await prisma.$transaction([
    prisma.club.update({ where: { id: war.clubAId }, data: { treasury: { increment: war.stakePerSide } } }),
    prisma.clubWar.update({ where: { id: war.id }, data: { status: "CANCELED", pot: 0 } }),
  ]);
  return NextResponse.json({ ok: true });
}
