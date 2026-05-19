import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DAILY_LIMIT = 5;
const TOKENS_PER_AD = 10;

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const since = new Date();
  since.setHours(0, 0, 0, 0);
  const todayCount = await prisma.adView.count({
    where: { userId: session.user.id, watchedAt: { gte: since } },
  });
  if (todayCount >= DAILY_LIMIT)
    return NextResponse.json({ error: "Limite quotidienne atteinte (5/5)." }, { status: 429 });

  await prisma.$transaction([
    prisma.adView.create({
      data: { userId: session.user.id, tokensEarned: TOKENS_PER_AD },
    }),
    prisma.user.update({
      where: { id: session.user.id },
      data: {
        tokens: { increment: TOKENS_PER_AD },
        tokenLogs: { create: { delta: TOKENS_PER_AD, reason: "AD_REWARD" } },
      },
    }),
  ]);

  return NextResponse.json({ tokensEarned: TOKENS_PER_AD, remaining: DAILY_LIMIT - todayCount - 1 });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  const todayCount = await prisma.adView.count({
    where: { userId: session.user.id, watchedAt: { gte: since } },
  });
  return NextResponse.json({ used: todayCount, remaining: Math.max(0, DAILY_LIMIT - todayCount), limit: DAILY_LIMIT });
}
