import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST : applique le loadout — en filtrant chaque item pour ne s'équiper
// que de ceux que l'utilisateur possède toujours.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const loadout = await prisma.loadout.findUnique({
    where: { id: params.id },
    include: { profile: true },
  });
  if (!loadout || loadout.profile.userId !== session.user.id)
    return NextResponse.json({ error: "not found" }, { status: 404 });

  const owned = new Set(
    (await prisma.inventoryItem.findMany({
      where: { userId: session.user.id },
      select: { itemId: true },
    })).map((i) => i.itemId),
  );
  const pickIfOwned = (id: string | null) => (id && owned.has(id) ? id : null);

  await prisma.runnerProfile.update({
    where: { userId: session.user.id },
    data: {
      equippedShoes: pickIfOwned(loadout.shoesId),
      equippedShirt: pickIfOwned(loadout.shirtId),
      equippedShorts: pickIfOwned(loadout.shortsId),
      equippedSocks: pickIfOwned(loadout.socksId),
      equippedCap: pickIfOwned(loadout.capId),
      equippedGlasses: pickIfOwned(loadout.glassesId),
      equippedWatch: pickIfOwned(loadout.watchId),
      equippedBelt: pickIfOwned(loadout.beltId),
    },
  });
  return NextResponse.json({ ok: true });
}
