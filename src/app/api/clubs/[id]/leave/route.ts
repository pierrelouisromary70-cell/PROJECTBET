import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const member = await prisma.clubMember.findUnique({ where: { userId: session.user.id } });
  if (!member || member.clubId !== params.id)
    return NextResponse.json({ error: "Tu n'es pas dans ce club." }, { status: 400 });

  const club = await prisma.club.findUnique({
    where: { id: params.id },
    include: { warsAttack: { where: { status: "ACTIVE" } }, warsDefend: { where: { status: "ACTIVE" } } },
  });
  if (club && (club.warsAttack.length || club.warsDefend.length)) {
    return NextResponse.json({ error: "Pas possible de partir pendant une guerre active." }, { status: 400 });
  }
  if (member.role === "CAPTAIN") {
    return NextResponse.json({ error: "Le capitaine doit transférer le rôle avant de partir." }, { status: 400 });
  }

  await prisma.clubMember.delete({ where: { id: member.id } });
  return NextResponse.json({ ok: true });
}
