import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { claimDailyBonus } from "@/lib/streak";
import { checkProfileAchievements } from "@/lib/achievements";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });
  const result = await claimDailyBonus(session.user.id);
  if (result.granted) await checkProfileAchievements(session.user.id);
  return NextResponse.json(result);
}
