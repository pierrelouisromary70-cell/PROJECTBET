import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX_LOADOUTS = 3;

const Body = z.object({
  name: z.string().min(1).max(30),
});

// GET : liste des loadouts du user.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json([], { status: 200 });
  const profile = await prisma.runnerProfile.findUnique({
    where: { userId: session.user.id },
    include: { loadouts: { orderBy: { createdAt: "asc" } } },
  });
  return NextResponse.json(profile?.loadouts ?? []);
}

// POST : crée un loadout en capturant la tenue actuellement équipée.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "nom requis" }, { status: 400 });

  const profile = await prisma.runnerProfile.findUnique({
    where: { userId: session.user.id },
    include: { loadouts: true },
  });
  if (!profile) return NextResponse.json({ error: "no profile" }, { status: 404 });
  if (profile.loadouts.length >= MAX_LOADOUTS) {
    return NextResponse.json({ error: `Limite : ${MAX_LOADOUTS} tenues.` }, { status: 429 });
  }

  const loadout = await prisma.loadout.create({
    data: {
      profileId: profile.id,
      name: parsed.data.name,
      shoesId: profile.equippedShoes,
      shirtId: profile.equippedShirt,
      shortsId: profile.equippedShorts,
      socksId: profile.equippedSocks,
      capId: profile.equippedCap,
      glassesId: profile.equippedGlasses,
      watchId: profile.equippedWatch,
      beltId: profile.equippedBelt,
    },
  });
  return NextResponse.json(loadout);
}
