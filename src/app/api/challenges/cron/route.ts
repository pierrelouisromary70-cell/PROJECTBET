import { NextResponse } from "next/server";
import { expireOverdueChallenges } from "@/lib/challenge-settle";

// Route appelable manuellement ou par cron (Vercel cron, etc.) pour
// expirer les défis dont la deadline est passée. Sans token d'auth requis
// pour faciliter le déclenchement par tâche planifiée — en prod, protéger
// via header secret.
export async function POST() {
  const n = await expireOverdueChallenges();
  return NextResponse.json({ expired: n });
}
