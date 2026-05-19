import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const club = await prisma.club.findUnique({
    where: { id: params.id },
    include: {
      captain: { select: { id: true, displayName: true } },
      members: {
        include: { user: { select: { id: true, displayName: true, profile: { select: { vdot: true } } } } },
        orderBy: { warPoints: "desc" },
      },
      warsAttack: {
        where: { status: { in: ["PROPOSED", "ACTIVE"] } },
        include: { clubB: { select: { id: true, name: true, tag: true, emoji: true } } },
      },
      warsDefend: {
        where: { status: { in: ["PROPOSED", "ACTIVE"] } },
        include: { clubA: { select: { id: true, name: true, tag: true, emoji: true } } },
      },
    },
  });
  if (!club) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(club);
}
