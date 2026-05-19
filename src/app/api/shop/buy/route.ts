import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkProfileAchievements } from "@/lib/achievements";

const Body = z.object({ itemId: z.string() });

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad" }, { status: 400 });

  const item = await prisma.shopItem.findUnique({ where: { id: parsed.data.itemId } });
  if (!item) return NextResponse.json({ error: "item inconnu" }, { status: 404 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.json({ error: "user" }, { status: 404 });
  if (user.tokens < item.priceTokens)
    return NextResponse.json({ error: "Solde insuffisant." }, { status: 400 });

  const owned = await prisma.inventoryItem.findUnique({
    where: { userId_itemId: { userId: user.id, itemId: item.id } },
  });
  if (owned) return NextResponse.json({ error: "Déjà possédé." }, { status: 409 });

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        tokens: { decrement: item.priceTokens },
        tokenLogs: { create: { delta: -item.priceTokens, reason: "PURCHASE", ref: item.id } },
      },
    }),
    prisma.inventoryItem.create({ data: { userId: user.id, itemId: item.id } }),
  ]);

  await checkProfileAchievements(user.id);
  return NextResponse.json({ ok: true });
}
