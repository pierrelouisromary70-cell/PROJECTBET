import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX_MEMBERS = 50;

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      clubMember: true,
      prs: { where: { status: "VERIFIED" }, take: 1 },
    },
  });
  if (!me || me.banned) return NextResponse.json({ error: "Compte non habilité." }, { status: 403 });
  if (me.clubMember)
    return NextResponse.json({ error: "Tu es déjà dans un club." }, { status: 400 });
  if (me.prs.length === 0)
    return NextResponse.json({ error: "Au moins un chrono certifié requis pour rejoindre un club." }, { status: 400 });

  const club = await prisma.club.findUnique({
    where: { id: params.id },
    include: { _count: { select: { members: true } } },
  });
  if (!club) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (club.joinPolicy !== "OPEN")
    return NextResponse.json({ error: "Club fermé (sur invitation uniquement)." }, { status: 403 });
  if (club._count.members >= MAX_MEMBERS)
    return NextResponse.json({ error: `Club plein (${MAX_MEMBERS} max).` }, { status: 400 });

  await prisma.clubMember.create({
    data: { clubId: club.id, userId: me.id, role: "MEMBER" },
  });
  return NextResponse.json({ ok: true });
}
