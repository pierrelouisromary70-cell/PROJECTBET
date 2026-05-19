import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const Body = z.object({ amount: z.number().int().min(10).max(50000) });

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad" }, { status: 400 });

  const member = await prisma.clubMember.findUnique({ where: { userId: session.user.id } });
  if (!member || member.clubId !== params.id)
    return NextResponse.json({ error: "Tu n'es pas dans ce club." }, { status: 400 });

  const me = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!me || me.tokens < parsed.data.amount)
    return NextResponse.json({ error: "Solde insuffisant." }, { status: 400 });

  await prisma.$transaction([
    prisma.user.update({
      where: { id: me.id },
      data: {
        tokens: { decrement: parsed.data.amount },
        tokenLogs: { create: { delta: -parsed.data.amount, reason: "CLUB_DONATION", ref: params.id } },
      },
    }),
    prisma.club.update({
      where: { id: params.id },
      data: { treasury: { increment: parsed.data.amount } },
    }),
  ]);
  return NextResponse.json({ ok: true });
}
