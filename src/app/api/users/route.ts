import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Annuaire simple pour création de course.
export async function GET() {
  const users = await prisma.user.findMany({
    select: { id: true, displayName: true, profile: { select: { vdot: true } } },
    orderBy: { displayName: "asc" },
    take: 200,
  });
  return NextResponse.json(users);
}
