import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const now = new Date();
  // Cache les drops expirés.
  const items = await prisma.shopItem.findMany({
    where: { OR: [{ availableUntil: null }, { availableUntil: { gt: now } }] },
    orderBy: [{ category: "asc" }, { priceTokens: "asc" }],
  });
  return NextResponse.json(items);
}
