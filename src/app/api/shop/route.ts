import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const items = await prisma.shopItem.findMany({ orderBy: [{ category: "asc" }, { priceTokens: "asc" }] });
  return NextResponse.json(items);
}
