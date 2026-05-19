import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateReferralCode, REFERRAL_REWARDS } from "@/lib/referral";

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  displayName: z.string().min(2).max(40),
  gender: z.enum(["M", "F", "X"]),
  birthYear: z.number().int().min(1930).max(new Date().getFullYear() - 5),
  referralCode: z.string().trim().toUpperCase().optional(),
});

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;

  const exists = await prisma.user.findUnique({ where: { email: data.email } });
  if (exists) return NextResponse.json({ error: "Email déjà utilisé." }, { status: 409 });

  // Code parrain optionnel
  let referrer: { id: string } | null = null;
  if (data.referralCode) {
    referrer = await prisma.user.findUnique({
      where: { referralCode: data.referralCode },
      select: { id: true },
    });
    if (!referrer) return NextResponse.json({ error: "Code parrain inconnu." }, { status: 400 });
  }

  // Générer un code unique. Collision quasi nulle, mais on boucle par sécurité.
  let code = generateReferralCode();
  while (await prisma.user.findUnique({ where: { referralCode: code } })) code = generateReferralCode();

  const passwordHash = await bcrypt.hash(data.password, 10);

  const baseTokens = 100;
  const refereeBonus = referrer ? REFERRAL_REWARDS.REFEREE_BONUS : 0;

  const user = await prisma.user.create({
    data: {
      email: data.email,
      displayName: data.displayName,
      passwordHash,
      referralCode: code,
      referredById: referrer?.id,
      tokens: baseTokens + refereeBonus,
      profile: {
        create: { gender: data.gender, birthYear: data.birthYear, vdot: 30 },
      },
      tokenLogs: {
        create: [
          { delta: baseTokens, reason: "SIGNUP_BONUS" },
          ...(refereeBonus ? [{ delta: refereeBonus, reason: "REFERRAL_REFEREE_BONUS" }] : []),
        ],
      },
    },
  });

  if (referrer) {
    await prisma.user.update({
      where: { id: referrer.id },
      data: {
        tokens: { increment: REFERRAL_REWARDS.REFERRER_SIGNUP },
        tokenLogs: {
          create: {
            delta: REFERRAL_REWARDS.REFERRER_SIGNUP,
            reason: "REFERRAL_SIGNUP",
            ref: user.id,
          },
        },
      },
    });
  }

  return NextResponse.json({ id: user.id });
}
