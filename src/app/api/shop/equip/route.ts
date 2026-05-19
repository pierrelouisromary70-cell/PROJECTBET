import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const Body = z.object({ itemId: z.string() });

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad" }, { status: 400 });

  const owned = await prisma.inventoryItem.findUnique({
    where: { userId_itemId: { userId: session.user.id, itemId: parsed.data.itemId } },
    include: { item: true },
  });
  if (!owned) return NextResponse.json({ error: "Tu ne possèdes pas cet item." }, { status: 400 });

  const map: Record<string, string> = {
    shoes: "equippedShoes",
    shirt: "equippedShirt",
    shorts: "equippedShorts",
    socks: "equippedSocks",
    cap: "equippedCap",
    glasses: "equippedGlasses",
  };
  const field = map[owned.item.category];
  if (!field) return NextResponse.json({ error: "catégorie inconnue" }, { status: 400 });

  await prisma.runnerProfile.update({
    where: { userId: session.user.id },
    data: { [field]: owned.itemId },
  });
  return NextResponse.json({ ok: true });
}
