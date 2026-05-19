import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const Body = z.object({ code: z.string().length(6) });

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "code à 6 chiffres" }, { status: 400 });

  const u = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!u || !u.phoneVerifyCode || !u.phoneVerifyExpiresAt)
    return NextResponse.json({ error: "Aucune demande en cours." }, { status: 400 });
  if (u.phoneVerifyExpiresAt.getTime() < Date.now())
    return NextResponse.json({ error: "Code expiré, redemande-en un." }, { status: 400 });
  if (u.phoneVerifyCode !== parsed.data.code)
    return NextResponse.json({ error: "Code incorrect." }, { status: 400 });

  await prisma.user.update({
    where: { id: u.id },
    data: {
      phoneVerified: true,
      phoneVerifyCode: null,
      phoneVerifyExpiresAt: null,
    },
  });
  return NextResponse.json({ ok: true });
}
