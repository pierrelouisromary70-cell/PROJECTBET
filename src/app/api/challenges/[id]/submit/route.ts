import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { settleChallenge } from "@/lib/challenge-settle";

// Le propriétaire soumet une preuve manuelle.
// Si une preuve est fournie, on règle YES (avec preuve enregistrée).
// L'arbitrage communautaire pourra contester plus tard (TODO si besoin).
const Body = z.object({ evidenceUrl: z.string().url() });

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "url requise" }, { status: 400 });

  const c = await prisma.challenge.findUnique({ where: { id: params.id } });
  if (!c) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (c.ownerId !== session.user.id)
    return NextResponse.json({ error: "Seul le créateur peut soumettre." }, { status: 403 });
  if (c.status !== "OPEN")
    return NextResponse.json({ error: "Défi clos." }, { status: 400 });

  const status = await settleChallenge(c.id, "YES", parsed.data.evidenceUrl);
  return NextResponse.json({ status });
}
