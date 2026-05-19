import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const CREATE_COST = 500;

const Body = z.object({
  name: z.string().min(3).max(30),
  tag: z.string().min(2).max(5).regex(/^[A-Z0-9]+$/, "Majuscules/chiffres."),
  emoji: z.string().max(4).optional(),
  description: z.string().max(200).optional(),
  joinPolicy: z.enum(["OPEN", "INVITE_ONLY"]).default("OPEN"),
});

export async function GET() {
  const clubs = await prisma.club.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { members: true } },
      captain: { select: { id: true, displayName: true } },
    },
  });
  return NextResponse.json(clubs);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { clubMember: true, prs: { where: { status: "VERIFIED" }, take: 1 } },
  });
  if (!me || me.banned) return NextResponse.json({ error: "Compte non habilité." }, { status: 403 });
  if (!me.phoneVerified)
    return NextResponse.json({ error: "Téléphone non vérifié (requis pour fonder un club)." }, { status: 400 });
  if (me.clubMember)
    return NextResponse.json({ error: "Tu es déjà dans un club (1 club à la fois)." }, { status: 400 });
  if (me.prs.length === 0)
    return NextResponse.json({ error: "Au moins un chrono certifié requis pour fonder un club." }, { status: 400 });
  if (me.tokens < CREATE_COST)
    return NextResponse.json({ error: `Création : ${CREATE_COST} 🪙 requis.` }, { status: 400 });

  const tagUpper = data.tag.toUpperCase();
  const exists = await prisma.club.findFirst({
    where: { OR: [{ name: data.name }, { tag: tagUpper }] },
  });
  if (exists) return NextResponse.json({ error: "Nom ou tag déjà pris." }, { status: 409 });

  const club = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: me.id },
      data: {
        tokens: { decrement: CREATE_COST },
        tokenLogs: { create: { delta: -CREATE_COST, reason: "CLUB_CREATE" } },
      },
    });
    const c = await tx.club.create({
      data: {
        name: data.name,
        tag: tagUpper,
        emoji: data.emoji || "🏃",
        description: data.description,
        captainId: me.id,
        joinPolicy: data.joinPolicy,
      },
    });
    await tx.clubMember.create({
      data: { clubId: c.id, userId: me.id, role: "CAPTAIN" },
    });
    return c;
  });
  return NextResponse.json(club);
}
