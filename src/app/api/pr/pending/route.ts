import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const prs = await prisma.personalRecord.findMany({
    where: { status: "PENDING" },
    include: {
      user: { include: { profile: true } },
      votes: true,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json(prs);
}
