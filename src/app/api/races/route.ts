import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const Body = z.object({
  name: z.string().min(3),
  distanceM: z.number().int().positive(),
  scheduledAt: z.string(),
  location: z.string().optional(),
  runnerIds: z.array(z.string()).min(2).max(20),
});

export async function GET() {
  const races = await prisma.race.findMany({
    orderBy: { scheduledAt: "asc" },
    include: {
      entries: { include: { runner: { include: { profile: true } } } },
      _count: { select: { bets: true } },
    },
  });
  return NextResponse.json(races);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;

  const race = await prisma.race.create({
    data: {
      name: data.name,
      distanceM: data.distanceM,
      scheduledAt: new Date(data.scheduledAt),
      location: data.location,
      creatorId: session.user.id,
      entries: { create: data.runnerIds.map((runnerId) => ({ runnerId })) },
    },
  });
  return NextResponse.json(race);
}
