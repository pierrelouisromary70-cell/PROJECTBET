import { NextResponse } from "next/server";
import { PACKS } from "@/lib/packs";

export async function GET() {
  return NextResponse.json({
    packs: PACKS,
    stripeEnabled: !!process.env.STRIPE_SECRET_KEY,
  });
}
