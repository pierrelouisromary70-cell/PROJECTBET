import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Confirme un achat DEMO. En prod Stripe, l'équivalent est dans /webhook.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const purchase = await prisma.tokenPurchase.findUnique({ where: { id: params.id } });
  if (!purchase) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (purchase.userId !== session.user.id)
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (purchase.provider !== "DEMO")
    return NextResponse.json({ error: "Confirmation manuelle réservée au mode démo." }, { status: 400 });
  if (purchase.status !== "PENDING")
    return NextResponse.json({ error: "déjà traité" }, { status: 400 });

  await prisma.$transaction([
    prisma.tokenPurchase.update({
      where: { id: purchase.id },
      data: { status: "COMPLETED", completedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: purchase.userId },
      data: {
        tokens: { increment: purchase.tokens },
        tokenLogs: {
          create: { delta: purchase.tokens, reason: "PURCHASE", ref: purchase.id },
        },
      },
    }),
  ]);

  return NextResponse.json({ ok: true, tokens: purchase.tokens });
}
