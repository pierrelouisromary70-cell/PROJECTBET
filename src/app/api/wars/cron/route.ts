import { NextResponse } from "next/server";
import { settleEndedWars } from "@/lib/club-war";
import { expireOverdueDuels } from "@/lib/duel-settle";

export async function POST() {
  const wars = await settleEndedWars();
  const duels = await expireOverdueDuels();
  return NextResponse.json({ wars, duels });
}
