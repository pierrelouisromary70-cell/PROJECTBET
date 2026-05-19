import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const Body = z.object({
  opponentClubId: z.string(),
  stakePerSide: z.number().int().min(500).max(50000),
  durationDays: z.number().int().min(1).max(14).default(7),
});

export async function GET() {
  const wars = await prisma.clubWar.findMany({
    orderBy: { startAt: "desc" },
    take: 100,
    include: {
      clubA: { select: { id: true, name: true, tag: true, emoji: true } },
      clubB: { select: { id: true, name: true, tag: true, emoji: true } },
    },
  });
  return NextResponse.json(wars);
}

// Le capitaine du club A propose une guerre au club B.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;

  const member = await prisma.clubMember.findUnique({
    where: { userId: session.user.id },
    include: { club: true },
  });
  if (!member || member.role !== "CAPTAIN")
    return NextResponse.json({ error: "Seul un capitaine peut déclarer une guerre." }, { status: 403 });

  if (member.clubId === data.opponentClubId)
    return NextResponse.json({ error: "Pas d'auto-guerre." }, { status: 400 });

  const opponentClub = await prisma.club.findUnique({ where: { id: data.opponentClubId } });
  if (!opponentClub) return NextResponse.json({ error: "Club opposant introuvable." }, { status: 404 });

  // Pas plus d'une guerre ACTIVE/PROPOSED par club à la fois.
  const busyA = await prisma.clubWar.findFirst({
    where: { status: { in: ["PROPOSED", "ACTIVE"] }, OR: [{ clubAId: member.clubId }, { clubBId: member.clubId }] },
  });
  if (busyA) return NextResponse.json({ error: "Ton club a déjà une guerre en cours." }, { status: 400 });
  const busyB = await prisma.clubWar.findFirst({
    where: { status: { in: ["PROPOSED", "ACTIVE"] }, OR: [{ clubAId: data.opponentClubId }, { clubBId: data.opponentClubId }] },
  });
  if (busyB) return NextResponse.json({ error: "Le club adverse est déjà engagé dans une guerre." }, { status: 400 });

  if (member.club.treasury < data.stakePerSide)
    return NextResponse.json({ error: "Le trésor de ton club est insuffisant." }, { status: 400 });

  const endAt = new Date(Date.now() + data.durationDays * 86400000);

  const war = await prisma.$transaction(async (tx) => {
    await tx.club.update({
      where: { id: member.clubId },
      data: { treasury: { decrement: data.stakePerSide } },
    });
    return tx.clubWar.create({
      data: {
        clubAId: member.clubId,
        clubBId: data.opponentClubId,
        stakePerSide: data.stakePerSide,
        pot: data.stakePerSide,
        endAt,
        status: "PROPOSED",
      },
    });
  });
  return NextResponse.json(war);
}
