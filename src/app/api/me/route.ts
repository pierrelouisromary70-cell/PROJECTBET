import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json(null);
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      profile: true,
      prs: { orderBy: { raceDate: "desc" } },
      inventory: { include: { item: true } },
      achievements: true,
      referrals: { select: { id: true, displayName: true, createdAt: true } },
    },
  });
  return NextResponse.json(user);
}
