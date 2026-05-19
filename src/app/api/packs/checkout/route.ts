import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { findPack, packTotal } from "@/lib/packs";

const Body = z.object({ packId: z.string() });

// Crée une session de paiement.
// - Si STRIPE_SECRET_KEY est défini, on crée une Checkout Session Stripe et on
//   renvoie son URL ; l'achat est complété au webhook /api/packs/webhook.
// - Sinon, mode DEMO : on crée la commande comme PENDING et on renvoie une URL
//   interne /buy-tokens/confirm/[id] qui la complète au clic. C'est ce qui
//   permet de tester tout le flux sans configuration externe.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad" }, { status: 400 });

  const pack = findPack(parsed.data.packId);
  if (!pack) return NextResponse.json({ error: "pack inconnu" }, { status: 404 });

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  if (stripeKey) {
    // Stripe est volontairement chargé dynamiquement pour ne pas exiger sa
    // présence en dev. Installer le paquet `stripe` si on l'utilise.
    const { default: Stripe } = await import("stripe").catch(() => ({ default: null as never }));
    if (!Stripe) {
      return NextResponse.json({ error: "Paquet 'stripe' non installé." }, { status: 500 });
    }
    const stripe = new Stripe(stripeKey);
    const purchase = await prisma.tokenPurchase.create({
      data: {
        userId: session.user.id,
        pack: pack.id,
        tokens: packTotal(pack),
        amountCents: pack.amountCents,
        currency: pack.currency,
        provider: "STRIPE",
      },
    });
    const checkout = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      success_url: `${baseUrl}/buy-tokens?success=${purchase.id}`,
      cancel_url: `${baseUrl}/buy-tokens?cancel=${purchase.id}`,
      client_reference_id: purchase.id,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: pack.currency.toLowerCase(),
            unit_amount: pack.amountCents,
            product_data: {
              name: `${pack.label} — ${packTotal(pack)} jetons RunnerBet`,
            },
          },
        },
      ],
      metadata: { purchaseId: purchase.id, userId: session.user.id },
    });
    await prisma.tokenPurchase.update({
      where: { id: purchase.id },
      data: { providerRef: checkout.id },
    });
    return NextResponse.json({ url: checkout.url, provider: "STRIPE" });
  }

  // DEMO : pas de Stripe, on offre un lien interne de confirmation.
  const purchase = await prisma.tokenPurchase.create({
    data: {
      userId: session.user.id,
      pack: pack.id,
      tokens: packTotal(pack),
      amountCents: pack.amountCents,
      currency: pack.currency,
      provider: "DEMO",
    },
  });
  return NextResponse.json({
    url: `${baseUrl}/buy-tokens/confirm/${purchase.id}`,
    provider: "DEMO",
  });
}
