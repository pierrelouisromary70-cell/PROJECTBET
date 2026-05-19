import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Webhook Stripe pour compléter un achat de jetons.
// Configure STRIPE_WEBHOOK_SECRET et pointe Stripe vers /api/packs/webhook.
//
// Si Stripe n'est pas installé ou pas configuré, on renvoie 503 — l'app
// reste utilisable en mode DEMO (cf. /api/packs/checkout).
export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!secret || !stripeKey) {
    return NextResponse.json({ error: "Stripe non configuré." }, { status: 503 });
  }

  const { default: Stripe } = await import("stripe").catch(() => ({ default: null as never }));
  if (!Stripe) return NextResponse.json({ error: "Paquet 'stripe' non installé." }, { status: 500 });
  const stripe = new Stripe(stripeKey);

  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "signature manquante" }, { status: 400 });

  const raw = await req.text();
  let event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (err) {
    return NextResponse.json({ error: "signature invalide" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as {
      client_reference_id?: string;
      payment_status?: string;
    };
    const purchaseId = session.client_reference_id;
    if (purchaseId && session.payment_status === "paid") {
      const purchase = await prisma.tokenPurchase.findUnique({ where: { id: purchaseId } });
      if (purchase && purchase.status === "PENDING") {
        await prisma.$transaction([
          prisma.tokenPurchase.update({
            where: { id: purchaseId },
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
      }
    }
  }

  return NextResponse.json({ received: true });
}
