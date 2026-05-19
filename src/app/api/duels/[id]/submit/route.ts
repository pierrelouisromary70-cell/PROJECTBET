import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { settleDuelIfReady } from "@/lib/duel-settle";

const Body = z.object({
  result: z.number().int().positive(),
  evidenceUrl: z.string().url(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad" }, { status: 400 });

  const d = await prisma.duel.findUnique({ where: { id: params.id } });
  if (!d) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (d.status !== "OPEN") return NextResponse.json({ error: "Duel non actif." }, { status: 400 });

  let updateData: { challengerResult?: number; opponentResult?: number; challengerEvidence?: string; opponentEvidence?: string } = {};
  if (session.user.id === d.challengerId) {
    updateData = { challengerResult: parsed.data.result, challengerEvidence: parsed.data.evidenceUrl };
  } else if (session.user.id === d.opponentId) {
    updateData = { opponentResult: parsed.data.result, opponentEvidence: parsed.data.evidenceUrl };
  } else {
    return NextResponse.json({ error: "Tu n'es pas duelliste sur ce duel." }, { status: 403 });
  }

  await prisma.duel.update({ where: { id: d.id }, data: updateData });

  // Si les deux résultats sont là, on règle immédiatement.
  const refreshed = await prisma.duel.findUnique({ where: { id: d.id } });
  if (refreshed?.challengerResult != null && refreshed?.opponentResult != null) {
    const outcome = await settleDuelIfReady(d.id);
    return NextResponse.json({ submitted: true, outcome });
  }

  return NextResponse.json({ submitted: true, outcome: null });
}
