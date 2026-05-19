// Envoi du code de vérification SMS.
// En prod : intégrer Twilio / Vonage / OVH SMS.
// En dev (sans clé) : on génère un code et on le renvoie dans la réponse,
// utile pour tester le flux complet sans facture SMS.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const Body = z.object({
  // E.164 strict : "+" puis 7 à 15 chiffres.
  phoneE164: z.string().regex(/^\+[1-9]\d{6,14}$/, "Format E.164 attendu, ex +33612345678."),
});

function genCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  // Unicité forte : un numéro = un user.
  const taken = await prisma.user.findFirst({
    where: { phoneE164: parsed.data.phoneE164, NOT: { id: session.user.id } },
  });
  if (taken) {
    return NextResponse.json(
      { error: "Ce numéro est déjà associé à un autre compte." },
      { status: 409 },
    );
  }

  const code = genCode();
  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      phoneE164: parsed.data.phoneE164,
      phoneVerified: false,
      phoneVerifyCode: code,
      phoneVerifyExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  // TODO prod : appel Twilio/Vonage ici.
  const isProd = process.env.NODE_ENV === "production" && !!process.env.TWILIO_SID;
  if (isProd) {
    // const twilio = ...; await twilio.messages.create({ to, from, body: `Code RunnerBet : ${code}` });
  }

  return NextResponse.json({
    sent: true,
    devCode: isProd ? undefined : code, // visible uniquement hors prod
  });
}
